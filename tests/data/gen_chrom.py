#!/usr/bin/env python3
"""Synthetic chromatograms with known answers for the HPLC Figure Bench stress suite.

Writes stress/data/chrom/* and the "chrom" section of stress/data/expected.json.
Every trace is a sum of Gaussians (plus optional drift, dip and noise) so the true apex, the true
component centres and the true pool area are known exactly. Fixed seed: reruns give identical files.

Formats covered
  UNICORN 7 CSV, comma, UTF-8            imac_HisTrap_FF_1mL_step_u7.csv
  UNICORN 7 CSV, tab, UTF-16 LE + BOM    imac_HisTrap_HP_5mL_gradient_u7_tab_utf16.csv
  UNICORN 6 CSV, comma, UTF-16 LE + BOM  iex_HiTrap_Q_HP_5mL_u6_comma_utf16.csv
  UNICORN 7 CSV, tab, UTF-8, two plates  sec_Superose6_plates_u7_tab.csv
  UNICORN 7 CSV in minutes               sec_S200_Increase_minutes_u7.csv
  UNICORN 5 .asc with run prefixes       run12_HisTrap_5ml_u5.asc
  UNICORN 7 result archives (.zip)       sec_Sup6_basic_unicorn7.zip, 261022_PS_KPP_polish_001_001.zip (200k points),
                                         sec_Sup6_edge_unicorn7.zip

Conventions recorded in expected.json
  ve        apex (isolated peak) or Gaussian centre (overlapped) in the unit the app should show:
            SEC: counted from the injection. Others: the file's own volume axis.
  must      the app has to report a peak within tol. must=false: allowed but not required (tiny, shoulder, outside the fraction window)
  pool      fractions you would pool, its span, its A280 area (mAU*unit) on a zero baseline, and the mg the app should show
            with eps (A280 of 1 mg/mL, 1 cm) = POOL_EPS and the stated UV path: mg = area/1000/(eps*path_mm/10)
"""
import io, json, math, os, struct, sys, zipfile, csv
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'chrom'); os.makedirs(OUT, exist_ok=True)
RNG = np.random.default_rng(20261022)
POOL_EPS = 1.0

def gauss(x, c, s, h): return h*np.exp(-0.5*((x - c)/s)**2)
def signal(x, comps): return sum((gauss(x, *c) for c in comps), np.zeros_like(x))
def area(comps, a, b, n=20001):
    x = np.linspace(a, b, n); return float(np.trapezoid(signal(x, comps), x))
def frac_events(start, size, labels): return [(round(start + i*size, 4), l) for i, l in enumerate(labels)] + [(round(start + len(labels)*size, 4), 'Waste')]
def plate_labels(n, plates=(1, 2)):
    out = []
    for p in plates:
        for r in 'ABCDEFGH':
            for c in range(1, 13):
                out.append(f'{p}.{r}.{c}')
    return out[:n]
def pool_span(ev, first, last):
    xs = [x for x, _ in ev]; lab = [l for _, l in ev]; i, j = lab.index(first), lab.index(last); return xs[i], xs[j + 1]

EXP = []

# ---------------------------------------------------------------- writers
def write_unicorn_csv(path, curves, delim=',', enc='utf-8', bom=False, top='Chrom.1'):
    """curves: list of (name, xunit, yunit, xs, ys) with ys None for event curves where xs are (x, text) pairs"""
    cols = []
    for name, xu, yu, xs, ys in curves:
        if ys is None: cols.append((name, xu, yu, [f'{x:.4f}' for x, _ in xs], [t for _, t in xs]))
        else: cols.append((name, xu, yu, [f'{v:.4f}' for v in xs], [f'{v:.3f}' for v in ys]))
    n = max(len(c[3]) for c in cols); buf = io.StringIO(); w = csv.writer(buf, delimiter=delim, lineterminator='\r\n')
    w.writerow(sum(([top, ''] for _ in cols), [])); w.writerow(sum(([c[0], ''] for c in cols), [])); w.writerow(sum(([c[1], c[2]] for c in cols), []))
    for i in range(n): w.writerow(sum(([c[3][i], c[4][i]] if i < len(c[3]) else ['', ''] for c in cols), []))
    data = buf.getvalue()
    with open(path, 'wb') as f:
        if enc == 'utf-16-le': f.write(b'\xff\xfe' + data.encode('utf-16-le'))
        else: f.write((b'\xef\xbb\xbf' if bom else b'') + data.encode('utf-8'))

