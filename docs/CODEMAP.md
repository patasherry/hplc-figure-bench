# HPLC Figure Bench Code Map (`hplc-figure-bench(WF1.13).html`)

> **Note:** Line numbers drift as the codebase evolves. Always search for the function or variable name to pinpoint exact locations.

---

## Sections

| Lines | Section | Purpose |
|---|---|---|
| 1347–1407 | `helpers` | Generic string escaping, array math, tick fitting, formatting, and SVG helpers |
| 1408–1456 | `parsing: generic` | General text/CSV/TSV chromatogram parsing, header detection, and delimiter splitting |
| 1457–1516 | `parsing: ÄKTA / UNICORN` | ÄKTA exported CSV parsing for UV, gradient (%B), conductivity, pressure, and fraction logs |
| 1517–1546 | `UNICORN 7 result archive (.zip)` | Decompressing UNICORN 7 `.zip` archives and extracting binary result curves |
| 1547–1610 | `traces and runs` | Managing trace data objects, baseline correction, and run data creation |
| 1611–1735 | `runs: windows and fractions` | Fraction boundary detection, fraction segment calculation, and time/volume windowing |
| 1736–1755 | `peak integration` | Numerical integration algorithms (Simpson/trapezoidal, Gaussian) between retention limits |
| 1756–2009 | `size exclusion (SEC)` | SEC molecular weight calibration, standards curve fitting ($V_e/V_0$ vs $\log M_w$), and peak mass calculations |
| 2010–2040 | `figure: shared bits` | Common SVG chart dimensions, axis tick rendering, and color definitions |
| 2041–2164 | `figure: HPLC overlay` | Rendering analytical HPLC overlay chromatograms with aligned peak labels |
| 2165–2467 | `figure: ÄKTA run chart` | Rendering ÄKTA preparative run figures with dual Y-axes, fractions, and phase shading |
| 2468–2554 | `gels` | SDS-PAGE gel image object construction, lane assignments, and crop metadata |
| 2555–2665 | `auto crop` | Image processing to detect stained SDS-PAGE lanes, lane spacing, and top/bottom gel bounds |
| 2666–2875 | `gel densitometry` | Lane pixel intensity profile extraction, band peak detection, and ladder $R_f$ log-MW calibration |
| 2876–3359 | `band tags and purity` | Gel band tagging, contaminant identification, known protein matching, and lane purity math |
| 3360–3632 | `composite: run with gels, and the workflow` | Rendering multi-panel purification workflow figures combining chromatograms and SDS-PAGE gel aligned lanes |
| 3633–3990 | `upstream steps` | Upstream purification steps (construct cassette, expression, lysis) diagram rendering |
| 3991–4143 | `run conditions` | Formatting run conditions (column model, buffer compositions, flow rate, gradient) and generating methods text |
| 4144–4181 | `figures` | Active figure selection and figure state getters |
| 4182–4661 | `UI` | DOM element event bindings, tab management, control synchronization, and interactive table rendering |
| 4662–4923 | `editing the workflow figure in place` | On-figure interactive click handlers to adjust panel widths, titles, arrow notes, and gel focus windows |
| 4924–5012 | `loading` | File drag-and-drop / file input handlers for chromatograms, gel images, GenBank, and PDB files |
| 5013–5153 | `protein: sequence properties and PDB structures` | Protein MW, $\varepsilon_{280}$, pI calculations from sequence, and PDB/mmCIF 3D structure domain parsing |
| 5154–5249 | `construct and expression panel` | UI controls and SVG builder for genetic construct cassette, expression host, and lysis parameters |
| 5250–5430 | `NanoDrop: protein A280 readings` | NanoDrop UV-Vis spectrum/summary parser, $A_{280}$ concentration calculations, and concentration bar charts |
| 5431–5496 | `SEC panel` | UI controls and calibration curve plots for size-exclusion chromatography standards |
| 5497–5517 | `collapsible panel sections` | Expand/collapse accordion panel UI state persistence |
| 5518–5561 | `what to do next` | Guided workflow suggestion bar above figures with actionable next-step buttons |
| 5562–5605 | `projects: everything in one JSON file` | Exporting workspace state to `.json` files and importing project files |
| 5606–5743 | `projects: browser & cloud storage` | IndexedDB (`hfb-projects`) and cloud persistence for multi-project management |
| 5744–5816 | `home` | Home screen workspace project list and project creation/opening UI |
| 5817–5923 | `the step timeline` | Step-by-step purification timeline editor and step metadata sheet |
| 5924–6132 | `quick fill` | One-click lab protocol templates (e.g. IMAC, SEC, Ion Exchange) populating workflow steps |
| 6133–6233 | `export` | Exporting figures to High-DPI PNG, SVG, and bundled ZIP archives |
| 6234–6255 | `example data` | Built-in demo chromatogram curves and gel images for instant testing |

