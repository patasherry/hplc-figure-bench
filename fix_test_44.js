const fs = require('fs');
let code = fs.readFileSync('tests/suites/26_sec_calibration.js', 'utf8');

const finalBlock = `

  const setOpt = async (p, id, v) => {
    await p.evaluate(({id, v}) => {
       const el = document.getElementById(id);
       if (el) {
          let d = el.closest('details'); while(d) { d.open=true; d = d.parentElement && d.parentElement.closest('details'); }
          if(el.type === 'checkbox') el.checked = (v === 'true' || v === true); else el.value = v;
          el.dispatchEvent(new Event('input', {bubbles: true}));
          el.dispatchEvent(new Event('change', {bubbles: true}));
       }
    }, {id, v});
    await h.wait(150);
  };

  const detect = async p => { await p.evaluate(() => { const b = document.getElementById('intAuto'); if (b) b.click(); }); await p.waitForTimeout(600); };

  await T.t('SEC extrapolation qualification', async () => {
    // We already have sec_inject2.csv loaded and active from the previous test block.
    // It has peaks at 12 mL and 15 mL.

    // Clear all existing standards
    await p.evaluate(() => {
       const newCalBtn = document.getElementById('sec-new');
       if (newCalBtn) newCalBtn.click();
       const stds = document.querySelectorAll('[data-sdel]');
       for (let i = stds.length - 1; i >= 0; i--) stds[i].click();
       const addBtn = document.getElementById('sec-addStd');
       if (addBtn) { addBtn.click(); addBtn.click(); }
    });
    await h.wait(200);

    // Set new calibration parameters
    await setOpt(p, 'sec-v0', '8');
    await setOpt(p, 'sec-vt', '24');

    await setOpt(p, 'ss-n0', 'S1');
    await setOpt(p, 'ss-k0', '100');
    await setOpt(p, 'ss-v0', '14');

    await setOpt(p, 'ss-n1', 'S2');
    await setOpt(p, 'ss-k1', '10');
    await setOpt(p, 'ss-v1', '18');

    await detect(p);

    const text1 = await p.evaluate(() => {
      const pt = document.getElementById('intTable');
      return pt ? pt.innerText : null;
    });

    // P1 at 12 mL should be extrapolated (~316 kDa)
    T.check('has extrapolated mark 1', text1 && text1.includes('~316'), 'Text is: ' + text1);

    // Change standard volumes
    await setOpt(p, 'ss-v0', '12.2');
    await setOpt(p, 'ss-v1', '18.2');

    await detect(p);

    const text2 = await p.evaluate(() => {
      const pt = document.getElementById('intTable');
      return pt ? pt.innerText : null;
    });

    // P1 at 12 mL should STILL be extrapolated (~108 kDa?) Wait, I'll just check for "~108"
    T.check('has extrapolated mark 2', text2 && /~108/.test(text2), 'Text is: ' + text2);
  });
`;

code = code.replace(
  `  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();`,
  finalBlock + `
  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();`
);

fs.writeFileSync('tests/suites/26_sec_calibration.js', code);
