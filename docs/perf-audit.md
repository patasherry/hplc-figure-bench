# Performance Audit: Part 2 (Find Causes)

## Top 5 functions by self time

1. `render` (line 4211)
2. `pathD` (line 2023)
3. `buildRunSVG` anonymous map callback (line 2081)
4. `buildSVG` (line 2042)
5. `processTrace` (line 1583)

## Cause analysis

- **`render` / `buildSVG`**: The `render()` function performs a full layout recalculation and DOM update of the entire Workflow figure, sidebar, and summary tables synchronously on every single keystroke. When a user types in a title input, `syncControls()` and `renderList()` execute, triggering a complete `render()`.
- **`pathD` and `processTrace`**: These functions process large arrays of chromatography data. `processTrace` creates new point arrays, and `pathD` iterates over these arrays to generate long SVG `<path>` strings. This work is repeated identically on every render cycle even if the trace and figure dimensions have not changed.
- **Loops doing repeated work**: Accessor functions like `poolRows`, `integRows`, and `fracSegments` are re-evaluated completely from scratch inside `render()` loops. For example:
  - `poolRows(run)` is called repeatedly in `sumRows`, `methodsText`, `runCondLines`, and `buildRunFig` during a single layout pass.
  - `integRows(run)` calculates baseline subtraction and numeric integrations redundantly for peaks and tables.
  - `fracSegments(run)` re-slices arrays and computes boundary indices inside tight filtering loops.
- **Large Arrays**: The chromatography raw data arrays (`xs`, `ys`) are repeatedly traversed and copied without caching the intermediate SVG geometric paths or layout variables.

## Suggested Fixes

### 1. Debounce `render` on text input events
- **Fix**: Apply a small debounce (e.g., 150-250ms) to text input event listeners before calling `render()`, or selectively update only the modified text fields rather than triggering a full workflow rebuild on every keystroke.
- **Expected gain**: Drastic reduction in main thread blocking while the user types in inputs.
- **Risk**: Very low; might introduce a barely perceptible visual delay updating the main figure during rapid typing.

### 2. Cache SVG paths (`pathD` and `processTrace`)
- **Fix**: Introduce a cache on the `run` or `trace` object (e.g., `_svgCache`) storing the generated SVG path string. The cache key should include the plot dimensions (`w`, `h`) and active trace settings.
- **Expected gain**: High. Eliminates the most expensive array iterations (`pathD`) and object creations (`processTrace`) when layout size hasn't changed.
- **Risk**: Medium. Requires rigorous cache invalidation to prevent stale paths from being shown when user options (colors, active traces, scale) change.

### 3. Memoize `poolRows`, `integRows`, `fracSegments`
- **Fix**: Memoize these functions by caching their outputs directly on the `run` object (e.g., `run._poolRowsCache`), invalidating the cache when dependent arrays or parameters (like `run.shade` or `run.integ`) change.
- **Expected gain**: Medium-high. Removes redundant mathematical integrations and array manipulations from the critical rendering path.
- **Risk**: Low-medium. Like SVG caching, cache invalidation must be flawless to ensure scientific numbers (yield, peak areas) correctly reflect user edits.

---

## Ready-to-file issues

### Debounce text inputs and decouple `render()` triggers
Currently, every keystroke in input fields triggers a synchronous full-page `render()` via `syncControls` or input listeners. Wrap text input event listeners in a short debounce (e.g. 150-250ms), or separate minor DOM updates from the heavy `buildWorkflow()` execution.

### Cache computationally expensive array-to-SVG generators (`pathD`)
The `pathD` and `processTrace` functions dominate CPU time during figure generation. Implement a cache for `<path>` generation based on width/height, trace data version, and line settings to avoid regenerating SVG paths on every full render when the plot dimensions haven't changed.

### Memoize loop-heavy data accessors (`poolRows`, `integRows`, `fracSegments`)
Calculations like `poolRows` and `integRows` do numeric integration and are called redundantly (e.g., 5-10 times per run during one `render()` cycle). Cache their results on the `run` object and invalidate when data arrays or relevant settings (like baseline options) change. **needs owner OK**
