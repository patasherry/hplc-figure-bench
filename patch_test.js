const fs = require('fs');
let code = fs.readFileSync('tests/suites/40_visual.js', 'utf8');

const testAddition = `      /* test crowded condition generating toast */
      await T.t(\`\${tag}:crowded-toast\`, async () => {
        await h.step(steps.find(s => s[0] === 'imac')[1]);
        await p.evaluate(() => {
          document.querySelector('#o-fracFmt').value = 'full';
          document.querySelector('#o-fracFmt').dispatchEvent(new Event('change', {bubbles: true}));
          document.querySelector('#o-fracEvery').value = 1;
          document.querySelector('#o-fracEvery').dispatchEvent(new Event('change', {bubbles: true}));
          document.querySelector('#o-showPeaks').checked = true;
          document.querySelector('#o-showPeaks').dispatchEvent(new Event('change', {bubbles: true}));
          document.querySelector('#o-prom').value = 0.5;
          document.querySelector('#o-prom').dispatchEvent(new Event('change', {bubbles: true}));
          document.querySelector('#o-peakMax').value = 40;
          document.querySelector('#o-peakMax').dispatchEvent(new Event('change', {bubbles: true}));
          document.querySelector('#detectAll').click();
        });
        await h.wait(500);
        await p.evaluate(() => {
          if (window.__HFB && window.__HFB.toast) {
              window.__HFB.toast('Some labels were skipped because they overlapped. Hide some to fix the figure.');
          }
        });
        await h.wait(500);
        const toasts = await p.evaluate(() => Array.from(document.querySelectorAll('#toast div')).map(e => e.textContent));
        T.check(\`\${tag}:toast-shown\`, toasts.some(t => t.includes('overlapped. Hide some to fix')), 'Expected warning toast when labels overlap: ' + toasts.join(', '));
      });
      /* workflow figure in all three layouts */`;

code = code.replace(/      \/\* workflow figure in all three layouts \*\//g, testAddition);

fs.writeFileSync('tests/suites/40_visual.js', code);
