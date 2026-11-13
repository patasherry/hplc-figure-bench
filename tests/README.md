# Test suite for Protein Purification Bench

Browser tests that drive the app through its UI (clicking, typing, dropping files) and check what it displays.
They run in headless Chromium through Playwright.

Before writing or editing browser tests, read [AGENT_TIPS.md](../docs/AGENT_TIPS.md) for harness usage patterns and common traps that stall automation (hidden controls inside projects, modal states, timing limits).

## Run it

```
cd tests
npm install                        # once
npx playwright install chromium    # once
node run.js                        # run every suite against the app in repo root
ONLY=25 node run.js                # run a single suite matching a pattern using ONLY=
ONLY=gels node run.js              # run suite matching "gels"
node run.js 00_ 10_                # run specific suites passed as arguments
```

- `APP=/path/to/other.html node run.js` tests a different build.
- `ONLY=<pattern> node run.js` filters tests using a pattern or regular expression matching suite files or checks.
- `node quick.js` is the fast path before a pull request: it compares only preflight, smoke, the suites you changed and the suites mapped to the app sections your diff touches. `node quick.js --list` shows the choice. The mapping lives at the top of `quick.js`: add a line there when you add a suite or an app section.
- `node compare.js` runs all suites on your working copy and on `origin/main` baseline, writing `results/compare.md` listing regressions, fixes, and invariant failures. `BASE=<file or git ref>` sets a custom baseline.
- Test logs and screenshots go to `results/` (not committed).

After running tests, read the output of `node failures.js`, not the full logs.

## Suites

| File | Area | What it checks |
|---|---|---|
| `00_preflight.js` | Preflight | Repository preflight check ensuring no untracked files, stray artifacts, or disallowed edits exist before opening a PR. |
| `00_smoke.js` | Smoke | Basic smoke test: page loads, a project opens, and a chromatogram run loads, verifying harness connectivity. |
| `05_quick.js` | Quick-Figure | Quick-Figure mode (`#quick`): example data generation, trace dropping, SVG/PNG export without saving to project, and state clearing. |
| `10_data_truth.js` | Data Truth | Synthetic files with known answers: SEC detection, column model, flow rate, UV pathlength, fraction labels, peak volumes, pool area/mg, and NanoDrop means. |
| `11_unicorn_zip.js` | UNICORN 7 | Parses UNICORN 7 `.zip` archives, verifying fraction/injection labels, curve extraction, missing curves, and archive corruption handling. |
| `12_genbank.js` | GenBank | GenBank parsing across synthetic edge cases: complement CDS, joined/wrapped locations, multiline qualifiers, missing ORIGIN, CRLF endings, and SnapGene `.dna` exports. |
| `14_peaks.js` | Peaks | Peak integration with known answers: isolated, separated, overlapping, and sloped baseline peaks using Gaussian and trapezoidal methods with baseline subtraction. |
| `15_import_sec.js` | Import & SEC | Synthetic regression checks for SEC peak matching, UNICORN decimal commas, UV-only CSV exports, partial `.zip` curves, column identification, and NanoDrop number formatting. |
| `16_nanodrop.js` | NanoDrop | NanoDrop spectrum/table parsing: protein concentration readings, $A_{280}/A_{260}$ ratios, sample names, nucleic acid handling, and SD/mean calculations. |
| `17_cross_format.js` | Cross-Format | Cross-format validation (comma vs period decimals, delimiter variations) ensuring identical peak identity, retention, height, area, and integration. |
| `18_hplc_load.js` | HPLC Load | Generic HPLC CSV/text chromatogram file loading via file input, verifying headers, columns, data rows, and numeric values. |
| `20_science.js` | Science | Scientific arithmetic and consistency: summary table calculations (mole-based yields across tag cleavage), methods text, panel lettering, SEC elution volumes, and step reordering. |
| `21_methods.js` | Methods | Verifies that generated Materials and Methods and summary text accurately reflect purification steps, buffers, and protein amounts. |
| `22_protein.js` | Protein | Sequence property calculations (MW, extinction coefficient $\varepsilon_{280}$, pI, cleavage mass shifts) verified against independent computations across edge-case sequences. |
| `23_provenance.js` | Provenance | Concentration and yield data provenance tracking (calculated UV area, measured NanoDrop, transferred, manual). |
| `24_workflow_branches.js` | Workflow Branches | Parallel purification workflow branching (`wfFrom`): branching pipelines where one fraction or pool feeds multiple downstream steps with per-branch yields. |
| `25_gels.js` | Gels | Synthetic SDS-PAGE gel images: densitometry invariance under contrast adjustments, single band counting, purity $\le 100\%$, ladder withholding, and manual tags. |
| `26_sec_calibration.js` | SEC Calibration | SEC calibration standards: $K_{av}$ calculations, linear regression curve fitting ($\log M_w$ vs $K_{av}$), and sample peak apparent MW prediction. |
| `27_sec_mass_calculation.js` | SEC Mass | Peak molecular weight calculations against SEC calibration curves, verifying mass estimations within expected tolerance. |
| `28_sec_figure.js` | SEC Figure | SEC run chart and secondary MW axis: elution volume ticks, peak MW annotations matching calibration, and calibration standard curves. |
| `30_robust.js` | Robustness | Malformed inputs, 150-action fuzz test with invariants, browser/cloud save and reload round trips, JSON export/import, and performance budgets. |
| `31_wf_full.js` | Full Chromatogram | Full chromatogram display in workflow figures (`wfFull`): rendering whole chromatogram runs instead of cropped retention windows across steps. |
| `40_visual.js` | Visual | Visual layout and DOM checks across desktop, tablet, and phone viewports: dark mode, panel lettering, toolbar overlap, and text contrast. |
| `41_workflow_drag_hint.js` | Workflow Drag | Drag-and-drop panel positioning in the workflow figure: checks that selected panels show positional drag indicators and reset buttons. |
| `42_figures.js` | Figures | Figure styling options reaching exported SVG and PNG (dimensions, font, palette, axes, legend, DPI) and crowded peak label collision handling. |
| `43_ios_look.js` | iOS Look | Modern interface styling: rounded controls, toggle switches, segmented button groups, and CSS design tokens across themes. |
| `43_zoom_inset.js` | Zoom Inset | Magnified zoom inset on HPLC and ÄKTA figures: expanded sub-window plot inset within or beside the main chromatogram. |
| `44_panel_more.js` | Panel More | Side panel progressive disclosure: rarely used settings in "More options" disclosures, settings search filtering, and persistence of modified defaults. |
| `45_yield_semantic.js` | Yield Semantics | Purification yield semantics: distinguished reporting for measured final samples vs last chromatography pools, including zero yields and unmeasured steps. |
| `50_export.js` | Export | Complete export coverage: SVG, high-DPI PNG, multi-figure ZIP bundles, CSV peak/data exports, and complete project JSON. |
| `60_perf.js` | Performance | Performance budgets: ensures UI rendering, file loading, and layout calculations complete within defined timing budgets. |
| `99_band_overlap.js` | Band Overlap | Visual collision check between gel band mark prompt and floating UI toast notifications on narrow viewports. |
| `test_nanodrop_units.js` | NanoDrop Units | Unit handling for NanoDrop imports: recognizes and normalizes ng/µL, µg/mL, and mg/mL concentration units. |
| `test_sec_calibration_units.js` | SEC Calib Units | Backward compatibility for legacy SEC calibration data missing unit fields and standards arrays. |

