const {open, H, suite, src, fs} = require('../lib/harness');

(async () => {
  const T = suite('915_raw_files');

  await T.t('raw-files-kept-per-project', async () => {
    const {p, errs, close} = await open(), h = H(p);
    const f = src('his'), orig = fs.readFileSync(f);
    await h.newProject('Raw files project');
    T.check('no raw files section before any upload', !(await p.isVisible('#rawPanel')), 'panel visible with nothing uploaded');
    await h.addRun(f);
    T.check('raw files section lists the upload', await p.isVisible('#rawPanel') && /Raw files \(1\)/.test(await p.$eval('#rawSum', e => e.textContent)), await p.$eval('#rawSum', e => e.textContent));
    await p.click('#homeBtn'); await h.wait(800);
    await p.click('#projList .pcard'); await h.wait(1500);
    const sum = await p.$eval('#rawSum', e => e.textContent), vis = await p.isVisible('#rawPanel');
    T.check('raw file is listed again after reopening the project from the browser database', vis && /Raw files \(1\)/.test(sum), `visible ${vis}, "${sum}"`);
    await p.click('#rawSum');
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#rawList [data-rawdl]')]);
    const got = fs.readFileSync(await dl.path());
    T.check('downloaded raw file is byte-identical to the upload', got.equals(orig) && dl.suggestedFilename() === f.split('/').pop(), `${got.length} vs ${orig.length}, name ${dl.suggestedFilename()}`);
    /* the project record holds metadata only; the bytes sit in the separate blobs store */
    const rec = await p.evaluate(() => new Promise(res => { const q = indexedDB.open('hfb-projects'); q.onsuccess = () => { const db = q.result, tx = db.transaction(['projects', 'blobs'], 'readonly'), a = tx.objectStore('projects').getAll(), b = tx.objectStore('blobs').getAll();
      tx.oncomplete = () => res({data: a.result.map(x => x.data).join(''), raws: b.result.filter(x => /^raw-/.test(x.id)).length}); }; q.onerror = () => res(null); }));
    const st = rec ? JSON.parse(rec.data) : {};
    T.check('project state keeps file metadata and a reference, not the file contents', rec && rec.raws === 1 && st.rawFiles && st.rawFiles.length === 1 && st.rawFiles[0].blobId && st.rawFiles[0].size === orig.length && !('data' in st.rawFiles[0]) && !('_f' in st.rawFiles[0]), JSON.stringify(rec && {raws: rec.raws, rf: st.rawFiles}));
    await p.click('#rawList [data-rawrm]'); await h.wait(800);
    T.check('removing the entry hides the section', !(await p.isVisible('#rawPanel')), 'still visible');
    T.check('no page errors', !errs.length, errs.join(' | '));
    await close();
  });

  T.done();
})();
