# Driving the app in a browser: traps that stall agents

Agents writing Playwright checks or inspection scripts for this app keep losing hours on the same few things. Read this before you write any browser code.

## Use the harness, don't write your own

`tests/lib/harness.js` already does the hard parts. Start every script from it:

```js
const {open, H, src} = require('../lib/harness');   // from tests/suites/ or tests/ux/
const {p, errs, close} = await open();               // a fresh page on the app; open({width: 390}) for a phone
const h = H(p);
await h.newProject('My test');                       // only works on the home screen (see below)
await h.addRun(src('his'));                          // synthetic IMAC run; also 's200' (SEC), 'q' (anion exchange), 'nd', 'gel', 'gb'
await h.step('figure');                              // show the workflow figure in a project
```

`tests/ux/scopes.js` has worked examples of whole user journeys, and `tests/suites/42_figures.js` and `50_export.js` show exports and downloads.

## The traps

1. **The new-project box (`#npName`) is only on the home screen.** After Quick mode (`#homeQuick`) or inside a project it is hidden, and `fill` waits forever. Use a **new page per scenario** (`open()` again), or click `#homeBtn` ("All projects") and wait for `#npName` to be visible.
2. **Figure tabs (`#figtabs`) are hidden inside a project** (`body.proj #figtabs{display:none}`). They exist only in Quick mode. In a project, pick what is shown through the step timeline: `h.step('figure')` for the workflow figure, or click the run or gel step in `#tl`. A tab that is already selected (`aria-selected="true"`) needs no click.
3. **Never click something hidden.** Before a click or fill, check `await loc.isVisible()`. If it is false, find the control that reveals it (a closed `<details>`, **More options**, a step in `#tl`) instead of retrying.
4. **The app's internals are not on `window`.** Everything lives in a strict-mode IIFE, so `window.G`, `window.opt` and the rest are undefined. Read what is on screen: `#paper svg`, element text, `getBoundingClientRect()`, and `getScreenCTM()` to convert to SVG units.
5. **Downloads need the event first.** Use `const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#saveSvg')])`, as `50_export.js` does (`#saveSvg`, `#savePng`, `#projSave`). Clicking first and waiting afterwards misses the event.
6. **SVG shapes are poor click targets.** Click panels by position (`p.mouse.click(x, y)` from the SVG's bounding box), as `tests/suites/40_visual.js` does.
7. **Synthetic data only.** `src()` always gives the stand-ins in `tests/data`. Never point a script at real lab files.

## Don't stall

- Give every step a timeout (Playwright's default is 30 s) and every script an overall limit of a few minutes.
- When something fails twice the same way, stop retrying it. Record what failed and why, move on to the next item, and report it in the PR.
- Keep inspection scripts in a scratch folder that you don't commit. Checks that belong in the suite go in `tests/suites/`.
