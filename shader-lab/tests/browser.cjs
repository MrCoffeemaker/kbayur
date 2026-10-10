/* KAAN Shader Lab: end-to-end mobile and desktop browser smoke tests.
   Usage from repository root: node shader-lab/tests/browser.cjs */
'use strict';
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {setTimeout:wait}=require('node:timers/promises');
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'../..'),stdio:'ignore'});
const errors=[],results=[];
const url='http://127.0.0.1:8765/shader-lab/';
async function test(name,fn){
 try{await fn();results.push({name,ok:true});console.log('PASS',name);}
 catch(e){results.push({name,ok:false});errors.push({name,message:e.stack||String(e)});console.error('FAIL',name,e.message);}
}
async function captureDownload(page,action){
 const waiting=page.waitForEvent('download',{timeout:90000});
 await action();
 const download=await waiting,filepath=await download.path();
 assert(filepath,'Download path');
 return {name:download.suggestedFilename(),buffer:fs.readFileSync(filepath)};
}
(async()=>{
 let browser;
 try{
  await wait(1250);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({name:'Uncaught browser exception',message:String(error)}));
  page.on('console',msg=>{if(msg.type()==='error')console.error('Browser console:',msg.text());});
  await test('Mobile application boots with live canvas',async()=>{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#canvas-status').waitFor({state:'visible'});
   await page.waitForTimeout(350);
   assert(await page.locator('.mobile-dock').isVisible(),'Mobile dock must be visible');
   assert.equal(await page.locator('#layer-list .layer-item').count(),2);
   assert((await page.locator('#canvas-status').innerText()).includes('LIVE / READY'));
   const stats=await page.locator('#art').evaluate(canvas=>{
    const c=canvas.getContext('2d'),d=c.getImageData(0,0,canvas.width,canvas.height).data;
    let min=255,max=0;for(let i=0;i<d.length;i+=Math.max(4,Math.floor(d.length/8000/4)*4)){min=Math.min(min,d[i],d[i+1],d[i+2]);max=Math.max(max,d[i],d[i+1],d[i+2]);}
    return {width:canvas.width,height:canvas.height,contrast:max-min};
   });
   assert(stats.width>100&&stats.height>100&&stats.contrast>15,JSON.stringify(stats));
  });
  await test('Effect browser offers searchable real patterns',async()=>{
   await page.locator('[data-dock="add"]').click();
   assert(await page.locator('#shader-browser').isVisible());
   await page.locator('#shader-search').fill('moir');
   await page.locator('.browser-card[data-shader="moire"]').click();
   assert.equal(await page.locator('#layer-list .layer-item').count(),3);
   assert(await page.locator('#inspector').innerText().then(t=>t.includes('Moiré')));
  });
  await test('Layer lock blocks deletion and order changes',async()=>{
   await page.locator('[data-dock="layers"]').click();
   const first=page.locator('#layer-list .layer-item').first();
   await first.locator('[data-act="lock"]').click();
   await first.locator('[data-act="delete"]').click();
   assert.equal(await page.locator('#layer-list .layer-item').count(),3);
   await first.locator('[data-act="lock"]').click();
   await first.locator('[data-act="delete"]').click();
   assert.equal(await page.locator('#layer-list .layer-item').count(),2);
   await page.locator('#undo').click();assert.equal(await page.locator('#layer-list .layer-item').count(),3);
   await page.locator('#redo').click();assert.equal(await page.locator('#layer-list .layer-item').count(),2);
  });
  await test('Canvas and text remain editable on phone',async()=>{
   await page.locator('[data-dock="add"]').click();
   await page.locator('#shader-search').fill('Typography');
   await page.locator('.browser-card[data-shader="text"]').click();
   const inspector=page.locator('#inspector');
   assert(await inspector.isVisible());
   await inspector.locator('textarea[data-key="text"]').fill('HELLO MOBILE');
   assert.equal(await inspector.locator('textarea[data-key="text"]').inputValue(),'HELLO MOBILE');
   await page.waitForTimeout(1200);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForTimeout(1300);
   assert((await page.locator('#layer-list').innerText()).includes('Text'),'Text layer should autosave');
   await page.locator('[data-dock="controls"]').click();
   assert.equal(await page.locator('#inspector textarea[data-key="text"]').inputValue(),'HELLO MOBILE');
  });
  await test('PNG export uses native 720 × 900 dimensions, not preview',async()=>{
   await page.locator('#export-size').selectOption('1');
   await page.locator('[data-dock="export"]').click();
   const saved=await captureDownload(page,()=>page.locator('[data-export="png"]').click());
   assert.match(saved.name,/\.png$/i);
   assert.equal(saved.buffer.subarray(1,4).toString(),'PNG');
   assert.equal(saved.buffer.readUInt32BE(16),720);
   assert.equal(saved.buffer.readUInt32BE(20),900);
  });
  await test('WebP export is an actual WebP image',async()=>{
   await page.locator('[data-dock="export"]').click();
   const saved=await captureDownload(page,()=>page.locator('[data-export="webp"]').click());
   assert.match(saved.name,/\.webp$/i);
   assert.equal(saved.buffer.subarray(0,4).toString(),'RIFF');
   assert.equal(saved.buffer.subarray(8,12).toString(),'WEBP');
  });
  let projectBuffer;
  await test('Project is downloadable and can be reopened',async()=>{
   await page.locator('[data-dock="export"]').click();
   const saved=await captureDownload(page,()=>page.locator('[data-export="project"]').click());
   assert.match(saved.name,/\.shaderlab$/);
   projectBuffer=saved.buffer;
   const data=JSON.parse(saved.buffer.toString());
   assert.equal(data.format,'kaan-shaderlab');
   assert(data.layers.some(l=>l.type==='text'&&l.params.text==='HELLO MOBILE'));
   page.once('dialog',d=>d.accept());
   await page.locator('[data-dock="export"]').click();
   await page.locator('[data-export="new"]').click();
   await page.waitForTimeout(80);
   assert.equal(await page.locator('#layer-list .layer-item').count(),0);
   await page.locator('#project-input').setInputFiles({name:'restored.shaderlab',mimeType:'application/json',buffer:projectBuffer});
   await page.waitForTimeout(170);
   assert(await page.locator('#layer-list .layer-item').count()>=3);
  });
  await test('Uploaded photos survive project save and IndexedDB reload',async()=>{
   const png=await page.locator('#art').screenshot();
   await page.locator('#media-input').setInputFiles({name:'test-photo.png',mimeType:'image/png',buffer:png});
   await page.waitForTimeout(600);
   assert((await page.locator('#layer-list').innerText()).includes('test-photo.png'));
   await page.locator('[data-dock="export"]').click();
   const saved=await captureDownload(page,()=>page.locator('[data-export="project"]').click());
   const obj=JSON.parse(saved.buffer.toString());
   assert(obj.layers.some(l=>l.type==='image'&&l.params.source.startsWith('data:image/')));
   await page.waitForTimeout(1000);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForTimeout(1100);
   assert((await page.locator('#layer-list').innerText()).includes('test-photo.png'),'Image should reload from IndexedDB');
  });
  await test('Small videos are embedded in saved project files',async()=>{
   const source=await page.evaluate(async()=>{
    if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)return null;
    const c=document.createElement('canvas');c.width=64;c.height=64;
    const context=c.getContext('2d');context.fillStyle='#ba85fc';context.fillRect(0,0,64,64);
    const stream=c.captureStream(10);
    if(!MediaRecorder.isTypeSupported('video/webm'))return null;
    const rec=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const complete=new Promise(resolve=>{rec.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}))});
    rec.start();await new Promise(r=>setTimeout(r,400));rec.stop();
    const blob=await complete;stream.getTracks().forEach(track=>track.stop());
    return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob)});
   });
   if(!source){console.log('NOTE MediaRecorder not supported, video fixture skipped');return;}
   await page.locator('#media-input').setInputFiles({name:'test-clip.webm',mimeType:'video/webm',buffer:Buffer.from(source,'base64')});
   await page.waitForTimeout(700);
   await page.locator('[data-dock="export"]').click();
   const saved=await captureDownload(page,()=>page.locator('[data-export="project"]').click());
   const obj=JSON.parse(saved.buffer.toString());
   assert(obj.layers.some(l=>l.type==='video'&&l.params.source.startsWith('data:video/')),'Small videos should be embedded');
  });
  await test('Five 3D primitives selectable with no JavaScript crashes',async()=>{
   await page.locator('[data-dock="add"]').click();
   await page.locator('#shader-search').fill('3D Object');
   await page.locator('.browser-card[data-shader="sphere"]').click();
   const select=page.locator('#inspector select[data-key="geometry"]');
   assert(await select.isVisible());
   for(const shape of ['sphere','torus','box','cylinder','plane']){
    await select.selectOption(shape);
    await page.waitForTimeout(100);
    assert(!(await page.locator('#canvas-status').innerText()).includes('ERROR'),shape);
   }
  });
  await test('All 17 procedural styles generate distinct canvas images',async()=>{
   const checks=await page.evaluate(()=>{
    const styles=['silk','topographic','flow','halftone','grid','orbits','noise','chladni','moire','pixelgrid','plasma','waveform','sunburst','starfield','interference','ribbonmesh','checkers'];
    const c=document.createElement('canvas');c.width=160;c.height=195;
    const fingerprint=()=>{
     const data=c.getContext('2d').getImageData(0,0,160,195).data;let hash=2166136261;
     for(let i=0;i<data.length;i+=12){hash=Math.imul(hash^data[i],16777619);hash=Math.imul(hash^data[i+1],16777619);hash=Math.imul(hash^data[i+2],16777619);}
     return hash>>>0;
    };
    return styles.map(mode=>{
     window.ShaderEngine.draw(c,[
       {id:'fx',type:'procedural',visible:true,params:{mode,opacity:1,count:54,seed:23,amplitude:115,frequency:3.8,refraction:1.5,speed:.4,color1:'#ffd2a0',color2:'#784ab0'}},
       {id:'bg',type:'color',visible:true,params:{gradient:'linear',color1:'#442e58',color2:'#130b1a'}}],.75,new Map());
     return {mode,hash:fingerprint()};
    });
   });
   assert.equal(checks.length,17);
   const unique=new Set(checks.map(x=>x.hash));
   assert.equal(unique.size,17,'Different procedural styles should generate different output. '+JSON.stringify(checks));
  });
  await test('All 19 image shaders produce visibly different output',async()=>{
   const checks=await page.evaluate(()=>{
    const modes=['fluted-glass','swirl','refract','ripple','pixelate','chromatic','halftone','hex-halftone','dither','ascii','posterize','edge','emboss','duotone','vignette','scanlines','grain','mirror','invert'];
    const base=[{id:'lines',type:'procedural',visible:true,params:{mode:'silk',opacity:1,count:34,seed:21,amplitude:112,frequency:3.7,refraction:1.3,speed:.4,color1:'#ffdf9a',color2:'#9545b3'}},
      {id:'bg',type:'color',visible:true,params:{gradient:'radial',color1:'#c29459',color2:'#180e34'}}];
    const c=document.createElement('canvas');c.width=160;c.height=195;
    const hash=()=>{const data=c.getContext('2d').getImageData(0,0,160,195).data;let n=2166136261;
      for(let i=0;i<data.length;i+=12){n=Math.imul(n^data[i],16777619);n=Math.imul(n^data[i+1],16777619);n=Math.imul(n^data[i+2],16777619);}return n>>>0;};
    window.ShaderEngine.draw(c,base,.6,new Map());const original=hash();
    return {original,changes:modes.map(effect=>{
       window.ShaderEngine.draw(c,[{id:'fx',type:'image-shader',visible:true,params:{effect,opacity:1,strength:70,frequency:6,speed:.6,color1:'#ffe7ed',color2:'#150f3e'}},...base],.6,new Map());
       return {effect,hash:hash()};
     })};
   });
   const unchanged=checks.changes.filter(c=>c.hash===checks.original).map(c=>c.effect);
   assert.deepEqual(unchanged,[],'Shader effects without any rendered difference: '+unchanged.join(', '));
  });
  await test('Two-times PNG exports twice native output dimensions',async()=>{
   await page.locator('#export-size').selectOption('2');
   await page.locator('[data-dock="export"]').click();
   const downloaded=await captureDownload(page,()=>page.locator('[data-export="png"]').click());
   assert.equal(downloaded.buffer.readUInt32BE(16),1440);
   assert.equal(downloaded.buffer.readUInt32BE(20),1800);
   await page.locator('#export-size').selectOption('1');
  });
  await test('Preset library applies distinct composition',async()=>{
   await page.locator('[data-dock="presets"]').click();
   await page.locator('.browser-card[data-kind="looks"][data-shader="pixel"]').click();
   assert.equal(await page.locator('#project-name').inputValue(),'Pixel Flux');
   assert.equal(await page.locator('#layer-list .layer-item').count(),2);
  });
  await test('Canvas remains visibly accessible with controls open',async()=>{
   await page.locator('[data-dock="controls"]').click();
   const canvas=await page.locator('#art').boundingBox(),panel=await page.locator('.inspector-panel').boundingBox();
   assert(canvas&&panel);
   assert(panel.y>canvas.y+75,JSON.stringify({canvas,panel}));
   assert(panel.y<844-75,JSON.stringify({canvas,panel}));
  });
  await test('Desktop layout has all three panels',async()=>{
   const desktop=await browser.newPage({viewport:{width:1440,height:900}});
   await desktop.goto(url,{waitUntil:'domcontentloaded'});
   await desktop.waitForTimeout(200);
   assert(await desktop.locator('.layers-panel').isVisible());
   assert(await desktop.locator('.inspector-panel').isVisible());
   assert(await desktop.locator('#art').isVisible());
   await desktop.close();
  });
  await test('Small phone keeps navigation on screen',async()=>{
   await page.setViewportSize({width:320,height:700});
   await page.waitForTimeout(100);
   const bar=await page.locator('.mobile-dock').boundingBox();
   assert(bar&&bar.x>=0&&bar.x+bar.width<=321);
   assert(bar.y>=0&&bar.y+bar.height<=701);
  });
  fs.mkdirSync('shader-lab/qa-results',{recursive:true});
  await page.screenshot({path:'shader-lab/qa-results/mobile.png',fullPage:true});
  await browser.close();
 }finally{server.kill('SIGTERM');if(browser)await browser.close().catch(()=>{});}
 const failed=results.filter(x=>!x.ok);
 console.log('\nSummary:',results.length,'scenarios,',failed.length,'failures; uncaught errors',errors.filter(e=>e.name==='Uncaught browser exception').length);
 if(errors.length){for(const error of errors)console.error(error.name,error.message);}
 if(errors.length)process.exitCode=1;
})().catch(e=>{server.kill('SIGTERM');console.error(e);process.exitCode=1;});
