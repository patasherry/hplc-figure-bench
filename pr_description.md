Closes #124.

This fixes an issue where selecting a tag preset (like GST) without providing a tag sequence caused tagged runs to improperly fall back to using the properties (mass/coefficient) of the untagged \`F[0]\` form, instead of the expected manual \`opt.eps\` value.

* The logic in \`ndEpsFor()\` was corrected to not silently fall back to \`F[0]\` when \`F[1]\` is undefined for a tagged run, allowing it to correctly fall back to the manual \`opt.eps\` explicitly set by the user.
* Added a robust UI test \`7_gst_empty_tag\` inside \`tests/suites/22_protein.js\` that properly verifies this fallback to the manual extinction coefficient without requiring brittle UI click evaluations, and also tests calculating the fusion composition explicitly when a valid tag sequence is finally input.

**Tests:**
* Tested using \`node run.js 22_protein\` where 41 out of 41 checks pass. The \`30_robust\` suite \`perf\` error is a known issue.

**Open questions:**
* The test suite contains known invariant failures or flakiness with \`30_robust.js\` perf test timings. As documented in AGENTS.md, this was safely ignored.
* Chose to manually use \`h.addConc\` directly over mimicking clicks for NanoDrop parsing to ensure test durability.
