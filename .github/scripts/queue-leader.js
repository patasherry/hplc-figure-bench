// Queue leader: a rule-based supervisor that runs in GitHub Actions. It uses no AI and no Claude tokens.
// Until 2026-11-12 this also drove Google Jules through its API. Jules went read-only on 11-11 and closes on
// 12-31, so that half is gone; what remains is the part every other worker depends on.
// Each run (on a schedule, or on activity):
//   1. Route: issues labelled `queued` are handed to the Antigravity queue (`for-antigravity`), which the
//      Antigravity CLI, the Antigravity API route and the scheduled desktop session all serve.
//   2. Merge: open PRs that touch only tests/ or docs/, with a clean Test suite report (no regressions), are
//      squash-merged. Anything that changes the app or workflows gets `needs-coordinator` instead.
//   3. Follow up: after a merge, "New checks failing" in the PR's test report and "Ready-to-file issues" in an
//      audit report become new issues labelled `parked`. Parked issues are queued a few at a time when the queue is
//      nearly empty (PARK_LOW, PARK_WAIT_DAYS, PARK_PER_DAY), unless they carry `keep-parked`.
//   4. Patrick's requests (2026-11-12): intake of every `from-patrick` issue in his own words (small ones are
//      queued, large ones wait for one planning pass as `needs-plan`), no open issue left without a state, and
//      the status page, one issue that says where each of his requests stands and mentions him when one needs
//      him or is stuck. The page also carries a weekly scorecard of each worker's pull requests.
//   5. Job cards: a queued issue that names no check is held as `needs-plan` before any worker starts it.
// State lives on the issue labels. The per-issue JSON state comment went with the sessions.
const AG_TAKES_APP = process.env.AG_TAKES_APP !== '0';
// `queued` was called `jules-queue` until 2026-11-12. Both are read so nothing in flight is stranded; only the
// new name is ever written. Drop QUEUE_OLD once no open issue carries it.
const L = {queue: 'queued', fail: 'needs-coordinator', triage: 'needs-triage', parked: 'parked', plan: 'needs-plan', mine: 'from-patrick', status: 'status-page'};
const TRACKERS = new Set([17, 222, 782]);  // the improvement plan, the Direction board and the Claude Science inbox are standing issues, not work
const BIG_CHARS = 2500, STUCK_DAYS = 3, DONE_DAYS = 14, SCORE_DAYS = 7;
/* Parked issues go back to the workers a few at a time, when the queue is nearly empty, so they never crowd out Patrick's own requests:
   fewer than PARK_LOW jobs queued, the issue untouched for PARK_WAIT_DAYS (time for him to close it), at most PARK_PER_DAY a day. */
