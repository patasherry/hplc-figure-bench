#!/usr/bin/env node
/**
 * codemap.js - Scan hplc-figure-bench(WF1.13).html for section markers and print line ranges.
 *
 * Usage:
 *   node tests/tools/codemap.js [--table] [path/to/app.html]
 */

const fs = require('fs');
const path = require('path');

// Locate the HTML file
const defaultPaths = [
  path.resolve(__dirname, '../../hplc-figure-bench(WF1.13).html'),
  path.resolve(process.cwd(), 'hplc-figure-bench(WF1.13).html'),
  path.resolve(__dirname, '../hplc-figure-bench(WF1.13).html')
];

let appPath = process.argv.slice(2).find(arg => !arg.startsWith('--'));
if (!appPath) {
  appPath = defaultPaths.find(p => fs.existsSync(p));
}

if (!appPath || !fs.existsSync(appPath)) {
  console.error('Error: Could not find hplc-figure-bench(WF1.13).html');
  process.exit(1);
}

const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

const markerRegex = /\/\*\s*----------\s*(.*?)\s*----------\s*\*\//;
const sections = [];

lines.forEach((line, index) => {
  const match = line.match(markerRegex);
  if (match) {
    sections.push({
      startLine: index + 1,
      name: match[1].trim(),
      raw: line.trim()
    });
  }
});

// Determine end line for each section
// The last section ends where the enclosing script ends (before </script>)
let scriptEndLine = lines.length;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</script>')) {
    scriptEndLine = i; // line before </script>
    break;
  }
}

for (let i = 0; i < sections.length; i++) {
  if (i < sections.length - 1) {
    sections[i].endLine = sections[i + 1].startLine - 1;
  } else {
    sections[i].endLine = scriptEndLine;
  }
}

const isTable = !process.argv.includes('--plain'); // default to table format unless --plain is passed

if (isTable) {
  console.log('| Lines | Section | Purpose |');
  console.log('|---|---|---|');
  sections.forEach(s => {
    console.log(`| ${s.startLine}–${s.endLine} | \`${s.name}\` | |`);
  });
} else {
  sections.forEach(s => {
    console.log(`${s.startLine}-${s.endLine}: ${s.name}`);
  });
}
