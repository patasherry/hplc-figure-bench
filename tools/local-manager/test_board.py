"""Plain asserts, no network. Tests board timing, throttles and context limits:
python tools/local-manager/test_board.py
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import manager as mgr

# 1. Configuration defaults
assert mgr.BOARD_EVERY == 8, f"Expected BOARD_EVERY=8, got {mgr.BOARD_EVERY}"
assert mgr.BOARD_HOURS == 12, f"Expected BOARD_HOURS=12, got {mgr.BOARD_HOURS}"
assert mgr.BOARD_LOW_QUEUE == 10, f"Expected BOARD_LOW_QUEUE=10, got {mgr.BOARD_LOW_QUEUE}"
assert mgr.BOARD_LOW_HOURS == 4, f"Expected BOARD_LOW_HOURS=4, got {mgr.BOARD_LOW_HOURS}"
assert mgr.AUTO_MAX == 2, f"Expected AUTO_MAX=2, got {mgr.AUTO_MAX}"
assert mgr.AUTO_QUEUE == 20, f"Expected AUTO_QUEUE=20, got {mgr.AUTO_QUEUE}"

# 2. Trigger logic evaluation simulation
def eval_trigger(now, last_at, merged_count, queue_count, last_ux=0, has_ux=False, weekly=False):
    due = (now - last_at) > mgr.BOARD_HOURS * 3600
    low = queue_count < mgr.BOARD_LOW_QUEUE and (now - last_at) > mgr.BOARD_LOW_HOURS * 3600
    if has_ux and (now - last_ux > 86400):
        return 'ux'
    if weekly:
        return 'weekly'
    if merged_count >= mgr.BOARD_EVERY:
        return f'{merged_count} merged PRs'
    if due:
        return f'{mgr.BOARD_HOURS} h since the last meeting'
    if low:
        return 'the work queue is low'
    return ''

t0 = 1000000.0

# 1 hour after last meeting, 2 merged PRs, queue 8 (low), but within 4h cooldown -> should NOT trigger
assert eval_trigger(t0 + 3600, t0, 2, 8) == '', "Low queue within 4h cooldown must not trigger"

# 4.5 hours after last meeting, queue 8 (low), cooldown elapsed -> SHOULD trigger
assert eval_trigger(t0 + 4.5 * 3600, t0, 2, 8) == 'the work queue is low'

# 2 hours after last meeting, 8 merged PRs -> SHOULD trigger on merges
assert eval_trigger(t0 + 2 * 3600, t0, 8, 15) == '8 merged PRs'

# 12.1 hours after last meeting -> SHOULD trigger on due
assert eval_trigger(t0 + 12.1 * 3600, t0, 1, 15) == '12 h since the last meeting'

# UX scope topic deposited 2 hours after last UX walk -> should NOT preempt board
assert eval_trigger(t0 + 2 * 3600, t0, 0, 15, last_ux=t0, has_ux=True) == '', "Recent UX walk must not preempt"

# UX scope topic deposited 25 hours after last UX walk -> SHOULD trigger UX meeting
assert eval_trigger(t0 + 25 * 3600, t0, 0, 15, last_ux=t0, has_ux=True) == 'ux', "Day-old UX walk triggers"

# 3. Verify open issues limit in board_context is expanded to 100
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'manager.py'), 'r', encoding='utf-8') as f:
    src = f.read()

assert '][:100]' in src, "Expected open issues context slice to be [:100]"
assert "pass  # consolidated post at decision" in src, "Expected intermediate round posts to be consolidated"

print("test_board: all asserts passed")
