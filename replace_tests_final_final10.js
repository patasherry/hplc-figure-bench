const fs = require('fs');
let html = fs.readFileSync('tests/suites/24_workflow_branches.js', 'utf8');

let setFromStr = `    let setFrom = async (p, h, stepKey, value) => { await h.step(stepKey); await p.selectOption('#ssFrom', value); await p.waitForTimeout(500); };

    await setFrom(p, h, tl[2].k, ids[0]);`;

if (html.includes(setFromStr)) {
  console.log("Replacing setFromStr...");
} else {
  // We need to re-add the setFrom helper function in the second test
  const target = `    tl = (await h.timeline()).filter(x => x.k.startsWith('run:'));
    ids = tl.map(x => x.k.slice(4));

    await setFrom(p, h, tl[2].k, ids[0]);`;
  const replacement = `    let tl = (await h.timeline()).filter(x => x.k.startsWith('run:'));
    let ids = tl.map(x => x.k.slice(4));

    let setFrom = async (p, h, stepKey, value) => { await h.step(stepKey); await p.selectOption('#ssFrom', value); await p.waitForTimeout(500); };

    await setFrom(p, h, tl[2].k, ids[0]);`;
  html = html.replace(target, replacement);
}

fs.writeFileSync('tests/suites/24_workflow_branches.js', html);
