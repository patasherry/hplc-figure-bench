"""Fixtures for suites/20_science.js. Run: python3 -I gen_science.py (writes next to this file).
sec_inject2.csv: an AKTA-style SEC export logged from method start, injection at 2.00 mL.
  Peaks at 14.00 and 17.00 mL of run volume, so elution volumes counted from injection are 12.00 and 15.00 mL.
nd3.csv: three NanoDrop readings, A280 Abs 1.40, 1.42, 1.44 (mean 1.42, n 3), sample type 1 Abs = 1 mg/mL."""
import math, os, json
D = os.path.dirname(os.path.abspath(__file__))
INJ, PEAKS = 2.0, [(14.0, 120.0, 0.35), (17.0, 40.0, 0.40)]
xs = [round(i*0.02, 3) for i in range(int(30/0.02) + 1)]
uv = [sum(h*math.exp(-0.5*((x - c)/s)**2) for c, h, s in PEAKS) for x in xs]
fr = [(round(INJ + 3 + 0.5*i, 2), f"1.{'ABCDEFGH'[i//12]}.{i%12 + 1}") for i in range(40)]
logs = [(0.0, "Method Run 10/02/2026 2:10:04 PM -07:00 Method: Test SEC S200 Increase 10-300   Result: /DefaultHome/Test SEC 001"), (0.0, "Base CV, 23.562 {ml}, Any"), (INJ, "InjectionValve Inject")]
n = max(len(xs), len(fr), len(logs))
rows = ["Chrom.1,,Chrom.1,,Chrom.1,,Chrom.1,,Chrom.1,,Chrom.1,", "UV 1_280,,Conductivity,,Gradient Concentration,,Fraction,,Injection,,Run Log,", "ml,mAU,ml,mS/cm,ml,%B,ml,Fraction,ml,Injection,ml,Logbook"]
for i in range(n):
    c = []
    c += [f"{xs[i]:.3f}", f"{uv[i]:.4f}", f"{xs[i]:.3f}", "15.2000", f"{xs[i]:.3f}", "0.0000"] if i < len(xs) else ["", "", "", "", "", ""]
    c += [f"{fr[i][0]:.3f}", f'"{fr[i][1]}"'] if i < len(fr) else ["", ""]
    c += [f"{INJ:.3f}", '"1"'] if i == 0 else ["", ""]
    c += [f"{logs[i][0]:.3f}", f'"{logs[i][1]}"'] if i < len(logs) else ["", ""]
    rows.append(",".join(c))
open(os.path.join(D, "sec_inject2.csv"), "w").write("\n".join(rows) + "\n")
wl = list(range(220, 351))
def spec(a): return [a*(0.25 + 1.8*math.exp(-((w - 220)/14)**2)) if w < 250 else a*math.exp(-((w - 278)/16)**2) for w in wl]
hdr = "Sample Name,Date & Time,A280 Conc. (mg/mL),A260/A280,A280 (Abs),A260 (Abs),Sample Type,Baseline Correction (nm)," + ",".join(map(str, wl))
lines = [hdr] + [f"Sample {i+1},10/7/2026 14:1{i},{a:.3f},0.57,{a:.3f},{0.57*a:.3f},1 Abs = 1 mg/mL,340," + ",".join(f"{v:.3f}" for v in spec(a)) for i, a in enumerate([1.40, 1.42, 1.44])]
open(os.path.join(D, "nd3.csv"), "w").write("\n".join(lines) + "\n")
json.dump({"sec_inject2.csv": {"injection_ml": INJ, "ve_from_injection": [12.0, 15.0]}, "nd3.csv": {"abs_mean": 1.42, "n": 3}}, open(os.path.join(D, "truth.json"), "w"), indent=1)
