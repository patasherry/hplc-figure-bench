const {DATA, path, fs} = require('../lib/harness');

// Test scopes for the usability check: one use case each, walked through the UI like a person would.
// Each step is a small action. A step that throws is itself a finding (a control a user could not reach or use).
// Synthetic data only: the runner clears HFB_PRIVATE_DATA, so src() always gives the stand-ins in tests/data.

/* click the first visible button, tab, link or label whose visible text matches re; a miss is a finding */
async function clickText(p, re, what){
  for (const role of ['button', 'tab', 'link', 'menuitem', 'checkbox', 'radio']) {
    const loc = p.getByRole(role, {name: re});
    const n = await loc.count();
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (await el.isVisible()) {
        if (await el.evaluate(e => e.classList.contains('tl-i') && e.getAttribute('aria-current') === 'step')) continue;
        await el.click(); await p.waitForTimeout(600); return;
      }
    }
  }
  const lab = p.locator('label', {hasText: re});
  for (let i = 0; i < await lab.count(); i++) if (await lab.nth(i).isVisible()) { await lab.nth(i).click(); await p.waitForTimeout(600); return; }
  const sum = p.locator('summary', {hasText: re});
  for (let i = 0; i < await sum.count(); i++) if (await sum.nth(i).isVisible()) { await sum.nth(i).click(); await p.waitForTimeout(600); return; }
  throw new Error(`could not find a visible control labelled like "${what || re}"`);
}
/* in a project the workflow figure is the timeline's "figure" step; in quick mode it is a figure tab */
const showWorkflow = async (p, h) => { if (await p.isVisible('#tl [data-step="figure"]')) return h.step('figure'); const t = p.locator('.figtab[data-fig="workflow"]');
  if (await t.count() && await t.first().isVisible()) { await t.first().click(); await p.waitForTimeout(700); } else throw new Error('found no way to show the workflow figure'); };
const pickLayout = async (p, k) => { const l = p.locator(`label[for="wf-${k}"]`); if (!(await l.count())) throw new Error(`no ${k} layout option`);
  if (!(await l.first().isVisible())) throw new Error(`the ${k} layout option is hidden (inside a closed section or More options?)`); await l.first().click(); await p.waitForTimeout(700); };
const tick = async (p, sel) => { const e = p.locator(sel); if (!(await e.count())) throw new Error(`no control ${sel}`); if (!(await e.first().isVisible())) throw new Error(`${sel} exists but is hidden (inside a closed section?)`); await e.first().check(); await p.waitForTimeout(700); };
const project = (h, name) => h.newProject(name);
const synthHplc = (peakX, peakH) => {
  const rows = ['Time (min),UV 280 (mAU)'];
  for (let i = 0; i <= 120; i++) {
    const t = i * 0.25;
    const y = peakH * Math.exp(-0.5 * ((t - peakX) / 0.8) ** 2);
    rows.push(`${t.toFixed(2)},${y.toFixed(3)}`);
  }
  return rows.join('\n') + '\n';
};

