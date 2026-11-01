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
  throw new Error(`could not find a visible control labelled like "${what || re}"`);
}
/* in a project the workflow figure is the timeline's "figure" step; in quick mode it is a figure tab */
const showWorkflow = async (p, h) => { if (await p.isVisible('#tl [data-step="figure"]')) return h.step('figure'); const t = p.locator('.figtab[data-fig="workflow"]');
  if (await t.count() && await t.first().isVisible()) { await t.first().click(); await p.waitForTimeout(700); } else throw new Error('found no way to show the workflow figure'); };
const pickLayout = async (p, k) => { const l = p.locator(`label[for="wf-${k}"]`); if (!(await l.count())) throw new Error(`no ${k} layout option`);
  if (!(await l.first().isVisible())) throw new Error(`the ${k} layout option is hidden (inside a closed section or More options?)`); await l.first().click(); await p.waitForTimeout(700); };
const tick = async (p, sel) => { const e = p.locator(sel); if (!(await e.count())) throw new Error(`no control ${sel}`); if (!(await e.first().isVisible())) throw new Error(`${sel} exists but is hidden (inside a closed section?)`); await e.first().check(); await p.waitForTimeout(700); };
const project = (h, name) => h.newProject(name);

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
      {name: 'Start a project with a run', run: async ({h, src}) => { await project(h, 'UX zoom'); await h.addRun(src('his')); }},
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
];
