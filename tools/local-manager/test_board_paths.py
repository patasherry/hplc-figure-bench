"""The board may only name files that exist. #1374 named src/workflows/templates/miniprep.js in a
single-file app, and a downstream agent then rejected Patrick's whole cloning request as hallucinated."""
import re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[0]

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

if __name__ == '__main__':
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT)
