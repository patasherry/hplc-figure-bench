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
- `.github/workflows/`: Claude Code GitHub Actions (automatic PR review, and `@claude` mentions).

## How the code is organized

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

There is no automated test suite. To check your work:

1. Open the HTML file directly in a browser. Example chromatograms load automatically.
2. `#quick` at the end of the file's URL opens Quick-Figure mode directly.
3. `#selftest` at the end of the URL exposes internal functions on `window.__HFB` for checking from the browser console.
4. Exercise the feature you changed, and check the browser console for errors.

In every PR description, say exactly what you tested and how. If you could not run a browser, say so plainly. Do not claim testing that did not happen.

## Rules for pull requests

1. **One task per PR.** Keep changes as small as the task allows.
2. **Never reformat or reindent the file.** The HTML file is very large, and a formatting change produces an unreadable diff that hides real changes. Match the surrounding code style, which is compact.
3. **Do not add dependencies, frameworks or build tools.**
4. **Update `README.md`** when user-visible behavior, supported formats, exports or network dependencies change.
5. **Never commit real lab data** (chromatograms, gel images, sequences). The owner's results may be unpublished.
6. **Explain the change** in the PR description: what changed, why, how it was tested, and anything uncertain.
7. Do not merge. The owner reviews and merges every PR.

## How agents divide the work

- **Jules** implements tasks from GitHub issues labeled `jules`.
- **Claude** reviews every pull request automatically, and implements tasks when someone writes `@claude` in an issue or PR comment.
- An agent should not push to a branch another agent is working on. Revisions go back to the agent that wrote the PR.
- Only one PR at a time should change the HTML file, because changes to the same large file will conflict.

## Reviewing a pull request

When reviewing, check:

- That the change does what the linked issue asked, and nothing more.
- Correctness, especially of parsing, numerical calculations and figure output.
- Backward compatibility with saved settings and projects.
- That README claims match what the code actually does.
- No new external network requests or dependencies.

Report findings with the file and line, and skip pure style preferences.
