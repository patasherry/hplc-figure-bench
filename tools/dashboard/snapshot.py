"""Snapshot of the project's state for the Mission Control dashboard.

Reads GitHub only (through the `gh` command line, REST calls) and writes five JSON files of row objects
into the folder given as the first argument: inbox.json, work.json, merged.json, notes.json, health.json.
It changes nothing on GitHub.

Run:  python3 tools/dashboard/snapshot.py out/
"""
import datetime as dt, json, os, re, subprocess, sys
from pathlib import Path

REPO = 'patasherry/hplc-figure-bench'
APP = 'hplc-figure-bench(WF1.13).html'
TRACK = 17
OWNER = REPO.split('/')[0]
NOW = dt.datetime.now(dt.timezone.utc)
ENV = {k: v for k, v in os.environ.items() if k != 'GH_TOKEN'}


def gh(path):
    out = subprocess.run(['gh', 'api', path], capture_output=True, text=True, env=ENV)
    if out.returncode:
        raise RuntimeError(f'gh api {path}: {out.stderr.strip()[:200]}')
    return json.loads(out.stdout or 'null')


def ago(ts):
    return (NOW - dt.datetime.fromisoformat(ts.replace('Z', '+00:00'))).total_seconds() / 3600


def names(i):
    return {l['name'] for l in i.get('labels', [])}


issues = [i for p in (1, 2) for i in gh(f'repos/{REPO}/issues?state=open&per_page=100&page={p}') if 'pull_request' not in i]
prs = gh(f'repos/{REPO}/pulls?state=open&per_page=100')
track = gh(f'repos/{REPO}/issues/{TRACK}/comments?per_page=100')
track += gh(f'repos/{REPO}/issues/{TRACK}/comments?per_page=100&page=2') if len(track) == 100 else []
checkin = next((c for c in reversed(track) if c['body'].startswith('### Lead check-in') and c['user']['login'] == OWNER), None)
digest = next((c for c in reversed(track) if c['body'].startswith('### Daily digest')), None)

# ---------- inbox: what needs Patrick ----------
inbox = []
for i in issues:
    l = names(i)
    if 'needs-owner' in l:
        inbox.append({'number': i['number'], 'title': i['title'], 'why': 'Needs your OK (changes a number the app reports)', 'url': i['html_url'], 'since': i['updated_at']})
    if 'for-antigravity' in l:
        inbox.append({'number': i['number'], 'title': i['title'], 'why': 'Paste into Antigravity', 'url': i['html_url'], 'since': i['updated_at']})
if checkin:
    for line in checkin['body'].splitlines():
        m = re.match(r'\s*[-*]\s*\**Patrick:?\**:?\s*(.+)', line)
        if m:
            inbox.append({'number': TRACK, 'title': m.group(1).strip()[:300], 'why': 'From the lead check-in', 'url': checkin['html_url'], 'since': checkin['created_at']})

# ---------- work: everything open, by stage ----------
STAGES = [('needs-owner', 'Waiting on you'), ('for-coordinator', 'Waiting on the lead'), ('needs-coordinator', 'Waiting on the lead'),
          ('jules-running', 'Jules working'), ('jules-queue', 'Queued for Jules'), ('needs-triage', 'Being sorted')]
work = []
for i in issues:
    if i['number'] == TRACK:
        continue
    l = names(i)
    stage = next((s for lab, s in STAGES if lab in l), None)
    if stage:
        work.append({'number': i['number'], 'title': i['title'], 'stage': stage, 'yours': 'from-patrick' in l,
                     'url': i['html_url'], 'updated': i['updated_at']})
for p in prs:
    work.append({'number': p['number'], 'title': p['title'], 'stage': 'Pull request in review', 'yours': False,
                 'url': p['html_url'], 'updated': p['updated_at']})

# ---------- merged: the last 30 days, by what they changed ----------
merged = []
for page in (1, 2, 3):
    batch = gh(f'repos/{REPO}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page={page}')
    for p in batch:
        if not p.get('merged_at') or ago(p['merged_at']) > 24 * 30:
            continue
        files = [f['filename'] for f in gh(f'repos/{REPO}/pulls/{p["number"]}/files?per_page=100')]
        kind = 'App fix' if APP in files else 'Tests' if all(f.startswith('tests/') for f in files) else 'Tools and docs'
        merged.append({'number': p['number'], 'title': p['title'], 'day': p['merged_at'][:10], 'kind': kind, 'url': p['html_url']})
    if len(batch) < 100 or (batch and ago(batch[-1]['updated_at']) > 24 * 30):
        break
merged.sort(key=lambda r: (r['day'], r['number']), reverse=True)

# ---------- notes: the newest check-in and digest ----------
notes = [{'kind': k, 'at': c['created_at'], 'text': c['body'].split('\n_From the local manager')[0].strip()[:4000], 'url': c['html_url']}
         for k, c in (('Lead check-in', checkin), ('Daily digest', digest)) if c]

# ---------- health: is each part alive ----------
health = []
def runs(wf):
    r = gh(f'repos/{REPO}/actions/workflows/{wf}/runs?per_page=10').get('workflow_runs', [])
    done = [x for x in r if x.get('conclusion') not in (None, 'skipped', 'cancelled')]
    return done[0] if done else None
for part, wf, limit in (('Jules leader (GitHub)', 'jules-leader.yml', 1), ('Test suite (GitHub)', 'tests.yml', 72)):
    try:
        r = runs(wf)
        if not r:
            health.append({'part': part, 'status': 'Unknown', 'detail': 'No finished runs yet', 'at': None})
        else:
            ok = r['conclusion'] == 'success'
            stale = ago(r['updated_at']) > limit and part.startswith('Jules') and any(w['stage'] in ('Jules working', 'Queued for Jules') for w in work)
            health.append({'part': part, 'status': 'Stalled' if stale else 'OK' if ok else 'Last run failed',
                           'detail': f"Last finished run: {r['conclusion']}", 'at': r['updated_at']})
    except Exception as e:
        health.append({'part': part, 'status': 'Unknown', 'detail': str(e)[:150], 'at': None})
mgr = None
for c in gh(f'repos/{REPO}/issues/comments?sort=created&direction=desc&per_page=100'):
    if 'From the local manager' in c['body'] or c['body'].startswith('<!-- local-first-pass -->'):
        mgr = c
        break
health.append({'part': 'Local manager (your PC)', 'status': 'OK' if mgr and ago(mgr['created_at']) < 26 else 'Quiet',
               'detail': 'Last posted on GitHub' if mgr else 'No posts found', 'at': mgr['created_at'] if mgr else None})
health.append({'part': 'Daily digest', 'status': 'OK' if digest and ago(digest['created_at']) < 26 else 'Missing',
               'detail': 'Posted by the local manager each morning', 'at': digest['created_at'] if digest else None})
health.append({'part': 'Lead check-in', 'status': 'OK' if checkin and ago(checkin['created_at']) < 26 else 'Not yet' if not checkin else 'Missing',
               'detail': 'Posted by Claude each morning', 'at': checkin['created_at'] if checkin else None})

# the dashboard can't load an empty file, so an empty inbox is one blank row (number 0) that the page skips
inbox = inbox or [{'number': 0, 'title': '', 'why': '', 'url': '', 'since': None}]

out = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
out.mkdir(parents=True, exist_ok=True)
for name, rows in (('inbox', inbox), ('work', work), ('merged', merged), ('notes', notes), ('health', health)):
    (out / f'{name}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{name}.json: {len(rows)} rows')
