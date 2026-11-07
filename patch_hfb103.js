const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I also need to apply what PR 1033 did for `storeLoad`.
// Why didn't `PAGE LOG 2: d.rawFiles in storeLoad` print anything?
// Ah! `p2.on('console')` might be missing early logs because `await open()` triggers load right away!
// Wait! `recent` clicks do load but the log is not printed.
// Let's add a debugger to `idbRawDo('readonly', ...)`
// Wait, is it returning `undefined` for `d.rawFiles`? Yes, `PAGE LOG 2` is printing NOTHING.
// Oh, `if (d.app === 'HPLC Figure Bench' && d.version >= 2) d = await unpackCloud(d);`
// Actually, `unpackCloud` deletes `rawFiles` because it returns `{..., _lost: lost}`.
// But we replaced it to have `rawFiles: st.rawFiles` right?
