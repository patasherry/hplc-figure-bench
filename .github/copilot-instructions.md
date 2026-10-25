# Instructions for GitHub Copilot

Read `AGENTS.md` first and follow it exactly. It is the rulebook for every agent on this repository. This file only adds what matters most for Copilot.

## The project

HPLC Figure Bench is one HTML file, `hplc-figure-bench(WF1.13).html`, that a biochemistry graduate student uses for real protein purification data: chromatograms, SDS-PAGE gels, SEC calibration, NanoDrop readings, yields and Methods text. A wrong number is worse than a missing feature. Read `docs/CODEMAP.md` to find code, and `docs/GOALS.md` for priorities.

## When you work on an issue (coding agent)

- Change only `hplc-figure-bench(WF1.13).html` and files under `tests/suites/`, `tests/data/` and `tests/lib/`. Change `README.md` or `docs/` only when the issue asks.
- Never commit scratch scripts, patch files, logs, test results, `node_modules`, `package.json` at the root, or anything else. The review gate closes PRs that do.
- Never reformat or reindent the HTML file. Keep the compact style of the code around your change.
- Add a check that **fails on the current main and passes with your change**, in the suite it belongs to. Tests drive the app only through its UI and DOM (see `tests/lib/harness.js` and the helpers at the top of each suite). Never use `window.__HFB` or other internals in tests.
- Keep every existing check. Never delete, weaken or comment out a check to make your change pass.
- Test data is synthetic and made by the generators (`tests/data/gen_chrom.py`, `tests/data/gen_nd.py`). Change `tests/data/expected.json` only by running the generator, and only for your new file. Never add real lab data.
- Don't change scientific constants (`LADDERS`, `KNOWN_DEFAULT`, extinction coefficients, SEC math, integration) or anything else that changes a reported number unless the issue says the owner approved it.
- Run the suites you touched: `cd tests && node suites/NN_name.js` (set `ONLY` to a file-name pattern to run fewer checks), and `node compare.js` if time allows.
- The PR description says what changed and why, names the check that fails before and passes after with the numbers, lists what you ran, and includes `Closes #N`.
- Do the smallest change that fixes the issue. Don't ask for approval mid-task: decide by `AGENTS.md`, and put open questions in the PR description.

## When you review a pull request (code review)

Check, in this order, and report only real problems with the file and line:

1. **Numbers.** Units (mAU vs AU, mL vs min, mM vs M, µg/mL vs mg/mL), factors of 1000, the wrong denominator or volume, rounding, off-by-one in ranges of fractions.
2. **The test proves the fix.** The new check reads the exact number or text the issue is about, fails on main and passes on the PR. It isn't always true, it isn't loosened with `||`, and it doesn't reach into app internals.
3. **Nothing removed.** No existing check is deleted, weakened or commented out.
4. **Backward compatibility.** Saved settings (`opt`, `localStorage` key `hplc-fig-opt`), IndexedDB projects and exported project JSON from older versions still load.
5. **Scope.** The PR does what its issue asks and nothing more, and it adds no stray files, dependencies or network requests.

Skip style preferences. Never approve a PR on your own: your review is advice, and merging is decided by the test suite, the automatic review gate and, for reported numbers, the lead.
