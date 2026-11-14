"""The board may only name files that exist. #1374 named src/workflows/templates/miniprep.js in a
single-file app, and a downstream agent then rejected Patrick's whole cloning request as hallucinated."""
import os, sys
from pathlib import Path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from boardpaths import ROOT, repo_files, invented_paths, unknown_idents


def idents(repo):
    """The board may name a function that is not in the app. That is a warning, never a rejection, because a
    proposal may mean to add one. #1384 rested its whole premise on `drawZoomInset`, which does not exist."""
    app = (repo / 'hplc-figure-bench(WF1.13).html').read_text(encoding='utf-8', errors='replace')
    assert app, 'app file not read'
    ok = 0
    # the real #1384 text
    bad = unknown_idents('a formal mathematical audit of the relationship between the main canvas/SVG '
                         'coordinate system and the `drawZoomInset` function', app)
    assert bad == ['drawZoomInset'], bad
    ok += 1
    # a real function passes
    assert unknown_idents('change `zoomCompose` so the inset title fits', app) == []
    ok += 1
    # prose and non-camelCase are ignored, so ordinary wording never trips it
    for quiet in ['the `gels` section needs work', 'no backticks here at all drawZoomInset',
                  'update `README` and the `tests` folder', 'the `zoom-inset-bg` rect']:
        assert unknown_idents(quiet, app) == [], (quiet, unknown_idents(quiet, app))
        ok += 1
    # several at once, sorted and deduplicated
    assert unknown_idents('`fooBarBaz` and `fooBarBaz` and `quuxThing`', app) == ['fooBarBaz', 'quuxThing']
    ok += 1
    # an unreadable app file means no opinion, never a false warning
    assert unknown_idents('`drawZoomInset`', '') == []
    ok += 1
    print(f'ok idents ({ok} checks)')

def main(repo):
    t = repo_files(repo)
    assert t, 'no tracked files read'
    ok = 0
    # the real #1374 text must be caught
    bad = invented_paths('Create src/workflows/templates/miniprep.js and implement a sub-workflow injection '
                         'pattern; verify via test/workflows/reusability.test.js', t)
    assert bad == ['src/workflows/templates/miniprep.js', 'test/workflows/reusability.test.js'], bad
    ok += 1
    # real references must pass
    for good in ['change tests/suites/25_gels.js and hplc-figure-bench(WF1.13).html',
                 'update README.md and docs/CODEMAP.md',
                 'the gels section of the app, no paths at all',
                 'add a check to tests/lib/harness.js']:
        assert invented_paths(good, t) == [], (good, invented_paths(good, t))
        ok += 1
    # a bare suite name that exists is fine, an invented one is not
    assert invented_paths('see 25_gels.js', t) == []
    ok += 1
    assert invented_paths('see tests/workflows/reusability.test.js', t) != []
    ok += 1
    # no tracked list means no opinion, never a false reject
    assert invented_paths('src/anything.js', set()) == []
    ok += 1
    print(f'ok ({ok} checks)')
    idents(repo)

if __name__ == '__main__':
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT)
