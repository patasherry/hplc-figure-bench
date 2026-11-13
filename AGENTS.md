# Instructions for coding agents

This file is the shared rulebook for every coding agent working on this repository, including the Antigravity CLI, Codex and Claude Code. `CLAUDE.md` points here, so there is one source of truth. It is kept short on purpose, because every worker reads it on every job: rules live here, and the automation's design and history live in `docs/ORCHESTRATION.md`. If you change a rule, update this file in the same pull request.

## What this project is

Protein Purification Bench is a single-file HTML application for making publication-quality protein purification figures: HPLC and ÄKTA chromatograms, SDS-PAGE gels with densitometry, SEC calibration, NanoDrop readings, and a step-by-step purification workflow figure with a written summary and methods text.

The owner is a biochemistry graduate student who uses it for real lab data. Scientific correctness matters more than new features.

## Repository layout

- `hplc-figure-bench(WF1.13).html`: the entire application (HTML, CSS and JavaScript in one file). Do not rename it unless the task asks you to. The owner manages the version label.

**The name.** The app is called **Protein Purification Bench** (the Direction board's unanimous choice on #222, 2026-10-30, carried out in PR #1018). That is the name in the page title, the header and all prose. Three things keep the old name for good, because they are data rather than labels: the file name above, the `hplc-fig-opt` settings key, and the `app: 'HPLC Figure Bench'` field in project files, which both the exporter writes and the importer checks. Renaming any of those stops every project saved before the rename from loading, and stops every file saved after it from opening in an older copy. `tests/suites/01_name.js` checks both halves.
- `README.md`: user-facing documentation.
- `AGENTS.md`: this file.
- `CLAUDE.md`: points Claude Code to this file.
- `.github/workflows/`: GitHub Actions: the test suite on every PR, the queue leader, the cloud manager, and Claude Code on request (`@claude` mentions, or a review started by hand).
- `docs/ORCHESTRATION.md`: how the agents and the automation divide the work. Not needed for an ordinary coding job.
- `.github/copilot-instructions.md` and `.github/workflows/copilot-setup-steps.yml`: standing instructions for GitHub Copilot (coding agent and code review), and the setup of its workspace so it can run the tests.
- `tests/`: the automated browser test suite and its synthetic test data.

## How the code is organized

Read docs/CODEMAP.md first. Open only the lines you need from the HTML file. Before writing any browser test or inspection script, read docs/AGENT_TIPS.md: it lists the traps that stall agents (hidden controls, the home-screen-only new-project box, figure tabs hidden inside projects) and the harness helpers to use instead.

- One `<style>` block, then one `<script>` block.
- All JavaScript lives inside a single strict-mode IIFE: `(function(){ "use strict"; ... })();`. There are no modules, no build step, no package manager and no framework. Keep it that way.
- The script is divided into sections marked with comments like `/* ---------- peak integration ---------- */`. Search for these markers to find code. Put new code in the section it belongs to, and add a new marker only for a genuinely new area.
- Main sections, in order: helpers, parsing (generic, ÄKTA/UNICORN, UNICORN 7 .zip), traces and runs, peak integration, size exclusion (SEC), figures (HPLC overlay, ÄKTA run chart), gels (auto crop, densitometry, band tags and purity), composite workflow figure, upstream steps (construct, expression, lysis, GenBank), run conditions, UI, loading, protein (sequence properties, PDB), NanoDrop, SEC panel, projects, home, step timeline, quick fill, export, example data.

### Settings

- All user settings live in the `opt` object. Defaults are in `DEF` near the top of the script.
- `opt` is saved to `localStorage` under the key `hplc-fig-opt` by `saveOpt()`.
- To add a setting, add its default to `DEF`. Older saved settings are merged over `DEF`, so new keys get their defaults automatically.
- To change an existing default for people who already have saved settings, use a one-time migration flag in the style of the existing `tidy13` and `tidy14` flags. Never silently reinterpret an existing key.

### Projects and storage

`storeInit()` picks one of three storage modes:

- `cloud`: when the page is hosted somewhere that provides `window.claude.use('db' | 'user' | 'assets')`.
- `local`: IndexedDB database `hfb-projects`, object store `projects`.
- `none`: no storage available.

Projects can also be exported and imported as a single JSON file.

**Backward compatibility is required.** Saved settings, IndexedDB projects and exported project JSON files from earlier versions must keep loading. If a data format must change, write code that upgrades the old format when it is read.

### Network dependencies

The app loads only these external resources. Do not add new ones without saying so clearly in the PR description.

- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) for Instrument Sans.
- `pako` 2.1.0 from cdnjs and `UTIF` 3.1.0 from jsDelivr, loaded on demand to read TIFF gel images.
- RCSB PDB (`files.rcsb.org/download/`) when the user requests a PDB structure.

