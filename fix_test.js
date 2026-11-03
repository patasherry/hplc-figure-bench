const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const updatedHtml = html.replace(
  /const T = numOr\(opt\.tagKda, \(TAG_PRESETS\[opt\.tagPreset\] \|\| \[\]\)\[1\]\);/,
  `const FT = protForms()[2];\n  const T = numOr(opt.tagKda, FT ? FT.mass/1000 : (TAG_PRESETS[opt.tagPreset] || [])[1]);`
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', updatedHtml);
