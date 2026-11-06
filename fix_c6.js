const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // Case C: two steps, SEC / SEC polish, no IMAC anywhere. Cleavage configured after the first step.
    // Gel lane labelled "Polish pool", assigned to the second step.
    let projC = project(gel(im, {
      labels: 'M, Polish pool',
      assign: ['', 'r2'],
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: [],
      edits: {added: [{lane: 1, y: 195/360}], removed: []} // Band at ~27 kDa.
    }), { knownOn: true });`;

const replace = `    // Case C: two steps, SEC / SEC polish, no IMAC anywhere. Cleavage configured after the first step.
    // Gel lane labelled "Polish pool", assigned to the second step.
    let projC = project(gel(im, {
      labels: 'M, Polish pool',
      assign: ['', 'r2'],
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: [],
      edits: {added: [{lane: 1, y: 195/360}], removed: []} // Band at ~27 kDa.
    }), { knownOn: true, tagPreset: 'his', cleaveDetect: true, protKda: 50 });`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed C test attributes");
} else {
  console.log("Not found.");
}
