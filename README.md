# HPLC Figure Bench

HPLC Figure Bench is a single-file browser application for making publication-quality protein purification figures: HPLC and ÄKTA chromatograms, SDS-PAGE gels with densitometry, size-exclusion (SEC) calibration, NanoDrop readings and spectra, construct schematics, and composite multi-step purification workflow figures with a quantitative summary table and draft Methods text.

## How to use

Double-click `hplc-figure-bench(WF1.13).html` to open it in any web browser (or add `#quick` to the URL to jump straight into Quick-Figure mode).

**1. Quick figure from one chromatogram**
Click **"Make a quick figure without a project"** on the home screen. Drop a CSV, TSV, TXT, or UNICORN 7 `.zip` file from the ÄKTA or HPLC (or paste two columns from Excel). Drag across the chart to integrate a peak, or click **"Detect peaks"** under Peak integration. Copy the SVG or save a PNG at journal column widths.

**2. A full purification project**
From the home screen, enter a project name and click **"Start project"**. Use the **Steps** timeline on the left to record each stage of your prep: construct, transformation, expression, lysis, every chromatography column, concentration/NanoDrop checks, protease cleavage/dialysis, any gravity or batch steps without a chromatogram, and the final sample. For each column run, type fraction names (such as `T3-T6`, `T5#2` for a wrapped rack, or `A1-A6` for 96-well plates) or click **Suggest** to mark the pool. Drop in gel images and NanoDrop exports as you go. The workflow figure, purification summary table, and Methods text update automatically. Tick **Full chromatogram in the workflow** in the figure options to draw every column over its whole run instead of the cropped window (single-run figures keep their crop). For gels, **Gel view: Whole gel** already shows the uncropped gel; lane trimming is not changed by this option.

**3. SEC calibration**
Open the **Size exclusion (SEC)** section and tick **"Size peaks with calibration standards (apparent MW, Kav, oligomer state)"**. Choose a standard kit (Bio-Rad, Cytiva HMW/LMW, or custom), drop a standards run file, select it under **"Read standard volumes from"**, and click **"Read peaks"** to review and confirm the peak-to-standard matching. The app fits $\log_{10}(\text{MW})$ against $K_{\text{av}}$ (or $V_e$) and labels SEC peaks with apparent molecular weight or oligomer state.

**4. Gels**
Drop a PNG, JPEG, or TIFF gel image. The app automatically crops to the stained lanes, tracks lane tilt, matches the ladder lane (default: Bio-Rad Precision Plus; change the **Ladder** menu if you used another marker) to calibrate band sizes, and integrates bands in each lane. Lanes named after fractions (`T3`, `Pool`, `Lysate`, `-Ulp1`/`+Ulp1`) are automatically linked to their run or prep step, with optional connector lines and color-coding between chromatogram fractions and gel lanes. Click bands (or cycle their chips in the band table) to mark **Target**, **Tagged**, or **Contaminant** bands for purity and molar cleavage calculations.

**5. Protein, Construct, and PDB structures**
In the **Protein** section, paste your untagged protein sequence or load a 4-character PDB code (or drop a `.cif`/`.pdb` file). The app calculates chain masses, Bjellqvist pI (matching ExPASy ProtParam), and reduced $A_{280}$ (1 mg/mL) values for the tagged, cleaved, and free-tag forms. Clicking **"Use for gel, SEC and mg"** applies these values across gel band matching, SEC monomer sizing, and UV/NanoDrop mg calculations. Dropping a GenBank file (`.gb`, `.gbk`, `.ape`, `.dna`) draws a scaled expression cassette schematic showing the promoter, operator, RBS, tag, protease site, ORF, and terminator.

**6. Exports and backups**
Below the figure, click **"Copy SVG"**, **"Save SVG"**, **"Save PNG"** (at 300, 600, or 1200 dpi), or **"Save all (ZIP)"** to bundle all figures and CSV tables. Below each table, click **"Save table (CSV)"** or **"Copy methods"**. In the top bar, click **"Export file"** to download a `.json` backup of your project, **"Open file"** to load a saved `.json` project, or **"Save as project"** to turn a quick figure into a saved project.

