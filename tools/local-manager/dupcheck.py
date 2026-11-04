"""The Direction board's cheap duplicate prefilter. Pure functions, no network, no config: tested by test_dup.py.
manager.py imports words and dup_close from here."""
import re

STOP = set('a an the and or of to in on for with by from is are be it its this that as at into not no do does add make use show fix'.split())


def words(t):
    return {w for w in re.findall(r'[a-z0-9]+', str(t).lower().replace('-', ' ')) if len(w) > 2 and w not in STOP}


def dup_close(p, mem):
    """Candidates worth a closer look: word overlap >= 0.45, scored against the title alone as well as title plus body (a long body must not hide a clear match), plus any open issue the proposal cites as #N. Returns (close, best score)."""
    pw = words(p.get('title', '') + ' ' + p.get('change', ''))
    if not pw:
        return [], 0
    titles = mem.get('titles', {})
    pool = [(k, t) for k, t in mem['merged']] + [(k, t) for k, t in mem['open']] + [(k, f'{t} ({f})') for k, t, f in mem['ideas'] if f != 'open']
    ov = lambda t: len(pw & words(t)) / max(1, min(len(pw), len(words(t))))
    scored = sorted(((max(ov(t), ov(titles[k])) if k in titles else ov(t), k, t) for k, t in pool), reverse=True)
    close = [(k, t) for sc, k, t in scored[:5] if sc >= 0.45]
    cited = {'#' + n for n in re.findall(r'#(\d+)', ' '.join(str(p.get(f, '')) for f in ('evidence', 'why')))}
    close += [(k, t) for sc, k, t in scored if k in cited and k in titles and (k, t) not in close]
    return close, (scored[0][0] if scored else 0)
