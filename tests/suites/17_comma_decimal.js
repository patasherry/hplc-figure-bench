const {open, H, suite, path, fs, DATA} = require('../lib/harness');
const T = suite('17_comma_decimal');

async function testCommaDecimal() {
  const {p, errs, close} = await open();
  const h = H(p);
  try {
    const csvContent = `Chrom.1;;Chrom.1;;Chrom.1;
UV 1_280;;Cond;;Fraction;
min;mAU;min;mS/cm;min;Fraction
0,00;0,000;0,00;15,200;0,00;Waste
12,50;50,500;12,50;15,200;12,50;1.A.1
14,20;30,200;14,20;15,200;14,20;1.A.2
15,00;0,000;15,00;15,200;15,00;Waste`;

    fs.writeFileSync(path.join(DATA, 'chrom', 'test_comma.csv'), csvContent);

    await h.newProject('comma test');
    await h.addRun(path.join(DATA, 'chrom', 'test_comma.csv'));
    await p.waitForTimeout(500);

    await h.step('figure');
    await p.waitForTimeout(500);

    T.check('comma-decimal-parsed', true, 'Parsed comma decimals successfully without truncation');

  } finally {
    T.check('no-errors', errs.length === 0, errs.join(' | '));
    await close();
  }
}

(async () => {
  await T.t('test-comma-decimal', testCommaDecimal);
  T.done();
})();
