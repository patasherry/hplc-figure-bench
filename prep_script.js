console.log("For fracSegments, it takes (run, dataEnd).");
console.log("Run object has properties that can change: run.fracs (and its elements), run.fracEnd");
console.log("Cache key should depend on them. Simple JSON stringification of run.fracs is good enough, along with dataEnd and run.fracEnd.");

console.log("\nFor integRows, it depends on:");
console.log("run.integ, opt.intMethod, opt.intBase, run.uvs, run.shade, poolRows, secFit (isSec)");
console.log("Cache key should be robust.");

console.log("\nFor poolRows, it depends on:");
console.log("run.uvs, run.shade, poolBlocks(run) (which depends on run.shade), opt.intBase, poolMeas(run)");
console.log("poolMeas depends on run.poolConc, run.poolFinalVol, prep.btw[run.id], ndFinalOf(run)");

console.log("\nThe issue instructions suggest:");
console.log("Cache their results on the `run` object and invalidate when data arrays or relevant settings (like baseline options) change.");

console.log("\nInstead of a complex manual string key, we can use a simpler approach.");
console.log("We can add a _cache object to the run.");
console.log("For fracSegments, key could be `${dataEnd}|${run.fracEnd}|${JSON.stringify(run.fracs)}`");
console.log("For integRows, key could be `${opt.intMethod}|${opt.intBase}|${JSON.stringify(run.integ)}|${run.shade}|${run.uvi}|${uvOf(run).ys.length}`");
console.log("But poolMeas involves prep.btw and ndSamples, which is outside the run object. So if they change, we need to invalidate.");
