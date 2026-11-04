"""Offline relay protocol: pure text in, text out. No network, no GitHub, no config, so tests import it alone.
manager.py does the GitHub side (see relay() there). Protocol: docs/RELAY.md."""
import datetime as dt, hashlib, re, secrets

APP = 'hplc-figure-bench(WF1.13).html'
ALLOWED = re.compile(r'^(hplc-figure-bench\(WF1\.13\)\.html|README\.md|tests/(suites|data|lib|ux)/|tests/README\.md|docs/)')  # same as the gate's in manager.py
REQ_HEAD, REQ_END = '=== HFB-RELAY REQUEST v1 ===', '=== END REQUEST ==='
RESP_HEAD, RESP_END = '=== HFB-RELAY RESPONSE v1 ===', '=== END RESPONSE ==='
MARK = '<!-- relay-req {} {} -->'  # on every request comment: id and base, so the PC and cloud copies agree on what is outstanding
MARK_RE = re.compile(r'<!-- relay-req (\S+) (\S+) -->')
DONE = '<!-- relay-done {} -->'  # on the comment that closes a request (answered, withdrawn, expired)
DONE_RE = re.compile(r'<!-- relay-done (\S+) -->')
SRC = '<!-- relay-src {} -->'  # on every reply: which response comment it answers
SRC_RE = re.compile(r'<!-- relay-src (\d+) -->')

RESPONSE_FORMAT = '''=== HFB-RELAY RESPONSE v1 ===
id: <copy the id from the request>
base: <copy the base from the request>
verdict: patch | answer | insufficient
summary: <one line>
changes-a-reported-number: yes | no

patch:                      (verdict: patch)
```diff
<unified diff, at least three context lines per hunk>
```

test:                       (required when verdict is patch)
```js
<the UI-level case, with its suite filename in a comment>
```

answer: |                   (verdict: answer)
  <your answer, indented two spaces>
need: |                     (verdict: insufficient)
  <the functions or line ranges you need, indented two spaces>
=== END RESPONSE ==='''

ROLE = '''You are reviewing part of a single-file HTML application that produces
protein-purification figures. You cannot browse, fetch or run anything.
Work only from the excerpt below. Reply with exactly one RESPONSE block
in the format given at the end, and nothing else.'''

RULES = ['Reply with one RESPONSE block, nothing before or after it.',
         'Use synthetic, invented numbers in every example, fixture and table.',
         "Never reference, infer or reconstruct the owner's real sequences,\n    chromatograms, gels, readings or yields.",
         'The app is one file, no build step, no dependencies.',
         'Tests are UI level and live in tests/suites/NN_name.js.',
         'A patch is a unified diff with at least three context lines per hunk.',
         'If the excerpt is not enough to answer safely, use verdict: insufficient\n    and name the functions or line ranges you need. Do not guess.']


class Bad(Exception):
    """A response that fails validation. kind: 'reply' (tell the owner what is wrong) or 'stale' (withdraw and send a fresh request)."""
    def __init__(self, kind, msg):
        super().__init__(msg)
        self.kind, self.msg = kind, msg


def digest(app_text):
    return hashlib.sha256(app_text.encode('utf-8')).hexdigest()[:16]


def new_id(issue):
    return f'{issue}-{secrets.token_hex(2)}'


def iso(t):
    return t.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_iso(s):
    return dt.datetime.fromisoformat(s.replace('Z', '+00:00'))


# ---------- excerpts ----------
DEF_RE = re.compile(r'^(async\s+)?function\s+\w+|^(const|let|var)\s+\w+\s*=\s*(async\s*)?(\(|\w+\s*=>|function)')


def span_of_function(lines, n):
    """1-based (from, to) of the top-level definition that contains line n: from its start up to the next top-level definition."""
    n = max(1, min(n, len(lines)))
    a = next((i for i in range(n, 0, -1) if DEF_RE.match(lines[i-1])), None)
    if a is None:
        return None
    b = next((i - 1 for i in range(a + 1, len(lines) + 1) if DEF_RE.match(lines[i-1])), len(lines))
    return a, min(b, a + 300)


def find_def(lines, name):
    pat = re.compile(r'^(async\s+)?function\s+' + re.escape(name) + r'\b|^(const|let|var)\s+' + re.escape(name) + r'\s*=')
    return next((i for i, l in enumerate(lines, 1) if pat.match(l)), None)


def range_in(body):
    m = re.search(r'relay-lines:\s*(\d+)\s*-\s*(\d+)', body or '')
    return (int(m.group(1)), int(m.group(2))) if m else None


def first_line_in(body):
    m = re.search(r'\blines?\s+(\d{2,})|\bL(\d{2,})\b|\.html:(\d{2,})', body or '')
    return int(next(g for g in m.groups() if g)) if m else None


def pick_ranges(app_text, body, ctx):
    """[(from, to)] for the excerpt(s): the named range widened by ctx lines each side, else the whole function around the first line number mentioned, else None."""
    lines = app_text.split('\n')
    r = range_in(body)
    if r:
        a, b = min(r), max(r)
        return [(max(1, a - ctx), min(len(lines), b + ctx))]
    n = first_line_in(body)
    if n:
        sp = span_of_function(lines, n)
        return [sp or (max(1, n - ctx), min(len(lines), n + ctx))]
    return None


