# Local project manager

Runs on the owner's PC every 5 minutes, using the local model (Ollama) and, when needed, Gemini, Claude Code and Codex. It extends the local reviewer (`tools/local-reviewer`) and replaces it in Task Scheduler.

Each pass:

1. **Reviews** new or updated app PRs (first-pass notes).
2. **Answers Jules:** the local model answers what AGENTS.md and the test helpers settle. Gemini answers factual questions. Claude Code (read-only plan mode) answers questions that need the code. Decisions go to the lead with the `for-coordinator` label. Answers are posted as `Answer for Jules:` comments, which the leader relays.
3. **Triages** `needs-triage` issues. Safe ones go to `jules-queue` (at most 20 a day). Anything that could change a number gets `needs-owner` and a one-line summary for Patrick.
4. **Flags stuck work** for the lead: a Jules job with 3 or more questions, or a PR whose tests have failed for over an hour.
5. **Advises the lead:** Claude Code (read-only), or Codex if Claude's daily cap is used, posts a recommendation on each new `for-coordinator` item.
6. **Daily digest** on issue #17 after 7 AM: merged, open, queued, waiting for Patrick, waiting for the lead. It also shows the manager is alive.

It never merges, pushes, approves or edits code.

## Setup

Needs the local reviewer set up first (token in `~/.hfb-reviewer.json`), plus `claude` and `codex` signed in, and `GEMINI_API_KEY` set as a Windows user environment variable.

Optional settings in `~/.hfb-reviewer.json`: `max_claude` (10 a day), `max_codex` (5), `max_gemini` (100), `max_queue` (20), `tracking_issue` (17), `digest_hour` (7).

```
python tools\local-manager\manager.py --dry    # one pass, prints what it would do, changes nothing
python tools\local-manager\manager.py --once   # one real pass
python tools\local-manager\manager.py --selftest   # asks each agent (Ollama, Gemini, Claude Code, Codex) one tiny question, prints OK or FAIL
python tools\local-manager\manager.py          # keeps running
```
