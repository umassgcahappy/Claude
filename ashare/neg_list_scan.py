"""负面清单批量扫描（三层选股 - 第三层 #1 否决因子）。

    python3 -m ashare.neg_list_scan                          # 默认银行Ⅱ/煤炭/贵金属
    python3 -m ashare.neg_list_scan --boards BK0475 BK0437
    python3 -m ashare.neg_list_scan --codes 600036 600398    # 手填股票池（板块接口限流时用）
    python3 -m ashare.neg_list_scan --window 180 --block-days 30

否决项（任一命中即标记）：减持 / 解禁 / 监管处罚 / 诉讼（近 window 天公告标题）+ 大宗折价（近 block-days 天）。
只做标题关键词级筛选，最终否决请人工复核。仅供信息检索，不构成投资建议。
"""
import argparse
import re
import time
from datetime import datetime, timedelta

from .common import DEFAULT_BOARDS, EM_REF, build_universe, http_json, log, split_codes, stock_name, table


def ann_list(code, cutoff, max_pages):
    """公告列表（翻页直到超出窗口）。接口失败时返回已取到的部分。"""
    allv = []
    for p in range(1, max_pages + 1):
        url = ("https://np-anotice-stock.eastmoney.com/api/security/ann?sr=-1&page_size=100"
               f"&page_index={p}&ann_type=A&client_source=web&stock_list={code}")
        try:
            lst = (http_json(url, referer=EM_REF, retries=2).get("data") or {}).get("list") or []
        except RuntimeError:
            break
        if not lst:
            break
        allv += lst
        if datetime.strptime(lst[-1]["notice_date"][:10], "%Y-%m-%d") < cutoff:
            break
    return [a for a in allv if datetime.strptime(a["notice_date"][:10], "%Y-%m-%d") >= cutoff]


def block_discount(code, cutoff):
    """近期大宗折价笔数；-1 表示接口失败。"""
    url = ("https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DATA_BLOCKTRADE&columns=ALL"
           f"&filter=(SECURITY_CODE%3D%22{code}%22)&pageNumber=1&pageSize=100&sortColumns=TRADE_DATE&sortTypes=-1")
    try:
        r = http_json(url, referer=EM_REF, retries=2)
    except RuntimeError:
        return -1
    data = (r.get("result") or {}).get("data") or [] if r.get("success") else []
    n = 0
    for b in data:
        if datetime.strptime(b["TRADE_DATE"][:10], "%Y-%m-%d") < cutoff:
            continue
        close = float(b["CLOSE_PRICE"])
        n += close != 0 and (float(b["DEAL_PRICE"]) - close) / close * 100 < -0.5
    return n


def classify(anns):
    """标题关键词分类；排除例行《最近五年…》披露、解禁条件未成就/回购注销。"""
    res = {"减持": [], "解禁": [], "处罚": [], "诉讼": []}
    for a in anns:
        t = a["title"]
        routine = re.search(r"最近五年.*(监管措施|处罚情况)", t)
        if "减持" in t:
            res["减持"].append(a)
        if re.search("解禁|解除限售|上市流通|限售", t) and not re.search("条件未成就|回购注销", t):
            res["解禁"].append(a)
        if not routine and re.search("立案|行政处罚|处罚决定|警示函|监管函|谴责|通报批评|纪律处分|责令改正", t):
            res["处罚"].append(a)
        if re.search("诉讼|仲裁|判决|裁定|起诉", t):
            res["诉讼"].append(a)
    return res


def scan(universe, window=180, block_days=30, max_pages=3, sleep=0.6):
    ann_cut = datetime.now() - timedelta(days=window)
    bt_cut = datetime.now() - timedelta(days=block_days)
    results = []
    for i, u in enumerate(universe, 1):
        cls = classify(ann_list(u["code"], ann_cut, max_pages))
        bt = block_discount(u["code"], bt_cut)
        name = u["name"] or stock_name(u["code"])
        hit = [k for k, v in cls.items() if v] + (["大宗折价"] if bt > 0 else [])
        verdict = "接口失败" if bt == -1 else ("[否决]" + "+".join(hit) if hit else "通过")
        results.append({"code": u["code"], "name": name, "cls": cls, "bt": bt, "hit": hit, "verdict": verdict})
        log(f"  [{i}/{len(universe)}] {u['code']} {name} {verdict}")
        time.sleep(sleep)
    return results


def main():
    ap = argparse.ArgumentParser(description="A股负面清单批量扫描")
    ap.add_argument("--boards", nargs="*", default=DEFAULT_BOARDS)
    ap.add_argument("--codes", nargs="*", default=[])
    ap.add_argument("--window", type=int, default=180)
    ap.add_argument("--block-days", type=int, default=30)
    ap.add_argument("--max-pages", type=int, default=3)
    ap.add_argument("--sleep", type=float, default=0.6)
    a = ap.parse_args()

    uni = build_universe(a.boards, split_codes(a.codes))
    print("=" * 62 + f"\nA股负面清单批量扫描  股票池 {len(uni)} 只｜公告窗口近{a.window}天｜大宗折价近{a.block_days}天\n" + "=" * 62)
    res = scan(uni, a.window, a.block_days, a.max_pages, a.sleep)

    rows = [[r["code"], r["name"], len(r["cls"]["减持"]), len(r["cls"]["解禁"]), len(r["cls"]["处罚"]),
             len(r["cls"]["诉讼"]), "?" if r["bt"] == -1 else r["bt"], r["verdict"]] for r in res]
    print("\n" + table(rows, ["代码", "名称", "减持", "解禁", "处罚", "诉讼", "大宗折价", "结论"], "llrrrrrl"))
    vetoed = [r for r in res if r["verdict"].startswith("[否决]")]
    failed = [r["code"] for r in res if r["verdict"] == "接口失败"]
    print("\n---------- 否决清单（命中明细，供人工复核） ----------")
    if not vetoed:
        print("  无命中，股票池全部通过负面清单")
    for r in vetoed:
        print(f"{r['code']} {r['name']}  命中：{'、'.join(r['hit'])}")
        for cat, lst in r["cls"].items():
            for x in lst:
                print(f"      [{cat}] {x['notice_date'][:10]} 《{x['title']}》")
        if r["bt"] > 0:
            print(f"      [大宗折价] 近{a.block_days}天 {r['bt']} 笔")
    print(f"\n---------- 汇总 ----------\n  否决 {len(vetoed)} 只 ｜ 通过 {len(res) - len(vetoed) - len(failed)} 只 ｜ 接口失败 {len(failed)} 只")
    if failed:
        print(f"  接口失败代码：{','.join(failed)}（需稍后重试或人工查）")
    print("=" * 62 + "\n说明：仅按公告标题命中即提示，未读原文比例；最终否决请人工复核。已排除：例行《最近五年…》披露、"
          "年报/审核/异常波动问询函、解禁条件未成就/回购注销。银行类诉讼多为债权追偿例行披露，可放宽。以上不构成投资建议。")


if __name__ == "__main__":
    main()
