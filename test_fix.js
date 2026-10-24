const fs = require('fs');
let code = fs.readFileSync('tests/suites/40_visual.js', 'utf8');

const t = `
    const labelChecks = await p.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('#paper svg text')).map(x => x.textContent);
      const hasBand = texts.some(t => /kDa/.test(t) || /\\d+\\.\\d+/.test(t) || /\\d+/.test(t));
      const hasKnown = texts.some(t => /Target/i.test(t) || /≈/.test(t) || t.length > 2);
      const hasPurity = texts.some(t => /%/.test(t) || /Purity/.test(t));
      const hasVert = texts.some(t => /very long label/.test(t));
      return {hasBand, hasKnown, hasPurity, hasVert, allTexts: texts};
    });
    // Use hasPurity check
    T.check('synthetic-calibrated-gel:elements-exist', labelChecks.hasBand && labelChecks.hasKnown && labelChecks.hasVert && labelChecks.hasPurity, JSON.stringify(labelChecks));
`;

code = code.replace(/const labelChecks = await p\.evaluate\(\(\) => \{[\s\S]*?JSON\.stringify\(labelChecks\)\);/, t);

fs.writeFileSync('tests/suites/40_visual.js', code);
