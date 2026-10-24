# Compatibility audit

> **Coordinator review (2026-10-23).** Checked against `main`. The loader is `openProject`, and `projectData` saves each run whole (`noId(r, 'blobId')`), so:
> - **Findings 1, 2, 4 and 5 are not confirmed.** No run fields are dropped on save. Opening a project does not call `makeRun`, so nothing is shifted twice. Legacy `stage: 'final'` readings are still used through `ndForRun`. New manual step ids are the next free number.
> - **Finding 3 is by design:** `tidyOpt` applies the same one-time defaults change to older projects as to saved settings. Older versions saved every key, so an explicit choice can't be told apart from the old default. Left for the owner.
> - **Findings 6 to 9 are confirmed** as robustness gaps (a null in `opt.known` throws in `openProject`'s merge, null `prep` sub-objects, a calibration without `unit` is replaced by `secCalFor`, and a trace without `cols` is dropped by `cleanProject`). Only these four are filed below.
> - Line numbers in this report are unreliable.

## Summary

| # | Finding | Area | Severity | Needs owner OK |
|---|---|---|---|---|
| 1 | projectData drops injX and injShift, causing SEC runs in saved projects to be double-shifted on reload | Runs / SEC / Save & Load | Critical | Yes |
| 2 | ndMigrate strands legacy final-stage NanoDrop readings when prep.btw[runId] is absent, and projectData drops poolConc, poolFinalVol, and ndFinalVol | NanoDrop / Pool yield / Migrations | Critical | Yes |
| 3 | loadProject calls tidyOpt() after merging project opt, silently disabling wfYield, secStds, and noGelSlot and shrinking wfGelH on older projects | Settings / Migrations / Projects | High | Yes |
| 4 | loadProject does not advance uid past loaded prep.manual step IDs (m1, m2, ...) or ndSamples IDs (nd1, ...), causing ID collisions when adding new manual steps or readings | Projects / Steps / NanoDrop | High | No |
| 5 | projectData omits run.pathFromFile and run.isStd, altering path-length warnings and SEC standards-run detection after save/reload | Runs / Save & Load | Medium | No |
| 6 | loadProject shallow-copies DEF.known and d.opt.secCals without sanitizing entries or refreshing KNOWN_DEFAULT metadata (kda, ctx, src, app), unlike startup opt loading | Settings / Gels / SEC | Medium | Yes |
| 7 | loadProject overwrites prep with d.prep without normalizing types for prep.btw, prep.manual, prep.skip, prep.stepMeta, prep.offs, or prep.titles when null or malformed in old JSON | Prep / Workflow | Medium | No |
| 8 | loadProject does not normalize legacy SEC calibration objects missing unit or stds fields, causing secCalFor to discard the calibration | SEC calibrations | Low | No |
| 9 | loadProject does not default missing properties on loaded traces or gels (peaks, cols, xc, yc, marks, tags, edits) | Traces / Gels / Save & Load | Low | No |

## Saved-data readers and migrations inventory

### 1. Saved-data readers and assumptions

1. **Startup Settings (`localStorage` key `hplc-fig-opt`)**
   - **Function / Location:** Top-level IIFE initialization (~lines 458–465).
   - **Keys read:** All keys on the parsed JSON object are `Object.assign`ed onto `opt` (which starts as a shallow copy of `DEF`), then `opt.xmin = opt.xmax = opt.ymin = opt.ymax = ''` clears the window, `tidyOpt()` runs `tidy13`/`tidy14` migrations, and `opt.known` is validated and updated against `KNOWN_DEFAULT`.
   - **Assumptions:** Assumes `JSON.parse` returns an object; if `opt.known` is an array, filters truthy objects and overwrites `kda`, `ctx`, `src`, `app` on items matching `KNOWN_DEFAULT` by `name` and `kind`. Does not validate `opt.secCals` at startup (lazy-checked in `secCals()` via `Array.isArray(opt.secCals)`).

2. **Project and Exported JSON Reader (`loadProject`, `openProject`, `storeList`, `storeGet`)**
   - **Function / Location:** `loadProject(d, quiet)` (~lines 1980–2060), `projectData()` (~lines 1940–1979), `storeInit()` / `storeList()` / `storeGet()` (~lines 2070–2160).
   - **Keys read:** `d.kind` (`'hplc-figure-bench'`), `d.v`, `d.id`, `d.name`, `d.protein`, `d.created`, `d.updated`, `d.cur`, `d.curStep`, `d.opt`, `d.prep`, `d.struct`, `d.nd`, `d.traces`, `d.runs`, `d.gels`.
   - **Assumptions:**
     - `d.opt`: Merged onto `Object.assign({}, DEF, {known: DEF.known.map(...)})` via `Object.assign(opt, d.opt)`, then calls `tidyOpt()`. Assumes `d.opt.known` and `d.opt.secCals` are valid arrays if present (does not run the startup `KNOWN_DEFAULT` sync or filter non-objects).
     - `d.prep`: Merged onto `JSON.parse(JSON.stringify(PREP_DEF))` via `Object.assign(prep, d.prep)`. If `d.prep.btw`, `d.prep.skip`, `d.prep.stepMeta` are `null` or `d.prep.manual` is non-array, downstream readers either guard or throw.
     - `d.struct`: Passed to `parseStruct(d.struct.text, d.struct.code)` if `d.struct && d.struct.text` is truthy, then restores `struct.ent = d.struct.ent`.

3. **Traces Reader (`loadProject`, `processTrace`, `detectPeaks`)**
   - **Function / Location:** `loadProject` (~line 2002), `processTrace` (~line 574), `detectPeaks` (~line 581).
   - **Keys read:** `id`, `name`, `color`, `visible`, `rows`, `cols`, `xc`, `yc`, `offset`, `scale`, `xshift`, `peaks` (`[{x, label, auto}]`), `ex`.
   - **Assumptions:** `loadProject` checks `t && typeof t === 'object' && Array.isArray(t.rows) && t.rows.length`, then copies `t` with `Object.assign({}, t)` without defaulting `peaks: []`, `cols: []`, `xc: 0`, `yc: 1`, `visible: true`.

4. **Runs Reader (`loadProject`, `makeRun`, `applyInjShift`, `uvOf`, `fracSegments`, `shadeSet`, `poolMeas`, `poolRows`, `integRows`, `runCondLines`)**
   - **Function / Location:** `loadProject` (~line 2005), `makeRun` (~line 552), `applyInjShift` (~line 695), `uvOf` (~line 605), `poolMeas` (~line 795).
   - **Keys read:** `id`, `name`, `stepName`, `file`, `method`, `time`, `timeStr`, `color`, `uvi`, `xu`, `uvs` (`[{name, yu, xs, ys}]`), `grad` (`{xs, ys}`), `cond` (`{xs, ys}`), `fracs` (`[{x, label}]`), `fracEnd`, `phases` (`[{x, label}]`), `shift`, `injX`, `injShift`, `xmin`, `xmax`, `ymin`, `ymax`, `crop`, `shade`, `poolCap`, `note`, `inWf`, `isStd`, `wfW`, `gelZ`, `integ` (`[{a, b, auto}]`), `secMode`, `secAuto`, `secCal`, `secColGuess`, `gelOff`, `path`, `pathFromFile`, `bufB`, `flowAuto`, `tempAuto`, `colLog`, `cvLog`, `poolConc`, `poolFinalVol`, `ndFinalVol`, plus `COND_KEYS` (`mCol`, `mCV`, `mBufA`, `mBufB`, `mFlow`, `mTemp`, `mGrad`, `mWash`, `mLoad`, `mFrac`, `mInst`, `mOther`).
   - **Assumptions:** `uvOf(run)` converts `AU` to `mAU` in place and sets `c.yu = 'mAU'`. `makeRun(r)` computes `r.secAuto = secGuess(r)` and calls `applyInjShift(r)`. `measToStep(r)` migrates `r.poolConc` and `r.poolFinalVol` into `prep.btw[r.id]` when `poolFinalVol` differs from the pool volume and deletes them from `r`.

5. **Gels Reader (`loadProject`, `processGel`, `gelBands`, `calib`, `tagOf`, `lanePurity`, `gelPart`)**
   - **Function / Location:** `loadProject` (~line 2012), `processGel` (~line 942), `gelBands` (~line 1089).
   - **Keys read:** `id`, `name`, `src`, `rot`, `fine`, `cl`, `cr`, `ct`, `cb`, `black`, `white`, `autoLv`, `invert`, `color`, `nLanes`, `labels`, `assign`, `preset`, `ladder`, `marks` (`[{kda, y, auto}]`), `tags` (`[{kind, y, lane}]`), `edits` (`{added: [{lane, y}], removed: [{lane, y, half}]}`), `runId`.
   - **Assumptions:** `loadProject` loads `g.src` asynchronously via `loadImg(g.src)`, constructs a canvas, and calls `processGel(gg)`. Assumes `g.marks` is an array (`calib` calls `g.marks.filter(...)` directly).

6. **SEC Calibrations Reader (`secCals`, `secCalFor`, `secFit`, `buildCalSVG`)**
   - **Function / Location:** `secCals()` (~line 715), `secCalFor(r)` (~line 717), `secFit(cal)` (~line 725).
   - **Keys read:** `opt.secCals` array of `{id, name, col, unit, v0, v0est, vt, set, stds: [{name, kda, ve, off}]}`.
   - **Assumptions:** Assumes `c.unit` is `'mL'` or `'min'` and `c.stds` is an array of standard objects.

7. **NanoDrop Samples Reader (`loadProject`, `ndVal`, `ndConc`, `ndForRun`, `ndFinalOf`, `ndMigrate`)**
   - **Function / Location:** `loadProject` (~line 2001), `ndMigrate` (~line 804), NanoDrop section (~lines 1760–1910).
   - **Keys read:** `id`, `name`, `date`, `a280`, `a260`, `r280`, `r230`, `corr`, `instConc`, `unit`, `ext`, `mw`, `dil`, `runId`, `stage`, `form`, `kind`, `hide`, `spec` (`{wl: [], ab: []}`), `row`.
   - **Assumptions:** `loadProject` filters `x && typeof x === 'object'`. `ndMigrate()` rewrites `x.stage = 'conc'` if `x.stage === 'final' && prep.btw[x.runId]`.

8. **Prep and Workflow Steps Reader (`prepSteps`, `wfList`, `wfFigList`, `manSteps`, `btwOf`, `renderSteps`)**
   - **Function / Location:** ~lines 1255–1335, 2180–2350.
   - **Keys read:** `prep` keys in `PREP_DEF`, plus `prep.offs`, `prep.titles`, `prep.btw`, `prep.manual`, `prep.skip`, `prep.stepMeta`.

### 2. Migrations check (`tidy13`, `tidy14`, `ndMigrate`, `measToStep`)

- **`tidyOpt` (`tidy13` and `tidy14`, ~line 461):** Safe and idempotent on `localStorage` once `tidy13: true` and `tidy14: true` are saved, but unsafe when called inside `loadProject` on older project files that lack `tidy13`/`tidy14` flags because it silently overwrites `opt.wfYield = false`, `opt.secStds = false`, `opt.noGelSlot = false`, and `opt.wfGelH = 1.3`.
- **`ndMigrate` (~line 804) and `measToStep` (~line 806):** Idempotent on already-migrated data, but `ndMigrate` only migrates `x.stage === 'final'` to `'conc'` when `prep.btw[x.runId]` already exists, stranding legacy `'final'` readings on runs that used `r.ndFinalVol` without `prep.btw`.

## Findings

### Finding 1: projectData drops injX and injShift (and loadProject re-runs makeRun), shifting or double-shifting SEC runs
- **Area:** Runs / SEC / Save & Load
- **Severity:** Critical
- **Needs owner OK:** Yes (affects elution volumes, integration boundaries, and SEC molecular weights)
- **Where:** `projectData()` (~line 1957), `makeRun()` (~line 552), `applyInjShift()` (~line 695), `loadProject()` (~line 2005).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "runs": [{
        "id": "r1",
        "name": "Superdex 200 SEC",
        "file": "sec_run.csv",
        "xu": "mL",
        "injX": 2.5,
        "secMode": "auto",
        "uvs": [{"name": "UV 280", "yu": "mAU", "xs": [0, 12.0, 24.0], "ys": [0, 100, 0]}],
        "fracs": [{"x": 12.0, "label": "A1"}],
        "phases": [],
        "integ": [{"a": 11.0, "b": 13.0, "auto": true}]
      }]
    }

