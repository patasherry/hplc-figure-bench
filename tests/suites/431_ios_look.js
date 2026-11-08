// 43 iOS look: the app's own interface (not the figures) uses rounded buttons, switches, a segmented control, grouped sections and design tokens. DOM and computed style only.
const {open, H, suite, src} = require('../lib/harness');
(async () => { const T = suite('43_ios_look'), {p, errs, close} = await open({width: 1400}), h = H(p);
  await T.t('look', async () => { await h.newProject('iOS look'); await h.addRun(src('his')); await h.step('figure'); await h.wait(500);
    const px = s => parseFloat(s) || 0;
    const prim = await p.evaluate(() => { const b = [...document.querySelectorAll('.btn.primary')].find(e => e.getClientRects().length) || document.querySelector('.btn.primary'); if (!b) return null; const c = getComputedStyle(b), r = b.getBoundingClientRect(); return {rad: c.borderTopLeftRadius, h: r.height}; });
    T.check('primary-button-rounded', !!prim && px(prim.rad) >= 8, JSON.stringify(prim)); /* primary button corners are 8 px or more */
    T.check('primary-button-touch-target', !!prim && prim.h >= 31.5, JSON.stringify(prim));
    const sw = await p.evaluate(() => { const c = document.querySelector('#panel input[type=checkbox]'); if (!c) return null; const s = getComputedStyle(c), a = getComputedStyle(c, '::after'); return {app: s.appearance, w: parseFloat(s.width), h: parseFloat(s.height), rad: parseFloat(s.borderTopLeftRadius), knob: a.content !== 'none' && a.content !== 'normal'}; });
    T.check('checkbox-is-switch', !!sw && sw.app === 'none' && sw.w >= 1.5*sw.h && sw.rad >= sw.h/2 - 1 && sw.knob, JSON.stringify(sw)); /* appearance none, pill shape wider than tall, round knob */
    const seg = await p.evaluate(() => { const s = document.querySelector('#panel .seg'); if (!s) return null; const l = s.querySelector('label'); return {rad: parseFloat(getComputedStyle(s).borderTopLeftRadius), lrad: parseFloat(getComputedStyle(l).borderTopLeftRadius)}; });
    T.check('segmented-control-rounded', !!seg && seg.rad >= 8 && seg.lrad >= 6, JSON.stringify(seg));
    const grp = await p.evaluate(() => { const g = document.querySelector('#panel > .grp'); const h2 = g && g.querySelector('h2'); if (!g) return null; return {rad: parseFloat(getComputedStyle(g).borderTopLeftRadius), caps: h2 ? getComputedStyle(h2).fontVariantCaps : '', fs: h2 ? parseFloat(getComputedStyle(h2).fontSize) : 0}; });
    T.check('section-grouped-rounded', !!grp && grp.rad >= 10 && grp.rad <= 12, JSON.stringify(grp));
    T.check('section-title-small-caps', !!grp && /caps/.test(grp.caps) && grp.fs <= 13.5, JSON.stringify(grp));
    const tok = await p.evaluate(() => { const c = getComputedStyle(document.documentElement); return {font: getComputedStyle(document.body).fontFamily, tokens: ['--accent', '--ios-blue', '--card', '--sep', '--label', '--label2', '--panel'].map(k => c.getPropertyValue(k).trim())}; });
    T.check('font-stack-apple-first', /^-apple-system/.test(tok.font) && /Instrument Sans/.test(tok.font), tok.font);
    T.check('tokens-defined', tok.tokens.every(Boolean), tok.tokens.join(' '));
    const fig = await p.evaluate(() => { const s = document.querySelector('#paper svg'); return s ? s.getAttribute('font-family') : null; });
    T.check('figure-font-unchanged', !!fig && /Arial/.test(fig) && !/apple-system/.test(fig), String(fig)); /* the figure keeps its publication font */
    await p.emulateMedia({reducedMotion: 'reduce'}); await h.wait(100);
    const dur = await p.evaluate(() => { const c = document.querySelector('#panel input[type=checkbox]'); return c ? [getComputedStyle(c).transitionDuration, getComputedStyle(c, '::after').transitionDuration] : null; });
    T.check('reduced-motion-no-transition', !!dur && dur.every(d => d.split(',').every(x => parseFloat(x) === 0)), JSON.stringify(dur));
    await p.emulateMedia({reducedMotion: 'no-preference'}); });
  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
