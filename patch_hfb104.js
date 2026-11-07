const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I also need to make sure that `st.rawFiles` is preserved in `packCloud`
html = html.replace("return {app: 'HPLC Figure Bench', version: 2, opt: st.opt, prep: st.prep, runs: runs2, traces: tr2, gels: gels2, struct: s2, nanodrop: nd2, step: st.step, _lost: lost};", "return {app: 'HPLC Figure Bench', version: 2, opt: st.opt, prep: st.prep, runs: runs2, traces: tr2, gels: gels2, struct: s2, nanodrop: nd2, step: st.step, rawFiles: st.rawFiles, _lost: lost};");
html = html.replace("const st = {opt: S.opt, prep: S.prep, runs: r2, traces: tr2, gels: g2, struct: s2, nanodrop: nd2};", "const st = {opt: S.opt, prep: S.prep, runs: r2, traces: tr2, gels: g2, struct: s2, nanodrop: nd2, rawFiles: S.data.rawFiles};");

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
