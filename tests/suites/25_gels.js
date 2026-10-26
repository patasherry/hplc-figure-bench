const {open,suite,fs}=require('../lib/harness');const T=suite('25_gels');
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
const savedWait=p.waitForEvent('download');await p.evaluate(()=>document.querySelector('#projSave').click());const saved=await savedWait;await load(p,JSON.parse(fs.readFileSync(await saved.path(),'utf8')));T.check('contrast.saved-gel-roundtrip',JSON.stringify(before)===JSON.stringify(await csv(p)));await load(p,project(gel(await image(p,'inverse'),{invert:true})));T.check('contrast.inverted-signal-supported',JSON.stringify(before)===JSON.stringify(await csv(p)));
T.check('contrast.no-errors',!a.errs.length,a.errs.join('|'));}finally{await a.close();}});
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

await T.t('cleavage-small-tag-uncleaved', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);
    const marks = [{kda: 82.2, y: 120.5/360}, {kda: 80.0, y: 230.5/360}];

    let proj = project(
      gel(im, {
        labels: 'M, Before, After',
        marks,
        edits: {
          added: [{lane:2, y: 120.5/360}, {lane:3, y: 120.5/360}],
          removed: [
            {lane:1, y: 120.5/360}, {lane:1, y: 230.5/360},
            {lane:2, y: 120.5/360}, {lane:2, y: 230.5/360},
            {lane:3, y: 120.5/360}, {lane:3, y: 230.5/360}
          ]
        },
        tags: []
      }),
      {
        purBase: 'lane',
        tagPreset: 'custom',
        tagKda: 2.2,
        protKda: 80.0,
        cleaveDetect: true
      }
    );
    proj.runs = [{id: 'r1', name: 'cleavage', trace: [{t: 0, A280: 0}]}];
    proj.prep = {on: true, cleave: true};
    proj.gels[0].assign = ['r1', 'cleave', 'cleave'];

    await load(p, proj);
    await set(p, '#g-labels', 'M, Before, After');
    await p.waitForTimeout(200);

    let allCsv = await csv(p);
    let L3 = lane(allCsv, 3);
    let csvUncleaved = L3[0][12] || '';

    T.check('cleavage-small-tag.0-pct-uncleaved', csvUncleaved !== '100' && csvUncleaved !== '100.0', 'Expected ~0%, got ' + csvUncleaved);
  } finally {
    await a.close();
  }
});

await T.t('cleavage-small-tag-cleaved', async () => {
  const a = await start(), p = a.p;
  try {
    const im = await image(p);
    const marks = [{kda: 82.2, y: 120.5/360}, {kda: 80.0, y: 230.5/360}];

    let proj = project(
      gel(im, {
        labels: 'M, Before, After',
        marks,
        edits: {
          added: [{lane:2, y: 230.5/360}, {lane:3, y: 230.5/360}],
          removed: [
            {lane:1, y: 120.5/360}, {lane:1, y: 230.5/360},
            {lane:2, y: 120.5/360}, {lane:2, y: 230.5/360},
            {lane:3, y: 120.5/360}, {lane:3, y: 230.5/360}
          ]
        },
        tags: []
      }),
      {
        purBase: 'lane',
        tagPreset: 'custom',
        tagKda: 2.2,
        protKda: 80.0,
        cleaveDetect: true
      }
    );
    proj.runs = [{id: 'r1', name: 'cleavage', trace: [{t: 0, A280: 0}]}];
    proj.prep = {on: true, cleave: true};
    proj.gels[0].assign = ['r1', 'cleave', 'cleave'];

    await load(p, proj);
    await set(p, '#g-labels', 'M, Before, After');
    await p.waitForTimeout(200);

    let allCsv = await csv(p);
    let L3 = lane(allCsv, 3);
    let csvCleaved = L3[0][12] || '';

    T.check('cleavage-small-tag.100-pct-cleaved', csvCleaved === '100' || csvCleaved === '100.0', 'Expected ~100%, got ' + csvCleaved);
  } finally {
    await a.close();
  }
});

T.done();})();
