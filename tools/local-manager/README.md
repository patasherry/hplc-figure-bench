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
python tools\local-manager\manager.py --ladder "question"           # runs the escalation ladder on a question and prints each step (posts nothing)
python tools\local-manager\manager.py --ladder "question" --force   # the same, but climbs every step so every agent answers
python tools\local-manager\manager.py          # keeps running
```

## Console

While the manager runs, open **http://localhost:8765** in a browser on this PC. It shows Mission Control (`tools/dashboard/mission-control.html`) with a **Your local AI** panel: quick status checks, a box to ask the local model questions (for example "is everything working?"), a **Check every agent** button (the same test as `--selftest`) and the manager's log. It listens on this PC only and accepts calls only from the page it serves. Change the port with `"console_port"` in `~/.hfb-reviewer.json`, or turn it off with `--no-console`.

## Updates

Once an hour the manager runs `git pull`. When the pull changes its own code (`tools/local-manager/` or `tools/local-reviewer/`), it exits and the Startup loop starts it again on the new code a minute later. So it runs whatever is merged to `main` in those folders: only the lead merges changes there (the leader's automatic merges never touch `tools/`).
