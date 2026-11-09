// 41 workflow conditions: the real arrow-note editor keeps its scientific example readable (#947).
const {open, H, suite, src} = require('../lib/harness');
const SEL = {titles: '#paper svg text', arrow: '#wfA'};

(async () => {
  const T = suite('41_workflow_condition_placeholder');
  for (const width of [1400, 947, 390]) {
    const {p, errs, close} = await open({width, height: 900}), h = H(p);
    p.setDefaultTimeout(10000);
    await T.t(`${width}:arrow-condition`, async () => {
      await h.newProject('Workflow condition placeholder');
      await h.addRun([src('his'), src('s200')]);
      await h.step('figure');
      const title = p.locator(SEL.titles).filter({hasText: /^[A-Z]\s+IMAC/}).first();
      await title.scrollIntoViewIfNeeded();
      const r = await title.boundingBox();
      await p.mouse.click(r.x + 20, r.y + r.height + 40);
      await p.locator(SEL.arrow).waitFor({state: 'visible'});
      await p.locator(SEL.arrow).scrollIntoViewIfNeeded();
      const m = await p.locator(SEL.arrow).evaluate(input => {
        const style = getComputedStyle(input), placeholder = getComputedStyle(input, '::placeholder');
        const context = document.createElement('canvas').getContext('2d');
        context.font = `${placeholder.fontStyle} ${placeholder.fontWeight} ${placeholder.fontSize} ${placeholder.fontFamily}`;
        const available = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const needed = context.measureText(input.placeholder).width;
        const r = input.getBoundingClientRect(), tool = input.parentElement.getBoundingClientRect();
        return {placeholder: input.placeholder, value: input.value, overflow: style.textOverflow, available, needed,
          inside: r.left >= tool.left && r.right <= tool.right && r.left >= 0 && r.right <= innerWidth};
      });
      T.check(`${width}:placeholder-visible`, !m.value && m.placeholder === 'e.g. SUMO protease, 4 °C overnight', JSON.stringify(m));
      T.check(`${width}:placeholder-fits`, m.available >= m.needed, `${m.available}px available; ${m.needed.toFixed(2)}px needed`);
      T.check(`${width}:no-ellipsis`, m.overflow === 'clip', m.overflow);
      T.check(`${width}:input-contained`, m.inside, JSON.stringify(m));
      T.check(`${width}:no-page-hscroll`, !(await h.hScroll()), 'editor stays within the responsive page');
    });
    T.check(`${width}:no-page-errors`, !errs.length, errs.join(' | '));
    await close();
  }
  T.done();
})();