- **What happens:**
  1. When a run with `injX: 2.5` is first parsed, `makeRun` calls `applyInjShift(r)` (~line 553), subtracting `2.5` from `uvs[].xs`, `fracs[].x`, `phases[].x`, and `integ[].a/b`, and setting `r.injShift = 2.5`.
  2. If an older project JSON (or a run object with `injX: 2.5` and no `injShift`) is loaded via `loadProject`, `makeRun(Object.assign({}, r))` sees `r.injX = 2.5` and `r.injShift = null`, so `applyInjShift` subtracts `2.5` a second time, shifting the peak from 12.0 mL to 9.5 mL and changing its apparent MW.
  3. Conversely, `projectData()` (~line 1957) does not include `injX`, `injShift`, or `shift` in the serialized run object. If a non-SEC run with `injX: 2.5` is saved to IndexedDB/JSON and reloaded, `injX` is permanently lost; if the user later switches `secMode` to `'on'` (or if an SEC run is saved and switched to `'off'`), `applyInjShift` cannot shift or unshift the coordinates.
- **What should happen:** `projectData()` must save `shift`, `injX`, and `injShift`. In `loadProject()`, runs loaded from saved project data whose coordinates were already shifted before saving (when `injX` is present without `injShift` in an older save, or when `injShift` is saved) must not be shifted a second time by `makeRun()`.

