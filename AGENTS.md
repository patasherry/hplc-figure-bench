# Instructions for coding agents

This file is the shared rulebook for every coding agent working on this repository, including Google Jules and Claude Code. `CLAUDE.md` points here, so there is one source of truth. If you change how the project works, update this file in the same pull request.

## What this project is

HPLC Figure Bench is a single-file HTML application for making publication-quality protein purification figures: HPLC and ÄKTA chromatograms, SDS-PAGE gels with densitometry, SEC calibration, NanoDrop readings, and a step-by-step purification workflow figure with a written summary and methods text.

The owner is a biochemistry graduate student who uses it for real lab data. Scientific correctness matters more than new features.

## Repository layout

- `hplc-figure-bench(WF1.13).html`: the entire application (HTML, CSS and JavaScript in one file). Do not rename it unless the task asks you to. The owner manages the version label.
- `README.md`: user-facing documentation.
- `AGENTS.md`: this file.
- `CLAUDE.md`: points Claude Code to this file.
- `.github/workflows/`: GitHub Actions: Claude Code (automatic PR review on app changes, `@claude` mentions) and the test suite on every PR.
- `.github/copilot-instructions.md` and `.github/workflows/copilot-setup-steps.yml`: standing instructions for GitHub Copilot (coding agent and code review), and the setup of its workspace so it can run the tests.
- `tests/`: the automated browser test suite and its synthetic test data.

## How the code is organized

Read docs/CODEMAP.md first. Open only the lines you need from the HTML file.

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

1. Run the suite on your change and on `main`, and compare them:
   ```
   cd tests
   node compare.js
   ```
   This tests your working copy of the app against the version on `origin/main` (read from git) and writes `tests/results/compare.md`. A full run takes several minutes. If you cannot run the comparison, run `node run.js` on your change at least.
2. Paste the summary into the PR description: pass and fail counts per suite, and every regression (a check that passed on `main` and fails on your branch).
3. A regression is either fixed, or explained in the PR as intended.
4. When you fix a bug or add a feature, add a check for it to the suite it belongs to.
5. A new suite is a file `tests/suites/NN_name.js`. The Test suite workflow finds it by its file name, so do not edit `.github/workflows/tests.yml` to add it.

The `Test suite` GitHub Action also runs this comparison on every PR that touches the app or the tests, and posts a results table on every PR. A PR with regressions shows a failed check. Running it yourself first is still expected, so problems are found before the PR is opened.

Checks that already fail on `main` are known problems. They are not yours to fix unless the task asks.

After running tests, read the output of node failures.js, not the full logs.

**Rules for the suite:**

- Tests drive the app only through its UI and DOM, never internal functions.
- All test data is synthetic. Never add real lab files to `tests/`. Inputs that were first real files are mapped to synthetic stand-ins in `tests/lib/harness.js`.
- Do not weaken or delete a check to make a change pass. If a check is wrong, say why in the PR.

For a quick manual look: open the HTML file in a browser (example chromatograms load automatically), or add `#quick` to the URL for Quick-Figure mode. `#selftest` exposes internal functions on `window.__HFB` for the browser console.

In every PR description, say exactly what you tested and how. Do not claim testing that did not happen.

## Rules for pull requests

1. **One task per PR.** Keep changes as small as the task allows.
2. **Never reformat or reindent the file.** The HTML file is very large, and a formatting change produces an unreadable diff that hides real changes. Match the surrounding code style, which is compact.
3. **Do not add dependencies, frameworks or build tools.**
4. **Update `README.md`** when user-visible behavior, supported formats, exports or network dependencies change.
5. **Never commit real lab data** (chromatograms, gel images, sequences). The owner's results may be unpublished.
6. **Explain the change** in the PR description: what changed, why, how it was tested, and anything uncertain.
7. Do not merge. The local manager merges PRs that pass the Test suite and the review gate and do not change a reported number (the owner's choice, `auto_merge`). The coordinator (Claude) reviews and merges changes to reported numbers, after the owner's OK.

## How agents divide the work

`docs/GOALS.md` is the owner's list of priorities. Every agent weighs its work by it. Once a day the lead posts a **Lead check-in** on issue #17, and the local manager follows the newest one.

Jules' questions go up a ladder, run by the local manager on the owner's PC: the local model tries three times (quick, then twice more with the code in front of it, each answer checked by a second local pass), then Gemini (given the code it needs), then ChatGPT (Codex, read-only), then the local model once more with their notes, then Claude Code (read-only), and only then the lead (`for-coordinator`). Each answer says who decided and the path it took. Anything that would change a reported number goes to the owner (`needs-owner`) instead. The owner answers on the issue with a comment starting **OK** (the manager labels it `owner-approved` and queues it) or **No** (`owner-declined`, taken out of the queue). Merging app changes stays with the lead, and a `needs-owner` change is merged only with `owner-approved`.

**Automatic review gate.** When the Test suite finishes on a PR that changes the app, the local manager checks it with plain code: only the app, `tests/`, `docs/` and `README.md` change; no regressions; at least one check fails on main and passes on the PR ("Checks this PR fixes"); no check it adds fails on the PR; no existing check is deleted or commented out; no test reaches into `window.__HFB`; `expected.json` is not rewritten; no merge conflict. A PR that fails is closed, the reasons are added to its issue, and the issue goes back to `jules-queue` (at most twice, then `for-coordinator`). A PR that passes and doesn't change a reported number (its issue has neither `needs-owner` nor `owner-approved`) is **merged by the manager**, one per pass. One that changes a number gets `ready-for-lead` for the lead's review, plus `needs-owner` if the owner's OK is still missing.

The gate also checks PRs that only change tests or docs when they carry stray files. When the only problems are stray files (scratch scripts, logs) or a merge conflict, the manager **rebuilds the PR itself**: it applies just the PR's own app and test changes on the current main as a new PR on `claude/issue-N`, closes the original, and the new PR goes through the tests and the gate. No Jules retry is spent on that.

**Claude Code jobs.** When Jules is out of tries (sent back twice by the gate, or 3 failed sessions), the issue gets `for-claude-code`. The local manager runs Claude Code on the owner's PC in a separate git worktree (`~/hfb-work/issue-N`, from `origin/main`), limited to editing files and running the test suites. The manager checks that only the app and `tests/` changed, commits, pushes the branch `claude/issue-N` (the only branches it ever pushes) and opens the PR. That PR goes through the Test suite and the gate like any other, and if it fails it goes to the lead. At most 3 jobs a day (`max_claude_jobs`). Claude Code (read-only) is also the last step of the question ladder before the lead.

**GitHub Copilot coding agent.** An overflow worker beside Jules, started by the local manager with the owner's token (the API takes only user tokens, so the leader can't). While at least 6 jobs wait for Jules, the manager assigns the newest one (not `needs-owner` or `from-patrick`) to `copilot-swe-agent[bot]`, with the AGENTS.md rules as custom instructions: at most 2 at a time and 5 a day (`max_copilot_jobs`). The issue gets `copilot-running`, then `copilot-done` when Copilot's PR ("Closes #N") appears. With no PR after 8 hours, it goes back to `jules-queue`. Copilot's PRs go through the Test suite and the gate like any other. It needs a paid Copilot plan. Until then the manager backs off for 6 hours after each refusal.

