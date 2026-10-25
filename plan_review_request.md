1. Add a UI-only synthetic calibrated-gel check to `tests/suites/40_visual.js` using `replace_with_git_merge_diff`:
   - Replace the final `T.done(); })();` closing with the injected test block before `T.done(); })();`.
   - The test code will look exactly like this:
<<<<<<< SEARCH
  T.done(); })();
=======
  await T.t('min-font-size', async () => {
    const {p, close} = await open({width: 1400}), h = H(p);
    await h.newProject('MinFont');
    await h.addRun(F.imac);
    await h.suggest();
    await p.setInputFiles(SEL.gelFile, [F.gel]);
    await h.wait(1500);

    await p.locator('#o-preset').selectOption('onehalf');
    await p.locator('#o-bandLabels').selectOption('all');
    await p.locator('#o-knownOn').check();
    await p.locator('#o-knownShow').selectOption('inline');
    await p.locator('#o-purRow').check();
    await p.evaluate(() => {
      const n = document.querySelector('#g-n');
      n.value = '10'; n.dispatchEvent(new Event('input', {bubbles: true})); n.dispatchEvent(new Event('change', {bubbles: true}));
      const l = document.querySelector('#g-labels');
      l.value = 'VeryLongLaneLabel1,VeryLongLaneLabel2,VeryLongLaneLabel3,VeryLongLaneLabel4,VeryLongLaneLabel5';
      l.dispatchEvent(new Event('input', {bubbles: true})); l.dispatchEvent(new Event('change', {bubbles: true}));
    });
    await h.wait(500);

    const g = await figGeom(p);
    T.check('min-font-size:svg', !!g, 'SVG present');
    const ov = await h.overlaps();
    T.check('min-font-size:no-overlap', !ov.length, ov.slice(0, 6).join(' | '));
    const out = g.T.filter(x => x.x < g.svg.x - 1 || x.r > g.svg.r + 1 || x.y < g.svg.y - 1 || x.b > g.svg.b + 1);
    T.check('min-font-size:inside-svg', !out.length, out.map(x => x.t).slice(0, 6).join(' | '));

    const sizes = await p.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('#paper svg text'));
      return texts.map(t => ({ text: t.textContent, fs: parseFloat(getComputedStyle(t).fontSize) }));
    });

    const tooSmall = sizes.filter(s => s.fs < 5);
    T.check('min-font-size:size', tooSmall.length === 0, 'Too small labels: ' + tooSmall.map(x => x.text + '@' + x.fs).join(', '));
    T.check('min-font-size:has-labels', sizes.length > 5, 'Found ' + sizes.length + ' labels');
    await close();
  });
  T.done(); })();
>>>>>>> REPLACE
2. Run the newly added test via `run_in_bash_session` executing `cd tests && ONLY="min-font-size" node suites/40_visual.js` to verify it fails on the current codebase.
3. Fix the text sizes in `hplc-figure-bench(WF1.13).html` using `replace_with_git_merge_diff`:
   - Line ~3233 (vertical labels `vf`): Replace `Math.max(fs*0.35, Math.min(lf, laneW*0.78))` with `Math.max(5, Math.max(fs*0.35, Math.min(lf, laneW*0.78)))`.
   - Line ~3236 (vertical labels `vf`): Replace `Math.max(fs*0.35, Math.min(lf, laneW*0.78))` with `Math.max(5, Math.max(fs*0.35, Math.min(lf, laneW*0.78)))`.
   - Line ~3271 (band labels `bf`): Replace `Math.max(4, fs*0.62)` with `Math.max(5, fs*0.62)`.
   - Line ~3330 (known labels `kf`): Replace `Math.max(4, fs*0.58)` with `Math.max(5, fs*0.58)`.
   - Line ~3340 (purity labels `pf`): Replace `Math.max(4, fs*0.75)` with `Math.max(5, fs*0.75)`.
4. Run the test via `run_in_bash_session` executing `cd tests && ONLY="min-font-size" node suites/40_visual.js` to ensure the fix passes.
5. Run the full test suite via `run_in_bash_session` executing `cd tests && node compare.js` to ensure no regressions were introduced across all tests.
6. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
7. Submit the PR using the `submit` tool with appropriate details.
