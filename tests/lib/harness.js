// Shared harness for the synthetic stress suite.
// Point it at any build with APP=/path/to/app.html. Every suite uses only the page's UI and DOM, never its internals,
// so the same tests run unchanged against a rewritten app as long as the element ids below still exist.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = path.resolve(__dirname, '..'), DATA = path.join(ROOT, 'data'), RES = path.join(ROOT, 'results');
/* default: the app in the repository root */
const APP = require('./app');
/* Inputs that were first real lab files. The real files are private (unpublished data) and never go in the repository.
   With HFB_PRIVATE_DATA set to the folder that holds them, the suites use the real file; otherwise a synthetic stand-in
   from data/standins (gen_standins.py), in the same format, with the same fraction labels. */
const PRIV = process.env.HFB_PRIVATE_DATA ? path.resolve(process.env.HFB_PRIVATE_DATA) : null;
const SOURCES = {
  his: ['260925_PS_Human_NADK_His_Trap_1mL_FF_Step_002_001.csv', 'standins/imac_histrap_1ml_step.csv'],
  ortho: ['260925_PS_Human_NADK_ORTHO_HisTrap_1mL_FF_step_Loop_Load_001_001.csv', 'standins/imac_histrap_1ml_ortho.csv'],
  q: ['260925_PS_Human_NADK_Q_6_mL_anion_exchange___001_001.csv', 'standins/iex_q_6ml.csv'],
  s200: ['sec/sec_nadk_s200.csv', 'chrom/sec_S200_Increase_minutes_u7.csv'],
  secZip: ['fdh_run.zip', 'chrom/sec_Sup6_basic_unicorn7.zip'],
  nd: ['ndc/conc.csv', 'nd/nd_one_protein_a280.csv'],
  ndSpec: ['ndc/conc_spec.csv', 'nd/nd_one_with_spectra.csv'],
  gb: ['prep/data/pET28-SUMO-NADK.gb', 'standins/pET28-SUMO-standin.gb'],
  gel: ['NADK_gel.jpg', 'standins/gel_photo.jpg']};
const real = k => !!(PRIV && fs.existsSync(path.join(PRIV, SOURCES[k][0])));
const src = k => real(k) ? path.join(PRIV, SOURCES[k][0]) : path.join(DATA, SOURCES[k][1]);
fs.mkdirSync(RES, {recursive: true});
const blobs = new Map(), docs = new Map();
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/_blob/')) { const b = blobs.get(u.slice(7)); if (!b) { res.writeHead(404); return res.end(); } res.writeHead(200, {'content-type': b.type}); return res.end(b.buf); }
  if (u === '/' || u === '/index.html') { res.writeHead(200, {'content-type': 'text/html'}); return res.end(fs.readFileSync(APP)); }
  res.writeHead(404); res.end(); });
const MOCK = `(() => { let n = 0; const docs = {};
  const snap = (id, d) => ({id, exists: !!d, data: () => d ? JSON.parse(JSON.stringify(d)) : undefined, metadata: {fromCache: false, hasPendingWrites: false}});
  const docRef = p => ({id: p.split('/').pop(), path: p, get: async () => { const d = await window.__getDoc(p); return snap(p.split('/').pop(), d); }, set: async d => { const js = JSON.stringify(d); if (js.length > 262144) throw {code: 'invalid_argument', message: 'too big'}; await window.__setDoc(p, js); }, update: async d => {}, delete: async () => window.__delDoc(p)});
  const col = p => ({path: p, doc: id => docRef(p + '/' + id), orderBy(f, dir) { this._o = [f, dir]; return this; }, limit() { return this; }, where() { return this; },
    get: async function() { const all = JSON.parse(await window.__listDocs(p)); const o = this._o; if (o) all.sort((a, b) => (o[1] === 'desc' ? -1 : 1)*((a.d[o[0]] || 0) - (b.d[o[0]] || 0))); const ds = all.map(x => snap(x.id, x.d)); return {docs: ds, size: ds.length, empty: !ds.length, docChanges: () => [], metadata: {}}; }});
  const db = {doc: docRef, collection: col};
  const assets = {upload: async (blob, o) => { const id = 'a' + (Date.now().toString(16) + (n++).toString(16)).padStart(31, '0').slice(-31); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      await window.__putBlob(id, btoa(s), (o && o.type) || blob.type); return {id, url: '/_blob/' + id, sizeBytes: buf.length, contentType: (o && o.type) || blob.type}; }, delete: async id => window.__delBlob(id), list: async () => ({assets: [], usage: {}})};
  const user = {id: async () => 'u_test', me: async () => ({id: 'u_test'}), isOwner: async () => true, canEdit: async () => true, can: async () => true};
  window.claude = {use: async name => name === 'db' ? db : name === 'assets' ? assets : name === 'user' ? user : null}; })();`;
