# Antigravity Audit Report (`hplc-figure-bench(WF1.13).html`)

This audit investigates scientific correctness, file parsing, data persistence, and crash/silent failure edge cases in `hplc-figure-bench(WF1.13).html`.

As required by `AGENTS.md`, `hplc-figure-bench(WF1.13).html` was **not modified** as part of this audit. Every finding below was reproduced using synthetic test data in isolated test scripts (retained in scratch, not committed). None of the items reported in `docs/cleanup-audit.md` or `docs/messages-audit.md` are repeated here.

> **Coordinator review (2026-10-23).** Each finding was checked against `main`.
> - **Finding 1 is withdrawn:** the summary column header reads "Protein (nmol)", so `1000*mg/kDa` (nmol) is correct.
> - **Finding 6 is a duplicate** of #14, fixed in #36 (`0,123` and `1,250` both handled).
> - The other 11 are confirmed in the code and kept below. Test file names in the issue blocks were corrected to existing suites.
> - Issues marked "Needs owner OK" change a scientific number and are not queued for an agent until the owner approves.

---

## Summary Table

| # | Finding | Area | Severity | Needs Owner OK |
|---|---|---|---|---|
| 1 | Summary Table µmol column displays nmol values (1000-fold error) | Scientific correctness (summary table) | Critical | **Yes** |
| 2 | NanoDrop µg/mL corrected concentration inflated 1000-fold by missing unit scaling | Scientific correctness (NanoDrop Acclaro) | Critical | **Yes** |
| 3 | Purification summary yield silently distorts when any workflow step lacks mg | Scientific correctness (yield arithmetic) | Critical | **Yes** |
| 4 | Cleavage quantification (`cleaveQuant`) misidentifies uncleaved fusion as 100% cleaved for proteins with small tags | Scientific correctness (gel cleavage %) | High | **Yes** |
| 5 | Peak integration table A260/A280 ratio divides raw absorbance without baseline subtraction | Scientific correctness (A260/A280 peak ratio) | High | **Yes** |
| 6 | `ndNum` parses comma-thousands numbers as decimals (e.g. `1,250` becomes `1.25`) | File parsing & Scientific correctness (NanoDrop) | High | **Yes** |
| 7 | `poolRows` ignores typed pool concentration for runs in minutes when final volume is not re-entered | Scientific correctness (pool mass) | High | **Yes** |
| 8 | Origin-spanning circular GenBank CDS features corrupt `cas.inner` and prevent promoter detection | File parsing & Construct diagram | Medium | No |
| 9 | `parseAkta` completely rejects European semicolon-delimited UNICORN CSV exports | File parsing (ÄKTA / UNICORN CSV) | Medium | No |
| 10 | `parseAkta` silently fails on UNICORN exports with > 6 lines of header metadata | File parsing (ÄKTA / UNICORN CSV) | Medium | No |
| 11 | `parseRunTime` corrupts international DD/MM/YYYY dates and fails on ISO YYYY-MM-DD dates | File parsing (run timestamps) | Medium | No |
| 12 | `parseBufB` concentration unit mismatch with molar buffers > 5 M against `compsOf` | Scientific correctness (buffer axis) | Low | **Yes** |
| 13 | `uvOf` throws unhandled TypeError when run object has empty `uvs` array | Crashes and silent failures (rendering) | Low | No |

---

## Detailed Findings

### 1. Summary Table µmol column displays nmol values (1000-fold error)
- **Area:** Scientific correctness (purification summary table)
- **Function & Location:** `sumDisplay` (~lines 4806–4807)
- **What goes wrong:**
  In the purification summary table, when molar basis (`molB`) is active (such as across a cleavage step), the table header explicitly labels the molar column as `<th>µmol</th>` (line 4806). However, the cell formatter in `sumDisplay` calculates:
  ```javascript
  ${E && E.kda > 0 && rows.mgOf(x) > 0 ? sig2(1000*rows.mgOf(x)/E.kda) : ''}
  ```
  Since $1\text{ mg} = 10^{-3}\text{ g}$ and $1\text{ kDa} = 1000\text{ g/mol}$, the ratio $\text{mg} / \text{kDa} = 10^{-6}\text{ mol} = 1\ \mu\text{mol}$. Therefore, $\text{mg} / \text{kDa}$ is **already in µmol**. Multiplying by 1000 yields **nmol**, not µmol.
