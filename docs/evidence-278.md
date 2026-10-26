# Evidence Packet for PR #240, #261, #262, and #234

## PR #240: fix: Include manual and transfer amounts in micromole yield calculations

*   **Branch:** `fix-umol-yields-125-4080414232993046242`
*   **Fixture/Check:** `p6_umol` check in `tests/suites/20_science.js`
*   **Before (on main):** Manual and transfer step amounts did not properly show `umol` yields (or crashed/rendered blank).
*   **After (on PR branch):** The check passes when calculating yields using `umol`. Values like `50%`, `25%`, and `80%` are accurately calculated across transfers and manual steps.
*   **Regressions:** No regressions in test suites based on `compare.js`.
*   **Decision:** **Recommend Merge**. The numerical calculations address a valid missing edge case for transfers, and rigorous checks pass without side effects.

## PR #261: Fix A205 concentration provenance in methods

*   **Branch:** `fix-a205-methods-133-7193647953465642902`
*   **Fixture/Check:** `p6_a205_provenance` in `tests/suites/20_science.js` using `tests/data/nd/nd_a205_4mg_ml.tsv`
*   **Before (on main):** The methods text incorrectly attributed an A280 coefficient/reading to an A205 measurement.
*   **After (on PR branch):** The methods correctly say "A205" without improperly claiming A280 was used.
*   **Regressions:** No regressions found via `compare.js`.
*   **Decision:** **Recommend Merge**. The text fix corrects inaccurate scientific reporting for A205 samples and operates safely without breaking A280 logic.

## PR #262: fix: default missing fields on loaded trace and gel objects in openProject

*   **Branch:** `fix-openProject-default-missing-fields-17892537694922263756`
*   **Fixture/Check:** `missing-trace-fields.renders-path` in `tests/suites/30_robust.js`
*   **Before (on main):** Loading `missing_fields.json` throws an error or fails to render paths due to missing default object keys (`visible`, `peaks`, etc.).
*   **After (on PR branch):** The trace defaults missing keys properly and renders an SVG `<path>` without crashing.
*   **Legacy checks:** Safely assigns values during `openProject` and does not mutate existing well-formed legacy projects negatively.
*   **Regressions:** No regressions found via `compare.js`.
*   **Decision:** **Recommend Merge**. This improves robustness and backward compatibility for malformed or minimal project files.

## PR #234: Preserve source units on generic chromatogram figures

*   **Branch:** `jules-16222776467895646012-c4f03ef4`
*   **Fixture/Check:** `synthetic_generic_csv` check in `tests/suites/10_data_truth.js` using `synthetic.csv`
*   **Before (on main):** Units were hardcoded to `mAU` in figures, ignoring actual source trace unit headers (e.g. `AU`).
*   **After (on PR branch):** Dynamically applies correct units (e.g. `Absorbance (AU)`) on the plot and detects peaks appropriately.
*   **Regressions:** No regressions found.
*   **Decision:** **Recommend Merge**. Reliably corrects plot accuracy for generic csv files without permanently altering global user settings (`opt`).
