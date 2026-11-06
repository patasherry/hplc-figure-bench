// The name the user sees is "Protein Purification Bench" (the Direction board's unanimous choice, #222, 2026-10-30),
// while the project-file schema, the settings key and the database keep their old names so nothing saved before the
// rename stops loading. Both halves are checked here: renaming the schema field would break every existing project file.
const {open, H, suite, src} = require('../lib/harness');
const NAME = 'Protein Purification Bench', OLD = 'HPLC Figure Bench';
(async () => { const T = suite('01_name'), {p, errs, close} = await open(), h = H(p);

  await T.t('shown-to-the-user', async () => {
    T.check('title', (await p.title()) === NAME, await p.title());
    const h1 = (await p.locator('h1').first().innerText()).trim();
    T.check('header', h1 === NAME, h1);
    T.check('no HPLC-only name on screen', !(await p.evaluate(o => document.body.innerText.includes(o), OLD)));
  });

  await T.t('project-file-keeps-the-old-schema-name', async () => {
    await h.newProject('Name check');
    await h.addRun(src('his'));
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 15000}), p.click('#projSave')]);
    const data = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf-8'));
    /* an exported file must still say the old name, or a copy of the app from before the rename cannot open it */
    T.check('exported app field', data.app === OLD, JSON.stringify(data.app));
    T.check('settings key', await p.evaluate(() => localStorage.getItem('hplc-fig-opt') !== null));
  });

  await T.t('a-file-saved-before-the-rename-still-imports', async () => {
    const before = {app: OLD, version: 1, saved: '2026-10-01T00:00:00.000Z', cur: null, opt: {}, runs: [], traces: [], gels: [], projects: []};
    const msg = await p.evaluate(async j => {
      const dt = new DataTransfer();
      dt.items.add(new File([j], 'old_project.json', {type: 'application/json'}));
      document.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true, cancelable: true}));
      await new Promise(r => setTimeout(r, 1200));
      const t = document.getElementById('toast');
      return t ? t.innerText : '';
    }, JSON.stringify(before));
    T.check('not rejected as the wrong kind of file', !/is not a project/i.test(msg), msg);
  });

  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
