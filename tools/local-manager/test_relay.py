"""Plain asserts, no network, invented content. Imports only relay.py (no manager, no config, no token): python3 tools/local-manager/test_relay.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import relay as rl

APP = '\n'.join([
    'function alphaSum(a, b){',
    '  const t = a + b;',
    '  return t * 2;',
    '}',
    'function betaMean(xs){',
    '  let s = 0;',
    '  for (const x of xs) s += x;',
    '  return s / xs.length;',
    '}',
    'const gammaPick = r => r && r.list ? r.list[0] : null;',
    'function deltaTail(q){',
    '  return q.slice(-1);',
    '}',
])
REQS = {'7-ab12': {'base': 'abc1234567'}}


def resp(verdict='patch', rid='7-ab12', base='abc1234567', extra=None, drop=None, diff=None, test='// tests/suites/99_x.js\nassert(1);'):
    head = {'id': rid, 'base': base, 'verdict': verdict, 'summary': 'Doubled sum is wrong', 'changes-a-reported-number': 'no'}
    if drop:
        head.pop(drop)
    out = rl.RESP_HEAD + '\n' + '\n'.join(f'{k}: {v}' for k, v in head.items()) + '\n\n'
    if verdict == 'patch':
        d = diff if diff is not None else GOOD
        out += 'patch:\n```diff\n' + d + '\n```\n\n'
        if test:
            out += 'test:\n```js\n' + test + '\n```\n'
    elif verdict == 'answer':
        out += 'answer: |\n  It is fine as written.\n  Nothing to change.\n'
    else:
        out += 'need: |\n  lines 5-9 and betaMean()\n'
    return out + rl.RESP_END


GOOD = '''--- a/hplc-figure-bench(WF1.13).html
+++ b/hplc-figure-bench(WF1.13).html
@@ -1,6 +1,6 @@
 function alphaSum(a, b){
   const t = a + b;
-  return t * 2;
+  return t;
 }
 function betaMean(xs){
   let s = 0;'''


def bad(text, kind, frag, reqs=REQS, app=APP):
    try:
        rl.validate(text, reqs, app)
    except rl.Bad as e:
        assert e.kind == kind and frag in e.msg, (e.kind, e.msg)
        return
    raise AssertionError('accepted, expected failure: ' + frag)


# a well-formed patch response parses and passes all six checks
r = rl.validate(resp(), REQS, APP)
assert r['verdict'] == 'patch' and r['summary'] == 'Doubled sum is wrong' and r['files'] == [rl.APP]
assert '-  return t * 2;' in r['patch'] and 'assert(1)' in r['test']

# 1: a missing verdict names the field
bad(resp(drop='verdict'), 'reply', 'verdict')
bad('no block here', 'reply', 'RELAY RESPONSE')
# 1: a patch verdict without a patch block
bad(resp(diff='   ').replace('```diff\n   \n```', ''), 'reply', 'patch')
# 2: unknown id
bad(resp(rid='7-ffff'), 'reply', 'unknown id')
# 3: a different base
bad(resp(base='deadbeef00'), 'stale', 'base')
# 4: context absent from the app at current main (the hunk drifted)
drift = GOOD.replace('   const t = a + b;', '   const t = a + b + 1;')
bad(resp(diff=drift), 'stale', 'hunk 1')
# 4 is a content check, not a sha check: the same hunk still passes when main moved elsewhere (a different base never reaches here)
moved = APP + '\nfunction epsilonNew(){ return 1; }'
assert rl.validate(resp(), REQS, moved)['verdict'] == 'patch'
# ...and a changed line inside the hunk's own context is caught even though the rest is the same
bad(resp(), 'stale', 'hunk 1', app=APP.replace('  let s = 0;', '  let s = 1;'))
# 5: a path outside the allowed set
gh_diff = '''--- a/.github/workflows/x.yml
+++ b/.github/workflows/x.yml
@@ -1,3 +1,3 @@
 name: x
-on: push
+on: pull_request
 jobs:'''
bad(resp(diff=GOOD + '\n' + gh_diff), 'reply', '.github/workflows/x.yml')
bad(resp(diff=gh_diff), 'reply', '.github/workflows/x.yml')
bad(resp(diff=gh_diff.replace('.github/workflows/x.yml', 'tests/../tools/x.py')), 'reply', 'tests/../tools/x.py')
# 5 allows a new test file
newf = '''--- /dev/null
+++ b/tests/suites/99_x.js
@@ -0,0 +1,2 @@
+// invented
+module.exports = 1;'''
assert rl.validate(resp(diff=GOOD + '\n' + newf), REQS, APP)['files'] == [rl.APP, 'tests/suites/99_x.js']
# 6: a patch without a test block
bad(resp(test=None), 'reply', 'test')

# insufficient needs no patch, and asks for ranges and functions
r = rl.validate(resp('insufficient'), REQS, APP)
assert r['verdict'] == 'insufficient' and r['patch'] is None and 'betaMean' in r['need']
rg = rl.ranges_from_need(APP, r['need'], 40)
assert (5, 9) in rg, rg  # betaMean's whole function is lines 5-9 (both the typed range and the function name give it)
# an answer files nothing and carries its text
r = rl.validate(resp('answer'), REQS, APP)
assert r['answer'] == 'It is fine as written.\nNothing to change.' and r['patch'] is None
bad(resp('answer').replace('answer: |\n  It is fine as written.\n  Nothing to change.\n', ''), 'reply', 'answer')

# the request block: excerpt, markers, one RESPONSE grammar inside, nothing else needed
import datetime as dt
t = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
q = rl.build_request('7-ab12', 'abc1234567', APP, 7, t, 'Why double?', 'Is the factor of two right?', [(1, 4)])
assert q.startswith(rl.REQ_HEAD) and q.endswith(rl.REQ_END) and 'expires: 2026-01-01T00:00:00Z' in q
assert '  2:   const t = a + b;' in q and rl.RESP_HEAD in q and rl.RESP_END in q and 'excerpt: ' + rl.APP + ':1-4' in q
assert 'app-digest: ' + rl.digest(APP) in q and len(rl.digest(APP)) == 16
# excerpt picking: a named range is widened by the context, a line number picks its whole function
assert rl.pick_ranges(APP, 'text\nrelay-lines: 5-6', 1) == [(4, 7)]
assert rl.pick_ranges(APP, 'see line 12 here', 1) == [(11, 13)]  # inside deltaTail
assert rl.pick_ranges(APP, 'see line 06 here', 1) == [(5, 9)]  # inside betaMean
assert rl.pick_ranges(APP, 'nothing', 40) is None

# markers: outstanding requests, closed by relay-done
b1, b2 = rl.MARK.format('7-ab12', 'abc1234567'), rl.MARK.format('7-cd34', 'fff')
assert rl.outstanding([b1, 'x', b2]) == {'7-ab12': {'base': 'abc1234567'}, '7-cd34': {'base': 'fff'}}
assert list(rl.outstanding([b1, b2, rl.DONE.format('7-ab12')])) == ['7-cd34'] and rl.request_count([b1, b2, b1]) == 2
# board route: the pure routing decision (go = 4, three advisers, cap = 2)
go, cap = 4, 2
assert rl.is_strong([4, 5, 4], 3, go) and not rl.is_strong([5, 5, 3], 3, go)
assert not rl.is_strong([5], 3, go) and not rl.is_strong([5, 5], 3, go)  # fewer scores than advisers is not strong
assert rl.board_route([5, 4, 4], 3, go, 0, cap) == 'queue'  # every adviser at or above go: the queue
assert rl.board_route([5, 4, 3], 3, go, 0, cap) == 'relay'  # one adviser below: the relay
assert rl.board_route([5, 4, 3], 3, go, 1, cap) == 'relay'
assert rl.board_route([5, 4, 3], 3, go, 2, cap) == 'queue'  # past the per-round cap: the queue again
assert rl.board_route([5, 4, 4], 3, go, 2, cap) == 'queue' and rl.board_route([3, 3, 3], 3, go, 0, 0) == 'queue'
# a simulated round of four split proposals: exactly `cap` take the relay, in order
n = 0
routes = []
for sc in ([3, 4, 5], [2, 4, 4], [5, 5, 5], [3, 3, 4], [4, 3, 4]):
    r = rl.board_route(sc, 3, go, n, cap)
    n += r == 'relay'
    routes.append(r)
assert routes == ['relay', 'relay', 'queue', 'queue', 'queue'], routes
# the board marker is not mistaken for a request or its closing marker
assert rl.MARK_RE.search(rl.BOARD_MARK) is None and rl.DONE_RE.search(rl.BOARD_MARK) is None
assert rl.outstanding([rl.BOARD_MARK + '\n' + rl.MARK.format('7-ab12', 'abc1234567')]) == {'7-ab12': {'base': 'abc1234567'}}
# block scalars parse the same whatever the indent
def blk(key, lines, pad):
    return rl.RESP_HEAD + '\nid: 7-ab12\nbase: abc1234567\nverdict: ' + ('answer' if key == 'answer' else 'insufficient') + \
        '\nsummary: s\nchanges-a-reported-number: no\n\n' + key + ': |\n' + ''.join(pad + l + '\n' for l in lines) + rl.RESP_END
BODY = ['The sum is doubled once.', 'It reads values via either:', '', 'and then halves them.']
for key in ('answer', 'need'):
    want = '\n'.join(BODY)
    for pad in ('', '  ', '    ', '\t'):
        got = rl.parse_response(blk(key, BODY, pad))[key]
        assert got == want, (key, repr(pad), got)
    # a real field name at line start ends the block
    t = blk(key, BODY, '').replace(rl.RESP_END, 'test: nothing\n' + rl.RESP_END)
    assert rl.parse_response(t)[key] == want, key
assert 'indented two spaces' not in rl.RESPONSE_FORMAT

# ---- no-excerpt request (a board-raised issue that names no location). Fixtures have their own names: nothing above is rebound.
exp_at = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)
req_with = rl.build_request('7-ab12', 'abc1234567', APP, 7, exp_at, 'Why double?', 'Is the factor of two right?', [(1, 4)])
req_none = rl.build_request('7-ab12', 'abc1234567', APP, 7, exp_at, 'Why double?', 'Is the factor of two right?', [])
for blockq in (req_with, req_none):  # both are well-formed and carry the response grammar
    assert blockq.startswith(rl.REQ_HEAD) and blockq.endswith(rl.REQ_END) and rl.RESP_HEAD in blockq and rl.RESP_END in blockq
    assert 'response-format: |' in blockq and 'verdict: patch | answer | insufficient' in blockq
assert '  2:   const t = a + b;' in req_with and 'excerpt: ' + rl.APP + ':1-4' in req_with
assert 'excerpt-status' not in req_with and 'verdict: insufficient is the last resort' in req_with and rl.NO_EXCERPT_RULE not in req_with
assert 'excerpt: ' not in req_none and '  2: ' not in req_none and 'excerpt-status: none' in req_none
assert rl.NO_EXCERPT_RULE.split('\n')[0] in req_none and 'verdict: insufficient' in rl.NO_EXCERPT_RULE
assert req_with.split('task:')[0] == req_none.split('task:')[0]  # the header above task: is identical
assert req_none.split('question:')[0] == req_with.split('question:')[0]
req_h = rl.build_request('7-ab12', 'abc1234567', APP, 7, exp_at, 'Add a check', 'Write a UI-level test', [(1, 4)], [('tests/lib/harness.js', 'const open = 1;')])
assert 'file: tests/lib/harness.js' in req_h and '  const open = 1;' in req_h and 'file: ' not in req_with
assert rl.wants_tests('Add UI-level regression test') and rl.wants_tests('x', 'needs a fixture') and not rl.wants_tests('Fix the pool clamp')

assert rl.outstanding([rl.MARK.format('7-ab12', 'abc1234567') + '\n````\n' + req_none + '\n````']) == {'7-ab12': {'base': 'abc1234567'}}
# round 2: a bare function name in need resolves to its whole span
assert rl.ranges_from_need(APP, 'please show betaMean', 40) == [(5, 9)]
assert rl.ranges_from_need(APP, 'the function `deltaTail()`', 40) == [(11, 13)]
# board route with the light flag
assert rl.board_route([5, 4, 3], 3, go, 0, cap, light=False) == 'relay'  # contested + app-changing
assert rl.board_route([5, 4, 3], 3, go, 0, cap, light=True) == 'queue'  # contested + light
assert rl.board_route([5, 4, 4], 3, go, 0, cap, light=False) == 'queue' and rl.board_route([5, 4, 4], 3, go, 0, cap, light=True) == 'queue'  # unanimous
assert rl.board_route([5, 4, 3], 3, go, cap, cap, light=False) == 'queue'  # cap respected

# ---------- picking an excerpt by subject: the first request must carry the right code (it used to carry none) ----------
SECT = '\n'.join(['/* ---------- helpers ---------- */', 'function pad(n){ return n; }'] + ['  x' + str(i) for i in range(5)]
                 + ['/* ---------- gel densitometry: lanes and bands ---------- */', 'function laneProfile(g){ return g; }', '  darkness = 255 - grey;']
                 + ['/* ---------- NanoDrop: protein A280 readings ---------- */', 'function ndConcRaw(x){ return x; }', '  concentration'])
assert [t for _a, _b, t in rl.sections(SECT)] == ['helpers', 'gel densitometry: lanes and bands', 'NanoDrop: protein A280 readings']
# a named function wins, whatever the words say
assert rl.named_defs(SECT, 'laneProfile averages the lane') == [(9, 11)]
assert rl.named_defs(SECT, 'the `ndConcRaw` reading') and not rl.named_defs(SECT, 'nothing here')
# a subject with no identifier and no line number still gets its section, and a rare word beats a common one
gel = rl.section_ranges(SECT, 'densitometry counts grey value, not absorbance', 100)
assert gel and gel[0][0] == 8, gel
nd = rl.section_ranges(SECT, 'the NanoDrop reading is dropped', 100)
assert nd and nd[0][0] == 11, nd
assert rl.pick_ranges(SECT, 'densitometry grey value', 2, 100)  # never None when the text names a subject
assert rl.pick_ranges(SECT, 'zzz qqq', 2, 100) is None          # and None when it names nothing
# ranges never overlap or exceed the budget, and round two keeps what round one sent
assert rl.merge_ranges([(1, 10), (5, 20), (40, 50)], 100) == [(1, 20), (40, 50)]
assert rl.merge_ranges([(1, 100)], 10) == [(1, 10)]
assert rl.ranges_from_need(APP, 'show lines 2-3', 2, 100, had=[(11, 13)]) == [(2, 3), (11, 13)]
assert rl.ranges_from_need(APP, 'no identifier in this prose', 2, 100, had=[(11, 13)]) == [(11, 13)]

print('ok')
