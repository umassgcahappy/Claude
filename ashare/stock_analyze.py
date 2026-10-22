"""A股单只股票一站式分析（技术面 / 估值 / 资金流 / 公告风险 / 负面清单 / 企稳信号）。

整合原 PowerShell 脚本 stock-analysis / money-flow / ann-risk-scan / neg-list-scan 的逻辑，
并补充亿牛网 PB 历史分位。

用法（在仓库根目录）：
    python3 -m ashare.stock_analyze 600398
    python3 -m ashare.stock_analyze 600398 --out report.md      # 同时保存到文件
    python3 -m ashare.stock_analyze 600398 --dps 0.41            # 手填最近一年每股分红，算股息率
    python3 -m ashare.stock_analyze 600398 --skip-eniu           # 跳过较慢的亿牛 PB 接口

数据源：腾讯行情（快照 / 日K）、东方财富（资金流 / 公告 / 大宗交易）、亿牛网（PB 历史，优先读 cache_eniu 缓存）。
指标口径与通达信 / 东财一致：MACD=EMA(12,26,9) 柱=2*(DIF-DEA)；RSI 为 Wilder 平滑；
BIAS6/12/24 分别以 MA5/MA10/MA20 为基准（沿用原脚本口径）。
仅供数据计算与信息参考，不构成投资建议。
"""
import argparse
import bisect
import io
import re
import sys
from contextlib import redirect_stdout
from datetime import datetime, timedelta

from .common import EM_REF, ema_series, eniu_series, http_json, kline_recent, prefix, quote, rsi_series
from .neg_list_scan import classify


# ---------------------------------------------------------------- 工具

def limit_pct(code, name):
    if "ST" in name:
        return 5.0
    if code.startswith(("30", "68")):
        return 20.0
    return 10.0


def ma(vals, i, p):
    return sum(vals[i - p + 1:i + 1]) / p if i >= p - 1 else float("nan")


def section(title):
    print(f"\n## {title}\n")


# ---------------------------------------------------------------- 数据获取

def fetch_kline(code, count=320, fq="qfq"):
    rows = kline_recent(prefix(code) + code, count, fq)
    if len(rows) < 60:
        raise RuntimeError(f"K线数量不足（至少60根）：{code}")
    return {k: [r[i] for r in rows] for i, k in enumerate(["date", "open", "close", "high", "low", "vol"])}


def fetch_money_flow(code):
    secid = ("1." if prefix(code) == "sh" else "0.") + code
    url = ("https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=0&klt=101"
           f"&secid={secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65")
    kl = (http_json(url, referer=EM_REF, retries=6).get("data") or {}).get("klines") or []
    out = []
    for s in kl:
        p = s.split(",")
        out.append({"date": p[0], "main": float(p[1]), "pct": float(p[6]), "close": float(p[11]), "chg": float(p[12])})
    return out


def fetch_announcements(code, years=3, max_pages=20):
    cutoff = datetime.now() - timedelta(days=365 * years)
    items, total = [], 0
    for p in range(1, max_pages + 1):
        url = ("https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=100"
               f"&page_index={p}&ann_type=A&client_source=web&stock_list={code}")
        data = http_json(url)["data"]
        lst = data.get("list") or []
        if p == 1:
            total = data.get("total_hits", 0)
        if not lst:
            break
        items += lst
        if datetime.strptime(lst[-1]["notice_date"][:10], "%Y-%m-%d") < cutoff:
            break
    items = [a for a in items if datetime.strptime(a["notice_date"][:10], "%Y-%m-%d") >= cutoff]
    items.sort(key=lambda a: a["notice_date"], reverse=True)
    return items, total


def ann_content(art_code):
    try:
        d = http_json(f"https://np-cnotice-stock.eastmoney.com/api/content/ann?art_code={art_code}"
                "&client_source=web&page_index=1", retries=2)["data"]
        t = re.sub(r"<[^>]+>", "", d.get("notice_content") or "")
        return re.sub(r"\s+", " ", t).strip()
    except Exception:
        return ""


