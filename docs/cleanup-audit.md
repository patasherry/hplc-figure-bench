# Code Cleanup Audit

This report audits `hplc-figure-bench(WF1.13).html` for dead code, duplicated logic, inconsistencies, and fragile spots.

> **Note:** `hplc-figure-bench(WF1.13).html` was not modified as part of this report. The items below are formatted and grouped into small, independent cleanup PRs that can be reviewed and implemented sequentially.

---

## 1. Dead Code

Functions, variables, CSS classes, HTML elements, and unused options that are defined in the codebase but never invoked or read.

### 1.1 Unused Ladder Fitting Functions `polyRss` and `polyFit`
- **Location:**
  - `polyRss`: Line 3044
  - `polyFit`: Line 3055
- **Grep Evidence:**
  ```text
  $ grep -n "polyRss" "hplc-figure-bench(WF1.13).html"
  3044:function polyRss(xs, ys, deg){

  $ grep -n "polyFit" "hplc-figure-bench(WF1.13).html"
  3055:function polyFit(xs, ys, deg){
  ```
  Both functions are defined at lines 3044 and 3055 but are never called anywhere in the codebase. Ladder matching was refactored to use `fitRss` (line 3065), leaving `polyRss` and `polyFit` as unreachable dead code.
- **Estimated Lines Saved:** 22 lines
- **Risk Level:** Very Low
- **Needs Owner OK:** No

### 1.2 Unused CSS Class `.qdone`
- **Location:** Line 102
- **Grep Evidence:**
  ```text
  $ grep -n "qdone" "hplc-figure-bench(WF1.13).html"
  102:.ss-quick .qdone{color:var(--muted);font-size:12.5px}
  ```
  Defined in the `<style>` block under `.ss-quick`, but no HTML elements or JavaScript DOM manipulation scripts ever apply or reference `qdone`.
- **Estimated Lines Saved:** 1 line
- **Risk Level:** Very Low
- **Needs Owner OK:** No

### 1.3 Unused Option Setting `gelHAdj` in `DEF`
- **Location:**
  - Default options `DEF`: Line 1284
  - Slider output formatter map: Line 4521
- **Grep Evidence:**
  ```text
  $ grep -n "gelHAdj" "hplc-figure-bench(WF1.13).html"
  1284:  secStds:false, targetName:'', taggedName:'', targetArrow:false, tagCounts:true, gelPos:'below', gelAlign:'center', gelScale:100, gelHAdj:100, laneMark:'fill', ...
  4521:  gelScale: v => `${Math.round(v)}%`, gelHAdj: v => `${Math.round(v)}%`, laneAlpha: v => `${Math.round(v*100)}%`};
  ```
  `gelHAdj: 100` exists in `DEF` (line 1284) and has a label formatter (line 4521), but no HTML control with `data-opt="gelHAdj"` exists and `opt.gelHAdj` is never read in gel drawing or layout calculations.
- **Estimated Lines Saved:** 2 lines
- **Risk Level:** Very Low
- **Needs Owner OK:** No

### 1.4 Duplicate Object Property in `#selftest` Global Export
- **Location:** Line 6247
- **Grep Evidence:**
  ```text
  $ grep -n "window.__HFB" "hplc-figure-bench(WF1.13).html"
  6247:if (location.hash === '#selftest') window.__HFB = {DET, opt, gels, gelBands, detectBands, laneProfile, autoLadder, autoCrop, applyAutoCrop, laneTrack, laneProfile, gridTrack, ...};
  ```
  `laneProfile` is specified twice in the object literal exported to `window.__HFB`.
- **Estimated Lines Saved:** 1 property reference (~15 characters)
- **Risk Level:** Very Low
- **Needs Owner OK:** No

---

## 2. Duplicated Logic

Identical or near-identical calculations, formatting, or matching logic written in multiple places.

### 2.1 CSV Double-Quote Escaping (`const q = v => ...`)
- **Location:**
  - `bandCsv`: Line 4598
  - `sumCsv`: Line 4828
  - `intCsv`: Line 4867
- **Evidence:**
  - In all three export click handlers (`bandCsv`, `sumCsv`, `intCsv`), the exact same field escaper is declared inline:
    ```js
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    ```
- **Copy to Keep:** Extract a single helper `csvQuote(v)` at helper scope (near `csvSplit` on line 185) and reuse it in all CSV export routines.
- **Estimated Lines Saved:** 3 lines
- **Risk Level:** Low
- **Needs Owner OK:** No

