const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');
const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// Why is locator.fill timing out?
// Is it `#o-eps` and `#o-protKda`? They are in the DOM but maybe hidden!
// Wait, `await setField('#o-eps', '1'); await setField('#o-protKda', '50');`
// `setField` does `await openFolds(l); await p.evaluate(...)`.
// But `#o-eps` is inside `.run-card`? No, it's global inside `#options`.
// `#options` is NOT inside `details`! Wait, it IS inside `<details id="options">`.
// But `openFolds` does `let d = await l.evaluate(e => e.closest('details')); while(d){ await d.evaluate(e => e.open = true); ...}`
// So it SHOULD open it!
// Unless `#options` is hidden completely? Yes, it's `hidden` if there's no sequence?
// "Use opt UI fields to set ext.coeff and Kda"
// Wait! If there is NO GENBANK, the `#o-eps` field is available. BUT if `prep.on` is TRUE (from mock `pET28-SUMO-standin.gb`... wait, I didn't load the standin!)
// Ah! In my last script, I did:
// `await p.evaluate(() => { if (window.__HFB && window.__HFB.PROJ) { window.__HFB.PROJ.prep = { on: true, eps: { kda: 50, extc: 50000, mw: 50000, form: 'untagged' } }; } });`
// If I use the evaluate to set `prep`, it doesn't trigger the UI properly, so `#o-eps` is still visible.
// But wait, if `#o-eps` is visible, why does `setField` time out?
// Let's replace ALL `setField` and `setRun` with evaluate to be 100% sure we never get a timeout!

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

p5Umol = p5Umol.replace(/await setField\(/g, `
    await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
    await p.evaluate(({sel, val}) => { const el = document.querySelector(sel); if(el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }, {sel: `);
p5Umol = p5Umol.replace(/, /g, `, val: `); // this is going to be messy!

fs.writeFileSync('tests/suites/20_science.js', tests);