def write_u5_asc(path, prefix, curves):
    """UNICORN 5 .asc: tab separated, curve names carry the run prefix (run12:10_UV1_280nm), units row, then data"""
    cols = []
    for name, xu, yu, xs, ys in curves:
        if ys is None: cols.append((prefix + name, xu, yu, [f'{x:.3f}' for x, _ in xs], [t for _, t in xs]))
        else: cols.append((prefix + name, xu, yu, [f'{v:.3f}' for v in xs], [f'{v:.3f}' for v in ys]))
    n = max(len(c[3]) for c in cols); lines = ['\t'.join(sum(([c[0], ''] for c in cols), [])), '\t'.join(sum(([c[1], c[2]] for c in cols), []))]
    for i in range(n): lines.append('\t'.join(sum(([c[3][i], c[4][i]] if i < len(c[3]) else ['', ''] for c in cols), [])))
    with open(path, 'w', encoding='latin-1', newline='') as f: f.write('\r\n'.join(lines) + '\r\n')

# .NET BinaryFormatter single-primitive array, as UNICORN 7 stores CoordinateData.*
def net_floats(vals):
    a = np.asarray(vals, dtype='<f4'); return (b'\x00' + struct.pack('<iiii', 1, -1, 1, 0) + b'\x0f' + struct.pack('<ii', 1, len(a)) + b'\x0b' + a.tobytes() + b'\x0b')
def zip64_bytes(entries):
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in entries:
            with z.open(zipfile.ZipInfo(name, date_time=(2026, 10, 22, 9, 0, 0)), 'w', force_zip64=True) as f: f.write(data)
    return bio.getvalue()
def inner_curve(xs, ys):
    return zip64_bytes([('CoordinateData.AmplitudesDataType', b'System.Single[]\r\n'), ('CoordinateData.Amplitudes', net_floats(ys)),
                        ('CoordinateData.VolumesDataType', b'System.Single[]\r\n'), ('CoordinateData.Volumes', net_floats(xs))])

def xml_esc(s): return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def write_unicorn_zip(path, cv, curves, events, flow):
    """curves: list of dict(name, type, yu, xs, ys, num, uvpath?, original?). events: dict(kind -> list of (vol, text))"""
    files = []; cx = []
    head = ('<Chromatogram xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" FormatVersion="9" UNICORNVersion="7.10.0.2756">'
            '<ChromatogramName>Chrom.1</ChromatogramName><IsReadonly>false</IsReadonly><TimeUnit>min</TimeUnit><VolumeUnit>ml</VolumeUnit>'
            '<Created>2026-10-22T09:00:00.000</Created><CreatedUtcOffsetMinutes>-420</CreatedUtcOffsetMinutes>')
    cx.append(head + '<Curves>')
    for c in curves:
        fn = f'Chrom.1_{c["num"]}_True'; files.append((fn, inner_curve(c['xs'], c['ys'])))
        uv = ''
        if c.get('uvpath') is not None:
            uv = (f'<CurveUVInfo><IsUVValuesNormalizedToNominalUVPathLength>true</IsUVValuesNormalizedToNominalUVPathLength><UVPathLength>{c["uvpath"]}</UVPathLength>'
                  f'<NominalUVPathLength>{c["uvpath"]}</NominalUVPathLength><IsSystemProvided>true</IsSystemProvided></CurveUVInfo>')
        cx.append(f'<Curve CurveDataType="{c["type"]}"><Name>{xml_esc(c["name"])}</Name><IsoChroneType>{"Volume" if c.get("original") is False else "Time"}</IsoChroneType>'
                  f'<InjectionEventCurve><CurveNumber>12</CurveNumber></InjectionEventCurve><IsExternal>false</IsExternal><ScanInterval>0</ScanInterval>'
                  f'<TimeUnit>min</TimeUnit><VolumeUnit>ml</VolumeUnit><AmplitudePrecision>3</AmplitudePrecision><AmplitudeUnit>{xml_esc(c["yu"])}</AmplitudeUnit>'
                  f'<IsOriginalData>{"false" if c.get("original") is False else "true"}</IsOriginalData><IsReadOnly>false</IsReadOnly><CompressionDesc></CompressionDesc>'
                  f'<CurveNumber>{c["num"]}</CurveNumber><ColumnVolume>{cv}</ColumnVolume><ColumnVolumeUnitName>ml</ColumnVolumeUnitName>'
                  f'<CurvePoints><CurvePoint><IsFullResolution>true</IsFullResolution><BinaryCurvePointsFileName>{fn}</BinaryCurvePointsFileName></CurvePoint></CurvePoints><GuidePoints />{uv}</Curve>')
    cx.append('</Curves><EventCurves>')
    names = {'Fraction': ('Fraction', 11), 'Injection': ('Injection', 12), 'Logbook': ('Run Log', 22)}
    for kind, evs in events.items():
        nm, num = names[kind]
        cx.append(f'<EventCurve EventCurveType="{kind}"><Name>{nm}</Name><TimeUnit>min</TimeUnit><VolumeUnit>ml</VolumeUnit><IsOriginalData>true</IsOriginalData>'
                  f'<CurveNumber>{num}</CurveNumber><ColumnVolume>{cv}</ColumnVolume><ColumnVolumeUnitName>ml</ColumnVolumeUnitName><Events>')
        for v, t in evs:
            et = 'Injection' if kind == 'Injection' else 'Method'
            cx.append(f'<Event EventType="{et}" EventSubType="Undefined"><EventTime>{v/flow:.5f}</EventTime><EventVolume>{v:.5f}</EventVolume><EventText>{xml_esc(t)}</EventText><InstructionFeedback>0</InstructionFeedback></Event>')
        cx.append('</Events></EventCurve>')
    cx.append('</EventCurves><PoolTables /><PeakTables /></Chromatogram>')
    xml = ''.join(cx).encode('utf-8')
    stub = lambda tag: f'<{tag} FormatVersion="1" />'.encode('utf-8')
    entries = [('CalibrationSettingData', b'\x00'*64), ('Chrom.1.Xml', xml)] + files + [
        ('Manifest.xml', b'<ExportManifest FormatVersion="1"><Details><FileName>Result.xml</FileName><FileType>Result</FileType></Details></ExportManifest>'),
        ('Result.xml', stub('Result')), ('MethodData', b'\x00'*128), ('SystemData', b'\x00'*128)]
    with open(path, 'wb') as f: f.write(zip64_bytes(entries))