- **How reproduced:**
  For 5.0 mg of a 50.0 kDa protein:
  $$\text{Moles} = \frac{5.0 \times 10^{-3}\text{ g}}{50{,}000\text{ g/mol}} = 0.10 \times 10^{-6}\text{ mol} = 0.10\ \mu\text{mol}$$
  `ndForRun` (line 5372) calculates `umol: mg / E.kda = 0.10`. But the summary table renders `1000 * 5.0 / 50.0 = 100 µmol` (a 1000-fold inflation, corresponding to 5 grams of protein instead of 5 milligrams).
- **Suggested fix:**
  Change `1000*rows.mgOf(x)/E.kda` to `rows.mgOf(x)/E.kda` in `sumDisplay`, or update the table column header to `<th>nmol</th>` if nanomoles was intended.
- **Risk:**
  Alters displayed molar numbers in the purification summary table; **needs owner OK**.

---

### 2. NanoDrop µg/mL corrected concentration inflated 1000-fold by missing unit scaling
- **Area:** Scientific correctness (NanoDrop Acclaro nucleic acid correction)
- **Function & Location:** `parseNanoDrop` (~line 5310) & `ndConc` (~line 5354)
- **What goes wrong:**
  When importing NanoDrop files with concentration in $\mu\text{g}/\text{mL}$, line 5310 converts `conc` to $\text{mg}/\text{mL}$:
  ```javascript
  let conc = cConc >= 0 ? ndNum(r[cConc]) : null;
  if (conc != null && /[µu]g\s*\/\s*ml/.test(unitTxt)) conc /= 1000;
  ```
  However, the Acclaro corrected concentration column (`corr: g(cCorr)` at line 5313) is never converted and remains in $\mu\text{g}/\text{mL}$. Later, `ndConc` calculates:
  ```javascript
  return Object.assign({}, c0, {v: c0.v*s.corr/s.conc, ...});
  ```
  Because `s.corr` is in $\mu\text{g}/\text{mL}$ and `s.conc` is in $\text{mg}/\text{mL}$, `s.corr / s.conc` is inflated by $1000\times$.
- **How reproduced:**
  A reading with concentration $2000\ \mu\text{g}/\text{mL}$ (2.0 mg/mL) and corrected concentration $1500\ \mu\text{g}/\text{mL}$ (1.5 mg/mL) results in `s.conc = 2` and `s.corr = 1500`. `ndConc` calculates $2.0 \times 1500 / 2.0 = 1500\text{ mg/mL}$ instead of $1.5\text{ mg/mL}$.
- **Suggested fix:**
  In `parseNanoDrop`, convert `corr` by dividing by 1000 whenever `conc` is divided by 1000:
  ```javascript
  let corr = cCorr >= 0 ? ndNum(r[cCorr]) : null;
  if (corr != null && /[µu]g\s*\/\s*ml/.test(unitTxt)) corr /= 1000;
  ```
- **Risk:**
  Affects NanoDrop readings with $\mu\text{g}/\text{mL}$ units and Acclaro corrected values; **needs owner OK**.

---

### 3. Purification summary yield silently distorts when any workflow step lacks mg
- **Area:** Scientific correctness (yield arithmetic across steps)
- **Function & Location:** `sumRows` (~lines 4771 & 4776)
- **What goes wrong:**
  In `sumRows`, the yield basis is selected globally using an all-or-nothing check:
  ```javascript
  let basis = out.length && out.every(x => x.nd && x.nd.umol != null) ? 'umol' : out.length && out.every(x => x.nd && x.nd.mg != null) ? 'nd' : out.length && out.every(x => x.p.mg > 0) ? 'mg' : 'area';
  ```
  If a workflow has two chromatography runs with valid protein masses (e.g., Step 1 HisTrap with 5.0 mg and Step 2 SEC with 2.5 mg), Step 2's yield is correctly 50%. However, if the user adds a third step without a calculated mass (such as a 214 nm peptide trace, a desalting column, or an uncalibrated step where `p.mg` is null), `out.every(x => x.p.mg > 0)` becomes false for the *entire* table.
  The basis silently switches to `'area'`. Step 2's yield is then computed as raw peak area ratio:
  ```javascript
  amt(x) = x.p.area
  ```
  If Step 1 used an ÄKTA with a 2 mm UV cell and Step 2 used an HPLC with a 10 mm UV cell (5-fold higher optical path), Step 2's apparent yield becomes $2500 / 1000 = 250\%$, replacing the true 50% mass recovery.
