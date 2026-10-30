const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');
const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// Col 1 yld is 16%. Concentrated yld is 11%.
// Why?
// Col 1 ND file `umol_10mg.tsv` has mean 1.5. ndVol is 1. `nd.mg = 1.5`. `1.5 / 20 = 7.5%`? NO!
// If `umol` basis is used: manual start = 20 mg.
// Col 1 = 1.5 mg? But wait, I set `ndVol` to `6.666667` earlier. Did I revert it?
// Ah! In my new `p5_umol` I am setting `ndVol` to `1`!
// Wait! `await p.evaluate(({el}) => { el.value = '1'; ... }, {el: await pvInput.elementHandle()});`
// If `ndVol` is 1, and `nd.mgml` is 1.5, `nd.mg` is 1.5!
// Wait! `F.imac` (`imac_histrap_1ml_step.csv`) has UV area. If basis is `mg`, `p.mg = area / eps`.
// If `p.mg` is used, and it's 3.2 mg... `3.2 / 20 = 16%`!!
// THIS PROVES BASIS IS `mg`, NOT `umol`!
// WHY is basis `mg`?
// Because `out.every(x => x.nd && x.nd.umol != null)` is FALSE!
// Why is it FALSE?
// Because `Col 2` DOES NOT HAVE `nd`!
// Why does Col 2 not have `nd`?
// My code: `await p.setInputFiles('#ndFile', path.join(DATA, 'nd', 'synthetic_4mg.csv'));`
// But in UI, `#ndFile` might not work if it's the SAME FILE string? No, `synthetic_4mg.csv` is different!
// Wait! `h.addRun` is used for Col 2:
// `await h.addRun(path.join(DATA, 'chrom', 'hplc_export.csv'));`
// Then I set shade to `11.5-12.0`.
// Then I upload ND file!
// BUT if the ND file is NOT correctly formatted, it won't be parsed!
// I created `synthetic_4mg.csv` using:
// `Sample ID,User name,Date,Time,mg/ml,A280 10 mm,A260 10 mm,260/280\nPool,user,1/1/22,1:00,4.0,4.0,2,2`
// This is NOT the right ND-2000 TSV format! It's comma separated, but ND-2000 is TAB separated!
// If it fails to parse, `x.nd` is null!
// AND `synthetic_10mg.csv` was ALSO comma separated!
// So NONE of the ND files parsed!
// This means BOTH runs fell back to `mg`!
// Ahhhhhhhh!!

// Let's just create proper `.tsv` files!
let code = `
const fs = require('fs');
fs.writeFileSync('tests/data/nd/synthetic_10mg.tsv', 'Sample ID\\tUser name\\tDate\\tTime\\tmg/ml\\tA280 10 mm\\tA260 10 mm\\t260/280\\nPool\\tuser\\t1/1/22\\t1:00\\t10.0\\t10.0\\t5\\t2');
fs.writeFileSync('tests/data/nd/synthetic_5mg.tsv', 'Sample ID\\tUser name\\tDate\\tTime\\tmg/ml\\tA280 10 mm\\tA260 10 mm\\t260/280\\nConcentrated\\tuser\\t1/1/22\\t1:00\\t5.0\\t5.0\\t2.5\\t2');
fs.writeFileSync('tests/data/nd/synthetic_4mg.tsv', 'Sample ID\\tUser name\\tDate\\tTime\\tmg/ml\\tA280 10 mm\\tA260 10 mm\\t260/280\\nPool\\tuser\\t1/1/22\\t1:00\\t4.0\\t4.0\\t2\\t2');
`;
fs.writeFileSync('create_synthetic_nd.js', code);

// Now change `20_science.js` to use `.tsv`
let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);
p5Umol = p5Umol.replace(/synthetic_10mg\.csv/g, 'synthetic_10mg.tsv');
p5Umol = p5Umol.replace(/synthetic_5mg\.csv/g, 'synthetic_5mg.tsv');
p5Umol = p5Umol.replace(/synthetic_4mg\.csv/g, 'synthetic_4mg.tsv');
tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
