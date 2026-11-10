const fs = require('fs');
const file = 'tests/suites/43_zoom_inset.js';
let content = fs.readFileSync(file, 'utf8');
const block = `
  /* zoom inset clamping and clipping */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('Zoom Test');
      await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv')); await h.wait(500);

      // check inset
      await setOpt(p, 'o-zoomInset', true); await h.wait(500);

      for (const pos of ['tr', 'tl', 'br', 'beside']) {
        await setOpt(p, 'o-zoomInsetPos', pos); await h.wait(500);

        const errors = await p.evaluate((pos) => {
            const svg = document.querySelector('#paper svg');
            const s_bb = svg.getBoundingClientRect();

            const c = document.querySelector('#zoomInsetContainer');
            if (!c) return ['no #zoomInsetContainer'];
            const errs = [];

            // 1. nothing in inset clipped by SVG boundary
            const cBox = c.getBoundingClientRect();
            const mainTexts = document.querySelectorAll('g[data-plot="main"] > g > text');

            // If not beside, the inset bounding box should not intersect main texts
            if (pos !== 'beside') {
                mainTexts.forEach(t => {
                    const tBox = t.getBoundingClientRect();
                    // relax it a bit for spacing margins that technically intersect bounding boxes but not visually
                    // The easiest is just exact intersection.
                    if (!(cBox.right <= tBox.left || cBox.left >= tBox.right || cBox.bottom <= tBox.top || cBox.top >= tBox.bottom)) {
                        errs.push(\`pos \${pos}: inset intersects main label "\${t.textContent}"\`);
                    }
                });
            }

            // Check clamping inside the drawable area. For layout, the drawable area is inside the axes.
            const texts = c.querySelectorAll('#zoom-inset text');
            texts.forEach(t => {
                const tBox = t.getBoundingClientRect();
                // Allow a small 1px margin
                if (tBox.left < s_bb.left - 2 || tBox.right > s_bb.right + 2 || tBox.top < s_bb.top - 2 || tBox.bottom > s_bb.bottom + 2) {
                    errs.push(\`pos \${pos}: inset text "\${t.textContent}" clipped by SVG viewport\`);
                }
            });

            // 3. axis labels must be within zoom-inset-bg rect.
            const bg = c.querySelector('.zoom-inset-bg');
            if (bg) {
                const bgBox = bg.getBoundingClientRect();
                texts.forEach(t => {
                    const tBox = t.getBoundingClientRect();
                    if (tBox.left < bgBox.left - 2 || tBox.right > bgBox.right + 2 || tBox.top < bgBox.top - 2 || tBox.bottom > bgBox.bottom + 2) {
                        errs.push(\`pos \${pos}: inset text "\${t.textContent}" falls outside zoom-inset-bg\`);
                    }
                });
            }

            return errs;
        }, pos);

        T.check(\`clamping/\${pos}\`, errors.length === 0, errors.length ? errors.join(' | ') : \`No clipping or overlapping issues for pos \${pos}\`);
      }
    } catch (e) { T.check('clamping/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
`;

content = content.replace(/T.done\(\);\n\}\)\(\);/g, block + '  T.done();\n})();');
fs.writeFileSync(file, content);
console.log('patched test');
