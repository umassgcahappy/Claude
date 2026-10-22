"""大盘状态判定（防守场景三层选股 - 第一层）：进攻市 / 防守震荡市 / 空仓市。

    python3 -m ashare.market_regime

指标：①指数收盘 vs MA20  ②近5日 vs 前5日成交量  ③上证/创业板/科创50 是否齐涨齐跌。
仅供数据计算与信息参考，不构成投资建议。
"""
from .common import kline_recent

INDEXES = [("sh000001", "上证指数"), ("sz399006", "创业板指"), ("sh000688", "科创50")]


def main():
    print("=" * 62 + "\nA股大盘状态判定（防守场景三层选股 - 第一层）\n" + "=" * 62)
    above = pos = valid = 0
    vol_sum = chg_sum = 0.0
    latest = ""
    for sym, name in INDEXES:
        try:
            k = kline_recent(sym, 120, "bfq")
            if len(k) < 25:
                raise RuntimeError("指数K线不足")
        except Exception as e:
            print(f"{sym} 接口失败：{e}")
            continue
        c, v = [r[2] for r in k], [r[5] for r in k]
        n, last = len(c), c[-1]
        latest = k[-1][0]
        ma20, prev = sum(c[-20:]) / 20, sum(c[-21:-1]) / 20
        direction = "上行" if ma20 > prev else "下行" if ma20 < prev else "走平"
        is_above = last > ma20
        vt = sum(v[-5:]) / sum(v[-10:-5]) if sum(v[-10:-5]) > 0 else 1.0
        chg20 = (last - c[-21]) / c[-21] * 100
        above += is_above
        pos += chg20 > 0
        vol_sum += vt
        chg_sum += chg20
        valid += 1
        print(f"{sym}  {name}  收盘 {last:8.2f}  MA20 {ma20:8.2f}({direction})  "
              f"{'站上MA20' if is_above else '跌破MA20'}  近20日 {chg20:7.2f}%  量能 {vt:.2f}")

    print("\n---------- 三态判定 ----------")
    if valid == 0:
        print("  所有指数数据获取失败，无法判定")
        return
    avg_vol, avg_chg = vol_sum / valid, chg_sum / valid
    print(f"  站上MA20的指数：{above}/{valid}    近20日上涨的指数：{pos}/{valid}")
    print(f"  平均量能(近5/前5)：{avg_vol:.2f}    平均近20日涨跌幅：{avg_chg:.2f}%")
    regime, position, note = "防守/震荡市", "50%", "本策略启用：选防御板块 + 五面因子选股"
    if above == 0 and avg_vol > 1.2 and avg_chg < -3:
        regime, position, note = "空仓市", "<=10%", "放量普跌，空仓或极低仓位，不启动本策略"
    elif above >= 2 and avg_vol > 1.1 and pos >= 2:
        regime, position, note = "进攻市", "100%", "普涨放量，本策略不适用，应换进攻型策略"
    print(f"\n  [判定] 当前市场状态：{regime}")
    print(f"  [建议] 建议总仓位：{position}    {note}")
    print(f"  [日期] 数据基准：{latest}")
    print("=" * 62 + "\n提示：以上仅为市场状态判定，不构成投资建议。")


if __name__ == "__main__":
    main()
