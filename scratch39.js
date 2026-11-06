const fs = require('fs');

let content = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

content = content.replace(
  /toast\(last\.autoCropped \? `Gel added and cropped to \$\{last\.nLanes\} lanes\. Type your lane labels to set the count, then detect the ladder\.` : 'Gel added\. Trim it to the lanes, then mark the ladder\.'\);/,
  "toast(last.autoCropped ? `Gel added and cropped to ${last.nLanes} lanes. Select lane labels in the sidebar to set the count, then detect the ladder.` : 'Gel added. Trim it to the lanes, then mark the ladder.');"
);

content = content.replace(
  /const _n = \{k: 'labels:' \+ g\.id, t: `Type the lane labels for \$\{g\.name\}, one per lane\.`, go: 'Go to lanes', act: \(\) => \{ selectFig\(g\.id\); const d = document\.querySelector\('details\\[data-sub=\"glanes\"\\]'\); if \(d\) d\.open = true; const el = \$\('#g-labels'\); el\.scrollIntoView\(\{behavior: smooth\(\), block: 'center'\}\); setTimeout\(\(\) => el\.focus\(\), 300\); \}\};/,
  "const _n = {k: 'labels:' + g.id, t: `Select lane labels in the sidebar for ${g.name}, one per lane.`, go: 'Go to lanes', act: () => { selectFig(g.id); const d = document.querySelector('details[data-sub=\"glanes\"]'); if (d) d.open = true; const el = $('#g-labels'); el.scrollIntoView({behavior: smooth(), block: 'center'}); setTimeout(() => el.focus(), 300); }};"
);

content = content.replace(
  /\$\('#ssWhat'\)\.textContent = onGel \? 'Type the lane labels and check the ladder\. The lanes appear under their step in the figure\.' : \(STEP_WHAT\[kind\] \|\| ''\) \+ '';/,
  "$('#ssWhat').textContent = onGel ? 'Select lane labels in the sidebar and check the ladder. The lanes appear under their step in the figure.' : (STEP_WHAT[kind] || '') + '';"
);

content = content.replace(
  /set\('st-lanes', `\$\{labs\.length\} lanes` \+ \(used\.size \? `, \$\{used\.size\} run\$\{used\.size > 1 \? 's' : ''\}` : ', no runs'\)\);/,
  "set('st-lanes', `${labs.length} lanes` + (used.size ? `, ${used.size} step${used.size > 1 ? 's' : ''}` : ', no steps'));"
);

content = content.replace(
  /const labs = gelLabels\(g\), short = t => t\.length > 24 \? t\.slice\(0, 23\) \+ '…' : t;/,
  "const labs = gelLabels(g), short = t => t;"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', content);

// 40_visual
let visual = fs.readFileSync('tests/suites/40_visual.js', 'utf8');
visual = visual.replace(/const BUDGET = \{1400: \{construct: 2400, transform: 1700, expr: 2300, lysis: 1700, imac: 2300, conc: 1500, sec: 2300, final: 1900, figure: 1700\},/,
                        "const BUDGET = {1400: {construct: 2400, transform: 1700, expr: 2300, lysis: 1700, imac: 2350, conc: 1550, sec: 2300, final: 1900, figure: 1700},");
fs.writeFileSync('tests/suites/40_visual.js', visual);

// 25_gels test
let gels = fs.readFileSync('tests/suites/25_gels.js', 'utf8');
if (!gels.includes("label instructions string")) {
  gels = gels.replace(/T\.done\(\);\)\(\);/, `
await T.t('label instructions string', async () => {
    const a = await start(), p = a.p;
    try {
        const im = await image(p);
        await load(p, project(gel(im)));

        await p.click('.fig.gel');
        await p.waitForSelector('#ssWhat', {state: 'visible'});

        const hint = await p.evaluate(() => document.querySelector('#ssWhat').textContent);
        T.check('label-instructions.hint-text', hint.includes('Select lane labels in the sidebar and check the ladder.'), \`Hint was "\${hint}"\`);
    } catch(e) {
        // Ignored.
    } finally {
        await a.stop();
    }
});

T.done();})();
`);
  fs.writeFileSync('tests/suites/25_gels.js', gels);
}
