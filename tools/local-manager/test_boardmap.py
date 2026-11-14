"""The board's map (docs/BOARD_MAP.md) and homework helpers in boardmap.py."""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import boardmap as bm
ROOT = HERE.parents[1]
bad = []
def check(name, ok, info=''):
    print(('ok   ' if ok else 'FAIL ') + name + (f'  ({info})' if not ok and info else ''))
    if not ok:
        bad.append(name)

doms = bm.parse_map((ROOT / 'docs' / 'BOARD_MAP.md').read_text(encoding='utf-8'))
rows = bm.codemap_rows((ROOT / 'docs' / 'CODEMAP.md').read_text(encoding='utf-8'))
app = (ROOT / 'hplc-figure-bench(WF1.13).html').read_text(encoding='utf-8', errors='replace')
check('the map has at least 8 domains', len(doms) >= 8, len(doms))
missing = [(d['name'], c) for d in doms for c in d['code'] if c not in rows]
check('every Code section in the map is a section of docs/CODEMAP.md', not missing, missing)
check('every domain names some code', all(d['code'] for d in doms), [d['name'] for d in doms if not d['code']])
suites = {p.stem for p in (ROOT / 'tests' / 'suites').glob('*.js')}
named = {t.strip() for d in doms for l in d['body'].splitlines() if l.strip('- ').lower().startswith('tests:') for t in l.split(':', 1)[1].split(',')}
check('every suite the map names exists', named <= suites, sorted(named - suites))
check('no em dashes or semicolons in the map', '—' not in (ROOT / 'docs' / 'BOARD_MAP.md').read_text(encoding='utf-8') and ';' not in (ROOT / 'docs' / 'BOARD_MAP.md').read_text(encoding='utf-8'))

seen = {}
first = bm.pick_domain(doms, seen)['name']
seen[first] = 100
second = bm.pick_domain(doms, seen)['name']
check('a fresh board starts at the first domain and moves on', first == doms[0]['name'] and second == doms[1]['name'], (first, second))
seen = {d['name']: 100 + i for i, d in enumerate(doms)}
seen[doms[3]['name']] = 1
check('the domain looked at least recently comes next', bm.pick_domain(doms, seen)['name'] == doms[3]['name'])

code = bm.domain_code(doms[0], app, rows)
check('domain code carries each section, capped', all(f'section `{c}`' in code for c in doms[0]['code'] if c in rows) and len(code) <= 7400, len(code))

hw = bm.clean_homework([
    {'to': 'Gemini', 'by': 'the local AI', 'domain': 'gels and densitometry', 'question': 'How does Image Lab subtract background?', 'search': 'densitometry background; subtraction'},
    {'to': 'Gemini', 'by': 'the local AI', 'domain': '', 'question': 'A second one for Gemini'},
    {'to': 'Nobody', 'by': 'Gemini', 'question': 'An adviser that does not exist'},
    {'to': 'the local AI', 'by': 'the local AI', 'domain': 'nonsense', 'question': 'Old question'},
    {'to': 'the local AI', 'by': 'the local AI', 'domain': 'Figures: HPLC overlay, run chart and the workflow figure', 'question': 'What minimum font size do journals require?'}],
    ['the local AI', 'Gemini'], [d['name'] for d in doms] + ['Gels and densitometry'], earlier=['old question'])
check('homework: one per adviser, real advisers only, no repeats', [h['to'] for h in hw] == ['Gemini', 'the local AI'], hw)
check('homework: nobody sets their own', all(h['by'] != h['to'] for h in hw), hw)
check('homework: domains matched without regard to case, search words cleaned', hw[0]['domain'] == 'Gels and densitometry' and ';' not in hw[0]['search'], hw[0])
check('sources text says when there is nothing', bm.sources_text([], '') == '(no sources found)')
check('pubmed with no words asks nothing', bm.pubmed('') == [])
sys.exit(1 if bad else 0)