---

## Data Structures

### `run` (Chromatogram / Purification Step)
- `id`: Unique integer ID (e.g. `1`)
- `name`: String run title (e.g. `"HisTrap FF 5 mL"`)
- `type`: String run type (`"overlay"`, `"akta"`, etc.)
- `uvs`: Array of UV trace objects `[{ xs: Float64Array, ys: Float64Array, name: "UV1_280", unit: "mAU" }]`
- `fracs`: Fraction boundary object `{ name: "Fractions", xs: [...], xe: [...] }`
- `shade`: Array of shaded retention regions `[{ a: float, b: float, col: "#hex" }]`
- `integ`: Array of peak integration region objects `[{ a: float, b: float, name: "Peak 1", area: float }]`
- `secMode`: Boolean indicating whether x-axis is volume/SEC-calibrated
- `injX`: Retention time/volume offset for sample injection
- `injShift`: Manual x-axis shift offset
- `path`: UV cell path length in mm (default `2` or `10`)
- `mFlow`: Flow rate in mL/min
- `col`, `bufA`, `bufB`, `mGrad`, `mLoad`, `mCond`, `mTemp`: Manual run condition strings (column model, buffers, load volume, etc.)
- `mGradPh`, `mFlowPh`, `mIntegPh`, `mVol`: Step timeline phase properties
- `blobId`: Internal Cloud/IndexedDB asset reference ID for heavy curve data

### `gel` (SDS-PAGE Image & Densitometry)
- `id`: Unique integer ID
- `name`: Gel title string
- `src`: HTML Canvas or Image element containing raw gel image
- `crop`: Crop bounding box `{ l: float, r: float, t: float, b: float, ang: float }`
- `lanes`: Array of lane x-coordinate ratios across crop width
- `marks`: Array of detected/manual band mark objects per lane `[[{ y: float, mw: float, int: float }]]`
- `tags`: Array of band identity tags `[{ lane: int, mark: int, tag: "target"|"contam", label: string }]`
- `assign`: Map of lane index to assigned run ID or step ID
- `ladder`: Ladder preset key string (e.g. `"biorad"`, `"prplus"`)
- `ladderMsg`: Status/error string from ladder auto-calibration
- `marksManual`: Boolean indicating whether band marks were manually edited
- `_img`: Cached base64 data URL string for export/saving
- `imageId`: Asset reference ID for storage

### `prep`, `prep.btw`, `opt`, `ndSamples`
- `prep`: Global purification pipeline object:
  - `on`: Boolean workflow mode switch
  - `gb`: GenBank cassette sequence metadata `{ feats: [...], seq: "..." }`
  - `expr`: Expression host & induction conditions `{ host: "BL21(DE3)", temp: "18 °C", IPTG: "0.5 mM" }`
  - `lysis`: Lysis buffer and cell mass parameters `{ wetG: 10, vol: 50, method: "Sonication" }`
  - `steps`: Array of workflow step configuration objects
  - `btw`: Object mapping run IDs to inter-step transfer parameters (`prep.btw[runId]`)
  - `nc`: Non-chromatography step configurations (e.g. dialyzed lysate, clarification)
  - `man`: Manual step parameters
  - `nextUid`: Counter for auto-generated IDs
- `prep.btw[runId]`: Inter-step pool transfer object:
  - `how`: Transfer method (`"conc"`, `"pool"`, `"direct"`)
  - `vol`: Pool volume in mL
  - `conc`: Protein concentration in mg/mL
  - `mg`: Calculated total protein mass in mg
  - `yield`: Step recovery yield %
  - `note`: Free-text note string