**7. Troubleshooting**
Status messages and hints explain missing inputs or unverified numbers. For example, if UV protein mass cannot be calculated for a run, the summary notes explain why—such as `"the x axis is in minutes and the flow rate is not known (enter it under Flow)"` or `"the selected UV curve is 260 nm, not 280 nm"`.

## Supported Inputs and Exports

**Inputs:**
*   **Chromatography Data:** `.csv`, `.tsv`, `.txt`, `.zip` (UNICORN 7 result archives), `.asc`, `.dat`, `.arw`, `.xy`, and pasted spreadsheet columns.
*   **Gel Images:** PNG, JPEG, and TIFF (`.tif`, `.tiff`, decoded on demand via `pako` and `UTIF`).
*   **Sequences & Plasmids:** GenBank and plasmid files (`.gb`, `.gbk`, `.genbank`, `.ape`, `.dna`) and plain amino acid sequences. GenBank text copied from Benchling or SnapGene can be pasted with **Paste GenBank text** in the Construct section. Only the first record is read; FASTA and protein records are refused, and a LOCUS length that differs from the sequence gives a warning.
*   **Structures:** Local `.cif`, `.mmcif`, `.pdb`, `.ent` files, or live fetches from RCSB PDB by entry code.
*   **NanoDrop Readings:** `.csv`, `.tsv`, and `.txt` exports from NanoDrop One, 2000, or 8000 (Protein A280, A205, Proteins & Labels, and full spectra), or manual readings via **"Type a reading"**.
*   **Project Files:** `.json` project files exported from this tool. Damaged or incomplete entries are skipped with a count. Spreadsheets (`.xlsx`) and HEIC/PDF images are not read directly; export them as CSV or PNG/JPEG/TIFF first.

**Outputs:**
*   **Figures:** SVG (clipboard or file), PNG (300, 600, or 1200 dpi), or a combined ZIP archive (**"Save all (ZIP)"**) of all figures and CSV tables.
*   **Tables & Text:** Purification summary CSV, peak integration CSV, gel band densitometry CSV, and generated Methods text.
*   **Project Backups:** Single-file `.json` project exports containing all runs, traces, cropped/original gels, NanoDrop readings, structures, steps, and figure settings.

## Protein mg from the UV area and NanoDrop

*   **Formula:** $\text{mg} = \frac{A_{280}\text{ area (mAU}\cdot\text{mL)}}{1000 \times \varepsilon_{1\text{ mg/mL}} \times \text{path (cm)}}$.
*   **Step-Aware Extinction Coefficient:** When a protein sequence and tag are provided, steps up to protease cleavage use the tagged form's $A_{280}$ (1 mg/mL) and steps after cleavage use the cleaved form's $A_{280}$ (1 mg/mL). Otherwise, the single $A_{280}$ value set under Peak integration is used.
*   **NanoDrop Override:** When a step's pool or Concentrated step has a measured NanoDrop concentration and volume, that measured mass ($\text{conc} \times \text{vol}$) is used for the step and scales the step's integrated peak mg estimates.
*   **mAU Traces:** `AU` traces are automatically converted to `mAU`.
*   **Time to Volume Conversion:** Runs recorded in minutes are converted to mL using the run's flow rate (read from the file or entered under Run conditions). Without a flow rate, no UV mg is reported.
*   **A280 Wavelength:** Only 280 nm UV curves report protein mass; other wavelengths report area only.
*   **UV Path Length:** Read automatically from UNICORN 7 `.zip` archives when present; otherwise defaults to `2 mm` (standard ÄKTA pure/start flow cell) and is noted as assumed unless set on the run card (e.g., `10 mm` for HPLC).
*   **Integration Scope:** Peak and pool areas always integrate the raw recorded trace over the full run using the selected integration baseline (**Valley to valley** or **Zero (0 mAU)**), with peaks resolved either by multi-Gaussian deconvolution (default) or boundary trapezoids. Display smoothing, figure baseline drift removal, and plot zooming change only the drawn curve, never the integrated areas or mg yields.
*   **Pool Volume Calculation:** Sums pooled fraction segments from start to end markers, capping the final fraction at the logged end of fractionation (or one median fraction width) and capping fractions before tube-number gaps exceeding $1.5\times$ the median width.

