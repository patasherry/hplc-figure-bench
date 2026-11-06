"""Offline relay protocol: pure text in, text out. No network, no GitHub, no config, so tests import it alone.
manager.py does the GitHub side (see relay() there). Protocol: docs/RELAY.md."""
import datetime as dt, hashlib, re, secrets

APP = 'hplc-figure-bench(WF1.13).html'
MAX_LINES = 1400  # total excerpt lines per request: these are the hard jobs, and the agent reading them has room for whole sections
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
  <your answer>
need: |                     (verdict: insufficient)
  <the functions or line ranges you need>
=== END RESPONSE ==='''

ROLE = '''You are reviewing part of a single-file HTML application that produces
protein-purification figures. You cannot browse, fetch or run anything.
Work only from the excerpt below. Reply with exactly one RESPONSE block
in the format given at the end, and nothing else.'''

RULES = ['Reply with one RESPONSE block, nothing before or after it.',
         'Use synthetic, invented numbers in every example, fixture and table.',
         "Never reference, infer or reconstruct the owner's real sequences,\n    chromatograms, gels, readings or yields.",
         'The app is one file, no build step, no dependencies.',
         'Tests are UI level and live in tests/suites/NN_name.js. A test uses this repository\'s own harness\n'
         "    (const {open, H, suite, src} = require('../lib/harness')), never @playwright/test, and asserts on\n"
         '    what the page shows. The harness is included below.',
         'A patch is a unified diff with at least three context lines per hunk.',
         'The excerpt is chosen by subject and is not the whole file. Answer from what you can see:\n'
         "    if the function the task is about is in front of you, do not ask for more.",
         'verdict: insufficient is the last resort. When you use it, name in need the exact\n'
         '    function names (as they are spelled in the code) or line numbers you want, and nothing else:\n'
         '    a description of a subject cannot be turned into an excerpt, so it wastes the round.',
         'If you cannot write a safe patch but can say what the fix is, use verdict: answer\n'
         '    with the reasoning and the exact change you would make. That is worth more than insufficient.']


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
    """1-based line of the definition of `name`, indented or not. Most of the app's functions sit inside the IIFE, so anchoring at column 0 missed them."""
    pat = re.compile(r'\s*(?:async\s+)?function\s+' + re.escape(name) + r'\b|\s*(?:const|let|var)\s+' + re.escape(name) + r'\s*=')
    return next((i for i, l in enumerate(lines, 1) if pat.match(l)), None)


# ---------- picking an excerpt by subject, so the first request already carries the right code ----------
STOP = set('''a an and are as at be been but by can for from has have how in into is it its must no not of on or
that the their then there these this to was were what when which will with without your you about after again all
also any because before being both does each few further had having here him his i if into itself just like me
more most my nor now once only other our out over own same should so some such than too under until up very we
who whom why would issue app code line lines file files test tests check checks fix fixes change changes problem
report reported number numbers value values function functions please provide need needed relevant complete
ranges range existing interface interfaces implementation
one two three every each result results summary summaries panel panels section sections option options display
shown show text texts value values data name names step steps set sets make made work works used use using
add added new old same other first last full whole part parts list lists item items field fields label labels
view views mode modes state states ui dom level levels synthetic fixture fixtures acceptance canonical independent kind type types way ways thing things output outputs input inputs'''.split())


BOILER = re.compile(r'(?im)^(?:from (?:claude science|the offline relay|the board)\b.*|a fix that changes a reported number.*|\*\*the board raised this one.*|posting it there is his OK.*|owner-approved\. synthetic data only\.?.*|synthetic data only\.?)$')


def subject(text):
    """The part of an issue that says what the problem is, without the manager's own preamble.
    A filed finding starts with a paragraph about approval and testing rules, and matching on those words picks the wrong sections."""
    t = (text or '').replace('\r\n', '\n')
    parts = re.split(r'(?m)^---+\s*$', t)
    if len(parts) > 1 and len(parts[-1].strip()) > 120:
        t = parts[-1]  # the finding itself, below the preamble's rule
    t = BOILER.sub('', t)
    return re.sub(r'^.*relay-lines:.*$', '', t, flags=re.M).strip()


def _words(text):
    t = (text or '')
    w = {x.lower() for x in re.findall(r'[A-Za-z][A-Za-z0-9]{2,}', t)}
    w |= {x.lower() for x in re.findall(r'\b[A-Z]{2,5}\b', t)}  # acronyms the app uses in its own section titles: SEC, UV, HPLC
    return {x.rstrip('s') for x in w if x not in STOP} - STOP


SECTION_RE = re.compile(r'^\s*/\* -+ (.+?) -+ \*/\s*$')


def sections(app_text):
    """[(from, to, title)] for the app's '/* ---------- name ---------- */' sections, which are how AGENTS.md says to navigate the file."""
    lines = app_text.split('\n')
    marks = [(i, m.group(1).strip()) for i, l in enumerate(lines, 1) for m in [SECTION_RE.match(l)] if m]
    return [(a, (marks[k+1][0] - 1 if k + 1 < len(marks) else len(lines)), t) for k, (a, t) in enumerate(marks)]


def section_ranges(app_text, text, budget, skip=()):
    """The sections whose title and body best match the words of `text`, biggest score first, up to `budget` lines in total.
    This is what makes a first request useful for an issue that names no line: a gel question gets the gel sections."""
    want = _words(text)
    if not want:
        return []
    lines, out, used = app_text.split('\n'), [], 0
    secs = [(a, b, title, _words(title)) for a, b, title in sections(app_text)]
    # a word in many section titles ("run", "figure") says little about which section is meant; a rare one ("nanodrop") says a lot
    spread = {}
    for _a, _b, _t, tw in secs:
        for w in tw:
            spread[w] = spread.get(w, 0) + 1
    scored = []
    for a, b, title, tw in secs:
        hits = sum(1.0/spread[w] for w in (want & tw))
        body = _words('\n'.join(lines[a-1:b]))
        # the title carries the subject; a big section matches many words just by being big, so its body counts for little
        scored.append((8*hits + min(len(want & body), 2)/2.0, hits, a, b, title))
    titled = [x for x in scored if x[1]]
    pool = titled or [x for x in scored if x[0] >= 1]  # once any section's title matches, sections that only share body words are noise
    best = max((x[0] for x in pool), default=0)
    for score, _h, a, b, _t in sorted((x for x in pool if x[0] >= max(1.0, best/2)), key=lambda x: (-x[0], x[1])):
        if any(a <= s_b and s_a <= b for s_a, s_b in skip):
            continue
        n = b - a + 1
        if used + n > budget:
            if used:
                continue
            b = a + budget - 1  # one section bigger than the whole budget: send its head
            n = budget
        out.append((a, min(b, len(lines)))); used += n
        if used >= budget or len(out) >= 4:
            break
    return out


def merge_ranges(rs, limit):
    """Sorted, non-overlapping ranges, within a total line limit, so two picks never send the same code twice."""
    out = []
    for a, b in sorted((min(a, b), max(a, b)) for a, b in rs):
        if out and a <= out[-1][1] + 1:
            out[-1] = (out[-1][0], max(out[-1][1], b))
        else:
            out.append((a, b))
    kept, used = [], 0
    for a, b in out:
        if used >= limit:
            break
        b = min(b, a + (limit - used) - 1)
        kept.append((a, b)); used += b - a + 1
    return kept


QUOTED = re.compile(r"[\u2018\u2019'\"\u201c\u201d`]([^\u2018\u2019'\"\u201c\u201d`\n]{4,60})[\u2018\u2019'\"\u201c\u201d`]")


def literal_ranges(app_text, text, ctx):
    """Ranges around the quoted phrases of `text` that appear verbatim in the app.
    A UI issue quotes what it is about ("Choose data files"), and that string sits next to the code that draws it,
    which no amount of subject matching will find: the words of a button are not the words of a section title."""
    lines, out = app_text.split('\n'), []
    for ph in dict.fromkeys(QUOTED.findall(text or '')):
        ph = ph.strip()
        if len(ph) < 4 or not re.search(r'[A-Za-z]', ph) or re.fullmatch(r'[\w.()/-]+', ph):
            continue  # an identifier or a path: named_defs and the range steps cover those
        low = ph.lower()
        hits = [i for i, l in enumerate(lines, 1) if low in l.lower()][:2]
        for n in hits:
            sp = span_of_function(lines, n)
            out.append(sp if sp and sp[1] - sp[0] <= 200 else (max(1, n - ctx), min(len(lines), n + ctx)))
    return out


def named_defs(app_text, text):
    """Ranges of the functions `text` names (backticked or not), in the order named."""
    lines, out = app_text.split('\n'), []
    # backticked, called with parens, or bare camelCase: in this codebase an inner capital almost always means a function
    for name in dict.fromkeys(re.findall(r'`([A-Za-z_]\w{2,})`|\b([a-z][A-Za-z0-9]{2,})\(\)|\b([a-z]+[A-Z][A-Za-z0-9]*)\b', text or '')):
        nm = name[0] or name[1] or name[2]
        if nm in STOP:
            continue
        n = find_def(lines, nm)
        if n:
            sp = span_of_function(lines, n)
            if sp:
                out.append(sp)
    return out


def range_in(body):
    m = re.search(r'relay-lines:\s*(\d+)\s*-\s*(\d+)', body or '')
    return (int(m.group(1)), int(m.group(2))) if m else None


def first_line_in(body):
    m = re.search(r'\blines?\s+(\d{2,})|\bL(\d{2,})\b|\.html:(\d{2,})', body or '')
    return int(next(g for g in m.groups() if g)) if m else None


def pick_ranges(app_text, body, ctx, budget=MAX_LINES):
    """[(from, to)] for the excerpt(s), best signal first: an explicit relay-lines range, a line number, the functions the
    text names, then the sections whose subject matches its words. Only None when the text gives no signal at all.

    The last step is what keeps a request to one round: an issue that names no line (every board-raised one) used to go out
    with no code, so the answer was always 'insufficient, send me these functions'."""
    lines = app_text.split('\n')
    r = range_in(body)
    if r:
        a, b = min(r), max(r)
        return [(max(1, a - ctx), min(len(lines), b + ctx))]
    body = subject(body)
    out = []
    n = first_line_in(body)
    if n:
        out.append(span_of_function(lines, n) or (max(1, n - ctx), min(len(lines), n + ctx)))
    out += named_defs(app_text, body)
    out += literal_ranges(app_text, body, ctx)
    out = merge_ranges(out, budget)
    used = sum(b - a + 1 for a, b in out)
    room = (budget - used) if not out else min(budget - used, budget//4)  # a named function or a quoted string is the real location: sections only top it up
    if room > 40:
        out = merge_ranges(out + section_ranges(app_text, body, room, skip=out), budget)
    return out or None


def ranges_from_need(app_text, need, ctx, budget=MAX_LINES, had=()):
    """The second round: what the agent asked for. Explicit ranges and named functions first, then a subject match on its prose,
    because a need is usually written in words ('grey-value to absorbance conversion') and names no identifier.
    `had` is what the earlier request already carried, so round two always adds code instead of repeating it."""
    lines = app_text.split('\n')
    out = [(max(1, min(a, b)), min(len(lines), max(a, b))) for a, b in ((int(x), int(y)) for x, y in re.findall(r'\b(\d+)\s*-\s*(\d+)\b', need or ''))]
    out += named_defs(app_text, need)
    out += literal_ranges(app_text, need, ctx)
    out = merge_ranges(out, budget)
    used = sum(b - a + 1 for a, b in out)
    if used < budget:
        out = merge_ranges(out + section_ranges(app_text, need, budget - used, skip=out), budget)
    return merge_ranges(list(out) + [r for r in had], budget) if out else merge_ranges(list(had), budget)


def numbered(app_text, a, b):
    lines = app_text.split('\n')
    return '\n'.join(f'  {i}: {lines[i-1]}' for i in range(a, b + 1))


NO_EXCERPT = ('excerpt-status: none. No excerpt could be cut because the issue names no location in the app.\n'
              'You cannot see the code. Do not guess a patch.\n')
NO_EXCERPT_RULE = ('You have no excerpt, so you cannot see the code. Reply with verdict: insufficient and, in need,\n'
                   '    name the functions or line ranges you want to see.')


TEST_WORDS = re.compile(r'\btest|\bcheck|\bfixture|\bsuite|\bregression|\bharness|\bmain-failing', re.I)


BOARD_TAIL = re.compile(r'###\s*Why the advisers chose it|<details><summary>The debate', re.I)


def wants_tests(*texts):
    """True when the job itself is about writing a check. Such a request carries the harness, because every agent asked for it otherwise.
    A board issue carries the whole debate, where somebody always says "test", so only the statement above it counts."""
    return any(TEST_WORDS.search(BOARD_TAIL.split(t or '')[0]) for t in texts)


def build_request(rid, base, app_text, issue, expires, task, question, ranges, extra=()):
    """With ranges: the numbered excerpts. With none (a board-raised issue that names no location): no excerpt body, an
    'excerpt-status: none' line and one extra rule asking for verdict: insufficient with the functions wanted.
    extra: [(path, text)] whole files to include, such as the test harness for a job that asks for a check."""
    ex = '\n'.join(f'excerpt: {APP}:{a}-{b}\n{numbered(app_text, a, b)}\n' for a, b in ranges) if ranges else NO_EXCERPT
    for path, text in extra:
        body = '\n'.join('  ' + l for l in (text or '').split('\n'))
        ex += f'\nfile: {path}\n{body}\n'
    rules = '\n'.join('  - ' + r for r in (RULES if ranges else RULES + [NO_EXCERPT_RULE]))
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


FIELD_RE = r'(?:id|base|verdict|summary|changes-a-reported-number|patch|test|answer|need)'


def _block(s, key):
    """Text after 'key: |' up to the next known field name at the start of a line (or the end), common indent removed. Flush-left, spaces or tabs all work."""
    m = re.search(r'^' + key + r':[^\n]*\|[^\n]*\n(.*?)(?=^' + FIELD_RE + r':|\Z)', s, re.M | re.S)
    if not m:
        return None
    t = m.group(1).rstrip()
    ls = t.split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in ls if l.strip()), default=0)
    return '\n'.join(l[pad:] for l in ls).strip()


def _fenced(s, key, lang):
    """The fenced block after 'key:'. Written loosely on purpose, because a response is pasted by hand from a chat window:
    blank or comment lines may sit between the label and the fence, the fence may be ``` or ~~~ or longer, indented, and
    tagged with anything or nothing (an agent writes ```patch or ```javascript as readily as ```diff). The one rejection
    we have seen, on #1015, was a well-formed answer with a blank line after 'patch:'."""
    m = re.search(r'^[ \t]*' + key + r':[^\n]*\n'          # the label
                  r'(?:[ \t]*(?:#[^\n]*)?\n)*'              # blank lines, or a comment line, before the fence
                  r'[ \t]*(`{3,}|~{3,})[ \t]*\w*[^\n]*\n'  # the opening fence, any tag or none
                  r'(.*?)'
                  r'\n[ \t]*\1[ \t]*(?:\n|\Z)', s, re.M | re.S)
    if not m:
        return None
    body = m.group(2)
    pad = min((len(l) - len(l.lstrip()) for l in body.split('\n') if l.strip()), default=0)
    # a plain diff starts at column 0 so pad is 0 and nothing moves; an indented fence needs the indent off or no hunk matches
    return '\n'.join(l[pad:] for l in body.split('\n')) if pad else body


def _field(s, key, lang):
    """A patch or test block however it was written: fenced, or as a 'key: |' block when the agent used the style of the
    other fields. Fenced first, since that is what the request asks for."""
    return _fenced(s, key, lang) or _block(s, key)


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
    r['patch'], r['test'] = _field(body, 'patch', 'diff'), _field(body, 'test', 'js')
    r['answer'], r['need'] = _block(body, 'answer'), _block(body, 'need')
    need = {'patch': 'patch', 'answer': 'answer', 'insufficient': 'need'}[r['verdict']]
    if not (r[need] or '').strip():
        seen = sorted({m.group(1) for m in re.finditer(r'(?m)^[ \t]*(' + FIELD_RE + r'):', body)})
        raise Bad('reply', f'verdict is {r["verdict"]}, so a "{need}" block is required, and I could not read one. '
                           f'The labels I found were: {", ".join(seen) or "none"}. '
                           f'Write it as "{need}:" at the start of a line with the content in a fenced block under it '
                           f'(a blank line, any fence tag and longer fences are all fine)')
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


def same_sha(a, b):
    """True when two commit shas name the same commit. The request carries a 10-character prefix and an agent may echo the
    full 40, or a shorter abbreviation: git compares shas by prefix and so do we, from 7 characters, which is git's own floor."""
    a, b = (a or '').strip().lower(), (b or '').strip().lower()
    if not (a and b) or not all(re.fullmatch(r'[0-9a-f]{7,40}', x) for x in (a, b)):
        return a == b
    n = min(len(a), len(b))
    return a[:n] == b[:n]


def validate(resp_text, requests, app_text):
    """The six checks, in order, stopping at the first failure.
    requests: {id: {'base': ...}} of the open requests on the issue. Returns the parsed response, or raises Bad.
    Check 4 reads the app file at current main (app_text), not a base sha: unrelated merges change the sha without touching the hunk."""
    r = parse_response(resp_text)                                                    # 1
    req = requests.get(r['id'])
    if req is None:                                                                  # 2
        raise Bad('reply', f'there is no open request with the id "{r["id"]}" on this issue. '
                           'Either it was already answered and filed, or it expired, or the id was mistyped: '
                           'check the newest request comment for the id to echo')
    if not same_sha(r['base'], req['base']):                                         # 3
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


def board_route(scores, n_advisers, go, relayed, cap, light=False):
    """'queue' or 'relay' for an adopted proposal. Strong proposals, light ones (routing.is_light) and anything past the per-round
    cap go to the work queue; contested app-changing ones go to the relay. `relayed` is how many proposals this round already took it."""
    if light or is_strong(scores, n_advisers, go) or relayed >= cap:
        return 'queue'
    return 'relay'
