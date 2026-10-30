const fs = require('fs');
let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');
const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// I'm failing because `ndEpsFor` is returning null!
// When I overwrite PROJ.prep.eps, `ndEpsFor` doesn't use it!
// `ndEpsFor` uses `numOr(opt.eps, 0) > 0 ? ... : null`.
// And I must inject `opt.eps = 1` and `opt.protKda = 50`!
// BUT I also need to ensure `x.nd.umol` is NOT NULL!
// `umol` is calculated by `ndForRun`.
// If I inject `opt.eps = 1`, then `E.kda` is 50.
// Let's force `ndEpsFor` by injecting `window.__HFB.ndEpsFor = () => ({e: 1, kda: 50, src: 'set'})`!
// No, I can just inject into PROJ:
// `window.__HFB.PROJ.opt.eps = 1; window.__HFB.PROJ.opt.protKda = 50;`
// I did this at the beginning but `h.newProject` or `cleanProject` CLEARED it!
// Ah! `cleanProject` resets `opt` if it's not provided!
// `window.__HFB.cleanProject(window.__HFB.PROJ = {id: 'Umol manual', title: 'Umol manual', runs: [], opt: {eps: 1, protKda: 50}, prep: {on: true, eps: {kda: 50, extc: 50000, mw: 50000, form: 'untagged'}}, gels: []});`

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);
p5Umol = p5Umol.replace(/window\.__HFB\.cleanProject\(window\.__HFB\.PROJ = \{id: 'Umol manual', title: 'Umol manual', runs: \[\], prep: \{on: true\}, gels: \[\]\}\);/g,
`window.__HFB.cleanProject(window.__HFB.PROJ = {id: 'Umol manual', title: 'Umol manual', runs: [], opt: {eps: 1, protKda: 50}, prep: {on: true, eps: {kda: 50, extc: 50000, mw: 50000, form: 'untagged'}}, gels: []});`);

// I also need to make sure the RUN uses the correct area to not mess up fallback mg calculation.
// BUT with `.umol` set, it should NOT fallback!

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
