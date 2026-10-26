const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const replacement = `const SEC_COLUMNS = {
  s200i3: {name: 'Superdex 200 Increase 3.2/300', vt: 2.4, re: /3\\.2\\s*[\\/-]\\s*300.*200|200.*3\\.2\\s*[\\/-]\\s*300/i},
  s200i: {name: 'Superdex 200 Increase 10/300 GL', vt: 24, re: /200\\s*inc|s200\\s*i\\b|sd200\\s*i|200i|s200|sd ?200|superdex ?200(?!.*(16|26|3\\.2)\\s*[\\/-]?\\s*(600|300))/i},
  s75i: {name: 'Superdex 75 Increase 10/300 GL', vt: 24, re: /75\\s*inc|s75\\s*i\\b|s75|sd ?75|superdex ?75(?!.*(16|26)\\s*[\\/-]?\\s*600)/i},
  s6i: {name: 'Superose 6 Increase 10/300 GL', vt: 24, re: /superose\\s*6|s6\\s*i\\b|\\bs6\\b/i},
  s200i5: {name: 'Superdex 200 Increase 5/150 GL', vt: 3, re: /200.*5\\s*[\\/-]\\s*150|5\\s*[\\/-]\\s*150.*200/i},
  s75i5: {name: 'Superdex 75 Increase 5/150 GL', vt: 3, re: /75.*5\\s*[\\/-]\\s*150|5\\s*[\\/-]\\s*150.*75/i},
  hl16s200: {name: 'HiLoad 16/600 Superdex 200 pg', vt: 120, re: /16\\s*[\\/-]?\\s*600.*200|200.*16\\s*[\\/-]?\\s*600|hiload(?!.*(26|75))/i},
  hl16s75: {name: 'HiLoad 16/600 Superdex 75 pg', vt: 120, re: /16\\s*[\\/-]?\\s*600.*75|75.*16\\s*[\\/-]?\\s*600/i},
  hl26s200: {name: 'HiLoad 26/600 Superdex 200 pg', vt: 320, re: /26\\s*[\\/-]?\\s*600.*200|200.*26\\s*[\\/-]?\\s*600|26\\s*[\\/-]?\\s*600(?!.*75)/i},
  hl26s75: {name: 'HiLoad 26/600 Superdex 75 pg', vt: 320, re: /26\\s*[\\/-]?\\s*600.*75|75.*26\\s*[\\/-]?\\s*600/i},
  custom: {name: 'Other column', vt: '', re: null}};
const SEC_ORDER = ['s200i3', 's200i5', 's75i5', 'hl26s75', 'hl26s200', 'hl16s75', 'hl16s200', 's6i', 's75i', 's200i'];`;

code = code.replace(/const SEC_COLUMNS = \{[\s\S]*?const SEC_ORDER = \['s200i5', 's75i5', 'hl26s200', 'hl16s75', 'hl16s200', 's6i', 's75i', 's200i'\];/, replacement);

const colNameReplacement = `  if (isSec(r)) { const c = secCalFor(r); if (c && c.col && c.col !== 'custom' && SEC_COLUMNS[c.col]) return SEC_COLUMNS[c.col].name; const g = secColumnGuess(r); return g !== 'custom' ? SEC_COLUMNS[g].name : (r.colLog || 'Other column'); }`;

code = code.replace(/  if \(isSec\(r\)\) \{ const c = secCalFor\(r\); if \(c && c.col && c.col !== 'custom' && SEC_COLUMNS\[c.col\]\) return SEC_COLUMNS\[c.col\]\.name; const g = secColumnGuess\(r\); return g !== 'custom' \? SEC_COLUMNS\[g\]\.name : ''; \}/, colNameReplacement);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
