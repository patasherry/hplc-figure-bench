// Deterministic synthetic inputs for import and SEC calibration regressions.
// No measurements or files from a laboratory are used.
const file = (name, text) => ({name, mimeType: 'text/plain', buffer: Buffer.from(text)});
function unicorn(name = 'sec_Superdex 75 Increase 5-150 GL.tsv', comma = false){
  const n = v => comma ? v.toFixed(2).replace('.', ',') : v.toFixed(2);
  const rows = ['UV 1_280\t\tConductivity\t\tFraction\t', 'ml\tmAU\tml\tmS/cm\tml\t'];
  for (let i = 0; i <= 40; i++) {
    const x = i / 4, y = 2.5 + 100 * Math.exp(-Math.pow((x - 4.5) / 0.5, 2));
    rows.push([n(x), n(y), n(x), n(12.5 + x / 10), i % 4 === 0 ? n(x) : '', i % 4 === 0 ? 'F' + i / 4 : ''].join('\t'));
  }
  return file(name, rows.join('\n'));
}
function project(){
  const centers = [0.5, 2, 4, 6, 7, 9], heights = [900, 20, 10, 15, 400, 1200], xs = [], ys = [];
  for (let i = 0; i <= 400; i++) {
    const x = i / 40; xs.push(x);
    ys.push(centers.reduce((v, c, k) => v + heights[k] * Math.exp(-Math.pow((x - c) / 0.06, 2)), 0));
  }
  const stds = [{name: 'Small', kda: 30, ve: 6.6}, {name: 'Large', kda: 300, ve: 2.6},
    {name: 'Unticked', kda: 200, ve: 3.3, off: true}, {name: 'Middle', kda: 100, ve: 4.6}];
  return {app: 'HPLC Figure Bench', version: 1, cur: 'r1', traces: [], gels: [], nanodrop: [], prep: {},
    opt: {smooth: 1, baseline: false, intMethod: 'trap', intBase: 'line', secCals: [
      {id: 'scTest', name: 'Synthetic standards', col: 'custom', unit: 'mL', v0: 1, vt: 8, set: 'custom', stds}]},
    runs: [{id: 'r1', name: 'Synthetic SEC standards', file: 'sec_standards.tsv', xu: 'ml', uvi: 0, color: '#0072B2',
      xmin: '', xmax: '', ymin: '', ymax: '', shade: '', inWf: true, secMode: 'on', secCal: 'scTest', crop: 'full',
      uvs: [{name: 'UV 1_280', yu: 'mAU', xs, ys}], fracs: [], phases: [],
      integ: centers.map(x => ({a: x - 0.2, b: x + 0.2}))}]};
}
function nd(name, readings, dates = true){
  const head = dates ? ['Sample Name', 'A280', 'Concentration', 'Date', 'Time'] : ['Sample Name', 'A280', 'Concentration'];
  return file(name, [head.join('\t'), ...readings.map(r => r.join('\t'))].join('\n'));
}
module.exports = {file, unicorn, project, nd};