def fetch_block_trades(code):
    url = ("https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DATA_BLOCKTRADE&columns=ALL"
           f"&filter=(SECURITY_CODE%3D%22{code}%22)&pageNumber=1&pageSize=200&sortColumns=TRADE_DATE&sortTypes=-1")
    try:
        r = http_json(url, retries=2)
        return (r.get("result") or {}).get("data") or []
    except Exception:
        return []


def fetch_pb_history(code):
    """-> (PB 序列(>0), 日期序列)；优先读 cache_eniu 缓存。"""
    r = eniu_series(prefix(code) + code, "pba")
    if not r:
        raise RuntimeError("亿牛网无 PB 数据")
    return [v for v in r[1] if v > 0], r[0]


# ---------------------------------------------------------------- 分析模块

def audit_opinion(text):
    i = text.find("一、审计意见")
    if i < 0:
        i = text.find("审计意见")
    if i < 0:
        return "（未能定位审计意见节，请人工查看原文）"
    sec = re.sub(r"\s+", "", text[i:i + 800])
    if "无法表示意见" in sec:
        return "无法表示意见（严重，非标准）"
    if "否定意见" in sec:
        return "否定意见（严重，非标准）"
    if re.search(r"(?<!无)保留意见", sec):
        return "保留意见（非标准）"
    if "强调事项" in sec:
        return "无保留意见+带强调事项段"
    if "公允反映" in sec:
        return "标准无保留意见"
    return "（未能识别，请人工查看原文）"


def category(title):
    for cat, pat in [("减持", "减持"), ("解禁", "解禁|解除限售|上市流通|限售"), ("质押", "质押"),
                     ("监管", "监管|问询|警示|立案|处罚|谴责|通报批评|纪律处分|整改|最近五年"),
                     ("审计", "审计"), ("诉讼", "诉讼|仲裁|判决|裁定")]:
        if re.search(pat, title):
            return cat
    return "其他"


