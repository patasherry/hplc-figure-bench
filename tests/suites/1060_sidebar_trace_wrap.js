// Issue #1060: Allow multi-line trace names in sidebar with two-line clamping and scrolling trace container
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1060_sidebar_trace_wrap'), {p, errs, close} = await open(), h = H(p);

  await T.t('trace-name-two-line-clamp-and-scroll', async () => {
    await h.newProject('Trace Wrap Test');
    await h.wait(500);

    // Check CSS on an existing .tl .tt element
    const ttStyles = await p.evaluate(() => {
      const el = document.querySelector('.tl .tt');
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        whiteSpace: s.whiteSpace,
        webkitLineClamp: s.webkitLineClamp || s.getPropertyValue('-webkit-line-clamp'),
        overflow: s.overflow
      };
    });

    T.check('tl-tt-white-space-normal', ttStyles && ttStyles.whiteSpace === 'normal', `whiteSpace: ${ttStyles?.whiteSpace}`);
    T.check('tl-tt-line-clamp-2', ttStyles && ttStyles.webkitLineClamp === '2', `lineClamp: ${ttStyles?.webkitLineClamp}`);

    // Check .traces container has overflow-y auto
    const tracesOverflow = await p.evaluate(() => {
      const el = document.querySelector('.traces');
      return el ? window.getComputedStyle(el).overflowY : null;
    });
    T.check('traces-overflow-y-auto', tracesOverflow === 'auto', `overflowY: ${tracesOverflow}`);

    // Check with an actual long title in timeline
    await p.evaluate(() => {
      const tt = document.querySelector('.tl li .tt');
      if (tt) tt.textContent = 'Superdex 200 Increase 10/300 GL - Preparative size-exclusion chromatography of target protein peak';
    });

    const wrapHeight = await p.evaluate(() => {
      const tt = document.querySelector('.tl li .tt');
      return tt ? tt.offsetHeight : 0;
    });
    T.check('long-title-wraps-multiple-lines', wrapHeight > 24, `height: ${wrapHeight}`);
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