### Finding 2: ndMigrate strands legacy final-stage NanoDrop readings when prep.btw[runId] is absent, and projectData drops poolConc, poolFinalVol, and ndFinalVol
- **Area:** NanoDrop / Pool yield / Migrations
- **Severity:** Critical
- **Needs owner OK:** Yes (changes pool concentration and mg yield in the summary table and workflow figure)
- **Where:** `ndFinalOf()` (~line 802), `ndMigrate()` (~line 804), `poolMeas()` (~line 795), `projectData()` (~line 1957).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "runs": [{
        "id": "r1",
        "name": "HisTrap IMAC",
        "xu": "mL",
        "shade": "A1-A2",
        "ndFinalVol": 1.5,
        "uvs": [{"name": "UV1_280nm", "yu": "mAU", "xs": [0, 5, 10, 15], "ys": [0, 50, 50, 0]}],
        "fracs": [{"x": 5, "label": "A1"}, {"x": 10, "label": "A2"}, {"x": 15, "label": "Waste"}]
      }],
      "nd": [{
        "id": "nd1",
        "name": "HisTrap final",
        "a280": 2.4,
        "instConc": 2.4,
        "runId": "r1",
        "stage": "final",
        "form": "inst",
        "kind": "protein"
      }]
    }

- **What happens:**
  1. Earlier versions stored post-concentration readings with `stage: 'final'` and `run.ndFinalVol = 1.5`, without any entry in `prep.btw['r1']`. Today, `ndFinalOf(run)` (~line 802) only matches `x.stage === 'conc'`, and `ndMigrate()` (~line 804) only migrates `x.stage === 'final'` to `'conc'` if `prep.btw && prep.btw[x.runId]` is truthy. When the example project above is loaded, `prep.btw['r1']` is undefined, so `ndMigrate()` leaves `stage` as `'final'`, `ndFinalOf(r1)` returns `[]`, and `poolRows(r1)` falls back to uncalibrated UV area instead of `2.4 mg/mL * 1.5 mL = 3.6 mg`.
  2. Furthermore, `projectData()` (~lines 1957–1968) omits `poolConc`, `poolFinalVol`, and `ndFinalVol` when serializing runs. If an old project has `r.poolConc: 3.2` (with `poolFinalVol: ""` for an unconcentrated pool, or `poolFinalVol` within 5% of pool volume so `measToStep` does not move it to `prep.btw`), or `r.ndFinalVol: 1.5`, saving or exporting the project silently drops those fields.