## Gel measurements

*   **Auto Crop & Lane Tracking:** Automatically trims to the stained lanes between the wells and dye front, fits the lane grid across vertical segments to follow tilted or fanning lanes, and extracts background-corrected vertical profiles (rolling-minimum opening).
*   **Molecular Weight Estimation:** Matches detected ladder bands to the selected preset (or manual clicks) and interpolates sample band sizes piecewise-linearly in $\log_{10}(\text{kDa})$. Calibration requires finite marks at distinct positions with sizes decreasing top to bottom.
*   **Band Tagging & Purity:** Supports two purity denominators (**All stain in the lane** between the top 3% and bottom 2% margins, or **Target plus marked contaminants**). When no bands are manually marked, purity is estimated from bands within $\pm 8\%$ of the expected protein mass for that step. Removing a band removes its area from the lane denominator.
*   **Molar Cleavage & Expression:** Cleavage efficiency (%) is calculated on a molar basis ($\text{area} / \text{MW}$ of cleaved vs. uncleaved bands). Expression gels with `U`, `I`, `S`, and `P` lanes quantify expression level (% of induced lane) and solubility (% in `S` vs. `S + P`).
*   **Known Contaminants:** Optional size-matching against common *E. coli* IMAC co-purifiers (Bolanos-Garcia & Davies 2006) and purification additives (off by default; only plausible step contexts within the calibrated ladder range are flagged as `size ≈ Name`).
*   **Display vs. Measurement:** Dark/light contrast sliders and color settings affect the displayed image only; densitometry always reads the underlying grayscale intensities (inverted only when **Invert** is checked for light-on-dark gels).

## Import and SEC calibration

*   **SEC "Read peaks":** Once **"Size peaks with calibration standards"** is enabled, clicking **"Read peaks"** skips unticked standards, takes detected peaks in elution order within any entered $V_0 / V_t$ limits, and asks you to confirm the proposed assignment before applying it. If there are fewer peaks than standards, leftover low-MW standards are listed and their volumes are cleared so a fit never mixes two runs.
*   **Column Presets:** Superdex 75 and 200 Increase 10/300 GL (24 mL), Superose 6 Increase 10/300 GL (24 mL), Superdex 75 and 200 Increase 5/150 GL (3 mL, [Cytiva specifications](https://www.cytivalifesciences.co.jp/catalog/0063.html)), and HiLoad 16/600 (120 mL) and 26/600 (320 mL) columns are recognized by name.
*   **Decimal & Delimiter Handling:** Tab-delimited UNICORN files and pasted tables support decimal commas. NanoDrop imports treat a lone comma as a decimal point (`0,123` $\rightarrow$ `0.123`) unless followed by three digits after a nonzero number (`1,234` $\rightarrow$ `1234`). Timestamps and row positions distinguish replicates during duplicate checks.

## Storage and Backups

*   **Browser Storage:** Saves figure preferences, SEC calibrations, and custom contaminant lists in `localStorage` (`hplc-fig-opt`), and saves projects automatically in `IndexedDB` (`hfb-projects`).
*   **Host Integration:** Uses cloud database and asset storage when hosted in an environment providing `window.claude`.
*   **Project Backups:** Export and import complete projects as `.json` files via **"Export file"** and **"Open file"**.

## External Libraries and Network Dependencies

*   **Fonts:** Instrument Sans from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`).
*   **TIFF Gel Support:** `pako` 2.1.0 (`cdnjs.cloudflare.com`) and `UTIF` 3.1.0 (`cdn.jsdelivr.net`), loaded on demand only when a TIFF image is opened.
*   **PDB Structures:** Structure files fetched on demand from RCSB Protein Data Bank (`files.rcsb.org/download/`) when a PDB code is loaded.

## Repository Layout

*   `hplc-figure-bench(WF1.13).html`: Single-file web application (HTML, CSS, and JavaScript).
*   `README.md`: User-facing documentation.
*   `AGENTS.md` / `CLAUDE.md`: Shared instructions and rules for coding agents.
*   `.github/workflows/`: GitHub Actions for automated browser tests and PR reviews.
*   `tests/`: Automated Playwright browser test suite and synthetic test datasets.