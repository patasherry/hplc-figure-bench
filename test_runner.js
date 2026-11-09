const { spawnSync } = require('child_process');
spawnSync('node', ['tests/suites/49_yield_allocation.js'], { stdio: 'inherit' });
console.log(require('fs').readFileSync('tests/results/49_yield_allocation.json', 'utf8'));
