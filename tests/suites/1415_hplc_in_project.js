// #1415: a plain time and signal file loaded into a project is an overlay trace, not a purification run. It used to be drawn
// while the step list still showed the old step and had no step of its own, so one click on any step hid it with no way back.
// It now gets an "HPLC traces" step. Everything is driven through the UI, on a synthetic trace built here.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1415_hplc_in_project');
  const csv = () => { const rows = ['Time (min),UV 280 (mAU)']; for (let i = 0; i <= 600; i++) { const t = i/100; rows.push(`${t.toFixed(2)},${(2 + 80*Math.exp(-0.5*((t - 3)/0.08)**2)).toFixed(3)}`); } return rows.join('\n') + '\n'; };
  const file = {name: 'synthetic_hplc.csv', mimeType: 'text/csv', buffer: Buffer.from(csv())};
  const title = p => p.$eval('#ssTitle', e => e.textContent.trim());
  const drawn = p => p.$eval('#paper svg', e => e.textContent.includes('synthetic_hplc')).catch(() => false);

  await T.t('step', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('Plain trace');
      T.check('step/absent-before', !(await h.timeline()).some(x => x.k === 'hplc'), 'an HPLC traces step exists in an empty project');
      await h.addRun(file); await h.wait(800);
      const tl = await h.timeline();
      T.check('step/no-run-made', !tl.some(x => /^run:/.test(x.k)), 'a plain trace became a purification run');
      T.check('step/has-its-own-step', tl.some(x => x.k === 'hplc' && /1 trace/.test(x.s)), JSON.stringify(tl.map(x => x.k)));
      T.check('step/selected-on-load', await title(p) === 'HPLC traces' && await drawn(p), `step sheet reads "${await title(p)}", trace drawn: ${await drawn(p)}`);
      T.check('step/trace-listed', await p.locator('#list .trace').first().isVisible(), 'the trace card is not shown on its step');
      // away and back: the trace must be reachable again from the step list
      await h.step('construct');
      T.check('step/leaves', await title(p) === 'Construct' && !(await drawn(p)), `after Construct: "${await title(p)}", trace drawn: ${await drawn(p)}`);
      await h.step('hplc');
      T.check('step/comes-back', await title(p) === 'HPLC traces' && await drawn(p), `after HPLC traces: "${await title(p)}", trace drawn: ${await drawn(p)}`);
      // removing the last trace removes the step and lands somewhere sane
      await p.locator('#list .trace [data-act=del]').first().click(); await h.wait(500);
      const after = await h.timeline();
      T.check('step/gone-with-the-trace', !after.some(x => x.k === 'hplc') && await title(p) === 'Construct', `${JSON.stringify(after.map(x => x.k))}, step sheet "${await title(p)}"`);
      T.check('step/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
