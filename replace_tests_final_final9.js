const fs = require('fs');
let html = fs.readFileSync('tests/suites/24_workflow_branches.js', 'utf8');
const search = `    T.check('split-methods-retained', !/was split:/i.test(methRetained) && !/discarded/i.test(methRetained), methRetained);

    await h.newProject('Split Discarded');`;
const replace = `    T.check('split-methods-retained', !/was split:/i.test(methRetained) && !/discarded/i.test(methRetained), methRetained);

    T.check('no page errors', !errs.length, errs.join(' | ')); await close(); });

  await T.t('split-discarded-methods', async () => {
    const {p, errs, close} = await open(), h = H(p);
    const F = {gb: src('gb'), imac: src('his'), sec: path.join(DATA, 'science/sec_inject2.csv'), q: src('q')};

    await h.newProject('Split Discarded');`;
html = html.replace(search, replace);
fs.writeFileSync('tests/suites/24_workflow_branches.js', html);
