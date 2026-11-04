"""Plain asserts, no network, no model call. Imports only dupcheck.py (no manager, no config, no token): python3 tools/local-manager/test_dup.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dupcheck import words, dup_close

# The real shape: the proposal (title + change) is LONGER than the candidate's title, so min() in the denominator picks the
# candidate side. Title alone shares 6 of 10 words; title + a padded body has 17 words, so the same 6 shared words score lower.
prop = {'title': 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima',
        'change': 'mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray',
        'evidence': '', 'why': ''}
cand_title = 'alpha bravo charlie delta echo foxtrot zulu yankee xenon walrus'
cand_body = ('thimble quarry lantern pebble orchard cinder ' * 6)[:300]
cand_full = cand_title + ' ' + cand_body
pw = words(prop['title'] + ' ' + prop['change'])
ov = lambda t: len(pw & words(t)) / max(1, min(len(pw), len(words(t))))
assert len(pw) == 24 and len(words(cand_title)) == 10 and len(words(cand_full)) > len(words(cand_title)), (len(pw), len(words(cand_title)), len(words(cand_full)))
assert ov(cand_full) < 0.45 <= ov(cand_title), (ov(cand_full), ov(cand_title))

mem = {'merged': [], 'ideas': [], 'open': [('#10', cand_full)], 'titles': {'#10': cand_title}}
assert [k for k, _ in dup_close(prop, mem)[0]] == ['#10']
assert dup_close(prop, {**mem, 'titles': {}})[0] == []  # without the titles map: the old behaviour, dropped before the model

# a proposal that cites an open issue brings it to the model whatever the word overlap
cite = {'title': 'Something else entirely', 'change': 'zzz', 'evidence': 'Same defect as #123', 'why': ''}
mem2 = {'merged': [], 'ideas': [], 'open': [('#123', 'Quantum wombat harvest')], 'titles': {'#123': 'Quantum wombat harvest'}}
assert [k for k, _ in dup_close(cite, mem2)[0]] == ['#123']
assert dup_close({**cite, 'evidence': ''}, mem2)[0] == []
print('ok')
