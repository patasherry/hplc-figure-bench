// Synthetic UNICORN-style CSV for #770: a peak at 9.5 mL on a falling baseline, then a dip below the baseline at 11.3 mL,
// all inside the fractions F3-F6 (8 to 12 mL). A region over 8 to 12 mL and the pool F3-F6 must give the same area.
// 0.05 mL steps from 0 to 20 mL, no noise. Used by tests/suites/770_pool_area.js, which builds the CSV in memory.
// Run directly to print it: node tests/data/gen_pool_dip.js > pool_dip.csv
const g = (x, c, s, h) => h*Math.exp(-0.5*((x - c)/s)**2);
const XS = Array.from({length: 401}, (_, i) => +(i*0.05).toFixed(4));
/* values as written to the file (3 decimals), so the expected area is computed from exactly what the app reads */
const YS = XS.map(x => +(20 - 0.5*x + g(x, 9.5, 0.4, 500) + g(x, 11.3, 0.15, -30)).toFixed(3));
const FRACS = [[6, 'F1'], [7, 'F2'], [8, 'F3'], [9, 'F4'], [10, 'F5'], [11, 'F6'], [12, 'F7'], [13, 'F8'], [14, 'Waste']];
const POOL = 'F3-F6', A = 8, B = 12;
function poolDipCsv(){
  const rows = ['Chrom.1,,Chrom.1,', 'UV,,Fraction,', 'ml,mAU,ml,Fraction'];
  XS.forEach((x, i) => { const f = FRACS[i]; rows.push(`${x.toFixed(4)},${YS[i].toFixed(3)},${f ? f[0].toFixed(4) + ',' + f[1] : ','}`); });
  return rows.join('\r\n') + '\r\n';
}
/* closed-form trapezoid over the samples from a to b, above the straight line between the trace at a and at b, nothing clamped */
function trapArea(a = A, b = B){
  const i0 = XS.findIndex(x => Math.abs(x - a) < 1e-9), i1 = XS.findIndex(x => Math.abs(x - b) < 1e-9), base = x => YS[i0] + (YS[i1] - YS[i0])*(x - a)/(b - a);
  let s = 0; for (let i = i0; i < i1; i++) s += ((YS[i] - base(XS[i])) + (YS[i+1] - base(XS[i+1])))/2*(XS[i+1] - XS[i]); return s;
}
module.exports = {poolDipCsv, trapArea, POOL, A, B};
if (require.main === module) process.stdout.write(poolDipCsv());
