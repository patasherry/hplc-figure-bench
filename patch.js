const fs = require('fs');
const file = 'tests/suites/43_zoom_inset.js';
let content = fs.readFileSync(file, 'utf8');

// The file got added twice, let's remove the second block
const start = content.indexOf('/* zoom inset clamping and clipping */');
const next = content.indexOf('/* zoom inset clamping and clipping */', start + 10);
if (next !== -1) {
  content = content.substring(0, next);
  fs.writeFileSync(file, content + '  T.done();\n})();');
  console.log('patched');
}
