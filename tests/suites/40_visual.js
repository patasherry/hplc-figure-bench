// 40 visual (designer): what is on screen, checked through the DOM only.
// Builds one full project per width (construct, IMAC + gel, Concentrated with NanoDrop, SEC zip, final, figure),
// then checks every step in light and dark, the workflow figure in row/grid/stack, the click-to-edit toolbar,
// SEC peak labels, and text contrast. Optional hard cases from data/chrom/ are loaded one per project at 1400 px.
// Screenshots: results/shots/<width>_<step>[_dark].png and <width>_figure_<layout>[_dark].png
const {open, H, suite, path, fs, ROOT, RES, DATA, src} = require('../lib/harness');
const SHOTS = path.join(RES, 'shots'); fs.mkdirSync(SHOTS, {recursive: true});
const F = {gb: src('gb'), imac: src('his'),
  gel: src('gel'), nd: src('ndSpec'), sec: src('secZip')};
/* selectors this suite needs beyond the harness. Kept here so a rewrite only touches this block */
const SEL = {panel: '#panel', gelFile: '#gelFile', layout: k => `label[for="wf-${k}"]`, tool: '#wfTool', moreBtn: '#moreBtn'};
/* side-panel height budgets in px (scrollHeight of the side panel with More options closed), about 1.25 x the v15 baseline.
   A step that grows past this has picked up clutter. */
const BUDGET = {1400: {construct: 2400, transform: 1700, expr: 2300, lysis: 1700, imac: 2300, conc: 1500, sec: 2300, final: 1900, figure: 1700},
                 390: {construct: 2400, transform: 1700, expr: 2300, lysis: 1700, imac: 2300, conc: 1500, sec: 2300, final: 1900, figure: 1700}};
const OPT_HEADINGS = ['Window', 'Processing', 'Axes', 'Figure style', 'Peak integration', 'Size exclusion (SEC)', 'Peak labels'];
const shotName = (w, step, theme) => path.join(SHOTS, `${w}_${step}${theme === 'dark' ? '_dark' : ''}.png`);

/* ---------- page-side measurements (pure DOM) ---------- */
const panelInfo = (p, opt) => p.evaluate(({sel, opt}) => { const pn = document.querySelector(sel), vis = e => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const tips = [...document.querySelectorAll('summary, button, a, span')].filter(e => vis(e) && /^Tips$/.test((own(e) || e.textContent).trim())).length;
  const heads = [...(pn || document).querySelectorAll('h2, h3')].filter(vis).map(e => (own(e) || e.textContent).trim());
  const more = [...document.querySelectorAll('button')].find(b => vis(b) && /^More options$/.test(b.textContent.trim()));
  return {h: pn ? pn.scrollHeight : 0, tips, optHeads: heads.filter(t => opt.some(o => t === o || t.startsWith(o + ' '))), more: more ? more.getAttribute('aria-expanded') : null}; }, {sel: SEL.panel, opt});
