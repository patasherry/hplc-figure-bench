const {open, H, suite, path, fs, DATA} = require('../lib/harness');

(async () => {
    const T = suite('861_ui');
    const {p, errs, close} = await open();

    await T.t('UI - .intp has overflow-y and .readout has z-index', async () => {
        const intpOverflowY = await p.evaluate(() => {
            const el = document.querySelector('.intp');
            return el ? window.getComputedStyle(el).overflowY : null;
        });
        T.check('intp_overflow', intpOverflowY === 'auto', 'Peak Integration container (.intp) must have overflow-y: auto');

        const readoutZIndex = await p.evaluate(() => {
            const el = document.querySelector('.readout');
            return el ? window.getComputedStyle(el).zIndex : null;
        });
        T.check('readout_z_index', readoutZIndex === '10', '.readout tooltip must have z-index: 10');
    });

    await close();
    T.done();
})();
