const fs = require('fs');
const html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// The issue asks to Memoize loop-heavy data accessors (`poolRows`, `integRows`, `fracSegments`)
// Cache their results on the `run` object and invalidate when data arrays or relevant settings change.

console.log('--- poolRows ---');
const poolRowsLines = html.split('\n').filter((l, i) => i > 1950 && i < 1980);
console.log(poolRowsLines.join('\n'));

console.log('--- integRows ---');
const integRowsLines = html.split('\n').filter((l, i) => i > 1920 && i < 1945);
console.log(integRowsLines.join('\n'));

console.log('--- fracSegments ---');
const fracSegmentsLines = html.split('\n').filter((l, i) => i > 1610 && i < 1625);
console.log(fracSegmentsLines.join('\n'));