def analyze_technical(code, q, k):
    n = len(k["close"])
    d, o, c, h, l, v = (k[x] for x in ("date", "open", "close", "high", "low", "vol"))
    li = n - 1
    dif = [a - b for a, b in zip(ema_series(c, 12), ema_series(c, 26))]
    dea = ema_series(dif, 9)
    macd = [2 * (a - b) for a, b in zip(dif, dea)]
    r6, r12, r24 = (rsi_series(c, p) for p in (6, 12, 24))
    ma5, ma10, ma20, ma60 = (ma(c, li, p) for p in (5, 10, 20, 60))
    b6, b12, b24 = ((c[li] - m) / m * 100 for m in (ma5, ma10, ma20))
    res = {}

    section("指标趋势（近8日）")
    print("| 日期 | 收盘 | MA5 | MA10 | MA20 | MA60 | DIF | DEA | MACD | RSI6 | RSI12 | RSI24 | B6 | B12 | B24 |")
    print("|" + "---|" * 15)
    for i in range(n - 8, n):
        m5, m10, m20, m60 = (ma(c, i, p) for p in (5, 10, 20, 60))
        print(f"| {d[i]} | {c[i]:.2f} | {m5:.2f} | {m10:.2f} | {m20:.2f} | {m60:.2f} | {dif[i]:.2f} | {dea[i]:.2f} "
              f"| {macd[i]:.2f} | {r6[i]:.1f} | {r12[i]:.1f} | {r24[i]:.1f} | {(c[i]-m5)/m5*100:.1f} "
              f"| {(c[i]-m10)/m10*100:.1f} | {(c[i]-m20)/m20*100:.1f} |")

    # 量价
    section("量价健康度")
    s20 = n - 20
    avg20 = sum(v[s20:]) / 20
    base = v[max(0, n - 80):s20]
    cum20 = (c[li] - c[s20 - 1]) / c[s20 - 1] * 100
    print(f"- 近20日累计涨跌幅 **{cum20:+.2f}%**；日均量 {avg20:,.0f} 手")
    if base:
        print(f"- 此前60日日均量 {sum(base)/len(base):,.0f} 手，量比 {avg20/(sum(base)/len(base)):.2f}（>1 放量 / <1 缩量）")
    prev20 = sum(v[n - 21:n - 1]) / 20
    day_vr = v[li] / prev20 if prev20 else 1.0
    print(f"- 今日量比 {day_vr:.2f}，换手 {q['turnover']:.2f}%")

    # 压力位
    section("压力位")
    print("| 窗口 | 最高 | 最低 | 最高→最低 | 最低→现价 |\n|---|---|---|---|---|")
    for lab, st in (("近100日", max(0, n - 100)), ("近20日", s20)):
        hi_i = max(range(st, n), key=lambda i: h[i])
        lo_i = min(range(st, n), key=lambda i: l[i])
        print(f"| {lab} | {h[hi_i]:.2f}（{d[hi_i]}） | {l[lo_i]:.2f}（{d[lo_i]}） "
              f"| {(l[lo_i]-h[hi_i])/h[hi_i]*100:.2f}% | {(c[li]-l[lo_i])/l[lo_i]*100:+.2f}% |")

    # K线形态
    section("近20日K线形态（仅列出有形态标记的日子）")
    rows = []
    for i in range(s20, n):
        rng = h[i] - l[i]
        if rng <= 0:
            continue
        up = (h[i] - max(o[i], c[i])) / rng * 100
        lo = (min(o[i], c[i]) - l[i]) / rng * 100
        body = abs(c[i] - o[i]) / rng * 100
        tags = []
        if up >= 55 and body <= 12:
            tags.append("墓碑线")
        elif up >= 50:
            tags.append("长上影")
        if body <= 10:
            tags.append("十字星")
        if lo >= 50:
            tags.append("长下影")
        if tags:
            rows.append(f"- {d[i]}  涨跌 {(c[i]-c[i-1])/c[i-1]*100:+.2f}%  上影{up:.0f}% 下影{lo:.0f}% 实体{body:.0f}%  → {'+'.join(tags)}")
    print("\n".join(rows) or "- 无")

    # 涨停
    lp = limit_pct(code, q["name"])
    is_lu = [i > 0 and c[i - 1] > 0 and c[i] >= round(c[i - 1] * (1 + lp / 100) + 1e-9, 2) - 0.001 for i in range(n)]
    zt = [d[i] for i in range(s20, n) if is_lu[i]]
    print(f"\n近20日涨停 {len(zt)} 次（涨停幅度 {lp:.0f}%）{'：' + '、'.join(zt) if zt else ''}")

    # 关键条件
    section("关键条件判定")
    prev = lambda p: ma(c, li - 1, p)
    bull = ma5 > ma10 > ma20 > ma60
    all_down = ma5 < prev(5) and ma10 < prev(10) and ma20 < prev(20) and ma60 < prev(60)
    red_grow = macd[li] > 0 and macd[li - 1] > macd[li - 2] and macd[li] > macd[li - 1]
    print(f"- 均线：MA5 {ma5:.2f} / MA10 {ma10:.2f} / MA20 {ma20:.2f} / MA60 {ma60:.2f}；多头排列：**{bull}**；四线齐拐头向下：{all_down}")
    print(f"- 现价相对均线：{', '.join(f'MA{p} {'上' if c[li] > m else '下'}' for p, m in ((5, ma5), (10, ma10), (20, ma20), (60, ma60)))}")
    print(f"- MACD：DIF {dif[li]:.2f}（{'0轴上' if dif[li] > 0 else '0轴下'}，{'未拐头' if dif[li] >= dif[li-1] else '拐头向下'}）"
          f"/ DEA {dea[li]:.2f} / 柱 {macd[li]:.2f}（{'红' if macd[li] > 0 else '绿'}柱）；红柱近3日变长：{red_grow}")
    ob = any(x[li] > 70 for x in (r6, r12, r24))
    os_ = any(x[li] < 30 for x in (r6, r12, r24))
    print(f"- RSI：{r6[li]:.1f} / {r12[li]:.1f} / {r24[li]:.1f}；超买(>70)：{ob}；超卖(<30)：{os_}")
    bias_max = max(abs(b6), abs(b12), abs(b24))
    bias_txt = "极度偏离" if bias_max > 15 else "偏离偏大" if bias_max > 10 else "正常"
    print(f"- BIAS：{b6:.2f}% / {b12:.2f}% / {b24:.2f}%；最大|BIAS| {bias_max:.2f}%（{bias_txt}）")

    # 52周位置
    dd250 = -1.0
    if n > 250:
        hi_i = max(range(n - 250, n), key=lambda i: h[i])
        dd250 = (h[hi_i] - c[li]) / h[hi_i] * 100
        pos = ("接近一年高位" if dd250 < 5 else "相对高位" if dd250 < 20 else
               "距高点深度回撤" if dd250 >= 50 else "中间位置")
        print(f"- 52周最高 {h[hi_i]:.2f}（{d[hi_i]}），现价回撤 **{dd250:.2f}%** → {pos}")

    # 情绪极端
    section("情绪极端检测")
    chg = (c[li] - c[li - 1]) / c[li - 1] * 100
    sig = []
    if q["turnover"] > 10:
        sig.append("换手率畸高(>10%)")
    if chg > 5 and day_vr > 3:
        sig.append("巨量大阳(涨幅>5%且量比>3)")
        if 0 <= dd250 < 5:
            sig.append("大涨+放量+一年高位")
    if ob:
        sig.append("RSI超买(>70)")
    if bias_max > 10:
        sig.append("BIAS偏离>10%")
    print(f"- 单日涨跌 {chg:+.2f}%，换手 {q['turnover']:.2f}%，量比 {day_vr:.2f}")
    print(f"- **{'⚠️ 触发：' + '、'.join(sig) if sig else '✅ 未触发情绪极端'}**")

    # 负面清单（技术可判定项）
    section("负面清单（技术面可判定项；1、2 需人工）")
    gaps = [f"{d[i]}(+{(o[i]-h[i-1])/h[i-1]*100:.1f}%)" for i in range(s20, n) if (o[i] - h[i - 1]) / h[i - 1] * 100 >= 2]
    crash = [i for i in range(n - 5, n) if (c[i] - c[i - 1]) / c[i - 1] * 100 <= -5]
    crash_hit = bool(crash) and (n - 1 - crash[-1]) <= 2
    consec = best = 0
    for i in range(s20, n):
        consec = consec + 1 if is_lu[i] else 0
        best = max(best, consec)
    big = []
    for i in range(s20, n):
        if (c[i] - c[i - 1]) / c[i - 1] * 100 > 5:
            seg = v[max(0, i - 5):i]
            if seg and sum(seg) > 0 and v[i] / (sum(seg) / len(seg)) > 3:
                big.append(d[i])
    rise250 = (c[li] - c[n - 251]) / c[n - 251] * 100 if n > 250 else 0
    items = [
        ("3 大幅向上跳空缺口", bool(gaps), " ".join(gaps)),
        ("4 单日暴跌次日", crash_hit, d[crash[-1]] if crash else ""),
        ("5 连续涨停接力板", best >= 2, f"{best}板"),
        ("6 巨量大阳/高位放量", bool(big), " ".join(big)),
        ("7 妖股画像(250日涨>200%且换手>10%)", rise250 > 200 and q["turnover"] > 10, f"250日涨{rise250:.0f}%"),
        ("8 浮盈盘集中高位股", 0 <= dd250 < 5 and day_vr > 1.5, f"回撤{dd250:.1f}% 量比{day_vr:.1f}"),
    ]
    for name, hit, note in items:
        print(f"- {name}：{'❌ 命中 ' + note if hit else '未命中'}")
    res["neg_hits"] = sum(1 for _, hit, _ in items if hit)

    # 企稳四信号
    section("企稳信号")
    shrink = 0 <= q["turnover"] < 2
    no_new_low = all(l[i] >= l[i - 1] for i in range(n - 3, n))
    lo_i = min(range(s20, n), key=lambda i: l[i])
    waited = (n - 1 - lo_i) >= 3
    print(f"- 量能收敛(换手<2%)：{'是' if shrink else '否'}（{q['turnover']:.2f}%）")
    print(f"- 连续3日不创新低：{'是' if no_new_low else '否'}")
    print(f"- 等够3-5日：{'是' if waited else '否'}（近20日低点 {l[lo_i]:.2f}，{d[lo_i]}，距今 {n-1-lo_i} 日）")
    print("- 龙头反包/资金回流：需结合资金流与人工判断")
    stable = sum([shrink, no_new_low, waited])
    print(f"- **满足 {stable}/3**；{'部分企稳信号已现，仍需确认，不宜重仓' if stable >= 2 else '企稳信号不足，维持只观察不介入'}")

    res.update(price=c[li], ma=(ma5, ma10, ma20, ma60), bull=bull, dd250=dd250, signals=sig,
               stable=stable, rsi6=r6[li], macd_cross_risk=dif[li] < dif[li - 1])
    return res


