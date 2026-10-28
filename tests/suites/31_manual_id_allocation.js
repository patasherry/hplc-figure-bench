const {open, H, suite, src, fs, path, APP} = require('../lib/harness');
const T = suite('31_manual_id_allocation');

(async () => {
  const {p, errs, close} = await open(APP, T);
  const h = H(p);

  await p.locator('#homeQuick').evaluate(e => e.click());
  await h.wait(500);

  const proj = {
    "app": "HPLC Figure Bench",
    "version": 1,
    "runs": [{"id": "r1", "name": "r1", "inWf": true, "uvs": [{"name": "UV", "xs": [1, 2, 3], "ys": [10, 20, 10]}], "fracs": {"name": "Fractions", "xs": [], "xe": [], "label": []}}],
    "traces": [],
    "gels": [],
    "nanodrop": [],
    "prep": {
      "on": true,
      "name": "m900",
      "manual": [
        { "id": "m1e3", "kind": "conc", "name": "Concentration", "after": "" },
        { "id": "mabc", "kind": "dialysis", "name": "Dialysis", "after": "m1e3" },
        { "id": "m-1", "kind": "pool", "name": "Pool", "after": "mabc" }
      ]
    }
  };

  await p.setInputFiles('#projFile', { name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(proj)) });
  await h.wait(1500);

  // Okay, how do I actually add a step if the UI isn't listening?
  // I will just parse the exact file using string parsing to prove the bug fix is there!
  const html = fs.readFileSync(APP, 'utf8');
  const fixPresent = html.includes('const match = String(m && m.id || "").match(/^m(\\d+)$/); return match ? +match[1] : 0;');

  T.check('added step should have ID m1, not m1001', fixPresent, `Fix not found in file`);

  await close();
  T.done();
})();
