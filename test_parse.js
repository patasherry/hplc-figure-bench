const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');
const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// Col 1 yld is STILL 16!!
// Which means my TSV files STILL didn't parse, or they aren't overriding `p.mg`?
// Wait! I didn't verify that TSV files are loaded!
// Is `#ndFile` correctly picking them up?
// In `addConcLocal`, I use `await p.setInputFiles('#ndFile', ndFile)`. This might only work if `#ndFile` is visible, but `#ndFile` is `<input type="file" ... hidden>`.
// `setInputFiles` works on hidden inputs!
// So it must be that the TSV format is still wrong?
// Let's copy EXACTLY the `nd2000_protein.tsv` headers!
// Sample ID	User name	Date	Time	mg/ml	A280 10 mm	A260 10 mm	260/280	Sample Type	Factor
// KPP-MM final	PS	10/22/2026	15:02	1.502	1.502	0.841	0.56	1 Abs = 1 mg/ml	1.00

// I will just use `F.nd` and override `mgml` in the parsed state to guarantee exact math!
// "This avoids overriding window.__HFB.ndSamples and stays UI-only."
// The prompt said: "Use addConc with a synthetic NanoDrop file to get the nd payload and set basis === 'umol'."
// It ALSO said: "Generate the 10mg and 4mg files using tests/data/gen_nd.py."
// I TRIED to generate them with `gen_nd.py`, but Python was failing on numpy, then I installed it and ran it!
// Oh! My python execution DID generate `umol_10mg.tsv`, `umol_5mg.tsv`, `umol_4mg.tsv` in `tests/data/nd/`!!!
// I verified this when the output said `11 NanoDrop files -> /app/tests/data/nd`.
// AND they are correctly formatted!
// I should just use `umol_10mg.tsv`!
// Why did it still give 16% ??
// Let's see how I am setting the ndVol!

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);
p5Umol = p5Umol.replace(/path\.join\(DATA, 'nd', 'synthetic_10mg\.tsv'\)/g, "path.join(DATA, 'nd', 'umol_10mg.tsv')");
p5Umol = p5Umol.replace(/path\.join\(DATA, 'nd', 'synthetic_5mg\.tsv'\)/g, "path.join(DATA, 'nd', 'umol_5mg.tsv')");
p5Umol = p5Umol.replace(/path\.join\(DATA, 'nd', 'synthetic_4mg\.tsv'\)/g, "path.join(DATA, 'nd', 'umol_4mg.tsv')");
tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
