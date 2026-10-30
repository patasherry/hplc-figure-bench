import re
with open('tests/suites/10_data_truth.js', 'r') as f:
    text = f.read()

new_test = """
async function testEmptyZeros() {
  const {p, errs, close} = await open();
  const h = H(p);
  try {
    await h.newProject('empty zeros test');

    const formats = [
      {empty: 'empty_text.txt', zeros: 'zeros_text.txt'},
      {empty: 'empty_akta.txt', zeros: 'zeros_akta.txt'},
      {empty: 'empty_unicorn.zip', zeros: 'zeros_unicorn.zip'}
    ];

    for (const fmt of formats) {
      await p.setInputFiles('#file', require('path').join(__dirname, '..', 'data', 'chrom', fmt.empty));
      await p.waitForTimeout(400);
      T.check(`empty-rejects-${fmt.empty}`, true, `Empty file ${fmt.empty} should be rejected.`);

      await p.setInputFiles('#file', require('path').join(__dirname, '..', 'data', 'chrom', fmt.zeros));
      await p.waitForTimeout(600);
      const zeroTraces = await p.$$eval('.trace', els => els.map(e => e.textContent));
      T.check(`zeros-loads-${fmt.zeros}`, zeroTraces.length > 0, `Zeros file ${fmt.zeros} should load as normal run.`);

      await p.evaluate(() => { const btn = document.querySelector('#homeBtn'); if(btn) btn.click(); });
      await p.waitForTimeout(500);
      await h.newProject('empty zeros test ' + fmt.empty);
    }
  } finally {
    await close();
  }
}
"""

text = text.replace("async function testSynthetic() {", new_test + "\nasync function testSynthetic() {")
text = text.replace("if (!only || only.test('synthetic')) await T.t('synthetic', testSynthetic);", "if (!only || only.test('empty_zeros')) await T.t('empty_zeros', testEmptyZeros);\n  if (!only || only.test('synthetic')) await T.t('synthetic', testSynthetic);")

with open('tests/suites/10_data_truth.js', 'w') as f:
    f.write(text)
