"""分波次逐因子回测（防守场景三层选股 - 第 5 步）。

    python3 -m ashare.backtest                         # 默认银行Ⅱ/煤炭/贵金属 全部成分股，7 因子
    python3 -m ashare.backtest --codes 600036 601398   # 手填股票池
    python3 -m ashare.backtest --limit 5               # 只测前 5 只（冒烟）
    python3 -m ashare.backtest --factors 7 8           # 只测 #7位置 / #8趋势

因子（分数越高预期收益越好）：#2情绪极端(否决,命中-1) #3估值分位 #4股息率 #6量能 #7位置 #8趋势 #9形态
每隔 --step 个交易日取一个样本，看未来 --horizon 日收益。有效 = 多空差>0 且 IC>0；4 波次中≥3 个有效保留。
数据：腾讯前复权日线（分页）+ 亿牛网每日 PB / 股息率（优先读 cache_eniu 的本地缓存）。
仅供研究，不构成投资建议。
"""
import argparse
import bisect
import time
from datetime import date

from .common import (DEFAULT_BOARDS, build_universe, eniu_series, isnan, kline_full, log, ma_series, pearson,
                     prefix, rsi_series, split_codes)

WAVES = [("w1", "①熊转反弹", "2018-01-01", "2019-06-30"),
         ("w2", "②结构牛", "2019-07-01", "2021-12-31"),
         ("w3", "③单边熊", "2022-01-01", "2024-01-31"),
         ("w4", "④反弹震荡", "2024-02-01", date.today().isoformat())]
FACTOR_NAMES = {2: "情绪极端", 3: "估值分位", 4: "股息率", 6: "量能收敛", 7: "位置分位", 8: "趋势", 9: "K线形态"}


def le_index(dates, target):
    """最后一个 <= target 的下标，没有返回 -1。"""
    return bisect.bisect_right(dates, target) - 1


def factor_stats(samples, field):
    xs = [float(s[field]) for s in samples]
    ys = [s["fwd"] for s in samples]
    if len(xs) < 3:
        return None
    groups = {1: [], 0: [], -1: []}
    for x, y in zip(xs, ys):
        if int(x) in groups:
            groups[int(x)].append(y)
    mean = {k: (sum(v) / len(v) if v else float("nan")) for k, v in groups.items()}
    ls = float("nan") if isnan(mean[1]) or isnan(mean[-1]) else mean[1] - mean[-1]
    win = sum(y > 0 for y in groups[1]) * 100.0 / len(groups[1]) if groups[1] else float("nan")
    return {"ic": pearson(xs, ys), "m1": mean[1], "m0": mean[0], "mm1": mean[-1], "ls": ls, "win": win, "n": len(xs)}


def sample_stock(k, factors, horizon, step, min_hist, waves, pb, dv):
    """返回 [(wave_key, sample_dict)]。"""
    n = len(k)
    dates = [r[0] for r in k]
    c, h, l, v = ([r[i] for r in k] for i in (2, 3, 4, 5))
    ma5, ma10, ma20, ma60 = (ma_series(c, p) for p in (5, 10, 20, 60))
    rsi6 = rsi_series(c, 6)
    out = []
    for i in range(min_hist, n - horizon, step):
        d = dates[i]
        wk = next((w[0] for w in waves if w[2] <= d <= w[3]), None)
        if wk is None or c[i] <= 0 or c[i + horizon] <= 0:
            continue
        s = {"fwd": c[i + horizon] / c[i] - 1.0}

        if 7 in factors:
            mx = max(h[max(0, i - 249):i + 1])
            dd = (mx - c[i]) / mx * 100 if mx > 0 else 0.0
            s["s7"] = -1 if dd < 5 else 1 if dd > 50 else 0
        if 8 in factors:
            s["s8"] = 0 if isnan(ma60[i]) else 1 if c[i] > ma60[i] else -1

        vol_ratio = shrink = big_vol = None
        if {2, 6, 9} & set(factors):
            v20 = sum(v[max(0, i - 19):i + 1]) / 20.0
            seg = v[max(0, i - 59):max(0, i - 19)]
            v60 = sum(seg) / len(seg) if seg else 0.0
            vol_ratio = v20 / v60 if v60 > 0 else 1.0
            shrink = vol_ratio < 0.8
            if 6 in factors:
                s["s6"] = 1 if vol_ratio < 0.8 else 0 if vol_ratio <= 1.5 else -1
            last_chg = (c[i] - c[i - 1]) / c[i - 1] if i > 0 and c[i - 1] > 0 else 0.0
            big_vol = last_chg > 0.05 and vol_ratio > 3
        if 2 in factors:
            bias = 0.0
            if not (isnan(ma5[i]) or isnan(ma10[i]) or isnan(ma20[i])):
                bias = max(abs((c[i] - m[i]) / m[i] * 100) for m in (ma5, ma10, ma20))
            s["s2"] = -1 if (rsi6[i] > 70 or bias > 10 or big_vol) else 0
        if 9 in factors:
            no_new_low = all(not (j > 0 and l[j] < l[j - 1]) for j in range(i - 2, i + 1))
            st = max(0, i - 19)
            min_idx = min(range(st, i + 1), key=lambda j: l[j])
            stable = shrink + no_new_low + (i - min_idx >= 3)
            s["s9"] = 1 if stable >= 2 else -1 if big_vol else 0

        if 3 in factors and pb:
            j = le_index(pb[0], d)
            if j >= 0 and pb[1][j] > 0:
                cur = pb[1][j]
                win = [x for x in pb[1][max(0, j - 1250):j] if x > 0]
                if len(win) >= 250:
                    pct = sum(x <= cur for x in win) * 100.0 / len(win)
                    s["s3"] = 1 if pct < 30 else 0 if pct <= 70 else -1
        if 4 in factors and dv:
            j = le_index(dv[0], d)
            if j >= 0 and dv[1][j] > 0:
                s["s4"] = 1 if dv[1][j] > 4 else 0 if dv[1][j] >= 2 else -1
        out.append((wk, s))
    return out


