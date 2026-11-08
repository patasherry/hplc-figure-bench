"""Plain asserts, no network, invented content. Imports only routing.py: python3 tools/local-manager/test_routing.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import routing as rt


def iss(n, title, *labels):
    return {'number': n, 'title': title, 'labels': [{'name': x} for x in labels]}


# the light test matches the leader's wording
assert rt.is_light('Test the zoom box') and rt.is_light('audit of tags') and rt.is_light('Docs: fix typo')
assert rt.is_light('Add a failing test for ticks') and rt.is_light('verify the ladder')
assert rt.is_light('26_sec_calibration reaches into window.__HFB') and rt.is_light('796_tag_mass crashes')
assert rt.is_light('test_nanodrop_units fails on main') and rt.is_light('The test report merges suites that share a number')
assert not rt.is_light('Fix overlapping tick labels') and not rt.is_light('Testing harness drifts')
assert not rt.is_light('Bug found by 22_protein/10_cleavage_consistency:threw')
assert not rt.is_light('Bug: SEC calibration calculation error')

# mixed queue: the app-changing issue wins even though a light one is newer
q = [iss(10, 'Fix baseline slope'), iss(12, 'Test the legend'), iss(11, 'Docs: wording')]
assert [i['number'] for i in rt.pick(q, {}, 1)] == [10]
# only light issues: still returns something, newest first
ql = [iss(3, 'Test a'), iss(5, 'Audit b')]
assert [i['number'] for i in rt.pick(ql, {}, 1)] == [5]
# empty queue
assert rt.pick([], {}, 2) == []

# tried once: still eligible; twice: not. Old timestamp state counts as one attempt
qa = [iss(20, 'Fix axis'), iss(21, 'Fix legend')]
assert [i['number'] for i in rt.pick(qa, {'21': 1}, 2)] == [21, 20]
assert [i['number'] for i in rt.pick(qa, {'21': 2}, 2)] == [20]
assert [i['number'] for i in rt.pick(qa, {'21': 1.7e9}, 2)] == [21, 20]
assert rt.tries(1.7e9) == 1 and rt.tries(None) == 0 and rt.tries(2) == 2

# needs-owner is excluded (unless owner-approved), from-patrick is not
qo = [iss(30, 'Fix a', 'needs-owner'), iss(31, 'Fix b', 'from-patrick'), iss(32, 'Fix c', 'needs-owner', 'owner-approved')]
assert [i['number'] for i in rt.pick(qo, {}, 5)] == [32, 31]

# the per-pass limit holds, and a zero limit hands out nothing
qm = [iss(n, 'Fix item %d' % n) for n in range(40, 46)]
assert len(rt.pick(qm, {}, 2)) == 2 and [i['number'] for i in rt.pick(qm, {}, 2)] == [45, 44]
assert rt.pick(qm, {}, 0) == []
assert rt.kind('Fix x') == 'app-changing' and rt.kind('Test x') == 'light'

# board routing: contested + app-changing goes to the relay; contested + light and unanimous go to the queue; the cap holds
import relay as rl
go, cap = 4, 2
contested, unanimous = [5, 4, 3], [5, 4, 4]
route = lambda sc, title, done=0: rl.board_route(sc, 3, go, done, cap, rt.is_light(title))
assert route(contested, 'Widen the legend box') == 'relay'
assert route(contested, 'Test the legend box') == 'queue'
assert route(unanimous, 'Widen the legend box') == 'queue' and route(unanimous, 'Test the legend box') == 'queue'
assert route(contested, 'Widen the legend box', cap) == 'queue'
# section-aware conflict avoidance: non-overlapping jobs go ahead of jobs touching a busy section
smap = {1: {'gels'}, 2: {'nanodrop'}, 3: {'gels', 'ui'}}
wPairs = [(iss(1, 'Fix gel crop'), 'for-antigravity'), (iss(2, 'Fix nanodrop units'), 'for-antigravity'), (iss(3, 'Fix gel UI'), 'for-antigravity')]
assert [x[0]['number'] for x in rt.prefer_unlocked(wPairs, {'gels'}, lambda i: smap[i['number']])] == [2, 1, 3]
assert [x[0]['number'] for x in rt.prefer_unlocked(wPairs, set(), lambda i: smap[i['number']])] == [1, 2, 3]
print('test_routing: all asserts passed')