- **What should happen:** `ndMigrate()` should migrate any NanoDrop reading with `x.stage === 'final'` and a valid `x.runId` (matching a run in `runs`) to `x.stage = 'conc'`, and ensure `prep.btw[x.runId]` is initialized with `{how: 'conc', vOut: r.ndFinalVol || ''}`. `projectData()` must also serialize `poolConc`, `poolFinalVol`, and `ndFinalVol` on each run.

### Finding 3: loadProject runs tidyOpt() on project opt, overwriting secStds: true, wfYield: true, noGelSlot: true, and wfGelH: 1.8
- **Area:** Settings / Migrations / Projects
- **Severity:** High
- **Needs owner OK:** Yes (disables `secStds` peak sizing on SEC chromatograms and removes `wfYield` line on older projects)
- **Where:** `tidyOpt()` (~line 461), `loadProject()` (~line 1994).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "opt": {
        "secStds": true,
        "wfYield": true,
        "wfGelH": 1.8,
        "secLabel": "mw",
        "secCals": [{
          "id": "sc1",
          "name": "Superdex 200 Increase 10/300 GL",
          "col": "s200i",
          "unit": "mL",
          "v0": 8.64,
          "vt": 24,
          "set": "biorad",
          "stds": [
            {"name": "Thyroglobulin", "kda": 670, "ve": 9.5, "off": false},
            {"name": "Ovalbumin", "kda": 44, "ve": 14.5, "off": false}
          ]
        }]
      },
      "runs": [{
        "id": "r1",
        "name": "Superdex 200 SEC",
        "xu": "mL",
        "secMode": "on",
        "secCal": "sc1",
        "uvs": [{"name": "UV 280", "yu": "mAU", "xs": [0, 12, 14.5, 24], "ys": [0, 5, 120, 0]}],
        "fracs": [{"x": 14, "label": "A1"}, {"x": 15, "label": "A2"}],
        "integ": [{"a": 13.5, "b": 15.5, "auto": true}]
      }]
    }

