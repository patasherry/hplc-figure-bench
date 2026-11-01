const {open, H, suite, src} = require('../lib/harness');
const fs = require('fs');
(async () => {
  const T = suite('99_band_overlap'), {p, errs, close} = await open(), h = H(p);
  await T.t('band-controls-no-overlap', async () => {
    // narrow viewport
    await p.setViewportSize({ width: 600, height: 800 });

    // add a gel to trigger both onboarding prompt and toast
    await h.newProject('Test Overlap');

    // Check for gel file input, drop a gel image.
    await p.locator('#gelFile').setInputFiles(src('gel'));
    await h.wait(500);

    // After uploading gel, the UI transitions to the gel view.
    // The "toast" should tell us gel is added.
    const toastVisible = await p.evaluate(() => {
        const el = document.getElementById('toast');
        return el && !el.hidden && getComputedStyle(el).display !== 'none';
    });

    T.check('toast-visible', toastVisible, 'Toast should be visible');

    // We expect the app's `updatePrompt` function to have automatically added the `overlap` class to `#toast` if `#markPrompt` is not hidden.
    // However, our previous run showed it wasn't triggered natively by just adding the gel.
    // Let's trigger it by starting to mark ladder bands.
    await p.click('#g-mark');
    await h.wait(200);

    const promptVisible = await p.evaluate(() => {
        const el = document.getElementById('markPrompt');
        return el && !el.hidden && getComputedStyle(el).display !== 'none';
    });

    T.check('prompt-visible', promptVisible, 'Mark prompt should be visible after clicking mark');

    // Ensure the toast has .overlap when prompt is visible
    const hasOverlapClass = await p.evaluate(() => document.getElementById('toast').classList.contains('overlap'));
    T.check('toast-has-overlap', hasOverlapClass, 'Toast should have overlap class when prompt is visible');

    // Verify toast is shifted up to not overlap band panel
    const toastBottom = await p.evaluate(() => {
        const toastEl = document.getElementById('toast');
        return parseInt(window.getComputedStyle(toastEl).bottom, 10);
    });
    T.check('toast-is-shifted', toastBottom >= 70, `Toast bottom is ${toastBottom}`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close(); T.done();
})();
