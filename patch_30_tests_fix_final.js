const fs = require('fs');
const file = 'tests/suites/30_robust.js';
let content = fs.readFileSync(file, 'utf8');

const search = `await T.t('legacy-project', async () => { const {p, errs, close} = await open(), h = H(p);
  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.setInputFiles('#projFile', path.join(__dirname, '..', 'data', 'legacy_project.json'));
  await p.waitForTimeout(3000);

  const tl = await h.timeline();`;

const replace = `await T.t('legacy-project', async () => { const {p, errs, close} = await open(), h = H(p);
  // Modify the fixture data to test the fallback properly
  const fixture = JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'data', 'legacy_project.json'), 'utf8'));
  fixture.gels[0].image = null; // trigger the fallback

  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.setInputFiles('#projFile', {name: 'legacy_project_fallback.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
  await p.waitForTimeout(3000);

  const gelsCount = await p.locator('#gelList .gchip, #gels .gchip').count();
  T.check('legacy-project.gel-loaded', gelsCount === 1, \`loaded gels: \${gelsCount}\`);
  if (gelsCount === 1) {
     await p.locator('#gelList .gchip, #gels .gchip').first().click();
     await p.waitForTimeout(1000);
     const dims = await p.evaluate(() => {
        const c = document.querySelector('#gelCanvas');
        return {w: c ? c.width : null, h: c ? c.height : null};
     });
     T.check('legacy-project.gel-image-fallback', dims.w === 100 && dims.h === 100, \`Fallback image dimensions: \${dims.w}x\${dims.h}\`);
  }

  const tl = await h.timeline();`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
    console.log('patched');
} else {
    console.log('not found');
}
