const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const searchStr = "function integrateRegion(xs, ys, a, b, mode){";
const helperCode = `
function integrateBlocks(xs, ys, blocks, mode){
  if (!blocks || !blocks.length) return {area: 0, base: () => 0, h: -Infinity, apex: 0, apexY: 0, xs: [], ys: []};
  const a = blocks[0].a, b = blocks[blocks.length - 1].b, ia = Math.max(0, lowerBound(xs, a)), ib = Math.min(xs.length - 1, lowerBound(xs, b));
  const rng = (arrMax(ys) - arrMin(ys)) || 1, tol = rng*0.003, w = Math.max(1, Math.round(xs.length*0.002));
  const walk = (i, d) => { let j = i; for (let k = 0; k < xs.length; k++) { const n = j + d*w; if (n < 0 || n >= xs.length || ys[n] > ys[j] + tol) break; j = n; } return j; };
  const il = walk(ia, -1), ir = walk(ib, 1), base = mode === 'zero' ? () => 0 : x => ys[il] + (ys[ir] - ys[il])*(x - xs[il])/((xs[ir] - xs[il]) || 1);
  let area = 0, apex = ia, h = -Infinity;
  blocks.forEach(k => { const q = clipXY(xs, ys, k.a, k.b); for (let i = 0; i < q.xs.length - 1; i++) area += ((q.ys[i] - base(q.xs[i])) + (q.ys[i+1] - base(q.xs[i+1])))/2*(q.xs[i+1] - q.xs[i]); });
  for (let i = ia; i <= ib; i++) { const d = ys[i] - base(xs[i]); if (d > h) { h = d; apex = i; } }
  return {area, base, h, apex: xs[apex], apexY: ys[apex]};
}
`;
html = html.replace(searchStr, helperCode + searchStr);

const oldIntegrateRegion = `function integrateRegion(xs, ys, a, b, mode){
  if (b < a) [a, b] = [b, a];
  ({xs, ys} = clipXY(xs, ys, a, b)); const i0 = 0, i1 = xs.length - 1;
  if (i1 < 1) return null;
  const xa = xs[i0], xb = xs[i1], ya = ys[i0], yb = ys[i1];
  const base = mode === 'zero' ? () => 0 : x => ya + (yb - ya)*(x - xa)/((xb - xa) || 1);
  let area = 0, apex = i0, h = -Infinity;
  for (let i=i0;i<i1;i++) area += ((ys[i] - base(xs[i])) + (ys[i+1] - base(xs[i+1])))/2*(xs[i+1] - xs[i]);
  for (let i=i0;i<=i1;i++){ const d = ys[i] - base(xs[i]); if (d > h) { h = d; apex = i; } }
  return {a: xa, b: xb, i0, i1, xs, ys, base, area, apex: xs[apex], apexY: ys[apex], height: h};
}`;

const newIntegrateRegion = `function integrateRegion(xs, ys, a, b, mode){
  if (b < a) [a, b] = [b, a];
  const q = clipXY(xs, ys, a, b); if (q.xs.length < 2) return null;
  const res = integrateBlocks(xs, ys, [{a, b}], mode);
  return {a: q.xs[0], b: q.xs[q.xs.length - 1], i0: 0, i1: q.xs.length - 1, xs: q.xs, ys: q.ys, base: res.base, area: res.area, apex: res.apex, apexY: res.apexY, height: res.h};
}`;
html = html.replace(oldIntegrateRegion, newIntegrateRegion);

const oldPoolRows = `  /* baseline: zero, or a line between the lowest points just outside the pool, walking out while the trace keeps falling */
  const rng = (arrMax(ys) - arrMin(ys)) || 1, tol = rng*0.003, w = Math.max(1, Math.round(xs.length*0.002));
  const walk = (i, d) => { let j = i; for (let k = 0; k < xs.length; k++) { const n = j + d*w; if (n < 0 || n >= xs.length || ys[n] > ys[j] + tol) break; j = n; } return j; };
  const il = walk(ia, -1), ir = walk(ib, 1), base = opt.intBase === 'zero' ? () => 0 : x => ys[il] + (ys[ir] - ys[il])*(x - xs[il])/((xs[ir] - xs[il]) || 1);
  let area = 0; B.forEach(k => { const q = clipXY(xs, ys, k.a, k.b); for (let i = 0; i < q.xs.length - 1; i++) area += (Math.max(0, q.ys[i] - base(q.xs[i])) + Math.max(0, q.ys[i+1] - base(q.xs[i+1])))/2*(q.xs[i+1] - q.xs[i]); });`;

const newPoolRows = `  /* baseline: zero, or a line between the lowest points just outside the pool, walking out while the trace keeps falling */
  const res = integrateBlocks(xs, ys, B, opt.intBase);
  let area = res.area;`;
html = html.replace(oldPoolRows, newPoolRows);

const search3 = `const pr = pool ? \`<tr class="pool" title="UV area across the pooled fractions, same baseline as the regions">`;
const replace3 = `const pr = pool ? \`<tr class="pool" title="UV area across the pooled fractions, baseline walks outward to lowest points">`;
if (html.includes(search3)) html = html.replace(search3, replace3);

const search4 = `<th>Area (mAU·\${u})</th>`;
const replace4 = `<th title="Baseline walks outward from edges">Area (mAU·\${u})</th>`;
if (html.includes(search4)) html = html.replace(search4, replace4);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
