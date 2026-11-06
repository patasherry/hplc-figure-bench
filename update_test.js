const fs = require('fs');
const file = 'tests/suites/30_robust.js';
let content = fs.readFileSync(file, 'utf8');

// I need to update the $eval to $$eval and use the direct array injection for h.addRun to avoid file cleanup issues or hardcoded paths that might crash tests in CI
const oldTest = `await T.t('prep-name-manual-id', async () => {
  const {p, errs, close} = await open(), h = H(p);
  const data = {
    app: 'HPLC Figure Bench',
    version: 1.0,
    prep: { name: 'm900', manual: [] },
    runs: [], gels: []
  };
  const filePath = require('path').join(__dirname, '../data/m900_legacy.json');
  require('fs').writeFileSync(filePath, JSON.stringify(data));
  await p.locator('#projFile').setInputFiles(filePath);
  await p.waitForTimeout(500);

  await p.locator('#tl [data-step="construct"]').click();
  await p.waitForTimeout(300);
  await p.locator('#tl [data-step="figure"]').click();
  await p.waitForTimeout(500);

  const methods = await p.locator('#methodsText').inputValue();
  T.check('prep-name-manual-id.prep-name', methods.includes('m900'), \`Expected m900 in methodsText, got: \${methods}\`);

  await p.locator('#tl [data-addmenu]').click();
  await p.waitForTimeout(300);
  await p.locator('#tl [data-addstep="man:column"]').click();
  await p.waitForTimeout(500);

  const steps = await p.$eval('#tl button[data-step^="man:"]', els => els.map(e => e.getAttribute('data-step')));
  T.check('prep-name-manual-id.allocates-m1', steps.includes('man:m1'), \`Expected man:m1, got: \${steps.join(', ')}\`);

  await close();
});`;

const newTest = `await T.t('prep-name-manual-id', async () => {
  const {p, errs, close} = await open(), h = H(p);
  const data = {
    app: 'HPLC Figure Bench',
    version: 1.0,
    prep: { name: 'm900', manual: [] },
    runs: [], gels: []
  };
  await p.setInputFiles('#projFile', {name: 'm900_legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data))});
  await p.waitForTimeout(500);

  await p.locator('#tl [data-step="construct"]').click();
  await p.waitForTimeout(300);
  await p.locator('#tl [data-step="figure"]').click();
  await p.waitForTimeout(500);

  const methods = await p.locator('#methodsText').inputValue();
  T.check('prep-name-manual-id.prep-name', methods.includes('m900'), \`Expected m900 in methodsText, got: \${methods}\`);

  await p.locator('#tl [data-addmenu]').click();
  await p.waitForTimeout(300);
  await p.locator('#tl [data-addstep="man:column"]').click();
  await p.waitForTimeout(500);

  const steps = await p.$$eval('#tl button[data-step^="man:"]', els => els.map(e => e.getAttribute('data-step')));
  T.check('prep-name-manual-id.allocates-m1', steps.includes('man:m1'), \`Expected man:m1, got: \${steps.join(', ')}\`);

  await close();
});`;

if (content.includes("await p.$eval('#tl button[data-step^=\"man:\"]'")) {
    content = content.replace(oldTest, newTest);
    fs.writeFileSync(file, content);
    console.log("Replaced test to use buffer and $$eval");
} else {
    console.log("Could not find the test exactly to replace, attempting simpler replace.");
    content = content.replace("await p.$eval('#tl button", "await p.$$eval('#tl button");
    fs.writeFileSync(file, content);
}