def add(rec): EXP.append(rec)
def mg_of(a, path_mm): return a/1000/(POOL_EPS*path_mm/10)

# ---------------------------------------------------------------- A. IMAC step, UNICORN 7 CSV, comma, UTF-8
def imac_step():
    fn = 'imac_HisTrap_FF_1mL_step_u7.csv'; x = np.round(np.arange(0, 70.0001, 0.05), 4)
    comps = [(12.0, 4.0, 1500.0), (51.6, 0.45, 900.0)]          # flow-through hump, elution peak
    y = signal(x, comps) + RNG.normal(0, 0.6, x.size)
    pb = np.where(x >= 50, 100.0, 0.0); cond = np.where(x >= 50, 22.0, 30.0)
    labels = [f'T{i}' for i in range(1, 13)]; ev = frac_events(50.0, 1.0, labels)
    log = [(0.0, 'Method Run 10/22/2026 9:00:00 AM -07:00 Method: HisTrap 1 mL FF step Result: /DefaultHome/imac_step 001'), (0.0, 'Base CV, 0.962 {ml}, HisTrap FF, 1 ml'),
           (0.0, 'Phase Equilibration'), (5.0, 'Phase Sample Application'), (35.0, 'Phase Wash'), (50.0, 'Phase Elution')]
    write_unicorn_csv(os.path.join(OUT, fn), [('UV', 'ml', 'mAU', x, y), ('Conductivity', 'ml', 'mS/cm', x, cond), ('Gradient Concentration', 'ml', '%B', x, pb),
                                              ('Fraction', 'ml', 'Fraction', ev, None), ('Injection', 'ml', 'Injection', [(0.0, '')], None), ('Run Log', 'ml', 'Logbook', log, None)])
    a, b = pool_span(ev, 'T1', 'T3'); ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 7 CSV, comma, UTF-8', kind='imac', step='IMAC', unit='mL', column='HisTrap FF 1 mL', cv=0.962, flow=None, path_mm=2,
             frac=dict(n=12, first='T1', last='T12'), injection=0.0,
             peaks=[dict(ve=51.6, tol=0.08, must=True, note='step elution peak'), dict(ve=12.0, tol=0.5, must=False, note='flow-through, outside the fraction window')],
             pool=dict(label='T1-T3', a=a, b=b, area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=round(mg_of(ar, 2), 4))))

