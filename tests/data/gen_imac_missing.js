// Synthetic UNICORN text exports for missing-field diagnostics (#685), generated in memory.
function imacFile(id, curves, rows, sep = '\t'){
  const lines = [curves.flatMap(c => [c[0], '']), curves.flatMap(c => [c[1], c[2]]), ...rows];
  return {name: `imac_${id}.csv`, mimeType: 'text/csv', buffer: Buffer.from(lines.map(r => r.join(sep)).join('\n') + '\n')};
}
const uv = ['UV 1_280', 'ml', 'mAU'], cond = ['Conductivity', 'ml', 'mS/cm'];
function missingCases(){
  return [
    {id: 'no_uv', file: imacFile('no_uv', [cond, ['Conc B', 'ml', '%']], [[0, 10, 0, 0], [1, 10, 1, 0]]), fields: ['UV curve']},
    {id: 'no_name', file: imacFile('no_name', [['', 'ml', 'mAU'], cond], [[0, 0, 0, 10], [1, 1, 1, 10]]), fields: ['UV curve']},
    {id: 'no_volume', file: imacFile('no_volume', [uv, cond], [['', 0, 0, 10], ['', 1, 1, 10]]), fields: ['UV 1_280 volume (mL)']},
    {id: 'no_absorbance', file: imacFile('no_absorbance', [uv], [[0, ''], [1, '']]), fields: ['UV 1_280 absorbance (mAU)']},
    {id: 'malformed', file: imacFile('malformed', [uv], [[0, '0bad'], [1, '0bad']], ','), fields: ['UV 1_280 absorbance (mAU)']},
    {id: 'empty', file: imacFile('empty', [uv], [], ','), fields: ['UV 1_280 volume (mL)', 'UV 1_280 absorbance (mAU)']},
    {id: 'time', file: imacFile('time', [['UV 1_280', 'min', 'AU']], [['', '0,5'], ['', '1,5']], ';'), fields: ['UV 1_280 time (min)']},
    {id: 'unpaired', file: imacFile('unpaired', [uv], [[0, ''], ['', 1], [2, ''], ['', 3]]), fields: ['UV 1_280 paired volume/absorbance data points (at least 2)']},
    {id: 'one_point', file: imacFile('one_point', [uv], [[0, 0]]), fields: ['UV 1_280 paired volume/absorbance data points (at least 2)']},
    {id: 'two_uvs', file: imacFile('two_uvs', [uv, ['UV 2_260', 'ml', 'mAU']], [[0, '', '', 1], [1, '', '', 2]]), fields: ['UV 1_280 absorbance (mAU)', 'UV 2_260 volume (mL)']}
  ];
}
function validCases(){
  return [
    {id: 'uv_only', file: imacFile('uv_only', [uv], [[0, 0], [1, 1], [2, 0]])},
    {id: 'partial', file: imacFile('partial', [uv, ['UV 2_260', 'ml', 'mAU'], cond], [[0, 0, 0, '', 0, ''], [1, 1, 1, '', 1, ''], [2, 0, 2, '', 2, '']])}
  ];
}
module.exports = {missingCases, validCases};
