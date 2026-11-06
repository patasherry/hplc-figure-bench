// 49 project name label: the header project-name field has a visible, accessible label (#1038).
// Patrick should be able to tell immediately that the header text box names the current project,
// rather than mistaking "UX save" for a save-state message or search field.
// UI and DOM only.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('49_project_name_label');

  for (const width of [1400, 390]) {
    const {p, errs, close} = await open({width, height: width < 600 ? 844 : 900}), h = H(p);
    p.setDefaultTimeout(10000);

    await T.t(`${width}:label-visible-and-accessible`, async () => {
      // On the home screen before opening a project, the project bar is hidden
      T.check(`${width}:home-bar-hidden`, await p.locator('#projBar').isHidden());

      await h.newProject('UX save');
      const bar = p.locator('#projBar');
      const label = p.locator('label[for="projName"]');
      const input = p.locator('#projName');

      T.check(`${width}:bar-visible`, await bar.isVisible());
      const exists = (await label.count()) === 1;
      T.check(`${width}:label-exists`, exists);
      const vis = exists && (await label.isVisible());
      T.check(`${width}:label-visible`, vis);

      const labelText = vis ? (await label.innerText()).trim() : '';
      T.check(`${width}:label-text`, labelText === 'Project', `Expected "Project", got "${labelText}"`);

      // Accessible association: clicking label focuses the input
      if (vis) {
        await label.click();
      }
      const focusedId = await p.evaluate(() => document.activeElement ? document.activeElement.id : null);
      T.check(`${width}:label-focuses-input`, focusedId === 'projName', `Focused: ${focusedId}`);

      // Input value and placeholder
      const val = await input.inputValue();
      T.check(`${width}:input-value`, val === 'UX save', `Expected "UX save", got "${val}"`);
      const ph = await input.getAttribute('placeholder');
      T.check(`${width}:placeholder-present`, ph === 'Project name', `Expected "Project name", got "${ph}"`);

      // Spatial check: label is visible, within viewport, and beside the input (not overlapping)
      const lr = vis ? await label.boundingBox() : null;
      const ir = await input.boundingBox();
      T.check(`${width}:label-in-viewport`, !!lr && lr.x >= 0 && lr.x + lr.width <= width, JSON.stringify(lr));
      T.check(`${width}:label-beside-input`, !!lr && !!ir && lr.x + lr.width <= ir.x + 2 && Math.abs(lr.y - ir.y) < 20,
        `label: ${JSON.stringify(lr)}, input: ${JSON.stringify(ir)}`);

      // No horizontal scroll introduced by the header layout
      T.check(`${width}:no-hscroll`, !(await h.hScroll()), 'page has no horizontal overflow');
    });

    T.check(`${width}:no-page-errors`, !errs.length, errs.join(' | '));
    await close();
  }

  T.done();
})();
