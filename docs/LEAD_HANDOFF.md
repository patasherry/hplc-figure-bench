# Lead handoff (for Gemini or another acting lead)

Written 2026-10-26 by the lead (Claude) while Patrick's Claude usage is used up. Read `AGENTS.md` first. It is the rulebook and overrides anything here.

## What runs without a lead

Almost everything keeps working:

- **Jules** works the `jules-queue` (leader workflow on GitHub).
- **The local manager** on Patrick's PC answers Jules' questions, triages issues, runs the review gate and rebuilds, and **auto-merges safe PRs**. A safe PR passes the tests and the gate, and its issue has none of `needs-owner`, `owner-approved` or `board-approved`.
- **The Direction board (#222)** holds meetings and adopts work.
- **The Copilot CLI** takes overflow jobs while the Copilot cloud agent is out of AI Credits.

The things that wait for a lead:

1. PRs labelled **`ready-for-lead`**. These change a number the app reports, so the science must be checked before merging.
2. Issues and PRs labelled **`for-coordinator`** or **`needs-coordinator`**. These are stuck jobs the automation could not settle.
3. The daily **Lead check-in** on #17. It is optional while the lead is away.
4. **Claude Code jobs** (`for-claude-code`). These run Claude Code on Patrick's PC and use his Claude plan, so they fail or wait while it is used up. The manager then flags them `for-coordinator`.

## Open items at handoff

- `ready-for-lead`: #304, loading regression tests for the semicolon CSV and UNICORN missing-curve gaps, issue #283.
- `needs-coordinator`: #307, SEC column auto-detection overrides.
- `for-coordinator`: #253, inventory of instrument-format coverage.
- Issues with `needs-coordinator`: #136, publication minimum sizes for derived gel labels, and #124, fusion properties for tagged samples.

## How to review a `ready-for-lead` PR

Apply this to every PR that changes a reported number.

1. **Read the issue and Patrick's OK.** Find what he approved. Check that the PR does that and nothing more.
2. **Read the app diff in `hplc-figure-bench(WF1.13).html`.** Check:
   - units (mAU vs AU, mL vs min, mg/mL vs µg/mL)
   - factors of 1000
   - the right volume or denominator
   - rounding
   - off-by-one errors in fraction ranges
   - that the Methods text names the method actually used
3. **Recompute the key number by hand.** Write it out, for example "34 aa, 4635.16 Da, ε 15.08", and compare it with what the new test asserts.
4. **Read the Test suite comment on the PR.** Check:
   - "No regressions"
   - "Checks this PR fixes" lists the new checks, so they fail on main and pass here
   - no check is weakened with `||`, deleted or commented out
5. **Merge only if all of that holds.** Merge with a squash. Otherwise comment with the file, the line and the reason, and leave it open.

Never change scientific constants (`LADDERS`, `KNOWN_DEFAULT`, extinction coefficients, SEC math, integration) without a cited source. When unsure, comment and ask Patrick on the issue. Don't guess.

## How to handle `for-coordinator` items

- **A PR that failed the gate only because of stray files or a merge conflict:** close it. The manager's rebuild covers it, or put the issue back in `jules-queue`.
- **A PR whose own new check fails** (`page.click` or `page.fill` timeouts are common): close it, and put the issue in `jules-queue` or `for-copilot` with a short note on what failed.
- **An issue that is too big:** split it into issues that each have one task, and label them `needs-triage`.

## Hard rules

- Anything that changes a reported number needs Patrick's OK (`owner-approved`) or the board's strong consensus (`board-approved`), plus a lead review.
- Never commit real lab data. The repo is public.
- Never put tokens or keys in the repo or in comments.
- Don't turn off "Require approval for workflow runs" for Copilot. The gate's rebuild handles Copilot PRs safely.
- The manager pushes only `claude/issue-N` and `copilot/issue-N` branches.

## When Claude is back

Leave a short comment on #17 listing what you merged and closed, so the lead can pick up from there.
