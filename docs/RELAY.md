# Offline relay

For questions an agent with a large reasoning budget but **no access to this repository** can answer. Patrick is the transport: he carries a strictly formatted request to the agent and a strictly formatted response back. A valid patch response becomes a queued job. Code: `tools/local-manager/relay.py` (protocol, pure text) and `relay()` in `tools/local-manager/manager.py` (GitHub side). Test: `tools/local-manager/test_relay.py`.

Main moves about one merge an hour and a human round trip takes hours, so a patch written against an old excerpt is **detected and refused** (check 4 below), never queued.

## Flow

1. Patrick labels an issue `needs-relay`. Optionally the issue body names the excerpt: `relay-lines: <from>-<to>`. Without it, the excerpt is the whole top-level function containing the first line number the body mentions ("line 4812"). With neither, the manager asks for one and posts no request.
2. The manager (PC or cloud copy) posts a **request** comment, removes `needs-relay` and adds `relay-pending`. It posts only if the newest `needs-relay` label event was made by Patrick.
3. Patrick pastes the block into the offline agent as its whole prompt (the block is in a four-backtick fence, so the copy button gives exactly the block).
4. Patrick pastes the agent's **response** as a comment on the same issue. Only comments by Patrick count. Nothing is filed from anything else.
5. The manager validates it (six checks) and files, answers or asks again.

State lives in hidden markers in the issue's comments, so both manager copies agree without sharing a state file:

| marker | on | meaning |
|---|---|---|
| `<!-- relay-req <id> <base> -->` | request comment | request outstanding |
| `<!-- relay-done <id> -->` | the comment that closes it | answered, withdrawn or expired |
| `<!-- relay-src <comment id> -->` | every reply | which response comment it handled |

## Request block

```
=== HFB-RELAY REQUEST v1 ===
id: <issue>-<4 hex>
base: <10-char sha of main when the excerpt was cut>
app: hplc-figure-bench(WF1.13).html
app-digest: <first 16 hex of sha256 of the app file>
issue: <number>
expires: <ISO 8601 Z>

role: |
  You are reviewing part of a single-file HTML application that produces
  protein-purification figures. You cannot browse, fetch or run anything.
  Work only from the excerpt below. Reply with exactly one RESPONSE block
  in the format given at the end, and nothing else.

task: <one line>

question: |
  <the issue's question, in full sentences>

excerpt: <file>:<from>-<to>
  <numbered source lines>

rules:
  - Reply with one RESPONSE block, nothing before or after it.
  - Use synthetic, invented numbers in every example, fixture and table.
  - Never reference, infer or reconstruct the owner's real sequences,
    chromatograms, gels, readings or yields.
  - The app is one file, no build step, no dependencies.
  - Tests are UI level and live in tests/suites/NN_name.js.
  - A patch is a unified diff with at least three context lines per hunk.
  - If the excerpt is not enough to answer safely, use verdict: insufficient
    and name the functions or line ranges you need. Do not guess.

response-format: |
  <the response grammar from the next section, inline>
=== END REQUEST ===
```

As implemented: `task` is the issue title, `question` is the issue body (without the `relay-lines:` line, at most 6000 characters), source lines are numbered `  <n>: <text>`. A second-round request repeats the `excerpt:` line and its numbered lines once per range.

## Response block

```
=== HFB-RELAY RESPONSE v1 ===
id: <echo>
base: <echo>
verdict: patch | answer | insufficient
summary: <one line>
changes-a-reported-number: yes | no

patch:                      (verdict: patch)
```diff
<unified diff>
```

test:                       (required when verdict is patch)
```js
<the UI-level case, with its suite filename in a comment>
```

answer: |                   (verdict: answer)
need: |                     (verdict: insufficient)
=== END RESPONSE ===
```

`answer:` and `need:` are followed by text in any indentation (flush left, spaces or tabs); the text runs up to the next line that starts with a field name (`id`, `base`, `verdict`, `summary`, `changes-a-reported-number`, `patch`, `test`, `answer`, `need`) and the common indent is removed. The `(verdict: ...)` notes are for the reader; the parser ignores the rest of the key line. A field still holding a `<placeholder>` counts as missing.

## Validation

In this order, stopping at the first failure.

| # | check | on failure |
|---|---|---|
| 1 | block parses, required fields present (`patch` for verdict patch, `answer` for answer, `need` for insufficient) | reply naming the missing field |
| 2 | `id` matches an open (not expired, not closed) request on this issue | reply "unknown id" |
| 3 | `base` equals that request's base | stale: withdraw and emit a fresh request |
| 4 | every hunk for the app file has its old side (context and removed lines, contiguous) verbatim in the app file at **current main**, ignoring trailing whitespace | stale: as above |
| 5 | the diff touches only the app, `README.md`, `tests/{suites,data,lib,ux}/`, `tests/README.md` or `docs/`, with no `..` | reply naming the offending path |
| 6 | `verdict: patch` carries a `test` block | reply asking for the test |

