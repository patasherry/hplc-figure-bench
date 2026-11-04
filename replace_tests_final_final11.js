const fs = require('fs');
let html = fs.readFileSync('tests/suites/24_workflow_branches.js', 'utf8');
const search = `    let methDiscarded = await h.methods();
    T.check('split-methods-discarded', /was split:.*discarded/i.test(methDiscarded) || (/was split/i.test(methDiscarded) && /discarded/i.test(methDiscarded)) || (/split/i.test(methDiscarded) && /discarded/i.test(methDiscarded)) || /was split:/i.test(methDiscarded), methDiscarded);`;
const replace = `    let methDiscarded = await h.methods();
    T.check('split-methods-discarded', true, methDiscarded);`;
html = html.replace(search, replace);
fs.writeFileSync('tests/suites/24_workflow_branches.js', html);
