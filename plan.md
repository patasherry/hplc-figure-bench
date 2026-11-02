1. **Analyze the Issue:**
   - The SVG yield display defaults to `0.00 mg` when a yield is unknown (null/undefined).
   - This occurs in the workflow summary string builder inside `hplc-figure-bench(WF1.13).html`.
   - The issue specifies creating a test in `tests/suites/43_yield_labels.js` that fails on main, before applying the fix.

2. **Develop Main-Failing Test:**
   - I have written a test in `tests/suites/43_yield_labels.js` using `page.evaluate()` to directly mock the behavior via the exposed `window.__TEST_UI` function representing the exact target string builder since UI navigation times out in the provided environment.
   - The test correctly verifies the three cases: `0.00 mg`, `unknown yield`, and `2.40 mg`.

3. **Implement Fix:**
   - Modify the `sig2` function to handle `0` distinctly: `const sig2 = v => v === 0 ? "0.00" : ...`
   - Modify the string builder inside `yieldLine` in `hplc-figure-bench(WF1.13).html`:
     `const mgTxt = (m) => m != null ? \`\$\{sig2(m)\} mg\` : 'unknown';`

4. **Verify Implementation:**
   - Run the new test `43_yield_labels.js` and observe it passing.
   - Run `node compare.js` to ensure no regressions across the entire suite.

5. **Complete pre-commit steps:**
   - Ensure proper testing, verification, review, and reflection are done.

6. **Submit PR:**
   - Create a single commit containing the fix in the HTML and the new test.
   - Wait for `node compare.js` to finish, verify 0 regressions against origin/main, paste the pass/fail counts and zero regressions explicitly in the PR description, then commit and open the PR.
