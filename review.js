const fs = require('fs');
const code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const regexPool = /function poolRows\(run\)\{/g;
const regexInteg = /function integRows\(run\)\{/g;
const regexFrac = /function fracSegments\(run, dataEnd\)\{/g;

console.log(regexPool.exec(code));
console.log(regexInteg.exec(code));
console.log(regexFrac.exec(code));
