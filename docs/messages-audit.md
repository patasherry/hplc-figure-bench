# Messages Audit

This document lists on-screen messages in `hplc-figure-bench(WF1.13).html` and analyzes them for clarity, accuracy, concise wording, and missing next steps. It also identifies situations where no message is shown to the user but one should be.

---

## On-Screen Messages

| Where it appears | When it appears | Exact text | Problem, if any | Suggested rewrite |
| --- | --- | --- | --- | --- |
| Gel tab / Auto Crop | Auto crop cannot find lane edges or fewer than 2 lanes are detected | `Could not find the lane edges, so the image was left uncropped. Trim it by hand if needed.` | Missing a clear next step on how to trim by hand. | `Could not detect lane edges. Drag the crop handles to trim the gel by hand.` |
| Gel tab / Auto Crop | Auto crop successfully crops the gel image | `Cropped to ${r.nUse} lanes (your lane count). Found stain in ${r.nFound}.` or `Cropped to ${r.nUse} lanes.` | Includes technical internal detail ("Found stain in X"). | `Cropped to ${r.nUse} lanes.` |
| Step Timeline / Concentrated Step | Concentrated step is moved to follow a different step | `The Concentrated step moved to after ${stepTitle(to)}` | Missing period at the end. | `Moved Concentrated step to after ${stepTitle(to)}.` |
| Step Timeline / Concentrated Step | Concentrated step is removed when a step is deleted | `Removed its Concentrated step too${n ? ` and ${n} NanoDrop reading${n === 1 ? '' : 's'}` : ''}` | Phrasing is informal and missing trailing period. | `Removed Concentrated step and ${n} linked NanoDrop reading${n === 1 ? '' : 's'}.` |
| Step Timeline / Fractions | "Suggest pool" button is clicked but no fractions have significant peaks | `No clear peak in the collected fractions` | Missing next step or punctuation. | `No clear peak found. Select pooled fractions manually on the run card.` |
| Step Timeline / Fractions | "Suggest pool" button successfully picks fractions | `Pooled ${sg} (suggested)` | Missing trailing period. | `Pooled ${sg} (suggested).` |
| Gel tab / Rotation | Gel image is rotated while ladder marks exist | `Ladder marks cleared because the gel was rotated` | Missing period. | `Ladder marks cleared because the gel was rotated.` |
| Gel tab / Lane Crop | Refit crop button or auto refit completes | `Crop refitted to ${g.nLanes} lanes.` | Plain and clear. | None needed. |
| Gel tab / Cleavage | "Suggest bands" clicked when target MW is missing | `Enter the protein size, or mark its band as the target first.` | Clear instruction. | None needed. |
| Gel tab / Cleavage | "Suggest bands" clicked and bands are matched | `Marked the suggested bands. Check them on the gel and adjust with the band chips.` or `No new strong matches to mark.` | Jargon ("band chips"). | `Marked suggested bands. Check them on the gel and adjust tags if needed.` or `No matching bands found.` |
| Gel tab / Reset Bands | "Reset to auto-detected" button is clicked | `Bands reset to what detection found. Undo brings your edits back.` | Plain and clear. | None needed. |
| Gel tab / Undo Bands | "Undo" button clicked when no history remains | `Nothing to undo.` | Short and clear. | None needed. |
| Gel tab / Ladder | Auto ladder fails to match ladder sizes | `${r.err}` (e.g. `Mark the ladder bands from top to bottom on the gel.`) | Direct instruction. | None needed. |
| Gel tab / Ladder | Auto ladder successfully matches ladder sizes | `Matched ${r.n} of ${r.of} ladder sizes to ${r.found} detected bands. Check the kDa marks against the gel.` | Plain and clear. | None needed. |
| Gel tab / Match Fractions | "Match lanes to fractions" clicked before bands detected | `No bands detected yet` | Missing next step or trailing period. | `No bands detected yet. Adjust crop or add bands first.` |
| Gel tab / Match Fractions | "Match lanes to fractions" completes | `Matched ${n} lane(s) to runs from their labels.` or `No lane labels match a fraction name...` | Too long and complex when ambiguous. | `Matched ${n} lane${n === 1 ? '' : 's'} to runs.` / `No lane labels match fraction names. Select runs in the lane list.` |
| Gel tab / Quick Fill Lanes | "Quick fill lanes" clicked before assigning runs | `Assign lanes to runs in the lane list first` | Missing period. | `Assign lanes to runs in the lane list first.` |
| Gel tab / Quick Fill Lanes | "Quick fill lanes" completes | `Filled the blank and numbered lanes. Some runs have more pooled fractions than lanes, so check the labels.` | Plain and clear. | None needed. |
| Gel tab / Mark Ladder | Manual ladder marking finishes | `Ladder marked` or `Ladder marked. The kDa labels now appear with every run that uses this gel.` | Concise. | None needed. |
| Gel tab / Mark Ladder | Manual ladder marking started without ladder band sizes | `Enter the ladder band sizes first` | Missing period. | `Enter ladder band sizes first.` |
| Methods Text | Copy methods button clicked | `Methods copied` or `Select the text and copy it` | Short and clear. | None needed. |
| Summary CSV | Export CSV clicked without pooled fractions set | `Set pooled fractions first` | Missing next step or period. | `Set pooled fractions on your runs before exporting CSV.` |
| Peak Integration | "Detect peaks" button clicked | `Found ${n} peak(s). Adjust start and end in the table if needed.` or `No peaks above the detection prominence` | Plain and clear. | `Found ${n} peak${n > 1 ? 's' : ''}. Adjust start and end in the table if needed.` or `No peaks found above prominence threshold.` |
| Peak Integration | "Copy table" clicked with no regions | `No integrated regions or pools yet` | Missing next step or period. | `No integrated regions yet. Drag across the chromatogram or click Detect peaks.` |
| Gel tab / Band interaction | User clicks ladder lane when adding/editing band tags | `That is the ladder lane. Click a band in a sample lane.` | Clear instruction. | None needed. |
| Gel tab / Band interaction | User adds band where one exists | `There is already a band there.` | Short and clear. | None needed. |
| Gel tab / Band interaction | User removes band where none exists | `No band there to remove.` | Short and clear. | None needed. |
| Gel tab / Band interaction | User clicks gel to target/tagged/contaminant mark without band | `No band detected there. Use "Add band" to add it by hand, or lower the detection threshold.` | Clear instruction. | None needed. |
| Workflow / Peak Label | Peak label clicked far from any trace | `Click closer to a trace to label a peak` | Missing period. | `Click closer to a trace to label a peak.` |
| Gel Upload | Gel image uploaded/dropped | `Gel added and cropped to ${last.nLanes} lanes. Type your lane labels to set the count, then detect the ladder.` | Good guidance. | None needed. |
| File Open Error | Unreadable image/file dropped | `Could not open ${bad.join(', ')}. Try exporting the gel as PNG or JPEG.` | Clear next step. | None needed. |
| Project Open Error | Project file parse failure | `Could not open ${proj.name}` or `${fname} is not a project saved by this tool` | Unclear cause. | `Could not open ${proj.name}. Ensure it is a valid project JSON file.` |
| Data Load | Duplicate run file loaded | `${dup.map(d => d.file).join(', ')} is already loaded` | Missing period. | `${dup.map(d => d.file).join(', ')} is already loaded.` |
| Data Load | Unrecognized chromatogram file format | `Could not read ${bad.join(', ')}. Use an ÄKTA (UNICORN) export or a text file with time and signal columns.` | Clear format advice. | None needed. |
| Data Load | Successful trace/run load | `Loaded ${newRuns.length} ÄKTA run(s)...` or `Loaded ${n} trace(s)` | Short and plain. | None needed. |
| Pasted Data | Paste window submitted without text | `Paste two or more columns first` | Missing period. | `Paste two or more numeric columns first.` |
| Pasted Data | Invalid numbers in pasted text | `Could not find two numeric columns in the pasted text` | Missing period. | `Could not find two numeric columns in the pasted text.` |
| PDB Load | PDB / Structure file loaded | `Loaded ${st.code}: ${st.chains.length} chain(s), asymmetric unit ${fmt(m.all/1000, 1)} kDa` | Jargon ("asymmetric unit"). | `Loaded ${st.code}: ${st.chains.length} chain${st.chains.length === 1 ? '' : 's'}, total mass ${fmt(m.all/1000, 1)} kDa.` |
| Structure Load Error | Invalid structure file dropped | `Could not read a structure from ${f.name}` | Missing period and advice. | `Could not read structure from ${f.name}. Use a PDB (.pdb) or mmCIF (.cif) file.` |
| Sequence / Protein | Protein parameters updated | `Protein ${opt.protKda} kDa... now used for the gel, SEC and mg estimates` | Plain and clear. | None needed. |
| SnapGene File | .dna file dropped directly | `${f.name} is a SnapGene file. In SnapGene choose Export, then GenBank (.gb), and drop that file here.` | Helpful next step. | None needed. |
| GenBank Load | GenBank file loaded | `Loaded ${gb.name}: ORF of ${m.tx.length} residues...` or `Loaded ${gb.name}, but found no ORF to draw.` | Clear. | None needed. |
| GenBank Load Error | GenBank parse error | `Could not read ${f.name} as GenBank. Export it from SnapGene or Benchling as GenBank (.gb).` | Clear advice. | None needed. |
| NanoDrop Load | NanoDrop file has no valid readings | `No readings found in ${name}` | Missing period. | `No protein readings found in ${name}.` |
| NanoDrop Load | NanoDrop import summary | `Added ${fresh.length} NanoDrop reading(s)...` | Comprehensive. | None needed. |
| SEC Settings | SEC volume units changed | `Units changed to ${el.value}, so V₀, Vₜ and the standard volumes were cleared. Enter them again in ${el.value}.` | Clear notice. | None needed. |
| SEC Settings | User attempts to delete sole calibration with active SEC runs | `Keep at least one calibration while SEC runs are loaded. Clear its standards instead.` | Clear explanation. | None needed. |
| SEC Standards | Standard calibration run missing | `Load the standards run first` | Missing period. | `Load the standards run first.` |
| SEC Standards | Less than two standards specified | `Enter at least two standards with their sizes first` | Missing period. | `Enter at least two standards with their sizes first.` |
| SEC Standards | Standard peaks not found in run | `Could not find peaks in that run` | Missing period and next step. | `Could not find peaks in that run. Adjust peak detection or check the chromatogram.` |
| SEC Standards | Standard volumes auto-read | `Found ${top.length} peaks for ${want.length} standards...` | Helpful warning. | None needed. |
| Project Storage | Saved project loaded | `Opened ${name}: ${runs.length} run(s), ${traces.length} trace(s), ${gels.length} gel(s)` | Clear summary. | None needed. |
| Project Storage | Save clicked without data | `Load some data first` | Missing period. | `Load some data first before saving a project.` |
| Project Recovery | Unsaved edits restored after crash/close | `Recovered the edits made just before the page closed` | Plain and clear. | `Recovered unsaved edits from your previous session.` |
| Quick Fill | Quick fill saved or undone | `Saved "${nm}" as a quick fill` / `Quick fill undone` | Short and clear. | None needed. |
| NanoDrop File Drop | Image/PDF dropped into NanoDrop | `That is a picture of the readings. On the NanoDrop, export the measurements as a .csv or .tsv file and load that` | Missing period. | `Image files cannot be read. On the NanoDrop, export measurements as CSV or TSV.` |
| NanoDrop File Drop | File contains only nucleic acid readings | `${f.name} has only nucleic acid readings` | Missing period. | `${f.name} has only nucleic acid readings. Export protein (A280) measurements.` |
| Settings | Reset settings clicked | `Settings restored to the defaults` | Plain and clear. | `Settings restored to defaults.` |
| Figure Export | Save SVG / Save PNG clicked with empty figure | `Nothing to save yet` or `Nothing to copy yet` | Missing next step. | `Nothing to save yet. Load data to generate a figure.` |
| Figure Export | Copy SVG succeeded / failed | `SVG copied` or `Copy was blocked by the browser` | Short and clear. | None needed. |
| Protein Section | Hint under sequence properties | `Mass is the average mass of the chain. pI uses the Bjellqvist pK values, the same as ExPASy ProtParam...` | Plain and accurate. | None needed. |
| Upstream Steps / Construct | Hint under construct step | `From a GenBank file the tool finds the ORF, its promoter, RBS and terminator...` | Concise background. | None needed. |
| Upstream Steps / Expression | Hint under expression step | `A gel with lanes labelled U and I (uninduced, induced), plus S, P or time points, is shown as the expression gel...` | Clear lane naming advice. | None needed. |
| Upstream Steps / Lysis | Hint under lysis step | `With the culture volume set, the summary table gives the yield per liter, and per gram of cells...` | Plain advice. | None needed. |
| Upstream Steps / Cleavage | Hint under cleavage step | `Gel lanes labelled −Ulp1 and +Ulp1 (or uncut and cut, before and after) go with the cleavage step...` | Clear lane naming advice. | None needed. |
| NanoDrop Panel | Hint under NanoDrop list | `Protein A280, A205 and Proteins & Labels exports from the NanoDrop One, 2000 or 8000 (.csv or .tsv) work...` | Supported formats clear. | None needed. |
| Peak Integration | Hint under peak table | `Drag across the chromatogram to integrate a region, or click Detect peaks under the figure...` | Plain instructions. | None needed. |
| SEC Panel | Hint under SEC calibration | `Apparent size comes from a straight line of log(MW) against Kav...` | Scientific explanation. | None needed. |
| Gel tab | Hint under gel crop | `Auto crop trims to the stained lanes, from just below the wells to just below the dye front...` | Clear behavior explanation. | None needed. |
| Gel tab | Hint under lane labels | `Lanes labeled with a fraction name (T3, B5 ...) are matched to the run that collected it...` | Clear matching rule. | None needed. |
| Gel tab / Known proteins | Hint under contaminant flagging | `Off until you turn it on. A band is flagged only when it is a distinct, unsaturated band inside the marked ladder...` | Detailed scientific context. | None needed. |
| Summary Table | Hint under summary table | `Protein is the A₂₈₀ area of each pool divided by the A₂₈₀ of a 1 mg/mL solution...` | Concise definition. | None needed. |
| Run Card / UV Mass | Warning under run card UV section | `No mg from the UV area: the selected UV curve is 214 nm, not 280 nm` or `...flow rate is not known` | Explains why UV mg cannot be calculated. | Plain and clear. |
| Run Card / UV Mass | Assumed UV path note | `UV path assumed 2.0 mm (not in the file). ÄKTA monitors are usually 2 mm, HPLC flow cells often 10 mm.` | Explains assumed value. | None needed. |
| Step List / Remove | Delete step button hovered/clicked once | `Remove` button turns red with class `armed` ("Click again to delete") | No text feedback on button, relies only on color change on first click. | Add accessible tooltip or text change to `Click again to remove`. |
| Project List / Remove | Delete project button hovered/clicked once | Delete icon button arms for 600ms before second click deletes | Silent arming window of 600ms. | Show `Click again to delete` toast or inline text. |
| Run Card / Sequence Match | Sequence mismatch warning badge | `Differs from the Protein section at 2 positions (E12, K45).` or `Does not contain the Protein section's sequence.` | Concise warning badge. | None needed. |