### 2.2 Duplicated Regex Patterns for Fraction Matching and Ranges
- **Location:**
  - `fracIdx`: Line 545 (`r.match(/^([A-Za-z]+)(\d+)/)`)
  - `parseFracs`: Line 245 (`m = /^([A-Za-z]+)(\d+)/.exec(...)`)
  - `sumRows`: Line 4745 (`parts = String(l).trim().split(/\s*[-–]\s*/)`)
  - `suggestPool`: Line 555 (`String(x).trim().split(/\s*[-–]\s*/)`)
- **Evidence:**
  - Fraction prefix/number matching (`/^([A-Za-z]+)(\d+)/`) and dash/en-dash range splitting (`/\s*[-–]\s*/`) are re-instantiated inline across multiple functions.
- **Copy to Keep:** Store reusable regexes as module-level constants `FRAC_NAME_RE` and `RANGE_SPLIT_RE` in the helper section.
- **Estimated Lines Saved:** 8 lines
- **Risk Level:** Low
- **Needs Owner OK:** No

### 2.3 Duplicated Pool Fraction Matching and Yield/Mass Lookups
- **Location:**
  - `sumRows()`: Lines 4739–4756
  - `ndForRun()` / `btwCarry()`: Lines 5371–5384, 6079–6085
  - `renderIntTable()`: Lines 3598, 4871
- **Evidence:**
  - Finding pooled fraction indices, deriving pool volume from fraction ranges, and combining $A_{280}$ peak area or NanoDrop concentration is duplicated across `sumRows()` and `ndForRun()` / `btwCarry()`.
- **Copy to Keep:** Consolidate pool identification and mass/yield calculation into `poolRows(r)` and `poolMeas(r)`.
- **Estimated Lines Saved:** 25 lines
- **Risk Level:** Medium
- **Needs Owner OK:** **Needs owner OK** (modifies purification yield and summary table calculations).

### 2.4 Repeated Unit Formatting for Volumes, Masses, and Sizes
- **Location:**
  - `nbsp`: Line 2574
  - Methods and Summary generators: Lines 2723, 2749, 2794, 2846, 3536, 4099
- **Evidence:**
  - Manual string concatenations like `${v} mL`, `${mw} kDa`, `${c} mg/mL` are constructed repeatedly in text generation functions, despite existing helpers like `unitIf(v, unit)` and `nbsp(t)`.
- **Copy to Keep:** Standardize on `unitIf(val, unit)` and `fmtAuto(val)`.
- **Estimated Lines Saved:** 15 lines
- **Risk Level:** Low
- **Needs Owner OK:** No

---

## 3. Inconsistencies

Different naming conventions for identical concepts, settings no longer read, and functions handling multiple unrelated responsibilities.

### 3.1 Obsolete Setting `gelHAdj` in `DEF`
- **Location:** Line 1284 (`DEF.gelHAdj = 100`) and Line 4521
- **Evidence:** Setting is defined in `DEF` and formatted in slider outputs, but has no corresponding input control or reader in rendering functions.
- **Estimated Lines Saved:** 2 lines
- **Risk Level:** Low
- **Needs Owner OK:** No

### 3.2 Functions Performing Dual Unrelated Responsibilities
- **Locations & Evidence:**
  - `processGel(g)` (Line 1540): Performs gel image pixel contrast/rotation transformations AND updates lane track positioning/ladder mark alignment in a single function call.
  - `openProject(data, name)` (Line 5580): Unpacks project JSON, mutates global data structures (`runs`, `traces`, `gels`), and directly triggers DOM UI rendering (`renderList()`, `renderNext()`, `render()`).
- **Impact:** Combining model transformation and DOM rendering makes headless testing and batch processing less modular.
- **Estimated Lines Saved:** ~10 lines refactored
- **Risk Level:** Medium
- **Needs Owner OK:** No

### 3.3 Variable Naming Inconsistencies for Mass and Concentration
- **Evidence:**
  - Molecular weight is called `protKda` in `opt`, `mw` in gel band objects (`b.mw`), `kda` in ladder marks (`m.kda`), and `mass` in construct models (`F[0].mass`).
  - Pool concentration is named `poolConc` on run objects, `c` in `poolMeas`, `m` in NanoDrop readings, and `finConc` in prep settings.
- **Impact:** Divergent field names across data models increase cognitive load and risk of property lookup bugs.
- **Risk Level:** Low
- **Needs Owner OK:** No

---

## 4. Fragile Spots

Global state mutations inside render functions, side effects during getters/exports, and incomplete cache invalidation keys.

### 4.1 Global Interactive State `S` Mutated During SVG Rendering / Export
- **Location:**
  - `buildSVG`: Line 2042 (`S = ...`)
  - `buildRunSVG`: Line 2169
  - `buildCalSVG`: Line 2432
  - `buildStructSVG`: Line 4175
  - `buildNDSVG`: Line 4177