# ---------------------------------------------------------------- B. IMAC linear gradient, tab, UTF-16 LE BOM, flow and temperature curves
def imac_grad():
    fn = 'imac_HisTrap_HP_5mL_gradient_u7_tab_utf16.csv'; x = np.round(np.arange(0, 90.0001, 0.05), 4)
    comps = [(48.0, 0.7, 400.0), (50.5, 0.6, 600.0)]            # two overlapping peaks, resolution about 1 (a clear valley)
    y = signal(x, comps) + RNG.normal(0, 1.0, x.size)
    pb = np.clip((x - 30)/50*100, 0, 100); cond = 28 - 0.05*pb
    labels = [f'T{i}' for i in range(1, 41)]; ev = frac_events(30.0, 1.25, labels)
    log = [(0.0, 'Method Run 10/22/2026 10:00:00 AM -07:00 Method: HisTrap HP 5 mL gradient Result: /DefaultHome/grad 001'), (0.0, 'Base CV, 4.909 {ml}, HisTrap HP, 5 ml')]
    write_unicorn_csv(os.path.join(OUT, fn), [('UV 1_280', 'ml', 'mAU', x, y), ('Cond', 'ml', 'mS/cm', x, cond), ('Conc B', 'ml', '%B', x, pb),
                                              ('System flow', 'ml', 'ml/min', x[::10], np.full(x[::10].size, 5.0)), ('Cond temp', 'ml', '°C', x[::10], np.full(x[::10].size, 4.0)),
                                              ('Fraction', 'ml', 'Fraction', ev, None), ('Run Log', 'ml', 'Logbook', log, None)], delim='\t', enc='utf-16-le')
    a, b = pool_span(ev, 'T14', 'T18'); ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 7 CSV, tab, UTF-16 LE with BOM', kind='imac', step='IMAC', unit='mL', column='HisTrap HP 5 mL', cv=4.909, flow=5.0, temp=4.0, path_mm=2,
             frac=dict(n=40, first='T1', last='T40'), injection=None,
             peaks=[dict(ve=48.0, tol=0.3, must=True, note='overlapping, left component'), dict(ve=50.5, tol=0.3, must=True, note='overlapping, right component')],
             pool=dict(label='T14-T18', a=a, b=b, area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=round(mg_of(ar, 2), 4))))

# ---------------------------------------------------------------- C. anion exchange, UNICORN 6 CSV, comma, UTF-16 LE BOM: shoulder, drift, dip, noise
def iex():
    fn = 'iex_HiTrap_Q_HP_5mL_u6_comma_utf16.csv'; x = np.round(np.arange(0, 70.0001, 0.04), 4)
    comps = [(40.0, 0.8, 300.0), (41.3, 0.5, 90.0), (46.0, 0.6, 40.0)]
    dip = [(36.0, 0.15, -25.0)]
    y = signal(x, comps) + signal(x, dip) + 0.4*x + RNG.normal(0, 0.8, x.size)
    pb = np.clip((x - 30)/30*100, 0, 100); cond = 5 + 0.9*pb
    labels = [f'A{i}' for i in range(1, 13)] + [f'B{i}' for i in range(1, 13)]; ev = frac_events(30.0, 1.0, labels)
    log = [(0.0, 'Method Run 10/22/2026 11:00:00 AM -07:00 Method: Q HP anion exchange Result: /DefaultHome/q 001'), (0.0, 'Base CV, 4.909 {ml}, HiTrap Q HP, 5 ml')]
    write_unicorn_csv(os.path.join(OUT, fn), [('UV1_280nm', 'ml', 'mAU', x, y), ('Cond', 'ml', 'mS/cm', x, cond), ('Conc', 'ml', '%', x, pb),
                                              ('Fractions', 'ml', '(Fractions)', ev, None), ('Logbook', 'ml', '(Logbook)', log, None)], delim=',', enc='utf-16-le')
    add(dict(file=fn, format='UNICORN 6 CSV, comma, UTF-16 LE with BOM', kind='iex', step='Anion exchange', unit='mL', column='HiTrap Q HP 5 mL', cv=4.909, flow=None, path_mm=2,
             frac=dict(n=24, first='A1', last='B12'), injection=None,
             peaks=[dict(ve=40.0, tol=0.25, must=True, note='main peak with a shoulder'), dict(ve=41.3, tol=0.35, must=False, note='shoulder'),
                    dict(ve=46.0, tol=0.15, must=True, note='small late peak on a drifting baseline')],
             forbid=[dict(ve=36.0, tol=0.3, note='negative dip, never a peak')],
             pool=None))