let serverPort = 0; const ready = new Promise(r => server.listen(0, () => { serverPort = server.address().port; r(); }));
/* open the app. opts: {cloud: bool, width, height} */
async function open(opts = {}){ await ready; const cloud = !!opts.cloud;
  const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: opts.width || 1500, height: opts.height || 1000}, deviceScaleFactor: 1, acceptDownloads: true});
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType: 'text/css', body: ''}));
  if (cloud) { await ctx.exposeFunction('__putBlob', (id, b64, type) => { blobs.set(id, {buf: Buffer.from(b64, 'base64'), type}); }); await ctx.exposeFunction('__delBlob', id => { blobs.delete(id); });
    await ctx.exposeFunction('__setDoc', (p, js) => { docs.set(p, JSON.parse(js)); }); await ctx.exposeFunction('__getDoc', p => docs.get(p) || null); await ctx.exposeFunction('__delDoc', p => { docs.delete(p); });
    await ctx.exposeFunction('__listDocs', p => JSON.stringify([...docs].filter(([k]) => k.startsWith(p + '/') && k.split('/').length === p.split('/').length + 1).map(([k, d]) => ({id: k.split('/').pop(), d})))); await ctx.addInitScript(MOCK); }
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|ERR_|404|favicon/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto(cloud ? `http://localhost:${serverPort}/` : 'file://' + APP); await p.waitForTimeout(900);
  return {b, ctx, p, errs, close: async () => { await b.close(); }};
}
/* ---------- UI helpers. Selectors live here only, so a renamed id is fixed in one place ---------- */
const H = p => ({
  wait: ms => p.waitForTimeout(ms),
  newProject: async name => { await p.fill('#npName', name); await p.click('#newProj button[type=submit]'); await p.waitForTimeout(700); },
  step: async k => { await p.click(`#tl [data-step="${k}"]`); await p.waitForTimeout(450); },
  timeline: () => p.$$eval('#tl .tl-i', els => els.map(e => ({k: e.dataset.step, t: (e.querySelector('.tt') || {}).textContent, s: (e.querySelector('.ts') || {}).textContent, warn: !!e.closest('li.warn'), done: !!e.closest('li.done')}))),
  addRun: async files => { await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=run]'); await p.setInputFiles('#file', [].concat(files)); await p.waitForTimeout(2200); },
  /* files go in through the picker; a very long or non-ASCII name goes in as a drag and drop, which the picker in the test browser cannot pass */
  dropFiles: async files => { const L = [].concat(files); if (L.some(f => path.basename(f).length > 120)) { for (const f of L) { const b64 = fs.readFileSync(f).toString('base64');
      await p.evaluate(([n, b]) => { const u = Uint8Array.from(atob(b), c => c.charCodeAt(0)), dt = new DataTransfer(); dt.items.add(new File([u], n)); document.dispatchEvent(new DragEvent('drop', {dataTransfer: dt, bubbles: true})); }, [path.basename(f), b64]); } }
    else await p.setInputFiles('#file', L); await p.waitForTimeout(2200); },
  pool: async t => { await p.locator('.trace.run.sel [data-k=shade]').fill(t); await p.waitForTimeout(400); },
  suggest: async () => { await p.click('.trace.run.sel [data-act=suggest]'); await p.waitForTimeout(500); return p.locator('.trace.run.sel [data-k=shade]').inputValue(); },
  addConc: async (ndFile, vol) => { await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await p.waitForTimeout(400);
    if (ndFile) { await p.setInputFiles('#btwNdFile', ndFile); await p.waitForTimeout(700); }
    if (vol != null) { await p.fill('#btw-vOut', String(vol)); await p.dispatchEvent('#btw-vOut', 'change'); await p.waitForTimeout(600); } },
  gb: async f => { await p.click('#tl [data-step=construct]'); await p.waitForTimeout(300); await p.setInputFiles('#gbFile', f); await p.waitForTimeout(1200); },
  toasts: () => p.$$eval('.toast, #toast', e => e.map(x => x.textContent)),
  peakTable: () => p.$$eval('#intTable tr', rs => rs.filter(r => r.offsetParent !== null).map(r => [...r.cells].filter(c => getComputedStyle(c).display !== 'none').map(c => (c.querySelector('input') ? c.querySelector('input').value : c.textContent).trim()))),
  sumTable: () => p.$$eval('#sumTable tr', rs => rs.map(r => [...r.cells].map(c => c.textContent.trim()))),
  methods: () => p.$eval('#methodsText', e => e.value),
  status: () => p.$eval('#spec', e => e.parentElement.innerText),
  svgTexts: () => p.$$eval('#paper svg text', ts => ts.map(t => { const b = t.getBoundingClientRect(); return {t: t.textContent, x: b.x, y: b.y, w: b.width, h: b.height}; })),
  /* pairs of figure texts whose boxes overlap by more than 25% of the smaller one */
  overlaps: () => p.$$eval('#paper svg text', ts => { const B = ts.map(t => ({t: t.textContent, r: t.getBoundingClientRect()})).filter(x => x.r.width > 0 && x.t.trim()); const out = [];
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i].r, b = B[j].r, w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 0 && h > 0 && w*h > 0.25*Math.min(a.width*a.height, b.width*b.height)) out.push(`${B[i].t} × ${B[j].t}`); } return out; }),
  hScroll: () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
  shot: async file => { await p.screenshot({path: file, fullPage: true}); },
  paperShot: async file => { const bx = await p.$eval('#paper svg', e => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height)}; }); await p.screenshot({path: file, clip: bx}); },
});
/* ---------- results ---------- */
function suite(name){ const res = {suite: name, app: APP, started: new Date().toISOString(), checks: []};
  const check = (id, ok, detail) => { res.checks.push({id, ok: !!ok, detail: detail == null ? '' : String(detail).slice(0, 600)}); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}/${id}${detail != null && !ok ? ' :: ' + String(detail).slice(0, 300) : ''}`); return !!ok; };
  const near = (a, b, tol) => Math.abs(+a - +b) <= tol;
  const done = () => { res.finished = new Date().toISOString(); fs.writeFileSync(path.join(RES, name + '.json'), JSON.stringify(res, null, 1)); server.close(); return res; };
  /* wrap a test so a thrown error is a failed check, not a crashed suite */
  const t = async (id, fn) => { try { await fn(); } catch (e) { check(id + ':threw', false, e.message.split('\n')[0]); } };
  return {check, near, done, t, res};
}
module.exports = {open, H, suite, APP, ROOT, DATA, RES, path, fs, src, real, PRIV};
