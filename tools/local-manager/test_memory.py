"""The local model's standing notes (reviewer.memory): the brief exists and fits, lessons are read newest last,
the code map slice names the sections a diff touches, and learn() skips repeats."""
import sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools' / 'local-reviewer'))
import reviewer as rv

bad = []
def check(name, ok):
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok:
        bad.append(name)

brief = rv.BRIEF.read_text(encoding='utf-8')
check('the brief exists and fits in its 6000 characters', 500 < len(brief) <= 6000)
check('the brief has no em dash or semicolon', '—' not in brief and ';' not in brief)

rv.LEARNED = Path(tempfile.mkdtemp()) / 'lessons.txt'
rv.cfg['memory'] = True
rv.learn('PR #10 (Fix the axis): No check failed on main, so nothing shows the fix works.')
rv.learn('PR #11 (Fix the legend): No check failed on main, so nothing shows the fix works.')
rv.learn('PR #12 (Add a thing): It regresses 3 checks in 40_visual.')
lines = rv.LEARNED.read_text(encoding='utf-8').splitlines()
check('the same problem on another pull request is kept once, newest wins', len(lines) == 2 and 'PR #11' in lines[0] and 'PR #12' in lines[1])
for k in range(300):
    rv.learn(f'PR #{k}: problem kind {chr(65 + k % 26)}{chr(65 + k // 26)} here')
check('the learned list is capped at 200 lines', len(rv.LEARNED.read_text(encoding='utf-8').splitlines()) == 200)

row = next(l for l in (ROOT / 'docs' / 'CODEMAP.md').read_text(encoding='utf-8').splitlines() if '`peak integration`' in l and l.startswith('|'))
start = int(row.split('|')[1].strip().split('–')[0])
diff = f'diff --git a/{rv.APP} b/{rv.APP}\n--- a/x\n+++ b/x\n@@ -{start + 2},3 +{start + 2},4 @@ function f(){{\n+x\ndiff --git a/tests/suites/01_a.js b/tests/suites/01_a.js\n@@ -1,2 +1,900000 @@\n+y\n'
sl = rv.map_slice(diff)
check('the code map slice names the touched section', '`peak integration`' in sl)
check('the slice ignores hunks of other files and stays short', sl.count('\n') < 3)
check('no diff gives no slice', rv.map_slice('') == '' and rv.map_slice(None) == '')

m = rv.memory(diff)
check('memory carries the brief, the lessons, the learned list and the slice', all(x in m for x in ('Protein Purification Bench', 'Lessons from past reviews', 'sent back', 'App sections this change touches')))
check('memory stays under 14000 characters (about 3500 tokens)', len(m) < 14000)
rv.cfg['memory'] = False
check('"memory": false switches it off', rv.memory(diff) == '')
rv.cfg['memory'] = True

sent = {}
class R:
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def read(self): return b'{"message": {"content": "<think>x</think>fine"}}'
def fake(req, timeout=0):
    import json; sent.update(json.loads(req.data)); return R()
rv.urllib.request.urlopen = fake
out = rv.ask_model('You review.', 'the diff', diff)
check('ask_model puts the notes in the system message and still answers', out == 'fine' and 'Project notes' in sent['messages'][0]['content'] and sent['messages'][1]['content'] == 'the diff')

sys.exit(1 if bad else 0)
