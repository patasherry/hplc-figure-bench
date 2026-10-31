const fs = require('fs');
const file = 'hplc-figure-bench(WF1.13).html';
let content = fs.readFileSync(file, 'utf8');

const search = `<<<<<<< HEAD
  const {xs, ys} = run.delimiter === ';' || (xUnit(run) === 'min' && !(uvFlow(run) > 0)) ? procFull(run) : runUV(Object.assign({}, run, {crop: '', xmin: '', xmax: ''})), n = ys.length; if (n < 10) return 0;
=======
  const uvOrig = run.uvs[run.uvi] || run.uvs[0];
  const uv = {xs: uvOrig.xs, ys: uvOrig.ys, yu: uvOrig.yu};
  if (/^au$/i.test(String(uv.yu || '').trim())) { uv.ys = uv.ys.map(v => v*1000); uv.yu = 'mAU'; }
  const {xs, ys} = {xs: uv.xs, ys: uv.ys}; const n = ys.length; if (n < 10) return 0;
>>>>>>> 78c0491 (Fix SEC peak detection bounds for crops and zooming (closes #398))`;

const replace = `  const uvOrig = run.uvs[run.uvi] || run.uvs[0];
  const uv = {xs: uvOrig.xs, ys: uvOrig.ys, yu: uvOrig.yu};
  if (/^au$/i.test(String(uv.yu || '').trim())) { uv.ys = uv.ys.map(v => v*1000); uv.yu = 'mAU'; }
  const {xs, ys} = {xs: uv.xs, ys: uv.ys}; const n = ys.length; if (n < 10) return 0;`;

if (content.includes(search)) {
  fs.writeFileSync(file, content.replace(search, replace));
  console.log("Conflict resolved.");
} else {
  console.log("Conflict not found, looking for alternative...");
}