def ranges_from_need(app_text, need, ctx):
    """The second round: the line ranges ('120-180') and function names ('ndPoolVol') the offline agent asked for."""
    lines = app_text.split('\n')
    out = [(max(1, min(a, b)), min(len(lines), max(a, b))) for a, b in ((int(x), int(y)) for x, y in re.findall(r'\b(\d+)\s*-\s*(\d+)\b', need))]
    for name in dict.fromkeys(re.findall(r'`?\b([A-Za-z_]\w{2,})\(?\)?`?', need)):
        n = find_def(lines, name)
        if n:
            sp = span_of_function(lines, n)
            if sp and sp not in out:
                out.append(sp)
    return out[:4]


def numbered(app_text, a, b):
    lines = app_text.split('\n')
    return '\n'.join(f'  {i}: {lines[i-1]}' for i in range(a, b + 1))


def build_request(rid, base, app_text, issue, expires, task, question, ranges):
    ex = '\n'.join(f'excerpt: {APP}:{a}-{b}\n{numbered(app_text, a, b)}\n' for a, b in ranges)
    rules = '\n'.join('  - ' + r for r in RULES)
    fmt = '\n'.join('  ' + l for l in RESPONSE_FORMAT.split('\n'))
    ind = lambda t: '\n'.join('  ' + l for l in (t or '').strip().split('\n'))
    one_line = ' '.join((task or '').split())[:200]
    return f'''{REQ_HEAD}
id: {rid}
base: {base}
app: {APP}
app-digest: {digest(app_text)}
issue: {issue}
expires: {iso(expires)}

role: |
{ind(ROLE)}

task: {one_line}

question: |
{ind(question)}

{ex}
rules:
{rules}

response-format: |
{fmt}
{REQ_END}'''


# ---------- parsing a response ----------
FIELDS = ('id', 'base', 'verdict', 'summary', 'changes-a-reported-number')


def _block(s, key):
    m = re.search(r'^' + key + r':[^\n]*\|[^\n]*\n((?:[ \t]+[^\n]*\n?|\n(?=[ \t]))*)', s, re.M)
    if not m:
        return None
    t = m.group(1).rstrip()
    ls = t.split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in ls if l.strip()), default=0)
    return '\n'.join(l[pad:] for l in ls).strip()


def _fenced(s, key, lang):
    m = re.search(r'^' + key + r':[^\n]*\n```' + lang + r'[^\n]*\n(.*?)\n```[ \t]*$', s, re.M | re.S)
    return m.group(1) if m else None


def parse_response(text):
    """The first RESPONSE block in text as a dict. Raises Bad('reply', ...) naming what is missing or wrong."""
    t = (text or '').replace('\r\n', '\n')
    a = t.find(RESP_HEAD)
    if a < 0:
        raise Bad('reply', f'no "{RESP_HEAD}" line found')
    b = t.find(RESP_END, a)
    if b < 0:
        raise Bad('reply', f'no "{RESP_END}" line found')
    body = t[a + len(RESP_HEAD):b]
    r = {}
    for k in FIELDS:
        m = re.search(r'^' + re.escape(k) + r':[ \t]*(\S[^\n]*?)[ \t]*$', body, re.M)
        if not m or m.group(1).startswith('<'):
            raise Bad('reply', f'missing field "{k}"')
        r[k] = m.group(1)
    if r['verdict'] not in ('patch', 'answer', 'insufficient'):
        raise Bad('reply', f'verdict must be patch, answer or insufficient, not "{r["verdict"]}"')
    if r['changes-a-reported-number'] not in ('yes', 'no'):
        raise Bad('reply', 'changes-a-reported-number must be yes or no')
    r['patch'], r['test'] = _fenced(body, 'patch', 'diff'), _fenced(body, 'test', 'js')
    r['answer'], r['need'] = _block(body, 'answer'), _block(body, 'need')
    need = {'patch': 'patch', 'answer': 'answer', 'insufficient': 'need'}[r['verdict']]
    if not (r[need] or '').strip():
        raise Bad('reply', f'missing field "{need}" (required for verdict: {r["verdict"]})')
    return r


# ---------- reading a diff ----------
def parse_diff(diff):
    """[{'path': ..., 'hunks': [{'old': [lines], 'new': [lines]}]}] from a unified diff."""
    files, cur, h = [], None, None
    for l in diff.replace('\r\n', '\n').split('\n'):
        if l.startswith('--- '):
            cur, h = {'old': l[4:].split('\t')[0].strip(), 'path': None, 'hunks': []}, None
            files.append(cur)
        elif l.startswith('+++ ') and cur is not None and cur['path'] is None:
            cur['path'] = l[4:].split('\t')[0].strip()
        elif l.startswith('@@') and cur is not None:
            h = {'old': [], 'new': []}
            cur['hunks'].append(h)
        elif h is not None and l[:1] in (' ', '-', '+'):
            if l[0] in ' -':
                h['old'].append(l[1:])
            if l[0] in ' +':
                h['new'].append(l[1:])
        elif h is not None and l == '':
            h['old'].append(''); h['new'].append('')  # a blank context line whose leading space was lost in pasting
    for f in files:
        for side in ('path', 'old'):
            p = f[side] or ''
            f[side] = None if p == '/dev/null' else re.sub(r'^[ab]/', '', p)
    return files


