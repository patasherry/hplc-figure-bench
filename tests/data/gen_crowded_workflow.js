// Synthetic run exports for an eight-step workflow whose every step has twelve overlapping peaks (#769).
// Peaks 0.1 min apart, sd 0.03 min, heights 100 to 78 mAU, on a 1 mAU baseline with seeded ±0.3 mAU noise; 0.001 min steps from 0 to 10 min.
// Run k shifts the peaks by 0.01*k min and reseeds the noise, so no two files are the same run. Used by tests/suites/769_workflow_refit.js,
// which builds the CSVs in memory. Run directly to print run k: node tests/data/gen_crowded_workflow.js 0 > crowded_step1.csv
function crowdedRunCsv(k){
  let s = 12345 + k*7919; const rnd = () => (s = (s*1103515245 + 12345) % 2147483648)/2147483648;
  const P = Array.from({length: 12}, (_, j) => ({c: 4.2 + 0.1*j + 0.01*k, h: 100 - 2*j, sd: 0.03}));
  /* a UNICORN-style export (Chrom.1 / UV / ml, mAU), so the app reads it as a purification run. Until 2026-11-13 the header was
     'Time (min),UV 280 (mAU)', which the app reads as a plain overlay trace by design: the suite then had 0 runs and its setup
     checks failed on main from the day it was added (#1415). The numbers are unchanged; the axis is called ml. */
  const rows = ['Chrom.1,', 'UV,', 'ml,mAU'];
  for (let i = 0; i <= 10000; i++) { const t = i/1000; let y = 1 + (rnd() - 0.5)*0.6; for (const q of P) y += q.h*Math.exp(-0.5*((t - q.c)/q.sd)**2); rows.push(`${t.toFixed(3)},${y.toFixed(3)}`); }
  return rows.join('\n') + '\n';
}
module.exports = {crowdedRunCsv};
if (require.main === module) process.stdout.write(crowdedRunCsv(+(process.argv[2] || 0)));