- **Evidence:**
  - `S` stores on-screen interactive element coordinates (hover tooltips, peak labels, click targets).
  - When background exports or batch ZIP generation (`$('#saveZipAll')`) invoke `buildSVG()` or `buildRunSVG()`, `S` is overwritten with exported image geometry, breaking mouse interactivity on the visible paper element.
- **Estimated Lines Saved:** 10 lines
- **Risk Level:** High
- **Needs Owner OK:** **Needs owner OK** (affects interactive figure coordinate maps).

### 4.2 Global `PREP_USED` and `opt.known` Mutated in Render Functions
- **Location:**
  - `buildPrepSVG`: Line 2171 (`PREP_USED = 0; ...`)
  - `renderKnown`: Line 4297 (`opt.known = ...`)
- **Evidence:**
  - `buildPrepSVG` resets global counter `PREP_USED = 0` during rendering.
  - `renderKnown` directly mutates `opt.known` settings array during DOM table construction. Render functions should be idempotent and free of side-effect state mutations.
- **Estimated Lines Saved:** 8 lines
- **Risk Level:** Medium
- **Needs Owner OK:** **Needs owner OK** (if contaminant matching defaults are affected).

### 4.3 Missing Inputs in Gel Cache Invalidation Keys (`g._bKey` and `_lKey`)
- **Location:**
  - `_bKey` (Gel Bands Cache): Line 1577
    ```js
    const key = gelLabels(g).length + '|' + numOr(opt.bandSens, 8) + '|' + g.marks.map(m => m.kda + ':' + m.y.toFixed(4)).join(',') + '|' + (g.assign || []).join(',') + '|' + JSON.stringify(ed);
    ```
    - **Missing inputs:** `g.crop` (`crop.t`, `crop.b`, `crop.l`, `crop.r`) and `g.rot` / `g.fine`. Adjusting gel crop or rotation without adding/removing a ladder mark fails to invalidate the band detection cache.
  - `_lKey` (Gel Overlay Labels Cache): Line 1736
    ```js
    const key = g.out && g.out.url.length + ':' + gelLabels(g).join('|') + ':' + (g.assign || []).join(',');
    ```
    - **Missing inputs:** `opt.laneAlpha`, `opt.laneMark`, `opt.bandLabels`, `opt.knownShow`, `opt.knownOn`. Changing contaminant visibility or lane mark options in settings does not invalidate `_lKey`, displaying stale gel figure overlays.
- **Estimated Lines Saved:** 5 lines (bug fixes & cache accuracy)
- **Risk Level:** High
- **Needs Owner OK:** **Needs owner OK** (cache key updates alter protein band sizes and purity outputs).

---

## Grouped Cleanup PR Roadmap

Ranked by benefit against risk:

### PR 1: Dead Code Removal & Minor Cleanups
- Remove `polyRss` and `polyFit` (lines 3044–3055).
- Remove `.ss-quick .qdone` CSS rule (line 102).
- Remove unused `gelHAdj` in `DEF` (line 1284) and slider formatter (line 4521).
- Remove duplicate `laneProfile` entry in `#selftest` object literal (line 6247).
- **Benefit vs Risk:** High benefit / Very low risk.
- **Estimated Lines Saved:** ~26 lines
- **Needs Owner OK:** No

### PR 2: CSV & Helper Logic Deduplication
- Consolidate inline `q = v => ...` into top-level `csvQuote(v)`.
- Extract reusable regex constants (`FRAC_NAME_RE`, `RANGE_SPLIT_RE`).
- Standardize volume/mass unit formatting with `unitIf` / `fmtAuto`.
- **Benefit vs Risk:** High benefit / Low risk.
- **Estimated Lines Saved:** ~26 lines
- **Needs Owner OK:** No

### PR 3: Cache Key Invalidation Fixes for Gel Rendering
- Add `crop`, `rot`, and `fine` parameters to `_bKey` (line 1577).
- Add `opt.laneAlpha`, `opt.laneMark`, `opt.bandLabels`, `opt.knownShow`, and `opt.knownOn` to `_lKey` (line 1736).
- **Benefit vs Risk:** Fixes subtle rendering bugs / Low risk to core math.
- **Estimated Lines Saved:** ~5 lines
- **Needs Owner OK:** **Needs owner OK** (affects gel band sizing and purity rendering).

### PR 4: State Mutation Isolation in Render and Export Functions
- Prevent SVG export functions (`buildSVG`, `buildRunSVG`, etc.) from overwriting global interactive state `S`.
- Remove side-effect mutation of `opt.known` inside `renderKnown`.
- **Benefit vs Risk:** Fixes interactive state corruptions during export / Medium risk.
- **Estimated Lines Saved:** ~18 lines
- **Needs Owner OK:** **Needs owner OK** (affects interactive figure hover/click coordinate mapping).
