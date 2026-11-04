const { open, H, suite, path } = require('../lib/harness');

(async () => {
const T = suite('41_toast');

await T.t('Toast does not obscure Peak integration header', async () => {
    const {p, close} = await open();
    const h = H(p);

    try {
        await p.setViewportSize({ width: 600, height: 800 });

        await h.newProject('Toast Test');

        await h.addRun(path.join(__dirname, '../data/chrom/12_uv_p7.csv'));

        await p.waitForSelector('#intPanel', { state: 'visible' });

        await p.evaluate(() => {
            const toastEl = document.querySelector('#toast');
            if (toastEl) {
                toastEl.hidden = false;
                toastEl.innerHTML = '';
                const pill = document.createElement('div');
                pill.className = 'pill';
                pill.textContent = 'Loaded 1 ÄKTA run';
                toastEl.appendChild(pill);
                toastEl.classList.add('overlap');
            }
        });

        const isObscured = await p.evaluate(() => {
            const toast = document.querySelector('#toast');
            const header = document.querySelector('#intPanel .intp-head');
            if (!toast || !header) return false;
            if (toast.offsetParent === null) return false;

            const r1 = toast.getBoundingClientRect();
            const r2 = header.getBoundingClientRect();

            return !(r1.right <= r2.left ||
                     r1.left >= r2.right ||
                     r1.bottom <= r2.top ||
                     r1.top >= r2.bottom);
        });

        if (isObscured) throw new Error("Toast obscures Peak integration header at narrow width");

        await p.setViewportSize({ width: 1200, height: 800 });

        await p.evaluate(() => {
            const toastEl = document.querySelector('#toast');
            if (toastEl) toastEl.classList.remove('overlap');
        });

        const isObscuredDesktop = await p.evaluate(() => {
            const toast = document.querySelector('#toast');
            const header = document.querySelector('#intPanel .intp-head');
            if (!toast || !header) return false;
            if (toast.offsetParent === null) return false;

            const r1 = toast.getBoundingClientRect();
            const r2 = header.getBoundingClientRect();

            return !(r1.right <= r2.left ||
                     r1.left >= r2.right ||
                     r1.bottom <= r2.top ||
                     r1.top >= r2.bottom);
        });

        if (isObscuredDesktop) throw new Error("Toast obscures Peak integration header at desktop width");
    } finally {
        await close();
    }
});

})();
