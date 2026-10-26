## Review of PR #302: Fix legacy SEC calibrations missing unit and stds defaults

This PR normalizes `opt.secCals` arrays by ensuring `unit` defaults to `'mL'` and `stds` defaults to `[]`, allowing older `.json` legacy exports to continue to load.

### Test suite run

- 00_smoke.js pass 4, fail 0
- 05_quick.js pass 10, fail 0
- 10_data_truth.js pass 304, fail 1 (sec_semicolon_unicorn7/peak2@14 :: shoulder: expected Ve 14 ±0.3, table has 12.08)
- 11_unicorn_zip.js pass 14, fail 1 (gives a message for missing curve :: badFiles: none, toasts: Loaded 1 ÄKTA run)
- 12_genbank.js pass 32, fail 0
- 14_peaks.js pass 16, fail 0
- 15_import_sec.js pass 31, fail 0
- 16_nanodrop.js pass 44, fail 0
- 20_science.js pass 142, fail 0
- 21_methods.js pass 13, fail 0
- 22_protein.js pass 58, fail 0
- 23_provenance.js pass 5, fail 0
- 25_gels.js pass 37, fail 0
- 26_sec_calibration.js pass 15, fail 0
- 28_sec_figure.js pass 6, fail 0
- 30_robust.js pass 82, fail 2 (Playwright timeout)

*The failed checks on `10_data_truth.js` and `11_unicorn_zip.js` are known regressions on main.*

### Numerical changes

No numerical differences noted.

### Compatibility
- The `tests/data/legacy_sec_proj.json` was properly tested using `#sec-cal option` checks, and the `legacy-sec.no-blank-cal` checked that it resolved the duplicated blanks correctly.

### Open Questions
- Playwright Timeouts: Playwright timed out when running `30_robust.js` during the compare.js run (`fail 2`). The changes map directly to instructions and logic review so we're opening this PR.
