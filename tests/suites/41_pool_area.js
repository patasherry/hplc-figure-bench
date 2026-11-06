const {open, H, suite, path, fs, DATA, src} = require('../lib/harness');
const T = suite('41_pool_area');

(async () => {
  const {p, errs, close} = await open(), h = H(p);

  try {
    await h.newProject('Test');
    await h.addRun(src('s200'));
    await h.wait(400);

    // use harness evaluate
    await p.evaluate(() => {
        const runEl = document.querySelector('.trace.run');
        if (runEl) {
            if (!runEl.classList.contains('sel')) runEl.click();
            const shade = runEl.querySelector('[data-k=shade]');
            if (shade) {
                shade.value = '1.A.3-1.A.5';
                shade.dispatchEvent(new Event('input', {bubbles: true}));
                shade.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }
    });
    await h.wait(400);

    const intAutoLocator = p.locator('#intAuto');
    if (await intAutoLocator.isVisible()) {
        await intAutoLocator.click();
    } else {
        await p.evaluate(() => {
          const b = document.getElementById('intAuto'); if (b) b.click();
        });
    }
    await h.wait(400);

    await p.evaluate(() => {
      const b = document.getElementById('intClear'); if (b) b.click();
    });
    await h.wait(400);

    await p.evaluate(() => {
      const b = document.getElementById('intAuto'); if (b) b.click();
    });
    await h.wait(400);

    await p.evaluate(() => {
      const rows = document.querySelectorAll('#intTable tr');
      for (let i = 0; i < rows.length; i++) {
         const row = rows[i];
         if (!row.classList.contains('pool') && !row.classList.contains('empty-row') && row.querySelector('input[data-rk="a"]')) {
             const start = row.querySelector('input[data-rk="a"]');
             const end = row.querySelector('input[data-rk="b"]');
             if (start && end) {
                 start.value = '14.00';
                 end.value = '15.50';
                 start.dispatchEvent(new Event('input', { bubbles: true }));
                 start.dispatchEvent(new Event('change', { bubbles: true }));
                 end.dispatchEvent(new Event('input', { bubbles: true }));
                 end.dispatchEvent(new Event('change', { bubbles: true }));
                 break;
             }
         }
      }
    });
    await h.wait(400);

    const poolArea = await p.evaluate(() => {
        const rows = document.querySelectorAll('#intTable tr.pool');
        if (rows.length > 0) {
            const tds = rows[0].querySelectorAll('td');
            const headers = document.querySelectorAll('#intTable th');
            let idx = -1;
            for(let i=0; i<headers.length; i++) {
                if(headers[i].textContent.includes('Area')) idx = i;
            }
            if (idx !== -1 && tds.length > idx) {
                 return tds[idx].textContent;
            }
        }
        return null;
    });

    const regionArea = await p.evaluate(() => {
      const rows = document.querySelectorAll('#intTable tr');
      const headers = document.querySelectorAll('#intTable th');
      let idx = -1;
      for(let i=0; i<headers.length; i++) {
          if(headers[i].textContent.includes('Area')) idx = i;
      }
      for (let i = 0; i < rows.length; i++) {
         const row = rows[i];
         if (!row.classList.contains('pool') && !row.classList.contains('empty-row') && row.querySelector('input[data-rk="a"]')) {
             const tds = row.querySelectorAll('td');
             if (idx !== -1 && tds.length > idx) {
                 return tds[idx].textContent;
             }
         }
      }
      return null;
    });

    T.check('areas match', poolArea !== null && poolArea !== "" && poolArea.trim() === (regionArea || '').trim(), `Pool: ${poolArea}, Region: ${regionArea}`);
  } finally {
    T.done();
    await close();
  }
})();
