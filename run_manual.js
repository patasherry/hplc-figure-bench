const {execSync} = require('child_process');
try {
  const result = execSync('node tests/suites/43_zoom_inset.js', {encoding: 'utf8', stdio: 'pipe'});
  console.log(result);
} catch (e) {
  console.log(e.stdout);
  console.log(e.stderr);
}
