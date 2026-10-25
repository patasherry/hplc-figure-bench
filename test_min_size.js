const fs = require('fs');
const html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// Just check for Math.max(fs * ...) occurrences in gelPart
const start = html.indexOf('function gelPart');
const end = html.indexOf('function buildGelSVG');
const gelPartCode = html.slice(start, end);

const matches = gelPartCode.match(/Math\.max\([^)]*\)/g);
if(matches) matches.forEach(m => console.log(m));
