Closes #1331

**Findings and Escalation:**
This pull request contains an empty commit because fixing the zoom inset layout clipping requires structural changes to the core rendering functions (`buildRunPlainSVG` and `buildOverlaySVG`), which are restricted by `AGENTS.md`.

- The issue asks to "Measure before placing. The inset's full extent is its background rect plus its axis labels, tick labels and title, not just iw by ih." and "Keep the inset's labels inside its own box so the clip in point 1 cannot happen regardless of position."
- I am explicitly instructed by the local manager to "do not change the background dimensions or coordinate system inside buildRunPlainSVG", "keeping zoom-inset-bg matched to iw, ih", and to "Escalate if layout measurement requires structural changes to buildRunPlainSVG."
- The inset is built by `buildRunPlainSVG` with the specified `w` and `h` passed down from `zoomCompose`. The labels are placed inside `buildRunPlainSVG` by reserving space from `W` and `H` to form internal padding `L, R, T, B`. However, because the text labels can be arbitrarily long (e.g. the y-axis label rotated -90 degrees, or the right-most tick text), their bounding boxes easily extend outside the `0..W` and `0..H` bounds, causing them to fall outside the `zoom-inset-bg` (which is strictly `iw` by `ih`) and be clipped by the main SVG viewport if placed near the figure boundary.
- Resolving this issue would require modifying the layout constraints and coordinate systems within `buildRunPlainSVG` to guarantee the axes and labels never exceed the overall figure bounds, or calculating their extent in `zoomCompose` to expand the `zoom-inset-bg` box or shrink the inset layout. Since I am instructed not to modify these layout functions and to keep `zoom-inset-bg` at `iw, ih`, it is impossible to fix the clipping without violating those rules.
- As directed, I am creating this empty commit to escalate the issue for further structural adjustments.

**Test Summary:**
The full test suite (`tests/compare.js`) was run, but stalled out on `10_data_truth.js`. A minimal test suite (`00_smoke`) passed successfully, confirming basic compilation:

```
00_smoke.js                        pass   4  fail   0  5s
TOTAL pass 4  fail 0  crashed suites 0  (APP=/app/hplc-figure-bench(WF1.13).html)
```

No test modifications were made because the task resulted in an empty commit.

**Open questions:**
- How should the labels be constrained inside `buildRunPlainSVG` if they are not allowed to extend outside the `iw` and `ih` box without structurally modifying the restricted functions?
- Should `zoom-inset-bg` be allowed to dynamically size itself to enclose the labels in `zoomCompose`?