## Scientific values

Do not change scientific constants without a cited source in the PR description. These include protein ladder sizes (`LADDERS`), known contaminant masses (`KNOWN_DEFAULT`), extinction coefficient and molecular weight calculations, SEC calibration math, and peak integration methods.

Figure defaults follow publication conventions: the Okabe-Ito colorblind-safe palette, Arial, 600 dpi, and journal column widths in `PRESETS`. Keep them unless the task says otherwise.

## Testing

`tests/` holds an automated browser test suite (Playwright, headless Chromium, including `25_gels.js`). See `tests/README.md` for details.

**Before opening a PR that changes the HTML file:**

1. Compare your change with `main` on the suites it can affect:
   ```
   cd tests
   node quick.js
   ```
   This picks preflight, smoke, every suite you added or changed, and the suites mapped to the app sections your diff touches, then runs them on your working copy and on `origin/main` and writes `tests/results/compare.md`. It takes minutes. `node quick.js --list` shows the choice without running it, and extra suite names can be added on the command line. The full comparison (`node compare.js`, every suite twice) takes about an hour on one machine, so leave it to the Test suite workflow, which runs it in parallel on every pull request.
2. Paste the summary into the PR description: pass and fail counts per suite, and every regression (a check that passed on `main` and fails on your branch).
3. A regression is either fixed, or explained in the PR as intended.
4. When you fix a bug or add a feature, add a check for it to the suite it belongs to.
5. A new suite is a file `tests/suites/NN_name.js`, where the number may be any length. The Test suite workflow finds it by its file name, so do not edit `.github/workflows/tests.yml` to add it. The workflow's **matrix generator** also matched exactly two digits, so five suites (`1007_`, `669_`, `796_` and the two `test_*`) never ran in CI at all, and three of them have been failing on main unseen: `669_persistence_roundtrip` (1), `796_tag_mass` (fixed: it now dispatches `input` before `change` on `#o-tagPreset`) and `test_nanodrop_units` (1). `compare.js`, the workflow report and the gate all matched two digits too, so a suite numbered longer ran and passed but was left out of the main-versus-branch comparison: `770_pool_area.js` in PR #1095 failed 2 checks on main and passed all 6 on the branch while the gate reported that nothing failed on main, and `1007_untagged_default.js` had never been compared at all.

The `Test suite` GitHub Action also runs this comparison on every PR that touches the app or the tests, and posts a results table on every PR. A PR with regressions shows a failed check. Running it yourself first is still expected, so problems are found before the PR is opened.

Checks that already fail on `main` are known problems. They are not yours to fix unless the task asks.

After running tests, read the output of node failures.js, not the full logs.

