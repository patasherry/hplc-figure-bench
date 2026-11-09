const fs = require('fs');
const html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');
const lines = html.split('\n');
const targets = [];
lines.forEach((line, i) => {
  if (line.includes('const DEF = {')) {
    targets.push(`${i+1}: ${line}`);
  }
});
console.log(targets.join('\n'));
