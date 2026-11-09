const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const oldTest = `await T.t('lane-labels-instruction', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);
    await load(p, project(gel(im, {tags: []})));
    await p.evaluate(() => { const b = document.querySelector('[data-fig="g1"]'); if (b) b.click(); });
    await p.waitForTimeout(200);
    const text = await p.innerText('#ssWhat');
    T.check('lane-labels-instruction.text', text.includes('Select lane labels in the sidebar and check the ladder.'), 'instruction text: ' + text);
  } finally { await a.close(); }
});`;

const newTest = `await T.t('lane-labels-instruction', async () => {
  const a = await open(), p = a.p;
  const { H } = require('../lib/harness');
  const h = H(p);
  try {
    await h.newProject('Test Project');
    await p.setInputFiles('#gelFile', src('gel'));
    await p.waitForTimeout(2500);
    const text = await p.innerText('#ssWhat');
    T.check('lane-labels-instruction.text', text.includes('Select lane labels in the sidebar'), 'instruction text: ' + text);
  } finally { await a.close(); }
});`;

content = content.replace(oldTest, newTest);
fs.writeFileSync('tests/suites/25_gels.js', content);