- **How reproduced:**
  Run 1: $1000\text{ mAU}\cdot\text{mL}$, 5.0 mg. Run 2: $2500\text{ mAU}\cdot\text{mL}$, 2.5 mg.
  With Runs 1 & 2 only: basis = `'mg'`, yield = 50%.
  Adding Run 3 (null mg): basis = `'area'`, yield = 250%.
- **Suggested fix:**
  When `out.some(x => x.p.mg > 0)`, retain `'mg'` basis for steps that have mass, or compute step-to-step recovery based on the most specific metric shared by adjacent steps rather than forcing the entire pipeline to raw area.
- **Risk:**
  Changes purification summary yield percentages when incomplete steps are present; **needs owner OK**.

---

### 4. Cleavage quantification (`cleaveQuant`) misidentifies uncleaved fusion as 100% cleaved for proteins with small tags
- **Area:** Scientific correctness (gel cleavage %)
- **Function & Location:** `cleaveQuant` (~line 3746)
- **What goes wrong:**
  In `cleaveQuant`, bands in the post-cleavage lane are matched against expected cleaved ($m_C$) and uncleaved ($m_T$) sizes:
  ```javascript
  const fit = (b, kda, app) => b.mw != null && (Math.abs(b.mw/kda - 1) <= 0.06 || (app && Math.abs(b.mw/app - 1) <= 0.06));
  let c = 0, t = 0;
  bs.forEach(b => {
    const tg = tagOf(g, post, b);
    if (tg) { if (tg.kind === 'target') c += b.area; else if (tg.kind === 'tagged') t += b.area; }
    else if (fit(b, mC)) c += b.area;
    else if (fit(b, mT, sumo ? mT + 4 : 0)) t += b.area;
  });
  ```
  For large proteins with small tags (e.g., an 80 kDa protein with a 2.2 kDa His-tag, where $m_C = 80$ kDa and $m_T = 82.2$ kDa), the mass difference is $82.2 / 80 - 1 = 2.75\% \le 6\%$.
  An uncleaved fusion band at 82.0 kDa matches `fit(b, mC)` first in the `if ... else if` sequence. It is added to `c` (cleaved), and `t` remains 0. The function then calculates:
  $$\text{Cleaved \%} = 100 \times \frac{c / m_C}{c / m_C + 0} = 100\%$$
  The app reports 100% cleaved on an uncut sample.
- **How reproduced:**
  $m_C = 80$ kDa, $m_T = 82.2$ kDa. Synthetic band at 82.0 kDa. `fit(82.0, 80)` evaluates to `true`. Output: `c = 100, t = 0`, resulting in 100% cleaved instead of 0%.
- **Suggested fix:**
  When a band fits both $m_C$ and $m_T$, assign it to whichever size is closer in $\log$ space:
  ```javascript
  const dC = Math.abs(Math.log(b.mw / mC)), dT = Math.abs(Math.log(b.mw / mT));
  if (dC <= dT) c += b.area; else t += b.area;
  ```
- **Risk:**
  Alters cleavage percentages for proteins with small tags; **needs owner OK**.

---

### 5. Peak integration table A260/A280 ratio divides raw absorbance without baseline subtraction
- **Area:** Scientific correctness (A260/A280 peak ratio)
- **Function & Location:** `ratAt` inside `renderIntTable` (~line 4852)
- **What goes wrong:**
  In `renderIntTable`, peak A260/A280 ratio is computed at the apex retention coordinate $x$:
  ```javascript
  const ratAt = x => {
    if (!rat) return '';
    const a = c260.ys[nearestIdx(c260.xs, x)], b = c280.ys[nearestIdx(c280.xs, x)];
    return b > 5 ? fmt(a/b, 2) : '';
  };
  ```
  `a` and `b` are raw instrument absorbances with buffer background included. During chromatography with UV-absorbing gradient buffers (e.g. imidazole, DTT, salt steps), the baseline at 280 nm and 260 nm may be 50–100 mAU. Unlike peak area and height, which subtract the baseline line across the peak limits, `ratAt` divides $(A_{260,\text{peak}} + A_{260,\text{buf}}) / (A_{280,\text{peak}} + A_{280,\text{buf}})$.
