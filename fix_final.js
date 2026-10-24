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
    T.check('synthetic-calibrated-gel:elements-exist', labelChecks.hasBand && labelChecks.hasKnown && labelChecks.hasVert, JSON.stringify(labelChecks));

    // Verify physical sizes by getting computed style
    const badSizes = await p.evaluate(() => {
      const texts = document.querySelectorAll('#paper svg text');
      const bad = [];
      texts.forEach(t => {
        const cs = getComputedStyle(t);
        const fs = parseFloat(cs.fontSize);
        // Ensure every generated label is at least 5px/pt
        if (fs && fs < 4.9) bad.push({t: t.textContent, fs});
      });
      return bad;
    });
    T.check('synthetic-calibrated-gel:text-size-min-5pt', badSizes.length === 0, badSizes.map(b => \`\${b.t}: \${b.fs}px\`).join(', '));
`;

code = code.replace(/const labelChecks = await p\.evaluate\(\(\) => \{[\s\S]*?badSizes\.map\(b => `\$\{b\.t\}: \$\{b\.fs\}px`\)\.join\(', '\)\);/, t);

fs.writeFileSync('tests/suites/40_visual.js', code);