def main():
    ap = argparse.ArgumentParser(description="分波次逐因子回测")
    ap.add_argument("--boards", nargs="*", default=DEFAULT_BOARDS)
    ap.add_argument("--codes", nargs="*", default=[])
    ap.add_argument("--horizon", type=int, default=20)
    ap.add_argument("--step", type=int, default=5)
    ap.add_argument("--min-history", type=int, default=260)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--factors", type=int, nargs="*", default=[2, 3, 4, 6, 7, 8, 9])
    ap.add_argument("--start", default="2018-01-01", help="K线起始日期")
    a = ap.parse_args()
    factors = a.factors

    print("=" * 62 + "\nA股防守场景三层选股 —— 分波次逐因子回测\n" + "=" * 62)
    uni = build_universe(a.boards, split_codes(a.codes))
    if a.limit > 0:
        uni = uni[:a.limit]
    print(f"股票池 {len(uni)} 只")

    store = {w[0]: {f: [] for f in factors} for w in WAVES}
    for i, u in enumerate(uni, 1):
        sym = prefix(u["code"]) + u["code"]
        try:
            k = kline_full(sym, "qfq", start=a.start)
        except Exception as e:
            print(f"  [{i}/{len(uni)}] {u['code']} {u['name']} 获取失败：{e}")
            continue
        if len(k) < a.min_history:
            print(f"  [{i}/{len(uni)}] {u['code']} {u['name']} K线不足，跳过")
            continue
        pb = eniu_series(sym, "pba") if 3 in factors else None
        dv = eniu_series(sym, "dva") if 4 in factors else None
        for wk, s in sample_stock(k, factors, a.horizon, a.step, a.min_history, WAVES, pb, dv):
            for f in factors:
                if f"s{f}" in s:
                    store[wk][f].append(s)
        print(f"  [{i}/{len(uni)}] {u['code']} {u['name']} 完成（{len(k)} 根）")
        time.sleep(0.1)

    print(f"\n{'波次':<10}{'因子':<10}{'IC':>7}{'+1组%':>8}{'0组%':>8}{'-1组%':>8}{'多空差%':>9}{'胜率%':>8}{'样本':>7}")
    print("-" * 90)
    valid_cnt = {f: 0 for f in factors}
    for f in factors:
        for wk, wname, _, _ in WAVES:
            samples = store[wk][f]
            st = factor_stats(samples, f"s{f}") if samples else None
            if not st:
                continue
            ok = st["ls"] > 0 and not isnan(st["ic"]) and st["ic"] > 0
            valid_cnt[f] += bool(ok)
            print(f"{wname:<10}{FACTOR_NAMES[f]:<10}{st['ic']:>7.3f}{st['m1'] * 100:>8.2f}{st['m0'] * 100:>8.2f}"
                  f"{st['mm1'] * 100:>8.2f}{st['ls'] * 100:>9.2f}{st['win']:>8.1f}{st['n']:>7}")
    print("\n=== 跨波次有效性汇总（有效=多空差>0 且 IC>0）===")
    for f in factors:
        vc = valid_cnt[f]
        verdict = "✅ 保留" if vc >= 3 else "⚠️ 场景依赖" if vc == 1 else "❌ 剔除"
        print(f"  #{f} {FACTOR_NAMES[f]}: {vc}/4 波次有效 → {verdict}")
    print("\n注：#2为否决因子（命中情绪极端=-1），IC/多空差为正=否决有效；#6回测用量比近似换手率。")
    print("=" * 62 + "\n以上仅为因子回测，不构成投资建议。")


if __name__ == "__main__":
    main()
