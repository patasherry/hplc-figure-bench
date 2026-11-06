# Running the Antigravity desktop app on this repository

The desktop app is the Antigravity route that works. The Interactions API has refused every call since Nov 1
(HTTP 429 on the first call of the day), and the `agy` CLI takes one job at a time on the PC. The app has landed
real pull requests here: #759, #765, #1048, #1049, #1050.

Its clone lives at `C:\Users\Patrick\hfb-antigravity` and can push and open pull requests.

There are two ways to give it work.

## The standing prompt (preferred)

Paste this **once** per session. The agent then finds its own work from the `for-antigravity` label and keeps
going until the queue is empty, so nothing has to be pasted per issue.

```
You are working in this repository (patasherry/hplc-figure-bench). Work through the queue of issues
labelled for-antigravity, one at a time, until none are left or you have opened 5 pull requests.

Setup, once:
  git checkout main && git pull
  Read AGENTS.md, docs/CODEMAP.md and docs/AGENT_TIPS.md. They are the rules and the map of the app.

For each job:

1. List the queue. Prefer:
     gh issue list --repo patasherry/hplc-figure-bench --label for-antigravity --state open --limit 50
   If gh is not available, the repository is public, so an unauthenticated read works:
     curl -s "https://api.github.com/repos/patasherry/hplc-figure-bench/issues?labels=for-antigravity&state=open&per_page=50"

2. Skip a job if any of these is true, and say which rule you applied:
     - an open pull request already exists for it: a branch ending /issue-<N>, or a body saying "Closes #<N>"
     - it carries jules-running, antigravity-running, claude-code-running, codex-running or antigravity-done
     - it carries needs-owner without owner-approved (it changes a reported number and is waiting on the owner)
   Take the newest issue that survives.

3. git checkout main && git pull, then create the branch antigravity/issue-<N>.

4. Read the issue and do what it asks, and nothing more. Change only
   hplc-figure-bench(WF1.13).html and files under tests/. Never add real lab data: all test data is synthetic
   and the stand-ins are in tests/lib/harness.js.

5. Add a check that fails on current main and passes with your change, driven only through the UI and the DOM,
   never through window.__HFB. Keep every existing check. Run the suites you touched:
     cd tests && node suites/NN_name.js
   Record the before and after, because the review gate requires that evidence.

6. Commit, push, and open a pull request whose description says "Closes #<N>", and states what you changed,
   the check that fails on main and passes here, and exactly what you ran. Do not merge, ever.

7. Return to step 1 for the next job.

Give every step a time limit. If something fails twice the same way, stop retrying: record it, move on to the
next job, and say so in the pull request or in your final summary. Finish by listing each issue you took, the
pull request you opened for it, and anything you skipped with the reason.
```

Every pull request it opens goes through the Test suite and the review gate like any other agent's. The gate
closes one that changes files outside the app and `tests/`, brings no main-failing check, or deletes a check.

## The per-issue prompt

When the manager wants a specific job pasted, it posts a ready-to-use prompt as a comment on that issue and
labels it `paste-to-antigravity`. That label means the action is yours: paste the comment into a task in the app.
The label clears itself once a pull request appears or another worker takes the job.

Nothing waits on you. The stall guard hands any `for-antigravity` job that nobody starts within
`antigravity_stall_minutes` (45) to Jules instead.