- **What happens:** Because `d.opt` in a project exported before WF1.13 lacks `tidy13: true` and `tidy14: true`, `loadProject` calls `tidyOpt()`, which forces `opt.secStds = false` and `opt.wfYield = false`. With `opt.secStds === false`, `secFit()` (~line 726) short-circuits with `off: true`, so `integRows(r1)` produces no `mw` or `kav` on `r.sec`, and the SEC chromatogram peak label changes from `"44 kDa"` to `"14.50 mL"`.
- **What should happen:** In `loadProject`, if `d.opt` explicitly saved `secStds: true` (or if any calibration in `d.opt.secCals` has at least 2 standards with finite `ve`), `wfYield: true`, `noGelSlot: true`, or an explicit `wfGelH`, `loadProject` must preserve those explicit project settings instead of letting `tidyOpt()` clobber them.

### Finding 4: loadProject does not advance uid for prep.manual (m1, m2, ...) or ndSamples (nd1, ...), causing ID collisions
- **Area:** Projects / Manual steps / NanoDrop
- **Severity:** High
- **Needs owner OK:** No
- **Where:** `loadProject()` (~line 2010).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "prep": {
        "on": true,
        "manual": [
          {"id": "m5", "kind": "column", "name": "Gravity Ni-NTA", "after": "", "vol": 5, "conc": 2.0}
        ]
      },
      "nd": [
        {"id": "nd4", "name": "Eluate", "a280": 2.0, "runId": "m5", "stage": "pool", "kind": "protein"}
      ],
      "traces": [],
      "runs": [],
      "gels": []
    }

- **What happens:** In `loadProject` (~line 2010), `uid = 1` is only advanced over `traces` and `runs` synchronously, and later over `gels` inside the async `.then()` (~line 2015), but never over `prep.manual` (`m5`) or `ndSamples` (`nd4`). When the user adds manual steps or runs until `uid` reaches `5`, the new manual step gets `id: 'm5'`, colliding with the existing `'m5'` step in `prep.manual` and corrupting lane assignments, timeline selection, and `manSteps()` lookup.
- **What should happen:** `loadProject` should advance `uid` synchronously across `traces`, `runs`, `d.gels`, `ndSamples`, and `prep.manual` before any async gel image loading or user interaction can occur.

