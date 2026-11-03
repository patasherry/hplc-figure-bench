const fs = require('fs');
let content = fs.readFileSync('tests/suites/16_nanodrop.js', 'utf8');

content = content.replace(/await fresh\('uv-mass-coefficient', async \(p, h\) => \{[\s\S]*?\}\);\s*await fresh\('uv-mass-coefficient', async \(p, h\) => \{[\s\S]*?\}\);/s,
  `await fresh('uv-mass-coefficient', async (p, h) => {
    await h.newProject('UV Mass Coefficient');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await h.pool('all');

    // Evaluate the DOM actions avoiding strict mode selector errors
    await p.evaluate(() => {
        window.__HFB.opt.protSeq = 'MSDKIIHLTDDSFDTDVLKADGAILVDFWAEWCGPCKMIAPILDEIADEYQGKLTVAKLNIDQNPGTAPKYGIRGIPTLLLFKNGEVAATKVGALSKGQLKEFLDANLA';
        window.__HFB.applyProt();
        window.__HFB.render();
    });
    await p.waitForTimeout(300);

    const sumHtmlUntagged = await p.locator('#sumTable').innerHTML();
    const untaggedTitleCheck = sumHtmlUntagged.includes('for the untagged form');
    T.check('nd/uv-mass-coefficient/untagged', untaggedTitleCheck, 'Expected untagged coefficient in header title');

    // Change to SUMO tag
    await p.evaluate(() => {
        window.__HFB.opt.tagPreset = 'sumo';
        window.__HFB.applyProt();
        window.__HFB.render();
    });
    await p.waitForTimeout(300);

    const sumHtmlTagged = await p.locator('#sumTable').innerHTML();
    const taggedTitleCheck = sumHtmlTagged.includes('for the tagged form');
    T.check('nd/uv-mass-coefficient/tagged', taggedTitleCheck, 'Expected tagged coefficient in header title');
  });`);

fs.writeFileSync('tests/suites/16_nanodrop.js', content);
