// Queue leader: a rule-based supervisor that runs in GitHub Actions. It uses no AI and no Claude tokens.
// Until 2026-11-12 this also drove Google Jules through its API. Jules went read-only on 11-11 and closes on
// 12-31, so that half is gone; what remains is the part every other worker depends on.
// Each run (on a schedule, or on activity):
//   1. Route: issues labelled `queued` are handed to the Antigravity queue (`for-antigravity`), which the
//      Antigravity CLI, the Antigravity API route and the scheduled desktop session all serve.
//   2. Merge: open PRs that touch only tests/ or docs/, with a clean Test suite report (no regressions), are
//      squash-merged. Anything that changes the app or workflows gets `needs-coordinator` instead.
//   3. Follow up: after a merge, "New checks failing" in the PR's test report and "Ready-to-file issues" in an
//      audit report become new issues labelled `needs-triage`.
// State lives on the issue labels. The per-issue JSON state comment went with the sessions.
const AG_TAKES_APP = process.env.AG_TAKES_APP !== '0';
// `queued` was called `jules-queue` until 2026-11-12. Both are read so nothing in flight is stranded; only the
// new name is ever written. Drop QUEUE_OLD once no open issue carries it.
const L = {queue: 'queued', fail: 'needs-coordinator', triage: 'needs-triage'};
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
    const want = {[L.queue]: '0E8A16', [L.fail]: 'D93F0B', [L.triage]: 'C5DEF5'};
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
            await github.rest.issues.create({owner, repo, title: `Bug found by ${id}`, labels: [L.triage], body: `The check \`${id}\`, added in #${p.number}, fails on main:\n\n> ${detail}\n\nThe PR description in #${p.number} may say more about the cause.\n\n${hint}`}); say(`follow-up issue for ${id}`); routedAg = true; } } } }
    for (const f of files.filter(f => /^docs\/.*audit.*\.md$/.test(f))) { const raw = await github.rest.repos.getContent({owner, repo, path: f, ref: 'main'}).catch(() => null); if (!raw) continue;
      const md = Buffer.from(raw.data.content, 'base64').toString('utf8'), part = md.split(/^##\s+Ready-to-file issues\s*$/m)[1]; if (!part) continue;
      for (const block of part.split(/^###\s+/m).slice(1, 21)) { const title = block.split('\n')[0].trim(), body = block.split('\n').slice(1).join('\n').trim(); if (!title) continue;
        const exists = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:issue in:title "${title.replace(/"/g, '')}"`})).data.total_count;
        if (!exists) { await github.rest.issues.create({owner, repo, title, labels: [L.triage], body: `${body}\n\n_From ${f} (#${p.number})._`}); say(`follow-up issue: ${title}`); routedAg = true; } } } }

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
