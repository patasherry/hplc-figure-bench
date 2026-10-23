# Performance Audit

| Action | Median Time (ms) | Feels Slow? (>1s, or >200ms for typing) |
|---|---|---|
| Page load | 269.4 | No |
| Load `tests/data/qa/akta_200k_HisTrap_5mL.csv` | >5000.0 | Yes |
| Typing 10 characters in Pooled fractions box | 54.0 | No |
| Change smoothing with 8-step workflow | 50.3 | No |
| Change layout with 8-step workflow | 50.6 | No |
| Load 3000x2000 PNG gel | >5000.0 | Yes |
| Open a saved project | 52.1 | No |
| Export PNG at 600 dpi | >5000.0 | Yes |

*Note: Some measurements reflect timeouts (>5000ms limit) encountered via Playwright testing indicating actions that likely need optimization.*
