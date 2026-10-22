"""轮动回测：科创50(000688) vs 红利ETF(510880)，前复权（含分红）。

    python3 -m ashare.rotation_backtest
    python3 -m ashare.rotation_backtest --sell-drawdown 2 --sell-rsi 65 --buy-drawdown 30
    python3 -m ashare.rotation_backtest --sell-mode trail --sell-drawdown 10 --buy-mode steady

规则 v0：科创50 距250日高点回撤 < sell-drawdown 且 RSI6 > sell-rsi 时卖科创换红利；
        回撤 > buy-drawdown 时换回科创。
sell-mode: top(默认,高位+RSI) / trail(回撤超阈值止损) / mom3(3日涨幅超阈值)
buy-mode : dd(默认,回撤超阈值) / mom3(3日跌幅超阈值) / steady(站上MA20且低点连续抬高)
buy-ref  : window(250日高点) / all(历史最高)
仅供研究，不构成投资建议。
"""
import argparse

from .common import kline_full, ma_series, rsi_series

WAVES = [("Wave1 2021.05-2021.12 (bull tail)", "2021-05-01", "2021-12-31"),
         ("Wave2 2022.01-2024.01 (bear)", "2022-01-01", "2024-01-31"),
         ("Wave3 2024.02-now (rebound)", "2024-02-01", "2099-12-31")]


def main():
    ap = argparse.ArgumentParser(description="科创50 vs 红利ETF 轮动回测")
    ap.add_argument("--kc-code", default="000688")
    ap.add_argument("--hl-code", default="510880")
    ap.add_argument("--sell-drawdown", type=float, default=2.0)
    ap.add_argument("--sell-rsi", type=float, default=65)
    ap.add_argument("--buy-drawdown", type=float, default=30.0)
    ap.add_argument("--rsi-period", type=int, default=6)
    ap.add_argument("--sell-mode", default="top", choices=["top", "trail", "mom3"])
    ap.add_argument("--buy-mode", default="dd", choices=["dd", "mom3", "steady"])
    ap.add_argument("--buy-ref", default="window", choices=["window", "all"])
    ap.add_argument("--warmup", type=int, default=250)
    a = ap.parse_args()

    print("=" * 62)
    print(f"Rotation backtest: STAR50 {a.kc_code} vs Dividend ETF {a.hl_code} (qfq)")
    print(f"Params: SELL STAR50 when dd250<{a.sell_drawdown}% AND RSI6>{a.sell_rsi}; BUY back when dd250>{a.buy_drawdown}%")
    print("=" * 62)

    kc = kline_full(f"sh{a.kc_code}", "qfq")
    hl = kline_full(f"sh{a.hl_code}", "qfq")
    print(f"Fetched STAR50 {len(kc)} bars, dividend {len(hl)} bars")
    hl_map = {r[0]: r[2] for r in hl}
    rows = [r for r in kc if r[0] in hl_map]
    dates = [r[0] for r in rows]
    kc_c, kc_low = [r[2] for r in rows], [r[4] for r in rows]
    hl_c = [hl_map[d] for d in dates]
    L = len(dates)
    if L <= a.warmup + 5:
        print("对齐后K线不足，退出")
        return
    print(f"Aligned {L} bars, {dates[0]} .. {dates[-1]}")

    rsi = rsi_series(kc_c, a.rsi_period)
    ma20 = ma_series(kc_c, 20)
    run_max, m = [], 0.0
    for x in kc_c:
        m = max(m, x)
        run_max.append(m)

    nav_kc = nav_hl = nav_rot = max_nav = 1.0
    max_dd, pos, switches = 0.0, 1, 0
    kc_a, hl_a, rot_a, sw_log = [], [], [], []
    for i in range(L):
        if i > 0:
            r_kc, r_hl = kc_c[i] / kc_c[i - 1] - 1, hl_c[i] / hl_c[i - 1] - 1
            nav_kc *= 1 + r_kc
            nav_hl *= 1 + r_hl
            nav_rot *= 1 + (r_kc if pos == 1 else r_hl)
            max_nav = max(max_nav, nav_rot)
            max_dd = max(max_dd, (max_nav - nav_rot) / max_nav * 100)
        if i >= a.warmup:
            hi = max(kc_c[i - 249:i + 1])
            dd250 = (hi - kc_c[i]) / hi * 100
            dd_all = (run_max[i] - kc_c[i]) / run_max[i] * 100
            dd_buy = dd_all if a.buy_ref == "all" else dd250
            r3 = (kc_c[i] / kc_c[i - 3] - 1) * 100
            sell = False
            if pos == 1:
                if a.sell_mode == "trail":
                    sell = dd250 > a.sell_drawdown
                elif a.sell_mode == "mom3":
                    sell = r3 > a.sell_drawdown
                else:
                    sell = dd250 < a.sell_drawdown and rsi[i] > a.sell_rsi
            if sell:
                pos, switches = 0, switches + 1
                sw_log.append((dates[i], "->DIV"))
            elif pos == 0:
                if a.buy_mode == "mom3":
                    buy = r3 < -a.buy_drawdown
                elif a.buy_mode == "steady":
                    buy = kc_c[i] > ma20[i] and kc_low[i] > kc_low[i - 1] > kc_low[i - 2]
                else:
                    buy = dd_buy > a.buy_drawdown
                if buy:
                    pos, switches = 1, switches + 1
                    sw_log.append((dates[i], "->STAR"))
        kc_a.append(nav_kc)
        hl_a.append(nav_hl)
        rot_a.append(nav_rot)

    print("\n---------- FULL PERIOD ----------")
    print(f"hold-STAR50   return {(nav_kc - 1) * 100:8.1f}%")
    print(f"hold-dividend return {(nav_hl - 1) * 100:8.1f}%")
    print(f"rotation      return {(nav_rot - 1) * 100:8.1f}%   maxDD {max_dd:.1f}%   switches {switches}")

    print("\n---------- BY WAVE ----------")
    for name, s, e in WAVES:
        si = next((i for i, d in enumerate(dates) if d >= s), -1)
        ei = max((i for i, d in enumerate(dates) if d <= e), default=-1)
        if si < 0 or ei < si:
            print(f"{name}: out of range")
            continue
        pre = max(si - 1, 0)
        g = lambda arr: (arr[ei] / arr[pre] - 1) * 100
        sw = sum(s <= d <= e for d, _ in sw_log)
        print(f"{name:<36} STAR50 {g(kc_a):8.1f}%  dividend {g(hl_a):8.1f}%  rotation {g(rot_a):8.1f}%  switches {sw}")

    print("\n---------- SWITCH LOG ----------")
    for d, t in sw_log:
        print(f"  {d} {t}")
    print("=" * 62)


if __name__ == "__main__":
    main()
