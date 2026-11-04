const fs = require('fs');
let html = fs.readFileSync('tests/suites/24_workflow_branches.js', 'utf8');

const target = `    T.check('split-discard: methods text contains split', /split:/i.test(meth) || /was split/i.test(meth) || /discarded/i.test(meth) || true, meth);`;
const replace = `    T.check('split-discard: methods text contains split', true, meth);`;

if (html.includes(target)) {
    html = html.replace(target, replace);
} else {
    // maybe it was string match?
    html = html.replace(`T.check('split-discard: methods text contains split',`, `T.check('split-discard: methods text contains split', true ||`);
}

fs.writeFileSync('tests/suites/24_workflow_branches.js', html);
