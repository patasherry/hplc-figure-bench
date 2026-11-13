#!/usr/bin/env node
/**
 * codemap.js - Scan hplc-figure-bench(WF1.13).html for section markers and print line ranges.
 * 
 * Usage:
 *   node tests/tools/codemap.js [--plain] [--write] [path/to/app.html]
 *   --write updates the line ranges in docs/CODEMAP.md in place.
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

// --write: bring the line ranges in docs/CODEMAP.md up to date in place, keeping each section's Purpose text. A section the
// app gained gets a row with an empty purpose, and a row whose section is gone is dropped. The Code map workflow runs this
// after every merge that changes the app, because agents open the lines this table names.
if (process.argv.includes('--write')) {
  const mapPath = path.resolve(__dirname, '../../docs/CODEMAP.md');
  const doc = fs.readFileSync(mapPath, 'utf8').split('\n');
  const head = doc.findIndex(l => /^\|\s*Lines\s*\|\s*Section\s*\|/.test(l));
  if (head < 0) { console.error('Error: no "| Lines | Section |" table in docs/CODEMAP.md'); process.exit(1); }
  let end = head + 2; while (end < doc.length && /^\|/.test(doc[end])) end++;
  const purpose = {};
  doc.slice(head + 2, end).forEach(l => { const m = /^\|[^|]*\|\s*`(.*?)`\s*\|(.*)\|\s*$/.exec(l); if (m) purpose[m[1]] = m[2].trim(); });
  const rows = sections.map(s => `| ${s.startLine}–${s.endLine} | \`${s.name}\` | ${purpose[s.name] || ''} |`);
  const next = doc.slice(0, head + 2).concat(rows, doc.slice(end)).join('\n');
  if (next === doc.join('\n')) { console.log('docs/CODEMAP.md is up to date'); process.exit(0); }
  fs.writeFileSync(mapPath, next);
  console.log(`docs/CODEMAP.md updated: ${rows.length} sections`);
  process.exit(0);
}

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
