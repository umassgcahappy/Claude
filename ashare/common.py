"""A股脚本共用工具：HTTP、指标、数据获取、亿牛网本地缓存。"""
import json
import math
import os
import re
import sys
import time

import requests

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
EM_REF = "https://data.eastmoney.com/"
TX_REF = "https://gu.qq.com/"
ENIU_REF = "https://eniu.com/"
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")
BOARD_NAMES = {"BK0475": "银行Ⅱ", "BK0437": "煤炭", "BK0732": "贵金属"}
DEFAULT_BOARDS = ["BK0475", "BK0437", "BK0732"]

_S = requests.Session()
_S.headers.update({"User-Agent": UA})
NAN = float("nan")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def http_json(url, referer=None, timeout=20, retries=3, sleep=2.0):
    """带重试的 GET，返回 JSON；全部失败抛 RuntimeError。"""
    last = None
    for i in range(retries):
        try:
            r = _S.get(url, headers={"Referer": referer} if referer else None, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last = e
            time.sleep(min(sleep * (i + 1), 6))
    raise RuntimeError(f"请求失败 {url[:80]}...: {last}")


def prefix(code):
    return "sh" if code.startswith(("6", "5")) else "sz"


def to_float(v):
    """东财无数据返回 '-'，统一转 0.0（与原脚本一致）。"""
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def split_codes(items):
    """支持 --codes 600036 000001 或 600036,000001。"""
    out = []
    for it in items or []:
        out += [x.strip() for x in str(it).split(",") if x.strip()]
    return out


# ---------------------------------------------------------------- 指标

def ma_series(vals, p):
    out, s = [NAN] * len(vals), 0.0
    for i, v in enumerate(vals):
        s += v
        if i >= p:
            s -= vals[i - p]
        if i >= p - 1:
            out[i] = s / p
    return out


def ema_series(vals, p):
    k, out = 2 / (p + 1), [vals[0]]
    for v in vals[1:]:
        out.append((v - out[-1]) * k + out[-1])
    return out


def rsi_series(vals, period):
    """Wilder 平滑（等价通达信 SMA(x,n,1)）。"""
    out = [NAN] * len(vals)
    ag = al = 0.0
    for i in range(1, len(vals)):
        chg = vals[i] - vals[i - 1]
        g, l = (chg, 0.0) if chg > 0 else (0.0, -chg)
        if i < period:
            ag += g
            al += l
        elif i == period:
            ag, al = (ag + g) / period, (al + l) / period
        else:
            ag, al = (ag * (period - 1) + g) / period, (al * (period - 1) + l) / period
        if i >= period:
            out[i] = 100.0 if al == 0 else 100 - 100 / (1 + ag / al)
    return out


def pearson(x, y):
    n = len(x)
    if n < 3:
        return NAN
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    return NAN if sxx == 0 or syy == 0 else sxy / math.sqrt(sxx * syy)


def isnan(x):
    return x != x


# ---------------------------------------------------------------- 数据获取

TX_HOSTS = ["https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
            "https://proxy.finance.qq.com/ifzqgtimg/appstock/app/fqkline/get"]


def _tx_rows(sym, param_tail, fq):
    last = None
    for host in TX_HOSTS:
        try:
            d = http_json(f"{host}?param={sym},day,{param_tail}", referer=TX_REF, timeout=15, retries=2, sleep=1)
            node = d["data"].get(sym) or {}
            arr = node.get(f"{fq}day") or node.get("day")
            if arr:
                return [r[:6] for r in arr]
            return []
        except Exception as e:
            last = e
    raise RuntimeError(f"腾讯K线失败 {sym}: {last}")


def kline_recent(sym, count=320, fq="qfq"):
    """最近 count 根日K，返回 [[date,o,c,h,l,v(float)...]]。"""
    rows = _tx_rows(sym, f",,{count},{fq}", fq)
    return [[r[0]] + [float(x) for x in r[1:]] for r in rows]


def kline_full(sym, fq="qfq", seg=640, max_seg=30, start="1990-01-01"):
    """向前分页拉全部日K（腾讯单次约 640 根），按日期去重，旧→新。"""
    rows, end = [], ""
    for _ in range(max_seg):
        tail = f",,{seg},{fq}" if not end else f"1990-01-01,{end},{seg},{fq}"
        arr = _tx_rows(sym, tail, fq)
        if not arr:
            break
        first = arr[0][0]
        rows = arr + rows
        if len(arr) < seg or first == end:
            break
        end = first
        time.sleep(0.2)
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: r[0]):
        if r[0] not in seen and r[0] >= start:
            seen.add(r[0])
            out.append([r[0]] + [float(x) for x in r[1:]])
    return out


