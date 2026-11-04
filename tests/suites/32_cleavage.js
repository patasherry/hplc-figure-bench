const {open, H, suite, src, lib, DATA} = require('../lib/harness');
const path = require('path');

(async () => {
  const T = suite('32_cleavage'), {p, errs, close} = await open({cloud: false}), h = H(p);

  const getProtTable = async () => {
    return await p.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#protTable tr'));
      if (rows.length < 2) return [];
      const ths = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
      return rows.slice(1).map(row => {
        const tds = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
        const obj = {};
        tds.forEach((td, i) => { if (ths[i]) obj[ths[i]] = td; });
        return obj;
      });
    });
  };

  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, String(v)]);

  /* ================= 1. Cleavage consistency (Issue #793) ================= */
  await T.t('1_cleavage_consistency', async () => {
    const seq = 'ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY';

    await h.newProject('cleavage_test');

    const gelFile = path.join(DATA, 'gels', 'formats', 'gel_8bit.png');
    await h.dropFiles([gelFile]);
    await h.wait(1500);

    await p.evaluate(() => { const e = document.querySelector('#tl [data-step="gel"]'); if(e) e.click(); });
    await h.wait(500);

    await setOpt(p, 'protSeq', seq);
    await p.evaluate(() => {
        const el = document.getElementById('o-tagPreset2');
        if (el) { el.value = 'sumo'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await h.wait(500);

    const tbl = await getProtTable();
    const tagRow = tbl.find(r => /tag only/i.test(r.Form || r.form || ''));
    const tagOnlyKdaText = tagRow ? tagRow.kDa : null;
    const tagOnlyKda = num(tagOnlyKdaText);


    await p.evaluate(() => {
        const cb = document.getElementById('o-cleaveDetect');
        if (cb && !cb.checked) { cb.click(); cb.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    await h.wait(500);

    const untaggedRow = tbl.find(r => /untagged/i.test(r.Form || r.form || ''));
    const untaggedKdaText = untaggedRow ? String(num(untaggedRow.kDa)) : '11.9';

    await setOpt(p, 'o-protKda', untaggedKdaText);
    await h.wait(1000);

    const cleaveInfoText = await p.textContent('#cleaveInfo');
    const match = cleaveInfoText.match(/([\d.]+) kDa/g);
    const freeTagKda = match && match.length >= 3 ? num(match[2]) : null;

    T.check('cleavage_consistency.match', tagOnlyKda != null && freeTagKda != null && Math.abs(tagOnlyKda - freeTagKda) <= 0.15, `expected cleaved check tag size (${freeTagKda}) to match protein table tag size (${tagOnlyKda}) text: ${cleaveInfoText}`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
