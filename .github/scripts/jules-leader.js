// Jules leader: a rule-based supervisor that runs in GitHub Actions. It uses no AI and no Claude tokens.
// Each run (every 15 minutes, or on demand):
//   1. Start: issues labelled `jules-queue` get a Jules session via the Jules API (at most MAX_RUNNING at once).
//   2. Watch: running sessions are polled. A failed session is retried with "smaller steps" guidance, up to MAX_ATTEMPTS;
//      after that the issue gets `needs-coordinator`. A finished session links its PR on the issue.
//   3. Merge: open PRs that touch only tests/ or docs/, with a clean Test suite report (no regressions), are squash-merged.
//      Anything that changes the app or workflows gets `needs-coordinator` instead.
//   4. Follow up: after a merge, "New checks failing" in the PR's test report and "Ready-to-file issues" in an audit
//      report become new issues labelled `needs-triage`. A person or the coordinator moves them to `jules-queue`.
// State lives on the issues: labels plus one hidden JSON comment per issue.
const MAX_RUNNING = 3, MAX_ATTEMPTS = 3, MAX_REPLIES = 6, MAX_HOURS = 6, API = 'https://jules.googleapis.com/v1alpha/';
const L = {queue: 'jules-queue', run: 'jules-running', done: 'jules-done', fail: 'needs-coordinator', triage: 'needs-triage'};
const MARK = '<!-- jules-leader ';
const SAFE = f => /^(tests\/|docs\/|\.github\/ISSUE_TEMPLATE\/)/.test(f) || f === 'README.md' || f === 'tests/README.md';
/* a few edits outside those folders are routine for test and docs PRs: adding a suite to the Test suite matrix, or adding up to 3 lines to AGENTS.md */
const changed = patch => String(patch || '').split('\n').filter(l => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
const SAFE_FILE = f => SAFE(f.filename)
  || (f.filename === '.github/workflows/tests.yml' && changed(f.patch).length > 0 && changed(f.patch).every(l => /^[+-]\s*(suite: \[|names = \{)/.test(l)))
  || (f.filename === 'AGENTS.md' && f.deletions === 0 && f.additions <= 3);

module.exports = async ({github, context, core}) => {
  const {owner, repo} = context.repo, key = process.env.JULES_API_KEY, log = [];
  const say = m => { log.push(m); core.info(m); };
  const jules = async (path, body) => { const r = await fetch(API + path, {method: body ? 'POST' : 'GET', headers: {'X-Goog-Api-Key': key, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
    const t = await r.text(); if (!r.ok) throw new Error(`Jules API ${r.status} on ${path}: ${t.slice(0, 300)}`); return t ? JSON.parse(t) : {}; };
  const labels = i => (i.labels || []).map(l => typeof l === 'string' ? l : l.name);
  const issues = async label => (await github.paginate(github.rest.issues.listForRepo, {owner, repo, state: 'open', labels: label, per_page: 100})).filter(i => !i.pull_request);
  const ensureLabels = async () => { const have = new Set((await github.paginate(github.rest.issues.listLabelsForRepo, {owner, repo, per_page: 100})).map(l => l.name));
    const want = {[L.queue]: '0E8A16', [L.run]: 'FBCA04', [L.done]: '5319E7', [L.fail]: 'D93F0B', [L.triage]: 'C5DEF5'};
    for (const [name, color] of Object.entries(want)) if (!have.has(name)) await github.rest.issues.createLabel({owner, repo, name, color}); };
  const setLabels = async (n, add, remove) => { for (const r of remove) await github.rest.issues.removeLabel({owner, repo, issue_number: n, name: r}).catch(() => {});
    if (add.length) await github.rest.issues.addLabels({owner, repo, issue_number: n, labels: add}); };
  const getState = async n => { const cs = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number: n, per_page: 100});
    const c = cs.reverse().find(x => x.body.startsWith(MARK)); return c ? {id: c.id, s: JSON.parse(c.body.slice(MARK.length, c.body.indexOf(' -->')))} : {id: null, s: {}}; };
  const putState = async (n, st, note) => { const body = `${MARK}${JSON.stringify(st)} -->\n${note}`;
    const {id} = await getState(n); if (id) await github.rest.issues.updateComment({owner, repo, comment_id: id, body}); else await github.rest.issues.createComment({owner, repo, issue_number: n, body}); };
  const prompt = (i, attempt, lastErr) => `${i.title}\n\n${i.body || ''}\n\nThis task is GitHub issue #${i.number} in ${owner}/${repo}. Follow AGENTS.md and read docs/CODEMAP.md first if it exists. Put "Closes #${i.number}" in the PR description.` +
    (attempt > 1 ? `\n\nNOTE: attempt ${attempt}. The previous attempt ended with an error${lastErr ? ` (${lastErr})` : ''}. Work in smaller steps. If the task is large, do only the first useful part, open the PR, and list what remains in the PR description.` : '');
  const start = async (i, attempt, lastErr) => { const s = await jules('sessions', {title: `#${i.number} ${i.title}`.slice(0, 120), prompt: prompt(i, attempt, lastErr),
      sourceContext: {source: `sources/github/${owner}/${repo}`, githubRepoContext: {startingBranch: 'main'}}, requirePlanApproval: false, automationMode: 'AUTO_CREATE_PR'});
    await putState(i.number, {session: s.name, attempt, since: new Date().toISOString()}, `Jules leader: started attempt ${attempt} (${s.name}).`); await setLabels(i.number, [L.run], [L.queue]); say(`#${i.number}: started attempt ${attempt}`); };

  await ensureLabels();
  if (!key) { core.warning('JULES_API_KEY secret is not set: skipping session work, doing merges and follow-ups only.'); }

  /* ---------- 2. watch running sessions ---------- */
  const running = key ? await issues(L.run) : [];
  for (const i of running) { const {s} = await getState(i.number); if (!s.session) continue; let ses;
    try { ses = await jules(s.session); } catch (e) { say(`#${i.number}: could not read session: ${e.message}`); continue; }
    const st = String(ses.state || '').toUpperCase(), pr = (ses.outputs || []).map(o => o.pullRequest && o.pullRequest.url).find(Boolean);
    /* keep the last seen state on the issue, so a stuck session is easy to spot */
    if (s.state !== st) { s.state = st; await putState(i.number, s, `Jules leader: attempt ${s.attempt} is ${st || 'in an unknown state'}.`); }
    /* a session running much longer than usual gets one nudge to wrap up, then goes to the coordinator */
    const hrs = s.since ? (Date.now() - Date.parse(s.since))/3.6e6 : 0;
    if (st === 'IN_PROGRESS' && hrs > MAX_HOURS && !s.nudged) { await jules(`${s.session}:sendMessage`, {prompt: 'This session has run for several hours. Please finish now: commit what works, open the pull request, and list what remains under "Open questions" in the PR description.'}).catch(() => {});
      s.nudged = true; await putState(i.number, s, `Jules leader: attempt ${s.attempt} has run for ${Math.round(hrs)} h, asked Jules to wrap up.`); say(`#${i.number}: nudged after ${Math.round(hrs)} h`); continue; }
    if (st === 'IN_PROGRESS' && hrs > 2*MAX_HOURS && !labels(i).includes(L.fail)) { await github.rest.issues.addLabels({owner, repo, issue_number: i.number, labels: [L.fail]}); say(`#${i.number}: still running after ${Math.round(hrs)} h, flagged`); }
    if (st === 'AWAITING_PLAN_APPROVAL') { await jules(`${s.session}:approvePlan`, {}).catch(() => {}); say(`#${i.number}: approved plan`); continue; }
    /* Jules asked a question: post it on the issue, and tell Jules to decide by the rules and list open questions in the PR */
    /* a session paused with a question also waits for the user: treat it the same way */
    if (st === 'AWAITING_USER_FEEDBACK' || st === 'PAUSED') { let q = '';
      try { const acts = []; let tok = ''; do { const a = await jules(`${s.session}/activities?pageSize=100${tok ? '&pageToken=' + tok : ''}`); acts.push(...(a.activities || [])); tok = a.nextPageToken || ''; } while (tok && acts.length < 1000);
        const last = acts.filter(a => a.agentMessaged).sort((a, b) => String(a.createTime).localeCompare(String(b.createTime))).pop(); q = last ? last.agentMessaged.agentMessage : ''; } catch (e) { say(`#${i.number}: could not read the question: ${e.message}`); }
      const n = (s.replies || 0) + 1, quote = (q || '(question text not available)').slice(0, 3000).split('\n').map(l => '> ' + l).join('\n');
      if (n > MAX_REPLIES) { await putState(i.number, s, `Jules leader: Jules is still asking after ${MAX_REPLIES} automatic replies. Needs the coordinator. Latest question:\n\n${quote}`); await setLabels(i.number, [L.fail], [L.run]); say(`#${i.number}: question needs the coordinator`); continue; }
      await jules(`${s.session}:sendMessage`, {prompt: n === 1
        ? 'Yes, go ahead with the approach you think is best. Nobody can answer questions during this session, so do not wait for approval or a review. Decide using AGENTS.md and the issue text, choosing the smallest safe option, and do not change scientific values the issue does not ask for. If a check fails because the app looks wrong, keep the check failing and explain it in the PR. Finish now: commit, open the pull request, and list each open question and the choice you made under "Open questions" in the PR description.'
        : 'Approved. Please stop asking and finish now: commit your work as it is and open the pull request. Put anything unfinished or uncertain under "Open questions" in the PR description. The coordinator will review the PR.'});
      await putState(i.number, Object.assign(s, {replies: n}), `Jules leader: attempt ${s.attempt} asked a question (automatic reply ${n} of ${MAX_REPLIES}: decide by the rules and list it in the PR):\n\n${quote}`);
      await github.rest.issues.createComment({owner, repo, issue_number: i.number, body: `Jules asked:\n\n${quote}\n\nThe leader told Jules to decide using AGENTS.md and list this under "Open questions" in its PR.`});
      say(`#${i.number}: answered a question`); continue; }
    if (st === 'COMPLETED' && pr) { await putState(i.number, Object.assign(s, {pr}), `Jules leader: attempt ${s.attempt} finished. PR: ${pr}`); await setLabels(i.number, [L.done], [L.run]); say(`#${i.number}: PR ${pr}`); continue; }
    if (st === 'FAILED' || (st === 'COMPLETED' && !pr)) { const why = st === 'FAILED' ? 'session failed' : 'session finished without a PR';
      if ((s.attempt || 1) < MAX_ATTEMPTS) await start(i, (s.attempt || 1) + 1, why);
      else { await putState(i.number, s, `Jules leader: ${MAX_ATTEMPTS} attempts ended without a PR (${why}). Needs the coordinator.`); await setLabels(i.number, [L.fail], [L.run]); say(`#${i.number}: gave up`); } } }

  /* ---------- 1. start queued work ---------- */
  if (key) { let free = MAX_RUNNING - (await issues(L.run)).length;
    for (const i of (await issues(L.queue)).sort((a, b) => a.number - b.number)) { if (free <= 0) break;
      try { await start(i, 1); free--; } catch (e) { say(`#${i.number}: could not start: ${e.message}`); } } }

  /* ---------- 3. merge safe PRs ---------- */
  const prs = await github.paginate(github.rest.pulls.list, {owner, repo, state: 'open', per_page: 100});
  for (const p of prs) { if (p.draft) continue;
    const fobj = await github.paginate(github.rest.pulls.listFiles, {owner, repo, pull_number: p.number, per_page: 100}), files = fobj.map(f => f.filename);
    const labels = p.labels.map(l => l.name);
    if (!fobj.every(SAFE_FILE)) { if (!labels.includes(L.fail)) { await setLabels(p.number, [L.fail], []); say(`PR #${p.number}: changes the app or workflows, flagged for the coordinator`); } continue; }
    const runs = (await github.rest.actions.listWorkflowRunsForRepo({owner, repo, head_sha: p.head.sha, per_page: 20})).data.workflow_runs.filter(r => r.name === 'Test suite');
    const cs = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number: p.number, per_page: 100}), rep = cs.reverse().find(c => c.body.includes('<!-- test-suite-report -->'));
    const testsTouched = files.some(f => f.startsWith('tests/'));
    if (testsTouched && !(runs.length && runs[0].status === 'completed' && runs[0].conclusion === 'success' && rep && /No regressions/.test(rep.body))) continue;
    /* GitHub works out mergeability in the background: ask a few times before giving up for this run */
    let full = (await github.rest.pulls.get({owner, repo, pull_number: p.number})).data;
    for (let k = 0; k < 4 && full.mergeable === null; k++) { await new Promise(r => setTimeout(r, 4000)); full = (await github.rest.pulls.get({owner, repo, pull_number: p.number})).data; }
    if (full.mergeable_state === 'dirty') { if (!labels.includes(L.fail)) { await setLabels(p.number, [L.fail], []); await github.rest.issues.createComment({owner, repo, issue_number: p.number, body: 'Jules leader: this PR has merge conflicts with main. Needs the coordinator.'}); } continue; }
    if (full.mergeable !== true) continue;
    if (p.labels.some(l => l.name === L.fail)) await setLabels(p.number, [], [L.fail]);
    await github.rest.pulls.merge({owner, repo, pull_number: p.number, merge_method: 'squash', commit_title: `${p.title} (#${p.number})`});
    say(`PR #${p.number}: merged (tests/docs only, no regressions)`);
    /* ---------- 4. follow-ups from what was merged ---------- */
    if (rep) { const sec = rep.body.split('#### New checks failing')[1]; if (sec) for (const line of sec.split('\n').filter(l => /^- \S/.test(l)).slice(0, 10)) {
        const id = line.slice(2).split(' (FAIL:')[0].trim(), detail = (line.split('(FAIL:')[1] || '').replace(/\)\s*$/, '').trim();
        const exists = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:issue in:title "${id}"`})).data.total_count;
        if (!exists) { await github.rest.issues.create({owner, repo, title: `Bug found by ${id}`, labels: [L.triage], body: `The check \`${id}\`, added in #${p.number}, fails on main:\n\n> ${detail}\n\nThe PR description in #${p.number} may say more about the cause. Triage: if this is a real app bug, fill in the bug template headings and move it to \`jules-queue\` (or to Claude for scientific changes).`}); say(`follow-up issue for ${id}`); } } }
    for (const f of files.filter(f => /^docs\/.*audit.*\.md$/.test(f))) { const raw = await github.rest.repos.getContent({owner, repo, path: f, ref: 'main'}).catch(() => null); if (!raw) continue;
      const md = Buffer.from(raw.data.content, 'base64').toString('utf8'), part = md.split(/^##\s+Ready-to-file issues\s*$/m)[1]; if (!part) continue;
      for (const block of part.split(/^###\s+/m).slice(1, 21)) { const title = block.split('\n')[0].trim(), body = block.split('\n').slice(1).join('\n').trim(); if (!title) continue;
        const exists = (await github.rest.search.issuesAndPullRequests({q: `repo:${owner}/${repo} is:issue in:title "${title.replace(/"/g, '')}"`})).data.total_count;
        if (!exists) { await github.rest.issues.create({owner, repo, title, labels: [L.triage], body: `${body}\n\n_From ${f} (#${p.number})._`}); say(`follow-up issue: ${title}`); } } } }

  /* tell the workflow whether to check again soon (GitHub rarely fires the 15-minute schedule) */
  core.setOutput('active', key && ((await issues(L.run)).length + (await issues(L.queue)).length) > 0 ? 'true' : 'false');
  await core.summary.addHeading('Jules leader').addList(log.length ? log : ['nothing to do']).write();
};
