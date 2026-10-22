"""板块策略扫描（防守场景三层选股 - 第二层）。

    python3 -m ashare.sector_scan

三因子：①防御属性（白名单） ②近10日主力净流入>0 ③近20日涨幅跑赢上证指数。
数据：push2delay 行业板块列表（f110=近20日涨跌幅，f174=近10日主力净流入）+ 腾讯上证指数。
仅供数据计算与信息参考，不构成投资建议。
"""
import time

from .common import EM_REF, http_json, kline_recent, to_float

DEFENSIVE = [("BK0475", "银行Ⅱ"), ("BK0428", "电力"), ("BK0437", "煤炭"), ("BK0478", "有色金属"),
             ("BK0732", "贵金属"), ("BK0465", "化学制药"), ("BK0420", "航空机场")]


def benchmark_chg20():
    k = kline_recent("sh000001", 60, "bfq")
    if len(k) < 22:
        raise RuntimeError("上证K线不足")
    return (k[-1][2] - k[-21][2]) / k[-21][2] * 100, k[-1][0]


def sector_list(max_pages=5):
    """行业板块列表（代码升序，分页直到白名单全部出现）。"""
    out, want = {}, {b for b, _ in DEFENSIVE}
    for pn in range(1, max_pages + 1):
        url = (f"https://push2delay.eastmoney.com/api/qt/clist/get?pn={pn}&pz=100&po=0&np=1&fltt=2&invt=2"
               "&fid=f12&fs=m:90+t:2&fields=f12,f14,f3,f110,f174")
        diff = (http_json(url, referer=EM_REF, retries=5, sleep=3).get("data") or {}).get("diff") or []
        if not diff:
            break
        out.update({str(o["f12"]): o for o in diff})
        if want <= set(out):
            break
        time.sleep(0.8)
    return out


def main():
    print("=" * 62 + "\nA股板块策略扫描（防守场景三层选股 - 第二层）\n" + "=" * 62)
    try:
        bench, bdate = benchmark_chg20()
    except Exception as e:
        print(f"  上证指数基准获取失败，退出：{e}")
        return
    print(f"[基准] 上证指数 近20日涨跌幅 {bench:.2f}%  (数据基准 {bdate})\n")
    try:
        lst = sector_list()
    except RuntimeError as e:
        print(f"  板块列表获取失败（东财限流），请稍后重试：{e}")
        return

    print(f"{'板块':<8}{'代码':<8}{'10日资金流(亿)':>14}{'板块20日%':>11}{'相对大盘%':>11}  校验")
    print("-" * 62)
    passed, failed = [], []
    for bk, nm in DEFENSIVE:
        o = lst.get(bk)
        if o is None:
            print(f"{nm:<8}{bk:<8} 不在列表中")
            continue
        chg20, flow10 = to_float(o["f110"]), to_float(o["f174"])
        rel = chg20 - bench
        check = "OK" if str(o["f14"]) == nm else f"不符:{o['f14']}"
        print(f"{nm:<8}{bk:<8}{flow10 / 1e8:>14.2f}{chg20:>11.2f}{rel:>11.2f}  {check}")
        if flow10 > 0 and rel > 0:
            passed.append(nm)
        else:
            failed.append(f"{nm}({'资金流出' if flow10 <= 0 else '跑输大盘'})")
    print("\n---------- 三因子判定汇总 ----------")
    print(f"  通过（纳入选股范围）：{'、'.join(passed) or '无'}")
    print(f"  未通过：{'、'.join(failed) or '无'}")
    print("\n说明：通过 = 防御属性 + 近10日资金净流入 + 跑赢大盘(近20日) 三者同时满足。")
    print("=" * 62 + "\n以上仅为板块数据整理，不构成投资建议。")


if __name__ == "__main__":
    main()
