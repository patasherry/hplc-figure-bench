// 12 genbank: check GenBank parsing on synthetic files with known answers.
const { open, H, suite, path, fs, DATA } = require('../lib/harness');

const GB_DIR = path.join(DATA, 'gb');
const files = {
  comp: path.join(GB_DIR, 'gb_complement.gb'),
  join: path.join(GB_DIR, 'gb_join.gb'),
  wrap: path.join(GB_DIR, 'gb_wrap.gb'),
  multi: path.join(GB_DIR, 'gb_multiline.gb'),
  case: path.join(GB_DIR, 'gb_case.gb'),
  noOrig: path.join(GB_DIR, 'gb_no_origin.gb'),
  win: path.join(GB_DIR, 'gb_windows.gb'),
  geneProd: path.join(GB_DIR, 'gb_gene_product.gb'),
  snapGene: path.join(GB_DIR, 'snapgene_export.dna')
};

(async () => {
  const T = suite('12_genbank');
  const { p, errs, close } = await open(), h = H(p);
  p.on('dialog', d => d.accept());

  const status = async () => p.$eval('#gbStatus', e => e.textContent.replace(/\u00a0/g, ' ').trim()).catch(() => '');
  const svgText = async () => (await h.svgTexts()).map(x => x.t.replace(/\u00a0/g, ' ')).join(' ');

  /* 1. Complement strand CDS */
  await T.t('complement_strand', async () => {
    await h.newProject('GenBank Complement');
    await h.gb(files.comp);
    const st = await status();
    const txt = await svgText();

    T.check('comp.status_loaded', st.includes('pCOMP') && st.includes('1,000 bp'), `status: ${st}`);
    T.check('comp.orf_residues', st.includes('255 residues'), `status: ${st}`);
    T.check('comp.tagged_mass', st.includes('28.7 kDa') || txt.includes('28.7 kDa'), `status: ${st}, svg: ${txt}`);
    T.check('comp.protease_site', st.includes('thrombin site') || txt.includes('thrombin'), `status: ${st}, svg: ${txt}`);
    T.check('comp.promoter', st.includes('T7 promoter') || txt.includes('T7'), `status: ${st}, svg: ${txt}`);
    T.check('comp.resistance', /kanamycin resistance/i.test(txt), `svg: ${txt}`);
    T.check('comp.origin', txt.includes('pUC ori'), `svg: ${txt}`);
    T.check('comp.cleaved_mass', txt.includes('27.1 kDa'), `svg: ${txt}`);
  });

  /* 2. Non-origin-spanning join location */
  await T.t('join_location', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Join');
    await h.gb(files.join);
    const st = await status();
    const txt = await svgText();

    T.check('join.status_loaded', st.includes('pJOIN'), `status: ${st}`);
    T.check('join.orf_residues', st.includes('255 residues'), `status: ${st}`);
    T.check('join.tagged_mass', st.includes('28.7 kDa') || txt.includes('28.7 kDa'), `status: ${st}, svg: ${txt}`);
    T.check('join.cleaved_mass', txt.includes('27.1 kDa'), `svg: ${txt}`);
  });

  /* 3. Origin-spanning join location */
  await T.t('origin_spanning_join', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Wrap');
    await h.gb(files.wrap);
    const st = await status();

    // App bug fixed: wrap is true but length is right
    const txt = await svgText();
    T.check('wrap.origin_spanning_orf_found', st.includes('255 residues'), `status: ${st}`);
    T.check('wrap.tagged_mass', st.includes('28.7 kDa') || txt.includes('28.7 kDa'), `status: ${st}, svg: ${txt}`);
    T.check('wrap.cleaved_mass', txt.includes('27.1 kDa'), `svg: ${txt}`);
  });

  /* 4. Multi-line qualifiers (/translation and /label) */
  await T.t('multiline_qualifiers', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Multiline');
    await h.gb(files.multi);
    const st = await status();
    const txt = await svgText();

    T.check('multi.status_loaded', st.includes('pMULTI'), `status: ${st}`);
    T.check('multi.label_joined', txt.includes('Multi Line Label') || st.includes('255 residues'), `status: ${st}, svg: ${txt}`);
    T.check('multi.translation_joined', st.includes('255 residues'), `status: ${st}`);
    T.check('multi.mass_correct', st.includes('28.7 kDa') || txt.includes('28.7 kDa'), `status: ${st}, svg: ${txt}`);
  });

  /* 5. Lowercase and uppercase sequence */
  await T.t('case_sensitivity', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Case');
    await h.gb(files.case);
    const st = await status();

    T.check('case.parsed', st.includes('pCASE') && st.includes('500 bp'), `status: ${st}`);
    T.check('case.orf_found', st.includes('30 residues'), `status: ${st}`);
  });

  /* 6. File without ORIGIN section (translation only) */
  await T.t('no_origin', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank No Origin');
    await h.gb(files.noOrig);
    const st = await status();

    T.check('no_origin.parsed', st.includes('pNOORIGIN') && st.includes('255 residues'), `status: ${st}`);
  });

  /* 7. Windows line endings (\r\n) */
  await T.t('windows_line_endings', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Windows');
    await h.gb(files.win);
    const st = await status();

    T.check('windows.parsed', st.includes('pWIN') && st.includes('255 residues'), `status: ${st}`);
  });

  /* 8. Feature labels from /gene or /product */
  await T.t('gene_product_fallback', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('GenBank Gene Product');
    await h.gb(files.geneProd);
    const st = await status();
    const txt = await svgText();

    T.check('gene_product.parsed', st.includes('pGENEPROD') && st.includes('255 residues'), `status: ${st}`);
    T.check('gene_product.resistance_fallback', /ampicillin resistance/i.test(txt), `svg: ${txt}`);
  });

  /* 9. SnapGene-style .dna export file */
  await T.t('snapgene_dna_export', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(400);
    await h.newProject('SnapGene Export');
    await h.gb(files.snapGene);
    const toasts = await h.toasts();

    T.check(
      'snapgene.message_shown',
      toasts.some(t => t.includes('SnapGene file') || t.includes('Export, then GenBank (.gb)')),
      `toasts: ${toasts.join(' | ')}`
    );
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
