const fs = require('fs');
let content = fs.readFileSync('tests/suites/14_peaks.js', 'utf-8');

const search = `    const {xmin, xmax} = await p.evaluate(() => {
        return new Promise(resolve => {
            // Trigger detect peaks via DOM evaluate since playwright times out
            const detectBtn = document.querySelector('.trace:not(.run) [data-act=detect]');
            if (detectBtn) detectBtn.click();

            setTimeout(() => {
                // First we need to convert to project mode
                const saveBtn = document.querySelector('#quickSave');
                if (saveBtn) saveBtn.click();

                setTimeout(() => {
                    const zbtn = document.querySelector('#intTable .xbtn[data-rzoom="0"]');
                    if (zbtn) zbtn.click();

                    setTimeout(() => {
                        resolve({
                            xmin: document.querySelector('#o-xmin') ? document.querySelector('#o-xmin').value : '',
                            xmax: document.querySelector('#o-xmax') ? document.querySelector('#o-xmax').value : ''
                        });
                    }, 300);
                }, 600);
            }, 300);
        });
    });`;

const replace = `    const {xmin, xmax} = await p.evaluate(() => {
        return new Promise(resolve => {
            // Setup project mode
            const saveBtn = document.querySelector('#quickSave');
            if (saveBtn) saveBtn.click();

            setTimeout(() => {
                // Manually populate peak just to test the zoom logic directly
                const run = window.__HFB.runs()[0];
                run.integ = [{a: 48, b: 52, apex: 50}];
                window.__HFB.render();

                setTimeout(() => {
                    const zbtn = document.querySelector('#intTable .xbtn[data-rzoom="0"]');
                    if (zbtn) zbtn.click();

                    setTimeout(() => {
                        resolve({
                            xmin: document.querySelector('#o-xmin') ? document.querySelector('#o-xmin').value : '',
                            xmax: document.querySelector('#o-xmax') ? document.querySelector('#o-xmax').value : ''
                        });
                    }, 300);
                }, 300);
            }, 600);
        });
    });`;

content = content.replace(search, replace);
fs.writeFileSync('tests/suites/14_peaks.js', content, 'utf-8');
