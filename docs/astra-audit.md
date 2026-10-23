# Astra audit

> **Coordinator review (2026-10-23).** Spot-checked against `main`: findings 9, 10, 12, 13 and 14 are confirmed in the code exactly as described, and the others are consistent with it. Finding 5's Superdex 75 5/150 case is already fixed in #36 (its own `s75i5` preset, 3 mL), so its issue covers the remaining cases (3.2/300, 26/600 and similar). Issues marked "Needs owner OK" change a scientific number and wait for the owner before an agent picks them up.

## Summary

Reviewed `hplc-figure-bench(WF1.13).html` on `main`, commit `d0adb149abe7c33f8e2e5fa4fb67eaf271b489bd`, on 23 October 2026. The downloaded app, CODEMAP, AGENTS.md and three existing audits match the supplied ZIP byte for byte. Locations below refer to that HTML file; line numbers are approximate. [Reviewed source](https://github.com/patasherry/hplc-figure-bench/blob/d0adb149abe7c33f8e2e5fa4fb67eaf271b489bd/hplc-figure-bench%28WF1.13%29.html).

The app was not modified. Existing suites `22_protein.js` and `26_sec_calibration.js` passed 38/38 and 15/15 checks using Chromium. Additional probes used only the UI, DOM, downloads and synthetic inputs, including synthetic project files imported through the project picker. No real laboratory data were used. The full suite and branch comparison were not run.

| Number | Finding | Area | Severity | Needs owner OK | Confidence |
|---|---|---|---|---|---|
| 1 | Generic chromatograms can label AU as mAU and volume as time | Import / publication | High | yes | High |
| 2 | A tagged sample silently uses the untagged coefficient when its tag sequence is missing | Protein / mass | High | yes | High |
| 3 | Mole-based NanoDrop yields ignore manual starting amounts and measured transfers | Summary | High | yes | High |
| 4 | GenBank fallback translation ignores reading frame and alternative initiation | Protein / GenBank | High | yes | High |
| 5 | Column guessing assigns the wrong SEC geometry or resin | SEC / Methods | High | yes | High |
| 6 | Final workflow yield ignores a measured final manual step | Summary / Methods | High | yes | High |
| 7 | The His-tag preset gives inconsistent cleavage-product mass, pI and A280 | Protein | High | yes | High |
| 8 | Methods combines a NanoDrop mass with the wrong volume | Methods | High | yes | High |
| 9 | SEC extrapolation is partly unmarked and its qualification disappears downstream | SEC | Medium | yes | High |
| 10 | Unknown residues receive invented masses and precise-looking properties | Protein | Medium | yes | High |
| 11 | A205 instrument concentrations are described as sequence-based A280 measurements | Methods | Medium | no | High |
| 12 | Measured manual steps render as undefined NanoDrop rows | Summary | Medium | no | High |
| 13 | Adding a cleavage step asserts dialysis without supporting details | Methods | Medium | no | High |
| 14 | Derived gel text falls below a 5 pt publication minimum | Publication | Low | no | High |

Checks that did not justify another finding:

- `secFit` implements `Kav = (Ve − V0)/(Vt − V0)` and ordinary least squares of `log10(kDa)` against Kav correctly. A fixed affine change from Ve to Kav leaves the fitted mass predictions unchanged. The default `V0 = 0.36 × Vt` is explicitly identified as an estimate; it is not a measured void volume. Column identity and extrapolation problems are covered below.
- Sequence masses use average residue masses plus terminal water, not monoisotopic masses. The W/Tyr values are 5500/1490, and the Protein table explicitly declares reduced cysteines. Omitting the 125-per-cystine contribution under that declared assumption is valid. The pI implementation uses the stated Bjellqvist set. [ExPASy method and assumptions](https://web.expasy.org/protparam/protparam-doc.html).
- `mg/kDa` gives µmol and `1000*mg/kDa` gives nmol. The summary's nmol calculation is dimensionally correct; the withdrawn earlier finding is not repeated.
- No contaminant-mass correction is proposed. The UniProt comparison accounted for signal peptides, initiator-Met processing and the code's separate apparent masses. For example, YodA/ZinT's mature-chain mass is approximately 22.34 kDa, consistent with 22.3, rather than its 24.762 kDa precursor. [UniProt P76344](https://www.uniprot.org/uniprotkb/P76344/entry). Bio-Rad and Thermo reference comparisons did not establish a new material error. The NEB array corresponds to legacy P7712; NEB explicitly distinguishes its replacement P7719, so I have not called the legacy values intrinsically wrong. [Bio-Rad standards](https://www.bio-rad.com/sites/default/files/webroot/web/pdf/lsr/literature/Bulletin_3092.pdf), [Thermo PageRuler sheets](https://documents.thermofisher.com/TFS-Assets/LSG/manuals/MAN0011772_PgRuler_Prestain_Protein_Lad_UG.pdf), [NEB product distinction](https://www.neb.com/en-nz/faqs/how-does-the-new-color-prestained-protein-standard-broad-range-differ-from-nebs-previous-color-prestained-protein-standard).
- At 600 dpi, the three journal presets produced PNGs of 2100×1560, 3000×1920 and 4200×2040 pixels, with `pHYs = 23622 pixels/metre` (599.9988 dpi). Exported SVG retained text elements. Normal axes and traces use point-based geometry; finding 14 concerns smaller derived text. Palette inspection alone was not used to claim a demonstrated colour-vision failure.

## Findings

### 1. Generic chromatograms can label AU as mAU and volume as time

**Location:** `makeTrace` (~1548), `addParsed` (~5004), `buildSVG` (~2043), and `DEF.xlabel`/`DEF.ylabel` (~1281).

**Trigger:** Import a two-column CSV headed `Volume (mL),Absorbance (AU)`. A synthetic Gaussian with its maximum at 5 mL and height 1 AU reproduces this with default settings.

**Observed:** The exported figure labels the horizontal axis `Retention time (min)` and the vertical axis `Absorbance (mAU)`. Its peak is at 5.00 and height 1.0 on that mAU axis. Source column names are retained in `t.cols`, but the figure titles stay at their defaults and generic-trace processing does not convert AU to mAU.

**Expected:** A peak at 5 mL and 1 AU, or equivalently 1000 mAU, with matching axis titles. Preserve an explicitly edited title.

**Check:** Loaded the CSV through the file picker and downloaded SVG. Its text was `Retention time (min)` and `Absorbance (mAU)`, with a 0–1.2 vertical scale. The factor of 1000 follows from the milli prefix. [NIST prefix definitions](https://www.nist.gov/pml/owm/metric-si-prefixes).

**Suggested fix:** Derive default labels from the selected source columns and retain their units. If normalizing AU to mAU, convert the data and label together, once. Do not infer time for a point-number or volume column.

**Risk:** Existing projects can contain deliberately edited labels; distinguish those from defaults. **Needs owner OK** for any numerical unit normalization. Confidence: **High**.

### 2. Missing tag sequences silently select the untagged coefficient

**Location:** `protForms` (~5134), `ndEpsFor` (~5347), and `TAG_SEQ` (~5036).

**Trigger:** Enter an untagged protein sequence, select GST, MBP, His-MBP, Trx or GFP, leave the tag sequence empty, and measure a run whose form is Tagged. Only His and SUMO have built-in sequences.

**Observed:** `protForms` returns only the untagged form. `ndEpsFor` then falls back to `F[0]` even for a tagged run. This supplies the untagged mass and coefficient to NanoDrop conversion, UV-area mass and mole-based yield calculations. An explicitly entered manual coefficient can also be bypassed by this return.

**Expected:** A tagged calculation must use the actual fusion sequence or an explicitly supplied applicable coefficient/mass. Missing tag composition cannot justify silently using the untagged sequence.

**Check:** With target `M` followed by ten `AWY` repeats, GST selected and no GST sequence, an A280 of 1 produced approximately 0.0623 mg/mL using the untagged coefficient 16.0546. The tag's contributions to mass, W and Tyr are absent. ExPASy's calculation is compositional and applies to the sequence actually measured. [ExPASy documentation](https://web.expasy.org/protparam/protparam-doc.html).

**Suggested fix:** Require the selected form to exist before using its sequence-derived properties. Otherwise use a clearly applicable manual value, or withhold the dependent estimate with a reason. Apply this consistently to both concentration and mass-to-moles conversion.

**Risk:** Some existing tagged estimates will become unavailable until missing inputs are supplied. **Needs owner OK.** Confidence: **High**.

### 3. Mole-based yields ignore manual starting amounts and measured transfers

**Location:** `sumRows` (~4771–4789), especially the manual-start conversion, `out.toAmt`, and `kept`; `sumDisplay` (~4792).

**Trigger:** Every chromatographic step has NanoDrop mass and a known molecular weight, selecting basis `umol`. Include a measured manual starting step or a measured concentration/buffer-exchange transfer between columns.

**Observed:** Conversion branches support `mg`, `nd`, `mgmol` and `ndmol`, but omit `umol`. Manual and transfer rows have blank yields, the starting manual amount cannot establish the yield baseline, and the next column compares with the preceding column pool instead of its measured load.

**Expected and worked check:** For the same 50 kDa protein throughout, use 20 mg starting material, 10 mg after column 1, 5 mg after concentration, and 4 mg after column 2. These are 0.4, 0.2, 0.1 and 0.08 µmol. Cumulative yields should be 100%, 50%, 25%, 20%; concentration recovery 50%; column-2 recovery 80%. The UI instead displayed column yields 100% and 40%, column-2 step recovery 40%, and blank manual/transfer yields.

**Suggested fix:** Include `umol` in every mg-to-amount conversion, using `mg/kDa`. Reuse that conversion for the initial baseline, transfer amounts and displayed manual rows. Preserve the correct nmol display factor.

**Risk:** Changes recovery percentages and flags; preserve the correct protein form on each side of cleavage. **Needs owner OK.** Source: the dimensional conversion and worked mass balance above. Confidence: **High**.

### 4. GenBank fallback translation ignores reading frame and alternative initiation

**Location:** `parseGenBank` (~3768–3787), `gbCassette` (~3792–3794), and `translateNt` (~3767).

**Trigger:** A CDS has no `/translation`, so the app translates nucleotides itself. Examples are a partial CDS with `/codon_start=2`, or a complete bacterial CDS beginning GTG with `/transl_table=11`.

**Observed:** Qualifiers are parsed into `f.q` but the returned feature drops the translation metadata. Fallback translation starts at the first extracted nucleotide and applies the internal codon table uniformly, including to the first codon.

**Expected:** Honour the CDS offset and supported translation-table initiation rules; preserve partial-CDS semantics. An authoritative `/translation` should remain authoritative. Unsupported translation metadata should not silently produce a confident sequence.

**Check:** Imported a synthetic `<1..97` CDS with `/codon_start=2` and nucleotides `G + ATG + (GCT TGG TAT)×10 + TAA`. The intended translation is `M + (AWY)×10`, 31 residues. The UI instead adopted `DGLVCLVCLVCLVCLVCLVCLVCLVCLVCLVL`, 32 residues, and reported no aromatic absorbance. A second complete table-11 CDS beginning GTG became `V + (AWY)×10`; NCBI specifies initiator methionine. [NCBI codon_start rules](https://www.ncbi.nlm.nih.gov/genbank/feature_table/), [NCBI genetic codes and initiation](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi#SG11).

**Suggested fix:** Retain the necessary qualifiers, offset the oriented CDS before translation, and distinguish initiation from internal codons. Keep biological removal of an initiator Met separate; sequence alone does not establish that processing occurred.

**Risk:** Changes adopted sequence, mass, pI and extinction estimates. **Needs owner OK.** Confidence: **High**.

### 5. Column guessing assigns the wrong SEC geometry or resin

**Location:** `SEC_COLUMNS`/`SEC_ORDER` (~1777–1788), `secColumnGuess` (~1788), and `guessColumn` (~4030).

**Trigger:** A run name identifies `Superdex 200 Increase 3.2/300`. Other direct code examples include `Superdex 75 Increase 5/150 GL`, which matches the dimension-only S200 5/150 rule first, and Superdex 75 26/600, which matches the S200 26/600 rule.

**Observed:** The 3.2/300 case selects Superdex 200 Increase **10/300**, installs Vt 24 mL and estimated V0 8.64 mL, and names the wrong column in Methods. The actual 3.2/300 bed is 2.4 mL. The generic dimension patterns also replace resin identities.

**Expected:** Preserve the identified column. If that exact geometry/resin is unsupported, use Other column and leave its volumes unset. A generic resin match must not override explicit dimensions.

**Check:** Imported the synthetic named run: the SEC controls read `s200i`, `24`, `8.64`, and Methods named 10/300. Cytiva lists 3.2/300 as 2.4 mL, 5/150 as 3 mL, and 10/300 as 24 mL; it also distinguishes the S75 and S200 fractionation ranges. [Cytiva selection guide](https://cdn.cytivalifesciences.com.cn/api/public/content/digi-13947-pdf), [Cytiva 3.2/300 instructions](https://d3.cytivalifesciences.com/prod/IFU/29027272.pdf).

**Suggested fix:** Match resin and dimensions together, otherwise fall back to custom. Do not solve this by adding another broad dimension-only rule. Keep exact logged identities ahead of guesses.

**Risk:** Changes default calibration geometry, Kav and void classification, and Methods identities. **Needs owner OK.** Confidence: **High**.

### 6. Final yield ignores a measured final manual step

**Location:** `finalYield` (~3593–3600), `yieldLine` (~3602), and the Results portion of `methodsText` (~4145–4150).

**Trigger:** Place a measured manual concentration, dialysis or buffer-exchange step after the last chromatographic run. Leave the separate Final sample concentration/volume fields empty.

**Observed:** `finalYield` selects from `sumRows()`, which contains chromatographic runs only. The final manual measurement is printed in Results but does not become the final workflow amount. The caption still identifies the preceding chromatographic pool as final.

**Expected:** Distinguish the last chromatographic pool from the measured material remaining after the final workflow operation. The final workflow amount should use the latter; purity should not be transferred to it without supporting evidence.

**Check:** A synthetic chromatographic pool contained 0.8753 mg. A following manual buffer exchange recorded 0.50 mg/mL in 1 mL. The table showed 0.50 mg, and Results said that amount remained after exchange, then said the final pool held 0.88 mg. The enabled workflow yield caption also reported 0.88 mg. The final operation retained 0.50 mg, approximately 57% of the preceding pool.

**Suggested fix:** Resolve the final measured state in workflow order, including manual steps, and carry its amount, volume and provenance into the final caption and Results. Keep the earlier pool's quantity available under its own step.

**Risk:** Changes reported final yield and its per-culture quantities; missing manual measurements must not imply zero recovery. **Needs owner OK.** Source: the worked mass balance above. Confidence: **High**.

### 7. The His-tag preset disagrees about the cleavage product

**Location:** `TAG_SEQ.his` (~5036), `protForms` (~5134), `splitOrf` (~3809–3819), `constructModel` (~3838), and `ndEpsFor` (~5347).

**Trigger:** Select His-tag (thrombin site) for an N-terminal fusion and enter the untagged target sequence. The preset is `MGSSHHHHHHSSGLVPRGSH`.

**Observed:** `splitOrf` correctly cleaves at `LVPR|GSH`, so the construct figure includes GSH on the product. `protForms` treats the entire preset as removed and uses the bare target for the untagged mass, pI and coefficient. NanoDrop uses those bare-target properties after cleavage.

**Expected:** All post-cleavage calculations should use the same actual product, `GSH + target`, for this preset. The free fragment should end at the cleavage bond.

**Check:** Target `M + (AWY)×10` gave 31 residues, 4.4 kDa, pI 5.27 and coefficient 16.05 in the Protein table. The construct figure gave 34 residues, 4.6 kDa, pI about 6.7 and coefficient 15.08 after cleavage. Worked average masses are 4353.88784 and 4635.15904 Da, a 281.27120 Da remnant. Using 16.0546 instead of 15.0804 underestimates the product concentration by approximately 6.1%. Thrombin cleavage between R and G is documented experimentally. [Cleavage reference](https://pmc.ncbi.nlm.nih.gov/articles/PMC3557595/), [ExPASy coefficient method](https://web.expasy.org/protparam/protparam-doc.html).

**Suggested fix:** Derive fusion, cleavage product and released fragment consistently at the cleavage bond. Avoid adding the remnant twice when rebuilding the fusion.

**Risk:** Changes MW, pI, coefficients, mole counts and gel/SEC expectations for affected constructs. Constrain automatic cleavage assumptions to supported contexts. **Needs owner OK.** Confidence: **High**.

### 8. Methods combines a measured mass with the wrong volume

**Location:** `ndForRun` (~5369–5376), `finalYield` (~3593), and `methodsText` (~4145–4148).

**Trigger:** Override NanoDrop pool volume with `ndVol`, different from the pooled chromatogram interval. Use that NanoDrop mass as the summary basis.

**Observed:** `ndForRun` correctly calculates the mass with `pv`, but Methods selects `pr.vol` unless there is a final-stage `fv`. It then divides the NanoDrop mass by the chromatographic interval volume.

**Expected and check:** With a 3 mL chromatographic interval, NanoDrop concentration 4 mg/mL and entered measured pool volume 1 mL, mass is 4 mg. The UI-derived Methods instead said `4.00 mg in 3.0 mL (1.33 mg/mL)`. It should use the measured 1 mL and 4 mg/mL, or separately identify the original interval and measured sample volumes.

**Suggested fix:** Carry the effective volume used for each mass estimate alongside its source. Construct the sentence from that matched mass/volume/concentration tuple, rather than independently choosing the volume.

**Risk:** Changes generated numerical prose; avoid replacing original fraction-collection volume elsewhere. **Needs owner OK.** Source: `4 mg/mL × 1 mL = 4 mg`. Confidence: **High**.

### 9. SEC extrapolation qualifications are lost

**Location:** `secInfo` (~1829–1835), `sumRows` (~4768), `renderSumTable` (~4822), and `buildCalSVG` (~2435–2458).

**Trigger:** A sample lies outside the standards' elution interval. One case is 100 kDa at 14 mL and 10 kDa at 18 mL, with a sample at 12 mL. Another is standards at 12.2 and 18.2 mL, sample at 12 mL.

**Observed:** `secInfo` allows an 8% extension of the standards' interval before setting `extrap`. The second case is therefore unmarked. In the first case the peak table correctly shows `~316`, but `sumRows` retains only `{mw, ve}` and the summary note says `apparent 316 kDa (6.3× the 50 kDa monomer)` without identifying extrapolation. Calibration-figure sample labels also omit that qualification.

**Expected:** Every prediction outside the actual standards interval should remain identified as extrapolated wherever it is displayed or exported. Apparent-size and shape cautions do not communicate that the calibration was extrapolated.

**Check:** Both cases were imported through the UI. For the first, `log10(M) = 5.5 − 0.25 Ve`; at 12 mL, M = 316.23 kDa. For the second, the UI printed 108 without `~` despite Ve being outside 12.2–18.2. The code's range padding and downstream object truncation explain both results. Cytiva describes the finite selectivity/fractionation range of SEC. [Cytiva selection guide](https://cdn.cytivalifesciences.com.cn/api/public/content/digi-13947-pdf).

**Suggested fix:** Use the actual standard interval for the extrapolation flag and preserve that flag through the summary and calibration plot. Retain numerical predictions only with explicit qualification.

**Risk:** Changes the scientific qualification threshold and exported labels. **Needs owner OK** for removing the 8% allowance. Confidence: **High**.

### 10. Unknown residues receive invented masses and precise properties

**Location:** `cleanSeq` (~5038), `seqMass` (~5039), `seqA280` (~5040), `seqPI` (~5043), and their consumers.

**Trigger:** Paste an unresolved sequence such as `M + X×30 + W`. `cleanSeq` preserves X, B, Z and other alphabetic characters absent from `AA_MASS`.

**Observed:** `seqMass` adds an undocumented 110 Da for every unknown letter. Unknown residues contribute nothing to W/Tyr counts or titratable groups. The UI displays a normal mass, pI and coefficient, and offers to apply them to downstream estimates.

**Expected:** Unresolved composition should make affected properties unavailable or explicitly uncertain. It cannot support an ordinary sequence-specific mass, pI and A280 coefficient. No replacement exact value is justified from X alone.

**Check:** The UI displayed 3.6 kDa, pI 5.27, ε280 5500 and coefficient 1.513 for the synthetic sequence. Its assigned mass is `18.01524 + 131.1926 + 30×110 + 186.2132 = 3635.42104 Da`. The arbitrary term comes directly from `AA_MASS[c] ?? 110`; unresolved residues could themselves be aromatic or ionizable. [ExPASy's compositional basis](https://web.expasy.org/protparam/protparam-doc.html).

**Suggested fix:** Validate against the supported residue table before calculation and block dependent exact estimates for unresolved composition. Preserve explicitly supported U/O handling; do not silently delete unknown residues.

**Risk:** Existing approximate outputs become unavailable until sequence ambiguity is resolved. **Needs owner OK.** Confidence: **High**.

### 11. A205 concentrations are described as sequence-based A280 measurements

**Location:** `ndConcRaw` (~5355–5362), `ndEpsUsed` (~5353), and Results in `methodsText` (~4148).

**Trigger:** Associate an A205 NanoDrop export with a run, provide a measured volume, and have that instrument concentration supply the summary mass. A sequence coefficient or manual A280 coefficient is available elsewhere in the project.

**Observed:** `ndConcRaw` correctly returns the instrument concentration with source `A205, instrument`. The final Results sentence ignores this provenance, says `by NanoDrop A280`, and appends the available A280 coefficient as if it had been used.

**Expected:** Describe the actual A205 instrument result and its volume. Mention an A280 coefficient only for a conversion that actually used it.

**Check:** A synthetic A205 reading of 4 mg/mL in 1 mL produced 4 mg, then Methods stated `by NanoDrop A280 (A280 of 1.00 for 1 mg/mL of the protein)`. The A205 branch never consulted that coefficient.

**Suggested fix:** Carry the effective concentration source into final Results and use the existing coefficient-used logic where applicable. Handle instrument-only and labelled-protein values on the same evidential basis.

**Risk:** Wording changes; calculated quantities should remain unchanged. No scientific constant changes. Confidence: **High**.

### 12. Measured manual steps render as undefined NanoDrop rows

**Location:** `sumDisplay` (~4795) and `renderSumTable` (~4807).

**Trigger:** A manual step has a positive concentration and volume, such as a named buffer-exchange step at 0.5 mg/mL in 1 mL.

**Observed:** Manual display rows contain `conc: 0.5`. The renderer tests `d.conc` before `d.man`, treating the numeric concentration as the transfer-row discriminator. That branch expects `d.name` and `d.mgml`, which the manual row lacks. The step name becomes `undefined`, and its Pool column says `NanoDrop` regardless of recorded measurement provenance.

**Expected:** The row should retain the manual step's name and appropriate manual-step cells, including its 0.50 mg quantity.

**Check:** Imported a synthetic `Final buffer exchange` step with those inputs. The summary row began `undefined | NanoDrop | 1.0 | … | 0.50`; the same problem occurred for a measured manual starting step.

**Suggested fix:** Render `d.man` before testing the transfer discriminator, or give the transfer branch an unambiguous check such as `!d.man && d.conc`. No calculation change is needed.

**Risk:** Check row cell counts with optional NanoDrop, mole and culture-yield columns enabled. No owner approval required. Confidence: **High**.

### 13. A cleavage step asserts dialysis without supporting details

**Location:** Cleavage branch of `methodsText` (~4115–4117).

**Trigger:** Add a cleavage step, enter TEV as protease, and leave dialysis buffer and other dialysis details empty. In-pool protease treatment is a real possible situation.

**Observed:** The branch chooses the literal word `dialyzed` even when `dialBuffer` is absent. The generated sentence is `the pool was dialyzed with TEV`. No missing-dialysis marker appears.

**Expected:** State the recorded protease treatment and leave unrecorded dialysis unstated or explicitly marked as missing. The existence of a cleavage step does not establish that dialysis happened.

**Check:** Reproduced through a synthetic project and the Methods UI. The false assertion comes from `bf ? ... : 'dialyzed'`, not from any entered method description.

**Suggested fix:** Make dialysis wording conditional on recorded dialysis evidence. For a protease-only entry, describe treatment with that protease; preserve existing time, temperature and ratio handling.

**Risk:** Generated wording changes for incomplete cleavage steps. No numerical or constant change. Confidence: **High**.

### 14. Derived gel text falls below a 5 pt publication minimum

**Location:** `gelPart` (~3240–3243, ~3271 and ~3330), and `svgHead` (~1403).

**Trigger:** Use the default 8 pt journal font with band-size labels, or display a matching known protein using inline labels. Narrow vertical lane labels can shrink further.

**Observed:** Band labels use `max(4, fs*0.62)`, giving 4.96 pt at fs=8. Inline known-protein labels use `max(4, fs*0.58)`, giving 4.64 pt. Vertical labels can reach `fs*0.35 = 2.8 pt`. The 8 pt figure setting does not act as a minimum for these derived labels.

**Expected:** For a journal export targeting a 5 pt minimum, derived labels should respect that minimum or the layout must provide enough space. This is a specific publication constraint, not a universal claim about every journal.

**Check:** Worked the exact branches above. SVG uses physical inches and a 72-units-per-inch viewBox, so these are physical point sizes. At 600 dpi, 4.64 pt becomes approximately 38.7 pixels, retaining the same small printed size. Nature's figure guide specifies a 5 pt minimum. [Nature figure specifications](https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/).

**Suggested fix:** Apply a publication minimum to these derived labels and accommodate their resulting extents. Keep ordinary text as SVG text and preserve point-based stroke widths.

**Risk:** Larger labels can collide or extend beyond panels; test crowded gels after the clamp. No scientific-number change. Confidence: **High**.

## Ready-to-file issues

### Preserve source units on generic chromatogram figures

In `hplc-figure-bench(WF1.13).html`, update `makeTrace`, `addParsed`, `buildSVG` and default-title handling (~1548, ~5004, ~2043). A generic CSV headed `Volume (mL),Absorbance (AU)` currently exports a time/minute axis and calls a 1 AU peak 1 mAU. Preserve declared source units in default titles, or convert values and units together exactly once; retain explicit user titles and saved-project compatibility. Add a UI-only synthetic CSV check to `tests/suites/10_data_truth.js` asserting a peak at 5 mL and 1 AU, or 1000 mAU, with matching exported titles. It must fail on current main and pass after the fix. Needs owner OK for numerical normalization; source: [NIST metric-prefix definitions](https://www.nist.gov/pml/owm/metric-si-prefixes). Follow AGENTS.md.

### Require applicable fusion properties for tagged samples

Fix `protForms` and `ndEpsFor` (~5134, ~5347) in `hplc-figure-bench(WF1.13).html`. Selecting GST or another preset without a sequence must not cause Tagged runs to use `F[0]` untagged mass/coefficient. Use an applicable explicit manual value or withhold dependent estimates until composition is supplied. Add a UI-only synthetic check to `tests/suites/22_protein.js`: target `M+(AWY)×10`, GST selected, empty tag sequence, tagged sample with A280=1. Assert that the untagged 16.0546 coefficient is not silently used for that fusion; then enter a synthetic tag sequence and verify the fusion result by independent composition arithmetic. Needs owner OK; source: [ExPASy ProtParam documentation](https://web.expasy.org/protparam/protparam-doc.html). Follow AGENTS.md.

### Include manual and transfer amounts in micromole yield calculations

Fix `sumRows`' manual-start conversion, `out.toAmt`, `kept`, and related `sumDisplay` use (~4771–4799) in `hplc-figure-bench(WF1.13).html`. Add the missing `umol` conversion using mg/kDa. Add a UI-only synthetic check to `tests/suites/20_science.js` with a 50 kDa protein, 20 mg manual start, NanoDrop pools of 10 and 4 mg, and a 5 mg measured transfer between them. Verify cumulative 100/50/25/20%, concentration recovery 50%, and second-column recovery 80%; current main gives 100/40% for the columns and omits manual/transfer yields. Preserve the correct nmol display factor. Needs owner OK; source: worked dimensional mass balance. Follow AGENTS.md.

### Honour CDS reading-frame and initiation metadata in fallback translation

Fix `parseGenBank`, `gbCassette` and `translateNt` (~3767–3794) in `hplc-figure-bench(WF1.13).html`. Preserve and honour `/codon_start` and applicable translation/initiation metadata when `/translation` is absent. Keep explicit translations authoritative, and avoid silently translating unsupported codes. Add UI-only synthetic GenBank checks to `tests/suites/22_protein.js`: `<1..97`, `/codon_start=2`, sequence `G+ATG+(GCTTGGTAT)×10+TAA` must yield `M+(AWY)×10`; a complete table-11 CDS beginning GTG must start with M. Include a partial-CDS control so initiation rules do not overwrite a genuine partial first residue. Needs owner OK; sources: [NCBI feature-table rules](https://www.ncbi.nlm.nih.gov/genbank/feature_table/) and [Genetic Codes table 11](https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi#SG11). Follow AGENTS.md.

### Stop SEC column guesses from overriding explicit dimensions and resin

Fix `SEC_COLUMNS`, `SEC_ORDER`, `secColumnGuess` and `guessColumn` (~1777–1788, ~4030) in `hplc-figure-bench(WF1.13).html`. A 3.2/300 S200 run must not become 10/300 with Vt=24 mL, and a 26/600 S75 must not become S200 through a dimension-only rule (the S75 5/150 case is fixed in #36; build on it). Match exact resin/dimensions or fall back to Other column with unset volumes; retain exact logged identity in Methods. Add UI-only synthetic named-run checks to `tests/suites/26_sec_calibration.js` for these cases and a supported 10/300 control. Assert controls, void classification and Methods identity. Needs owner OK; sources: [Cytiva SEC selection guide](https://cdn.cytivalifesciences.com.cn/api/public/content/digi-13947-pdf) and [Superdex 200 Increase 3.2/300 IFU](https://d3.cytivalifesciences.com/prod/IFU/29027272.pdf), which gives 2.4 mL. Follow AGENTS.md.

### Use the last measured workflow state for final yield

Fix `finalYield`, `yieldLine` and final Results generation (~3593–3613, ~4145–4150) in `hplc-figure-bench(WF1.13).html`. Include measured final manual operations when resolving the material remaining at workflow end, while keeping the preceding chromatographic pool distinct. Add a UI-only synthetic check to `tests/suites/20_science.js`: chromatographic pool 0.8753 mg followed by manual buffer exchange at 0.5 mg/mL in 1 mL, with separate Final sample fields empty. The final workflow amount must be 0.50 mg, not 0.88 mg; do not transfer unverified purity. Check Methods and the enabled yield caption. Needs owner OK; source: worked mass balance. Follow AGENTS.md.

### Use the actual thrombin cleavage product across protein calculations

Fix the inconsistency between `TAG_SEQ.his`, `protForms`, `splitOrf`, `constructModel` and `ndEpsFor` (~5036, ~5134, ~3809, ~3838, ~5347) in `hplc-figure-bench(WF1.13).html`. The preset `MGSSHHHHHHSSGLVPRGSH` cleaves at R|G, leaving GSH on the target. Derive fusion, product and free fragment consistently without duplicating the remnant. Add a UI-only synthetic check to `tests/suites/22_protein.js` with target `M+(AWY)×10`. Compare the table, construct figure and post-cleavage NanoDrop conversion with the 34-residue product: 4635.15904 Da and coefficient 15.0803887. Current main uses the bare target in downstream calculations. Needs owner OK; sources: [documented thrombin R|G cleavage](https://pmc.ncbi.nlm.nih.gov/articles/PMC3557595/) and [ExPASy composition calculations](https://web.expasy.org/protparam/protparam-doc.html). Follow AGENTS.md.

### Keep mass and measured volume paired in Methods

Fix `ndForRun`, `finalYield` and `methodsText` (~5369–5376, ~3593, ~4145–4148) in `hplc-figure-bench(WF1.13).html` so final numerical prose uses the volume that actually produced the selected mass. Add a UI-only synthetic check to `tests/suites/20_science.js`: chromatographic interval 3 mL, NanoDrop pool reading 4 mg/mL, measured pool volume override 1 mL. Methods must state 4 mg in 1 mL at 4 mg/mL, rather than 4 mg in 3 mL at 1.33 mg/mL. Preserve the original collection volume where it describes fraction collection. Needs owner OK; source: concentration×volume arithmetic. Follow AGENTS.md.

### Preserve SEC extrapolation qualifications in every output

Fix `secInfo`, the SEC summary object in `sumRows`, `renderSumTable` and `buildCalSVG` (~1829–1835, ~4768, ~4822, ~2435–2458) in `hplc-figure-bench(WF1.13).html`. Remove the unmarked 8% extension beyond the standards and carry extrapolation status into summary notes and calibration labels. Add UI-only synthetic checks to `tests/suites/26_sec_calibration.js`: standards 100 kDa/14 mL and 10 kDa/18 mL with a 12 mL sample must qualify 316.23 kDa everywhere; standards at 12.2/18.2 mL must also mark a 12 mL sample as extrapolated. Verify downloaded SVG in `tests/suites/50_export.js` if needed. Needs owner OK for changing the qualification threshold; source: the worked fit and finite calibrated interval. Follow AGENTS.md.

### Reject unsupported exact sequence calculations for unresolved residues

Fix `cleanSeq`, `seqMass` and dependent property/application paths (~5038–5049) in `hplc-figure-bench(WF1.13).html`. Unknown letters currently receive 110 Da and no aromatic or charge contribution. Validate supported composition and prevent these approximate values from being presented or applied as ordinary exact properties; preserve supported U/O residues and do not delete unknowns silently. Add a UI-only synthetic check to `tests/suites/22_protein.js` using `M+X×30+W`: current main displays 3.6 kDa, pI 5.27 and coefficient 1.513 without an ambiguity warning. Assert a clear unresolved-composition state and blocked dependent exact estimates, with a resolved-sequence control. Needs owner OK; source: [ExPASy's compositional calculation basis](https://web.expasy.org/protparam/protparam-doc.html). Follow AGENTS.md.

### Describe A205 concentration provenance accurately in Methods

Fix final Results wording in `methodsText` (~4148), using `ndConcRaw` and actual coefficient-used information (~5353–5362) in `hplc-figure-bench(WF1.13).html`. A205 instrument concentrations must not be called A280 measurements or described as converted using an unused A280 coefficient. Add a UI-only synthetic A205 CSV check to `tests/suites/20_science.js`: link 4 mg/mL to a run with 1 mL measured volume and an available A280 coefficient of 1. Verify 4 mg is retained, Methods identifies A205/instrument provenance, and no unused A280 coefficient is claimed. No numerical change is intended. Follow AGENTS.md.

### Render measured manual steps through the manual-row branch

Fix `sumDisplay` and `renderSumTable` (~4792–4808) in `hplc-figure-bench(WF1.13).html`. A manual row's numeric `conc` currently makes the renderer enter the transfer branch before checking `d.man`. Render manual rows first or use an unambiguous transfer check. Add a UI-only synthetic check to `tests/suites/20_science.js`: a manual step named Final buffer exchange at 0.5 mg/mL in 1 mL must retain its name and 0.50 mg, and must not render `undefined` or invent NanoDrop provenance. Test optional columns for alignment. Follow AGENTS.md.

### Avoid inventing dialysis in cleavage Methods

Fix the cleavage branch in `methodsText` (~4115–4117) in `hplc-figure-bench(WF1.13).html`. It currently falls back to the literal word `dialyzed` when dialysis buffer is empty. State recorded protease treatment, and include dialysis only when supported by entered details or mark the missing information explicitly. Add a UI-only synthetic check to `tests/suites/20_science.js` with TEV entered and dialysis fields empty: Methods must not assert that dialysis occurred. Add a control with entered dialysis buffer that retains the appropriate sentence. Follow AGENTS.md.

### Respect publication minimum sizes for derived gel labels

Fix derived text sizes in `gelPart` (~3240–3243, ~3271, ~3330) in `hplc-figure-bench(WF1.13).html`. At the 8 pt journal setting, band and inline labels can be 4.96 and 4.64 pt, and narrow vertical labels can reach 2.8 pt. Apply a 5 pt minimum for exports targeting that publication constraint and accommodate label extents. Add a UI-only synthetic calibrated-gel check to `tests/suites/40_visual.js` or `50_export.js`, enabling band labels and an inline known-protein match. Inspect inherited/exported SVG text sizes in physical points and verify labels remain inside the figure without collisions. Source: [Nature research figure guide](https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/), 5 pt minimum. No scientific-number change is intended. Follow AGENTS.md.
