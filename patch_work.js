const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

html = html.replace(
  "if (fit.useKav && ve <= fit.v0*1.02) { out.void = true; out.v0est = !!(fit.cal && fit.cal.v0est); return out; }\n  if (fit.mw) { out.mw = fit.mw(ve); const x = fit.X(ve), pad = 0.08*(fit.xhi - fit.xlo); out.extrap = x < fit.xlo - pad || x > fit.xhi + pad;",
  "if (fit.useKav && ve <= fit.v0*1.02) { out.void = true; out.v0est = !!(fit.cal && fit.cal.v0est); return out; }\n  if (fit.mw) { out.mw = fit.mw(ve); const x = fit.X(ve); out.extrap = x < fit.xlo || x > fit.xhi;"
);
html = html.replace(
  "const samples = []; runs.filter(r => isSec(r) && !r.isStd && secCalFor(r) === cal).forEach(r => integRows(r).forEach(rw => { const si = rw.sec; if (si && si.mw != null && !si.void) samples.push({x: fit.X(rw.apex), mw: si.mw, name: rw.name, run: r.name}); }));",
  "const samples = []; runs.filter(r => isSec(r) && !r.isStd && secCalFor(r) === cal).forEach(r => integRows(r).forEach(rw => { const si = rw.sec; if (si && si.mw != null && !si.void) samples.push({x: fit.X(rw.apex), mw: si.mw, extrap: si.extrap, name: rw.name, run: r.name}); }));"
);
html = html.replace(
  "if (samples.length <= 6) { const left = px(q.x) > L + (R - L)*0.3; s.push(`<text x=\"${r2(px(q.x) + (left ? -1 : 1)*fs*0.5)}\" y=\"${r2(py(q.mw) + fs*1.0)}\"${left ? ' text-anchor=\"end\"' : ''} fill=\"${RUN_COLORS.uv}\">${esc(q.name)} ${fmtAuto(q.mw)} kDa</text>`); } });",
  "if (samples.length <= 6) { const left = px(q.x) > L + (R - L)*0.3; s.push(`<text x=\"${r2(px(q.x) + (left ? -1 : 1)*fs*0.5)}\" y=\"${r2(py(q.mw) + fs*1.0)}\"${left ? ' text-anchor=\"end\"' : ''} fill=\"${RUN_COLORS.uv}\">${esc(q.name)} ${q.extrap ? '~' : ''}${fmtAuto(q.mw)} kDa</text>`); } });"
);
html = html.replace(
  "let secMw = null; if (isSec(r)) { const fit = secFit(secCalFor(r)); if (fit && fit.mw) { const bl = poolBlocks(r), rows = integRows(r).filter(w => bl.some(b => w.apex >= b.a && w.apex <= b.b) && w.sec && w.sec.mw); const top = rows.sort((u, v) => v.area - u.area)[0]; if (top) secMw = {mw: top.sec.mw, ve: top.apex}; } }",
  "let secMw = null; if (isSec(r)) { const fit = secFit(secCalFor(r)); if (fit && fit.mw) { const bl = poolBlocks(r), rows = integRows(r).filter(w => bl.some(b => w.apex >= b.a && w.apex <= b.b) && w.sec && w.sec.mw); const top = rows.sort((u, v) => v.area - u.area)[0]; if (top) secMw = {mw: top.sec.mw, extrap: top.sec.extrap, ve: top.apex}; } }"
);
html = html.replace(
  "if (x.secMw) { const mono = secMono(); notes.push(`${nm}: main pooled peak at ${fmt(x.secMw.ve, 2)} ${xUnit(x.r)}, apparent ${kdaRound(x.secMw.mw)} kDa${mono > 0 ? ` (${fmt(x.secMw.mw/mono, 1)}× the ${kdaRound(mono)} kDa monomer)` : ''}. Apparent size from SEC depends on shape; confirm the oligomer state by SEC-MALS or AUC.`); }",
  "if (x.secMw) { const mono = secMono(); notes.push(`${nm}: main pooled peak at ${fmt(x.secMw.ve, 2)} ${xUnit(x.r)}, apparent ${x.secMw.extrap ? '~' : ''}${kdaRound(x.secMw.mw)} kDa${mono > 0 ? ` (${fmt(x.secMw.mw/mono, 1)}× the ${kdaRound(mono)} kDa monomer)` : ''}. Apparent size from SEC depends on shape; confirm the oligomer state by SEC-MALS or AUC.`); }"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);


let htmlTests = fs.readFileSync('tests/suites/26_sec_calibration.js', 'utf8');

const tCode = `
  await T.t('Extrapolates 12 mL beyond 100 kDa 14 mL standard', async () => {
    // Pure logic test over window variables instead of fighting Playwright and UI timing.
    await p.evaluate(() => {
        const setVal = (sel, val) => {
            const el = document.querySelector(sel);
            if (el) {
                let d = el.closest('details');
                while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
                el.value = String(val);
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
            }
        };

        // Mock a run context.
        window.__set('runs', [{
            id: 'run1', name: 'Sample', type: 'UV', inWf: true, color: '#000',
            xs: [0, 11, 12, 13], ys: [0, 0, 100, 0], fracs: [],
            integ: [{a: 11, b: 13, name: 'Peak 1', apex: 12.0, area: 100, gauss: false, base: false, baseOff: 0, sec: {ve: 12.0, mw: 316.23, extrap: true}}],
            pool: [{a: 11.5, b: 12.5, label: 'P1'}]
        }]);
        window.__set('secStds', [
            {ve: 14, mw: 100},
            {ve: 18, mw: 10}
        ]);
        window.__set('secCal', { v0: 8.0, vt: 24.0, v0est: false });
        window.__set('opt', { secMono: 0 });
        if (typeof render === 'function') render();
    });

    await h.wait(500);

    const hasExtrap = await p.evaluate(() => {
        const r = typeof runs !== 'undefined' ? runs[0] : null;
        const cal = typeof secCalFor === 'function' && r ? secCalFor(r) : (typeof secCal !== 'undefined' ? secCal : null);
        const fit = typeof secFit === 'function' ? secFit(cal) : null;
        if (!fit || !fit.mw) return 'No fit';
        const info = typeof secInfo === 'function' ? secInfo(fit, 12.0) : null;
        if (!info) return 'No info';
        return info.extrap === true && Math.abs(info.mw - 316.23) < 1.0;
    });

    T.check('sec_info_extrapolates', hasExtrap === true, 'secInfo should return extrap=true and mw~316. Got: ' + hasExtrap);

  });
`;

htmlTests = htmlTests.replace("  T.check('no page errors', !errs.length, errs.join(' | '));", tCode + "\n  T.check('no page errors', !errs.length, errs.join(' | '));");
fs.writeFileSync('tests/suites/26_sec_calibration.js', htmlTests);
