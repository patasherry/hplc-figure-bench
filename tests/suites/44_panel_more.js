// 44 panel more: rarely used settings sit under a "More options" disclosure in their section; a changed setting stays visible; the search box finds them. UI and DOM only.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('44_panel_more'), {p, errs, close} = await open(), h = H(p);
  const vis = sel => p.locator(sel).isVisible();
  const more = '#panel details.more[data-more="Figure style"]';

  await T.t('panel_more', async () => {
    await p.click('#homeQuick'); await h.wait(1200);
    T.check('line_width_hidden_at_first', await p.locator('#o-lw').count() === 1 && !(await vis('#o-lw')), 'Line width should start under More options');
    T.check('common_setting_visible', await vis('#o-w'), 'Width stays in view');
    await p.locator(more + ' > summary').click(); await h.wait(200);
    T.check('more_options_shows_it', await vis('#o-lw'), 'Line width visible after clicking More options');
    await p.locator(more + ' > summary').click(); await h.wait(200);
    T.check('closes_again', !(await vis('#o-lw')), 'closed again');

    /* search finds it, and clearing restores the closed state */
    await p.fill('#panelSearch', 'line width'); await h.wait(250);
    T.check('search_shows_it', await vis('#o-lw'), 'typing the label shows the control');
    T.check('search_hides_others', !(await vis('#o-fs')), 'other controls are filtered out');
    await p.fill('#panelSearch', ''); await h.wait(250);
    T.check('search_clear_restores', !(await vis('#o-lw')) && await vis('#o-fs'), 'back to the first look');

    /* a changed setting is never hidden, also after a reload */
    await p.locator(more + ' > summary').click(); await h.wait(150);
    await p.fill('#o-lw', '1.5'); await p.dispatchEvent('#o-lw', 'input'); await p.dispatchEvent('#o-lw', 'change'); await h.wait(400);
    await p.locator(more + ' > summary').click(); await h.wait(150);
    await p.reload(); await h.wait(900); await p.click('#homeQuick'); await h.wait(1200);
    T.check('changed_stays_visible_after_reload', await vis('#o-lw') && (await p.inputValue('#o-lw')) === '1.5', 'line width 1.5 visible');
  });

  T.check('no_errors', !errs.length, errs.join('|'));
  await close();
  if (T.done) T.done();
})();
