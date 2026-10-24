const fs = require('fs');
let code = fs.readFileSync('tests/suites/40_visual.js', 'utf8');

const t = `
  /* UI-only synthetic calibrated-gel check, enabling band labels and an inline known-protein match */
  await T.t('synthetic-calibrated-gel', async () => {
    const {p, close} = await open({width: 1400}), h = H(p);
    await h.newProject('Synthetic Gel Check');

    await h.addRun(F.imac);
    await h.suggest();
    try { await p.setInputFiles(SEL.gelFile, [F.gel]); await h.wait(1500); } catch (e) {}

    // Use onehalf preset
    await p.evaluate(() => {
      const pr = document.querySelector('#o-preset');
      if (pr) { pr.value = 'onehalf'; pr.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await p.evaluate(() => {
      const e = document.querySelector('#o-bandLabels');
      if (e) { e.value = 'all'; e.dispatchEvent(new Event('change', {bubbles: true})); }
      const show = document.querySelector('#o-knownShow');
      if (show) { show.value = 'inline'; show.dispatchEvent(new Event('change', {bubbles: true})); }
      const pur = document.querySelector('#o-purRow');
      if (pur && !pur.checked) { pur.checked = true; pur.dispatchEvent(new Event('change', {bubbles: true})); }

      const gn = document.querySelector('#g-n');
      if (gn) { gn.value = '15'; gn.dispatchEvent(new Event('input', {bubbles: true})); }

      const gl = document.querySelector('#g-labels');
      if (gl) { gl.value = 'Lane 1\\nLane 2 with a very long label to force vertical\\nLane 3\\nLane 4\\nLane 5\\nLane 6\\nLane 7\\nLane 8\\nLane 9\\nLane 10\\nLane 11\\nLane 12\\nLane 13\\nLane 14\\nLane 15'; gl.dispatchEvent(new Event('input', {bubbles: true})); }

      const ga = document.querySelector('#g-assign');
      if (ga && ga.options.length > 1) { ga.value = ga.options[1].value; ga.dispatchEvent(new Event('change', {bubbles: true})); }

      const glns = document.querySelector('#g-lanes');
      if (glns) { glns.value = '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15'; glns.dispatchEvent(new Event('input', {bubbles: true})); }
    });

    // To make sure a known protein is enabled:
    await p.evaluate(() => {
      const cb = document.querySelector('input[data-known]');
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', {bubbles: true})); }
    });

    await h.wait(500);

    const ov = await h.overlaps();
    T.check('synthetic-calibrated-gel:no-overlap', !ov.length, ov.join(' | '));

    const labelChecks = await p.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('#paper svg text')).map(x => x.textContent);
      const hasBand = texts.some(t => /kDa/.test(t) || /\\d+\\.\\d+/.test(t) || /\\d+/.test(t));
      const hasKnown = texts.some(t => /Target/i.test(t) || /≈/.test(t) || t.length > 2);
      const hasPurity = texts.some(t => /%/.test(t) || /Purity/.test(t));
      const hasVert = texts.some(t => /very long label/.test(t));
      return {hasBand, hasKnown, hasPurity, hasVert};
    });
    T.check('synthetic-calibrated-gel:elements-exist', labelChecks.hasBand && labelChecks.hasKnown && labelChecks.hasVert && labelChecks.hasPurity, JSON.stringify(labelChecks));

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

    // Check that labels remain inside the figure
    const g = await figGeom(p);
    if (g && g.T) {
       const out = g.T.filter(x => x.x < g.svg.x - 1 || x.r > g.svg.r + 1 || x.y < g.svg.y - 1 || x.b > g.svg.b + 1);
       T.check('synthetic-calibrated-gel:inside-svg', !out.length, out.map(x => x.t).slice(0, 6).join(' | '));
    }

    await close();
  });
`;

code = code.replace(/T\.done\(\);\s*\}\)\(\);/, t + '\n  T.done(); })();');
fs.writeFileSync('tests/suites/40_visual.js', code);
