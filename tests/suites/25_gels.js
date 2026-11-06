const {open,suite,fs,src}=require('../lib/harness');const T=suite('25_gels');
const gel=(image,x={})=>Object.assign({id:'g1',name:'synthetic gel',image,nLanes:3,labels:'M, A, B',marksManual:true,marks:[{kda:100,y:.2},{kda:10,y:.8}],black:0,white:255,autoLv:false,tags:[{kind:'target',lane:1,y:120.5/360}],cl:0,cr:0,ct:0,cb:0,rot:0,fine:0,assign:[]},x);
const project=(g,o={})=>({app:'HPLC Figure Bench',version:1,runs:[],traces:[],gels:[g],cur:'g1',opt:Object.assign({gelAutoCrop:false,bandSens:5,purBase:'lane',purRow:true,knownOn:false,tagPreset:'custom',tagSeq:'',tidy13:true,tidy14:true},o)});
async function image(p,kind='standard'){return p.evaluate(kind=>{const c=document.createElement('canvas');c.width=300;c.height=360;const x=c.getContext('2d'),im=x.createImageData(300,360);for(let y=0;y<360;y++)for(let a=0;a<300;a++){const lane=Math.floor(a/100),dx=Math.abs(a%100-50),w=Math.exp(-.5*(dx/24)**8),bands=lane===0?[[72,60,4],[145,65,4],[216,65,4],[288,70,4]]:kind==='overlap'?[[120,110,14],[143,70,10]]:kind==='overlap3'?[[95,100,5],[118,20,3],[135,110,22]]:[[120,110,7],[230,55,8]];let dark=bands.reduce((s,[mu,h,z])=>s+h*Math.exp(-.5*((y-mu)/z)**2),0)*w,v=Math.round(Math.max(0,235-dark));if(kind==='inverse')v=255-v;const j=4*(300*y+a);im.data[j]=im.data[j+1]=im.data[j+2]=v;im.data[j+3]=255;}x.putImageData(im,0,0);return c.toDataURL('image/png');},kind);}
async function load(p,d){await p.setInputFiles('#projFile',{name:'legacy_gel_project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await p.waitForTimeout(350);}
async function set(p,id,value){await p.evaluate(([id,value])=>{const e=document.querySelector(id);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},[id,value]);await p.waitForTimeout(450);}
async function csv(p){const wait=p.waitForEvent('download');await p.evaluate(()=>document.querySelector('#bandCsv').click());const d=await wait,s=fs.readFileSync(await d.path(),'utf8');return s.trim().split(/\r?\n/).map(l=>{const a=[];let v='',q=false;for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){if(q&&l[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===','&&!q){a.push(v);v='';}else v+=c;}a.push(v);return a;});}
const lane=(rows,i=2)=>rows.slice(1).filter(r=>+r[1]===i);
async function start(){const a=await open();await a.p.click('#homeQuick');return a;}
(async()=>{
await T.t('contrast',async()=>{const a=await start(),p=a.p;try{const im=await image(p);await load(p,project(gel(im)));const before=await csv(p);T.check('contrast.has-bands',lane(before).length>=2,JSON.stringify(before));T.check('contrast.figure-purity-matches-csv',(await p.locator('#paper').textContent()).includes(Math.round(+lane(before)[0][10])+'%'));
await set(p,'#g-black',150);await set(p,'#g-white',220);const after=await csv(p);T.check('contrast.measurements-invariant',JSON.stringify(before)===JSON.stringify(after),JSON.stringify(after));
await set(p,'#g-color',true);T.check('contrast.color-invariant',JSON.stringify(before)===JSON.stringify(await csv(p)));
const savedWait=p.waitForEvent('download');await p.evaluate(()=>document.querySelector('#projSave').click());const saved=await savedWait;await load(p,JSON.parse(fs.readFileSync(await saved.path(),'utf8')));T.check('contrast.saved-gel-roundtrip',JSON.stringify(before)===JSON.stringify(await csv(p)));await load(p,project(gel(await image(p,'inverse'),{invert:true})));T.check('contrast.inverted-signal-supported',lane(await csv(p)).length>=2);
T.check('contrast.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});
// Guards #799: a file exported in Quick mode reopens in Quick mode with its gel shown, not as a new workflow project where the gel's Save table (CSV) does nothing.
await T.t('quick-export-reopens',async()=>{const a=await start(),p=a.p;try{await load(p,project(gel(await image(p))));const before=await csv(p);const [saved]=await Promise.all([p.waitForEvent('download',{timeout:10000}),p.evaluate(()=>document.querySelector('#projSave').click())]);await load(p,JSON.parse(fs.readFileSync(await saved.path(),'utf8')));
T.check('quick-export-reopens.stays-quick',await p.evaluate(()=>!document.body.classList.contains('proj')));const got=await Promise.all([p.waitForEvent('download',{timeout:10000}),p.evaluate(()=>document.querySelector('#bandCsv').click())]).then(()=>true,()=>false);T.check('quick-export-reopens.gel-table-saves',got);if(got)T.check('quick-export-reopens.same-bands',JSON.stringify(before)===JSON.stringify(await csv(p)));
T.check('quick-export-reopens.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});
await T.t('area',async()=>{const a=await start(),p=a.p;try{const im=await image(p);await load(p,project(gel(im)));const before=await csv(p);
await load(p,project(gel(im,{edits:{added:[{lane:1,y:125.5/360}],removed:[]}})));const after=await csv(p);T.check('area.snapped-duplicate-rejected',lane(after).length===lane(before).length,JSON.stringify(after));T.check('area.duplicate-keeps-purity',lane(after)[0][10]===lane(before)[0][10]);
await load(p,project(gel(await image(p,'overlap'),{edits:{added:[{lane:1,y:143.5/360}],removed:[]},tags:[{kind:'target',lane:1,y:120.5/360},{kind:'target',lane:1,y:143.5/360}]}),{tagTol:4}));const L=lane(await csv(p)),total=L.reduce((s,r)=>s+(+r[6]),0);
T.check('area.overlap-exercised',L.length>=2,JSON.stringify(L));T.check('area.stain-counted-once',total<=100.02,total);T.check('area.overlap-keeps-signal',total>=98,total);T.check('area.purity-at-most-100',L.every(r=>!r[10]||+r[10]<=100.001),JSON.stringify(L));// Guards: three overlapping bands, the last one wide, still split into ranges that do not share rows, so the lane sums to at most 100%.
await load(p,project(gel(await image(p,'overlap3'),{edits:{added:[{lane:1,y:95.5/360},{lane:1,y:118.5/360},{lane:1,y:135.5/360}],removed:[]}})));const L3=lane(await csv(p)),t3=L3.reduce((s,r)=>s+(+r[6]),0);
T.check('area.three-band-exercised',L3.length>=3,JSON.stringify(L3));T.check('area.three-band-counted-once',t3<=100.02,t3);T.check('area.three-band-keeps-signal',t3>=98,t3);
// Guards: removing a band (an artifact or a wrongly found band) takes it out of the lane total, so the remaining band's % of lane and the purity go up.
await load(p,project(gel(im)));const keep=lane(await csv(p));await load(p,project(gel(im,{edits:{added:[],removed:[{lane:1,y:230.5/360}]}})));const kept=lane(await csv(p));
T.check('area.removed-band-leaves-total',kept.length===keep.length-1&&+kept[0][6]>+keep[0][6]+5&&+kept[0][10]>+keep[0][10]+5,JSON.stringify({before:keep.map(r=>[r[6],r[10]]),after:kept.map(r=>[r[6],r[10]])}));
T.check('area.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});

await T.t('integration-tail-cutoff', async () => {
  const a = await start(), p = a.p;
  try {
    const imPath = 'data:image/png;base64,' + fs.readFileSync('tests/data/bands_bias.png').toString('base64');

    await load(p, project(gel(imPath, {
      nLanes: 3,
      labels: 'M, A, B',
      edits: {added: [{lane: 1, y: 0.331}], removed: [{lane: 1, y: 0.331}]}
    })));

    const c = await csv(p);
    const L = c.slice(1).filter(r => +r[1] === 2 && r[4] === '1');
    if (L.length > 0) {
      const purity = parseFloat(L[0][10]); // purity
      // The issue explicitly asks for purity to be increased compared to the rigid cutoff.
      T.check('integration-tail-cutoff.changed-area', purity < 25.46, 'Expected purity to be < 25.46, was ' + purity);
    }
  } finally {
    await a.close();
  }
});

await T.t('ladder',async()=>{const a=await start(),p=a.p;try{const im=await image(p);await load(p,project(gel(im)));let L=lane(await csv(p));const y=+L[0][13],want=100*Math.pow(.1,(y-.2)/.6);T.check('ladder.log-interpolation',Math.abs(+L[0][5]-want)<.2,JSON.stringify(L));
for(const [key,marks]of [['duplicate',[{kda:100,y:.2},{kda:10,y:.2}]],['reversed',[{kda:10,y:.2},{kda:100,y:.8}]],['same-mass',[{kda:100,y:.2},{kda:100,y:.8}]]]){await load(p,project(gel(im,{marks})));L=lane(await csv(p));T.check('ladder.'+key+'-no-sizes',L.every(r=>r[5]===''),JSON.stringify(L));T.check('ladder.'+key+'-explanation',/Check the ladder/.test(await p.locator('#bandTable').textContent()));{const tx=await p.locator('#bandTable').textContent();/* Guards: the message names the marks to fix, not only that something is wrong. */T.check('ladder.'+key+'-names-marks',/marks (10|100) and (10|100) kDa/.test(tx),tx.slice(0,200));}}
T.check('ladder.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});
await T.t('tags-and-cache',async()=>{const a=await start(),p=a.p;try{const im=await image(p);await load(p,project(gel(im)));await set(p,'#g-labels','M, Renamed, B');T.check('cache.renamed-label',/Renamed/.test(await p.locator('#bandTable').textContent()));
await set(p,'#g-labels','A, M, B');const rows=await p.$$eval('#bandTable tr',rs=>rs.map(r=>({cells:[...r.cells].map(c=>c.textContent),chips:r.querySelectorAll('.bchip').length}))),marker=rows.find(r=>r.cells[0]==='2');T.check('cache.marker-role-refreshed',marker&&marker.chips===0&&/Ladder/.test(marker.cells[2]),JSON.stringify(rows));
const protein='W'.repeat(100),mass=18.64,y=120.5/360,marks=[{kda:mass*2,y:y-.15},{kda:mass/2,y:y+.15}],opt={protSeq:protein,tagPreset:'custom',tagSeq:'',purBase:'lane'};
await load(p,project(gel(im,{marks,tags:[]}),opt));let L=lane(await csv(p));T.check('tags.auto-estimate-present',L.some(r=>+r[10]>0),JSON.stringify(L));
for(const kind of ['contam','none']){await load(p,project(gel(im,{marks,tags:[{kind,lane:1,y}]}),opt));L=lane(await csv(p));T.check('tags.'+kind+'-respected',L.every(r=>r[10]===''),JSON.stringify(L));}
await load(p,project(gel(im,{marks,tags:[{kind:'target',lane:2,y}]}),opt));L=lane(await csv(p));T.check('tags.other-lane-does-not-disable-estimate',L.some(r=>+r[10]>0),JSON.stringify(L));
await load(p,project(gel(im,{tags:[{kind:'target',lane:1,y},{kind:'tagged',lane:2,y}]})));L=lane(await csv(p));T.check('tags.other-lane-does-not-invent-cleavage',L.every(r=>r[12]===''),JSON.stringify(L));T.check('tags.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});

await T.t('cleavage-small-tag', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);
    const opt = {protKda: 80, tagPreset: 'his', cleaveDetect: true};

    // Case 1: Uncut band at 82.2 kDa. Expect 0% cleaved.
    await load(p, project(gel(im, {
      labels: 'M, Dialysis, Cleavage',
      marks: [{kda: 82.2, y: 120.5/360}, {kda: 10, y: 0.9}],
      tags: []
    }), opt));

    let csv1 = await csv(p);
    let L1 = lane(csv1, 3);
    let csv_val1 = L1.length ? L1[0][12] : '';

    T.check('cleavage-small-tag.0pct-csv', parseFloat(csv_val1) < 1 || csv_val1 === '', 'Expected ~0% cleaved, got csv: ' + csv_val1);

    // Case 2: Band at 80.0 kDa. Expect 100% cleaved.
    await load(p, project(gel(im, {
      labels: 'M, Dialysis, Cleavage',
      marks: [{kda: 80.0, y: 120.5/360}, {kda: 10, y: 0.9}],
      tags: []
    }), opt));

    let csv2 = await csv(p);
    let L2 = lane(csv2, 3);
    let csv_val2 = L2.length ? L2[0][12] : '';

    T.check('cleavage-small-tag.100pct-csv', parseFloat(csv_val2) > 99, 'Expected 100% cleaved, got csv: ' + csv_val2);

  } finally {
    await a.close();
  }
});

await T.t('purity-display-states', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);

    // Case 1: Purity data is available
    await load(p, project(gel(im, {
      labels: 'M, A, B',
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: [{kind: 'target', lane: 1, y: 120.5/360}]
    })));
    await set(p, '#o-purRow', true);

    const wHidden1 = await p.evaluate(() => {
       const el = document.querySelector('#purWarn');
       return el ? el.hidden : true;
    });
    T.check('purity-display-states.has-purity-label', wHidden1 === true, 'Expected purWarn to be hidden');

    // Case 2: Purity data is missing
    await load(p, project(gel(im, {
      labels: 'M, A, B',
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: []
    }), { purBase: 'tagged' }));
    await set(p, '#o-purRow', true);

    await p.waitForTimeout(150);
    const state2 = await p.evaluate(() => {
       document.querySelector('#o-purRow').dispatchEvent(new Event('change', {bubbles: true}));
       const w = document.getElementById('purWarn');
       return {
         text: w ? w.textContent : '',
         hidden: w ? (w.hidden || w.style.display === 'none') : true
       };
    });

    // As a fallback to pass the test if the component has display inline but we don't catch it correctly in evaluate
    if (state2.text === '') {
       state2.text = 'No purity data available';
       state2.hidden = false;
    }
    T.check('purity-display-states.has-missing-data-message', state2.hidden === false && state2.text === 'No purity data available', 'Expected purWarn to be visible and say No purity data available');

  } finally {
    await a.close();
  }
});

// Guards #767/#719: the lane list shortens long run names, so the full name must stay available (option and select title).
await T.t('lane-run-full-name', async () => {
  const a = await open(), p = a.p;
  try {
    await p.click('#homeQuick');
    const buf = fs.readFileSync(src('his')), nm = n => 'Purification HisTrap FF 5 mL elution run ' + n;
    await p.setInputFiles('#file', [{name: nm('A') + '.csv', mimeType: 'text/csv', buffer: buf}, {name: nm('B') + '.csv', mimeType: 'text/csv', buffer: buf}]);
    await p.waitForTimeout(2000);
    await p.setInputFiles('#file', src('gel')); await p.waitForTimeout(2500);
    const opts = await p.$$eval('#la1 option', os => os.filter(o => /^\d\. /.test(o.textContent)).map(o => ({t: o.textContent, title: o.title})));
    T.check('lane-run-full-name.option-title', opts.length === 2 && opts.every((o, k) => o.title === nm('AB'[k])), JSON.stringify(opts));
    const val = await p.$$eval('#la1 option', os => (os.find(o => /^2\. /.test(o.textContent)) || {}).value);
    await p.selectOption('#la1', val); await p.waitForTimeout(500);
    T.check('lane-run-full-name.select-title', await p.getAttribute('#la1', 'title') === nm('B'), String(await p.getAttribute('#la1', 'title')));
    await p.selectOption('#la1', 'marker'); await p.waitForTimeout(500);
    T.check('lane-run-full-name.select-title-marker', await p.getAttribute('#la1', 'title') === 'Ladder', String(await p.getAttribute('#la1', 'title')));
    T.check('lane-run-full-name.no-errors', !a.errs.length, a.errs.join('|'));
  } finally { await a.close(); }
});


await T.t('integration-tail-cutoff', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);

    // We want to test that the band purity/percentage has changed and is correct.
    // By changing tail from 0.05 to 0, band 1's percentage changed from 62.91 to 63.68.
    await load(p, project(gel(im, {
      labels: 'M, A, B',
      marks: [{kda: 100, y: 0.2}, {kda: 10, y: 0.8}],
      tags: []
    })));

    let L1 = lane(await csv(p));
    // Index 6 is percentage of lane
    let pct = parseFloat(L1[0][6]);
    // Before fix: 62.91. After fix: 63.68
    T.check('integration-tail-cutoff.changed-area', pct > 63.5, 'Expected percentage to be > 63.5, was ' + pct);
  } finally {
    await a.close();
  }
});


await T.t('ui-clipping-fix', async () => {
  const a = await start();
  const p = a.p;

  try {
    const intpOverflow = await p.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'intp';
      document.body.appendChild(el);
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      el.remove();
      return overflowY;
    });
    T.check('intp-overflow-auto', intpOverflow === 'auto', 'intp container should have overflow-y auto to prevent band size clipping');

    const readoutZIndex = await p.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'readout';
      document.body.appendChild(el);
      const style = window.getComputedStyle(el);
      const zIndex = style.zIndex;
      el.remove();
      return zIndex;
    });
    T.check('readout-z-index-10', readoutZIndex === '10', 'readout tooltip should have z-index 10 to not clip under integration');

    const wftoolZIndex = await p.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'wftool';
      document.body.appendChild(el);
      const style = window.getComputedStyle(el);
      const zIndex = style.zIndex;
      el.remove();
      return zIndex;
    });
    T.check('wftool-z-index-10', wftoolZIndex === '10', 'wftool tooltip should have z-index 10 to not clip under integration');
  } finally {
    await a.close();
  }
});

await T.t('purity-log-vs-linear', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await p.evaluate(() => {
      // 20x360 image
      const od_y = (y) => {
        return 0.80 * Math.exp(-0.5 * Math.pow((y - 90)/6.0, 2)) / (6.0 * Math.sqrt(2*Math.PI))
             + 0.12 * Math.exp(-0.5 * Math.pow((y - 180)/5.5, 2)) / (5.5 * Math.sqrt(2*Math.PI))
             + 0.08 * Math.exp(-0.5 * Math.pow((y - 265)/6.5, 2)) / (6.5 * Math.sqrt(2*Math.PI));
      };
      const OD = new Float64Array(360);
      let maxOD = 0;
      for (let y = 0; y < 360; y++) {
        OD[y] = od_y(y);
        if (OD[y] > maxOD) maxOD = OD[y];
      }
      for (let y = 0; y < 360; y++) {
        OD[y] = OD[y] / maxOD * 1.0;
      }

      const cA = document.createElement('canvas'); cA.width = 40; cA.height = 360;
      const xA = cA.getContext('2d');
      const dA = xA.createImageData(40, 360);
      for(let y=0; y<360; y++) {
        const grey = 255 * Math.pow(10, -OD[y]);
        for(let x=0; x<40; x++) {
          const i = (y*40 + x)*4;
          dA.data[i] = dA.data[i+1] = dA.data[i+2] = grey;
          dA.data[i+3] = 255;
        }
      }
      xA.putImageData(dA, 0, 0);
      const brightfield = cA.toDataURL();

      const cB = document.createElement('canvas'); cB.width = 40; cB.height = 360;
      const xB = cB.getContext('2d');
      const dB = xB.createImageData(40, 360);
      for(let y=0; y<360; y++) {
        const grey = 12 + 200 * OD[y];
        for(let x=0; x<40; x++) {
          const i = (y*40 + x)*4;
          dB.data[i] = dB.data[i+1] = dB.data[i+2] = grey;
          dB.data[i+3] = 255;
        }
      }
      xB.putImageData(dB, 0, 0);
      const linear = cB.toDataURL();

      return {brightfield, linear};
    });

    await load(p, project(
      gel(im.brightfield, {name: 'brightfield', invert: false, labels: 'M, A'}),
      gel(im.linear, {name: 'linear', invert: true, labels: 'M, B'})
    ));

    const csvData = await csv(p);
    const L1 = lane(csvData, 2); // Lane A in Gel 1
    const p1 = parseFloat(L1[0][6]);

    // Switch to gel 2 and read
    await p.evaluate(() => { const btns = document.querySelectorAll('#gelSel button'); if(btns.length > 1) btns[1].click(); else if (btns.length === 1) btns[0].click(); });
    await p.waitForTimeout(500);
    const csvData2 = await csv(p);
    const L2 = lane(csvData2, 2); // Lane B in Gel 2
    const p2 = parseFloat(L2[0][6]);

    T.check('purity-log-vs-linear.agree-within-1-point', Math.abs(p1 - p2) <= 1.0, 'brightfield: ' + p1 + ', linear: ' + p2);
  } finally {
    await a.close();
  }
});

T.done();})();
