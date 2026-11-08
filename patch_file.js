const fs = require('fs');
let html2 = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const newTest = `
await T.t('od-conversion-applied', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);

    await load(p, project(gel(im, {
      labels: 'M, A, B',
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: []
    })));

    let L1 = lane(await csv(p));
    let pct = parseFloat(L1[0][6]);

    await p.evaluate(() => { const b = document.querySelector('[data-fig="g1"]'); if (b) b.click(); });
    await p.waitForTimeout(500);

    await p.evaluate(() => {
        document.querySelectorAll('.canvas-foot').forEach(el => el.style.display = 'flex');
    });

    await p.waitForFunction(() => {
        const rows = document.querySelectorAll('#bandTable tbody tr');
        return Array.from(rows).some(r => r.textContent.includes('2A'));
    });

    const txt = await p.locator('#bandTable tbody tr').filter({hasText: '2A'}).textContent(); const pct_match = txt.match(/\\((\\d+\\.?\\d*)%\\)/); const pct_val = pct_match ? parseFloat(pct_match[1]) : 0;

    T.check('od-conversion-applied.value', pct_val > 63.5, 'Expected > 63.5, got ' + pct_val);
  } finally {
    await a.close();
  }
});
`;

html2 = html2.replace(/await T\.t\('od-conversion-applied'[\s\S]*?T\.done\(\);\}\)\(\);/m, newTest + '\nT.done();})();');
fs.writeFileSync('tests/suites/25_gels.js', html2);
