const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// Also log from unpackCloud and packFor again.
html = html.replace("const p = await idbDo('readonly', st => st.get(id)); if (!p) throw new Error('gone'); return {meta: p, data: JSON.parse(p.data)};", "const p = await idbDo('readonly', st => st.get(id)); if (!p) throw new Error('gone'); let d = JSON.parse(p.data); console.log('d.rawFiles in storeLoad: ' + (d.rawFiles ? d.rawFiles.length : 'undefined')); return {meta: p, data: d};");
html = html.replace("if (STORE.mode === 'local') { const d = Object.assign({}, S.data);", "if (STORE.mode === 'local') { const d = Object.assign({}, S.data); console.log('d.rawFiles in packFor: ' + (d.rawFiles ? d.rawFiles.length : 'undefined'));");

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