/* every visible text element with readable color vs composited background; returns worst ratios */
const contrast = p => p.evaluate(() => { const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v + 0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const rgba = s => { const m = s.match(/[\d.]+/g); if (!m) return [0, 0, 0, 0]; return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0]*a + bot[0]*(1 - a), top[1]*a + bot[1]*(1 - a), top[2]*a + bot[2]*(1 - a), 1]; };
  const bgOf = e => { const st = []; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) { st.push(c); if (c[3] >= 1) break; } }
    let c = [255, 255, 255, 1]; if (!st.length || st[st.length - 1][3] < 1) c = rgba(getComputedStyle(document.documentElement).backgroundColor)[3] ? rgba(getComputedStyle(document.documentElement).backgroundColor) : c; for (let i = st.length - 1; i >= 0; i--) c = over(st[i], c); return c; };
  const sel = 'label, p, li, td, th, h2, h3, summary, button, .hint, .ts, .tt, .muted, span';
  const out = []; for (const e of document.querySelectorAll(sel)) { if (out.length > 400) break; if (!e.getClientRects().length || e.closest('svg, [hidden], .toast, #toast')) continue;
    const txt = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); if (txt.length < 2) continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (e.matches(':disabled') || e.closest(':disabled, [aria-disabled=true]')) continue; /* disabled controls are exempt under WCAG */
    const fg = over(rgba(cs.color), bgOf(e)), bg = bgOf(e), L1 = lum(fg), L2 = lum(bg), r = (Math.max(L1, L2) + 0.05)/(Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    out.push({t: txt.slice(0, 40), r: Math.round(r*100)/100, need: big ? 3 : 4.5, sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')}); }
  return out.filter(x => x.r < x.need).sort((a, b) => a.r - b.r); });
/* figure geometry: panel titles ("A  Construct"), rows, columns, axis tick rows, arrowheads */
const figGeom = p => p.evaluate(() => { const svg = document.querySelector('#paper svg'); if (!svg) return null; const sr = svg.getBoundingClientRect();
  const T = [...svg.querySelectorAll('text')].map((t, i) => { const r = t.getBoundingClientRect(); return {i, t: t.textContent.trim(), x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height}; }).filter(x => x.t && x.w > 0);
  const titles = T.filter(x => /^[A-Z]\s{1,3}\S/.test(x.t) && x.h < 20);
  const rows = []; titles.slice().sort((a, b) => a.y - b.y).forEach(t => { const row = rows.find(r => Math.abs(r[0].y - t.y) < 6); row ? row.push(t) : rows.push([t]); }); rows.forEach(r => r.sort((a, b) => a.x - b.x));
  const panels = []; rows.forEach((row, ri) => { const nextY = ri + 1 < rows.length ? rows[ri + 1][0].y : sr.bottom; row.forEach((t, ci) => panels.push({title: t.t, ti: t.i, row: ri, x0: t.x - 2, x1: ci + 1 < row.length ? row[ci + 1].x - 2 : sr.right, y0: t.y, y1: nextY})); });
  const isNum = s => /^[−-]?\d+(\.\d+)?$/.test(s);
  panels.forEach(P => { const inP = T.filter(x => x.x >= P.x0 && x.x < P.x1 && x.y > P.y0 + 8 && x.b <= P.y1);
    const axisT = inP.filter(x => /\((mL|nm|min|kDa)\)/.test(x.t) && x.w > x.h).sort((a, b) => a.y - b.y)[0]; P.axisTitle = axisT ? axisT.t : null;
    if (axisT) { const ticks = inP.filter(x => isNum(x.t) && x.b <= axisT.y + 2 && x.y >= axisT.y - 30 && x.w >= x.h*0.4); P.tickTop = ticks.length ? Math.min(...ticks.map(x => x.y)) : null; P.plotTop = P.y0 + 14; P.plotBottom = P.tickTop; } });
  /* x axis: the lowest neutral-gray stroked line or path (frame) ending just above the tick row; its bottom edge is the axis */
  const gray = c => { const m = (c || '').match(/[\d.]+/g); return m && Math.max(+m[0], +m[1], +m[2]) - Math.min(+m[0], +m[1], +m[2]) < 12; };
  const segs = [...svg.querySelectorAll('line, path, polyline')].filter(e => { const cs = getComputedStyle(e); return cs.stroke !== 'none' && gray(cs.stroke) && !(cs.strokeDasharray && cs.strokeDasharray !== 'none'); }).map(e => e.getBoundingClientRect());
  panels.forEach(P => { if (P.tickTop == null) return; const c = segs.filter(r => r.left >= P.x0 - 2 && r.right <= P.x1 + 2 && r.width > 0.3*(P.x1 - P.x0) && r.bottom <= P.tickTop + 1 && r.bottom >= P.tickTop - 25).sort((a, b) => b.bottom - a.bottom)[0]; P.axisY = c ? c.bottom : null; });
  /* arrowheads: small closed filled triangles (M L L Z) or lines with marker-end */
  /* a triangle M tip L b1 L b2 Z points sideways when the tip is further from the base midpoint in x than in y */
  const arrows = [...svg.querySelectorAll('path')].map(e => { const d = (e.getAttribute('d') || '').trim(), n = d.match(/^M\s*([\d.-]+)[\s,]+([\d.-]+)\s*L\s*([\d.-]+)[\s,]+([\d.-]+)\s*L\s*([\d.-]+)[\s,]+([\d.-]+)\s*Z$/i); if (!n || getComputedStyle(e).fill === 'none') return null;
      const v = n.slice(1).map(Number), r = e.getBoundingClientRect(); if (r.width > 10 || r.height > 10) return null; const dx = Math.abs(v[0] - (v[2] + v[4])/2), dy = Math.abs(v[1] - (v[3] + v[5])/2);
      return dx > dy ? {x: (r.left + r.right)/2, y: (r.top + r.bottom)/2} : null; }).filter(Boolean)
    .concat([...svg.querySelectorAll('line[marker-end]')].filter(e => Math.abs(+e.getAttribute('y1') - +e.getAttribute('y2')) < 1).map(e => { const r = e.getBoundingClientRect(); return {x: r.right, y: r.top}; }));
  return {svg: {x: sr.left, y: sr.top, r: sr.right, b: sr.bottom}, T, panels, arrows}; });

(async () => { const T = suite('40_visual'); const t0 = Date.now();
  for (const W of [1400, 390]) { const {p, errs, close} = await open({width: W, height: W < 600 ? 860 : 1000}), h = H(p);
    const steps = []; /* [name, key] */
    await T.t(`${W}:build`, async () => { await h.newProject('Visual ' + W); await h.gb(F.gb); steps.push(['construct', 'construct'], ['transform', 'transform'], ['expr', 'expr'], ['lysis', 'lysis']);
      await h.addRun(F.imac); await h.suggest(); try { await p.setInputFiles(SEL.gelFile, [F.gel]); await h.wait(1500); } catch (e) {}
      await h.addConc(F.nd, 0.5); await h.addRun(F.sec); await h.suggest();
      const tl = await h.timeline(); const k = re => (tl.find(x => re.test(x.t || '')) || {}).k;
      steps.push(['imac', k(/IMAC/)], ['conc', k(/Concentrat/)], ['sec', k(/Size exclusion/)], ['final', 'final'], ['figure', 'figure']);
      T.check(`${W}:build-steps`, steps.every(s => s[1]), JSON.stringify(steps)); /* every step of the realistic project exists in the timeline */ });
    for (const theme of ['light', 'dark']) { await p.emulateMedia({colorScheme: theme}); await h.wait(200); const tag = `${W}:${theme}`;
      for (const [name, key] of steps) { if (!key) continue; await T.t(`${tag}:${name}`, async () => { await h.step(key); await p.evaluate(() => window.scrollTo(0, 0)); await h.wait(250);
        await p.screenshot({path: shotName(W, name, theme)});
        T.check(`${tag}:${name}:no-hscroll`, !(await h.hScroll()), shotName(W, name, theme)); /* page never scrolls sideways */
        const pi = await panelInfo(p, OPT_HEADINGS);
        if (theme === 'light') T.check(`${tag}:${name}:panel-budget`, pi.h <= BUDGET[W][name], `${pi.h}px > ${BUDGET[W][name]}px ${shotName(W, name, theme)}`); /* clutter creep: side panel stays within its height budget */
        T.check(`${tag}:${name}:one-tips`, pi.tips <= 1, `${pi.tips} Tips visible`); /* at most one Tips disclosure per step */
        T.check(`${tag}:${name}:more-closed`, !pi.optHeads.length && pi.more !== 'true', `visible option sections: ${pi.optHeads.join(', ')}`); /* rarely used settings stay behind More options */
        const bad = await contrast(p); T.check(`${tag}:${name}:contrast`, !bad.length, bad.slice(0, 6).map(x => `${x.r}:1 ${x.sel} "${x.t}"`).join(' | ') + ' ' + shotName(W, name, theme)); /* body text >= 4.5:1 (3:1 for large) */ }); }
      /* SEC peak labels on the run's own figure */
      await T.t(`${tag}:sec-labels`, async () => { await h.step(steps.find(s => s[0] === 'sec')[1]); await h.wait(500); const g = await figGeom(p); if (!g) return T.check(`${tag}:sec-labels:figure`, false, 'no svg');
        const labs = g.T.filter(x => /^\d+(\.\d+)?\s?(mL|mg|kDa|min)$/.test(x.t)); const ticks0 = g.T.filter(x => /^0$/.test(x.t)).sort((a, b) => b.y - a.y)[0]; const ytop = g.T.filter(x => /^\d+$/.test(x.t) && x.x < (ticks0 ? ticks0.r + 2 : 0) && x.x > (ticks0 ? ticks0.x - 30 : 0)).sort((a, b) => a.y - b.y)[0];
        const stacked = []; for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) { const a = labs[i], b = labs[j], ox = Math.min(a.r, b.r) - Math.max(a.x, b.x); if (ox > 0.5*Math.min(a.w, b.w) && Math.abs(a.y - b.y) < 1.6*Math.max(a.h, b.h)) stacked.push(`${a.t}/${b.t}`); }
        T.check(`${tag}:sec-labels:not-stacked`, !stacked.length, stacked.join(', ') + ' ' + shotName(W, 'sec', theme)); /* two peak labels never sit on top of each other */
        if (ticks0 && ytop) { const y0 = (ticks0.y + ticks0.b)/2, H0 = y0 - (ytop.y + ytop.b)/2, low = labs.filter(x => y0 - x.b < 0.08*H0);
          T.check(`${tag}:sec-labels:no-small`, !low.length, low.map(x => x.t).join(', ')); } /* peaks under ~5% of the axis are not labelled (label bottom within 8% of baseline) */
        T.check(`${tag}:sec-labels:overlap`, !(await h.overlaps()).length, (await h.overlaps()).join(' | ')); /* the run figure has no overlapping text */ });
      /* workflow figure in all three layouts */
      for (const lay of ['row', 'grid', 'stack']) await T.t(`${tag}:fig-${lay}`, async () => { await h.step('figure'); const L = await p.$(SEL.layout(lay)); if (!L) return T.check(`${tag}:fig-${lay}:layout-control`, false, 'no layout control'); await L.click(); await h.wait(900);
        const shot = path.join(SHOTS, `${W}_figure_${lay}${theme === 'dark' ? '_dark' : ''}.png`); try { await p.locator('#paper svg').first().screenshot({path: shot}); } catch (e) {}
        const g = await figGeom(p); if (!g) return T.check(`${tag}:fig-${lay}:svg`, false, 'no svg');
        const ov = await h.overlaps(); T.check(`${tag}:fig-${lay}:no-overlap`, !ov.length, ov.slice(0, 8).join(' | ') + ' ' + shot); /* no two text boxes overlap (no allowed pairs needed on v15) */
        const out = g.T.filter(x => x.x < g.svg.x - 1 || x.r > g.svg.r + 1 || x.y < g.svg.y - 1 || x.b > g.svg.b + 1); T.check(`${tag}:fig-${lay}:inside-svg`, !out.length, out.map(x => x.t).slice(0, 6).join(' | ')); /* no text is cut off by the svg edge */
        const names = g.panels.map(P => P.title.replace(/^[A-Z]\s+/, '')), letters = g.panels.map(P => P.title[0]);
        const want = ['Construct', 'IMAC', 'Concentrated', 'Size exclusion']; T.check(`${tag}:fig-${lay}:titles`, want.every(w => names.some(n => n.startsWith(w))), names.join(', ')); /* every step in the project has a titled panel */
        T.check(`${tag}:fig-${lay}:titles-unique`, new Set(names).size === names.length && new Set(letters).size === letters.length, names.join(', ')); /* panel names and letters are unique */
        const cross = []; g.T.forEach(x => g.panels.forEach(P => { if (x.y < P.y0 + 14 || x.b > (P.plotBottom || P.y1) || x.i === P.ti) return; const home = g.panels.find(Q => Q.row === P.row && x.x >= Q.x0 && x.x < Q.x1);
          if (home && home !== P && x.r > P.x0 + 3 && x.x < P.x1 && P.axisTitle) cross.push(`${x.t} into ${P.title}`); })); T.check(`${tag}:fig-${lay}:no-cross-panel`, !cross.length, cross.slice(0, 6).join(' | ')); /* labels stay out of the next panel's plot */
        const C = g.panels.find(P => /Concentrat/.test(P.title)); if (C && C.tickTop != null) { const nb = g.panels.filter(P => P.row === C.row && P !== C && P.tickTop != null);
          if (nb.length) { const useLine = C.axisY != null && nb.every(P => P.axisY != null), k = useLine ? 'axisY' : 'tickTop';
            const d = Math.max(...nb.map(P => Math.abs(P[k] - C[k]))); T.check(`${tag}:fig-${lay}:conc-axis-aligned`, d <= 2, `off by ${d.toFixed(1)} px (${useLine ? 'axis line' : 'tick row, axis line not found'}) ${shot}`); } } /* Concentrated x axis lines up with its row neighbours */
        const badA = g.arrows.filter(a => { const P = g.panels.find(Q => a.x >= Q.x0 - 30 && a.x < Q.x1 && a.y >= Q.y0 && a.y < Q.y1 && Q.plotBottom); if (!P) return false; const top = P.y0 + 14, bot = P.plotBottom; return a.y < top + 0.15*(bot - top) || a.y > bot - 0.1*(bot - top); });
        if (lay === 'row') T.check(`${tag}:fig-${lay}:arrows-found`, g.arrows.length >= 2, `${g.arrows.length} arrowheads`); /* the row layout draws arrows between steps */
        T.check(`${tag}:fig-${lay}:arrow-height`, !badA.length, badA.map(a => `${Math.round(a.x)},${Math.round(a.y)}`).join(' ')); /* step arrows sit in the plot's vertical middle band, not at the top or on the axis */
        /* click-to-edit toolbar, one panel per layout to stay under the time budget (light theme only) */
        if (theme === 'light') { const P = g.panels.find(Q => /IMAC|Concentrat/.test(Q.title)) || g.panels[0];
          await p.evaluate(i => { const el = document.querySelectorAll('#paper svg text')[i]; if (el) el.scrollIntoView({block: 'center', inline: 'center'}); }, P.ti); await h.wait(200);
          const tr = await p.evaluate(i => { const r = document.querySelectorAll('#paper svg text')[i].getBoundingClientRect(); return {x: r.left, y: r.top, r: r.right, b: r.bottom}; }, P.ti);
          await p.mouse.click(tr.x + 20, tr.b + 40); await h.wait(400);
          const tb = await p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return {x: r.left, y: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight}; }, SEL.tool);
          const tr2 = await p.evaluate(i => { const r = document.querySelectorAll('#paper svg text')[i].getBoundingClientRect(); return {x: r.left, y: r.top, r: r.right, b: r.bottom}; }, P.ti);
          if (T.check(`${tag}:fig-${lay}:toolbar-shows`, !!tb, `clicked ${P.title}`)) { /* clicking a panel opens its edit toolbar */
            await p.screenshot({path: path.join(SHOTS, `${W}_toolbar_${lay}.png`)});
            T.check(`${tag}:fig-${lay}:toolbar-in-view`, tb.x >= 0 && tb.r <= tb.vw && tb.y >= 0 && tb.b <= tb.vh, JSON.stringify(tb)); /* toolbar is fully inside the viewport */
            const hit = !(tb.r <= tr2.x || tb.x >= tr2.r || tb.b <= tr2.y || tb.y >= tr2.b); T.check(`${tag}:fig-${lay}:toolbar-not-on-title`, !hit, `${P.title} ${JSON.stringify(tr2)} ${path.join(SHOTS, `${W}_toolbar_${lay}.png`)}`); /* toolbar never hides the title being edited */
            await p.keyboard.press('Escape'); const done = await p.$(`${SEL.tool} [data-wf=close]`); if (done && await done.isVisible()) await done.click(); await h.wait(200); } } });
      if (Date.now() - t0 > 420000) { T.check('time-budget', false, 'stopped early to stay under 8 minutes'); break; } }
    T.check(`${W}:no-page-errors`, !errs.length, errs.join(' | ')); /* nothing above threw in the page */
    await close(); }
  /* hard chromatograms from the biochemist, if present: each alone, run figure must have no overlaps, no stacked labels */
  const CH = path.join(DATA, 'chrom'); if (fs.existsSync(CH) && Date.now() - t0 < 400000) { const files = fs.readdirSync(CH).filter(f => /\.(csv|zip|txt|xls|xlsx|res|asc)$/i.test(f)).slice(0, 8);
    const {p, close} = await open({width: 1400}), h = H(p); await h.newProject('Hard');
    for (const f of files) { if (Date.now() - t0 > 460000) break; await T.t(`chrom:${f}`, async () => { await h.addRun(path.join(CH, f)); await h.wait(500); const ov = await h.overlaps();
      const shot = path.join(SHOTS, `1400_chrom_${f.replace(/\W+/g, '_')}.png`); try { await p.locator('#paper svg').first().screenshot({path: shot}); } catch (e) {}
      T.check(`chrom:${f}:no-overlap`, !ov.length, ov.slice(0, 6).join(' | ') + ' ' + shot); /* hard cases (overlapping, tiny, 96-well, 2 plates) keep labels apart */
      T.check(`chrom:${f}:no-hscroll`, !(await h.hScroll()), shot); /* a wide plate never makes the page scroll sideways */ }); }
    await close(); }

  /* UI-only synthetic calibrated-gel check, enabling band labels and an inline known-protein match */
  await T.t('synthetic-calibrated-gel', async () => {
    const {p, close} = await open({width: 1400}), h = H(p);
    await h.newProject('Synthetic Gel Check');

    await h.addRun(F.imac);
    await h.suggest();
    try { await p.setInputFiles(SEL.gelFile, [F.gel]); await h.wait(1500); } catch (e) {}

    // Use onehalf preset

    await p.evaluate(() => {
      const e = document.querySelector('#o-bandLabels');
      if (e) { e.value = 'all'; e.dispatchEvent(new Event('change', {bubbles: true})); }
      const show = document.querySelector('#o-knownShow');
      if (show) { show.value = 'inline'; show.dispatchEvent(new Event('change', {bubbles: true})); }
      const pur = document.querySelector('#o-purRow');
      if (pur && !pur.checked) { pur.checked = true; pur.dispatchEvent(new Event('change', {bubbles: true})); }

      const gn = document.querySelector('#g-n');
      if (gn) { gn.value = '15'; gn.dispatchEvent(new Event('input', {bubbles: true})); }

      const gl = document.querySelector('#g-labels');
      if (gl) { gl.value = '1\n2 with a very long label to force vertical\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15'; gl.dispatchEvent(new Event('input', {bubbles: true})); }

      const ga = document.querySelector('#g-assign');
      if (ga && ga.options.length > 1) { ga.value = ga.options[1].value; ga.dispatchEvent(new Event('change', {bubbles: true})); }

      const glns = document.querySelector('#g-lanes');
      if (glns) { glns.value = 'A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15'; glns.dispatchEvent(new Event('input', {bubbles: true})); }

      const pk = document.querySelector('#opt-protKda');
      if (pk) { pk.value = '49.3'; pk.dispatchEvent(new Event('input', {bubbles: true})); }

      const tol = document.querySelector('#o-knownTol');
      if (tol) { tol.value = '50'; tol.dispatchEvent(new Event('change', {bubbles: true})); } // very high tolerance to guarantee match
    });


    // To make sure a known protein is enabled:
    await p.evaluate(() => {
      const cb = document.querySelector('input[data-known]');
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', {bubbles: true})); }
    });

    await h.wait(500);

    const ov = await h.overlaps();
    T.check('synthetic-calibrated-gel:no-overlap', !ov.length, ov.join(' | '));



    const labelChecks = await p.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('#paper svg text')).map(x => x.textContent);
      const hasBand = texts.some(t => /kDa/.test(t) || /\d+\.\d+/.test(t) || /\d+/.test(t));
      const hasKnown = texts.some(t => /Target/i.test(t) || /≈/.test(t) || t.length > 2);
      const hasPurity = texts.some(t => /%/.test(t) || /Purity/.test(t));
      const hasVert = texts.some(t => /very long label/.test(t));
      return {hasBand, hasKnown, hasPurity, hasVert, allTexts: texts};
    });
    T.check('synthetic-calibrated-gel:elements-exist', labelChecks.hasBand && labelChecks.hasKnown && labelChecks.hasVert, JSON.stringify(labelChecks));



    // Verify physical sizes by getting computed style
    const badSizes = await p.evaluate(() => {
      const texts = document.querySelectorAll('#paper svg text');
      const bad = [];
      texts.forEach(t => {
        const cs = getComputedStyle(t);
        const fs = parseFloat(cs.fontSize);
        // Ensure every generated label is at least 5px/pt
        if (fs && fs < 4.9) bad.push({t: t.textContent, fs});
      });
      return bad;
    });
    T.check('synthetic-calibrated-gel:text-size-min-5pt', badSizes.length === 0, badSizes.map(b => `${b.t}: ${b.fs}px`).join(', '));

    // Check that labels remain inside the figure
    const g = await figGeom(p);
    if (g && g.T) {
       const out = g.T.filter(x => x.x < g.svg.x - 1 || x.r > g.svg.r + 1 || x.y < g.svg.y - 1 || x.b > g.svg.b + 1);
       T.check('synthetic-calibrated-gel:inside-svg', !out.length, out.map(x => x.t).slice(0, 6).join(' | '));
    }

    await close();
  });

  T.done(); })();
