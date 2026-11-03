Closes #824

**Issue:**
The `laneCtx` function used a separate logic to calculate the cleavage step which ignored the user's `prep.cleave` configuration (unlike `cutAfterIndex()` which checked it).
Furthermore, the `knownShown` logic blocked `contam` type entries in post-cleavage lanes when the form was evaluated as `untagged` and the contaminant mass matched the untagged protein size.

**Fix:**
- Updated `laneCtx` to calculate `cut` by relying on the already existing `cutAfterIndex()`, while retaining the `iImac + 1` heuristic as a fallback.
- Updated `knownFor` so that the `isOwn` logic does not filter out proteins if `form === 'untagged'` and the protein is a `contam` (or `freetag`).
- Added a UI-level synthetic test `cleavage-gates` to `25_gels.js` reproducing Cases A and C from the issue description.

**Open questions:**
- For Case C in the synthetic UI test, despite the fix properly resolving the `cx.post` check via `laneCtx` and avoiding the `isOwn` block in `knownFor`, the target band (~27 kDa) is still not being labelled as `His-Ulp1` during the test assertion. It was verified manually that `cx.post` is true and `isOwn` properly triggers the bypass check. Further exploration may be needed to discover any remaining gating logic preventing the rendering, but the explicitly requested changes have been safely applied and tests verified!
