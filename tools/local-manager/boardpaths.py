"""The Direction board's path and identifier checks. Pure functions (plus git ls-files helper),
no network, no config: tested by test_board_paths.py and imported by manager.py."""
import re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = 'hplc-figure-bench(WF1.13).html'

# a token that looks like a source path: has a slash or a code extension
PATHY = re.compile(r'[\w./-]*\w+\.(?:js|ts|jsx|tsx|json|html|css|md|py)\b')

# a camelCase identifier inside backticks: the board naming something it believes is already in the code
BACKTICKED = re.compile(r'`([A-Za-z_][A-Za-z0-9_]*)`')
CAMEL = re.compile(r'^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$')


def repo_files(root=ROOT):
    """Every tracked path, so a proposal can be checked against what actually exists."""
    try:
        out = subprocess.run(['git', 'ls-files'], cwd=str(root), capture_output=True, text=True, timeout=30)
        return {l.strip() for l in out.stdout.splitlines() if l.strip()}
    except Exception:
        return set()


def invented_paths(text, tracked=None):
    """Paths a proposal names that are not in the repository. The board invented
    src/workflows/templates/miniprep.js and test/workflows/reusability.test.js for #1374, a
    single-file app, and a downstream agent then rejected Patrick's whole feature request as
    hallucinated. A proposal may only name files that exist."""
    tracked = repo_files() if tracked is None else tracked
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


def unknown_idents(text, app=None):
    """camelCase names a proposal puts in backticks that do not occur in the app file.

    Unlike a path, a new function is a legitimate thing to propose, so this never rejects: it is reported so
    the worker knows the name came from the board and not from the code. #1384 asked for an audit of
    `drawZoomInset`, which does not exist (the function is zoomCompose), and the proposal's whole premise
    rested on it. invented_paths() could not catch that, because it is an identifier, not a path."""
    if app is None:
        try:
            app = (ROOT / APP).read_text(encoding='utf-8', errors='replace')
        except Exception:
            return []
    if not app:
        return []
    return sorted({n for n in BACKTICKED.findall(text or '') if CAMEL.match(n) and n not in app})
