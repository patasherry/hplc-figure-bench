const fs = require('fs');
const file = 'hplc-figure-bench(WF1.13).html';
let html = fs.readFileSync(file, 'utf8');

const search = `  for (const sg of data.gels || []) { try { const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = sg.image; });
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);`;

const replace = `  for (const sg of data.gels || []) { try { let c; if (sg.image) { const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = sg.image; });
      c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); } else { c = document.createElement('canvas'); c.width = 100; c.height = 100; }`;

if (html.includes(search)) {
    html = html.replace(search, replace);
    fs.writeFileSync(file, html);
    console.log('patched');
} else {
    console.log('not found');
}
