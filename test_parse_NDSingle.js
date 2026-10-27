const ndNumOriginal = v => { const s = String(v ?? '').replace(/\s/g, ''), m = s.match(/^[+-]?(\d*),(\d+)(?:[eE][+-]?\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };
console.log(ndNumOriginal("2.500"));
