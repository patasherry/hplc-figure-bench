const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const targetStr = "set('st-lanes', `${labs.length} lanes` + (used.size ? `, ${used.size} run${used.size > 1 ? 's' : ''}` : ', no runs'));";
const replaceStr = "set('st-lanes', `${g.nLanes || labs.length} lanes` + (used.size ? `, ${used.size} run${used.size > 1 ? 's' : ''}` : ', no runs'));";

html = html.replace(targetStr, replaceStr);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
