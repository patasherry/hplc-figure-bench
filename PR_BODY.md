Closes #515

**What I added**
* Added the `8_cleared_seq` test block in `tests/suites/22_protein.js` right before the `no page errors` check.
* The test ensures that setting the sequence to `MAWYKLLPEDG` correctly loads the sequence and provides table row.
* Then the test clears the sequence using empty string `''` and checks that the protein forms table correctly has `0` rows and the extinction text correctly evaluates to `""`.

**Test Output**
* Verified the new test locally. Running `node tests/suites/22_protein.js` locally showed the test pass:
```
22_protein.js                      pass  61  fail   0  267s
TOTAL pass 61  fail 0  crashed suites 0  (APP=/app/hplc-figure-bench(WF1.13).html)
```
* Ran `node compare.js` against the full test suite result. There were no new regressions.

## Preflight Checklist
- [x] **Affected displayed value:** No UI value is changing. This is a test-only change to `22_protein.js`
- [x] **Synthetic input:** Handled in test setup by setting protein sequence `MAWYKLLPEDG` and clearing using empty string `""`
- [x] **Tolerance / Contract:** 0 rows and empty string
- [x] **Main-versus-branch result:** `8_cleared_seq` checks fail on main since it didn't exist before, and pass on PR branch
  - Result on `main`: No test
  - Result on PR branch: Pass
