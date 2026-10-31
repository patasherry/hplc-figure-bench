// Usability check runner: walks one test scope (tests/ux/scopes.js) through the UI, takes a screenshot after each step,
// and records what plain code can catch: page errors, horizontal scrolling, overlapping figure text, cut-off labels and
// placeholders, controls off the right edge, and slow steps. It judges nothing else; the local manager adds a model's notes.
// Usage: node tests/ux/scope.js <scope-id> <output-folder>   (prints the scope ids with no arguments)
// Not a suite: CI never runs it. Synthetic data only.
delete process.env.HFB_PRIVATE_DATA;
const {open, H, src, fs, path} = require('../lib/harness');
const SCOPES = require('./scopes');

const checks = p => p.evaluate(() => {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (e.textContent.trim() ? ` "${e.textContent.trim().slice(0, 40)}"` : '');
  const out = [], ctx = document.createElement('canvas').getContext('2d');
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth} px wide on a ${innerWidth} px screen)`);
  for (const e of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (!vis(e) || e.value || e.placeholder.length > 40) continue; /* long examples are meant to trail off; a short hint that is cut is not */ const cs = getComputedStyle(e); ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (ctx.measureText(e.placeholder).width > room + 2) out.push(`placeholder cut off: ${name(e)} shows only part of "${e.placeholder}"`);
  }
  for (const e of document.querySelectorAll('button, label, .btn, summary, th')) {
    if (!vis(e)) continue; const cs = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 2 && cs.overflow !== 'visible' && e.clientWidth > 0) out.push(`text cut off in ${name(e)}`);
    const r = e.getBoundingClientRect(); if (r.right > innerWidth + 2 && r.left < innerWidth) out.push(`${name(e)} runs off the right edge of the screen`);
  }
  const ts = [...document.querySelectorAll('#paper svg text')].map(t => ({t: t.textContent.trim(), r: t.getBoundingClientRect()})).filter(x => x.t && x.r.width > 0);
  for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) { const a = ts[i].r, b = ts[j].r, w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0 && h > 0 && w*h > 0.25*Math.min(a.width*a.height, b.width*b.height)) out.push(`figure text overlaps: "${ts[i].t}" and "${ts[j].t}"`); }
  return [...new Set(out)].slice(0, 15);
});

(async () => {
  const [id, outDir] = process.argv.slice(2);
  const sc = SCOPES.find(x => x.id === id);
  if (!sc || !outDir) { console.log('scopes: ' + SCOPES.map(x => x.id).join(', ')); process.exit(sc ? 1 : 0); }
  fs.mkdirSync(outDir, {recursive: true});
  const o = sc.open || {}, {ctx, p, errs, close} = await open({width: o.width, height: o.height}), h = H(p);
  if (o.dark) { await p.emulateMedia({colorScheme: 'dark'}); await p.waitForTimeout(300); }
  const report = {scope: sc.id, title: sc.title, goal: sc.goal, started: new Date().toISOString(), steps: []};
  let seen = 0;
  for (const [k, st] of sc.steps.entries()) {
    const t0 = Date.now(), step = {name: st.name, ok: true, error: '', ms: 0, findings: [], shot: ''};
    try { await st.run({p, h, src}); } catch (e) { step.ok = false; step.error = e.message.split('\n')[0].slice(0, 300); }
    step.ms = Date.now() - t0;
    await p.waitForTimeout(300);
    const newErr = errs.slice(seen); seen = errs.length;
    step.findings.push(...newErr.map(e => `page error: ${e.slice(0, 200)}`));
    try { step.findings.push(...await checks(p)); } catch (e) { step.findings.push(`checks failed: ${e.message.slice(0, 120)}`); }
    step.shot = path.join(outDir, `${String(k + 1).padStart(2, '0')}.png`);
    try { await p.screenshot({path: step.shot}); } catch (e) { step.shot = ''; }
    report.steps.push(step);
    console.log(`${step.ok ? 'OK  ' : 'FAIL'} ${st.name} (${step.ms} ms)${step.error ? ' :: ' + step.error : ''}${step.findings.length ? ` [${step.findings.length} findings]` : ''}`);
  }
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  await close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
