const {open, H, suite, path, fs, DATA} = require('../lib/harness');
const T = suite('41_bands');

const gel = (image, x={}) => Object.assign({id:'g1', name:'synthetic gel', image, nLanes:1, labels:'A', marksManual:true, marks:[], black:0, white:255, autoLv:false, tags:[{kind:'target',lane:0,y:100/360}], cl:0, cr:0, ct:0, cb:0, rot:0, fine:0, assign:[]}, x);
const project = (g, o={}) => ({app:'HPLC Figure Bench', version:1, runs:[], traces:[], gels:[g], cur:'g1', opt:Object.assign({gelAutoCrop:false, bandSens:1, purBase:'lane', purRow:true, knownOn:false, tagPreset:'custom', tagSeq:'', tidy13:true, tidy14:true}, o)});

async function load(p, d) {
    await p.setInputFiles('#projFile', {name:'legacy_gel_project.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(d))});
    await p.waitForTimeout(350);
}

async function csv(p) {
    const wait = p.waitForEvent('download', {timeout: 3000}).catch(() => null);
    await p.evaluate(() => document.querySelector('#bandCsv').click());
    const d = await wait;
    if(!d) return [];
    const s = fs.readFileSync(await d.path(), 'utf8');
    return s.trim().split(/\r?\n/).map(l=>{
        const a=[]; let v='', q=false;
        for(let i=0; i<l.length; i++){
            const c=l[i];
            if(c==='"') { if(q&&l[i+1]==='"') { v+='"'; i++; } else q=!q; }
            else if(c===','&&!q) { a.push(v); v=''; }
            else v+=c;
        }
        a.push(v);
        return a;
    });
}
const lane = (rows, i=0) => rows.slice(1).filter(r => +r[1]===i);

async function image(p){
    return p.evaluate(()=>{
        const c=document.createElement('canvas');c.width=300;c.height=360;
        const x=c.getContext('2d'),im=x.createImageData(300,360);
        for(let y=0;y<360;y++){
            for(let a=0;a<300;a++){
                const bands=[
                    {y: 100, pct: 75.47},
                    {y: 200, pct: 10.0},
                    {y: 300, pct: 14.53}
                ];
                let v = 0;
                for (const b of bands) {
                    const sy = 6.0;
                    const sx = 40.0;
                    v += b.pct * 2.5 * Math.exp(-((a - 150)**2 / (2 * sx**2) + (y - b.y)**2 / (2 * sy**2)));
                }
                const dark = Math.min(255, v);
                const val = Math.round(255 - dark);
                const j=4*(300*y+a);
                im.data[j]=im.data[j+1]=im.data[j+2]=val;
                im.data[j+3]=255;
            }
        }
        x.putImageData(im,0,0);
        return c.toDataURL('image/png');
    });
}

(async()=>{
await T.t('bias', async () => {
    const {p, close} = await open();
    try {
        await p.click('#homeQuick');
        const img = await image(p);

        await load(p, project(gel(img)));

        const data = await csv(p);
        const L = lane(data, 1);

        if (L.length >= 3) {
            const target = L.find(r => r[6] > 50); // find the biggest band
            if (target) {
                T.check('target-percentage-bias', Math.abs(+target[6] - 75.47) <= 0.5, `Expected ~75.47%, got ${target[6]}%`);

                // also check purity matches in UI
                const text = await p.locator('#paper').textContent();
                T.check('target-purity-ui', text.includes(Math.round(+target[10]) + '%'), 'Purity matches in UI');
            } else {
                T.check('no-target', false, 'Target not found');
            }
        } else {
            T.check('no-bands', false, `Found ${L.length} bands, expected 3`);
        }
    } finally {
        await close();
    }
});
T.done();
})();