# ---------------------------------------------------------------- D. UNICORN 5 .asc, run prefix
def u5():
    fn = 'run12_HisTrap_5ml_u5.asc'; x = np.round(np.arange(0, 60.0001, 0.1), 3)
    comps = [(8.0, 3.0, 1800.0), (42.4, 0.7, 700.0)]
    y = signal(x, comps) + RNG.normal(0, 0.5, x.size)
    pb = np.where(x >= 40, 100.0, 0.0); cond = np.where(x >= 40, 20.0, 31.0)
    labels = [f'A{i}' for i in range(1, 13)]; ev = frac_events(40.0, 1.0, labels)
    write_u5_asc(os.path.join(OUT, fn), 'run12:10_', [('UV1_280nm', 'ml', 'mAU', x, y), ('Cond', 'ml', 'mS/cm', x, cond), ('Conc', 'ml', '%', x, pb),
                                                     ('Fractions', 'ml', '(Fractions)', ev, None), ('Logbook', 'ml', '(Logbook)', [(0.0, 'Method: his5'), (40.0, 'Block Elution')], None)])
    a, b = pool_span(ev, 'A2', 'A5'); ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 5 .asc with run prefix', kind='imac', step='IMAC', unit='mL', column='HisTrap 5 mL', cv=None, flow=None, path_mm=2,
             frac=dict(n=12, first='A1', last='A12'), injection=None,
             peaks=[dict(ve=42.4, tol=0.12, must=True, note='step elution peak'), dict(ve=8.0, tol=0.5, must=False, note='flow-through, outside the window')],
             pool=dict(label='A2-A5', a=a, b=b, area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=round(mg_of(ar, 2), 4))))

# ---------------------------------------------------------------- E. SEC in minutes, UNICORN 7 CSV
def sec_min():
    fn = 'sec_S200_Increase_minutes_u7.csv'; inj = 3.0; flow = 0.5; t = np.round(np.arange(0, 60.0001, 0.02), 4)
    ve = [8.8, 14.2, 16.5]; comps = [(inj + v/flow, s/flow, h) for v, s, h in [(8.8, 0.25, 8.0), (14.2, 0.45, 120.0), (16.5, 0.4, 35.0)]]
    y = signal(t, comps) + RNG.normal(0, 0.3, t.size)
    labels = plate_labels(72); ev = [(0.0, 'Waste')] + [(round(inj + 10 + 0.5*i, 3), l) for i, l in enumerate(labels)] + [(round(inj + 10 + 0.5*72, 3), 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 1:00:00 PM -07:00 Method: S200 Increase sizing Result: /DefaultHome/s200 001')]
    write_unicorn_csv(os.path.join(OUT, fn), [('UV 1_280', 'min', 'mAU', t, y), ('Cond', 'min', 'mS/cm', t, np.full(t.size, 15.2)), ('Conc B', 'min', '%B', t, np.zeros(t.size)),
                                              ('Fraction', 'min', 'Fraction', ev, None), ('Injection', 'min', 'Injection', [(inj, '')], None), ('Run Log', 'min', 'Logbook', log, None)])
    # pool by time
    lab = [l for _, l in ev]; xs = [x for x, _ in ev]; i0 = lab.index('1.C.10'); i1 = lab.index('1.D.4')
    a, b = xs[i0], xs[i1 + 1]; ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 7 CSV, comma, UTF-8, time axis in minutes', kind='sec', step='Size exclusion', unit='min', column='Superdex 200 Increase 10/300 GL', cv=None, flow=None, path_mm=2,
             frac=dict(n=72, first='1.A.1', last='1.F.12'), injection=inj,
             peaks=[dict(ve=round(v/flow, 3), tol=0.15, must=True, note=f'Ve {v} mL at 0.5 mL/min, minutes from injection') for v in ve],
             pool=dict(label='1.C.10-1.D.4', a=a - inj, b=b - inj, area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=None, unit_note='area in mAU*min, no mg on a time axis without a flow')))

