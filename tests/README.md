# Test suite for HPLC Figure Bench

Browser tests that drive the app the way a person does (clicking, typing, dropping files) and check what it shows.
They run in headless Chromium through Playwright.

## Run it

```
cd tests
npm install                        # once
npx playwright install chromium    # once
node run.js                        # every suite, against the app in the repository root
node run.js 00_ 10_                # only some suites
```

- `APP=/path/to/other.html node run.js` tests a different build.
- `node compare.js` runs everything on your working copy of the app and on the version in `origin/main`, and writes
  `results/compare.md` listing regressions (passed before, fail now), fixes, and checks that fail on both.
  `BASE=<file or git ref>` picks another baseline, and `node compare.js /path/to/new.html` tests another build.
- Results go to `results/` (one `.json` and one `.log` per suite, screenshots in `results/shots/`). That folder is not committed.

## Suites

| File | Area | What it checks |
|---|---|---|
| `00_smoke.js` | Smoke | The page loads, a project opens, a run loads. Proves the harness works. |
| `10_data_truth.js` | Data | Synthetic files with known answers: SEC detection, column, flow, fraction labels, peak volumes, pool area and mg, NanoDrop means. |
| `20_science.js` | Science | Summary table arithmetic (mole-based yields across tag removal), methods text, panel letters, SEC elution volumes, consistency after moving or removing steps. |
| `30_robust.js` | Robustness | Bad inputs, a seeded 150-action fuzz with invariants, save and reload (browser and cloud storage), export and import, speed budgets. |
| `40_visual.js` | Visual | Overlapping text, horizontal scrolling, toolbars covering titles, at several window widths and in dark mode. |

## Rules for the suites

- Drive the app only through its UI and DOM, never its internals, so the same tests work on a rewritten app.
- Element selectors live in `lib/harness.js` (or a `SEL` block at the top of a suite), so a renamed element is fixed in one place.
- Every check has a stable id and a one-line comment saying what it guards. A thrown error becomes a failed check, never a crash.

## Test data: nothing real goes in this repository

Everything under `data/` is synthetic, made by the generators next to it, with fixed seeds:

- `data/gen_chrom.py`: chromatograms in every supported format, with known answers in `data/expected.json`.
- `data/gen_nd.py`: NanoDrop exports with known answers.
- `data/science/gen_science.py`: the science suite's SEC run and NanoDrop readings.
- `data/qa/gen_qa.py`: broken and unusual files for the robustness suite.
- `data/standins/gen_standins.py`: stand-ins for private lab files (see below), plus the QA fixtures that were once copies of real files.

Some suites were first written against the owner's real runs, plasmid map and gel photos. Those files are unpublished and
stay private. `lib/harness.js` maps each one to a synthetic stand-in in the same format with the same fraction labels.
To run against the real files on the owner's computer, point `HFB_PRIVATE_DATA` at the folder that holds them:

```
HFB_PRIVATE_DATA=/path/to/private/folder node run.js
```

Never add real chromatograms, gel images, sequences or NanoDrop exports to this folder.
