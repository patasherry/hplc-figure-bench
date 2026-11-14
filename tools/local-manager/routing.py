"""Which queued issues go to Antigravity. Pure functions, no network, no config: tested by test_routing.py.

is_light was mirrored from the Jules leader's LIGHT regex. Jules was removed on 2026-11-12, so nothing mirrors it now."""
import re

LIGHT_RE = re.compile(r'^(tests?|audit|docs?)\b|^add (a |one )?(failing |ui[- ]level )?(tests?|checks?)\b|^(prove|verify|confirm)\b|\b(\d+|test)_[a-z0-9_]+\b|\b(window\.__HFB|test (suite|report)|compare\.js|failures\.js)\b', re.I)
MAX_TRIES = 2  # Antigravity attempts per issue before it returns to the queue


def is_light(title):
    t = title or ''
    if re.match(r'^bug\b', t, re.I):
        return False
    return bool(LIGHT_RE.search(t))


def kind(title):
    return 'light' if is_light(title) else 'app-changing'


def tries(v):
    """Attempts recorded in ag_tried. Older state stored a timestamp (a float) for one failed attempt."""
    if v is None:
        return 0
    return 1 if isinstance(v, float) or v > 1000 else int(v)


def names(issue):
    return {l['name'] if isinstance(l, dict) else l for l in issue.get('labels', [])}


HOLD_LABELS = {'needs-plan', 'parked'}


def is_held(issue):
    """True when an issue carries needs-plan, parked, or unapproved needs-owner."""
    lab = names(issue)
    if lab & HOLD_LABELS:
        return True
    return 'needs-owner' in lab and 'owner-approved' not in lab


def eligible(issue, tried, max_tries=MAX_TRIES):
    """Not tried max_tries times already, and not held (needs-plan, parked, or unapproved needs-owner). from-patrick is allowed."""
    if tries(tried.get(str(issue['number']))) >= max_tries:
        return False
    return not is_held(issue)


def changes_existing_check(err_or_probs):
    """True when a gate failure or problem list is because the change deletes, changes or comments out an existing test check.
    Workers are forbidden from changing existing checks, so retrying burns quota on a job only the lead or owner can settle."""
    items = err_or_probs if isinstance(err_or_probs, (list, tuple, set)) else [str(err_or_probs or '')]
    return any('deletes or changes' in str(x) and 'existing check' in str(x) or 'comments out existing tests' in str(x) for x in items)


REQ_START_RE = re.compile(
    r'^\s*(?:[-*•]|\d+[.)])?\s*(?:please\s+)?'
    r'(?:update|remove|add|replace|change|make|implement|create|keep|save|restore|preserve|default|when\s+switched|'
    r'when\s+on|when\s+off|hide|show|reveal|enable|disable|require|do\s+not|don\'t|rename|move|fix|support|allow|ensure|set|use|drop|clear)\b',
    re.I
)
DISCUSS_Q_RE = re.compile(
    r'\b(?:what\s+should|how\s+should|should\s+we|which\s+is\s+better|trade-?offs?|pros\s+and\s+cons|thoughts\s+on|what\s+do\s+you\s+think|options\s+for|review\s+this|brainstorm)\b',
    re.I
)


def is_request_spec(text):
    """True when a 'Discuss: ...' text is written as instructions/spec ('do this') rather than an open question for the board ('what should we do')."""
    lines = [l.strip() for l in (text or '').strip().splitlines() if l.strip()]
    if not lines:
        return False
    first = lines[0]
    if '?' in first or DISCUSS_Q_RE.search(first):
        return False
    imp = sum(1 for l in lines if REQ_START_RE.match(l))
    if re.search(r'\bas\s+follows\s*:\s*$', first, re.I) and len(lines) >= 2:
        return True
    if imp >= 3 and '?' not in (text or ''):
        return True
    if len(lines) >= 4 and imp / len(lines) >= 0.5 and '?' not in (text or ''):
        return True
    return False


def pick(queue, tried, limit, max_tries=MAX_TRIES):
    """Up to `limit` issues to hand over: the newest app-changing ones first. Only if none are app-changing, the newest light ones, so the worker never idles."""
    ok = [i for i in queue if eligible(i, tried, max_tries)]
    hard = [i for i in ok if not is_light(i.get('title'))]
    pool = hard or ok
    return sorted(pool, key=lambda i: i['number'], reverse=True)[:max(0, limit)]


def prefer_unlocked(waiting, busy_secs, secs_of):
    """Keep waiting items in priority order, but put items whose app sections do not overlap `busy_secs` ahead of overlapping ones."""
    if not busy_secs or len(waiting) <= 1:
        return list(waiting)
    free, locked = [], []
    for item in waiting:
        iss = item[0] if isinstance(item, tuple) else item
        (locked if (secs_of(iss) & busy_secs) else free).append(item)
    return free + locked
