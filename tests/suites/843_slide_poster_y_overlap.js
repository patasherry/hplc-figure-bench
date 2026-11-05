const { open, H, suite, path, DATA } = require('../lib/harness');
const T = suite('843_slide_poster_y_overlap');

T.t('slide_poster_overlap', async () => {
    const { p, h, close } = await open();

    // Check overlapping labels issue
    try {
        await h.addRun([path.join(DATA, 'chrom', 'synthetic.csv')]);
        await h.wait(500);

        await p.evaluate(() => {
            const btn = document.querySelector('label[for="wf-single"]');
            if (btn) btn.click();
        });
        await h.wait(200);

        await p.evaluate(() => {
            const preset = document.getElementById('wfPreset');
            if (preset) {
                preset.value = 'poster';
                preset.dispatchEvent(new Event('change', {bubbles: true}));
            }
        });
        await h.wait(500);

        const overlaps = await p.evaluate(() => {
            const svg = document.querySelector('#paper svg');
            if (!svg) return { minGap: 0, count: 0 };
            const texts = Array.from(svg.querySelectorAll('text[text-anchor="end"]'));
            // check vertical spacing between adjacent ticks
            texts.sort((a, b) => parseFloat(a.getAttribute('y') || 0) - parseFloat(b.getAttribute('y') || 0));
            let minGap = 1000;
            for (let i = 0; i < texts.length - 1; i++) {
                const y1 = parseFloat(texts[i].getAttribute('y') || 0);
                const y2 = parseFloat(texts[i+1].getAttribute('y') || 0);
                const gap = Math.abs(y1 - y2);
                if (gap > 0 && gap < minGap) minGap = gap;
            }
            return { minGap, count: texts.length };
        });

        T.check('poster_y_gap_safe', overlaps.minGap > 30, 'y-axis ticks are crowded or overlapping: gap = ' + overlaps.minGap);

    } finally {
        await close();
    }
});
