const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I also need to apply what PR 1033 did for `packFor` and `storeLoad` which wasn't fully applied since my patch missed it.
html = html.replace('await idbDo(\'readwrite\', st => st.put(Object.assign({id: P.id}, S.meta, {updated: Date.now(), rev: P.rev + 1, data: js, refs: pk.refs}))); P.rev++; P.sig = sig; savedTo(P, S.seq);', 'await idbDo(\'readwrite\', st => st.put(Object.assign({id: P.id}, S.meta, {updated: Date.now(), rev: P.rev + 1, data: js}))); for (const f of rawFiles) { if (f._blob) { await idbRawDo(\'readwrite\', st => st.put({id: f.id, projId: P.id, blob: f._blob})); delete f._blob; } } P.rev++; P.sig = sig; savedTo(P, S.seq);');
html = html.replace('if (now && now.refs) { const keep = new Set(pk.refs || []); now.refs.filter(id => !keep.has(id)).forEach(id => idbAssetDo(\'readwrite\', st => st.delete(id)).catch(() => {})); }', '');

// Also I need to apply what PR 1033 did for `storeLoad`
html = html.replace("const p = await idbDo('readonly', st => st.get(id)); if (!p) throw new Error('gone');\n  let d = JSON.parse(p.data);\n  if (d.app === 'HPLC Figure Bench' && d.version >= 2) d = await unpackCloud(d);\n  return {meta: p, data: d};", "const p = await idbDo('readonly', st => st.get(id)); if (!p) throw new Error('gone'); return {meta: p, data: JSON.parse(p.data)};");

// Also I need to apply what PR 1033 did for `storeDelete`
html = html.replace("if (STORE.mode === 'local') {\n    const p = await idbDo('readonly', st => st.get(id));\n    await idbDo('readwrite', st => st.delete(id));\n    if (p && p.refs) p.refs.forEach(x => idbAssetDo('readwrite', st => st.delete(x)).catch(() => {}));\n  }", "if (STORE.mode === 'local') { await idbDo('readwrite', st => st.delete(id)); try { const allRaw = await idbRawDo('readonly', st => st.getAll()); for (const r of allRaw) if (r.projId === id) await idbRawDo('readwrite', st => st.delete(r.id)); } catch (e) {} }");

// Fix data-step to include all steps so we can view the raw files list
html = html.replace('<section class="grp raw" id="rawPanel" hidden>', '<section class="grp raw" id="rawPanel" data-step="run gel figure final man conc btw cleave struct pool" hidden>');
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
