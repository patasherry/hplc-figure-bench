const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Non-blocking Evidence Preflight ---');
let diff = '';
try {
  const cwd = path.resolve(__dirname, '../../');
  diff = execSync('git diff origin/main', { encoding: 'utf-8', cwd });
} catch (e) {
  console.log('Could not read git diff. Are you on a branch?');
  process.exit(0);
}

const warnings = [];
const lines = diff.split('\n');
const added = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));

if (added.some(l => l.includes('<<<<<<< ') || l.includes('=======') || l.includes('>>>>>>> '))) {
  warnings.push('Merge conflict markers found in diff.');
}
if (removed.some(l => l.includes('T.check('))) {
  warnings.push('An existing test check was deleted or modified.');
}
if (added.some(l => /(?:\/\/|\/\*).*T\.check\(/.test(l))) {
  warnings.push('An existing test check was commented out.');
}

const compPath = path.join(__dirname, '../results/compare.md');
if (fs.existsSync(compPath)) {
  const comp = fs.readFileSync(compPath, 'utf8');
  const fixMatch = comp.match(/## Fixed by the new build \((\d+)\)/);
  if (fixMatch && parseInt(fixMatch[1], 10) === 0) {
    warnings.push('No main-failing evidence found (0 fixed checks in compare.md).');
  }
} else {
  warnings.push('results/compare.md not found. Run `node tests/compare.js` first to check main-failing evidence.');
}

if (warnings.length > 0) {
  warnings.forEach(w => console.log('⚠️  ' + w));
  console.log('\nNote: If this PR changes a reported number or import, it requires a check that fails on main. Exceptions must be documented.');
} else {
  console.log('✅ No evidence issues detected.');
}
