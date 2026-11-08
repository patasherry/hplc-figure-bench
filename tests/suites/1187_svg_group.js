// 1187: Copy SVG and Save SVG sit in one group; Save PNG stays beside its DPI selector; no overflow at 390 px.
const {open, suite} = require('../lib/harness');
(async () => { const T = suite('1187_svg_group'), {p, errs, close} = await open({width: 390, height: 844});
  await T.t('svg-group', async () => {
    await p.click('#homeQuick'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const g = id => document.getElementById(id), box = id => g(id).getBoundingClientRect();
      const grp = g('copySvg').parentElement, png = g('savePng').parentElement;
      return {same: grp === g('saveSvg').parentElement, grpHasPng: grp.contains(g('savePng')),
        pngPair: png.contains(g('o-dpi')) && png !== grp, copy: box('copySvg'), save: box('saveSvg'), pngB: box('savePng'), dpi: box('o-dpi'),
        sw: document.documentElement.scrollWidth, vw: innerWidth, vis: ['copySvg','saveSvg','savePng','o-dpi'].every(i => box(i).width > 0)};
    });
    T.check('Copy and Save SVG share one group', r.same && !r.grpHasPng, JSON.stringify(r));
    T.check('Save PNG and DPI share a pair', r.pngPair);
    T.check('all visible', r.vis);
    const adjacent = (a, b) => Math.abs(a.top - b.top) < 4 ? a.right <= b.left + 1 : a.bottom <= b.top + 1;
    T.check('Copy SVG before Save SVG', adjacent(r.copy, r.save), JSON.stringify([r.copy, r.save]));
    T.check('PNG pair does not split the SVG group', !(r.pngB.left > r.copy.right && r.pngB.right < r.save.left && Math.abs(r.pngB.top - r.copy.top) < 4));
    T.check('DPI right of Save PNG', adjacent(r.pngB, r.dpi));
    T.check('no horizontal overflow', r.sw <= r.vw, r.sw + ' vs ' + r.vw);
  });
  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
