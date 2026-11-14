# Running the Antigravity desktop app on this repository

The desktop app is the Antigravity route that works. The Interactions API has refused every call since Nov 1
(HTTP 429 on the first call of the day), and the `agy` CLI takes one job at a time on the PC. The app has landed
real pull requests here: #759, #765, #1048, #1049, #1050.

Its clone lives at `C:\Users\Patrick\hfb-antigravity` and can push and open pull requests.

**Every session started by hand ends with a pull request.** AGENTS.md ("A job started by hand ends with a pull request"), which Antigravity reads in every session in a clone of this repository, tells it to claim the issue with the `hand-running` label, work on `agy/issue-<N>`, push, and open the pull request, or say on the issue why it could not. When you give Antigravity a request directly, it helps to end the prompt with: "Finish by pushing and opening a pull request that says Closes #<N>." The queue leader lists any `hand-running` issue with no pull request after 3 hours on the status page and mentions you.

There are two ways to give it work.

## The scheduled prompt (preferred)

Paste this **once** per session. The agent sets up a recurring task that checks the queue on its own, so new
jobs are picked up without another paste. One job per firing keeps each run short.

```
Set up a scheduled task in this session that repeats every 30 minutes and does the following. Run it once now,
then let the schedule take over. Stop scheduling further runs after you have opened 8 pull requests today.

Each run, work at most ONE job:

1. git checkout main && git pull
   On the first run only, read AGENTS.md, docs/CODEMAP.md and docs/AGENT_TIPS.md. They are the rules and the
   map of the app. Follow them on every later run too.

2. List the queue. Prefer:
     gh issue list --repo patasherry/hplc-figure-bench --label for-antigravity --state open --limit 50
   If gh is not available, the repository is public, so an unauthenticated read works:
     curl -s "https://api.github.com/repos/patasherry/hplc-figure-bench/issues?labels=for-antigravity&state=open&per_page=50"
   That endpoint returns pull requests as well as issues. Skip any entry that has a "pull_request" field:
   a pull request is work already done, not a job. `gh issue list` drops them for you.

3. Skip a job if any of these is true, and say which rule you applied:
     - an open pull request already exists for it: a branch ending /issue-<N>, or a body saying "Closes #<N>"
     - it carries antigravity-running, agy-running, claude-code-running, codex-running, antigravity-done or agy-done
     - it carries needs-owner without owner-approved (it changes a reported number and is waiting on the owner)
     - you already failed it twice: do not take it a third time, say so and move on
   Take the newest issue that survives. If none survive, report "queue empty" and end the run. Do not cancel
   the schedule: new jobs arrive.

4. Create the branch antigravity/issue-<N> from the main you just pulled.

5. Read the issue and do what it asks, and nothing more. Change only
   hplc-figure-bench(WF1.13).html and files under tests/. Never add real lab data: all test data is synthetic
   and the stand-ins are in tests/lib/harness.js.

6. Add a check that fails on current main and passes with your change, driven only through the UI and the DOM,
   never through window.__HFB. Keep every existing check. Run the suites you touched:
     cd tests && node suites/NN_name.js
   Record the before and after, because the review gate requires that evidence.

7. Commit, push, and open a pull request whose description says "Closes #<N>", and states what you changed,
   the check that fails on main and passes here, and exactly what you ran. Do not merge, ever.

8. End the run. The next firing starts again at step 1 with a fresh pull.

Give every step a time limit, and keep a whole run under 25 minutes so it finishes before the next firing. If
something fails twice the same way, stop retrying: record it, leave the job, and report it. Each run ends with
one line saying which issue you took and which pull request you opened, or why you took none.
```

Because every run re-reads the queue and the skip rules are checked each time, two runs can never work the same
job, and a job another worker has taken in the meantime is dropped without a wasted attempt.

## The one-off queue prompt

If you would rather it empty the queue now and stop, without a schedule, paste this instead. The agent finds its
own work and keeps going until the queue is empty.

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
   That endpoint returns pull requests as well as issues. Skip any entry that has a "pull_request" field:
   a pull request is work already done, not a job. `gh issue list` drops them for you.

2. Skip a job if any of these is true, and say which rule you applied:
     - an open pull request already exists for it: a branch ending /issue-<N>, or a body saying "Closes #<N>"
     - it carries antigravity-running, agy-running, claude-code-running, codex-running, antigravity-done or agy-done
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
`antigravity_stall_minutes` (45) back to the `queued` label instead.
