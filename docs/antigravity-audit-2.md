# Antigravity User-Test Audit Report 2 (`hplc-figure-bench(WF1.13).html`)

This audit reports empirical findings observed while testing `hplc-figure-bench(WF1.13).html` end-to-end from the perspective of a biochemistry researcher executing laboratory purification workflows.

In accordance with `AGENTS.md`, `hplc-figure-bench(WF1.13).html` was **not modified**. Every finding below was directly observed during testing with synthetic data. Nothing from `docs/cleanup-audit.md`, `docs/messages-audit.md`, or `docs/antigravity-audit.md` is repeated here, and controls that are intentionally hidden on empty projects (such as empty-state action buttons) have been excluded.

---

> **Coordinator review (2026-10-23).** Checked against `main`: findings 1 and 2 are confirmed and filed. Neither changes a calculation, since both show a per-gram value the app already computes (`sumCsv`, and `perGTxt` in `finalYield`). Finding 3 is a design choice (project mode keeps settings behind **More options**) and is left for the owner, so it is not filed. Antigravity's branch `ag/audit-2` was based on an older main, so this report was saved on its own branch.

## Summary Table

| # | Finding | Area | Severity | Needs Owner OK |
|---|---|---|---|---|
| 1 | Summary Table omits mg per g cells column when pellet mass is entered but culture volume is blank | Scientific correctness (summary table) | High | **Yes** |
| 2 | Methods text omits final yield per gram of cell pellet despite pellet mass entered | Scientific correctness (Methods text) | Medium | **Yes** |
| 3 | Essential settings and chromatography parameters are hard to reach behind hidden toggles and closed folds | UI accessibility & discoverability | Medium | No |

---

## Detailed Findings

### 1. Summary Table omits mg per g cells column when pellet mass is entered but culture volume is blank
- **Area:** Scientific correctness (purification summary table)
- **Function & Location:** `renderSumTable` (~lines 4783, 4786, 4788)
- **What goes wrong:**
  In `renderSumTable`, the display condition for the cell pellet yield column (`mg per g cells`) is gated by `perL && cG > 0`:
  ```javascript
  cL = prep.on ? numOr(prep.cultureL, 0) : 0,
  cG = prep.on ? numOr(prep.pellet, 0) : 0,
  perL = cL > 0 && rows.some(x => rows.mgOf(x) > 0);
  ...
  ${perL && cG > 0 ? `<th title="Protein in this step's pool per gram of the ${fmtAuto(cG)} g of wet cells">mg per g cells</th>` : ''}
  ...
  ${perL && cG > 0 ? `<td>${rows.mgOf(x) > 0 ? sig2(rows.mgOf(x)/cG) : ''}</td>` : ''}
  ```
  When a researcher purifies protein from a known mass of cell paste (e.g., 25 g from frozen stocks, collaborator material, or purchased biomass) without specifying culture volume in liters (`cL` is blank or `0`), `perL` evaluates to `false`. Because the column header and cell renderers check `perL && cG > 0`, the `mg per g cells` column is completely omitted from the summary table, even though `cG` (25 g) and protein pool mg are entered.
  
  In contrast, the CSV export in `sumCsv` (line 4822) exports pellet yield whenever `cG > 0`:
  ```javascript
  cG > 0 && d.mg > 0 ? (d.mg/cG).toFixed(3) : ''
  ```
  This causes an inconsistency where the exported CSV contains pellet yield values while the on-screen table suppresses them.
- **How reproduced:**
  1. Open the application and create a new project.
  2. Navigate to Expression (`#step:expr`), leave Culture (L) (`#pr-cultureL`) blank, and set Wet cell pellet (`#pr-pellet`) to `25`.
  3. Load an ÄKTA run (`tests/data/chrom/imac_HisTrap_FF_1mL_step_u7.csv`) and pool fractions `B2-B6`.
  4. Navigate to the Figure / Summary Table step (`#step:figure`).
  5. Inspect `#sumTable`: the table displays `Step`, `Pool`, `Volume`, `A280 area`, `Yield (%)`, `Step yield (%)`, and `Purity (%)`. The column `mg per g cells` is completely absent.
- **Suggested fix:**
  Define an independent boolean `perG = cG > 0 && rows.some(x => rows.mgOf(x) > 0)` and change the table header and cell conditions from `${perL && cG > 0 ? ... : ''}` to `${perG ? ... : ''}`.
- **Risk:**
  Displays an additional column in the summary table when pellet mass is provided without culture volume; **needs owner OK**.

---

### 2. Methods text omits final yield per gram of cell pellet despite pellet mass entered
- **Area:** Scientific correctness (Methods text generation)
- **Function & Location:** `methodsText` (~lines 4084, 4125–4130)
- **What goes wrong:**
  In `methodsText()`, when wet cell pellet weight `prep.pellet` is provided, the expression sentence notes:
  `... giving ${fmtAuto(g)} g of wet cells.` (line 4084).
  However, in the results section where final protein amounts and yields are summarized (lines 4128–4130):
  ```javascript
  if (fc > 0 && fv > 0) R.push(`The final sample was ${fmtAuto(fc)} mg/mL in ${fmtAuto(fv)} mL, ${sig2(fc*fv)} mg${cL > 0 ? ` or ${sig2(fc*fv/cL)} mg per L of culture` : ''}${ra ? `, with an A260/A280 of ${ra}` : ''}.`);
  ```
  The generated Methods text only calculates yield per liter of culture (`fc*fv/cL`). It never computes or reports the yield per gram of wet cell pellet (`fc*fv/cG`), even when `prep.pellet` is entered and culture volume is absent. In biochemistry publications, yield per gram of wet cells is a standard benchmark for expression efficiency and harvest yield.
