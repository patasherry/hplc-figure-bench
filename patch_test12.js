const fs = require('fs');
let tests = fs.readFileSync('tests/suites/15_import_sec.js', 'utf8');

const injection = `
  await fresh('unicorn-comma', async (p, h) => {
    // new check for comma-decimal parsing regression
    await h.newProject('Synthetic comma numbers');
    await h.addRun(require('path').join(__dirname, '..', 'data', 'chrom', 'sec_semicolon_unicorn7.csv'));
    await p.waitForTimeout(500);
    const data2 = await saved(p), r2 = data2.runs[data2.runs.length - 1];
    T.check('decimal-comma-sec', r2.uvs[0].xs.includes(14.48) || r2.uvs[0].xs.includes(14.5), 'Comma decimal in SEC trace parsed correctly');

    await h.addRun(F.unicorn('sec_comma.tsv', true)); const data = await saved(p), r = data.runs[data.runs.length - 1];
`;

tests = tests.replace(/  await fresh\('unicorn-comma', async \(p, h\) => \{\s*await h\.newProject\('Synthetic comma numbers'\);\s*await h\.addRun\(F\.unicorn\('sec_comma\.tsv', true\)\); const data = await saved\(p\), r = data\.runs\[0\];/, injection);

fs.writeFileSync('tests/suites/15_import_sec.js', tests);