- `opt`: Global user configuration object (initialized from `DEF`, saved in `localStorage['hplc-fig-opt']`):
  - Figure dimensions (`w`, `h`, `dpi`, `preset`), font (`font`, `fs`), palette (`palette`)
  - Integration preferences (`intMethod`, `intBase`, `intProm`)
  - Gel display settings (`gelPos`, `gelAlign`, `gelScale`, `gelHAdj`, `laneMark`, `gelView`)
  - Publication defaults and custom standard calibrations (`secCals`, `known`)
- `ndSamples`: Array of NanoDrop spectrum/concentration readings:
  - `[{ id, name, conc, a280, a260, r280_260, runId, pool, spec: { wl: [...], abs: [...] }, specId }]`

### Project JSON Format
Saved `.json` files or IndexedDB records:
```json
{
  "app": "HPLC Figure Bench",
  "version": 1,
  "saved": "2025-01-01T00:00:00.000Z",
  "cur": "workflow",
  "opt": { ... },
  "prep": { ... },
  "runs": [ { "id": 1, "name": "...", "uvs": [...], "blobId": "..." } ],
  "traces": [ ... ],
  "gels": [ { "id": 1, "name": "...", "image": "data:image/png;base64,...", "crop": { ... }, "marks": [ ... ] } ],
  "struct": null,
  "nanodrop": [ { "id": 1, "name": "...", "conc": 1.25, "spec": { ... } } ]
}
```

---

## Key Functions

