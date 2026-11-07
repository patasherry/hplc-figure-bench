"""Which queued issues go to Antigravity. Pure functions, no network, no config: tested by test_routing.py.

is_light mirrors LIGHT in .github/scripts/jules-leader.js (line 16); keep the two regexes identical."""
import re

LIGHT_RE = re.compile(r'^(tests?|audit|docs?)\b|^add (a |one )?(failing |ui[- ]level )?(tests?|checks?)\b|^(prove|verify|confirm)\b|\b(\d+|test)_[a-z0-9_]+\b|\b(window\.__HFB|test (suite|report)|compare\.js|failures\.js)\b', re.I)
MAX_TRIES = 2  # Antigravity attempts per issue before it stays with Jules


def is_light(title):
    return bool(LIGHT_RE.search(title or ''))


def kind(title):
    return 'light' if is_light(title) else 'app-changing'


def tries(v):
    """Attempts recorded in ag_tried. Older state stored a timestamp (a float) for one failed attempt."""
    if v is None:
        return 0
    return 1 if isinstance(v, float) or v > 1000 else int(v)


def names(issue):
    return {l['name'] if isinstance(l, dict) else l for l in issue.get('labels', [])}


def eligible(issue, tried, max_tries=MAX_TRIES):
    """Not tried max_tries times already, and not waiting for the owner. from-patrick is allowed."""
    lab = names(issue)
    if tries(tried.get(str(issue['number']))) >= max_tries:
        return False
    return not ('needs-owner' in lab and 'owner-approved' not in lab)


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
