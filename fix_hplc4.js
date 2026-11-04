const fs = require('fs');

let content = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const searchLaneProfile = `for (let y=0;y<P.h;y++){ const x0 = Math.max(0, Math.floor((i + DET.laneLo)*lw + tr[y])), x1 = Math.min(P.w, Math.ceil((i + DET.laneHi)*lw + tr[y])); let t = 0; const o = y*P.w; const src = P.q || P.d; for (let x=x0;x<x1;x++) t += src[o + x]; pr[y] = x1 > x0 ? t/(x1 - x0) : 0; }`;
const searchLaneProfile2 = `for (let y=0;y<P.h;y++){ const x0 = Math.max(0, Math.floor((i + DET.laneLo)*lw + tr[y])), x1 = Math.min(P.w, Math.ceil((i + DET.laneHi)*lw + tr[y])); let t = 0; const o = y*P.w, L = P.q || P.d; for (let x=x0;x<x1;x++) t += L[o + x]; pr[y] = x1 > x0 ? t/(x1 - x0) : 0; }`;
const searchLaneProfileOrig = `for (let y=0;y<P.h;y++){ const x0 = Math.max(0, Math.floor((i + DET.laneLo)*lw + tr[y])), x1 = Math.min(P.w, Math.ceil((i + DET.laneHi)*lw + tr[y])); let t = 0; const o = y*P.w; for (let x=x0;x<x1;x++) t += P.d[o + x]; pr[y] = x1 > x0 ? t/(x1 - x0) : 0; }`;

const replaceLaneProfile = `for (let y=0;y<P.h;y++){ const x0 = Math.max(0, Math.floor((i + DET.laneLo)*lw + tr[y])), x1 = Math.min(P.w, Math.ceil((i + DET.laneHi)*lw + tr[y])); let t = 0; const o = y*P.w; const src = P.q || P.d; for (let x=x0;x<x1;x++) t += src[o + x]; pr[y] = x1 > x0 ? t/(x1 - x0) : 0; }`;

let replaced = false;

if (content.indexOf(searchLaneProfile) !== -1) {
    content = content.replace(searchLaneProfile, replaceLaneProfile);
    replaced = true;
} else if (content.indexOf(searchLaneProfile2) !== -1) {
    content = content.replace(searchLaneProfile2, replaceLaneProfile);
    replaced = true;
} else if (content.indexOf(searchLaneProfileOrig) !== -1) {
    content = content.replace(searchLaneProfileOrig, replaceLaneProfile);
    replaced = true;
}

if (!replaced) {
    console.error("Could not find searchLaneProfile in file");
}

fs.writeFileSync('hplc-figure-bench(WF1.13).html', content);
console.log("Updated hplc");