module.exports = [
  {id: 'first-visit', title: 'First visit and a first figure', goal: 'Open the app for the first time, try the example data, make a figure and export it as PNG, without reading any instructions.',
    steps: [
      {name: 'Open the app', run: async () => {}},
      {name: 'Try the quick figure with example data', run: async ({p}) => { await p.click('#homeQuick'); await p.waitForTimeout(900); }},
      {name: 'Find how to export a PNG', run: async ({p}) => { await clickText(p, /png/i, 'PNG'); }},
    ]},
  {id: 'workflow', title: 'A purification workflow', goal: 'Make a project with an IMAC run, then a SEC run and a NanoDrop reading, pool fractions, and look at the workflow figure and its Methods text.',
    steps: [
      {name: 'Start a new project', run: async ({h}) => project(h, 'UX workflow')},
      {name: 'Add the IMAC run', run: async ({h, src}) => h.addRun(src('his'))},
      {name: 'Pick the pooled fractions', run: async ({h}) => { const s = await h.suggest(); if (!s) throw new Error('Suggest gave no pool'); }},
      {name: 'Add the SEC run', run: async ({h, src}) => h.addRun(src('s200'))},
      {name: 'Add a concentration step with a NanoDrop reading', run: async ({h, src}) => h.addConc(src('nd'), 2)},
      {name: 'Look at the workflow figure', run: async ({p, h}) => showWorkflow(p, h)},
      {name: 'Read the Methods text', run: async ({h}) => { const m = await h.methods(); if (!m || m.length < 40) throw new Error('Methods text is empty or very short'); }},
    ]},
  {id: 'layout', title: 'Workflow layout and moving panels', goal: 'With two runs in the workflow figure, try the side-by-side, stacked and grid layouts, then select a panel and move it.',
    steps: [
      {name: 'Start a project with two runs', run: async ({h, src}) => { await project(h, 'UX layout'); await h.addRun(src('his')); await h.addRun(src('q')); }},
      {name: 'Show the workflow figure', run: async ({p, h}) => showWorkflow(p, h)},
      {name: 'Switch to stacked', run: async ({p}) => pickLayout(p, 'stack')},
      {name: 'Switch to grid', run: async ({p}) => pickLayout(p, 'grid')},
      {name: 'Select the first panel', run: async ({p}) => { const b = await p.$eval('#paper svg', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width*0.2, y: r.y + r.height*0.3}; }); await p.mouse.click(b.x, b.y); await p.waitForTimeout(500);
        if (!(await p.isVisible('#wfTool'))) throw new Error('clicking a panel showed no panel toolbar'); }},
      {name: 'Drag the selected panel', run: async ({p}) => { const b = await p.$eval('#wfSelBox', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; });
        await p.mouse.move(b.x, b.y); await p.mouse.down(); await p.mouse.move(b.x + 40, b.y + 30, {steps: 8}); await p.mouse.up(); await p.waitForTimeout(600); }},
    ]},
  {id: 'gels', title: 'A gel with lanes, ladder and purity', goal: 'Add a gel photo to a run, crop it, set the lanes and ladder, and read the purity of the main band.',
    steps: [
      {name: 'Start a project with a run', run: async ({h, src}) => { await project(h, 'UX gel'); await h.addRun(src('his')); }},
      {name: 'Add the gel photo', run: async ({p, src}) => { await p.setInputFiles('#gelFile', src('gel')); await p.waitForTimeout(2500); }},
      {name: 'Find the lanes and ladder settings', run: async ({p}) => { await clickText(p, /lanes/i, 'Lanes'); }},
      {name: 'Find the purity result', run: async ({p}) => { await clickText(p, /bands and purity|purity/i, 'Bands and purity'); }},
    ]},
  {id: 'sec', title: 'SEC calibration and a mass estimate', goal: 'Load a SEC run, choose the column and its calibration, and read the estimated mass of the main peak.',
    steps: [
      {name: 'Start a project with a SEC run', run: async ({h, src}) => { await project(h, 'UX SEC'); await h.addRun(src('s200')); }},
      {name: 'Find the SEC column setting', run: async ({p}) => { if (!(await p.isVisible('#sec-col'))) await clickText(p, /size exclusion|sec/i, 'SEC'); if (!(await p.isVisible('#sec-col'))) throw new Error('the SEC column selector is not visible'); }},
      {name: 'Read the mass estimate', run: async ({p}) => { const t = await p.evaluate(() => document.body.innerText); if (!/kDa/.test(t)) throw new Error('no kDa value visible anywhere on the page'); }},
    ]},
  {id: 'zoom', title: 'Zoom inset and full chromatograms', goal: 'Show a whole run with the peak region magnified, then show full chromatograms in the workflow figure.',
    steps: [
      {name: 'Start a project with a run', run: async ({h, src}) => { await project(h, 'Peak Zoom'); await h.addRun(src('his')); }},
      {name: 'Turn on the zoom inset', run: async ({p}) => { if (!(await p.isVisible('#o-zoomInset'))) await clickText(p, /window|more options/i, 'Window'); await tick(p, '#o-zoomInset'); }},
      {name: 'Show the workflow figure with full chromatograms', run: async ({p, h}) => { await showWorkflow(p, h); await tick(p, '#o-wfFull'); }},
    ]},
  {id: 'phone-dark', title: 'Phone width and dark mode', goal: 'Use the app on a phone-sized screen in dark mode: open the example, add a run and read the figure.', open: {width: 390, height: 844, dark: true},
    steps: [
      {name: 'Open on a phone in dark mode', run: async () => {}},
      {name: 'Try the quick figure', run: async ({p}) => { await p.click('#homeQuick'); await p.waitForTimeout(900); }},
    ]},
  {id: 'projects', title: 'Saving and reopening a project', goal: 'Make a project, go back to the project list, reopen it and check nothing was lost; then export it as a file.',
    steps: [
      {name: 'Make a project with a run', run: async ({h, src}) => { await project(h, 'UX save'); await h.addRun(src('his')); }},
      {name: 'Go back to all projects', run: async ({p}) => clickText(p, /all projects/i, 'All projects')},
      {name: 'Reopen the project', run: async ({p}) => clickText(p, /UX save/, 'UX save')},
      {name: 'Find how to export the project as a file', run: async ({p}) => clickText(p, /export.*project|project.*json|save as file/i, 'Export project')},
    ]},
  {id: 'construct', title: 'Paste GenBank text and view construct panel', goal: 'Paste GenBank text into the Construct section, check the ORF and tagged/cleaved masses, then view the construct panel in the workflow figure.',
    steps: [
      {name: 'Start a new project', run: async ({h}) => project(h, 'UX construct')},
      {name: 'Paste GenBank text into Construct', run: async ({p, src}) => {
        await clickText(p, /paste genbank text/i, 'Paste GenBank text');
        if (!(await p.isVisible('#gbText'))) throw new Error('the GenBank text box did not appear after clicking Paste GenBank text');
        await p.fill('#gbText', fs.readFileSync(src('gb'), 'utf8'));
        await clickText(p, /use pasted text/i, 'Use pasted text');
        await p.waitForTimeout(800);
      }},
      {name: 'Check the ORF and masses', run: async ({p, h}) => {
        const st = await p.textContent('#gbStatus') || '';
        if (!/ORF\s+\d+\s+residues/i.test(st) || !/kDa/i.test(st)) throw new Error(`GenBank status missing ORF or mass: "${st}"`);
        const figTxt = (await h.svgTexts()).map(x => x.t).join(' ');
        if (!/kDa/.test(figTxt)) throw new Error('construct figure shows no mass in kDa');
        const prot = await p.textContent('#protTable') || '';
        if (!/kDa/.test(prot)) throw new Error('Protein table did not populate masses from the pasted GenBank ORF');
      }},
      {name: 'View the construct panel in the workflow figure', run: async ({p, h}) => {
        await showWorkflow(p, h);
        const figTxt = (await h.svgTexts()).map(x => x.t).join(' ');
        if (!/kDa/.test(figTxt) || !/pET28|SUMO|construct/i.test(figTxt)) throw new Error(`workflow figure does not show the construct panel (${figTxt.slice(0, 120)})`);
      }},
    ]},
  {id: 'nanodrop-typed', title: 'Type a NanoDrop reading and use it for concentration', goal: 'Type a NanoDrop reading by hand in the NanoDrop section, then use it in a concentration step.',
    steps: [
      {name: 'Start a project with a run', run: async ({h, src}) => { await project(h, 'UX NanoDrop'); await h.addRun(src('his')); await h.suggest(); }},
      {name: 'Click Type a reading in the NanoDrop section', run: async ({p, h}) => {
        await h.step('final');
        await clickText(p, /type a reading/i, 'Type a reading');
        if (!(await p.locator('#ndList .ndr').count())) throw new Error('clicking Type a reading added no row to the NanoDrop list');
      }},
      {name: 'Enter a concentration or absorbance value', run: async ({p}) => {
        const row = p.locator('#ndList .ndr').first();
        const edit = row.locator('.nd-edit summary');
        if (await edit.isVisible()) await edit.click();
        const valInput = row.locator('input[data-ndk="a280"], input[data-ndk="conc"], input[aria-label*="conc" i], input[aria-label*="a280" i]');
        if (!(await valInput.count()) || !(await valInput.first().isVisible())) {
          throw new Error('the typed NanoDrop row has no input field to enter an absorbance or concentration value (locked at 1.00 mg/mL)');
        }
        await valInput.first().fill('2.5');
      }},
      {name: 'Add a concentration step and use the reading', run: async ({p}) => {
        await p.click('#tl [data-addmenu]');
        await p.click('#tl [data-addstep="conc"]');
        await p.waitForTimeout(500);
        const ndItems = await p.locator('#btwNdList .ndr, #btwNdList .btwnd-r').count();
        const hasConcInput = await p.isVisible('#btw-conc');
        if (!ndItems && !hasConcInput) {
          throw new Error('concentration step shows neither the typed NanoDrop reading nor a visible concentration input without expanding optional methods details');
        }
      }},
    ]},
  {id: 'branches-yield', title: 'Split branches, readings, volumes and per-branch yields', goal: 'Split an IMAC run into SEC and AEX branches ("Comes from"), give each a reading and a volume, and read the per-branch yield lines and Methods text.',
    steps: [
      {name: 'Start a project with IMAC, SEC and AEX runs', run: async ({h, src}) => {
        await project(h, 'UX branches');
        await h.gb(src('gb'));
        await h.addRun(src('his')); await h.pool('T1-T6');
        await h.addRun(path.join(DATA, 'science/sec_inject2.csv')); await h.suggest();
        await h.addRun(src('q')); await h.suggest();
      }},
      {name: 'Split AEX from the IMAC run using Comes from', run: async ({p, h}) => {
        const runs = (await h.timeline()).filter(x => /^run:/.test(x.k));
        if (runs.length < 3) throw new Error('expected 3 runs in timeline');
        const imacId = runs[0].k.slice(4);
        await h.step(runs[2].k);
        if (!(await p.isVisible('#ssFrom'))) throw new Error('could not find the Comes from selector');
        await p.selectOption('#ssFrom', imacId);
        await p.fill('#ssFromNote', 'fractions B9-B12');
        await p.dispatchEvent('#ssFromNote', 'change');
        await h.step(runs[1].k);
        await p.fill('#ssFromNote', 'fractions B5-B8');
        await p.dispatchEvent('#ssFromNote', 'change');
        await p.waitForTimeout(400);
      }},
      {name: 'Add a concentration reading and volume to each branch', run: async ({p, h}) => {
        const runs = (await h.timeline()).filter(x => /^run:/.test(x.k));
        for (const [idx, conc, vol] of [[1, '1.42', '2.0'], [2, '1.84', '1.5']]) {
          await h.step(runs[idx].k);
          await p.click('#tl [data-addmenu]');
          await p.click('#tl [data-addstep="conc"]');
          await p.waitForTimeout(400);
          await p.fill('#btw-vOut', vol);
          await p.dispatchEvent('#btw-vOut', 'change');
          if (!(await p.isVisible('#btw-conc'))) await clickText(p, /details for the methods/i, 'Details for the methods');
          await p.fill('#btw-conc', conc);
          await p.dispatchEvent('#btw-conc', 'change');
          await p.waitForTimeout(400);
        }
      }},
      {name: 'Read the per-branch yield lines in the workflow figure', run: async ({p, h}) => {
        await showWorkflow(p, h);
        if (!(await p.isVisible('#o-wfYield'))) await clickText(p, /figure options/i, 'Figure options');
        await tick(p, '#o-wfYield');
        const lines = (await h.svgTexts()).map(x => x.t).filter(t => /Final (pool|sample)/.test(t));
        const joined = lines.join(' | ');
        if (lines.length < 2 || !/2\.84 mg/.test(joined) || !/2\.76 mg/.test(joined)) {
          throw new Error(`expected per-branch yield lines with 2.84 mg and 2.76 mg, found ${lines.length}: ${joined}`);
        }
      }},
      {name: 'Read the Methods text', run: async ({h}) => {
        const m = await h.methods();
        if (!/split/i.test(m) || !/2\.84 mg/.test(m) || !/2\.76 mg/.test(m)) {
          throw new Error(`Methods text missing split or per-branch yields: ${m}`);
        }
      }},
    ]},
  {id: 'gel-cleavage', title: 'Gel cleavage tagging and result', goal: 'Load a gel with uncleaved and cleaved lanes, tag the bands and read the cleavage result.',
    steps: [
      {name: 'Start a project with a run and a gel', run: async ({p, h, src}) => {
        await project(h, 'UX cleavage');
        await h.addRun(src('his'));
        await p.setInputFiles('#gelFile', src('gel'));
        await p.waitForTimeout(2500);
      }},
      {name: 'Label the uncleaved and cleaved lanes', run: async ({p}) => {
        if (!(await p.isVisible('#g-labels'))) await clickText(p, /lanes/i, 'Lanes');
        await p.fill('#g-labels', 'M, L1, L2, -Ulp1, L5, +Ulp1, F7, F8, F9, F10, F11, F12');
        await p.dispatchEvent('#g-labels', 'input');
        await p.waitForTimeout(700);
      }},
      {name: 'Tag the tagged and cleaved bands in those lanes', run: async ({p}) => {
        if (!(await p.isVisible('#bandTable'))) await clickText(p, /bands and purity/i, 'Bands and purity');
        const uncutRow = p.locator('#bandTable tr', {hasText: '-Ulp1'}).first();
        if (!(await uncutRow.locator('.bchip').count())) throw new Error('no detected bands in -Ulp1 lane to tag');
        await uncutRow.locator('.bchip').first().click(); await p.waitForTimeout(250);
        await uncutRow.locator('.bchip').first().click(); await p.waitForTimeout(300); // tagged form
        const cutRow = p.locator('#bandTable tr', {hasText: '+Ulp1'}).first();
        const chips = cutRow.locator('.bchip');
        if ((await chips.count()) < 2) throw new Error('expected at least 2 detected bands in +Ulp1 lane to tag cleaved and tagged forms');
        await chips.first().click(); await p.waitForTimeout(300); // cleaved target
        await chips.nth(1).click(); await p.waitForTimeout(250);
        await chips.nth(1).click(); await p.waitForTimeout(300); // remaining tagged form
      }},
      {name: 'Read the cleavage result', run: async ({p}) => {
        const head = await p.$$eval('#bandTable th', ths => ths.map(e => e.textContent.trim()));
        const ci = head.findIndex(h => /cleaved/i.test(h));
        if (ci < 0) throw new Error(`no Cleaved column shown in band table (headers: ${head.join(', ')})`);
        const uncutVal = (await p.locator('#bandTable tr', {hasText: '-Ulp1'}).first().locator('td').nth(ci).textContent() || '').trim();
        const cutVal = (await p.locator('#bandTable tr', {hasText: '+Ulp1'}).first().locator('td').nth(ci).textContent() || '').trim();
        if (!/^0%$/.test(uncutVal)) throw new Error(`expected 0% cleaved for -Ulp1 lane, got "${uncutVal}"`);
        if (!/^[1-9]\d*%$/.test(cutVal)) throw new Error(`expected positive cleavage percentage for +Ulp1 lane, got "${cutVal}"`);
      }},
    ]},
  {id: 'overlay-hplc', title: 'Quick mode HPLC overlay and PNG export', goal: 'Open Quick mode, load several HPLC traces, adjust legend, palette and normalization, and export a PNG.',
    steps: [
      {name: 'Open Quick mode', run: async ({p}) => { await p.click('#homeQuick'); await p.waitForTimeout(900); }},
      {name: 'Load several HPLC traces', run: async ({p}) => {
        await p.setInputFiles('#file', [
          {name: 'hplc_export.csv', mimeType: 'text/csv', buffer: fs.readFileSync(path.join(DATA, 'chrom', 'hplc_export.csv'))},
          {name: 'hplc_peak_a.csv', mimeType: 'text/csv', buffer: Buffer.from(synthHplc(10, 25))},
          {name: 'hplc_peak_b.csv', mimeType: 'text/csv', buffer: Buffer.from(synthHplc(14, 70))},
        ]);
        await p.waitForTimeout(1500);
        const n = await p.locator('#list .trace').count();
        if (n < 3) throw new Error(`expected 3 HPLC traces loaded, got ${n}`);
      }},
      {name: 'Adjust the legend and color palette', run: async ({p, h}) => {
        if (!(await p.isVisible('#o-legend'))) await clickText(p, /^axes/i, 'Axes');
        await p.selectOption('#o-legend', 'insideL');
        await p.waitForTimeout(400);
        if (!(await p.isVisible('#o-palette'))) await clickText(p, /^figure style/i, 'Figure style');
        await p.selectOption('#o-palette', 'blues');
        await p.waitForTimeout(400);
        const tx = (await h.svgTexts()).map(x => x.t).join(' ');
        if (!/hplc_export|hplc_peak_a/.test(tx)) throw new Error(`legend entries missing from figure (${tx.slice(0, 120)})`);
      }},
      {name: 'Turn on normalization', run: async ({p, h}) => {
        if (!(await p.isVisible('#o-normalize'))) await clickText(p, /^processing/i, 'Processing');
        await tick(p, '#o-normalize');
        const tx = (await h.svgTexts()).map(x => x.t).join(' ');
        if (!/Normalized/i.test(tx)) throw new Error(`normalized Y axis label did not appear (${tx.slice(0, 120)})`);
      }},
      {name: 'Export a PNG', run: async ({p}) => {
        const [dl] = await Promise.all([
          p.waitForEvent('download', {timeout: 10000}).catch(() => null),
          clickText(p, /save png/i, 'Save PNG'),
        ]);
        if (!dl) throw new Error('clicking Save PNG did not start a download');
      }},
    ]},
  {id: 'sec-calibration', title: 'SEC standards and fitted calibration plot', goal: 'Load an SEC run, enter SEC standards, check the calibration fit and read the fitted calibration plot.',
    steps: [
      {name: 'Start a project with a SEC run', run: async ({h}) => {
        await project(h, 'UX SEC calibration');
        await h.addRun(path.join(DATA, 'science', 'sec_inject2.csv'));
      }},
      {name: 'Open SEC settings and enable calibration standards', run: async ({p}) => {
        if (!(await p.isVisible('#o-secStds'))) await clickText(p, /size exclusion|sec/i, 'Size exclusion (SEC)');
        await tick(p, '#o-secStds');
      }},
      {name: 'Enter V0, Vt and standard elution volumes', run: async ({p}) => {
        await p.fill('#sec-v0', '8.0'); await p.dispatchEvent('#sec-v0', 'change');
        await p.fill('#sec-vt', '24.0'); await p.dispatchEvent('#sec-vt', 'change');
        const ves = [10.0, 12.5, 14.5, 16.0];
        for (let i = 0; i < ves.length; i++) {
          const inp = p.locator(`#ss-v${i}`);
          if (!(await inp.count())) throw new Error(`missing standard elution volume field #ss-v${i}`);
          await inp.fill(String(ves[i]));
          await inp.dispatchEvent('change');
        }
        await p.waitForTimeout(500);
        const fit = await p.textContent('#sec-fit') || '';
        if (!/Fit from \d+ standards.*R² =/i.test(fit)) throw new Error(`calibration fit summary did not update: "${fit}"`);
      }},
      {name: 'Open and read the fitted calibration plot', run: async ({p}) => {
        const calTab = p.locator('.figtab[data-fig^="cal:"]');
        if (await calTab.count() && await calTab.first().isVisible()) {
          await calTab.first().click(); await p.waitForTimeout(600);
          return;
        }
        const calStep = p.locator('#tl .tl-i', {hasText: /calibrat/i});
        if (await calStep.count() && await calStep.first().isVisible()) {
          await calStep.first().click(); await p.waitForTimeout(600);
          return;
        }
        const calBtn = p.locator('#secPanel button, #secPanel a', {hasText: /plot|view|open|chart/i});
        if (await calBtn.count() && await calBtn.first().isVisible()) {
          await calBtn.first().click(); await p.waitForTimeout(600);
          return;
        }
        throw new Error('could not find any visible tab, timeline step or button to open the fitted SEC calibration plot in project mode');
      }},
    ]},
];

