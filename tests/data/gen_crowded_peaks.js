// Synthetic HPLC export with eight sharp peaks of nearly the same height (100 to 93 mAU), 0.1 min apart (4.65 to 5.35 min),
// so at the default figure size their labels cannot all fit above them (#230).
// No noise, 0.01 min steps from 0 to 10 min. Used by tests/suites/42_figures.js, which builds the CSV in memory.
// Run directly to print it: node tests/data/gen_crowded_peaks.js > crowded_peaks.csv
const PEAKS = [0, 1, 2, 3, 4, 5, 6, 7].map(j => ({c: 4.65 + 0.1*j, h: 100 - j, sd: 0.02}));
const LABELS = PEAKS.map(p => p.c.toFixed(2));
function crowdedCsv(){
  const rows = ['Time (min),UV 280 (mAU)'];
  for (let i = 0; i <= 1000; i++) { const t = i/100; let y = 1; for (const p of PEAKS) y += p.h*Math.exp(-0.5*((t - p.c)/p.sd)**2); rows.push(`${t.toFixed(2)},${y.toFixed(3)}`); }
  return rows.join('\n') + '\n';
}
module.exports = {crowdedCsv, LABELS};
if (require.main === module) process.stdout.write(crowdedCsv());