def board_stocks(bk, fields="f12,f14", fid="f174", retries=5):
    """东财板块成分股；失败返回 None。"""
    url = ("https://push2delay.eastmoney.com/api/qt/clist/get?pn=1&pz=200&po=1&np=1&fltt=2&invt=2"
           f"&fid={fid}&fs=b:{bk}&fields={fields}")
    try:
        return (http_json(url, referer=EM_REF, retries=retries, sleep=3).get("data") or {}).get("diff")
    except RuntimeError:
        return None


def stock_name(code):
    try:
        r = _S.get(f"https://qt.gtimg.cn/q={prefix(code)}{code}", timeout=10)
        r.encoding = "gbk"
        return r.text.split('"')[1].split("~")[1]
    except Exception:
        return ""


def build_universe(boards, codes, fields="f12,f14", fid="f174"):
    """-> [{code,name,board,...}]。codes 优先；否则按板块拉取，同一股票去重。"""
    uni = {}
    if codes:
        for c in codes:
            uni[c] = {"code": c, "name": stock_name(c), "board": "-", "raw": None}
        return list(uni.values())
    for bk in boards:
        stocks = board_stocks(bk, fields, fid)
        bn = BOARD_NAMES.get(bk, bk)
        if stocks is None:
            log(f"  板块 {bn}({bk}) 成分股获取失败（东财限流，可用 --codes 手填股票池）")
            continue
        log(f"  板块 {bn}({bk}) 成分股 {len(stocks)} 只")
        for s in stocks:
            uni.setdefault(str(s["f12"]), {"code": str(s["f12"]), "name": str(s["f14"]), "board": bn, "raw": s})
        time.sleep(0.8)
    return sorted(uni.values(), key=lambda u: u["code"])


# ---------------------------------------------------------------- 亿牛网（带本地缓存）

def _cache_path(sym):
    return os.path.join(CACHE_DIR, f"eniu-{sym}.json")


def load_eniu_cache(sym):
    try:
        with open(_cache_path(sym), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def eniu_fetch(sym, kind):
    """kind: pba / dva；成功返回 (dates, vals) 否则 None。"""
    key = "pb" if kind == "pba" else "dv"
    try:
        d = http_json(f"https://eniu.com/chart/{kind}/{sym}/t/all", referer=ENIU_REF, timeout=90, retries=3, sleep=3)
    except RuntimeError:
        return None
    if not d.get("date") or not d.get(key) or len(d["date"]) < 60:
        return None
    return d["date"], d[key]


def eniu_series(sym, kind, use_network=True):
    """优先读缓存（cache_eniu 生成），其次联网。返回 (dates, [float]) 或 None。"""
    key = "pb" if kind == "pba" else "dv"
    c = load_eniu_cache(sym)
    if c and len(c.get(f"{key}_dates") or []) >= 60:
        return c[f"{key}_dates"], [to_float(v) for v in c[f"{key}_vals"]]
    if not use_network:
        return None
    r = eniu_fetch(sym, kind)
    return (r[0], [to_float(v) for v in r[1]]) if r else None


def pb_percentile(sym, use_network=True, lookback=1250, min_samples=250):
    """近5年PB分位：返回 (pct, 当前PB, 样本年数) 或 None。"""
    s = eniu_series(sym, "pba", use_network)
    if not s or len(s[1]) < 60:
        return None
    vals = s[1]
    cur = vals[-1]
    if cur <= 0:
        return None
    window = [v for v in vals[max(0, len(vals) - 1 - lookback):-1] if v > 0]
    if len(window) < min_samples:
        return None
    return sum(v <= cur for v in window) * 100.0 / len(window), cur, round(len(window) / 250, 1)


def table(rows, headers, aligns=None):
    """简易等宽表格（中文按 2 宽度对齐）。"""
    def w(s):
        return sum(2 if ord(ch) > 0x2E80 else 1 for ch in str(s))
    cols = list(zip(*([headers] + rows))) if rows else [[h] for h in headers]
    widths = [max(w(x) for x in c) for c in cols]
    out = []
    for r in [headers] + rows:
        cells = []
        for i, x in enumerate(r):
            pad = widths[i] - w(x)
            right = aligns and aligns[i] == "r"
            cells.append(" " * pad + str(x) if right else str(x) + " " * pad)
        out.append("  ".join(cells).rstrip())
    return "\n".join(out)