| Function | Line | Purpose | Reads | Called By |
|---|---|---|---|---|
| `parseText` | Line 1422 | Parses raw ASCII/CSV/TSV chromatogram data lines into numeric series | Raw text string | `loadFiles`, `addParsed` |
| `parseGenBank` | Line 3755 | Parses GenBank text to extract CDS features, tags, and amino acid sequences | GenBank file text | `loadGenBank` |
| `parseStructure` | Line 5087 | Parses PDB or mmCIF structure file into protein entities and chain metadata | PDB/CIF file text | `loadStructFile` |
| `parseNanoDrop` | Line 5274 | Parses NanoDrop exported spectra CSV/TSV or concentration summary tables | File text string | `loadFiles` |
| `looksNanoDrop` | Line 5259 | Checks if text file content matches NanoDrop export header signatures | File text string | `loadFiles` |
| `fracSegments` | Line 1612 | Splits fraction boundaries into continuous baseline time/volume segments | `run` object | `buildRunSVG`, `composeRuns` |
| `procFull` | Line 1922 | Processes raw run UV data, subtracts baseline, and computes peak integration | `run` object | `autoIntegrate`, `renderIntTable` |
| `runAuto` | Line 1634 | Auto-detects run type, units, fraction tables, and chromatography conditions | `run` object | `addParsed`, `loadFiles` |
| `runCondLines` | Line 4064 | Formats run conditions (column, buffer, flow, gradient) into formatted text lines | `run` object | `composeRuns`, `methodsText` |
| `guessColumn` | Line 4017 | Heuristically identifies column model and dimensions from run title or labels | `run` object / string | `runCondLines` |
| `guessGradient` | Line 4033 | Parses gradient step changes (%B, CV, or flow rate) from run data | `run` object | `runCondLines` |
| `poolRows` | Line 1952 | Computes pooled fraction volumes, $A_{280}$, and total protein amounts | `run` object | `sumRows`, `renderSumTable`, `methodsText` |
| `poolMeas` | Line 1937 | Calculates peak area, height, and concentration for a pooled fraction region | `run` object, pool region | `poolRows` |
| `massOf` | Line 1861 | Calculates protein mass (mg) from integrated peak area or $A_{280}$ absorbance | Area, $A_{280}$, $\varepsilon$, MW | `poolMeas`, `sumRows` |
| `integRows` | Line 1924 | Builds peak integration table rows for UI display | `run` object | `renderIntTable` |
| `autoIntegrate` | Line 1967 | Automatically detects and integrates UV baseline peaks above prominence threshold | `run` object | `addParsed`, `procFull` |
| `integrateRegion` | Line 1744 | Numerically integrates peak area between retention bounds $a$ and $b$ | $x$-array, $y$-array, $a$, $b$, baseline mode | `procFull`, `autoIntegrate` |
| `secCalFor` | Line 1799 | Retrieves active SEC standard calibration curve for a run | `run` object | `buildRunSVG`, `activeCal` |
| `activeCal` | Line 5433 | Gets currently active SEC calibration curve for the SEC panel | `opt`, `runs` | `renderSec` |
| `autoCrop` | Line 2556 | Auto-detects SDS-PAGE gel lane boundaries, vertical bounds, and crop box | `gel` object | `processGel`, `addGelFiles` |
| `detectBands` | Line 2746 | Finds band peaks in a gel lane intensity profile curve | `gel`, lane index, sensitivity | `gelBands`, `processGel` |
| `ladderResid` | Line 2826 | Calculates ladder fit residual error for gel $R_f$ calibration | `gel` object | `autoLadder`, `calib` |
| `autoLadder` | Line 3080 | Matches gel ladder lane bands against reference ladder size standard values | `gel` object | `processGel`, `renderLaneTable` |
| `calib` | Line 2842 | Calibrates molecular weight $\log(M_w)$ vs $R_f$ migration curve for gel | `gel` object | `gelBands`, `lanePurity` |
| `gelBands` | Line 2847 | Returns list of detected gel bands with assigned MW and integrated intensity | `gel` object | `renderBandTable`, `composeRuns` |
| `lanePurity` | Line 3014 | Calculates relative densitometric purity percentage of target gel lane bands | `gel`, lane index | `renderBandTable`, `sumRows` |
| `bandSnap` | Line 2863 | Saves state snapshot of gel tags/marks for undo history | `gel` object | UI event listeners |
| `bandUndo` | Line 2864 | Restores previous gel marks/tags state from undo stack | `gel` object | UI event listener |
| `autoContrast` | Line 3114 | Auto-adjusts display contrast/brightness levels for gel image view | `gel` object | `processGel`, UI event listener |
| `constructModel` | Line 3823 | Generates translated protein sequence model from genetic construct cassette | `prep.gb`, `opt.protSeq` | `seqMass`, `buildPrepSVG`, `yieldLine` |
| `stepList` | Line 5835 | Builds ordered list of purification steps across workflow pipeline | `runs`, `gels`, `prep` | `renderSteps`, `stepStatus`, `renderNext` |
| `applyQuick` | Line 5998 | Applies lab protocol template to populate workflow steps and conditions | Quick template ID | UI event listener |
| `manSentence` | Line 4005 | Formats written methods sentence for a manual workflow step | Step object | `methodsText` |
| `btwSentence` | Line 3999 | Formats written methods sentence for inter-step transfers | Transfer object | `methodsText` |
| `ndForm` | Line 5330 | Determines active protein form and extinction coefficient for NanoDrop sample | Run / sample object | `ndEpsFor`, `renderND` |
| `ndEpsFor` | Line 5331 | Calculates molar extinction coefficient $\varepsilon_{280}$ for a protein form | Run ID / protein form | `ndConc`, `renderND` |
| `cleanSeq` | Line 5022 | Cleans amino acid sequence string (removes whitespace and digits) | Sequence string | `seqMass`, `seqA280`, `seqPI` |
| `seqMass` | Line 5023 | Calculates molecular weight (Da) from amino acid sequence | Sequence string | `constructModel`, `protForms` |
| `seqA280` | Line 5024 | Calculates extinction coefficient $\varepsilon_{280}$ ($\text{M}^{-1}\text{cm}^{-1}$) from sequence | Sequence string | `constructModel`, `protForms` |
| `seqPI` | Line 5027 | Estimates theoretical isoelectric point (pI) from protein sequence | Sequence string | `renderProt` |
| `ndStats` | Line 5348 | Calculates mean, SD, and CV% for NanoDrop sample replicate measurements | Samples array | `renderND` |
| `sumRows` | Line 4739 | Generates purification summary table rows across all workflow steps | `runs`, `gels`, `prep`, `opt` | `renderSumTable`, `finalYield`, `methodsText` |
| `methodsText` | Line 4075 | Generates full written Materials and Methods text paragraph | `runs`, `gels`, `prep`, `opt` | UI event listener |
| `renderSumTable` | Line 4789 | Renders purification yield and recovery summary HTML table | `sumRows()` | `render` |
| `renderBandTable` | Line 4535 | Renders gel densitometry and band purity HTML table | `gel`, `gelBands()` | `render` |
| `renderIntTable` | Line 4834 | Renders peak integration details HTML table | `run`, `integRows()` | `render` |
| `projectData` | Line 5564 | Packs current workspace state into exportable project JSON structure | `runs`, `gels`, `prep`, `opt` | `openProject`, `projSave` listener |
| `openProject` | Line 5572 | Loads project JSON object into current workspace state | Project data JSON | `projFile` listener, `importAsProject` |
| `importAsProject` | Line 5599 | Opens saved project file as a new isolated project in workspace | Project data JSON | `projFile` listener |
| `storeInit` | Line 5612 | Initializes IndexedDB (`hfb-projects`) or Cloud storage backends | Window environment | `storeLoad`, `saveOne`, `storeDelete`, `renderHome` |
| `packCloud` | Line 5646 | Packs project state and uploads heavy asset blobs to cloud storage | Workspace snapshot | `packFor`, `saveOne` |
| `unpackCloud` | Line 5659 | Downloads cloud asset blobs and restores full project state | Cloud project state | `storeLoad` |
| `saveOne` | Line 5704 | Saves project state to IndexedDB or Cloud database store | Project ID, snapshot | `flushSave` |
| `storeLoad` | Line 5729 | Loads project state from IndexedDB or Cloud database store | Project ID | `openStoredProject` |
| `storeDelete` | Line 5736 | Deletes project record from IndexedDB or Cloud database store | Project ID | UI event listener |
| `render` | Line 4211 | Master UI render routine updating figures and active panels | Global app state | Event listeners, `openProject` |
| `buildRunFig` | Line 3576 | Generates SVG string for a single HPLC / ÄKTA run chart | `run` object | `buildWorkflow`, `buildFig` |
| `buildWorkflow` | Line 3602 | Generates multi-panel composite figure SVG (runs + gel lanes) | `runs`, `gels`, `prep` | `buildFig`, `render` |
| `buildStepFig` | Line 6121 | Generates step timeline diagram SVG | `stepList()` | `renderSteps` |
| `buildConcFig` | Line 5401 | Generates NanoDrop $A_{280}$ concentration bar chart SVG | `ndSamples` | `buildNDSVG` |
| `buildNDSVG` | Line 5404 | Generates full NanoDrop panel SVG (spectra or bar chart) | `ndSamples` | `renderND` |
| `buildPrepSVG` | Line 3873 | Generates construct / expression / lysis panel SVG diagram | `prep` state | `renderPrep` |
| `buildStructSVG` | Line 5215 | Generates PDB protein structure domain diagram SVG | `struct` state | `renderProt` |
| `renderList` | Line 4318 | Renders sidebar list of loaded runs, gels, and traces | `runs`, `gels`, `traces` | `render` |
| `syncControls` | Line 4442 | Synchronizes HTML input controls with `opt` settings state | `opt` object | `render`, `openProject` |
| `renderHome` | Line 5748 | Renders home screen project workspace cards list | `storeList()` | `showHome` |
| `renderSteps` | Line 5888 | Renders step timeline HTML controls and SVG diagram | `stepList()` | `render` |
| `renderStepSheet` | Line 5895 | Renders step detail editor sheet in UI | Selected step | `selectStep`, `render` |
| `renderND` | Line 5358 | Renders NanoDrop data table, stats, and spectrum SVG | `ndSamples` | `render` |
| `renderSec` | Line 5440 | Renders SEC calibration standards panel and curve SVG | `secCals`, `runs` | `render` |
| `renderPrep` | Line 5171 | Renders construct / expression panel HTML controls and SVG | `prep` state | `render` |
| `renderNext` | Line 5556 | Renders next suggested action banner above figure | `nextStep()` | `render` |
| `downloads` | Line 6135 | Triggers browser file download of SVG, PNG, or JSON | Content blob, filename | Export event listeners |
| `toPng` | Line 6174 | Renders SVG string onto HTML canvas and exports High-DPI PNG | SVG string, DPI/scale | Export event listeners |
| `zip` | Line 6193 | Creates ZIP archive containing exported figure files | Files map | Export event listeners |
| `saveFile` | Line 6138 | Triggers browser file download for text or binary content | Filename, content | `projSave`, export listeners |