- **How reproduced:**
  Buffer baseline: $A_{280} = 50\text{ mAU}, A_{260} = 75\text{ mAU}$.
  Pure protein peak: $\Delta A_{280} = 20\text{ mAU}, \Delta A_{260} = 11.4\text{ mAU}$ (true protein ratio = 0.57).
  `ratAt` calculates $(11.4 + 75) / (20 + 50) = 86.4 / 70 = 1.23$, misleading the user to believe the protein peak contains significant nucleic acid contamination.
- **Suggested fix:**
  Evaluate `a` and `b` after subtracting the local baseline for each wavelength channel.
- **Risk:**
  Modifies displayed A260/A280 peak ratios in the integration table; **needs owner OK**.

---

### 6. `ndNum` parses comma-thousands numbers as decimals (e.g. `1,250` becomes `1.25`)
- **Area:** File parsing & Scientific correctness (NanoDrop readings)
- **Function & Location:** `ndNum` (~line 5276)
- **What goes wrong:**
  `ndNum` uses a regex to handle decimal commas:
  ```javascript
  const ndNum = v => {
    const x = parseFloat(String(v ?? '').replace(/\s/g, '').replace(/,(\d+)$/, '.$1'));
    return isFinite(x) ? x : null;
  };
  ```
  In English-locale exports containing whole numbers with a thousands separator (such as `1,250` ng/µL or `2,400`), the pattern `/,(\d+)$/` matches `,250` and replaces it with `.250`. `parseFloat("1.250")` returns `1.25`—a 1000-fold reduction.
- **How reproduced:**
  `ndNum("1,250")` returns `1.25` instead of `1250`.
- **Suggested fix:**
  Distinguish standard 3-digit thousand groups (e.g. `,\d{3}$` where no other decimal exists, or check overall string pattern) from European decimal commas (e.g. `1,25`).
- **Risk:**
  Alters parsed numbers for comma-formatted exports; **needs owner OK**.

---

### 7. `poolRows` ignores typed pool concentration for runs in minutes when final volume is not re-entered
- **Area:** Scientific correctness (pool mass calculations)
- **Function & Location:** `poolRows` (~lines 1961 & 1964)
- **What goes wrong:**
  In `poolRows`, the effective measured volume `mv` is determined by:
  ```javascript
  const vol = B.reduce((t, k) => t + k.b - k.a, 0), mgA = massOf(area, run), ms = poolMeas(run), pc = ms.c, fv = ms.v, mv = fv > 0 ? fv : xUnit(run) === 'mL' ? vol : 0;
  const meas = pc > 0 && mv > 0 && !(ms.src === 'btw' && !(fv > 0)), mg = meas ? pc*mv : mgA;
  ```
  When a run's retention axis is in minutes (`xUnit(run) === 'min'`), `xUnit(run) === 'mL'` is false. If the user does not re-enter `fv` (`poolFinalVol`), `mv` evaluates to 0. Consequently, `meas` evaluates to false, and the typed concentration `pc` (or linked NanoDrop pool concentration) is silently discarded, falling back to `mg = mgA`.
- **How reproduced:**
  Run with `xu: 'min'`, flow rate 1.0 mL/min, pooled fractions spanning 5.0 minutes ($5.0\text{ mL}$), and typed concentration `2.0 mg/mL`. `mv` evaluates to 0, `meas` evaluates to false, and `mg` is not calculated from concentration $\times$ volume.
- **Suggested fix:**
  When `xUnit(run) === 'min'` and `uvFlow(run) > 0`, calculate pool volume in mL as `vol * uvFlow(run)`.
- **Risk:**
  Changes pool mass for runs in minutes that have typed concentrations; **needs owner OK**.

---

### 8. Origin-spanning circular GenBank CDS features corrupt `cas.inner` and prevent promoter detection
- **Area:** File parsing & Construct diagram
- **Function & Location:** `parseGenBank` (~line 3783) & `gbCassette` (~lines 3797–3802)
- **What goes wrong:**
  When a circular plasmid GenBank file contains an expressed CDS that crosses the origin (`join(4800..5000, 1..600)`), line 3783 sets:
  ```javascript
  a: Math.min(...nums), b: Math.max(...nums) // a = 1, b = plasmid length (e.g. 5000)
  ```
  In `gbCassette`, line 3802 filters internal tags:
  ```javascript
  const inner = gb.feats.filter(f => f !== main && f.a >= main.a - 3 && f.b <= main.b + 3 && (f.b - f.a) < 0.9*(main.b - main.a))
  ```
  Because `main.a = 1` and `main.b = 5000`, this matches every feature on the plasmid under 4500 bp (such as AmpR, ori, lacI), corrupting `cas.inner` with irrelevant plasmid features at erroneous amino acid coordinates. Furthermore, promoter detection at line 3797 calculates distance as $1 - f.b \approx -4500$, failing to detect the upstream promoter.
