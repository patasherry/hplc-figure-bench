const ndNumSemicolon = (v, delim) => {
  const s = String(v ?? '').replace(/\s/g, '');
  if (delim === ';') {
      const x = parseFloat(s.replace(',', '.'));
      return isFinite(x) ? x : null;
  }
  const m = s.match(/^[+-]?(\d*),(\d+)(?:[eE][+-]?\d+)?$/);
  const x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, ''));
  return isFinite(x) ? x : null;
};
console.log(ndNumSemicolon('1,5', ';')); // 1.5
console.log(ndNumSemicolon('1,500', ';')); // 1.5
console.log(ndNumSemicolon('1,500', ',')); // 1500
console.log(ndNumSemicolon('1,5', ',')); // 1.5