**Measuring the figure: use the exported SVG, and use the harness.** A check about where figure text lands belongs on the saved file, not the preview, because the preview carries screen-only furniture (the zoom inset's drag handles, guarded by `FIG_SCREEN`) that the export does not. `tests/lib/harness.js` provides this, so no suite needs an XML parser and **no suite may add one**:

- `H(p).exportSvg()` drives `#saveSvg`, captures the download and returns the saved SVG as text.
- `H(p).svgBoxes(svg, sel)` renders that SVG in the test browser and returns `{root, texts, box, clipped}`: the root box, every non-empty `<text>` with its box, one extra rect named by `sel`, and `clipped`, the text drawn outside the figure and therefore lost in the saved file.
- `fits(a, b, tol)`, exported from the harness, is the containment test.

Two pull requests were lost to not having this. #1378 carried the correct app fix and was rejected because its new suite required `jsdom`, which is not installed, so every check it added threw. #1381 carried the same fix and was rejected because its check passed on main as well, having asserted the label's text rather than its geometry. Measure geometry, through these helpers.


**Rules for the suite:**

- Tests drive the app only through its UI and DOM, never internal functions, never through window.__HFB.
- All test data is synthetic. Never add real lab files to `tests/`. Inputs that were first real files are mapped to synthetic stand-ins in `tests/lib/harness.js`.
- Keep every existing check. Do not delete, weaken or comment out a check to make a change pass. If a check is wrong, say why in the PR.
- User-visible numerical fixes require minimal main-failing evidence: add one UI-level synthetic case that fails on main and passes on the branch. Assert the displayed value with an appropriate tolerance or exact text when rounding is contractual, allowing domain-specific tests to define the expected semantics.

For a quick manual look: open the HTML file in a browser (example chromatograms load automatically), or add `#quick` to the URL for Quick-Figure mode. `#selftest` exposes internal functions on `window.__HFB` for the browser console.

In every PR description, say exactly what you tested and how. Do not claim testing that did not happen.

## Rules for pull requests

1. **One task per PR.** Keep changes as small as the task allows.
2. **Never reformat or reindent the file.** The HTML file is very large, and a formatting change produces an unreadable diff that hides real changes. Match the surrounding code style, which is compact.
3. **Do not add dependencies, frameworks or build tools.**
4. **Update `README.md`** when user-visible behavior, supported formats, exports or network dependencies change.
5. **Never commit real lab data** (chromatograms, gel images, sequences). The owner's results may be unpublished.
6. **Explain the change** in the PR description, in the form of `.github/pull_request_template.md`: the `Closes #N.` line first, then what changed and why, the check that fails on main and passes here, exactly what you ran, whether any reported number changes, and anything uncertain.
7. Do not merge. The local manager merges PRs that pass the Test suite and the review gate and do not change a reported number (the owner's choice, `auto_merge`). Changes to reported numbers, after the owner's OK (or the board's strong consensus), are reviewed by the AI lead reviewer the owner picks (see **AI lead review**), and by the coordinator (Claude) when he picks Claude or the reviewer is unsure.

## How agents divide the work

You are one coding worker among several. A manager program hands you one issue, checks your pull request and merges it. The full account of who does what, with every setting and the history behind it, is in `docs/ORCHESTRATION.md`. You do not need it to do a job. Read it only when the task is about the automation itself, and update it in the same pull request when you change how the automation works.

What a worker needs to know:

- **Order of workers (Patrick's choice, 2026-11-12).** Google Antigravity takes the coding work, and gets a second attempt on a stronger model when its first fails or the gate sends it back. Codex takes only what Antigravity has handed back or what is labelled `for-codex`. Claude is the last resort and reviews changes to reported numbers. Google Jules was removed on 2026-11-12.
- **The gate.** Your PR is checked by plain code: only the app, `tests/`, `docs/`, `README.md` and `.gitignore` change. No regressions. At least one check fails on main and passes on the PR. No check you add fails on the PR. No existing check is deleted or commented out. No test reaches into `window.__HFB`. `expected.json` is not rewritten. No merge conflict. A PR that fails is closed and the reasons are added to its issue.
- **Empty pull requests are never merged.** If the fix is already on main, say so on the issue and close the issue directly, without a PR.
- **Reported numbers are Patrick's call.** An issue labelled `needs-owner` without `owner-approved` is not yours to start.
- **A job has a check.** A queued issue follows the job-card form (`.github/ISSUE_TEMPLATE/job.md`): Change, Check, Where, Rules. The Check is how you know you are done. For one of Patrick's own requests, which may not name a check, write the check yourself first.
- **A `needs-plan` or `parked` issue is not yours to start either.** A `from-patrick` issue is the owner's request in his own words: do what it says, and do not rewrite it into something else.
- **Agents never push to another agent's branch.** A revision goes on a new branch.
- **`docs/GOALS.md`** is the owner's list of priorities. Weigh your work by it.

## Reviewing a pull request

When reviewing, check:

- That the change does what the linked issue asked, and nothing more.
- Correctness, especially of parsing, numerical calculations and figure output.
- Backward compatibility with saved settings and projects.
- That the PR reports test suite results, and that no check was weakened or removed without a reason.
- That README claims match what the code actually does.
- No new external network requests or dependencies.

Report findings with the file and line, and skip pure style preferences.
