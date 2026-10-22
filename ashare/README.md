# ashare：防守场景三层选股（Python 版）

由原 PowerShell 脚本移植，只依赖 `requests`。在仓库根目录运行：

| 层级 | 命令 | 对应原脚本 |
|---|---|---|
| 1 大盘 | `python3 -m ashare.market_regime` | market-regime.ps1 |
| 2 板块 | `python3 -m ashare.sector_scan` | sector-scan.ps1 |
| 3 否决 | `python3 -m ashare.neg_list_scan [--codes ...]` | neg-list-scan.ps1 |
| 3 打分 | `python3 -m ashare.stock_score [--codes ...]` | stock-score.ps1 |
| 回测 | `python3 -m ashare.backtest [--codes ...] [--factors 7 8]` | backtest.ps1 |
| 回测 | `python3 -m ashare.rotation_backtest` | rotation-backtest.ps1 |
| 单股 | `python3 -m ashare.stock_analyze 600398 [--dps 0.41] [--out report.md]` | stock-analysis / money-flow / ann-risk-scan |
| 缓存 | `python3 -m ashare.cache_eniu [--codes ...]` | cache-eniu.ps1 |

`stock_analyze` 是单只股票的一站式分析（技术面、估值、资金流、公告风险、负面清单、企稳信号），与批量脚本共用 `common.py`。

- 东财板块列表接口（`push2delay` 的 `clist`）限流时，批量脚本会提示失败；可用 `--codes 600036 601398` 手填股票池。
  此时 `stock_score` 拿不到东财的股息率 / 换手，股息因子记 0 分，"量能收敛"按未满足处理，并在备注标出。
- 亿牛网 PB / 股息率首次较慢，建议先跑 `cache_eniu`，结果缓存在 `ashare/cache/`（已 gitignore）。
- 与原脚本的差异：回测第 4 波次、轮动回测第 3 波次的结束日改为"到今天"（原为硬编码 2026-08）；
  K线分页统一为向前分页；板块列表支持翻页。
- 仅供数据计算与研究，不构成投资建议。
