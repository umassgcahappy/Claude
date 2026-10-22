"""个股策略批量打分（三层选股 - 第三层：五面因子，v1.1 回测精简版）。

    python3 -m ashare.stock_score                        # 默认银行Ⅱ/煤炭/贵金属
    python3 -m ashare.stock_score --boards BK0475 --top 10
    python3 -m ashare.stock_score --codes 600036 601398  # 手填股票池（板块接口限流时用）

核心打分（等权，总分 -3~+3）：
  #7 位置  距52周高回撤 >50% +1，<5% -1
  #4 股息  股息率(东财f133) >4% +1，<2% -1
  #9 形态  企稳信号≥2 +1；放量大阳(涨>5%且量比>3) -1
辅助不计分：PB近5年分位（亿牛网）、近10日主力净流入。
--codes 模式拿不到东财 f133/f174/f8：股息率记 0 分并标注，换手用 K 线估算不了，形态中"量能收敛"按未满足处理。
仅供数据计算与信息参考，不构成投资建议。
"""
import argparse
import time

from .common import (DEFAULT_BOARDS, build_universe, isnan, kline_recent, log, NAN, pb_percentile, prefix,
                     split_codes, table, to_float)


def score_stock(u, count=260):
    sym = prefix(u["code"]) + u["code"]
    k = kline_recent(sym, count)
    n = len(k)
    if n < 60:
        return None
    c, h, l, v = ([r[i] for r in k] for i in (2, 3, 4, 5))
    li = n - 1
    raw = u["raw"] or {}

    dd250 = -1.0
    if n > 250:
        mx = max(h[n - 250:])
        dd250 = (mx - c[li]) / mx * 100
    s7 = 0 if dd250 < 0 else -1 if dd250 < 5 else 1 if dd250 > 50 else 0

    has_em = bool(raw)
    dv = to_float(raw.get("f133")) if has_em else NAN
    turn = to_float(raw.get("f8")) if has_em else -1.0
    flow10 = to_float(raw.get("f174")) if has_em else NAN
    s4 = 0 if isnan(dv) else 1 if dv > 4 else 0 if dv >= 2 else -1

    last_chg = (c[li] - c[li - 1]) / c[li - 1] * 100
    avg_prev = sum(v[n - 21:n - 1]) / 20 if n > 21 else 0
    day_vr = v[li] / avg_prev if avg_prev > 0 else 1.0

    shrink = 0 <= turn < 2
    no_new_low = all(l[i] >= l[i - 1] for i in range(n - 3, n))
    lo_i = min(range(n - 20, n), key=lambda i: l[i])
    waited = (n - 1 - lo_i) >= 3
    stable = shrink + no_new_low + waited
    s9 = 1 if stable >= 2 else -1 if (last_chg > 5 and day_vr > 3) else 0

    pb = pb_percentile(sym)
    return {"code": u["code"], "name": u["name"], "board": u["board"], "score": s7 + s4 + s9,
            "s7": s7, "s4": s4, "s9": s9, "pb": pb[0] if pb else NAN, "dv": dv, "dd": dd250, "flow10": flow10}


def main():
    ap = argparse.ArgumentParser(description="A股个股策略批量打分")
    ap.add_argument("--boards", nargs="*", default=DEFAULT_BOARDS)
    ap.add_argument("--codes", nargs="*", default=[])
    ap.add_argument("--top", type=int, default=15)
    ap.add_argument("--count", type=int, default=260)
    a = ap.parse_args()

    print("=" * 62 + "\nA股个股策略打分（防守场景三层选股 - 第三层）\n" + "=" * 62)
    uni = build_universe(a.boards, split_codes(a.codes), fields="f12,f14,f2,f3,f8,f133,f174")
    print(f"  股票池合计 {len(uni)} 只\n")
    rows = []
    for i, u in enumerate(uni, 1):
        try:
            r = score_stock(u, a.count)
        except Exception as e:
            log(f"  [{i}/{len(uni)}] {u['code']} 跳过：{e}")
            continue
        if r:
            rows.append(r)
        time.sleep(0.15)

    rows.sort(key=lambda r: (-r["score"], 100 if isnan(r["pb"]) else r["pb"]))
    out = []
    for j, r in enumerate(rows[:a.top], 1):
        memo = "；".join(m for m in ("PB分位无数据" if isnan(r["pb"]) else "", "股息率无数据" if isnan(r["dv"]) else "") if m)
        out.append([j, r["code"], r["name"], r["board"], r["score"], r["s7"], r["s4"], r["s9"],
                    "--" if isnan(r["pb"]) else f"{r['pb']:.1f}", "--" if isnan(r["dv"]) else f"{r['dv']:.2f}",
                    f"{r['dd']:.1f}", memo])
    print(table(out, ["#", "代码", "名称", "板块", "总分", "位置", "股息", "形态", "PB分位%", "股息率%", "回撤%", "备注"],
                "rllrrrrrrrrl"))
    print("\n  核心打分（等权，总分 -3~+3）：位置=距52周高回撤(>50% +1,<5% -1)  股息=股息率(>4% +1,<2% -1)  形态=企稳信号")
    print("  辅助（不计分，同分按PB分位低者优先）：PB分位=近5年估值分位")
    print("  已按回测删除：情绪极端否决/量能收敛/趋势。PB分位'--'=亿牛网无数据。")
    print("=" * 62 + "\n以上仅为因子打分，不构成投资建议。")


if __name__ == "__main__":
    main()
