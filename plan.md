1. **Understand the problem**:
   - The user wants to ensure that derived gel labels in the main app `hplc-figure-bench(WF1.13).html` have a minimum font size of `5pt` for export (specifically for Nature figure guidelines).
   - In `gelPart`, there are several calculations that derive font sizes (e.g., `bf` for band labels, `kf` for inline known labels, `pf` for purity row labels, and `vf` for narrow vertical lane labels).
   - Some of these currently use `Math.max(4, fs*...)`, meaning they have a minimum size of 4. We should change those to `Math.max(5, ...)` and update the initial `vf` assignment to have a minimum bound of `5` when applicable (or `Math.max(5, Math.min(lf, ...))`). Actually, wait... the minimum size for `vf` currently is `Math.max(fs*0.35, ...)`. We should bound `vf` to at least 5 when `opt.preset` implies an export that might violate it... wait, the instruction says: "Apply a 5 pt minimum for exports targeting that publication constraint and accommodate label extents." We can just set a hard 5pt minimum, or minimum of 5 if `fs` is small.

   Let's check the instruction carefully: "At the 8 pt journal setting, band and inline labels can be 4.96 and 4.64 pt, and narrow vertical labels can reach 2.8 pt. Apply a 5 pt minimum for exports targeting that publication constraint and accommodate label extents."
   We should find the font sizes in `gelPart` and ensure they are bounded by `Math.max(5, ...)` (where 5 is the minimum pt size).

2. **Fix `hplc-figure-bench(WF1.13).html`**:
   - For `vf` (narrow vertical labels): `let vf = vert ? Math.max(5, Math.min(lf, laneW*0.78)) : lf;` (or rather `Math.max(5, Math.max(fs*0.35, Math.min(lf, laneW*0.78)))`). Let's trace it.
     - Around line 3233: `vf = vert ? Math.max(5, fs*0.35, Math.min(lf, laneW*0.78)) : lf;` ... wait, `vf` must be at least 5. If `Math.min(lf, laneW*0.78)` is less than 5, it gets boosted to 5. So `vf = vert ? Math.max(5, fs*0.35, Math.min(lf, laneW*0.78)) : lf;` is what it effectively means. Let's just use `Math.max(5, ...)` where 4 or `fs*0.35` was used for derived sizes.
   - Wait, `vf = vert ? Math.max(5, Math.max(fs*0.35, Math.min(lf, laneW*0.78))) : lf;`. Actually let's just make it `Math.max(5, Math.min(lf, laneW*0.78))` but if `fs*0.35` is larger, we take that. `Math.max(5, fs*0.35, ...)` wait `Math.max(5, fs*0.35)` is just `Math.max(5, fs*0.35)`.
   - Around line 3236: `if (vert) vf = Math.max(5, fs*0.35, Math.min(lf, laneW*0.78));`
   - For `bf` (band labels, line ~3271): `const bf = Math.max(5, fs*0.62);`
   - For `kf` (inline known labels, line ~3330): `const kf = Math.max(5, fs*0.58);`
   - For `pf` (purity row labels, line ~3340): `const pf = Math.max(5, fs*0.75);`

3. **Add the UI test in `tests/suites/40_visual.js` or `tests/suites/50_export.js`**:
   - The user requested: "Add a UI-only synthetic calibrated-gel check to `tests/suites/40_visual.js` or `50_export.js`, enabling band labels and an inline known-protein match."
   - Set `#o-preset` to `onehalf`. (or `single`).
   - Load `F.gel` through `#gelFile`, set `#o-bandLabels` to `all`, `#o-knownOn` checked, `#o-knownShow` to `inline`, `#o-purRow` checked. Force long labels/many lanes through `#g-n` and `#g-labels` to trigger vertical `vf`.
   - Assert the expected band, inline-known, purity, and vertical lane texts exist under `#paper svg`.
   - Measure each text's resolved `getComputedStyle(text).fontSize` and require every generated label to be at least `5px`/pt. (The resolved font size will be in `px`. 5pt = 5 * 1.333 px ? Wait, `font-size` in SVG text might just be a number like "5" which CSS interprets as "5px" if no units are specified. The prompt says "require every generated label to be at least `5px`/pt". Let's check if the browser computedStyle returns "5px".)
   - Retain `figGeom()` inside-svg and `h.overlaps()` checks.
   - Let's put this in `40_visual.js`.

4. **Verify changes before and after**:
   - The test must fail before fixing `gelPart`.
   - Apply fix.
   - The test must pass after fixing.

5. **Create the PR**

Let's refine the test.