### Finding 5: projectData drops run.pathFromFile and run.isStd
- **Area:** Runs / Save & Load
- **Severity:** Medium
- **Needs owner OK:** No
- **Where:** `projectData()` (~lines 1957–1968), `makeRun()` (~line 552).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "runs": [{
        "id": "r1",
        "name": "Run 1",
        "file": "run1.zip",
        "xu": "mL",
        "path": "10",
        "pathFromFile": true,
        "isStd": true,
        "inWf": false,
        "uvs": [{"name": "UV 1_280", "yu": "mAU", "xs": [0, 10, 20], "ys": [0, 100, 0]}],
        "fracs": []
      }]
    }

- **What happens:**
  1. `parseUnicornZip` sets `{path: String(path), pathFromFile: true}` (~line 546), which records that the UV path length came from the archive. `projectData()` saves `path: r.path || ''` (~line 1966) but drops `pathFromFile`.
  2. If a run has `isStd: true` and its file/method name does not match `/standard|\bstds?\b|calib|\bgf ?std/i`, `projectData()` drops `r.isStd`, so on reload `r.isStd` is lost and the SEC run is no longer excluded from sample peak plotting in `buildCalSVG` (~line 871) or oligomer-label suppression (~line 836).
- **What should happen:** Preserve `pathFromFile: !!r.pathFromFile` and `isStd: !!r.isStd` in `projectData()` and restore them in `loadProject()`.

### Finding 6: loadProject does not sanitize d.opt.known or sync KNOWN_DEFAULT properties, and does not guard d.opt.secCals
- **Area:** Settings / Gels / SEC
- **Severity:** Medium
- **Needs owner OK:** Yes (syncing `KNOWN_DEFAULT` updates contaminant masses and contexts if an older project had stale `known` entries)
- **Where:** `loadProject()` (~line 1994) vs. startup initialization (~line 462).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "opt": {
        "known": [
          null,
          {"name": "His-SUMO tag", "kda": 12.5, "kind": "contam", "on": true}
        ],
        "secCals": "invalid"
      },
      "runs": []
    }

- **What happens:** At startup (~line 462), `opt.known` is sanitized with `opt.known = opt.known.filter(k => k && typeof k === 'object')` and each built-in entry is updated from `KNOWN_DEFAULT` (`k.kda`, `k.ctx`, `k.src`, `k.app`). In `loadProject` (~line 1994), `Object.assign(opt, d.opt)` overwrites `opt.known` directly without filtering null/non-object entries or syncing `KNOWN_DEFAULT` fields (`ctx`, `app`, `kda`). A `null` entry in `d.opt.known` crashes `knownList` rendering and `knownFor`, and an old project saved before `ctx` or `app: 19` was added to `His-SUMO tag` matches `His-SUMO tag` in pre-cleavage lanes or at 12.5 kDa instead of 19 kDa.
- **What should happen:** Extract a helper `normKnown(list)` and call it both at startup and in `loadProject()` after merging `d.opt`, and ensure `if (!Array.isArray(opt.secCals)) opt.secCals = [];`.

### Finding 7: loadProject does not normalize malformed or null sub-objects on d.prep (btw, manual, skip, stepMeta, offs, titles)
- **Area:** Prep / Workflow / Steps
- **Severity:** Medium
- **Needs owner OK:** No
- **Where:** `loadProject()` (~line 1999).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "prep": {
        "on": true,
        "btw": null,
        "manual": null,
        "skip": null,
        "stepMeta": null
      },
      "runs": [{
        "id": "r1",
        "name": "IMAC",
        "xu": "mL",
        "uvs": [{"name": "UV 280", "yu": "mAU", "xs": [0, 5, 10], "ys": [0, 50, 0]}],
        "fracs": [{"x": 2, "label": "A1"}]
      }]
    }

- **What happens:** `Object.assign(prep, d.prep)` overwrites `prep.btw`, `prep.manual`, `prep.skip`, and `prep.stepMeta` with `null` if they were `null` in the JSON, causing downstream step-sheet or workflow readers that index directly into `prep.stepMeta` or `prep.btw` to fail.
- **What should happen:** After `Object.assign(prep, d.prep)` in `loadProject()`, normalize `prep.btw`, `prep.skip`, `prep.stepMeta`, `prep.offs`, and `prep.titles` to plain objects `{}` if falsy or not non-array objects, and `prep.manual` to an array `[]` if not an array.

