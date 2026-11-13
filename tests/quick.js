// The fast path for a worker: compare only the suites that the change can plausibly break, in minutes rather than the hour
// the full comparison takes. The Test suite workflow still runs every suite on every pull request, so this is for finding
// problems before the PR is opened, not for proving there are none.
// Usage: node quick.js [--list] [extra suite names...]
//   Picks: preflight and smoke, every suite file you added or changed, and the suites mapped to the app sections you touched
//   (the diff of the app against origin/main, or BASE=<git ref>). --list prints the choice and runs nothing.
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const repo = path.resolve(__dirname, '..'), APPF = require('./lib/app'), rel = path.relative(repo, APPF).split(path.sep).join('/'), base = process.env.BASE || 'origin/main';
const git = (...a) => { const r = spawnSync('git', ['-C', repo, ...a], {encoding: 'utf8', maxBuffer: 1 << 28}); return r.status === 0 ? r.stdout : ''; };
/* section name (as in the app's `---------- name ----------` markers) -> suites. First match wins per rule, all matching rules add up.
   Coarse on purpose: a wrong guess costs a few minutes here, and the full run on the PR catches what this misses. */
const MAP = [
  [/^markup and styles$/, ['40_visual', '431_ios_look', '44_panel_more', '950_panel_padding', '1060_sidebar_trace_wrap']],
  [/^(parsing|UNICORN|traces and runs|loading)/, ['10_data_truth', '11_unicorn_zip', '1197_quoted_csv', '17_cross_format', '18_hplc_load']],
  [/^(runs: windows|peak integration)/, ['14_peaks', '770_pool_area', '20_science', '45_yield_semantic']],
  [/^(size exclusion|SEC panel)/, ['15_import_sec', '26_sec_calibration', '27_sec_mass_calculation', '28_sec_figure', 'test_sec_calibration_units']],
  [/^figure: zoom inset/, ['43_zoom_inset']],
  [/^(figure:|figures$)/, ['42_figures', '1187_svg_group', '1285_axis_reorder', '46_run_status_overlap', '50_export']],
  [/^(gels$|auto crop|gel densitometry|band tags)/, ['25_gels', '1330_gel_blob', '99_band_overlap']],
  [/^(composite|editing the workflow figure)/, ['24_workflow_branches', '31_wf_full', '41_workflow_drag_hint', '411_workflow_condition_placeholder', '769_workflow_refit', '45_yield_semantic']],
  [/^(upstream steps|construct and expression|protein:)/, ['12_genbank', '22_protein', '796_tag_mass', '1007_untagged_default', '1090_construct_sequence_link', '1305_selected_clone', '1306_construct_method_specific']],
  [/^(run conditions|quick fill)/, ['21_methods', '1089_actionable_methods_gaps', '23_provenance']],
  [/^NanoDrop/, ['16_nanodrop', 'test_nanodrop_units']],
  [/^(UI$|More options|what to do next|home$)/, ['05_quick', '44_panel_more', '48_empty_start', '950_panel_padding', '1060_sidebar_trace_wrap', '1267_toast_dismiss']],
  [/^projects/, ['47_export_project', '669_persistence_roundtrip', '30_robust', '915_raw_files', '1022_downstream_allocation', '1023_carryover_semantics']],
  [/^cloning workflow/, ['1402_cloning_engine', '1305_selected_clone']],
  [/^the step timeline/, ['31_wf_full', '44_panel_more', '1089_actionable_methods_gaps', '1402_cloning_engine']],
  [/^export$/, ['50_export', '47_export_project']],
  [/^(helpers|example data)/, ['20_science', '05_quick']]
];
const all = fs.readdirSync(path.join(__dirname, 'suites')).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
const pick = new Set(['00_preflight', '00_smoke']), why = [];
/* 1. suites added or changed in the working tree or on this branch */
(git('diff', '--name-only', base, '--', 'tests/suites') + git('ls-files', '--others', '--exclude-standard', '--', 'tests/suites')).split('\n').map(f => path.basename(f).replace(/\.js$/, '')).filter(n => all.includes(n)).forEach(n => { pick.add(n); why.push(`${n}: the suite itself changed`); });
/* 2. the app sections the diff touches */
const lines = fs.readFileSync(APPF, 'utf8').split('\n'), marks = []; lines.forEach((l, i) => { const m = /\/\*\s*----------\s*(.*?)\s*----------\s*\*\//.exec(l); if (m) marks.push({at: i + 1, name: m[1].trim()}); });
const sectionAt = n => { let s = 'markup and styles'; for (const m of marks) { if (m.at <= n) s = m.name; else break; } return s; };
const touched = new Set(); for (const m of git('diff', '-U0', base, '--', rel).matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) { const a = +m[1], c = m[2] === undefined ? 1 : +m[2]; for (let n = a; n < a + Math.max(c, 1); n++) touched.add(sectionAt(n)); }
let unmapped = false; for (const s of touched) { const hits = MAP.filter(([re]) => re.test(s)); if (!hits.length) unmapped = true; hits.forEach(([, names]) => names.forEach(n => { if (all.includes(n)) { if (!pick.has(n)) why.push(`${n}: section "${s}"`); pick.add(n); } })); }
/* 3. anything named on the command line */
const args = process.argv.slice(2), listOnly = args.includes('--list'); args.filter(a => a !== '--list').forEach(a => all.filter(n => n.includes(a.replace(/\.js$/, ''))).forEach(n => { if (!pick.has(n)) why.push(`${n}: asked for`); pick.add(n); }));
const chosen = [...pick].filter(n => all.includes(n)).sort();
console.log(`Sections touched against ${base}: ${[...touched].join(' | ') || 'none (the app is unchanged)'}`);
console.log(`Quick set: ${chosen.length} of ${all.length} suites\n` + why.map(w => '  ' + w).join('\n'));
if (unmapped) console.log('  A touched section has no mapping in tests/quick.js: add one, and consider running the full `node compare.js`.');
if (listOnly) process.exit(0);
const r = spawnSync('node', [path.join(__dirname, 'compare.js'), ...chosen.map(n => n + '.js')], {stdio: 'inherit', env: process.env});
console.log('\nThis was the quick set. The Test suite workflow runs every suite on the pull request.'); process.exit(r.status || 0);
