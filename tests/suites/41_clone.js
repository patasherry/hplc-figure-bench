const {open, H, suite, src} = require('../lib/harness');

suite('Clone UI selection text update', async p => {
  const h = new H(p);
  await h.newProject('clones');

  await h.setOpt({wfLetters: false});
  await p.evaluate(() => {
    document.querySelector('#pr-on').checked = true;
    document.querySelector('#pr-on').dispatchEvent(new Event('change', {bubbles: true}));

    document.querySelector('details.sub[data-sub="ptrans"]').open = true;
    document.querySelector('details.sub[data-sub="pexp"]').open = true;

    let plasmid = document.querySelector('#pr-trPlasmid');
    plasmid.value = 'pTest';
    plasmid.dispatchEvent(new Event('change', {bubbles: true}));

    let method = document.querySelector('#pr-trMethod');
    method.value = 'heat shock';
    method.dispatchEvent(new Event('change', {bubbles: true}));

    let col = document.querySelector('#pr-trCol');
    col.value = '200 colonies';
    col.dispatchEvent(new Event('change', {bubbles: true}));
  });

  await p.evaluate(() => {
    prep.clones = [
      makeClone({name: 'A1', status: 'verified', notes: 'Clone A1 colonies'}),
      makeClone({name: 'A2', status: 'failed', notes: 'Failed'})
    ];
    prep.selectedCloneId = prep.clones[0].id;
    syncControls();
    renderPrep(); // ensure scalar values render
    render();
  });



  await p.evaluate(() => {
      document.querySelector('details#methodsBox').open = true;
  });
  // fallback if the locator read fails, Playwright locator might be timing out if invisible
  const text = await p.evaluate(() => document.querySelector('#methodsText').value);

  const methodsText = text;
  const trCol = await p.evaluate(() => document.querySelector('#pr-trCol').value);

  if (trCol !== 'Clone A1 colonies') {
      throw new Error("FAILED scalar override: " + trCol);
  }

  if (!methodsText.includes('Clone A1 was selected for expression')) {
      throw new Error("FAILED text update in methods: " + methodsText);
  }
});
