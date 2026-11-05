const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

html = html.replace(
  `so typing one label per lane sets the lane count`,
  `so selecting a label for each lane sets the lane count`
);
html = html.replace(
  `Type the lane labels and check the ladder.`,
  `Select lane labels in the sidebar and check the ladder. Select \\'hide\\' to remove a lane.`
);

html = html.replace(
  `/* lane labels the user typed (not the default M, 1, 2 ...) set the lane count: empty or very faint lanes cannot be seen */`,
  `/* lane labels the user selected (not the default M, 1, 2 ...) set the lane count: empty or very faint lanes cannot be seen */`
);

html = html.replace(
  `Type the lane labels for \${g.name}, one per lane.`,
  `Select lane labels in the sidebar for \${g.name}.`
);
html = html.replace(
  `$('#g-labels').scrollIntoView({behavior: smooth(), block: 'center'});`,
  `$('#laneTable').scrollIntoView({behavior: smooth(), block: 'center'});`
);

html = html.replace(
  `<option value="" \${a === '' ? 'selected' : ''}>Not shown with a run</option>`,
  `<option value="" \${a === '' ? 'selected' : ''}>hide</option>`
);
html = html.replace(
  `if (a === '') return ' title="Not shown with a run"';`,
  `if (a === '') return ' title="hide"';`
);
html = html.replace(
  `'Not shown with a run'`,
  `'hide'`
);

html = html.replace(
  `const labs = gelLabels(g), used = new Set(labs.map((_, i) => laneAssign(g, i)).filter(a => a && a !== 'marker'));\n  set('st-lanes', \`\${labs.length} lanes\` + (used.size ? \`, \${used.size} run\${used.size > 1 ? 's' : ''}\` : ', no runs'));`,
  `const labs = gelLabels(g), asgn = labs.map((_, i) => laneAssign(g, i)), vis = asgn.filter(a => a !== ''), used = new Set(asgn.filter(a => a && a !== 'marker'));\n  set('st-lanes', \`\${vis.length} lane\${vis.length === 1 ? '' : 's'}\` + (used.size ? \`, \${used.size} run\${used.size > 1 ? 's' : ''}\` : ', no runs'));`
);

html = html.replace(
  `.lrow select{padding-right:24px}`,
  `.lrow select{padding-right:24px;text-overflow:ellipsis;min-width:0}`
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);


let js = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const newTest = `
await T.t('lane count ignores hidden lanes', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);
    await load(p, project(gel(im)));

    // Set lane to hide
    await p.evaluate(() => { const el = document.querySelector('#la0'); if(el) { el.value = ''; el.dispatchEvent(new Event('change')); } });
    await p.waitForTimeout(500);

    // Check the status text
    const status = await p.locator('#st-lanes').textContent();
    T.check('status reflects visible lanes', status.includes('1 lane') && !status.includes('2 lanes'), 'status is ' + status);
  } finally {
    await a.close();
  }
});
`;

js = js.replace(
  `T.done();})();`,
  newTest + `\nT.done();})();`
);
fs.writeFileSync('tests/suites/25_gels.js', js);
