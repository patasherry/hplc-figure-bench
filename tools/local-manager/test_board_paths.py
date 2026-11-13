"""The board may only name files that exist. #1374 named src/workflows/templates/miniprep.js in a
single-file app, and a downstream agent then rejected Patrick's whole cloning request as hallucinated."""
import re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]  # the repository root. It was this folder, so `git ls-files` listed only tools/local-manager and every real path looked invented

def repo_files(root):
    out = subprocess.run(['git', 'ls-files'], cwd=str(root), capture_output=True, text=True, timeout=30)
    return {l.strip() for l in out.stdout.splitlines() if l.strip()}

PATHY = re.compile(r'[\w./-]*\w+\.(?:js|ts|jsx|tsx|json|html|css|md|py)\b')

def invented_paths(text, tracked):
    if not tracked:
        return []
    base = {p.rsplit('/', 1)[-1] for p in tracked}
    bad = []
    for m in PATHY.findall(text or ''):
        p = m.strip('.,;:()[]`\'"')
        if not p or p in tracked or p.rsplit('/', 1)[-1] in base:
            continue
        if any(t.endswith('/' + p) or t == p for t in tracked):
            continue
        bad.append(p)
    return sorted(set(bad))


BACKTICKED = re.compile(r'`([A-Za-z_][A-Za-z0-9_]*)`')
CAMEL = re.compile(r'^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$')


def unknown_idents(text, app):
    if not app:
        return []
    return sorted({n for n in BACKTICKED.findall(text or '') if CAMEL.match(n) and n not in app})


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