- **How reproduced:**
  Plasmid length 5000 bp, CDS spanning 4800..600, AmpR at 2000..2860 bp. AmpR evaluates to `true` for `isInner`, corrupting `cas.inner`. Upstream promoter at 4700..4780 bp returns distance $-4779$ and is omitted.
- **Suggested fix:**
  When `main.wrap` is true, calculate relative distances modulo plasmid length, and restrict `inner` matching to features situated within the actual coding intervals.
- **Risk:**
  Low; improves construct parsing for origin-spanning plasmids.

---

### 9. `parseAkta` completely rejects European semicolon-delimited UNICORN CSV exports
- **Area:** File parsing (ÄKTA / UNICORN CSV)
- **Function & Location:** `parseAkta` (~line 1473)
- **What goes wrong:**
  UNICORN exports generated on Windows systems configured with European regional settings (e.g., Germany, France, Sweden) delimit CSV fields with semicolons (`;`) and use decimal commas.
  In `parseAkta`:
  ```javascript
  for (let i=0; i<Math.min(8, lines.length) && u < 0; i++)
    for (const dd of [',', '\t']) { ... }
  ```
  Only `','` and `'\t'` are checked. European UNICORN exports are rejected by `parseAkta` (`u < 1`), falling back to `parseText`, which loses all fraction marks, injection points, run logs, and conductivity curves.
- **How reproduced:**
  Standard UNICORN CSV with `;` delimiter: `parseAkta` returns `null`.
- **Suggested fix:**
  Include `';'` in the delimiter array: `for (const dd of [',', '\t', ';'])`.
- **Risk:**
  Very low; enables parsing of European UNICORN exports.

---

### 10. `parseAkta` silently fails on UNICORN exports with > 6 lines of header metadata
- **Area:** File parsing (ÄKTA / UNICORN CSV)
- **Function & Location:** `parseAkta` (~line 1473)
- **What goes wrong:**
  The delimiter and units row search loop in `parseAkta` is hardcoded to:
  ```javascript
  for (let i=0; i<Math.min(8, lines.length) && u < 0; i++)
  ```
  UNICORN CSV exports that include full user notes, system audit details, or column documentation often place the curve tables after 8 to 25 header lines. When header metadata exceeds 6 lines, the units row index `u` is never reached within the first 8 lines, causing `parseAkta` to return `null` and drop all ÄKTA-specific curves.
- **How reproduced:**
  UNICORN CSV with 9 lines of header metadata: `parseAkta` returns `null`.
- **Suggested fix:**
  Increase search limit to `Math.min(50, lines.length)`.
- **Risk:**
  Very low; expands compatibility with documented UNICORN exports.

---

### 11. `parseRunTime` corrupts international DD/MM/YYYY dates and fails on ISO YYYY-MM-DD dates
- **Area:** File parsing (run timestamps)
- **Function & Location:** `parseRunTime` (~lines 1467–1469)
- **What goes wrong:**
  `parseRunTime` assumes US date format MM/DD/YYYY:
  ```javascript
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*([AP]M)?/i.exec(s || '');
  return {t: new Date(+m[3], +m[1]-1, +m[2], h, +m[5], +m[6]).getTime(), ...};
  ```
  When UNICORN exports on an international system log run date as `24/10/2026 14:30:00`, `+m[1]-1` is evaluated as month 23, creating a date in November 2027. Furthermore, ISO format `YYYY-MM-DD` fails the regex completely, returning `null`.
- **How reproduced:**
  Timestamp `'24/10/2026 14:30:00'` produces date `2027-12-10`.
- **Suggested fix:**
  Support ISO format `YYYY-MM-DD` and check if `m[1] > 12` to disambiguate DD/MM/YYYY vs MM/DD/YYYY.
- **Risk:**
  Very low; fixes run timeline dates on non-US exports.