---

## Where to Change X

| Task | Functions / Objects to Edit | Location / Notes |
|---|---|---|
| **Add a new import format** | `loadFiles` (Line 4956), `addParsed` (Line 4988), Section `parsing` | Add parsing logic in `parsing: generic` or `parsing: ÄKTA` section |
| **Add a new figure option** | `DEF` (Line 1278), `syncControls` (Line 4442), `onOpt` (Line 4486), `buildRunFig` / `buildWorkflow` | Register default in `DEF`, bind UI control in `syncControls`, apply in SVG build functions |
| **Add a new column in summary table** | `sumRows` (Line 4739), `renderSumTable` (Line 4789) | Add field calculation in `sumRows` and HTML table header/cell in `renderSumTable` |
| **Add a new methods sentence** | `methodsText` (Line 4075), `runCondLines` (Line 4064), `manSentence` (Line 4005), `btwSentence` (Line 3999) | Edit sentence builders under `run conditions` section |
| **Add a new gel ladder preset** | `LADDERS` (Line 1326), `#g-preset` dropdown (Line 1333) | Add ladder entry with reference band sizes to `LADDERS` constant |
| **Add a new host contaminant protein** | `KNOWN_DEFAULT` (Line 1294) | Add protein entry `{ name, kda, kind: 'contam', ctx, src }` to `KNOWN_DEFAULT` array |
| **Modify peak integration math** | `integrateRegion` (Line 1744), `procFull` (Line 1922), `autoIntegrate` (Line 1967) | Edit baseline fitting or numerical integration algorithms under `peak integration` |
| **Modify SEC calibration fit** | `secCalFor` (Line 1799), `renderSec` (Line 5440), `onSec` (Line 5466) | Edit linear/polynomial calibration regression fitting in `size exclusion (SEC)` section |
| **Modify gel band auto-detection** | `detectBands` (Line 2746), `autoCrop` (Line 2556), `autoLadder` (Line 3080) | Adjust sensitivity thresholds or peak picking in `gel densitometry` section |
| **Modify lane purity calculation** | `lanePurity` (Line 3014), `renderBandTable` (Line 4535) | Adjust band background subtraction or total intensity normalization in `band tags and purity` |
| **Add a new NanoDrop file format** | `parseNanoDrop` (Line 5274), `looksNanoDrop` (Line 5259), `addNanoDrop` (Line 5311) | Add header recognition and row parsing under `NanoDrop: protein A280 readings` |
| **Modify step timeline / templates** | `quickFill` (Line 5924), `applyQuick` (Line 5998), `stepList` (Line 5835) | Edit protocol step templates in `quick fill` section |
| **Add field to project export JSON** | `projectData` (Line 5564), `openProject` (Line 5572), `packCloud` (Line 5646), `unpackCloud` (Line 5659) | Update export serializer and import deserializer under `projects` |
| **Modify figure SVG export (PNG/ZIP)** | `toPng` (Line 6174), `zip` (Line 6193), `downloads` (Line 6135) | Update canvas rendering, resolution scaling, or archive creation in `export` section |
| **Modify construct / expression SVG** | `buildPrepSVG` (Line 3873), `constructSVG` (Line 3923), `ncSVG` (Line 3897) | Edit vector layout in `construct and expression panel` section |
| **Modify IndexedDB / Cloud storage** | `storeInit` (Line 5612), `saveOne` (Line 5704), `storeLoad` (Line 5729), `storeDelete` (Line 5736) | Edit storage drivers under `projects: browser & cloud storage` section |
| **Modify home screen project list** | `renderHome` (Line 5748), `openStoredProject` (Line 5784) | Edit workspace card rendering under `home` section |
| **Modify "What to do next" guidance** | `renderNext` (Line 5556), `nextStep` (Line 5526) | Edit step recommendation rules under `what to do next` section |
| **Modify figure preset dimensions** | `PRESETS` (Line 1319) | Update width, height, font size, line weight in `PRESETS` constant |
| **Add a new UI panel or tab** | `render` (Line 4211), `syncControls` (Line 4442), Section `collapsible panel sections` | Add HTML panel markup and bind rendering update in `UI` section |