### Finding 8: loadProject does not normalize legacy SEC calibration objects missing unit or stds fields
- **Area:** SEC calibrations
- **Severity:** Low
- **Needs owner OK:** No
- **Where:** `secCalFor()` (~line 717), `secFit()` (~line 725), `loadProject()` (~line 1994).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "opt": {
        "secStds": true,
        "secCals": [{
          "id": "sc_legacy",
          "name": "Superdex 200 10/300",
          "col": "s200i",
          "v0": 8.5,
          "vt": 24,
          "stds": [
            {"name": "Thyroglobulin", "kda": 670, "ve": 9.5},
            {"name": "Ovalbumin", "kda": 44, "ve": 14.5}
          ]
        }]
      },
      "runs": [{
        "id": "r1",
        "name": "SEC",
        "xu": "mL",
        "secMode": "on",
        "secCal": "sc_legacy",
        "uvs": [{"name": "UV 280", "yu": "mAU", "xs": [0, 14.5, 24], "ys": [0, 100, 0]}],
        "fracs": []
      }]
    }

- **What happens:** In `secCalFor(r)` (~line 718), `if (!c || c.unit !== xUnit(r))` evaluates to `true` when `c.unit` is `undefined` (`undefined !== 'mL'`). `secCalFor(r)` then discards `r.secCal` (`sc_legacy`), creates a brand-new uncalibrated `newSecCal('s200i', 'mL')` with empty `ve: ''` values, and reassigns `r.secCal` to the blank calibration, wiping out all molecular weight calculations for the run.
- **What should happen:** When loading `opt.secCals` (both at startup and in `loadProject`), default `c.unit = c.unit || 'mL'` and `c.stds = Array.isArray(c.stds) ? c.stds : []` on every calibration entry.

### Finding 9: loadProject does not default missing properties on loaded traces or gels (peaks, cols, xc, yc, marks, tags, edits)
- **Area:** Traces / Gels / Save & Load
- **Severity:** Low
- **Needs owner OK:** No
- **Where:** `loadProject()` (~lines 2002, 2012).
- **Example old saved object:**

    {
      "kind": "hplc-figure-bench",
      "v": 1,
      "cur": "overlay",
      "traces": [{
        "id": 1,
        "name": "Analytical SEC",
        "rows": [[0, 1.0], [5, 25.0], [10, 1.0]]
      }]
    }

- **What happens:** `loadProject` (~line 2002) checks `t && typeof t === 'object' && Array.isArray(t.rows) && t.rows.length`, then does `Object.assign({}, t)` without merging defaults from `makeTrace`. Because `peaks`, `cols`, `xc`, `yc`, `visible`, and `color` are `undefined`, `processTrace(t)` reads `r[t.xc]` (`r[undefined]`), returning `xs: [], ys: []`, and `buildSVG()` (~line 795: `p.t.peaks.length`) throws `TypeError` if `peaks` is missing. Similarly, on `gels`, `loadProject` (~line 2018) does not default `marks: []`, `assign: []`, `tags: []`, or `edits: {added: [], removed: []}`.
- **What should happen:** In `loadProject`, merge loaded trace objects over default trace fields (`visible: true, cols: ['X', 'Y'], xc: 0, yc: 1, offset: 0, scale: 1, xshift: 0, peaks: []`) and loaded gel objects over default gel fields (`marks: [], assign: [], tags: [], edits: {added: [], removed: []}, crop: {l:0, r:1, t:0, b:1}`).

## Ready-to-file issues

### Sanitize opt.known and opt.secCals in openProject

**Needs owner OK:** Yes (syncs built-in contaminant metadata on loaded projects to match startup behavior).

**What to change and where:**
1. In `hplc-figure-bench(WF1.13).html` (~line 462 and ~line 1994), extract a shared helper that filters `opt.known` to non-null objects and refreshes `kda`, `ctx`, `src`, and `app` from `KNOWN_DEFAULT` for built-in entries, and call it both at startup and in `openProject`.
2. In the same helper, ensure `opt.secCals` is an array of valid objects.

