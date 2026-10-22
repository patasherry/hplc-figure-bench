// The app under test: APP=/path/to/app.html, else the hplc-figure-bench*.html in the repository root.
// Kept separate from harness.js, which starts a local server when loaded.
const fs = require('fs'); const path = require('path');
const repo = path.resolve(__dirname, '..', '..');
module.exports = path.resolve(process.env.APP || path.join(repo, fs.readdirSync(repo).find(f => /^hplc-figure-bench.*\.html$/.test(f)) || 'hplc-figure-bench.html'));
