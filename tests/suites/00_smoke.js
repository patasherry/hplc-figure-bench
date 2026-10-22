// Smoke: the page loads, a project opens, a run loads. Proves the harness itself works.
const {open, H, suite, src} = require('../lib/harness');
(async () => { const T = suite('00_smoke'), {p, errs, close} = await open(), h = H(p);
  await T.t('load', async () => { T.check('home', await p.$('#npName')); await h.newProject('Smoke'); T.check('timeline', (await h.timeline()).length > 3);
    await h.addRun(src('secZip')); T.check('zip run loads', (await h.timeline()).some(x => /Size exclusion/.test(x.t))); });
  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
