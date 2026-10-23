// 50 export: checks every export offered by the app (SVG, PNG, multi-figure ZIP, CSVs, project JSON).
// UI and DOM only.
const {open, H, suite, src, fs, path} = require('../lib/harness');

function parseCsv(str) {
  const lines = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  return lines.map(line => {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        cells.push(cur); cur = '';
      } else { cur += c; }
    }
    cells.push(cur);
    return cells;
  });
}

function parseZip(buffer) {
  const files = [];
  let offset = 0;
  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataOffset = offset + 30 + nameLen + extraLen;
      const data = buffer.subarray(dataOffset, dataOffset + compressedSize);
      files.push({ name, compMethod, compressedSize, uncompressedSize, data });
      offset = dataOffset + compressedSize;
    } else if (sig === 0x02014b50 || sig === 0x06054b50) {
      break;
    } else {
      offset++;
    }
  }
  return files;
}

(async () => {
  const T = suite('50_export'), {p, errs, close} = await open(), h = H(p);

  await T.t('exports', async () => {
    // 1. Build a project through the UI
    await h.newProject('Export Test Project');
    await h.addRun(src('his'));
    await h.pool('T1-T6');
    await h.addConc(src('nd'), 0.5);
    await p.setInputFiles('#gelFile', [src('gel')]);
    await h.wait(1500);

    const download = async (selector, timeout = 10000) => {
      const loc = p.locator(selector);
      await loc.scrollIntoViewIfNeeded();
      const [dl] = await Promise.all([
        p.waitForEvent('download', { timeout }).catch(() => null),
        loc.click()
      ]);
      if (!dl) return null;
      const name = dl.suggestedFilename();
      const tmpPath = path.join(path.resolve(__dirname, '../results'), name);
      await dl.saveAs(tmpPath);
      const buf = fs.readFileSync(tmpPath);
      return { name, buf, str: buf.toString('utf8') };
    };

    // --- Project JSON Export (#projSave) ---
    const proj = await download('#projSave');
    T.check('export.project_json.download', !!proj, 'Project JSON file downloaded');
    if (proj) {
      let parsed = null;
      try { parsed = JSON.parse(proj.str); } catch (e) {}
      T.check('export.project_json.valid', !!parsed, 'Project JSON parses');
      T.check(
        'export.project_json.contains_data',
        parsed && Array.isArray(parsed.runs) && parsed.runs.length > 0 &&
        Array.isArray(parsed.gels) && parsed.gels.length > 0 &&
        Array.isArray(parsed.nanodrop) && parsed.nanodrop.length > 0,
        `runs: ${parsed?.runs?.length}, gels: ${parsed?.gels?.length}, nanodrop: ${parsed?.nanodrop?.length}`
      );
    }

    // --- Band Table CSV Export (#bandCsv) ---
    const band = await download('#bandCsv');
    T.check('export.csv_band.download', !!band, 'Band CSV downloaded');
    if (band) {
      const bandRows = parseCsv(band.str);
      T.check('export.csv_band.parsed', bandRows.length > 0, `rows: ${bandRows.length}`);
      T.check(
        'export.csv_band.header_and_cols',
        bandRows.length >= 1 && bandRows.every(r => r.length === bandRows[0].length),
        `header cols: ${bandRows[0]?.length}`
      );
      T.check(
        'export.csv_band.no_nan_null',
        bandRows.every(r => r.every(c => !/\b(NaN|undefined|null)\b/i.test(c))),
        'no NaN, undefined or null'
      );
    }

    // --- Peak / Integration Table CSV Export (#intCsv) ---
    const steps = await h.timeline();
    const runStep = steps.find(s => s.k.startsWith('run:'));
    if (runStep) {
      await h.step(runStep.k);
      await h.wait(500);
    }
    const integ = await download('#intCsv');
    T.check('export.csv_peak.download', !!integ, 'Peak/Integration CSV downloaded');
    if (integ) {
      const integRows = parseCsv(integ.str);
      T.check('export.csv_peak.parsed', integRows.length > 0, `rows: ${integRows.length}`);
      T.check(
        'export.csv_peak.header_and_cols',
        integRows.length >= 1 && integRows.every(r => r.length === integRows[0].length),
        `header cols: ${integRows[0]?.length}`
      );
      T.check(
        'export.csv_peak.no_nan_null',
        integRows.every(r => r.every(c => !/\b(NaN|undefined|null)\b/i.test(c))),
        'no NaN, undefined or null'
      );
    }

    // --- Figure Exports (SVG, PNG, ZIP, Summary CSV on Figure Step) ---
    await h.step('figure');
    await h.wait(500);

    // SVG Export (#saveSvg)
    const svg = await download('#saveSvg');
    T.check('export.svg.download', !!svg, 'SVG figure downloaded');
    if (svg) {
      const isWellFormed = svg.str.length > 0 && /^\s*<\?xml|<svg/i.test(svg.str) && /<\/svg>\s*$/i.test(svg.str);
      T.check('export.svg.well_formed', isWellFormed, 'SVG well-formed XML with <svg> root');
    }

    // PNG Export (#savePng)
    const dpi = await p.$eval('#o-dpi', e => +e.value || 600);
    const geo = await p.evaluate(() => {
      const svgEl = document.querySelector('#paper svg');
      const w = parseFloat(svgEl.getAttribute('width')) || 0;
      const h = parseFloat(svgEl.getAttribute('height')) || 0;
      const vb = (svgEl.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      return { w: vb[2] || w * 72, h: vb[3] || h * 72 };
    });
    const png = await download('#savePng');
    T.check('export.png.download', !!png, 'PNG figure downloaded');
    if (png) {
      const isPngSig = png.buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      T.check('export.png.signature', isPngSig, 'PNG valid signature');
      const pngW = png.buf.readUInt32BE(16);
      const pngH = png.buf.readUInt32BE(20);
      const expectedW = Math.round(geo.w * dpi / 72);
      const expectedH = Math.round(geo.h * dpi / 72);
      T.check(
        'export.png.pixel_size',
        pngW === expectedW && pngH === expectedH,
        `PNG dimensions ${pngW}x${pngH}, expected ${expectedW}x${expectedH}`
      );
    }

    // ZIP Multi-figure Export (#saveAll)
    const zipFile = await download('#saveAll', 15000);
    T.check('export.zip.download', !!zipFile, 'Multi-figure ZIP downloaded');
    if (zipFile) {
      const zipEntries = parseZip(zipFile.buf);
      T.check('export.zip.opens', zipEntries.length > 0, `ZIP entries: ${zipEntries.length}`);
      T.check(
        'export.zip.contains_expected_files',
        zipEntries.some(e => e.name.endsWith('.svg')) && zipEntries.some(e => e.name.endsWith('.png')),
        `contains svg & png files`
      );
    }

    // Summary CSV Export (#sumCsv)
    const sum = await download('#sumCsv', 5000);
    T.check('export.csv_summary.download', !!sum, 'Summary CSV downloaded');
    if (sum) {
      const sumRows = parseCsv(sum.str);
      T.check('export.csv_summary.parsed', sumRows.length > 0, `rows: ${sumRows.length}`);
      T.check(
        'export.csv_summary.header_and_cols',
        sumRows.length >= 1 && sumRows.every(r => r.length === sumRows[0].length),
        `header cols: ${sumRows[0]?.length}`
      );
      T.check(
        'export.csv_summary.no_nan_null',
        sumRows.every(r => r.every(c => !/\b(NaN|undefined|null)\b/i.test(c))),
        'no NaN, undefined or null'
      );
    }
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
