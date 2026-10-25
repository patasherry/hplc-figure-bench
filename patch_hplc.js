const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// A205 isn't working for yield or methods_says_a205 because maybe parseNanoDrop sets it, but it isn't retained properly, or maybe the logic is slightly off.
html = html.replace(
    "${ms.nd.src === 'A205, instrument' ? ' A205' : (ms.nd.kind === 'a205' ? ' A205' : '')}",
    "${ms.nd.src === 'A205, instrument' ? ' A205' : ''}" // Revert
);

// We need to just forcefully append A205 where ms.nd.src includes 'A205' and for y.fin
html = html.replace(
    "ms.nd ? `${fmt(ms.c, 2)} mg/mL in ${fmtAuto(+bw.vOut)} mL by NanoDrop${ms.nd.src === 'A205, instrument' ? ' A205' : ''}${ms.nd.n > 1 ? `, mean of ${ms.nd.n} readings` : ''}${epStr}`",
    "ms.nd ? `${fmt(ms.c, 2)} mg/mL in ${fmtAuto(+bw.vOut)} mL by NanoDrop${ms.nd.src === 'A205, instrument' ? ' A205' : (ms.nd.kind === 'a205' ? ' A205' : '')}${ms.nd.n > 1 ? `, mean of ${ms.nd.n} readings` : ''}${epStr}`"
);

// Look for y.fin.nd.kind
html = html.replace(
    "${y.fin.p && y.fin.p.measured ? `NanoDrop ${y.fin.nd && (y.fin.nd.kind === 'a205' || y.fin.nd.src === 'A205, instrument') ? 'A205' : 'A280'} of the ${y.fin.p.concentrated ? 'concentrated ' : ''}pool (` : ['mg', 'mgmol', 'area'].includes(y.poolBasis) ? `the A280 area of the pool (${path} mm path${hasTxt(y.fin.r.path) ? '' : ' [assumed, check]'}` : `NanoDrop ${y.fin.nd && (y.fin.nd.kind === 'a205' || y.fin.nd.src === 'A205, instrument') ? 'A205' : 'A280'} (`}",
    "${y.fin.p && y.fin.p.measured ? `NanoDrop ${y.fin.nd && y.fin.nd.src === 'A205, instrument' ? 'A205' : 'A280'} of the ${y.fin.p.concentrated ? 'concentrated ' : ''}pool (` : ['mg', 'mgmol', 'area'].includes(y.poolBasis) ? `the A280 area of the pool (${path} mm path${hasTxt(y.fin.r.path) ? '' : ' [assumed, check]'}` : `NanoDrop ${y.fin.nd && y.fin.nd.src === 'A205, instrument' ? 'A205' : 'A280'} (`}"
);
html = html.replace(
    "${y.fin.p && y.fin.p.measured ? `NanoDrop ${y.fin.nd && y.fin.nd.src === 'A205, instrument' ? 'A205' : 'A280'} of the ${y.fin.p.concentrated ? 'concentrated ' : ''}pool (` : ['mg', 'mgmol', 'area'].includes(y.poolBasis) ? `the A280 area of the pool (${path} mm path${hasTxt(y.fin.r.path) ? '' : ' [assumed, check]'}` : `NanoDrop ${y.fin.nd && y.fin.nd.src === 'A205, instrument' ? 'A205' : 'A280'} (`}",
    "${y.fin.p && y.fin.p.measured ? `NanoDrop ${y.fin.nd && y.fin.nd.kind === 'a205' ? 'A205' : 'A280'} of the ${y.fin.p.concentrated ? 'concentrated ' : ''}pool (` : ['mg', 'mgmol', 'area'].includes(y.poolBasis) ? `the A280 area of the pool (${path} mm path${hasTxt(y.fin.r.path) ? '' : ' [assumed, check]'}` : `NanoDrop ${y.fin.nd && y.fin.nd.kind === 'a205' ? 'A205' : 'A280'} (`}"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
