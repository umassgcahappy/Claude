"""批量缓存亿牛网 PB / 股息率历史到 ashare/cache/eniu-{sym}.json，供 stock_score / backtest 复用，避免限流。

    python3 -m ashare.cache_eniu                        # 默认银行Ⅱ/煤炭/贵金属
    python3 -m ashare.cache_eniu --codes 600036 600398
    python3 -m ashare.cache_eniu --limit 5
"""
import argparse
import json
import os
import time

from .common import CACHE_DIR, DEFAULT_BOARDS, build_universe, eniu_fetch, load_eniu_cache, log, prefix, split_codes


def main():
    ap = argparse.ArgumentParser(description="缓存亿牛网 PB/股息率历史")
    ap.add_argument("--boards", nargs="*", default=DEFAULT_BOARDS)
    ap.add_argument("--codes", nargs="*", default=[])
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()

    uni = build_universe(a.boards, split_codes(a.codes))
    if a.limit > 0:
        uni = uni[:a.limit]
    print(f"Universe: {len(uni)} stocks")
    os.makedirs(CACHE_DIR, exist_ok=True)
    fetched = cached = failed = 0
    for i, u in enumerate(uni, 1):
        sym = prefix(u["code"]) + u["code"]
        c = load_eniu_cache(sym)
        if c and len(c.get("pb_vals") or []) > 60 and len(c.get("dv_vals") or []) > 60:
            print(f"  [{i}/{len(uni)}] {sym} skip (cached)")
            cached += 1
            continue
        pb = eniu_fetch(sym, "pba")
        time.sleep(0.4)
        dv = eniu_fetch(sym, "dva")
        time.sleep(0.4)
        if pb is None and dv is None:
            print(f"  [{i}/{len(uni)}] {sym} FAIL (no data)")
            failed += 1
            continue
        obj = {"sym": sym, "pb_dates": pb[0] if pb else [], "pb_vals": pb[1] if pb else [],
               "dv_dates": dv[0] if dv else [], "dv_vals": dv[1] if dv else []}
        with open(os.path.join(CACHE_DIR, f"eniu-{sym}.json"), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
        print(f"  [{i}/{len(uni)}] {sym} cached (pb={len(obj['pb_dates'])}, dv={len(obj['dv_dates'])})")
        fetched += 1
    print(f"Done. fetched={fetched} cached={cached} failed={failed}")


if __name__ == "__main__":
    main()
