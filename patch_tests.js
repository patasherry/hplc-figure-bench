const fs = require('fs');
let content = fs.readFileSync('tests/suites/10_data_truth.js', 'utf-8');

// Ensure that EXP.synthetic exists in tests/data/expected.json
let expData = JSON.parse(fs.readFileSync('tests/data/expected.json', 'utf-8'));
if (!expData.synthetic) {
  expData.synthetic = [{file: 'synthetic.csv'}];
  fs.writeFileSync('tests/data/expected.json', JSON.stringify(expData, null, 2));
}

// Make sure the loop actually runs
content = content.replace(
  'for (const e of EXP.synthetic || []) { if (only && !only.test(e.file)) continue; await T.t(e.file, () => syntheticFile(e)); }',
  'for (const e of EXP.synthetic || []) { await T.t(e.file, () => syntheticFile(e)); }'
);
fs.writeFileSync('tests/suites/10_data_truth.js', content);
