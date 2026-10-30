Closes #514

This PR adds a test to ensure that a protein with no tryptophan (W) and no tyrosine (Y) correctly shows `none` in the A280 column of the protein Forms table, and does not show an ε value in the extinction text.

- Added `7_no_trp_tyr` test block to `tests/suites/22_protein.js`
- Test sequence `MAGSKLLPEDGHHGSS` verifies A280 and extinction handling for proteins with 0 absorbers.

Output for `node tests/suites/22_protein.js` includes the following newly passing assertions:

```text
PASS 22_protein/7_no_trp_tyr.has_row
PASS 22_protein/7_no_trp_tyr.a280_none
PASS 22_protein/7_no_trp_tyr.no_eps
```

All existing tests continue to pass.