def hunk_present(app_text, old):
    """True when the hunk's old side (context and removed lines) appears verbatim, contiguous, in the app. Trailing whitespace is ignored."""
    while old and old[-1] == '':
        old = old[:-1]  # trailing blank lines are often lost at the end of a pasted diff
    if not any(l.strip() for l in old):
        return False
    hay = '\n' + '\n'.join(l.rstrip() for l in app_text.split('\n')) + '\n'
    return '\n' + '\n'.join(l.rstrip() for l in old) + '\n' in hay


def check_paths(files):
    for f in files:
        for p in (f['path'], f['old']):
            if p is None:
                continue
            if '..' in p.split('/') or p.startswith('/') or not ALLOWED.match(p):
                raise Bad('reply', f'the diff touches "{p}", which is outside the app, tests/, docs/ and README.md')


def validate(resp_text, requests, app_text):
    """The six checks, in order, stopping at the first failure.
    requests: {id: {'base': ...}} of the open requests on the issue. Returns the parsed response, or raises Bad.
    Check 4 reads the app file at current main (app_text), not a base sha: unrelated merges change the sha without touching the hunk."""
    r = parse_response(resp_text)                                                    # 1
    req = requests.get(r['id'])
    if req is None:                                                                  # 2
        raise Bad('reply', f'unknown id "{r["id"]}": no open request with that id on this issue')
    if r['base'] != req['base']:                                                     # 3
        raise Bad('stale', f'base "{r["base"]}" is not the request\'s base "{req["base"]}"')
    files = parse_diff(r['patch']) if r['verdict'] == 'patch' else []
    if r['verdict'] == 'patch':
        if not files or not any(f['hunks'] for f in files):
            raise Bad('reply', 'the patch block holds no unified diff hunks')
        for f in files:                                                              # 4
            if f['path'] != APP and f['old'] != APP:
                continue
            for i, h in enumerate(f['hunks'], 1):
                if not hunk_present(app_text, h['old']):
                    raise Bad('stale', f'hunk {i} for the app file does not match the app at current main (its context lines are not there verbatim)')
        check_paths(files)                                                           # 5
        if not (r['test'] or '').strip():                                            # 6
            raise Bad('reply', 'a patch needs a "test" block with the UI-level case')
    r['files'] = [f['path'] or f['old'] for f in files]
    return r


def filed_body(r, issue, rid):
    """The body of the issue filed for a passing patch response."""
    num = ('\n\n**This patch changes a reported number.** The PR needs one UI-level check that fails on main and passes on the PR (AGENTS.md, rule for reported numbers), so the gate accepts it.'
           if r['changes-a-reported-number'] == 'yes' else '')
    return (f'From the offline relay: request `{rid}` on #{issue}, answered by an agent with no access to the repository, carried back by Patrick (posting it is his OK).\n\n'
            f'**Summary:** {r["summary"]}{num}\n\n'
            '**Not applied.** The patch was written against an excerpt and checked only for context lines present in the app at the time it was posted. Apply it to current main, rebase where a hunk drifted, run the suites and open the PR through the usual gate. Synthetic data only.\n\n'
            f'### Patch\n\n```diff\n{r["patch"]}\n```\n\n### Test\n\n```js\n{r["test"]}\n```\n')


def outstanding(comment_bodies):
    """{id: {'base': ...}} for the requests among these comment bodies that no relay-done marker has closed."""
    reqs, closed = {}, set()
    for b in comment_bodies:
        for m in MARK_RE.finditer(b):
            reqs[m.group(1)] = {'base': m.group(2)}
        closed.update(DONE_RE.findall(b))
    return {k: v for k, v in reqs.items() if k not in closed}


def request_count(comment_bodies):
    return len({m.group(1) for b in comment_bodies for m in MARK_RE.finditer(b)})


# ---------- Direction board route (docs/RELAY.md, "Board route") ----------
BOARD_MARK = '<!-- relay-board -->'  # on the first request of a board-raised issue: later requests and the expiry fallback read it


def is_strong(scores, n_advisers, go):
    """True when every adviser scored the proposal at `go` or above (scores: list of numbers, one per adviser who voted)."""
    return len(scores) >= max(2, n_advisers) and min(scores) >= go


def board_route(scores, n_advisers, go, relayed, cap):
    """'queue' or 'relay' for an adopted proposal. Strong proposals and anything past the per-round cap go to the work queue;
    the rest go to the relay. `relayed` is how many proposals this round have already taken the relay."""
    if is_strong(scores, n_advisers, go) or relayed >= cap:
        return 'queue'
    return 'relay'