def analyze_money_flow(rows):
    section("资金流（主力 = 超大单 + 大单）")
    if not rows:
        print("- 未获取到资金流数据")
        return {}
    n = len(rows)
    seg = lambda k: rows[max(0, n - k):]
    s5, s10, s20 = (sum(r["main"] for r in seg(k)) for k in (5, 10, 20))
    p5, p10, p20 = (sum(r["main"] > 0 for r in seg(k)) for k in (5, 10, 20))
    print("| 区间 | 主力累计净流入(亿) | 净流入天数 |\n|---|---|---|")
    print(f"| 近5日 | {s5/1e8:.2f} | {p5}/5 |\n| 近10日 | {s10/1e8:.2f} | {p10}/10 |\n| 近20日 | {s20/1e8:.2f} | {p20}/20 |")
    print("\n近10日明细：")
    for r in seg(10):
        print(f"- {r['date']}  主力 {r['main']/1e4:>9,.0f} 万  占比 {r['pct']:>6.2f}%  涨跌 {r['chg']:+.2f}%  收盘 {r['close']:.2f}")
    persist = s20 > 0 and p20 >= 12 and s5 > 0
    print(f"\n- 近20日是否持续净流入：**{'是' if persist else '否'}**")
    if not persist:
        print("  " + ("近20日整体净流出，警惕出货" if s20 < 0 else "近5日转流出，流入不持续" if s5 < 0 else "净流入天数不足(<12/20)"))
    last60 = seg(60)
    top = max(last60, key=lambda r: r["close"])
    dd60 = (top["close"] - rows[-1]["close"]) / top["close"] * 100
    print(f"- 近60日最高收盘 {top['close']:.2f}（{top['date']}），回撤 {dd60:.2f}%"
          + ("；⚠️ 股价处高位 + 主力净流出，警惕派发" if dd60 < 10 and s20 < 0 else ""))
    return {"s5": s5, "s10": s10, "s20": s20, "p5": p5, "p10": p10, "persist": persist}


