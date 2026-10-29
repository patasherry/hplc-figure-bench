const {open, H, suite, path, fs: hfs} = require('../lib/harness');
const fs = require('fs');
const T = suite('19_import_zeros');

async function saved(p) { const dl = p.waitForEvent('download', { timeout: 10000 }); await p.locator('#projSave').evaluate(e => e.click()); return JSON.parse(hfs.readFileSync(await (await dl).path(), 'utf8')); }

async function checkImport(filename, type, expectedUI) {
  const f = path.join(__dirname, '..', 'data', 'chrom', filename);

  const {p, errs, close} = await open();
  const h = H(p);

  try {
    await h.newProject('zero test ' + filename);

    // Attempt load
    if (type === 'nd') {
        const dummyTrace = path.join(__dirname, '..', 'data', 'chrom', 'dummy.csv');
        fs.writeFileSync(dummyTrace, `ml,mAU\n1.0,0.0\n2.0,0.0\n3.0,0.0\n`);
        await p.setInputFiles('#file', dummyTrace);
        await p.waitForTimeout(500);
    }
    await p.setInputFiles('#file', f);
    await p.waitForTimeout(500);

    T.check(`${filename}/errors`, errs.length === 0, `No errors, got: ${errs.join(', ')}`);

    const s = await saved(p);

    if (type === 'nd') {
        const uis = (s.nanodrop || []).map(x => String(x.a280));
        T.check(`${filename}/nd_vals`, uis.join(',') === expectedUI.join(','), `Expected [${expectedUI}], got [${uis}]`);
    } else if (type === 'run') {
        const hasCard = (s.runs || []).length;
        T.check(`${filename}/run_count`, hasCard === expectedUI, `Expected ${expectedUI} runs, got ${hasCard}`);
    } else {
        const hasCard = (s.traces || []).length;
        T.check(`${filename}/trace_count`, hasCard === expectedUI, `Expected ${expectedUI} traces, got ${hasCard}`);
    }
  } finally {
    if (fs.existsSync(path.join(__dirname, '..', 'data', 'chrom', 'dummy.csv'))) {
        fs.unlinkSync(path.join(__dirname, '..', 'data', 'chrom', 'dummy.csv'));
    }
    await close();
  }
}

(async () => {
  const genCsvGood = "ml,mAU\n1.0,0.0\n2.0,0.0\n3.0,0.0\n4.0,\n5.0,0malformed\n";
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'chrom', 'text_zero.csv'), genCsvGood);
  await T.t('text_zero', async () => await checkImport('text_zero.csv', 'trace', 1));

  const ndBase = "Sample Name\tA280\tA260\nvalid_zero\t0\t1\nempty_val\t\t1\nmalformed_val\t0abc\t1\n";
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'chrom', 'nanodrop_zero.tsv'), ndBase);
  await T.t('nanodrop_zero', async () => await checkImport('nanodrop_zero.tsv', 'nd', ['0']));

  const aktaBase = "UV 1_280\t\nml\tmAU\n1.0\t0.0\n2.0\t0.0\n3.0\t0.0\n4.0\t\n5.0\t0malformed\n";
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'chrom', 'akta_zero.csv'), aktaBase);
  await T.t('akta_zero', async () => await checkImport('akta_zero.csv', 'run', 1));

  T.done();
})();
// Retry to bypass Claude AI review timeout/error in github actions
