const {open, H, suite, src} = require('../lib/harness');

suite('disclose automatic chromatogram-axis reordering', async (test) => {
  await test('source_import_diagnostics_reversed', async () => {
    const {p, h} = await open();
    await h.dropFiles([{name: 'reversed.csv', content: "time,uv\n3,10\n2,20\n1,5"}]);
    const diagText = await p.locator('.source-diag summary').textContent();
    if (!diagText.includes('Plotted series sorted')) throw new Error('Diagnostic summary not found or incorrect: ' + diagText);
  });
});
