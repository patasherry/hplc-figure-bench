const fs = require('fs');
const html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// Looking for weakmap usage, let's see what is there
const procMemoMatch = html.match(/let procMemo = new WeakMap\(\);/);
console.log("procMemo found:", !!procMemoMatch);

const poolRowsMatch = html.match(/function poolRows\(run\)\{/);
console.log("poolRows found:", !!poolRowsMatch);
