"""board_focus() hands each board meeting the next app section from docs/CODEMAP.md, with its code, in turn."""
import re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
src = (HERE / 'manager.py').read_text(encoding='utf-8')
ns = {'re': re, 'ROOT': HERE.parents[1]}
exec(re.search(r'def board_focus\(s\):.*?\n\n\n', src, re.S).group(0), ns)
bad = []
def check(name, ok):
    print(('ok   ' if ok else 'FAIL ') + name)
    if not ok:
        bad.append(name)
st = {}
a, ca = ns['board_focus'](st)
b, cb = ns['board_focus'](st)
check('a section and its code', bool(a) and f'---------- {a}' in ca)
check('the next meeting gets the next section', a != b and st['board']['focus_i'] == 1)
check('the code is capped at about 7000 characters', all(len(c) <= 7040 for c in (ca, cb)))
sys.exit(1 if bad else 0)
