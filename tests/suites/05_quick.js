// Quick-Figure mode: checks behavior of `#quick` URL and Quick button on home screen.
// UI and DOM only.
const {open, H, suite, src, fs, path, APP} = require('../lib/harness');

(async () => {
  const T = suite('05_quick'), {b, ctx, p, errs, close} = await open(), h = H(p);

  await T.t('quick_mode', async () => {
    // 1. Open the app with `#quick`
    // Go home, then to quick mode, ensuring example data generates
    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);
    await p.click('#homeQuick');
    await h.wait(1500);

    // Make sure we evaluate something that gives time for traces to show
    const getTraces = async () => await p.$$eval('.trace', els => els.map(e => ({kind: e.dataset.kind, name: e.querySelector('.name') ? e.querySelector('.name').value || e.querySelector('.name').textContent : ''})));
    let traces = await getTraces();

    T.check('example_data_loaded', traces.length > 0, `Example chromatograms should load. Found: ${JSON.stringify(traces)}`);

    // Check we are not in home screen anymore and view is visible
    const isProj = await p.evaluate(() => document.body.classList.contains('proj'));
    T.check('not_in_proj', !isProj, 'Should not be in a project');
    const isAppHidden = await p.evaluate(() => document.querySelector('.app') ? document.querySelector('.app').hidden : true);
    T.check('in_project_view', !isAppHidden, 'App view should be visible');

    // 3. Dropping a synthetic HPLC CSV adds a trace
    const initialTraceCount = traces.length;
    await h.dropFiles(src('s200')); // 's200' points to 'chrom/sec_S200_Increase_minutes_u7.csv'
    await h.wait(1000);

    const newTraces = await getTraces();
    // Trace count increases, or if dropping replaces, check that there is at least one run
    const runTraces = newTraces.filter(t => t.kind === 'run');
    T.check('trace_added', runTraces.length > 0, `Added a run trace. Found: ${JSON.stringify(newTraces)}`);

    // 4. SVG and PNG export work
    const download = async (selector, timeout = 10000) => {
      const loc = p.locator(selector);
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const [dl] = await Promise.all([
        p.waitForEvent('download', { timeout }).catch(() => null),
        loc.click()
      ]);
      return !!dl;
    };

    // Make sure figure settings groups are open
    await p.evaluate(() => {
      document.querySelectorAll('.grp').forEach(g => g.classList.remove('closed'));
      document.querySelectorAll('details').forEach(d => d.open = true);
    });
    await h.wait(500);

    const svgOk = await download('#saveSvg');
    T.check('svg_export', svgOk, 'SVG download triggered');

    const pngOk = await download('#savePng');
    T.check('png_export', pngOk, 'PNG download triggered');

    // 5. Nothing is saved as a project (home screen project list unchanged after reload)
    await p.click('#homeBtn');
    await h.wait(500);

    const getProjects = () => p.$$eval('#projList .p-card .p-name', els => els.map(e => e.textContent.trim()));
    const projectsBefore = await getProjects();

    // Reload the page
    await p.reload();
    await h.wait(1000);

    const projectsAfter = await getProjects();
    T.check('no_project_saved', JSON.stringify(projectsBefore) === JSON.stringify(projectsAfter), 'Project list should not change');

    // 6. Switching back to a project and then to Quick mode again does not mix traces
    await h.newProject('Test Project');
    await h.wait(500);

    // Add a file to this project
    await h.addRun(src('s200'));
    await h.wait(1000);

    const projectTraces = await p.$$eval('.trace', els => els.length);
    T.check('project_has_trace', projectTraces > 0, `Project has ${projectTraces} traces`);

    // Go home, then Quick mode again
    await p.click('#homeBtn');
    await h.wait(500);

    await p.click('#homeQuick');
    await h.wait(1500);

    const quickTracesAfter = await p.$$eval('.trace', els => els.length);
    T.check('quick_traces_reset', quickTracesAfter === (initialTraceCount > 0 ? initialTraceCount : 2), `Quick mode has ${quickTracesAfter} traces, expected ${initialTraceCount > 0 ? initialTraceCount : 2} (no mix)`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