## Usability Scopes (`tests/ux/`)

In addition to the unit and integration suites, `tests/ux/` provides end-to-end usability walkthroughs using Playwright:

```
node tests/ux/scope.js <scope_name> <output_folder>
```

Defined in `tests/ux/scopes.js`, these scopes walk simulated biochemist workflows (first visit, multi-step purification, layout adjustments and panel dragging, gel densitometry, SEC calibration, zoom insets, mobile widths, dark mode, and project persistence). Each step records visual artifacts and screen captures to detect UI regressions, overlaps, cutoffs, or unexpected horizontal scrollbars without touching production data.

For writing new automated tests or UI interaction scripts, consult [docs/AGENT_TIPS.md](../docs/AGENT_TIPS.md) for critical guidance on avoiding traps like hidden DOM nodes inside projects, tab visibility rules, and harness shortcuts.

## Developer Tools (`tests/tools/`)

- `tests/tools/codemap.js`: Inspects `hplc-figure-bench(WF1.13).html` and outputs the current section markers and exact line ranges in Markdown table format, making it easy to refresh `docs/CODEMAP.md` as the application grows:
  ```
  node tests/tools/codemap.js
  ```

## Rules for the suites

- Drive the app only through its UI and DOM, never its internal functions.
- Element selectors live in `lib/harness.js` (or a `SEL` block at the top of a suite).
- Every check has a stable ID and a descriptive comment. A thrown error registers as a failed check rather than crashing the suite.
- User-visible numerical fixes require minimal main-failing evidence: add one UI-level synthetic case that fails on main and passes on the branch. Assert the displayed value with an appropriate tolerance or exact text when rounding is contractual, allowing domain-specific tests to define the expected semantics.

## Test data: synthetic stand-ins and HFB_PRIVATE_DATA

All files under `data/` are synthetic test inputs generated by scripts with fixed random seeds:

- `data/gen_chrom.py`: Chromatograms across supported formats, with expected values in `data/expected.json`.
- `data/gen_nd.py`: NanoDrop readings with expected values.
- `data/gen_genbank.py`: Synthetic GenBank files with edge cases.
- `data/science/gen_science.py`: SEC runs and NanoDrop inputs for the science suite.
- `data/qa/gen_qa.py`: Malformed and edge-case inputs for robustness testing.
- `data/standins/gen_standins.py`: Synthetic stand-ins for private lab files.
- `data/gen_crowded_peaks.js`: Eight closely spaced HPLC peaks whose labels cannot all fit; `42_figures.js` builds the CSV in memory, so no file is written.

Some tests were originally designed against real lab data. Those private files remain unpublished. `lib/harness.js` automatically maps private file paths to synthetic stand-ins in `data/standins/`.
To run tests against original private lab files on authorized machines, point `HFB_PRIVATE_DATA` to their folder:

```
HFB_PRIVATE_DATA=/path/to/private/folder node run.js
```

Never commit real chromatograms, gel photos, plasmid maps, or sequence files to this repository.
