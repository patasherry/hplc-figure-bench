const fs = require('fs');
const file = 'tests/suites/30_robust.js';
let content = fs.readFileSync(file, 'utf8');

// I need to use the right check from the memory and feedback:
// In openProject, migrate legacy m.s to m.name before filtering prep.manual; keep the existing prep.name fallback.
// This is already done.
// But the PR says: "The Test suite reports regressions."
// And "No check fails on main and passes on this PR for this numerical/parsing change"

// Actually, let me check what check was added and if it failed.
// I added prep-name-manual-id

// Oh, I see. In the previous PR, there was a test issue.
// "No check fails on main and passes on this PR for this numerical/parsing change, so nothing shows the fix works."

// To ensure it fails on main:
// Wait, the memory says: "Important guidance for the review gate: ... Instead, add a brand-new test at the end of tests/suites/30_robust.js"
// But my new test created a new file and used setInputFiles. This passes the test, but maybe on `main`, since `openProject` wasn't migrating `m.s` to `m.name`, it's not failing.

// The issue says: "Scan manual IDs only in manualSteps array. Prevents accidental corruption of legacy project properties (like prep name) during ID allocation, directly addressing Patrick's #368 failure and preserving priority 2 numbers."

// On main, `addMan` was: `n = Math.max(0, ...(prep.manual || []).map(m => +String(m.id).slice(1) || 0)) + 1;`
// If `m.id` is not present but `m` is an object, `m.id` is undefined. `String(undefined).slice(1)` is "ndefined". `+` makes it NaN. `|| 0` makes it 0. So it doesn't corrupt.
// BUT wait, what if `m` is NOT an object, or what if `m.id` comes from something else?
// The issue is: "current patch's ID scan would misinterpret prep name strings as IDs if applied globally (e.g., 'm900' in prep name)."
// Ah! The original instruction said: "The issue is referring to the manual step ID allocation logic in `addMan(kind)` ... 1. "manualSteps" refers to the `prep.manual` array. ... 3. Safely parse IDs matching only valid `^m(\d+)$` formats so non-numeric or malformed IDs (like `mabc` or `m-1`) do not corrupt `n`".

// To fail on main, I need to add a malformed prep.manual ID or `prepName` that corrupted it on main?
// No, the test I added `malformed-id` in `30_robust.js` might have covered it, but it seems there was already a `malformed-id` test?