---

### 12. `parseBufB` concentration unit mismatch with molar buffers > 5 M against `compsOf`
- **Area:** Scientific correctness (buffer gradient and axis concentration)
- **Function & Location:** `parseBufB` & `axisConc` (~lines 1709–1710, 1713, 1719)
- **What goes wrong:**
  For denaturation chromatography buffers $> 5\text{ M}$ (e.g. 6 M Guanidine or 8 M Urea), `compsOf` converts Buffer A concentrations to mM (e.g. 500 mM or 6000 mM), while `parseBufB` retains Buffer B concentration as 6 M. Line 1719 then compares:
  ```javascript
  const a = base && base.c < bb.c ? base.c*(bb.u === 'mM' ? 1 : 1) : 0;
  ```
  `base.c < bb.c` evaluates $500 < 6$ (false), zeroing out Buffer A's baseline concentration. Note also that `base.c*(bb.u === 'mM' ? 1 : 1)` contains a no-op ternary.
- **How reproduced:**
  Buffer A: 0.5 M Guanidine (converted to 500 mM by `compsOf`). Buffer B: 6 M Guanidine (retained as 6 M by `parseBufB`). `base.c < bb.c` evaluates to `false`, setting baseline concentration `a = 0`.
- **Suggested fix:**
  Ensure both functions use consistent units (e.g. converting both to mM or scaling `bb.c` when `bb.u === 'M'`).
- **Risk:**
  Adjusts buffer axis minimum for high-molarity buffers; **needs owner OK**.

---

### 13. `uvOf` throws unhandled TypeError when run object has empty `uvs` array
- **Area:** Crashes and silent failures (rendering)
- **Function & Location:** `uvOf` (~line 1633)
- **What goes wrong:**
  ```javascript
  const uvOf = run => {
    run.uvs.forEach(c => { ... });
    return run.uvs[run.uvi] || run.uvs[0];
  };
  ```
  If a run object has an empty `uvs` array (`run.uvs = []`), `uvOf` returns `undefined`. Callers such as line 1730 (`uv = uvOf(run); fracSegments(run, uv.xs[uv.xs.length-1])`) and line 1737 (`runUV`) immediately access `uv.xs`, throwing an uncaught `TypeError: Cannot read properties of undefined (reading 'xs')`, breaking the page render.
- **How reproduced:**
  Passing `{uvs: []}` to `uvOf` and accessing `.xs` throws an uncaught TypeError.
- **Suggested fix:**
  Return a safe fallback `{xs: new Float64Array(0), ys: new Float64Array(0), yu: 'mAU'}` when `run.uvs` is empty or missing.
- **Risk:**
  Very low; prevents uncaught exceptions during corrupted or non-UV data loads.

---

## Ready-to-file issues