**Check to add to `tests/suites/30_robust.js`:**
Import through `#projFile` a project JSON where `opt.known` contains a `null` element alongside valid entries and `opt.secCals` is `"invalid"`. Verify that the app loads without console errors and renders `#knownList` cleanly.

Line numbers in this audit are unreliable: find the code by function name. The project loader is `openProject` (with `cleanProject` for damaged entries), not `loadProject`. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Normalize null or malformed prep sub-objects in openProject

**Needs owner OK:** No.

**What to change and where:**
1. In `openProject` in `hplc-figure-bench(WF1.13).html` (~line 1999), after `Object.assign(prep, d.prep)`, ensure `prep.btw`, `prep.skip`, `prep.stepMeta`, `prep.offs`, and `prep.titles` are plain objects (`if (!prep[k] || typeof prep[k] !== 'object' || Array.isArray(prep[k])) prep[k] = {};`) and `if (!Array.isArray(prep.manual)) prep.manual = [];`.

**Check to add to `tests/suites/30_robust.js`:**
Import through `#projFile` a project JSON with `prep: {on: true, btw: null, manual: null, skip: null, stepMeta: null}` and one run `r1`, click through the steps in `#tl`, and verify that `#stepSheet` renders without throwing an error.

Line numbers in this audit are unreliable: find the code by function name. The project loader is `openProject` (with `cleanProject` for damaged entries), not `loadProject`. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Default missing unit and stds fields on legacy SEC calibrations

**Needs owner OK:** No.

**What to change and where:**
1. In `secCals()` and `openProject` in `hplc-figure-bench(WF1.13).html` (~line 715 and ~line 1994), normalize each calibration object in `opt.secCals` so `c.unit = c.unit || 'mL'` and `c.stds = Array.isArray(c.stds) ? c.stds.filter(s => s && typeof s === 'object') : []`.

**Check to add to `tests/suites/30_robust.js`:**
Import through `#projFile` a project JSON where `opt.secStds` is `true` and `opt.secCals` has a calibration object without a `unit` field (`id: "sc_old"`, `col: "s200i"`, `v0: 8.5`, `vt: 24`, `stds: [{name: "Thyroglobulin", kda: 670, ve: 9.5}, {name: "Ovalbumin", kda: 44, ve: 14.5}]`) linked to an SEC run (`secCal: "sc_old"`). Verify that `#sec-cal` keeps `"sc_old"` selected without creating a duplicate blank calibration and the SEC peak MW is displayed.

Line numbers in this audit are unreliable: find the code by function name. The project loader is `openProject` (with `cleanProject` for damaged entries), not `loadProject`. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.

### Default missing fields on loaded trace and gel objects in openProject

**Needs owner OK:** No.

**What to change and where:**
1. In `openProject` in `hplc-figure-bench(WF1.13).html` (~line 2002 and ~line 2018), default missing fields on loaded traces (`visible: t.visible !== false, cols: Array.isArray(t.cols) ? t.cols : ['X', 'Y'], xc: t.xc ?? 0, yc: t.yc ?? 1, offset: t.offset ?? 0, scale: t.scale ?? 1, xshift: t.xshift ?? 0, peaks: Array.isArray(t.peaks) ? t.peaks : []`) and loaded gels (`marks: Array.isArray(g.marks) ? g.marks : [], assign: Array.isArray(g.assign) ? g.assign : [], tags: Array.isArray(g.tags) ? g.tags : [], edits: g.edits && typeof g.edits === 'object' ? g.edits : {added: [], removed: []}`).

**Check to add to `tests/suites/30_robust.js`:**
Import through `#projFile` a project JSON with `cur: "overlay"` and `traces: [{id: 1, name: "Trace 1", rows: [[0, 0], [1, 10], [2, 0]]}]` (omitting `xc`, `yc`, `peaks`, `cols`, and `visible`). Verify that the overlay figure renders a `<path>` in `#paper svg` without throwing an error.

Line numbers in this audit are unreliable: find the code by function name. The project loader is `openProject` (with `cleanProject` for damaged entries), not `loadProject`. Tests drive the app through its UI only, with synthetic data. Follow AGENTS.md.