// Tests for UNICORN 7 result archives (.zip)
const {open, H, suite, src, path, DATA} = require('../lib/harness');
const fs = require('fs');

/* Loading gaps (#283), built from synthetic data so the failure is exact:
   1. a UNICORN 7 result whose chromatogram lists a curve the archive has no points for. valid_unicorn.zip with one points file
      renamed (same length, so the zip stays valid): Chrom.1_1_True is the UV curve "UV", Chrom.1_2_True is "Conductivity".
   2. a UNICORN CSV exported without the UV curve (conductivity, %B and fractions only), written like gen_chrom.write_unicorn_csv. */
const lose = (entry, name) => { const b = Buffer.from(fs.readFileSync(path.join(DATA, 'chrom', 'valid_unicorn.zip'))), from = Buffer.from(entry), to = Buffer.from(entry.replace(/True$/, 'Lost'));
  let i = 0, n = 0; while ((i = b.indexOf(from, i)) >= 0) { to.copy(b, i); i += to.length; n++; }
  if (!n) throw new Error(`${entry} is not in valid_unicorn.zip`); return {name, mimeType: 'application/zip', buffer: b}; };
const noUvCsv = () => { const fr = [[1, 'Waste'], [6, '1.A.1'], [7, '1.A.2'], [8, '1.A.3'], [9, '1.A.4'], [10, '1.A.5'], [11, 'Waste']];
  const rows = [['Chrom.1', '', 'Chrom.1', '', 'Chrom.1', ''], ['Cond', '', 'Conc B', '', 'Fraction', ''], ['ml', 'mS/cm', 'ml', '%', 'ml', '']];
  for (let i = 0; i <= 60; i++) { const x = i*0.5; rows.push([x.toFixed(4), (x >= 15 ? 45 : 12).toFixed(3), x.toFixed(4), (x >= 15 ? 100 : 0).toFixed(3), fr[i] ? fr[i][0].toFixed(4) : '', fr[i] ? fr[i][1] : '']); }
  return {name: 'no_uv_u7.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.map(r => r.join(',')).join('\r\n') + '\r\n')}; };

const card = p => p.locator('.trace.run.sel').first();
const field = async (p, k) => { const el = card(p).locator(`[data-k=${k}]`).first(); if (!(await el.count())) return ''; const v = await el.inputValue().catch(() => ''); return v || (await el.getAttribute('placeholder')) || ''; };
const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
const setRun = async (p, k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(v)); await l.dispatchEvent('change'); await p.waitForTimeout(400); };
const detect = async p => { await p.evaluate(() => { const b = document.getElementById('intAuto'); if (b) b.click(); }); await p.waitForTimeout(900); };

async function peaks(p, h){ const t = await h.peakTable(); if (!t.length) return {head: [], rows: []}; const head = t[0];
  const iv = head.findIndex(c => /^(Ve|Center|Apex|Elution time)\b/.test(c)), ia = head.findIndex(c => /^Area/.test(c)), im = head.findIndex(c => /^Protein/.test(c)), ip = head.findIndex(c => /% of regions/.test(c));
  const rows = t.slice(1).filter(r => r.length > 3).map(r => ({name: r[0], a: num(r[1]), b: num(r[2]), ve: iv >= 0 ? num(r[iv]) : NaN, area: ia >= 0 ? num(r[ia]) : NaN, mg: im >= 0 ? num(r[im]) : NaN, pct: ip >= 0 ? num(r[ip]) : NaN}));
  return {head, unit: (head[iv] || '').match(/\((\w+)\)/) ? (head[iv].match(/\((\w+)\)/)[1]) : '', rows}; }

(async () => {
  const T = suite('11_unicorn_zip');
  const {p, errs, close} = await open();
  const h = H(p);

  await T.t('valid archive', async () => {
    await h.newProject('Unicorn 7 valid');
    await h.addRun(path.join(DATA, 'chrom', 'valid_unicorn.zip'));

    // The name comes from the file name, without extension
    const tl = await h.timeline();
    T.check('valid loads', tl.some(x => /valid unicorn/i.test(x.t)));

    const texts = await h.svgTexts();
    const textsArr = texts.map(x => x.t);

    const a1Text = texts.find(x => x.t === 'A1');
    T.check('fraction label A1 visible', !!a1Text);

    T.check('flow rate visible', textsArr.includes('0.50 mL/min'));

    await detect(p);
    const P = await peaks(p, h);

    const pk = P.rows.filter(r => !/Pool/i.test(r.name));
    T.check('peaks detected', pk.length >= 2, `found ${pk.length} peaks`);
    if (pk.length >= 2) {
      T.check('peak 1 x value', Math.abs(pk[0].ve - 13.0) < 0.2, `expected ~13.0, got ${pk[0].ve}`);
      T.check('peak 2 x value', Math.abs(pk[1].ve - 17.0) < 0.2, `expected ~17.0, got ${pk[1].ve}`);
      T.check('peak 2 has larger area than peak 1', pk[1].area > pk[0].area);
    }

    const flow = num(await field(p, 'mFlow'));
    T.check('flow input', flow === 0.5, `expected 0.5, got ${flow}`);

    const toasts = await h.toasts();
    T.check('no error toast', !toasts.some(t => /error|failed/i.test(t)), toasts.join(', '));

    // Test for injection mark spatial positioning in the SVG:
    // The injection label 'Inj' is drawn if there is an injection event.
    // And its x position should be less than the A1 fraction.
    const injText = texts.find(x => x.t === 'Inj' || x.t === '1' || x.t === 'Injection' || x.t === '1.0');
    if (a1Text) {
       T.check('A1 has coordinates', a1Text.x > 0 && a1Text.y > 0);
       if (injText) {
          T.check('injection position is left of fractions', injText.x < a1Text.x, `inj x=${injText.x}, A1 x=${a1Text.x}`);
       }
    }
  });

  await T.t('missing curve archive', async () => {
    await p.reload();
    await h.wait(900);
    await h.newProject('Unicorn 7 missing curve');
    await h.addRun(path.join(DATA, 'chrom', 'missing_curve.zip'));

    await h.wait(500);
    const badFiles = await p.$$eval('#badFiles li', els => els.map(e => e.textContent));
    const toasts = await h.toasts();
    // Missing UV curve causes parseUnicornZip to return null, which pushes "not a UNICORN result archive".
    // Guards: an archive missing a curve must say so (which curve, or that something was skipped), not only report a normal load.
    T.check('gives a message for missing curve', [...badFiles, ...toasts].some(t => /missing|not found|no .*curve|skipp|without/i.test(t)), `badFiles: ${badFiles.join(' | ') || 'none'}, toasts: ${toasts.join(' | ') || 'none'}`);
    T.check('no page errors for missing curve', !errs.length, errs.join(' | '));
  });

  await T.t('archive without UV points', async () => {
    await p.reload();
    await h.wait(900);
    await h.newProject('Unicorn 7 no UV points');
    await h.addRun(lose('Chrom.1_1_True', 'unicorn_no_uv_data.zip'));
    const toasts = (await h.toasts()).join(' | ');
    // Guards: the UV points are lost, so nothing can be plotted; the message must name the UV curve, not call the file something else
    T.check('names the UV curve whose data is missing', /UV curve UV is missing/i.test(toasts), toasts || 'no toast');
    T.check('not called a non-UNICORN file', !/not a UNICORN result archive/i.test(toasts), toasts || 'no toast');
    T.check('no page errors for missing UV points', !errs.length, errs.join(' | '));
  });

  await T.t('archive without conductivity points', async () => {
    await p.reload();
    await h.wait(900);
    await h.newProject('Unicorn 7 no conductivity points');
    await h.addRun(lose('Chrom.1_2_True', 'unicorn_no_cond_data.zip'));
    const toasts = (await h.toasts()).join(' | ');
    const tl = await h.timeline();
    // Guards: the run still loads with its UV curve, and the lost conductivity curve is named instead of dropped silently
    T.check('partial archive loads', tl.some(x => /unicorn no cond data/i.test(x.t)), tl.map(x => x.t).join(' | '));
    T.check('names the conductivity curve with no data', /Conductivity but the archive has no data/i.test(toasts), toasts || 'no toast');
    await detect(p);
    const pk = (await peaks(p, h)).rows.filter(r => !/Pool/i.test(r.name));
    T.check('UV peaks kept when conductivity is missing', pk.length >= 2 && Math.abs(pk[0].ve - 13.0) < 0.2 && Math.abs(pk[1].ve - 17.0) < 0.2, pk.map(r => r.ve).join(', ') || 'no peaks');
    T.check('no page errors for missing conductivity points', !errs.length, errs.join(' | '));
  });

  await T.t('UNICORN csv without UV', async () => {
    await p.reload();
    await h.wait(900);
    await h.newProject('Unicorn csv no UV');
    await h.addRun(noUvCsv());
    const toasts = (await h.toasts()).join(' | ');
    // Guards: an ÄKTA export with only conductivity and %B is not shown as if conductivity were the UV signal without a word
    T.check('says the ÄKTA csv has no UV curve', /no UV curve \(only Cond, Conc B\)/.test(toasts), toasts || 'no toast');
    T.check('no page errors for csv without UV', !errs.length, errs.join(' | '));
  });

  await T.t('not unicorn archive', async () => {
    await p.reload();
    await h.wait(900);
    await h.newProject('Unicorn 7 invalid');
    await h.addRun(path.join(DATA, 'chrom', 'not_unicorn.zip'));

    await h.wait(500);
    const badFiles = await p.$$eval('#badFiles li', els => els.map(e => e.textContent));
    const toasts = await h.toasts();
    T.check('invalid format message', badFiles.some(t => /not a UNICORN result archive/i.test(t)) || toasts.some(t => /not a UNICORN result archive/i.test(t)), `badFiles: ${badFiles}, toasts: ${toasts}`);
    T.check('no page errors for not unicorn', !errs.length, errs.join(' | '));
  });

  T.check('no page errors overall', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