def analyze_announcements(code, years=3, recent_days=30, neg_window=180):
    items, total = fetch_announcements(code, years)
    section("公告风险")
    print(f"- 近{years}年公告 {len(items)} 条（历史共 {total} 条）")
    now = datetime.now()
    dt = lambda a: datetime.strptime(a["notice_date"][:10], "%Y-%m-%d")

    reg = next((a for a in items if re.search(r"最近五年.*监管措施", a["title"])), None)
    if reg:
        txt = ann_content(reg["art_code"])
        pun = "无" if re.search(r"不存在被.*处罚", txt) else "存在(详见原文)" if "处罚" in txt else "未识别"
        mea = "无" if re.search(r"不存在被.*监管措施", txt) else "存在(详见原文)" if "监管措施" in txt else "未识别"
        print(f"- 监管（依据 {reg['notice_date'][:10]} 公告）：处罚 {pun}；监管措施 {mea}")
    else:
        print("- 监管：未找到《最近五年…监管措施或处罚情况》公告（非定增公司可能未披露）")

    aud = next((a for a in items if re.search(r"(年度|财务报表).*审计报告|审计报告", a["title"])
                and not re.search(r"内部控制|内控|专项|履职|监督职责|委员会", a["title"])), None)
    if aud:
        txt = ann_content(aud["art_code"])
        print(f"- 审计（依据 {aud['notice_date'][:10]}《{aud['title'].split(':')[-1]}》）："
              f"{audit_opinion(txt) if txt else '原文获取失败(可能为PDF)，请查巨潮'}")
    else:
        print("- 审计：未找到年度审计报告")

    kw = "质押|减持|解禁|限售|监管|问询|警示|立案|处罚|诉讼|仲裁|违规|谴责|破产|退市|终止上市|更正"
    risk = [a for a in items if re.search(kw, a["title"]) and "审计委员会" not in a["title"]]
    print(f"\n风险类公告（{len(risk)} 条，最近 15 条）：")
    for a in risk[:15]:
        print(f"- {a['notice_date'][:10]} [{category(a['title'])}] {a['title']}")

    recent = [a for a in items if re.search("减持|解禁|解除限售|上市流通|限售", a["title"]) and (now - dt(a)).days <= recent_days]
    print(f"\n- 近{recent_days}日减持/解禁公告：{len(recent)} 条" + "".join(f"\n  - {a['notice_date'][:10]} {a['title']}" for a in recent))

    # 大宗交易
    bt = fetch_block_trades(code)
    bt_recent = [b for b in bt if (now - datetime.strptime(b["TRADE_DATE"][:10], "%Y-%m-%d")).days <= recent_days]
    disc = 0
    for b in bt_recent:
        prem = (float(b["DEAL_PRICE"]) - float(b["CLOSE_PRICE"])) / float(b["CLOSE_PRICE"]) * 100 if float(b["CLOSE_PRICE"]) else 0
        disc += prem < -0.5
    last_bt = bt[0]["TRADE_DATE"][:10] if bt else "无记录"
    print(f"- 近{recent_days}日大宗交易：{len(bt_recent)} 笔（折价 {disc} 笔；最近一笔 {last_bt}）")

    # 负面清单（公告标题，窗口 neg_window 天）
    section(f"公告负面清单（近{neg_window}天标题命中）")
    hits = classify([x for x in items if (now - dt(x)).days <= neg_window])
    neg_total = sum(len(v) for v in hits.values()) + disc
    print("- " + "　".join(f"{k} {len(v)}" for k, v in hits.items()) + f"　大宗折价 {disc}　→ "
          + ("**通过**" if neg_total == 0 else "**有命中，需人工复核**"))
    for k, lst in hits.items():
        for a in lst:
            print(f"  - [{k}] {a['notice_date'][:10]} {a['title']}")
    return {"neg_total": neg_total}


