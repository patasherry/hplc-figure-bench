const {open, H, suite, src} = require('../lib/harness');

(async () => {
  const T = suite('1305_clone');
  const {p, errs, close} = await open();
  const h = H(p);

  await T.t('clone_handoff', async () => {
    await h.newProject('TestClone');

    // Add clones
    await h.step('construct');

    await p.evaluate(() => {
        let cb = document.querySelector('#pr-on');
        if (cb && !cb.checked) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });

    await h.step('transform');

    await p.evaluate(() => {
        let ptr = document.querySelector('.sub[data-sub="ptr"]');
        if (ptr) {
            ptr.hidden = false;
            ptr.open = true;
        }
    });

    await p.waitForSelector('#trAddClone', {state: 'attached'});
    await p.evaluate(() => document.querySelector('#trAddClone').click());
    await p.evaluate(() => document.querySelector('#trAddClone').click());

    await p.waitForSelector('.clone-card');

    await p.fill('.clone-card:nth-child(1) .c-name', 'C1');
    await p.fill('.clone-card:nth-child(1) .c-strain', 'BL21');

    await p.fill('.clone-card:nth-child(2) .c-name', 'C2');
    await p.fill('.clone-card:nth-child(2) .c-strain', 'Rosetta');
    await p.selectOption('.clone-card:nth-child(2) .c-status', 'failed');

    await p.evaluate(() => document.querySelector('.clone-card:nth-child(1) .c-sel').click());

    // Fill basic fields so the method text renders
    await p.fill('#pr-trPlasmid', 'Plasmid1');
    await p.fill('#pr-trMethod', 'heat shock');
    await p.fill('#pr-trSel', 'Kan');
    await p.evaluate(() => {
        let el = document.querySelector('#pr-trSel');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Wait for the debounced render to occur
    await p.waitForTimeout(500);

    await h.step('figure');

    await p.evaluate(() => {
        const mb = document.querySelector('#methodsBox');
        if (mb) {
            mb.open = true;
            mb.dispatchEvent(new Event('toggle', { bubbles: true }));
        }
    });
    await p.waitForTimeout(500);

    const txt = await p.evaluate(() => document.querySelector('#methodsText').value);
    T.check('Methods uses clone strain', txt.includes('E. coli BL21'));

    await h.step('transform');

    // Set clone 1 to failed, selected should drop
    await p.selectOption('.clone-card:nth-child(1) .c-status', 'failed');

    await p.evaluate(() => {
        let el = document.querySelector('.clone-card:nth-child(1) .c-status');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await p.waitForTimeout(500);

    await h.step('figure');

    await p.evaluate(() => {
        const mb = document.querySelector('#methodsBox');
        if (mb) {
            mb.open = true;
            mb.dispatchEvent(new Event('toggle', { bubbles: true }));
        }
    });

    await p.waitForTimeout(500);
    const txt2 = await p.evaluate(() => document.querySelector('#methodsText').value);
    T.check('Methods drops clone strain after failure', !txt2.includes('E. coli BL21'));
  });

  await close();
  T.done();
})();