**Direction board (#222).** The local model, Gemini and ChatGPT hold a team meeting there by themselves: every 4 hours while the owner's PC is on (`board_every_hours`), after every 5 merged PRs (`board_every_merges`), when fewer than 5 jobs are queued, weekly on Sunday, or when the owner comments **Discuss: <topic>**. Each meeting opens with a review of the work in progress (what is running, stuck, sent back by the gate or merged, and how the board's own earlier proposals turned out), then each adviser proposes up to 3 directions with their case (problem, evidence, risk, rejected alternative), debates them for 2 rounds (reading the whole discussion, arguing for or against, revising or withdrawing its own), and votes 1 to 5. The meeting is posted live: opening, each round, decision. Proposals with an average of 3.5+ and no score below 3 are adopted as `needs-triage` + `from-board` issues carrying the votes and the debate, up to 3 a meeting and only while fewer than 10 jobs wait, so number changes still reach the owner through triage. The owner can reply **No n** to drop an adopted one or **OK n** to add one, but nothing waits for him.

- **Jules** works from issues labeled `jules`.
- **Claude** reviews PRs changing the app automatically and is called on any PR with `@claude`.
- Agents never push to another agent's branch: a revision goes on a new branch.
- Several PRs may change the HTML file at once (up to 8). A PR that conflicts with main is rebuilt on main by the local manager when its own diff still applies, and otherwise restarted by the gate.

## The Jules leader (automatic queue)

`.github/workflows/jules-leader.yml` is rule-based, with no AI:

- **`from-patrick`:** issues the owner reports. They start before any other queued issue. `docs/GOALS.md` sets the order of everything else.
- **`jules-queue`:** issues with this label get a Jules session through the Jules API, at most 15 at a time (Jules Pro), of which at most 8 change the app. Issues whose title starts with Tests, Audit or Docs don't count toward the 8. Label: `jules-running`.
- **Questions:** when Jules asks something, the leader posts the question on the issue and gives the local manager 15 minutes to answer (`Answer for Jules:`, relayed on the next check). If none comes, it tells Jules to decide by these rules and open the PR. After 6 replies the issue gets `needs-coordinator`. A person (or the coordinator) can answer instead by commenting on the issue with a line starting `Answer for Jules:`. The leader passes that text to the running session.
- **Checks:** every 3 minutes while work is queued or running, and whenever Jules comments or a test run finishes.
- **Failures:** a failed session is retried with "work in smaller steps", up to 3 attempts. After that the issue gets `needs-coordinator`.
- **Finished:** the issue gets `jules-done` and a link to the PR.
- **Merging:** a PR that touches only `tests/`, `docs/`, `README.md` or issue templates, with a clean Test suite report, is merged automatically. Any other PR gets `needs-coordinator`.
- **Follow-ups:** "New checks failing" in a merged PR's test report, and "Ready-to-file issues" in a merged `docs/*audit*.md`, become issues labelled `needs-triage`. A person or the coordinator moves them to `jules-queue` after checking scope and scientific impact.

The older `jules` label still starts Jules directly, without the leader's retries.

## Reviewing a pull request

When reviewing, check:

- That the change does what the linked issue asked, and nothing more.
- Correctness, especially of parsing, numerical calculations and figure output.
- Backward compatibility with saved settings and projects.
- That the PR reports test suite results, and that no check was weakened or removed without a reason.
- That README claims match what the code actually does.
- No new external network requests or dependencies.

Report findings with the file and line, and skip pure style preferences.
