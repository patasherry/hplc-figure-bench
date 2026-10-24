// Runs the whole suite on a baseline and on a new build, then lists what changed.
// Usage: node compare.js [new.html] [suite filters...]
//   new.html defaults to the app in the repository root (your working copy).
//   The baseline is BASE=/path/old.html or BASE=<git ref>; default origin/main.
// Output: results/compare.md with regressions (pass on baseline, fail on new), fixes, and checks that exist in only one run.
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const APPF = require('./lib/app'), arg = process.argv[2] && /\.html?$/i.test(process.argv[2]) ? process.argv[2] : null;
const NEW = path.resolve(arg || APPF), filt = process.argv.slice(arg ? 3 : 2);
if (!fs.existsSync(NEW)) { console.error('No app file at ' + NEW); process.exit(2); }
/* the baseline: BASE=/path/old.html, or BASE=<git ref> (default origin/main), read from git without touching the working tree */
let BASE = process.env.BASE || 'origin/main';
if (!fs.existsSync(BASE)) { const ref = BASE, repo = path.resolve(__dirname, '..'), rel = path.relative(repo, APPF).split(path.sep).join('/');
  const r = spawnSync('git', ['-C', repo, 'show', `${ref}:${rel}`], {maxBuffer: 1 << 28}); if (r.status !== 0) { console.error(`Could not read ${rel} at ${ref}: ${String(r.stderr).trim()}`); process.exit(2); }
  fs.mkdirSync(path.join(__dirname, 'results'), {recursive: true}); BASE = path.join(__dirname, 'results', 'base.html'); fs.writeFileSync(BASE, r.stdout); console.log(`Baseline: ${rel} at ${ref}`); }
else BASE = path.resolve(BASE);
/* 1. the elements the harness and suites drive: a rewrite that renames them breaks tests, not necessarily the app */
const ids = new Set(); for (const f of [path.join(__dirname, 'lib/harness.js'), ...fs.readdirSync(path.join(__dirname, 'suites')).filter(x => x.endsWith('.js')).map(x => path.join(__dirname, 'suites', x))])
  (fs.readFileSync(f, 'utf8').match(/#[a-zA-Z][\w-]*/g) || []).forEach(m => ids.add(m.slice(1)));
const html = fs.readFileSync(NEW, 'utf8'), missing = [...ids].filter(id => !new RegExp(`id=["'\`]${id}["'\`]|id="\\$\\{|['"\`]${id}['"\`]`).test(html) && !/^(tl|paper|file)$/.test(id) ? !html.includes(`id="${id}"`) && !html.includes(`'${id}'`) : false);
const run = (app, tag) => { const out = path.join(__dirname, 'results', tag); fs.rmSync(out, {recursive: true, force: true}); fs.mkdirSync(out, {recursive: true});
  fs.readdirSync(path.join(__dirname, 'results')).filter(f => /^\d\d_.*\.json$/.test(f)).forEach(f => fs.rmSync(path.join(__dirname, 'results', f)));
  spawnSync('node', [path.join(__dirname, 'run.js'), ...filt], {env: Object.assign({}, process.env, {APP: app}), encoding: 'utf8', stdio: 'inherit', timeout: 3600000});
  const R = {}; fs.readdirSync(path.join(__dirname, 'results')).filter(f => /^\d\d_.*\.json$/.test(f)).forEach(f => { const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', f), 'utf8')); if (!Array.isArray(j.checks)) return; fs.copyFileSync(path.join(__dirname, 'results', f), path.join(out, f)); j.checks.forEach(c => { R[j.suite + '/' + c.id] = c; }); }); return R; };
console.log('== baseline'); const A = run(BASE, 'baseline'); console.log('== new'); const B = run(NEW, 'new');
const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort(), reg = [], fix = [], onlyA = [], onlyB = [], stillFail = [];
keys.forEach(k => { const a = A[k], b = B[k]; if (a && !b) onlyA.push(k); else if (!a && b) onlyB.push(k + (b.ok ? '' : ' (FAIL: ' + b.detail + ')')); else if (a.ok && !b.ok) reg.push(`${k} :: ${b.detail}`); else if (!a.ok && b.ok) fix.push(k); else if (!a.ok && !b.ok) stillFail.push(k + ' (FAIL: ' + String(b.detail || '').slice(0, 200) + ')'); });
const md = [`# Suite comparison\n\nBaseline: ${BASE}\nNew: ${NEW}\n`, `## Selectors the suite uses that the new build lacks (${missing.length})\n` + (missing.map(x => '- #' + x).join('\n') || 'none'),
  `## Regressions: pass on baseline, fail on new (${reg.length})\n` + (reg.map(x => '- ' + x).join('\n') || 'none'), `## Fixed by the new build (${fix.length})\n` + (fix.map(x => '- ' + x).join('\n') || 'none'),
  `## Failing on both (${stillFail.length})\n` + (stillFail.map(x => '- ' + x).join('\n') || 'none'), `## Checks only on baseline, e.g. a suite crashed on new (${onlyA.length})\n` + (onlyA.map(x => '- ' + x).join('\n') || 'none'), `## Checks only on new (${onlyB.length})\n` + (onlyB.map(x => '- ' + x).join('\n') || 'none')].join('\n\n');
fs.writeFileSync(path.join(__dirname, 'results', 'compare.md'), md); console.log('\n' + md.split('\n').filter(l => l.startsWith('## ')).join('\n')); console.log('\nFull report: results/compare.md');