def analyze_valuation(code, q, dps, skip_eniu):
    section("估值与股息")
    print(f"- PE(TTM) {q['pe']}　PB {q['pb']}　总市值 {q['total_cap']} 亿")
    if not skip_eniu:
        try:
            v, dates = fetch_pb_history(code)
            cur = v[-1]
            print(f"- 亿牛 PB 序列（至 {dates[-1]}）当前 **{cur:.2f}**：")
            for yrs in (3, 5, 10):
                w = sorted(v[-min(len(v), int(yrs * 245)):])
                print(f"  - 近{yrs}年分位 **{bisect.bisect_left(w, cur) / len(w) * 100:.1f}%**（区间 {w[0]:.2f}~{w[-1]:.2f}，中位 {w[len(w)//2]:.2f}）")
        except Exception as e:
            print(f"- 亿牛 PB 获取失败：{e}")
    if dps:
        print(f"- 股息率（每股分红 {dps} / 现价 {q['price']}）：**{dps / q['price'] * 100:.2f}%**")
    else:
        print("- 股息率：未提供 --dps，请据最近分红公告自行计算（东财 / 亿牛股息率接口不稳定或停更，未采用）")


# ---------------------------------------------------------------- 主流程

def main():
    ap = argparse.ArgumentParser(description="A股单只股票一站式分析")
    ap.add_argument("code", help="6位股票代码，如 600398")
    ap.add_argument("--out", help="同时保存报告到该 Markdown 文件")
    ap.add_argument("--dps", type=float, help="最近一年每股现金分红(元)，用于计算股息率")
    ap.add_argument("--years", type=int, default=3, help="公告扫描年限（默认3）")
    ap.add_argument("--skip-eniu", action="store_true", help="跳过亿牛 PB 历史")
    args = ap.parse_args()
    code = args.code.strip()

    buf = io.StringIO()
    with redirect_stdout(buf):
        q = quote(code)
        print(f"# {q['name']}（{code}）数据分析报告\n")
        print(f"> 生成时间 {datetime.now():%Y-%m-%d %H:%M}　现价 {q['price']}（{q['chg']:+.2f}%）　"
              f"换手 {q['turnover']}%　涨停/跌停价 {q['up']}/{q['down']}\n> ⚠️ 仅为数据计算与信息整理，不构成投资建议")
        k = fetch_kline(code)
        print(f"\n最新交易日：{k['date'][-1]}（前复权，共 {len(k['close'])} 根K线）")
        tech = analyze_technical(code, q, k)
        analyze_valuation(code, q, args.dps, args.skip_eniu)
        try:
            mf = analyze_money_flow(fetch_money_flow(code))
        except Exception as e:
            print(f"\n资金流获取失败：{e}")
            mf = {}
        try:
            ann = analyze_announcements(code, args.years)
        except Exception as e:
            print(f"\n公告获取失败：{e}")
            ann = {}

        section("汇总")
        c = tech
        print("| 维度 | 结果 |\n|---|---|")
        print(f"| 趋势 | {'多头排列' if c['bull'] else '非多头排列'}；现价 {c['price']:.2f}，MA20 {c['ma'][2]:.2f}，MA60 {c['ma'][3]:.2f} |")
        print(f"| MACD | {'DIF拐头向下' if c['macd_cross_risk'] else 'DIF未拐头'} |")
        print(f"| 位置 | 距52周高点回撤 {c['dd250']:.1f}% |" if c["dd250"] >= 0 else "| 位置 | K线不足250根 |")
        print(f"| 情绪极端 | {'⚠️ ' + '、'.join(c['signals']) if c['signals'] else '未触发'} |")
        print(f"| 企稳信号 | {c['stable']}/3 |")
        print(f"| 技术负面清单 | 命中 {c['neg_hits']} 项 |")
        if mf:
            print(f"| 资金面 | 近5/10/20日主力 {mf['s5']/1e8:.2f} / {mf['s10']/1e8:.2f} / {mf['s20']/1e8:.2f} 亿 |")
        if ann:
            print(f"| 公告负面清单 | {'通过' if ann['neg_total'] == 0 else '命中 ' + str(ann['neg_total']) + ' 项，需复核'} |")
        print("\n> 分层判断（防守/成长/进攻）、基本面（财报增速、毛利率、负债率）、审计原文、质押比例等需结合财报与人工判断。")

    out = buf.getvalue()
    print(out)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"\n已保存：{args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