const PARK_LOW = 3, PARK_WAIT_DAYS = 2, PARK_PER_DAY = 2, KEEP = 'keep-parked';
/* a label that says whose move it is. An open issue with none of these, and no open PR, is invisible to every worker. */
const isState = l => /^(for-|needs-|awaiting-|relay|paste-)/.test(l) || /-running$/.test(l) || ['queued', 'jules-queue', 'parked', 'ux-report', 'ready-for-lead', 'status-page'].includes(l);
const QUEUE_OLD = 'jules-queue';
const SAFE = f => /^(tests\/|docs\/|\.github\/ISSUE_TEMPLATE\/)/.test(f) || f === 'README.md' || f === 'tests/README.md';
/* a few edits outside those folders are routine for test and docs PRs: adding a suite to the Test suite matrix, or adding up to 3 lines to AGENTS.md */
const changed = patch => String(patch || '').split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const SAFE_FILE = f => SAFE(f.filename)
  || (f.filename === '.github/workflows/tests.yml' && changed(f.patch).length > 0 && changed(f.patch).every(l => /^[+-]\s*(suite: \[|names = \{)/.test(l)))
  || (f.filename === 'AGENTS.md' && f.deletions === 0 && f.additions <= 3);

module.exports = async ({github, context, core}) => {
  const {owner, repo} = context.repo, log = [];
  const say = m => { log.push(m); core.info(m); };
  const labels = i => (i.labels || []).map(l => typeof l === 'string' ? l : l.name);
  /* the cloud manager stands in for the PC manager while the PC is off. GitHub rarely fires its schedule, so the leader
     starts it when its last run is over 10 minutes old (it stands aside by itself while the PC runs) */
  let woke = false;
  const wakeCloud = async (now) => { if (woke) return; try {
    const runs = (await github.rest.actions.listWorkflowRuns({owner, repo, workflow_id: 'cloud-manager.yml', per_page: 5})).data.workflow_runs;
    if (runs.some(r => r.status !== 'completed') && !now) return;
    if (!now && runs[0] && Date.now() - Date.parse(runs[0].created_at) < 10 * 60e3) return;
    if (runs.some(r => r.status === 'queued')) return;
    await github.rest.actions.createWorkflowDispatch({owner, repo, workflow_id: 'cloud-manager.yml', ref: 'main'}); woke = true; say('started the cloud manager');
  } catch (e) { say(`could not start the cloud manager: ${e.message}`); } };
  const issues = async label => (await github.paginate(github.rest.issues.listForRepo, {owner, repo, state: 'open', labels: label, per_page: 100})).filter(i => !i.pull_request);
  /* the queue under either name, newest name first, without duplicates */
  const queued = async () => { const seen = new Map();
    for (const name of [L.queue, QUEUE_OLD]) for (const i of await issues(name)) if (!seen.has(i.number)) seen.set(i.number, i);
    return [...seen.values()]; };
  const ensureLabels = async () => { const have = new Set((await github.paginate(github.rest.issues.listLabelsForRepo, {owner, repo, per_page: 100})).map(l => l.name));
    const want = {[L.queue]: '0E8A16', [L.fail]: 'D93F0B', [L.triage]: 'C5DEF5', [L.parked]: 'EEEEEE', [KEEP]: 'EEEEEE', [L.plan]: 'FBCA04', [L.status]: '1D76DB'};
    for (const [name, color] of Object.entries(want)) if (!have.has(name)) await github.rest.issues.createLabel({owner, repo, name, color}); };
  const setLabels = async (n, add, remove) => { for (const r of remove) await github.rest.issues.removeLabel({owner, repo, issue_number: n, name: r}).catch(() => {});
    if (add.length) await github.rest.issues.addLabels({owner, repo, issue_number: n, labels: add}); };

  await ensureLabels();

  /* ---------- 1. route the coding work to Antigravity ---------- */
  /* Antigravity owns the coding queue (Patrick's choice, 2026-11-05). The routing happens here because this is what
     races: the leader checks every few minutes and would otherwise leave the job sitting. An issue the manager has
     handed back (ag-returned) stays in the queue for the PC workers, so a job can never bounce between the two. */
  let routedAg = false, agAvailable = AG_TAKES_APP;
  if (AG_TAKES_APP) {
    try {
      const tcs = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number: 17, per_page: 100});
      const hb = [...tcs].reverse().find(c => c.body.startsWith('<!-- pc-heartbeat '));
      const hbMatch = hb && hb.body.match(/pc-heartbeat (\d+)/);
      const pcUp = Boolean(hbMatch && (Date.now() / 1000 - Number(hbMatch[1])) / 60 < 20);
      const cs = [...tcs].reverse().find(c => c.body.includes('<!-- cloud-state '));
      const csMatch = cs && cs.body.match(/<!-- cloud-state (\{.*?\}) -->/);
      const cloudSt = csMatch ? JSON.parse(csMatch[1]) : {};
      const agApiPaused = Boolean(cloudSt.ag_off_until && cloudSt.ag_off_until > Date.now() / 1000);
      if (!pcUp && agApiPaused) { agAvailable = false; say('PC is off and the Antigravity API is paused: leaving the coding jobs in the queue'); }
    } catch (e) { say(`could not check #17 status: ${e.message}`); }
  }
  /* A job card must say how the worker proves it is done. A queued issue with no check in it is held for the lead
     (needs-plan) instead of being handed to a worker that cannot tell when it has finished: that is how jobs sat for
     weeks. Patrick's own requests are exempt, since the worker writes the check for those and the gate demands one. */
  const hasCheck = b => /(\*\*|#+\s*)check\b/i.test(b) || /fails? on main/i.test(b) || /node tests\/suites\//i.test(b) || /reproduce command/i.test(b) || /check id/i.test(b);
  for (const i of await queued()) { const ls = labels(i);
    if (ls.includes(L.mine) || ls.includes('ag-returned') || hasCheck(i.body || '')) continue;
    await setLabels(i.number, [L.plan], [L.queue, QUEUE_OLD]);
    await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: 'Held before any worker starts it: this issue does not say which check proves the job is done. It needs a **Check** line in the job-card form (`.github/ISSUE_TEMPLATE/job.md`): the one UI-level check that fails on main and passes after the change. Once the issue text has it, add the `queued` label again.'});
    say(`#${i.number}: no check named, held for a plan`); }
  /* an issue a worker handed back (ag-returned), or one already routed, is not the leader's to act on */
  const routable = i => !labels(i).some(l => l === 'ag-returned' || l === 'for-antigravity');
  if (agAvailable) {
    for (const i of await queued()) {
      if (!routable(i)) continue;
      await setLabels(i.number, ['for-antigravity'], [L.queue, QUEUE_OLD]);
      await github.rest.issues.createComment({owner, repo, issue_number: i.number,
        body: 'Routed to the Google Antigravity agent, which takes the coding work. If it cannot take this one, the local manager hands it back to the queue, where the Antigravity CLI and Codex pick jobs up on the owner\'s PC.'});
      say(`#${i.number}: routed to Antigravity`);
      routedAg = true;
    }
  }

  /* ---------- 2. merge safe PRs ---------- */
  const prs = await github.paginate(github.rest.pulls.list, {owner, repo, state: 'open', per_page: 100});
  for (const p of prs) { if (p.draft) continue;
    const fobj = await github.paginate(github.rest.pulls.listFiles, {owner, repo, pull_number: p.number, per_page: 100}), files = fobj.map(f => f.filename);
    const labels = p.labels.map(l => l.name);
    if (labels.includes('awaiting-owner')) continue; /* a Direction board idea: Patrick OKs it on the PR, and the local manager merges it */
    /* an empty PR changes nothing, so every file test below passes vacuously and it would merge and close its issue while the bug stays. Never merge one. */
    if (!fobj.length) { if (!labels.includes(L.fail)) { await setLabels(p.number, [L.fail], []);
      await github.rest.issues.createComment({owner, repo, issue_number: p.number, body: 'This pull request changes no files, so it cannot fix anything, and merging it would close its issue while the bug stays. Flagged for the coordinator instead of merged. If the fix is already on main, say so on the issue and close the issue directly.'});
      say(`PR #${p.number}: empty (no files changed), flagged for the coordinator`); } continue; }
    if (!fobj.every(SAFE_FILE)) { if (!labels.includes(L.fail)) { await setLabels(p.number, [L.fail], []); say(`PR #${p.number}: changes the app or workflows, flagged for the coordinator`); } continue; }
    const runs = (await github.rest.actions.listWorkflowRunsForRepo({owner, repo, head_sha: p.head.sha, per_page: 20})).data.workflow_runs.filter(r => r.name === 'Test suite');
    const cs = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number: p.number, per_page: 100}), rep = cs.reverse().find(c => c.body.includes('<!-- test-suite-report -->'));
    const testsTouched = files.some(f => f.startsWith('tests/'));
    if (testsTouched && !(runs.length && runs[0].status === 'completed' && runs[0].conclusion === 'success' && rep && /No regressions/.test(rep.body))) continue;
    /* GitHub works out mergeability in the background: ask a few times before giving up for this run */
    let full = (await github.rest.pulls.get({owner, repo, pull_number: p.number})).data;
    for (let k = 0; k < 4 && full.mergeable === null; k++) { await new Promise(r => setTimeout(r, 4000)); full = (await github.rest.pulls.get({owner, repo, pull_number: p.number})).data; }
    if (full.mergeable_state === 'dirty') { if (!labels.includes(L.fail)) { await setLabels(p.number, [L.fail], []); await github.rest.issues.createComment({owner, repo, issue_number: p.number, body: 'Queue leader: this PR has merge conflicts with main. Needs the coordinator.'}); } continue; }
    if (full.mergeable !== true) continue;
    if (p.labels.some(l => l.name === L.fail)) await setLabels(p.number, [], [L.fail]);
    await github.rest.pulls.merge({owner, repo, pull_number: p.number, merge_method: 'squash', commit_title: `${p.title} (#${p.number})`});
    say(`PR #${p.number}: merged (tests/docs only, no regressions)`);
    /* GitHub does not close the linked issue when this workflow's token does the merge (#1364, #1344 and others stayed open
       for days with their fix on main and no label, so nothing could see them). Close what the PR says it closes. */
    for (const m of String(p.body || '').matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)) { const n = +m[1];
      const it = await github.rest.issues.get({owner, repo, issue_number: n}).then(r => r.data, () => null);
      if (it && !it.pull_request && it.state === 'open') { await github.rest.issues.update({owner, repo, issue_number: n, state: 'closed', state_reason: 'completed'}); say(`#${n}: closed, fixed by PR #${p.number}`); } }
    /* ---------- 3. follow-ups from what was merged ---------- */
    if (rep) { const sec = rep.body.split('#### New checks failing')[1]; if (sec) {
        const filedPrefixes = new Set();
        for (const line of sec.split('\n').filter(l => /^- \S/.test(l)).slice(0, 10)) {
          const id = line.slice(2).split(' (FAIL:')[0].trim(), detail = (line.split('(FAIL:')[1] || '').replace(/\)\s*$/, '').trim();
          const parts = id.split('/');
          const prefix = parts.length > 2 ? `${parts[0]}/${parts[1]}` : id;
          if (filedPrefixes.has(prefix)) continue; // group related failures for the same test/fixture
          const exists = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:issue is:open in:title "${prefix}"`})).data.total_count;
          if (!exists) {
            filedPrefixes.add(prefix);
            const suite = parts[0];
            const hint = `Target test suite: tests/suites/${suite}.js\nReproduce command: node tests/suites/${suite}.js\nGoal: Investigate and resolve this check failure. If the test check timed out or has an incorrect expectation, fix tests/suites/${suite}.js. If it revealed a bug in the application, fix hplc-figure-bench(WF1.13).html. Ensure 'node tests/suites/${suite}.js' passes without regressions.`;
            await github.rest.issues.create({owner, repo, title: `Bug found by ${id}`, labels: [L.parked], body: `The check \`${id}\`, added in #${p.number}, fails on main:\n\n> ${detail}\n\nThe PR description in #${p.number} may say more about the cause.\n\n${hint}`}); say(`follow-up issue for ${id}`); routedAg = true; } } } }
    for (const f of files.filter(f => /^docs\/.*audit.*\.md$/.test(f))) { const raw = await github.rest.repos.getContent({owner, repo, path: f, ref: 'main'}).catch(() => null); if (!raw) continue;
      const md = Buffer.from(raw.data.content, 'base64').toString('utf8'), part = md.split(/^##\s+Ready-to-file issues\s*$/m)[1]; if (!part) continue;
      for (const block of part.split(/^###\s+/m).slice(1, 21)) { const title = block.split('\n')[0].trim(), body = block.split('\n').slice(1).join('\n').trim(); if (!title) continue;
        const exists = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:issue in:title "${title.replace(/"/g, '')}"`})).data.total_count;
        if (!exists) { await github.rest.issues.create({owner, repo, title, labels: [L.parked], body: `${body}\n\n_From ${f} (#${p.number})._`}); say(`follow-up issue: ${title}`); routedAg = true; } } } }

  /* ---------- 4. Patrick's requests: intake, no orphans, the status page ---------- */
  /* Wrapped whole: a fault here must never stop the routing and merging above. */
  try {
    const open = (await github.paginate(github.rest.issues.listForRepo, {owner, repo, state: 'open', per_page: 100})).filter(i => !i.pull_request);
    const livePrs = await github.paginate(github.rest.pulls.list, {owner, repo, state: 'open', per_page: 100}), prOf = new Map();
    for (const p of livePrs) { for (const m of `${p.title}\n${p.body || ''}`.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)) prOf.set(+m[1], p.number);
      const b = /issue-(\d+)/.exec(p.head.ref); if (b) prOf.set(+b[1], p.number); }
    for (const i of open) { const ls = labels(i); if (TRACKERS.has(i.number) || ls.includes(L.status)) continue;
      const others = ls.filter(l => isState(l) && l !== L.parked && l !== L.triage);
      if (ls.includes(L.parked) && others.length) { await setLabels(i.number, [], [L.parked]); i.labels = ls.filter(l => l !== L.parked); say(`#${i.number}: no longer parked`); continue; }
      const orphan = !ls.some(isState) && !prOf.has(i.number), untriaged = ls.includes(L.triage) && !others.length && !ls.includes(L.parked);
      /* a finished job whose PR was merged but whose issue was never closed: close it, do not park or requeue it */
      if (orphan && ls.some(l => /-done$/.test(l))) {
        const hits = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:pr is:merged ${i.number} in:title,body`, per_page: 20})).data.items || [];
        const fix = hits.find(h => new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+#${i.number}\\b`, 'i').test(h.body || ''));
        if (fix) { await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: `Fixed by #${fix.number}, which was merged. The issue had stayed open with no state label. Closing as done.`});
          await github.rest.issues.update({owner, repo, issue_number: i.number, state: 'closed', state_reason: 'completed'}); i.state = 'closed'; say(`#${i.number}: closed, fixed by merged PR #${fix.number}`); continue; } }
      if (ls.includes(L.mine) && (orphan || untriaged)) {
        const body = i.body || '', big = /\[x\]\s*This is a big request/i.test(body) || body.length > BIG_CHARS;
        const add = big ? [L.plan] : [L.queue, 'owner-approved'].filter(l => !ls.includes(l)), drop = ls.filter(l => l === L.triage || /-done$/.test(l));
        await setLabels(i.number, add, drop);
        await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: big
          ? 'Received, in your own words. This is a large request, so it waits for one planning pass that splits it into small jobs before any worker touches it. Open a chat with Claude and say "plan my requests". It is listed on the status page until then.'
          : 'Received, in your own words, and queued for the coding workers. It is listed on the status page until it is done.'});
        i.labels = ls.filter(l => !drop.includes(l)).concat(add); i.updated_at = new Date().toISOString(); say(`#${i.number}: Patrick's request, ${big ? 'waiting for a plan' : 'queued'}`); if (!big) routedAg = true;
      } else if (orphan) {
        await setLabels(i.number, [L.parked], []);
        await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: 'This issue was open with no label saying whose move it is, so no worker could see it. It is now `parked`: kept, readable and out of the queue. Add the `queued` label to start it.'});
        i.labels = ls.concat([L.parked]); say(`#${i.number}: had no state, parked`); }
    }

    /* parked issues trickle back to the workers */
    const statusPage = open.find(i => labels(i).includes(L.status)), today = new Date().toISOString().slice(0, 10);
    let out = {day: today, n: 0}; try { const m = ((statusPage && statusPage.body) || '').match(/<!-- park-out (\{.*?\}) -->/); if (m && JSON.parse(m[1]).day === today) out = JSON.parse(m[1]); } catch (e) { /* a bad marker counts as none */ }
    const live = i => i.state !== 'closed' && !TRACKERS.has(i.number) && !labels(i).includes(L.status);
    const queuedN = open.filter(i => live(i) && labels(i).includes(L.queue)).length;
    const ready = open.filter(i => live(i) && labels(i).includes(L.parked) && !labels(i).includes(KEEP) && (Date.now() - Date.parse(i.updated_at)) / 864e5 >= PARK_WAIT_DAYS)
      .sort((a, b) => (/^Bug found by /.test(b.title) ? 1 : 0) - (/^Bug found by /.test(a.title) ? 1 : 0) || a.number - b.number);
    if (queuedN < PARK_LOW && out.n < PARK_PER_DAY && ready.length) { const i = ready[0], ls = labels(i);
      /* the job-card hold (section 5) stops a queued issue that names no check, so give it the standing one here */
      if (!hasCheck(i.body || '')) await github.rest.issues.update({owner, repo, issue_number: i.number, body: `${i.body || ''}\n\n## Check\n\nAdd a check in \`tests/suites/\` that fails on main and passes on your branch, and name it in the pull request. Change only what this issue describes. If it cannot be tested, or it would change a number the app reports, say so on the issue and stop.`});
      await setLabels(i.number, [L.queue], [L.parked]);
      await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: `The queue was nearly empty, so this parked issue is now queued for the coding workers (at most ${PARK_PER_DAY} a day leave the shelf this way). To stop it, remove \`queued\` and add \`${KEEP}\`, or close the issue.`});
      i.labels = ls.filter(l => l !== L.parked).concat([L.queue]); i.updated_at = new Date().toISOString(); out.n++; routedAg = true; say(`#${i.number}: parked issue queued (${out.n} of ${PARK_PER_DAY} today)`); }

    /* the status page */
    const days = t => Math.floor((Date.now() - Date.parse(t)) / 864e5), link = i => `#${i.number} ${String(i.title).replace(/\|/g, '/').slice(0, 90)}`;
    const stateOf = i => { const ls = labels(i), pr = prOf.get(i.number);
      if (ls.includes('needs-owner') && !ls.includes('owner-approved')) return ['you', 'Waiting on you: reply OK or No on the issue'];
      if (ls.includes(L.plan)) return ['claude', 'Waiting for a plan'];
      if (ls.some(l => ['for-coordinator', 'needs-coordinator', 'ready-for-lead'].includes(l))) return ['claude', 'Waiting on the lead'];
      if (pr) return ['work', `Pull request #${pr} open`];
      if (ls.some(l => /-running$/.test(l))) return ['work', 'A worker is on it now'];
      if (ls.includes('for-antigravity')) return ['work', 'With Antigravity'];
      if (ls.some(l => ['for-codex', 'for-claude-code', 'for-claude-first', 'for-claude-cloud', 'for-copilot'].includes(l))) return ['work', 'With the retry workers'];
      if (ls.includes(L.queue) && ls.includes('ag-returned')) return ['work', 'Queued for the PC: Antigravity handed it back'];
      if (ls.includes(L.queue) || ls.includes('jules-queue')) return ['work', 'Queued'];
      if (ls.includes(L.parked)) return ['parked', 'Parked'];
      return ['work', ls.filter(isState).join(', ') || 'No state']; };
    const openNow = open.filter(i => i.state !== 'closed');
    const mine = openNow.filter(i => labels(i).includes(L.mine) && !labels(i).includes(L.status));
    const askYou = openNow.filter(i => !labels(i).includes(L.status) && stateOf(i)[0] === 'you');
    const askClaude = openNow.filter(i => stateOf(i)[0] === 'claude' && !TRACKERS.has(i.number) && !labels(i).includes(L.status));
    const working = mine.filter(i => stateOf(i)[0] === 'work'), stuck = working.filter(i => days(i.updated_at) >= STUCK_DAYS);
    const parkedN = openNow.filter(i => labels(i).includes(L.parked)).length;
    const since = new Date(Date.now() - DONE_DAYS * 864e5).toISOString();
    const done = (await github.paginate(github.rest.issues.listForRepo, {owner, repo, state: 'closed', labels: L.mine, since, per_page: 100})).filter(i => !i.pull_request && i.closed_at > since).sort((a, b) => b.closed_at.localeCompare(a.closed_at));
    let pcLine = 'unknown', agLine = '';
    try { const tcs = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number: 17, per_page: 100});
      const hb = [...tcs].reverse().find(c => c.body.startsWith('<!-- pc-heartbeat ')), m = hb && hb.body.match(/pc-heartbeat (\d+)/), ago = m ? (Date.now() / 1000 - Number(m[1])) / 3600 : null;
      pcLine = ago === null ? 'never seen' : ago < 0.34 ? 'on' : `off, last seen ${ago < 48 ? Math.round(ago) + ' hours' : Math.round(ago / 24) + ' days'} ago`;
      const cs = [...tcs].reverse().find(c => c.body.includes('<!-- cloud-state ')), cm = cs && cs.body.match(/<!-- cloud-state (\{.*?\}) -->/), st = cm ? JSON.parse(cm[1]) : {};
      agLine = st.ag_off_until && st.ag_off_until > Date.now() / 1000 ? `paused (it refused ${st.ag_refused || 'its last'} calls in a row)` : 'available'; } catch (e) { say(`status page: could not read #17: ${e.message}`); }
    const list = (xs, f) => xs.length ? xs.map(f).join('\n') : '_Nothing._';
    /* the scorecard: what each worker's pull requests came to, so routing can rest on numbers. A worker is known by its branch prefix. */
    const WHO = {agy: 'Antigravity (CLI and remote agents)', antigravity: 'Antigravity cloud route', codex: 'Codex', claude: 'Claude', copilot: 'Copilot', jules: 'Jules (removed)'};
    const from = new Date(Date.now() - SCORE_DAYS * 864e5).toISOString(), tally = {};
    const recent = (await github.rest.pulls.list({owner, repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 100})).data.filter(p => (p.merged_at || p.closed_at) > from);
    for (const p of recent.concat(livePrs.filter(p => p.created_at > from))) { const k = WHO[p.head.ref.split('/')[0]] || 'Other';
      const t = tally[k] = tally[k] || {merged: 0, closed: 0, open: 0}; if (p.merged_at) t.merged++; else if (p.state === 'closed') t.closed++; else t.open++; }
    const score = Object.keys(tally).length ? '| Worker | Merged | Closed without merging | Open | Merged share |\n|---|---|---|---|---|\n' + Object.entries(tally).sort((a, b) => b[1].merged - a[1].merged).map(([k, t]) => `| ${k} | ${t.merged} | ${t.closed} | ${t.open} | ${t.merged + t.closed ? Math.round(100 * t.merged / (t.merged + t.closed)) + '%' : 'n/a'} |`).join('\n') : '_No pull requests in this period._';
    const body = ['<!-- status-page -->', '# Where your requests stand', '',
      `Rebuilt by the queue leader whenever something changes. To ask for something, open a [new request](https://github.com/${owner}/${repo}/issues/new?template=request.yml) or tell Claude in a chat. A request is filed in your own words and stays on this page until it is done.`, '',
      `## Waiting on you (${askYou.length})`, list(askYou, i => `- ${link(i)}`), '',
      `## Waiting on Claude (${askClaude.length})`, askClaude.length ? 'Open a chat with Claude and say "work through my status page".\n' + list(askClaude, i => `- ${link(i)}: ${stateOf(i)[1].toLowerCase()}`) : '_Nothing._', '',
      `## Stuck (${stuck.length})`, stuck.length ? `No movement for ${STUCK_DAYS} days or more.\n` + list(stuck, i => `- ${link(i)}: ${stateOf(i)[1].toLowerCase()}, ${days(i.updated_at)} days`) : '_Nothing._', '',
      `## Your requests in progress (${working.length})`, working.length ? '| Request | State | Days since it moved |\n|---|---|---|\n' + working.map(i => `| ${link(i)} | ${stateOf(i)[1]} | ${days(i.updated_at)} |`).join('\n') : '_Nothing._', '',
      `## Done in the last ${DONE_DAYS} days (${done.length}, newest 10 shown)`, list(done.slice(0, 10), i => `- ${link(i)}${i.state_reason === 'not_planned' ? ' (closed without a change)' : ''}`), '',
      `## Workers, last ${SCORE_DAYS} days`, score, '', `- PC manager: ${pcLine}`, `- Antigravity cloud route: ${agLine || 'unknown'}`, `- Parked issues, found by the machine and not started: [${parkedN}](https://github.com/${owner}/${repo}/issues?q=is%3Aissue+is%3Aopen+label%3Aparked). When fewer than ${PARK_LOW} jobs are queued, the oldest one untouched for ${PARK_WAIT_DAYS} days is queued, at most ${PARK_PER_DAY} a day (${out.n} today). Add \`queued\` to start one now, \`${KEEP}\` to hold one, or close it.`].join('\n');
    let page = open.find(i => labels(i).includes(L.status));
    const told0 = page ? ((page.body || '').match(/<!-- status-told (\{.*?\}) -->/) || [])[1] : null; let told = {}; try { told = told0 ? JSON.parse(told0) : {}; } catch (e) { told = {}; }
    const now = {}; askYou.forEach(i => { now[i.number] = 'you'; }); stuck.forEach(i => { now[i.number] = 'stuck'; });
    const fresh = Object.keys(now).filter(n => told[n] !== now[n]);
    const full = `${body}\n\n<!-- status-told ${JSON.stringify(now)} -->\n<!-- park-out ${JSON.stringify(out)} -->`;
    if (!page) { page = (await github.rest.issues.create({owner, repo, title: 'Status page: where your requests stand', labels: [L.status], body: full})).data; say(`status page created as #${page.number}`); }
    else if ((page.body || '') !== full) { await github.rest.issues.update({owner, repo, issue_number: page.number, body: full}); say('status page updated'); }
    if (fresh.length) { const by = n => open.find(i => i.number === +n);
      await github.rest.issues.createComment({owner, repo, issue_number: page.number, body: `@${owner} ` + fresh.map(n => now[n] === 'you' ? `${link(by(n))} needs your answer.` : `${link(by(n))} has not moved for ${STUCK_DAYS} days.`).join(' ')});
      say(`status page: told Patrick about ${fresh.map(n => '#' + n).join(', ')}`); }
  } catch (e) { say(`requests and status page: ${e.message}`); }

  await wakeCloud(routedAg);
  /* Check again soon only while the NEXT run would actually do something: a queued issue this leader would
     route, and a worker available to route it to. Two ways this looped before, both costing a run every three
     minutes for nothing:
       - counting issues carrying ag-returned, which the routing loop skips
       - counting routable issues while agAvailable is false (PC off and the Antigravity API paused), when the
         routing loop does not run at all. That state lasts hours, so it was the more expensive of the two.
     A job already on for-antigravity is not counted: the leader never acts on those, and it wakes on a
     finished Test suite run to merge whatever the workers open. */
  const more = agAvailable ? (await queued()).filter(routable).length : 0;
  core.setOutput('active', more > 0 ? 'true' : 'false');
  await core.summary.addHeading('Queue leader').addList(log.length ? log : ['nothing to do']).write();
};
