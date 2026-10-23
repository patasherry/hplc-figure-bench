// Runs every suite in suites/ (or the ones named) against APP and prints one summary.
// Usage: node run.js [suiteName ...]   (APP=/path/app.html to test another build; default is the app in the repository root)
const { execFileSync, spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, 'suites'), want = process.argv.slice(2), files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && (!want.length || want.some(w => f.includes(w)))).sort();
const rows = []; for (const f of files) { const t0 = Date.now(); const r = spawnSync('node', [path.join(dir, f)], {env: process.env, encoding: 'utf8', timeout: 1800000});
  const out = (r.stdout || '') + (r.stderr || ''), pass = (out.match(/^PASS /gm) || []).length, fail = (out.match(/^FAIL /gm) || []).length;
  rows.push({f, pass, fail, crashed: r.status !== 0 && !fail, s: Math.round((Date.now() - t0)/1000)}); fs.writeFileSync(path.join(__dirname, 'results', f.replace(/\.js$/, '.log')), out);
  console.log(`${f.padEnd(34)} pass ${String(pass).padStart(3)}  fail ${String(fail).padStart(3)}${r.status !== 0 && !fail ? '  CRASHED' : ''}  ${rows[rows.length - 1].s}s`); }
const P = rows.reduce((a, r) => a + r.pass, 0), F = rows.reduce((a, r) => a + r.fail, 0), C = rows.filter(r => r.crashed).length;
console.log(`\nTOTAL pass ${P}  fail ${F}  crashed suites ${C}  (APP=${require('./lib/app')})`); process.exit(F || C ? 1 : 0);
