// 44 panel more: rarely used settings sit under a "More options" disclosure in their section; a changed setting stays visible; the search box finds them. UI and DOM only.
const {open, H, suite, src} = require('../lib/harness');

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

  /* UI fixes for hidden options and cut-off labels (#659, #591) */
  await T.t('findable_options_and_labels', async () => {
    // 1. Home quick button
    await p.click('#homeBtn'); await h.wait(400);
    const hq = p.locator('#homeQuick');
    const hqClass = await hq.getAttribute('class');
    const hqText = await hq.textContent();
    T.check('home_quick_button_look', !/quiet/.test(hqClass) && /btn/.test(hqClass), 'homeQuick has button styling');
    T.check('home_quick_mentions_example_data', /example data/i.test(hqText), hqText);

    // 2. Trace names in quick mode & detect button
    await p.click('#homeQuick'); await h.wait(1200);
    const traceName = p.locator('.trace .thead input[type=text]').first();
    const tVal = await traceName.inputValue();
    const tTitle = await traceName.getAttribute('title');
    const tEllipsis = await traceName.evaluate(e => getComputedStyle(e).textOverflow);
    T.check('trace_name_has_title', tTitle === tVal && tTitle.length > 0, `title: ${tTitle}`);
    T.check('trace_name_has_ellipsis', tEllipsis === 'ellipsis', `text-overflow: ${tEllipsis}`);

    // Detect button
    const detBtn = p.locator('.trace button[data-act="detect"]').first();
    const detText = (await detBtn.textContent()).trim();
    T.check('detect_button_says_detect_peaks', detText === 'Detect peaks', detText);

    // 3. Zoom inset in Window section (not Axes)
    const zoomSec = await p.evaluate(() => {
      const el = document.getElementById('o-zoomInset');
      const h2 = el && el.closest('section') && el.closest('section').querySelector('h2');
      return h2 && h2.firstChild ? h2.firstChild.textContent.trim() : null;
    });
    T.check('zoom_inset_in_window_section', zoomSec === 'Window', `Show Inset View is in section: ${zoomSec}`);

    // 4. UV path input width fits "assumed: 2" and More options links in project
    await p.click('#homeBtn'); await h.wait(400);
    await h.newProject('Visual checks');
    await h.addRun(src('s200'));
    const pathInput = p.locator('.cardopts input[data-k="path"]').first();
    const pathWidth = await pathInput.evaluate(e => e.getBoundingClientRect().width);
    T.check('uv_path_input_fits_placeholder', pathWidth >= 65, `path width: ${pathWidth}px`);

    // More options what links clickable
    const secLink = p.locator('#moreWhat [data-more-sec="Size exclusion (SEC)"]');
    T.check('more_what_sec_link_exists', (await secLink.count()) === 1, 'SEC link in moreWhat');
    await secLink.click(); await h.wait(400);
    T.check('sec_col_visible_after_clicking_more_what', await vis('#sec-col'), 'SEC column selector visible');

    // 5. Workflow full chromatogram visible by default
    await h.step('figure'); await h.wait(400);
    T.check('wf_full_visible_by_default', await vis('#o-wfFull'), 'Full chromatogram checkbox visible');

    // 6. Check search placeholder text (#895)
    const searchPlaceholder = await p.getAttribute('#panelSearch', 'placeholder');
    T.check('search_placeholder_text', searchPlaceholder === 'Search settings/data/files', 'Search placeholder should be "Search settings/data/files" to reduce ambiguity');

    // 7. Project name field has an explicit visible label beside it that stays visible at narrow width (#1038)
    const projLab = p.locator('label[for="projName"]');
    const projLabText = (await projLab.count()) ? (await projLab.textContent()).trim() : '';
    const projPlaceholder = await p.getAttribute('#projName', 'placeholder');
    T.check('proj_name_label_visible', (await projLab.count()) === 1 && (await projLab.isVisible()) && /^project(\s+name)?$/i.test(projLabText) && /^project(\s+name)?$/i.test(projPlaceholder || ''), `label="${projLabText}" placeholder="${projPlaceholder}"`);
    const {p: pNarrow, errs: errsN, close: closeN} = await open({width: 390, height: 844}), hN = H(pNarrow);
    await hN.newProject('UX save');
    const narrowGeom = await pNarrow.evaluate(() => {
      const lab = document.querySelector('label[for="projName"]'), inp = document.getElementById('projName');
      if (!lab || !inp) return null;
      const lr = lab.getBoundingClientRect(), ir = inp.getBoundingClientRect(), cs = getComputedStyle(lab);
      return {
        vis: lr.width > 0 && lr.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0,
        inView: lr.left >= 0 && lr.right <= window.innerWidth && ir.left >= 0 && ir.right <= window.innerWidth,
        beside: lr.right <= ir.left + 2 && Math.abs((lr.top + lr.bottom) / 2 - (ir.top + ir.bottom) / 2) < 16,
        inpW: ir.width,
        noHScroll: document.documentElement.scrollWidth <= window.innerWidth + 1
      };
    });
    T.check('proj_name_label_narrow_visible', !!narrowGeom && narrowGeom.vis && narrowGeom.inView && narrowGeom.beside && narrowGeom.inpW >= 60 && narrowGeom.noHScroll, JSON.stringify(narrowGeom));
    errs.push(...errsN);
    await closeN();
  });


  await T.t('gel-meta-tooltip', async () => {
    try {
        await p.setInputFiles('#file', [require('path').join(__dirname, '../data/chrom/fixture_gauss_resolved.csv')]);
        await p.waitForTimeout(500);

        await p.setInputFiles('#file', [require('path').join(__dirname, '../data/qa/picture.jpg')]);
        await p.waitForTimeout(500);

        await p.evaluate(() => {
          const selectEl = document.querySelector('#laneTable .lrow select[data-lk="assign"]');
          if (selectEl) {
             selectEl.selectedIndex = 2; // the run
             selectEl.dispatchEvent(new Event('change', {bubbles: true}));
          }
        });
        await p.waitForTimeout(500);

        const htmlContent = await p.evaluate(() => {
           const el = document.querySelector('.gelc .meta');
           return el ? el.innerHTML : 'no-meta';
        });
        T.check('gel-meta-tooltip.has-title', htmlContent.includes('<span title="fixture gauss resolved">fixture gauss res…</span>'), 'HTML: ' + htmlContent);
    } catch(e) {
        T.check('gel-meta-tooltip.has-title', false, 'Timeout or Error: ' + e.message);
    }
  });

  T.check('no_errors', !errs.length, errs.join('|'));
  await close();
  if (T.done) T.done();
})();
