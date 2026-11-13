# Local first-pass reviewer

A small script for the owner's PC. It asks a local model (through [Ollama](https://ollama.com)) for short review notes on each open pull request that changes the app, and posts them as one comment per PR, headed "Local first-pass notes". It reviews each PR again only when new commits arrive.

It is advisory only. It never merges, pushes, approves, edits files, or runs code from a pull request. Its GitHub token can only read the repository and write comments.

## Setup (Windows)

1. Install Ollama, then download a coding model of about 30B, for example `ollama pull qwen3-coder:30b`.
2. Make a fine-grained GitHub token for this repository only, with **Contents: Read**, **Pull requests: Read and write** and **Issues: Read and write**, and nothing else.
3. Create `C:\Users\<you>\.hfb-reviewer.json`, outside the repository so the token is never committed:
   ```json
   {"token": "github_pat_...", "repo": "patasherry/hplc-figure-bench", "model": "qwen3-coder:30b"}
   ```
4. Test on one PR: `python tools\local-reviewer\reviewer.py --pr <number>`.
5. Keep it running: `python tools\local-reviewer\reviewer.py` checks every 5 minutes. Use Task Scheduler to start it at log-on.

## What the comment contains

- **Automatic flags:** plain-code checks for a changed scientific constant or figure default, always-true or loose test checks, edits to `tests.yml`, app changes with no test, and new network addresses.
- **Model notes:** at most 12 bullets on what changed, calculations that look wrong, backward compatibility, and whether the new checks really test the fix.

The model can be wrong. Treat its notes as a head start for the coordinator's review, not as a sign-off.

The script keeps which commits it has reviewed in `C:\Users\<you>\.hfb-reviewer-state.json`. Delete that file to review everything again.

## What the local model knows about the project

The model remembers nothing between jobs. Each job is sent a short set of standing notes (`memory()` in `reviewer.py`), about 1,000 to 3,000 tokens:

1. `docs/LOCAL_AI_BRIEF.md`: what the project is, its rules and the common mistakes. Edit it like any doc.
2. `docs/REVIEW_LESSONS.md`: the newest 20 lessons, one line each, written by the owner or the lead when a review missed something.
3. `.hfb-lessons.txt` in the user folder: the newest 10 pull requests the gate sent back and why. The manager writes this itself.
4. For a review, the `docs/CODEMAP.md` rows of the app sections the diff touches.

The manager's other local jobs (triage, answering a worker, the board) get 1 to 3 as well. Set `"memory": false` in the settings file to switch all of it off. Keep `num_ctx` at 32768 or more so a large diff and the notes both fit.
