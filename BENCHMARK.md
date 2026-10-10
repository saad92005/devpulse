# DevPulse benchmark

Model: `openai/gpt-oss-120b` · runs: 1 · date: 2026-10-10

| Metric | Value |
|---|---|
| Seeded bugs caught (recall) | **8/9 (89%)** |
| Raw candidates filtered as noise | 1/9 (11%) |
| Verified findings on the clean sample (false positives) | 0 |
| Average time per review | 9.1s |

| Sample | Caught | Raw | Kept | Score | Time |
|---|---|---|---|---|---|
| Search endpoint (Node) | 2/3 | 3 | 2 | 63 | 4.7s |
| Order processing (TypeScript) | 2/2 | 2 | 2 | 83 | 4.2s |
| Upload handler (Python) | 4/4 | 4 | 4 | 39 | 10.0s |
| Clean refactor (no bugs) | 0/0 | 0 | 0 | 100 | 17.6s |