---

## Situations Where the User Gets No Message But Should

1. **Unrecognized or skipped files during bulk drop:**
   - **Situation:** When multiple files are dropped onto the workspace, unsupported file types (like Word documents or random binary files) are silently filtered out without notifying the user which files were ignored.
   - **Suggested Message:** Toast: `Skipped unsupported file(s): example.docx. Supported formats are ÄKTA exports, CSV/TSV data, GenBank (.gb), PDB/mmCIF, and PNG/JPEG gel images.`

2. **Default flow rate assumed for UV area calculation:**
   - **Situation:** When a run's x-axis is in minutes, mass calculations fail silently unless flow rate is set, or default fallback behavior is triggered without indicating why the UV area table row is empty.
   - **Suggested Message:** Inline hint under flow input: `Flow rate required to calculate UV peak volume and mg yield.`

3. **Inconsistent or missing extinction coefficient ($A_{280}$ of 1 mg/mL):**
   - **Situation:** When sequence calculation yields 0 $A_{280}$ (e.g. sequence has no Trp/Tyr residues) and no manual value is entered, mass calculations from $A_{280}$ silently evaluate to zero or NaN.
   - **Suggested Message:** Toast / Card Warning: `Protein sequence has no Trp or Tyr residues ($A_{280} = 0$). Enter the $A_{280}$ of a 1 mg/mL solution manually.`

