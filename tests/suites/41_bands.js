const fs = require('fs');
const path = require('path');
const T = require('../lib/harness');

T.suite('41_bands', () => {
    T.t('target-percentage-bias', async (h, p) => {
        await h.addRun('bands_bias.png', fs.readFileSync(path.join(__dirname, '../data/bands_bias.png')));

        await h.wait(1000);

        await p.waitForSelector('text=bands_bias');

        // Enter selftest to easily read out the actual data the app computed.
        await p.click('#selftest');

        const bandsData = await p.evaluate(() => {
            const hfb = window.__HFB;
            if (!hfb || !hfb.gels || !hfb.gels.length) return null;
            const gel = hfb.gels[0];
            if (!gel.lanes || !gel.lanes.length) return null;
            return gel.lanes[0].bands;
        });

        if (!bandsData || bandsData.length === 0) {
            throw new Error("No bands found");
        }

        const targetBand = bandsData[0];
        T.near(targetBand.pct, 75.47, 0.5, 'Reported percentage is expected to be ~75.47%');
    });
});
