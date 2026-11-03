"""Plain asserts, no network, no model call: python3 test_dup.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import manager as m

title = 'Axis labels overlap at slide poster presets tick'
prop = {'title': 'Fix axis tick labels slide poster presets', 'change': 'thin ticks', 'evidence': '', 'why': ''}
body = ' '.join(['unrelated prose about gels lanes bands purity sampling'] * 6)[:300]
long_t = title + ' ' + body
pw = m.words(prop['title'] + ' ' + prop['change'])
ov = lambda t: len(pw & m.words(t)) / max(1, min(len(pw), len(m.words(t))))
assert ov(long_t) < 0.45 <= ov(title), (ov(long_t), ov(title))
mem = {'merged': [], 'ideas': [], 'open': [('#10', long_t)], 'titles': {'#10': title}}
assert [k for k, _ in m.dup_close(prop, mem)[0]] == ['#10']
assert m.dup_close(prop, {**mem, 'titles': {}})[0] == []  # the old behaviour, for contrast

cite = {'title': 'Something else entirely', 'change': 'zzz', 'evidence': 'Same defect as #123', 'why': ''}
mem2 = {'merged': [], 'ideas': [], 'open': [('#123', 'Quantum wombat harvest')], 'titles': {'#123': 'Quantum wombat harvest'}}
assert [k for k, _ in m.dup_close(cite, mem2)[0]] == ['#123']
assert m.dup_close({**cite, 'evidence': ''}, mem2)[0] == []
print('ok')