Check 4 reads the file, not a sha, because unrelated merges change the sha without touching the hunk. Check 3 only compares the echoed `base` with the request's, so it catches a mixed-up response; drift is check 4's job. Check 5 uses the same pattern as the review gate's `ALLOWED`, so nothing is filed that the gate would close. Hunks for files other than the app are checked for path only.

## What happens next

- **patch, passes:** an issue titled from `summary`, labelled `from-relay`, `owner-approved`, `for-claude-first`. Its body has the summary, the diff, the test, and a link to the originating issue and request id. When `changes-a-reported-number` is `yes` it says the PR needs a check that fails on main and passes on the PR. **The patch is not committed.** An agent with repository access applies it to current main, runs the suites and opens the PR through the usual gate, so a drifted hunk becomes a rebase.
- **answer:** posted on the originating issue; nothing is filed. If its `base` is not today's main, the post says so.
- **insufficient:** a second request covers the line ranges and function names named in `need` (falling back to the earlier ranges). At most `relay_max_rounds` further requests per issue, then the manager gives up with a note.
- **stale (3 or 4):** the request is withdrawn and a fresh one is cut from main as it is now, counted against the same limit.
- **expired:** a request older than `relay_expire_hours` is withdrawn with a note; a response to it counts as an unknown id.

## Board route

The Direction board (#222) can raise a request itself, so Patrick does not have to label anything.

- **Which proposals:** an adopted proposal that is not *strong* **and** is app-changing. Strong means every adviser scored it at `board_go_score` (4) or more; those keep the old path (`jules-queue` and `board-approved`). A contested but light proposal (`routing.is_light`, the Jules leader's `LIGHT` test) also keeps the old path. A contested app-changing proposal is created with `from-board` and `relay-from-board` and **without** `jules-queue`. Its body is unchanged (votes and debate), because the request is cut from it.
- **No location:** board proposals are prose and rarely name a line. A board-raised issue with no `relay-lines:` range or line number still gets a request, with no excerpt: the block carries `excerpt-status: none` and a rule telling the agent it cannot see the code and should reply `verdict: insufficient`, naming the functions or line ranges it needs. The second round resolves those (`ranges_from_need`), within `relay_max_rounds`. The hand-labelled `needs-relay` path still asks Patrick for a range.
- **Cap:** at most `board_relay_max` (2) per round, in rank order. Proposals past the cap go to `jules-queue` as before.
- **Trust:** the owner check of `needs-relay` is unchanged. For `relay-from-board` the manager accepts the issue only if it also carries `from-board` and the newest `relay-from-board` label event was made by the account the manager posts under. The request comment starts with "The board raised this one because the advisers' scores were split" and names the issue and the board. Everything after that (block, six checks, filing) is the same.
- **Fallback:** the relay is a preference, not a gate. If the request expires (`relay_expire_hours`) unanswered, the manager drops `relay-from-board`, adds `jules-queue` and says so in the withdrawal comment. The same happens at once for a board-raised issue whose title is light.

## Settings

In the manager's settings file; all optional.

| key | default | meaning |
|---|---|---|
| `relay_label` | `needs-relay` | label Patrick puts on an issue to ask for a request |
| `relay_expire_hours` | 12 | hours a request stays valid |
| `relay_max_rounds` | 2 | further requests per issue after the first (insufficient or stale) |
| `board_relay_label` | `relay-from-board` | label the board puts on a split proposal to route it to the relay |
| `board_relay_max` | 2 | board-raised requests per board round |
| `relay_context_lines` | 40 | lines added each side of a named `relay-lines` range (and of a bare line number when no function encloses it) |

## Worked example

Issue #900 (invented) has the body: "Is the factor of 2 in `alphaSum` right? relay-lines: 1-4". Patrick labels it `needs-relay`. The manager posts a request with `id: 900-3f9a`, `base: 1a86d44c2e`, and lines 1-44 numbered (1-4 widened by 40). The offline agent replies:

```
=== HFB-RELAY RESPONSE v1 ===
id: 900-3f9a
base: 1a86d44c2e
verdict: patch
summary: alphaSum doubles its result
changes-a-reported-number: yes

patch:
```diff
--- a/hplc-figure-bench(WF1.13).html
+++ b/hplc-figure-bench(WF1.13).html
@@ -1,6 +1,6 @@
 function alphaSum(a, b){
   const t = a + b;
-  return t * 2;
+  return t;
 }
 function betaMean(xs){
   let s = 0;
```

test:
```js
// tests/suites/99_alpha.js: enter 2 and 3, read the shown sum, expect 5
```
=== END RESPONSE ===
```

If those six context and removed lines are still in the app at main, the manager files "alphaSum doubles its result" as a new issue with the three labels and a note that a failing-on-main check is required. If another PR changed `const t = a + b;` in the meantime, check 4 fails, the request is withdrawn and a fresh one with the current lines is posted.
