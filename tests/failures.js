#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let compareMode = false;
let sinceFilter = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--compare') {
    compareMode = true;
  } else if (arg === '--since') {
    sinceFilter = args[++i];
  } else if (arg.startsWith('--since=')) {
    sinceFilter = arg.slice(8);
  }
}

const cleanSince = sinceFilter ? sinceFilter.replace(/\.(js|json)$/, '') : null;
const resultsDir = path.join(__dirname, 'results');

if (compareMode) {
  const compareFile = path.join(resultsDir, 'compare.md');
  if (!fs.existsSync(compareFile)) {
    console.error('tests/results/compare.md not found');
    process.exit(1);
  }
  const content = fs.readFileSync(compareFile, 'utf8');
  const sections = content.split(/^## /m);
  const relevantSections = [];

  for (const section of sections) {
    const firstLine = section.split('\n')[0] || '';
    if (/regressions|fixed/i.test(firstLine)) {
      if (!cleanSince) {
        relevantSections.push('## ' + section.trim());
      } else {
        const lines = section.trim().split('\n');
        const header = lines[0];
        const items = lines.slice(1).filter(l => l.trim().startsWith('- '));
        const matchingItems = items.filter(l => l.includes(cleanSince));
        relevantSections.push(`## ${header}\n` + (matchingItems.length > 0 ? matchingItems.join('\n') : 'none'));
      }
    }
  }

  console.log(relevantSections.join('\n\n'));
} else {
  if (!fs.existsSync(resultsDir)) {
    console.error('tests/results directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(resultsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const filePath = path.join(resultsDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      continue;
    }

    const suiteName = data.suite || path.basename(file, '.json');
    if (cleanSince && !suiteName.includes(cleanSince) && !file.includes(cleanSince)) {
      continue;
    }

    const checks = Array.isArray(data.checks) ? data.checks : [];
    const pass = checks.filter(c => c.ok).length;
    const fail = checks.filter(c => !c.ok).length;

    console.log(`${suiteName}: pass ${pass}, fail ${fail}`);

    for (const check of checks) {
      if (!check.ok) {
        const detail = check.detail != null ? String(check.detail).replace(/\r?\n/g, ' ').slice(0, 150) : '';
        console.log(`  ${check.id} :: ${detail}`);
      }
    }
  }
}
