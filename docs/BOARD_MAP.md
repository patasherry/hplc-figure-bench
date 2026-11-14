# Map of the project for the Direction board

The board (#222) works through these domains, one per meeting, the one it looked at least recently first. Each meeting gets the domain's entry below and the code of its sections. At the end of a meeting the advisers give each other homework: one research question each, usually outside this repository, answered before the next meeting and read out at its start.

Edit this page freely. A domain is a `## ` heading. The `Code:` line names sections of the app exactly as `docs/CODEMAP.md` does, in backticks. The rest is read as plain text by the advisers. Keep each domain short: every word here goes into every meeting on that domain.

## Instrument files and import
- Covers: reading ÄKTA and UNICORN exports (CSV, the UNICORN 7 .zip), generic HPLC CSVs, quoted and odd CSVs, telling curves and runs apart, loading several files at once.
- Code: `parsing: generic`, `UNICORN 7 result archive (.zip)`, `loading`
- Tests: 11_unicorn_zip, 15_import_sec, 17_cross_format, 18_hplc_load, 1197_quoted_csv, 915_raw_files, 30_robust
- Worth exploring: exports from other instruments and software versions (UNICORN 5 and 6, Agilent, Shimadzu, Waters) and what their columns and headers look like, files with fraction and injection marks, European decimal commas, and very long runs.
- Outside knowledge that helps: published descriptions of UNICORN result formats, instrument manuals, what labs commonly export.

## Chromatogram analysis: peaks, pooling and yield
- Covers: baselines, peak detection and integration, pooled fractions, carry-over between columns, yield through the purification.
- Code: `peak integration`, `traces and runs`, `run conditions: column, buffers, flow, temperature, gradient, load, fractions`
- Tests: 14_peaks, 770_pool_area, 45_yield_semantic, 1022_downstream_allocation, 1023_carryover_semantics, 20_science
- Worth exploring: baseline choices for drifting UV traces, overlapping peaks, how pooled area should relate to fraction volume, mAU against AU and mL against column volumes, yield when a column is loaded twice.
- Outside knowledge that helps: chromatography textbooks and vendor handbooks (Cytiva's Protein Purification Handbook series), how other software integrates peaks.

## Size exclusion: calibration and mass
- Covers: SEC column calibration from standards, Kav, apparent molecular weight and oligomeric state, the SEC figure.
- Code: `run conditions: column, buffers, flow, temperature, gradient, load, fractions`
- Tests: 26_sec_calibration, 27_sec_mass_calculation, 28_sec_figure, test_sec_calibration_units
- Worth exploring: calibration standards for common columns (Superdex 75 and 200, Superose 6), void and total volume, fit quality, non-globular proteins, when apparent mass misleads.
- Outside knowledge that helps: column manuals, published calibration practice, SEC-MALS comparisons.

## SDS-PAGE gels and densitometry
- Covers: gel images, auto crop, lane profiles, band detection, ladder calibration, purity per lane, band tags.
- Code: `gels`, `gel densitometry: lane profiles, bands, ladder calibration`
- Tests: 25_gels, 99_band_overlap, 1324_export_gel, 1330_gel_blob
- Worth exploring: background subtraction methods, saturated bands, smiling gels, stain linearity (Coomassie against stain-free), ladder sets from different vendors, TIFF bit depth.
- Outside knowledge that helps: densitometry guidance in methods papers, ImageJ and Image Lab practice, ladder datasheets.

## Protein and sequence
- Covers: sequence properties (mass, extinction coefficient, pI), tags and their removal, GenBank import, PDB structures.
- Code: `construct and expression panel`
- Tests: 12_genbank, 22_protein, 796_tag_mass, 1007_untagged_default, 1090_construct_sequence_link
- Worth exploring: extinction coefficients with and without cystines, tag cleavage scars, average against monoisotopic mass, GenBank files with several ORFs.
- Outside knowledge that helps: ExPASy ProtParam's method and its published basis (Pace et al. 1995), tag and protease datasheets.

## Upstream: cloning, expression and lysis
- Covers: the cloning workflow (stages, attempts, lineage), construct, transformation, expression, lysis.
- Code: `construct and expression panel`
- Tests: 1402_cloning_engine, 1433_include_cloning, 1436_clone_fold, 1439_clone_join, 1305_selected_clone, 1306_construct_method_specific
- Worth exploring: what a cloning record needs to be reproducible, common failure points between PCR and sequencing, expression conditions worth tracking, how labs record lysis.
- Outside knowledge that helps: NEB protocols (Q5, KLD, HiFi), electronic lab notebook practice, MIQE-style reporting ideas.

## Figures: HPLC overlay, run chart and the workflow figure
- Covers: what the saved figures look like, labels and their collisions, the zoom inset, the composite workflow figure, journal sizes.
- Code: `figure: shared bits`, `figure: HPLC overlay`, `composite: run with gels, and the workflow`
- Tests: 42_figures, 43_zoom_inset, 31_wf_full, 769_workflow_refit, 950_panel_padding, 1187_svg_group, 40_visual
- Worth exploring: journal figure requirements (widths, minimum font size, line weight, colour), colour-blind safety, how readers compare overlaid traces, legend placement.
- Outside knowledge that helps: author guidelines from journals Patrick might publish in, data-visualization research on overlays.

## Methods text and provenance
- Covers: the written Methods paragraph, the gaps it names, where each number came from.
- Code: `run conditions: column, buffers, flow, temperature, gradient, load, fractions`, `the step timeline`
- Tests: 21_methods, 23_provenance, 1089_actionable_methods_gaps, 411_workflow_condition_placeholder
- Worth exploring: what reviewers expect in a purification Methods section, reporting standards, wording that is precise without being long.
- Outside knowledge that helps: published Methods sections from structural biology papers, journal reporting checklists.

## Projects, storage, export and old files
- Covers: projects saved in the browser, export and import of project files, settings, keeping old files loading.
- Code: `projects: a project per purification, saved with the page (db + assets) or in this browser`, `export`, `home`
- Tests: 47_export_project, 50_export, 669_persistence_roundtrip, 48_empty_start
- Worth exploring: browser storage limits with many gel images, what happens when storage is full, sharing a project with a labmate.
- Outside knowledge that helps: IndexedDB quotas in current browsers, file-format versioning practice.

## Concentration and NanoDrop
- Covers: NanoDrop readings, A280, concentration and units through the workflow.
- Code: `NanoDrop: protein A280 readings`
- Tests: 16_nanodrop, test_nanodrop_units
- Worth exploring: NanoDrop export formats and units, 260/280 meaning for protein samples, buffer blanks, concentrator losses.
- Outside knowledge that helps: Thermo NanoDrop documentation, published guidance on A280 accuracy.

## Usability and layout
- Covers: the step timeline, panels and their summaries, the "what to do next" hint, phones and small screens, keyboard use.
- Code: `UI`, `the step timeline`, `collapsible panel sections (remembered), each with a one-line summary when closed`, `what to do next: one suggestion above the figure, with a button that takes you there`
- Tests: 40_visual, 44_panel_more, 41_workflow_drag_hint, 431_ios_look, 1060_sidebar_trace_wrap, 1267_toast_dismiss
- Worth exploring: where a first-time user gets stuck, how scientists move from raw files to a figure, accessibility (contrast, keyboard, screen readers).
- Outside knowledge that helps: usability research on scientific software, WCAG guidance.

## Speed and robustness
- Covers: large files, many runs, slow steps, odd input that should not break the app.
- Code: `loading`, `traces and runs`
- Tests: 60_perf, 30_robust, 10_data_truth
- Worth exploring: the largest realistic UNICORN archive, many gels in one project, older laptops.
- Outside knowledge that helps: browser performance practice for large SVGs and canvases.