- **How reproduced:**
  1. In a project, configure Expression with Pellet = `25` g and Culture = `2` L.
  2. Configure Final sample with Volume = `0.5` mL and Concentration = `4.2` mg/mL (total `2.1` mg).
  3. Expand `#methodsBox` and inspect `#methodsText`:
     The text outputs: `giving 25 g of wet cells` and `The final sample was 4.2 mg/mL in 0.5 mL, 2.1 mg or 1.1 mg per L of culture...`.
     Yield per gram of cells (`0.084 mg/g cells`) is omitted from the results summary.
- **Suggested fix:**
  In `methodsText()` (line 4130), include `${cG > 0 ? ` (${sig2(fc*fv/cG)} mg/g wet cells)` : ''}` or include pellet yield when `cL` is absent: `${cL > 0 ? ` or ${sig2(fc*fv/cL)} mg per L of culture` : cG > 0 ? ` or ${sig2(fc*fv/cG)} mg per g of wet cells` : ''}`.
- **Risk:**
  Changes generated publication Methods text; **needs owner OK**.

---

### 3. Essential settings and chromatography parameters are hard to reach behind hidden toggles and closed folds
- **Area:** UI accessibility & discoverability
- **Function & Location:** CSS lines 195–197, HTML lines 754–758, 878–892, run card `<details class="sub">`
- **What goes wrong:**
  During end-to-end user testing of real purification setups, multiple key controls were difficult to locate and operate because they are styled with `display: none !important` or enclosed in collapsed `<details>`:
  1. **Option sections in project mode:** In project mode (`body.proj`), all option sections (`.optsec` including Peak Integration `#o-intMethod`, Size Exclusion `#secPanel`, Window `#o-xmin`/`#o-xmax`, Processing, Axes, and Figure style) have CSS rule:
     ```css
     body.proj:not(.moreopen) #panel > .optsec { display: none !important; }
     ```
     They are completely hidden from view unless the user finds and clicks a subtle `#moreBtn` ("More options") button.
  2. **SEC calibration controls:** Even within the SEC panel, SEC calibration standards (`#sec-cal`, `#sec-set`, `#secStdList`, `#sec-addStd`, `#sec-new`, `#sec-delCal`, `#sec-from`, `#sec-read`, monomer mass `#o-secMono`) have CSS rule:
     ```css
     body:not(.secstds) .secstd { display: none !important; }
     ```
     These controls remain invisible unless the "Show calibration standards" checkbox (`#o-secStds`) is enabled.
  3. **Run conditions collapsed on run card:** Key physical parameters needed for figure generation and Methods text (Column `#mCol`, Buffer A `#mBufA`, Buffer B `#mBufB`, Flow rate `#mFlow`, UV cell path `#path`, Fraction size `#mFrac`) are located inside `<details class="sub">` folds on each run card that default to closed, requiring repeated expansions to verify or edit run conditions.
- **How reproduced:**
  1. Create a project and load an SEC run.
  2. Attempt to view or adjust SEC void volume (`#sec-v0`), bed volume (`#sec-vt`), or calibration standards.
  3. The SEC panel is not visible until `#moreBtn` is clicked. Once expanded, standard calibration controls are not visible until `#o-secStds` is checked.
- **Suggested fix:**
  Ensure panels relevant to the current step (such as `#secPanel` for an SEC step) are visible by default without requiring `#moreBtn`, or provide prominent affordances indicating that additional options exist.
- **Risk:**
  Layout and UI visibility adjustments only; does not alter scientific calculations.

---

## Ready-to-file issues

### Show mg per g cells in summary table when pellet mass is entered without culture volume
In `hplc-figure-bench(WF1.13).html` around lines 4783, 4786, and 4788, `renderSumTable` only renders the `mg per g cells` header and cells when `perL && cG > 0`. Because `perL` requires `cL > 0`, purifying from a known cell pellet mass without entering culture volume suppresses the pellet yield column entirely, whereas `sumCsv` exports it. Define `perG = cG > 0 && rows.some(x => rows.mgOf(x) > 0)` and use `perG` to gate the `mg per g cells` column header and table cells. In `tests/suites/10_data_truth.js` or `tests/suites/20_science.js`, add a check that entering wet cell pellet mass with blank culture volume renders the `mg per g cells` header and calculates `mg / cG`. No calculation changes: the value already exists (`perG` in `finalYield`, `mg/cG` in `sumCsv`). Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Report pellet yield in Methods text when wet cell mass is provided
In `hplc-figure-bench(WF1.13).html` around line 4130, `methodsText()` calculates final sample yield per liter of culture (`fc*fv/cL`) when `cL > 0`, but does not calculate yield per gram of wet cells when cell pellet mass `prep.pellet` is entered. Add reporting of `mg per g of cells` (or wet cell pellet) in the Methods text when `cG > 0`. In `tests/suites/20_science.js`, add a check that `methodsText()` includes yield per gram when cell pellet mass is entered. No calculation changes: the value already exists (`perG` in `finalYield`, `mg/cG` in `sumCsv`). Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.