### Fix NanoDrop Acclaro nucleic acid corrected concentration scaling for ug per mL
In `hplc-figure-bench(WF1.13).html` at lines 5310 & 5354 (`parseNanoDrop` & `ndConc`), when concentration units are $\mu\text{g}/\text{mL}$, `conc` is divided by 1000 but `corr` is not, causing `ndConc` to multiply the corrected concentration by 1000x. In `parseNanoDrop`, divide `corr` by 1000 when `unitTxt` contains $\mu\text{g}/\text{mL}$. Add a test in `tests/suites/10_data_truth.js` loading a synthetic NanoDrop file with $\mu\text{g}/\text{mL}$ and Acclaro corrected concentration. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Prevent purification summary yield from collapsing to raw area when a step lacks mass
In `hplc-figure-bench(WF1.13).html` at lines 4771 & 4776 (`sumRows`), adding a purification step without a calculated mass (e.g. 214 nm or desalting) causes `out.every(x => x.p.mg > 0)` to fail and silently flips the entire table's yield basis to raw area, corrupting mass yields across steps with differing UV path lengths. Retain mass basis for runs with valid mass. Add a test in `tests/suites/20_science.js` with three runs where Run 3 has no mg, ensuring Run 2 retains its mass yield. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Assign gel cleavage bands to nearest expected mass in log space
In `hplc-figure-bench(WF1.13).html` at line 3746 (`cleaveQuant`), fusions with small tags ($\le 6\%$ mass difference, such as $\ge 40$ kDa proteins with His-tag) match `fit(b, mC)` first and are misclassified as 100% cleaved even when uncut. When a band matches both $m_C$ and $m_T$, assign it to the closer size in $\log$ mass. Add a test in `tests/suites/25_gels.js` with an 80 kDa protein, a 2.2 kDa His-tag, and an uncut band at 82 kDa, verifying it is recognized as uncleaved. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Subtract baseline in peak integration table A260 to A280 ratio
In `hplc-figure-bench(WF1.13).html` at line 4852 (`ratAt` in `renderIntTable`), the peak A260/A280 ratio divides raw absorbance values directly without baseline subtraction, reporting buffer background rather than peak purity. In `ratAt`, subtract the baseline at coordinate $x$ on both channels before dividing. Add a test in `tests/suites/14_peaks.js` verifying that a pure protein peak on an absorbing buffer baseline yields the protein's true A260/A280 ratio. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Calculate pool volume from flow rate for runs in minutes with typed concentration
In `hplc-figure-bench(WF1.13).html` at lines 1961 & 1964 (`poolRows`), when `xUnit(run) === 'min'`, `mv` evaluates to 0, causing typed pool concentration `pc` on the run card to be ignored unless `fv` is manually re-typed. When `xUnit(run) === 'min'` and `uvFlow(run) > 0`, calculate `vol = vol * uvFlow(run)`. Add a test in `tests/suites/10_data_truth.js` with retention in minutes, flow rate, and typed concentration, verifying pool mass is calculated. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Correct circular origin-spanning CDS handling in GenBank cassette parser
In `hplc-figure-bench(WF1.13).html` at lines 3783 and 3797–3802 (`parseGenBank` & `gbCassette`), when an expressed CDS crosses the origin (`wrap === true`), setting `a: 1` and `b: len` causes `inner` to capture all features in the plasmid and causes promoter distance calculations to fail. Compute distances modulo plasmid length when `main.wrap` is true, and restrict `inner` feature inclusion to true coding intervals. Add a test in `tests/suites/12_genbank.js` with an origin-spanning CDS. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Support semicolon delimiter in parseAkta for European UNICORN CSV exports
In `hplc-figure-bench(WF1.13).html` at line 1473 (`parseAkta`), only `','` and `'\t'` are tested for units rows, rejecting European UNICORN exports that use semicolons. Add `';'` to the delimiter search loop: `for (const dd of [',', '\t', ';'])`. Add a test in `tests/suites/10_data_truth.js` with synthetic semicolon-delimited ÄKTA CSV data. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Increase parseAkta header search depth for documented UNICORN exports
In `hplc-figure-bench(WF1.13).html` at line 1473 (`parseAkta`), searching only `Math.min(8, lines.length)` misses curve units rows when exports have $> 6$ header lines of metadata. Increase search depth to `Math.min(50, lines.length)`. Add a test in `tests/suites/10_data_truth.js` with 12 lines of header metadata before the curve table. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Support ISO date and DD-MM-YYYY formats in parseRunTime
In `hplc-figure-bench(WF1.13).html` at lines 1467–1469 (`parseRunTime`), non-US DD/MM/YYYY dates produce invalid years/months, and ISO YYYY-MM-DD dates return null. Update the regex to support ISO timestamps and detect DD/MM/YYYY when the first token exceeds 12. Add a test in `tests/suites/10_data_truth.js` testing both ISO and DD/MM/YYYY format timestamps. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Align molar buffer concentration units between parseBufB and compsOf
In `hplc-figure-bench(WF1.13).html` at lines 1709–1710, 1713, and 1719 (`parseBufB` & `axisConc`), buffers $> 5\text{ M}$ remain in M in `parseBufB` while `compsOf` converts Buffer A to mM, causing `base.c < bb.c` to fail and setting baseline concentration `a = 0`. Standardize units across both functions. Add a test in `tests/suites/10_data_truth.js` for 6 M Guanidine buffer B. Needs owner OK. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Return fallback object from uvOf when uvs array is empty
In `hplc-figure-bench(WF1.13).html` at line 1633 (`uvOf`), returning undefined when `run.uvs` is empty crashes subsequent rendering functions with uncaught TypeErrors. Return a fallback empty curve object `{xs: new Float64Array(0), ys: new Float64Array(0), yu: 'mAU'}` when `run.uvs` is empty. Add a test in `tests/suites/30_robust.js` rendering a run with empty `uvs`. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.