# ---------------------------------------------------------------- F. SEC with two plates, UNICORN 7 CSV, tab, UTF-8, injection at 4.0 mL
def sec_plates_csv():
    fn = 'sec_Superose6_plates_u7_tab.csv'; inj = 4.0; x = np.round(np.arange(0, 32.0001, 0.01), 4)
    vs = [(9.0, 0.3, 10.0), (15.6, 0.45, 95.0), (18.4, 0.35, 25.0)]
    comps = [(inj + v, s, h) for v, s, h in vs]; y = signal(x, comps) + RNG.normal(0, 0.25, x.size)
    labels = plate_labels(110); ev = [(0.0, 'Waste')] + [(round(inj + 6 + 0.2*i, 3), l) for i, l in enumerate(labels)] + [(round(inj + 6 + 0.2*110, 3), 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 2:00:00 PM -07:00 Method: Sup6 All-in-one Result: /DefaultHome/sup6 001'), (0.0, 'Base CV, Vc=23.562 {ml}, Superose 6 Increase 10/300 GL')]
    write_unicorn_csv(os.path.join(OUT, fn), [('UV 1_280', 'ml', 'mAU', x, y), ('Cond', 'ml', 'mS/cm', x, np.full(x.size, 14.8)), ('Conc B', 'ml', '%B', x, np.zeros(x.size)),
                                              ('Fraction', 'ml', 'Fraction', ev, None), ('Injection', 'ml', 'Injection', [(inj, '')], None), ('Run Log', 'ml', 'Logbook', log, None)], delim='\t')
    lab = [l for _, l in ev]; xs = [x for x, _ in ev]; i0 = lab.index('1.D.9'); i1 = lab.index('1.E.4'); a, b = xs[i0], xs[i1 + 1]; ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 7 CSV, tab, UTF-8, two 96-well plates, injection at 4.0 mL', kind='sec', step='Size exclusion', unit='mL', column='Superose 6 Increase 10/300 GL', cv=23.562, flow=None, path_mm=2,
             frac=dict(n=110, first='1.A.1', last=labels[-1]), injection=inj,
             peaks=[dict(ve=v, tol=0.08, must=True, note='Ve from injection') for v, _, _ in vs],
             pool=dict(label='1.D.9-1.E.4', a=round(a - inj, 4), b=round(b - inj, 4), area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=round(mg_of(ar, 2), 4))))

