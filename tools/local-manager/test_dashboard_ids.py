"""Every element the dashboard writes to by id must exist in the page. #1395 removed the Running tile but left
the line that fills it, so the whole viewer stopped with "Cannot set properties of null (setting 'textContent')"."""
import re, sys
from pathlib import Path
s = (Path(__file__).resolve().parents[2] / 'tools' / 'dashboard' / 'mission-control.html').read_text(encoding='utf-8')
ids = set(re.findall(r'id="([^"]+)"', s))
used = set(re.findall(r"\$\('([\w-]+)'\)", s))
missing = sorted(used - ids)
print('ok   every id the script uses exists' if not missing else 'FAIL the script uses ids the page lacks: ' + ', '.join(missing))
sys.exit(1 if missing else 0)
