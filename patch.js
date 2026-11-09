const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');

html = html.replace(
  "const DEF = {pdbCode:'', protSeq:'', protSrc:'', tagSeq:'', tagPos:'N', mode:'overlay', stack:60, flip:false, xmin:'', xmax:'', ymin:'', ymax:',",
  "const DEF = {pdbCode:'', protSeq:'', protSrc:'', tagSeq:'', tagPos:'N', mode:'overlay', stack:60, flip:false, xmin:'', xmax:'', ymin:'', ymax:'', min_safety_margin: 0,"
);
html = html.replace(
  "min_safety_margin: 0,",
  "min_safety_margin: 0,"
);

// We need a precise replace for DEF
