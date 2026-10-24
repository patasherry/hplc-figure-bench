const {open, H, suite, path, fs, DATA, num} = require('../lib/harness');
const EXP = JSON.parse(fs.readFileSync(path.join(DATA, 'expected.json'), 'utf8')), CH = path.join(DATA, 'chrom'), ND = path.join(DATA, 'nd');
const T = suite('16_nanodrop');
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, String(v)]);

async function ndFile(e, withEps){ const id = e.file.replace(/\.[^.]+$/, '') + (withEps ? '+eps' : ''), vol = 0.5;
  const {p, errs, close} = await open({cloud: true}), h = H(p);
  try {
    await h.newProject('nd_' + id); await h.addRun(path.join(CH, 'imac_HisTrap_FF_1mL_step_u7.csv')); await h.pool('T1-T3');
    if (withEps) await setOpt(p, 'o-eps', e.eps);
    await h.addConc(path.join(ND, e.file), vol); await p.waitForTimeout(600);

    const sheet = (await p.evaluate(() => { const ss = document.getElementById('stepSheet'), pn = document.getElementById('panel') || document.body, all = pn.innerText, head = (ss ? ss.innerText : '').trim().slice(0, 40), i = head ? all.indexOf(head) : -1; return i >= 0 ? all.slice(i) : all; })).replace(/\s+/g, ' '), tl = await h.timeline(), conc = tl.find(x => /concentrat/i.test(x.t || ''));
    const want = withEps ? e.mean_eps : e.mean_abs1;
    if (e.n === 0) {
      T.check(`${id}/no-protein-mean`, !/\d\s*mg\/mL/.test(conc ? conc.s || '' : '') && !/mean of \d+ reading/i.test(sheet), `timeline "${conc && conc.s}", sheet ${sheet.slice(0, 200)}`);
      for (const r280 of e.r280 || []) { T.check(`${id}/r280:${r280}`, sheet.includes(String(r280)), `ratio ${r280} not found`); }
      for (const r260230 of e.r260230 || []) { if(r260230 !== null) T.check(`${id}/r260230:${r260230}`, sheet.includes(String(r260230)), `ratio ${r260230} not found`); }

      const docsStr = await p.evaluate(async () => await window.__listDocs('users/u_test/p'));
      if (docsStr) {
          const docs = JSON.parse(docsStr);
          const pd = docs.find(d => d.id === 'nd_' + id);
          if (pd && pd.d) {
             for (const c of e.concs || []) {
                T.check(`${id}/json-conc:${c}`, pd.d.nanodrop.some(n => (n.conc && Math.abs(n.conc - c) < 0.01) || (n.a280 && Math.abs(n.a280 - c) < 0.01)), `conc ${c} not found in json`);
             }
          }
      } else {
          T.check(`${id}/json-present`, false, 'Project JSON could not be retrieved.');
      }
      return;
    }

    const m = sheet.match(/(\d+(?:\.\d+)?)\s*(?:±\s*(\d+(?:\.\d+)?)\s*)?mg\/mL/), nm = sheet.match(/mean of (\d+) readings?/i);
    T.check(`${id}/mean`, m && Math.abs(+m[1] - want) <= 0.006 + want*0.002, `expected ${want} mg/mL, sheet: ${m ? m[0] : sheet.slice(0, 200)}`);
    if (e.n > 1) T.check(`${id}/n`, nm && +nm[1] === e.n, `expected ${e.n}, sheet: ${nm ? nm[0] : 'no "mean of N readings"'}`);
    if (e.sd_abs1 != null && !withEps) T.check(`${id}/sd`, m && m[2] != null && Math.abs(+m[2] - e.sd_abs1) <= 0.006, `expected ±${e.sd_abs1}, sheet: ${m ? m[0] : ''}`);

    for (const n of [...new Set(e.names)]) T.check(`${id}/name:${n}`, sheet.includes(n), sheet.slice(0, 300));

    const _num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
    T.check(`${id}/timeline-mg`, conc && Math.abs(_num((conc.s || '').split(',').find(s => /mg$/.test(s.trim())) || '') - want*vol) <= 0.011, `expected ${(want*vol).toFixed(3)} mg, timeline "${conc && conc.s}"`);

    if (e.warn_high_ratio) T.check(`${id}/flags-260-280`, /1\.25/.test(sheet) && (/nucleic|contamin|high/i.test(sheet) || await p.locator('#panel .hi, #panel .warn, #panel [class*=warn]').count() > 0), sheet.slice(0, 300));

    for (const r280 of e.r280 || []) {
      T.check(`${id}/r280:${r280}`, sheet.includes(String(r280)), `ratio ${r280} not found in sheet: ${sheet.slice(0, 300)}`);
    }

    for (const c of e.concs || []) {
      const expectedConc = withEps ? (c / e.eps) : c;
      const expectedStr = expectedConc.toFixed(3);
      T.check(`${id}/conc:${c}`, sheet.includes(expectedStr) || sheet.includes(c.toFixed(2)) || sheet.includes(c.toFixed(1)) || sheet.includes(Math.round(expectedConc).toString()), `conc ${expectedStr} not found in sheet: ${sheet.slice(0, 300)}`);
    }
    for (const r260230 of e.r260230 || []) {
        if(r260230 !== null) T.check(`${id}/r260230:${r260230}`, sheet.includes(String(r260230)), `ratio ${r260230} not found in sheet`);
    }

    const docsStr = await p.evaluate(async () => await window.__listDocs('users/u_test/p'));
    if (docsStr) {
        const docs = JSON.parse(docsStr);
        const pd_entry = docs.find(d => d.id === 'nd_' + id);
        if (pd_entry && pd_entry.d) {
            const pd = pd_entry.d;
            for (let i = 0; i < (e.r280 || []).length; i++) {
                const r280 = e.r280[i];
                T.check(`${id}/json-r280:${r280}`, pd.nanodrop.some(n => n.r280 && Math.abs(n.r280 - r280) < 0.001), `ratio ${r280} not found in json`);
            }
            for (let i = 0; i < (e.r260230 || []).length; i++) {
                const r260230 = e.r260230[i];
                if(r260230 !== null) T.check(`${id}/json-r260230:${r260230}`, pd.nanodrop.some(n => n.r260230 && Math.abs(n.r260230 - r260230) < 0.001), `ratio ${r260230} not found in json`);
            }
            for (let i = 0; i < (e.concs || []).length; i++) {
                const c = e.concs[i];
                const expectedConc = withEps ? (c / e.eps) : c;
                T.check(`${id}/json-conc:${c}`, pd.nanodrop.some(n => (n.conc && Math.abs(n.conc - expectedConc) < 0.01) || (n.a280 && Math.abs(n.a280 - c) < 0.01)), `conc ${expectedConc} not found in json`);
            }
        }
    } else {
        T.check(`${id}/json-present`, false, 'Project JSON could not be retrieved from listDocs.');
    }

  } finally { T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | ')); await close(); }
}

(async () => {
  for (const e of EXP.nd) { if (only && !only.test(e.file)) continue; await T.t(e.file, () => ndFile(e, false)); if (e.n > 0) await T.t(e.file + '+eps', () => ndFile(e, true)); }
  T.done();
})();
