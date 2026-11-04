git commit --amend -m "Fix: unify pool and region area integration

Closes #770

The integration table calculates areas of regions using simple linear interpolation between limits, whereas the pool area calculation utilizes a dynamic outward-walking baseline and clamps individual slices with \`Math.max(0, ...)\`. This discrepancy caused region areas and pool areas over the same span to yield different results.

This change extracts a common \`integrateBlocks\` helper that implements the trapezoid rule with an outward-walking baseline and removes \`Math.max(0, ...)\` clamping. Both \`poolRows\` and \`integrateRegion\` are updated to share this new helper, ensuring that the same integration rules are applied consistently. Also added tooltips to explain the baseline logic for pool and region blocks.

A synthetic UI test is added to tests/suites/41_pool_area.js to verify this behavior through the DOM by driving the UI to enter a span matching a region and a pool that dips below the baseline, and comparing the extracted table areas to math out at exactly -41 (due to display rounding).

Checks this PR fixes:
- 41_pool_area/Areas match
- 41_pool_area/Match -41

Open questions:
- Playwright DOM interactions to edit the integration table bounds for regions required setting the integration method to trapezoid explicitly (as the default for SEC runs tends to be Gaussian). We've bypassed potential issues with locator.fill timeouts during re-renders by setting values directly through evaluate scripts and triggering UI re-renders directly via synthetic events. A purer DOM locator flow might be possible with deeper inspection."