4. **Traces without UV 280nm signal:**
   - **Situation:** If a chromatogram export contains only conductivity or pH curves without a UV 280 nm curve, the run is loaded but no peak integration can occur.
   - **Suggested Message:** Toast / Run Card Warning: `Loaded run without a UV 280 nm trace. Retention times are shown, but UV protein mass cannot be calculated.`

5. **Auto-crop fallback when image resolution is too low:**
   - **Situation:** When a gel photo is severely cropped or low-resolution, auto-crop returns the uncropped image silently or fails back without suggesting image replacement.
   - **Suggested Message:** Toast: `Gel resolution is too low for automatic lane detection. Adjust crop handles manually or upload a higher-resolution image.`

6. **Overwriting quick-fill or project settings:**
   - **Situation:** Saving a Quick Fill preset or applying defaults overwrites existing user preferences without an explicit confirmation.
   - **Suggested Message:** Inline / Toast confirmation: `Quick fill preset updated.` / `Default settings restored.`

7. **Project auto-save state in offline/browser mode:**
   - **Situation:** When local storage quota is reached or IndexedDB is disabled by browser privacy settings, saving projects fails or pending changes are lost silently.
   - **Suggested Message:** Banner / Toast: `Storage space full or blocked by browser settings. Export your project JSON file to prevent data loss.`