# ---------------------------------------------------------------- G. UNICORN 7 result zip modelled on fdh_run.zip
def sec_zip_basic():
    fn = 'sec_Sup6_basic_unicorn7.zip'; inj = 29.46053; flow = 0.5; x = np.round(np.arange(0, 60.0001, 0.001667), 5).astype(float)
    vs = [(8.6, 0.25, 6.0), (15.3, 0.45, 80.0), (17.9, 0.4, 20.0)]
    comps = [(inj + v, s, h) for v, s, h in vs]; y = signal(x, comps) + RNG.normal(0, 0.2, x.size)
    xs4 = x[::20]
    cut = signal(x, [(inj + 12.0, 0.3, 500.0)])                   # derived curve with a big false peak: must be ignored
    labels = plate_labels(102)
    fr = [(inj + 0.0, 'Waste')] + [(inj + 5.0 + 0.2*i, l) for i, l in enumerate(labels)] + [(inj + 5.0 + 0.2*102, 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 2:33:23 PM -07:00 Method: Sup6 All-in-one Result: /DefaultHome/261022_PS_KPP_Sup6 All-in-one 001 001 User Default at computer LAB is in control'),
           (0.0, 'Batch ID: 00000000-0000-0000-0000-000000000001'), (0.0, 'Base CV, Vc=23.562 {ml}, Superose 6 Increase 10/300 GL'),
           (0.0, 'Phase Equilibration'), (inj - 0.5, 'Phase Sample Application'), (inj, 'Phase Elution')]
    curves = [dict(name='UV', type='UV', yu='mAU', xs=x, ys=y, num=1, uvpath=2),
              dict(name='Conductivity', type='Conduction', yu='mS/cm', xs=xs4, ys=np.full(xs4.size, 15.1), num=2),
              dict(name='Conc B', type='Other', yu='%B', xs=xs4, ys=np.zeros(xs4.size), num=3),
              dict(name='Flow', type='Other', yu='ml/min', xs=xs4, ys=np.full(xs4.size, flow), num=4),
              dict(name='UV_CUT_TEMP@100,BASEM', type='UV', yu='mAU', xs=x, ys=cut, num=5, original=False),
              dict(name='Pressure', type='Pressure', yu='MPa', xs=xs4, ys=np.full(xs4.size, 1.2), num=6),
              dict(name='Temperature', type='Temperature', yu='°C', xs=xs4, ys=np.full(xs4.size, 21.5), num=7),
              dict(name='UV cell path length', type='Other', yu='cm', xs=xs4, ys=np.full(xs4.size, 0.2), num=38)]
    write_unicorn_zip(os.path.join(OUT, fn), 23.562, curves, {'Fraction': fr, 'Injection': [(inj, '')], 'Logbook': log}, flow)
    i0 = labels.index('1.D.12'); i1 = labels.index('1.E.8'); a, b = 5.0 + 0.2*i0 + inj, 5.0 + 0.2*(i1 + 1) + inj; ar = area(comps, a, b)
    add(dict(file=fn, format='UNICORN 7 result archive (.zip, zip64 curve entries, float32 arrays)', kind='sec', step='Size exclusion', unit='mL', column='Superose 6 Increase 10/300 GL', cv=23.562, flow=flow, temp=21.5, path_mm=2,
             frac=dict(n=102, first='1.A.1', last=labels[-1]), injection=inj,
             peaks=[dict(ve=v, tol=0.08, must=True, note='Ve from injection') for v, _, _ in vs],
             forbid=[dict(ve=12.0, tol=0.3, note='peak only in the derived UV_CUT_TEMP@100,BASEM curve')],
             pool=dict(label='1.D.12-1.E.8', a=round(a - inj, 4), b=round(b - inj, 4), area=round(ar, 2), area_tol_pct=4, eps=POOL_EPS, mg=round(mg_of(ar, 2), 4))))

# ---------------------------------------------------------------- H. 200k-point zip, no SEC hint in the file name, overlaps, shoulder, tiny peak, drift, dip, 10 mm path
def sec_zip_hard():
    fn = '261022_PS_KPP_polish_001_001.zip'; inj = 12.0; flow = 0.75; n = 200000; x = np.linspace(0, 45, n)
    vs = [(10.5, 0.4, 60.0), (11.3, 0.4, 45.0), (14.0, 0.45, 90.0), (14.9, 0.35, 25.0), (18.5, 0.3, 0.6)]
    comps = [(inj + v, s, h) for v, s, h in vs]
    y = signal(x, comps) + 0.15*(x - inj).clip(0) + signal(x, [(inj + 19.8, 0.08, -8.0)]) + RNG.normal(0, 0.4, n)
    xs4 = x[::50]
    labels = plate_labels(32); fr = [(inj + 0.0, 'Waste')] + [(inj + 6.0 + 0.5*i, l) for i, l in enumerate(labels)] + [(inj + 6.0 + 0.5*32, 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 4:00:00 PM -07:00 Method: Polish run Result: /DefaultHome/261022_PS_KPP_polish 001 001'), (0.0, 'Base CV, Vc=24.000 {ml}, Superdex 200 Increase 10/300 GL')]
    curves = [dict(name='UV 1_280', type='UV', yu='mAU', xs=x, ys=y, num=1, uvpath=10),
              dict(name='Conductivity', type='Conduction', yu='mS/cm', xs=xs4, ys=np.full(xs4.size, 16.0) + RNG.normal(0, 0.02, xs4.size), num=2),
              dict(name='Conc B', type='Other', yu='%B', xs=xs4, ys=np.zeros(xs4.size), num=3),
              dict(name='Flow', type='Other', yu='ml/min', xs=xs4, ys=np.full(xs4.size, flow), num=4),
              dict(name='UV cell path length', type='Other', yu='cm', xs=xs4, ys=np.full(xs4.size, 1.0), num=38)]
    write_unicorn_zip(os.path.join(OUT, fn), 24.0, curves, {'Fraction': fr, 'Injection': [(inj, '')], 'Logbook': log}, flow)
    add(dict(file=fn, format='UNICORN 7 result archive, 200,000 points, no SEC word in the file name', kind='sec', step='Size exclusion', unit='mL', column='Superdex 200 Increase 10/300 GL', cv=24.0, flow=flow, path_mm=10,
             frac=dict(n=32, first='1.A.1', last=labels[-1]), injection=inj,
             peaks=[dict(ve=10.5, tol=0.25, must=True, note='overlapping pair, left'), dict(ve=11.3, tol=0.25, must=False, note='overlapping pair, right (resolution 0.5, no valley)'),
                    dict(ve=14.0, tol=0.2, must=True, note='main peak'), dict(ve=14.9, tol=0.35, must=False, note='shoulder on the main peak'),
                    dict(ve=18.5, tol=0.3, must=False, note='tiny peak, under 1% of the area')],
             forbid=[dict(ve=19.8, tol=0.25, note='negative dip')],
             pool=None, slow_ok_s=15))

# ---------------------------------------------------------------- I. peak at the very edge of the fraction range
def sec_zip_edge():
    fn = 'sec_Sup6_edge_unicorn7.zip'; inj = 1.0; flow = 0.5; x = np.round(np.arange(0, 30.0001, 0.002), 5).astype(float)
    vs = [(12.0, 0.4, 40.0), (16.0, 0.4, 70.0)]
    comps = [(inj + v, s, h) for v, s, h in vs]; y = signal(x, comps) + RNG.normal(0, 0.2, x.size); xs4 = x[::20]
    labels = plate_labels(20); fr = [(inj + 0.0, 'Waste')] + [(inj + 6.0 + 0.5*i, l) for i, l in enumerate(labels)] + [(inj + 16.0, 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 5:00:00 PM -07:00 Method: Sup6 All-in-one Result: /DefaultHome/edge 001'), (0.0, 'Base CV, Vc=23.562 {ml}, Superose 6 Increase 10/300 GL')]
    curves = [dict(name='UV', type='UV', yu='mAU', xs=x, ys=y, num=1, uvpath=2), dict(name='Conductivity', type='Conduction', yu='mS/cm', xs=xs4, ys=np.full(xs4.size, 15.0), num=2),
              dict(name='Conc B', type='Other', yu='%B', xs=xs4, ys=np.zeros(xs4.size), num=3), dict(name='Flow', type='Other', yu='ml/min', xs=xs4, ys=np.full(xs4.size, flow), num=4)]
    write_unicorn_zip(os.path.join(OUT, fn), 23.562, curves, {'Fraction': fr, 'Injection': [(inj, '')], 'Logbook': log}, flow)
    add(dict(file=fn, format='UNICORN 7 result archive, main peak apex at the last fraction boundary', kind='sec', step='Size exclusion', unit='mL', column='Superose 6 Increase 10/300 GL', cv=23.562, flow=flow, path_mm=2,
             frac=dict(n=20, first='1.A.1', last=labels[-1]), injection=inj,
             peaks=[dict(ve=12.0, tol=0.08, must=True, note='inside the fractions'), dict(ve=16.0, tol=0.1, must=True, note='apex exactly at the end of the fraction range')],
             pool=None))

# ---------------------------------------------------------------- J. units behind the mg estimate (the "mg" list in expected.json)
# One Gaussian, 1 mg/mL = 1 A280 (eps 1), 10 mm path typed on the card. mg = area in mAU*mL / 1000 / (eps*path/10).
# On a time axis the area is mAU*min, so mg also needs the flow: area_mAU*mL = area_mAU*min * flow.
MG = []
def mg_run(fn, xu, yu, flow_curve, scale=1.0):
    x = np.round(np.arange(0, 40.0001, 0.01), 4); comps = [(20.0, 0.5, 2000.0)]
    y = signal(x, comps)*scale                                   # no noise: the area is exact
    ev = frac_events(17.0, 1.0, [f'F{i}' for i in range(1, 7)]); cur = [('UV', xu, yu, x, y), ('Fraction', xu, 'Fraction', ev, None)]
    if flow_curve: cur.append(('System flow', xu, 'ml/min', x[::10], np.full(x[::10].size, 0.5)))
    write_unicorn_csv(os.path.join(OUT, fn), cur)
    return area(comps, 17.0, 23.0)
def hplc_min_flow():
    fn = 'hplc_min_flow_known_u7.csv'; ar = mg_run(fn, 'min', 'mAU', True)
    MG.append(dict(file=fn, note='x in minutes, flow 0.5 mL/min in the file, mAU', unit='min', flow=0.5, pool='F1-F6', path_mm=10, eps=POOL_EPS, area=round(ar, 2), mg=round(ar*0.5/1000/(POOL_EPS*1.0), 4)))
def hplc_min_noflow():
    fn = 'hplc_min_flow_missing_u7.csv'; ar = mg_run(fn, 'min', 'mAU', False)
    MG.append(dict(file=fn, note='x in minutes, no flow in the file: no mg until a flow is typed (0.5 mL/min)', unit='min', flow=None, typed_flow=0.5, pool='F1-F6', path_mm=10, eps=POOL_EPS, area=round(ar, 2), mg=None, mg_with_flow=round(ar*0.5/1000/(POOL_EPS*1.0), 4)))
def au_trace():
    fn = 'hplc_au_ml_u7.csv'; ar = mg_run(fn, 'ml', 'AU', False, 0.001)
    MG.append(dict(file=fn, note='y in AU (not mAU), x in mL', unit='mL', flow=None, pool='F1-F6', path_mm=10, eps=POOL_EPS, area=round(ar/1000, 4), mg=round(ar/1000/(POOL_EPS*1.0), 4)))

if __name__ == '__main__':
    for f in (imac_step, imac_grad, iex, u5, sec_min, sec_plates_csv, sec_zip_basic, sec_zip_hard, sec_zip_edge, hplc_min_flow, hplc_min_noflow, au_trace): f()
    p = os.path.join(HERE, 'expected.json'); doc = json.load(open(p)) if os.path.exists(p) else {}
    doc['mg'] = MG
    doc['chrom'] = EXP; doc['chrom_note'] = __doc__.split('Conventions recorded in expected.json')[1].strip()
    json.dump(doc, open(p, 'w'), indent=1); print(f'{len(EXP)} chromatograms -> {OUT}')
