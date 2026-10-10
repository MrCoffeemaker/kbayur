/* KAAN Shader Lab / Studio controller. No dependencies, local-only processing. */
(function(){
'use strict';
const $=id=>document.getElementById(id),engine=window.ShaderEngine;
const TYPES=['procedural','image-shader','text','shape','color','image','video','sphere','blur'];
const ICON={procedural:'✳','image-shader':'◈',text:'T',shape:'☆',color:'◉',image:'▧',video:'▣',sphere:'⬡',blur:'◎'};
const TITLES={procedural:'Procedural', 'image-shader':'Image Shader',text:'Text',shape:'Shape',color:'Colour',image:'Image',video:'Video',sphere:'3D Object',blur:'Blur'};
const FORMATS={'4:5':[720,900],'1:1':[900,900],'16:9':[1120,630],'9:16':[540,960],'4:1':[1200,300]};
const MODES=[['silk','Silk Ribbons'],['topographic','Topographic'],['flow','Flow Field'],['halftone','Halftone'],['grid','Warped Grid'],['orbits','Orbit Lines'],['noise','Grain / Noise'],['chladni','Chladni Cymatics'],['moire','Moiré Circles'],['pixelgrid','Pixel Mosaic'],['plasma','Plasma Field'],['waveform','Waveform Lines'],['sunburst','Radiant Beams'],['starfield','Starfield'],['interference','Wave Interference'],['ribbonmesh','Ribbon Mesh'],['checkers','Warped Checks']];
const EFFECTS=[['fluted-glass','Fluted Glass'],['swirl','Swirl Glass'],['refract','Refraction'],['ripple','Water Ripple'],['pixelate','Pixelate'],['chromatic','RGB Shift'],['halftone','Halftone Print'],['hex-halftone','Hexagonal Halftone'],['dither','Dither'],['ascii','ASCII Art'],['posterize','Posterize'],['edge','Edge Detection'],['emboss','Emboss'],['duotone','Duotone'],['vignette','Vignette'],['scanlines','CRT Scanlines'],['grain','Film Grain'],['mirror','Mirror'],['invert','Invert']];
const BLENDS=[['source-over','Normal'],['screen','Screen'],['multiply','Multiply'],['overlay','Overlay'],['lighten','Lighten'],['difference','Difference']];
let serial=0;let state={name:'Liquid Gold',aspect:'4:5',layers:[]},selected=null;
let isPlaying=false,elapsed=0,lastFrame=0,animationFrame=0,needsFrame=false,toastTimer=0,saveTimer=0,historyTimer=0;
let media=new Map(),pendingMedia='image',replaceMediaId=null;
let snapshots=[],historyIndex=-1,dragId=null,recording=false;
let storageReady=false,autosaveQueue=Promise.resolve(),databasePromise=null;
let imageQuality=1,slowFrames=0,frameTargetMs=33;
const historyAssets=new Map(),historyByLayer=new Map();let historyAssetNumber=0;
const preview=$('art'),studio=$('studio'),layerList=$('layer-list'),inspector=$('inspector');
const esc=s=>String(s===undefined||s===null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(a,f)=>Number.isFinite(+a)?+a:f;
function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2700);}
function defaults(type){
 const p={opacity:1,blend:'source-over',x:50,y:50,size:50,rotate:0,speed:.4};
 if(type==='procedural')Object.assign(p,{mode:'silk',count:66,amplitude:115,frequency:2.8,refraction:1.45,speed:.4,seed:23,color1:'#ffc16f',color2:'#682908',size:100});
 if(type==='color')Object.assign(p,{gradient:'linear',color1:'#e68d34',color2:'#140c13',x:60,y:30});
 if(type==='text')Object.assign(p,{text:'NEW ERA',size:11,font:'sans-serif',weight:'800',align:'center',color1:'#ffffff'});
 if(type==='shape')Object.assign(p,{shape:'star',size:33,color1:'#dfaeff',color2:'#170e28',stroke:0,motion:0});
 if(type==='sphere')Object.assign(p,{geometry:'sphere',tilt:25,size:52,color1:'#e2b1fd',color2:'#383768'});
 if(type==='image'||type==='video')Object.assign(p,{size:100,fit:'cover',source:''});
 if(type==='image-shader')Object.assign(p,{effect:'fluted-glass',strength:26,frequency:5,speed:.5,color1:'#fff1d6',color2:'#1c1224'});
 if(type==='blur')Object.assign(p,{strength:12});
 return p;
}
function layer(type,overrides,name){
 const id='layer-'+(++serial);return {id,type,name:name||TITLES[type],visible:true,locked:false,params:Object.assign(defaults(type),overrides||{})};
}
function preset(name){
 if(name==='midnight'){return [
  layer('procedural',{mode:'orbits',count:74,frequency:3.5,color1:'#c5b7ff',color2:'#4e8efe',opacity:.92,rotate:17},'Orbital Traces'),
  layer('procedural',{mode:'flow',count:90,amplitude:93,color1:'#9e76ff',color2:'#a6f9ff',opacity:.58,seed:89},'Nebula Currents'),
  layer('color',{gradient:'radial',color1:'#403275',color2:'#040817',x:47,y:40},'Midnight Glow')];}
 if(name==='signal'){return [
  layer('procedural',{mode:'grid',count:36,frequency:5.5,amplitude:104,seed:8,color1:'#9dffb2',color2:'#00ddbd',opacity:.95},'Signal Field'),
  layer('procedural',{mode:'halftone',count:60,frequency:5,color1:'#30bdac',color2:'#0d242a',opacity:.23},'Signal Pixels'),
  layer('color',{gradient:'linear',color1:'#102f32',color2:'#041114'},'Carbon')];}
 if(name==='aurora'){return [layer('procedural',{mode:'plasma',count:52,frequency:2.2,seed:33,color1:'#96ffe1',color2:'#5830ac',opacity:.7},'Aurora Plasma'),layer('procedural',{mode:'waveform',count:56,amplitude:90,frequency:2.2,color1:'#b9fff3',color2:'#855eff',opacity:.8},'Magnetic Ribbons'),layer('color',{gradient:'radial',color1:'#143f51',color2:'#07081b'},'Deep Space')];}
 if(name==='pixel'){return [layer('procedural',{mode:'pixelgrid',count:82,frequency:4,amplitude:62,seed:34,color1:'#ffc18e',color2:'#663fff'},'Pixel Flux'),layer('color',{gradient:'radial',color1:'#272143',color2:'#090911'},'Night')];}
 if(name==='cymatics'){return [layer('procedural',{mode:'chladni',count:100,frequency:5,amplitude:35,seed:17,color1:'#fff3c9',color2:'#c082a2'},'Sand Frequencies'),layer('color',{gradient:'radial',color1:'#65486a',color2:'#160d23'},'Velvet')];}
 if(name==='retro'){return [layer('image-shader',{effect:'scanlines',strength:42},'CRT Lines'),layer('procedural',{mode:'waveform',count:80,frequency:3.5,color1:'#7bffdd',color2:'#ff84b8'},'Analog Signal'),layer('color',{gradient:'linear',color1:'#35325a',color2:'#070917'},'Night Gradient')];}
 if(name==='mono'){return [
  layer('procedural',{mode:'topographic',count:68,amplitude:73,frequency:5.3,seed:15,color1:'#ffffff',color2:'#888888',opacity:.9},'Contour Study'),
  layer('color',{gradient:'radial',color1:'#414141',color2:'#050505'},'Graphite')];}
 return [
  layer('procedural',{mode:'silk',count:66,amplitude:126,frequency:3,refraction:1.45,seed:21,speed:.38,color1:'#ffd28b',color2:'#67300e'},'Molten Ribbons'),
  layer('color',{gradient:'radial',color1:'#f6a54a',color2:'#140f16',x:62,y:34},'Amber Atmosphere')];
}
function visibleLayer(){return state.layers.find(l=>l.id===selected)||null;}
const DATABASE_NAME='kaan-shader-lab-storage',DATABASE_KEY='current',DATABASE_STORE='projects';
function projectForPersistence(){
 const copy=JSON.parse(JSON.stringify(state));
 copy.layers.forEach(l=>{if(l.type==='video')l.params.source='';});
 return copy;
}
function openProjectDB(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise(resolve=>{
  if(!('indexedDB' in window)){resolve(null);return;}
  let request;try{request=window.indexedDB.open(DATABASE_NAME,1);}catch(e){resolve(null);return;}
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(DATABASE_STORE))db.createObjectStore(DATABASE_STORE);};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
 });
 return databasePromise;
}
async function readAutoSave(){
 const db=await openProjectDB();if(!db)return null;
 return new Promise(resolve=>{
  try{const tx=db.transaction(DATABASE_STORE,'readonly'),req=tx.objectStore(DATABASE_STORE).get(DATABASE_KEY);
   req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null);
  }catch(e){resolve(null);}
 });
}
async function persistProject(snapshot){
 const db=await openProjectDB();if(!db)return false;
 return new Promise(resolve=>{
  try{const tx=db.transaction(DATABASE_STORE,'readwrite');
   tx.objectStore(DATABASE_STORE).put(snapshot,DATABASE_KEY);
   tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
  }catch(e){resolve(false);}
 });
}
function store(){
 if(!storageReady)return;
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{
  const snapshot=projectForPersistence(),json=JSON.stringify(snapshot);
  $('save-status').textContent='SAVING…';
  autosaveQueue=autosaveQueue.catch(()=>{}).then(async()=>{
   const ok=await persistProject(snapshot);
   if(ok){if(json.length<900000){try{localStorage.setItem('kaan-shader-lab-v1',json);}catch(e){}}
    $('save-status').textContent='SAVED LOCALLY';
   }else{
    let fallback=false;
    if(json.length<1800000){try{localStorage.setItem('kaan-shader-lab-v1',json);fallback=true;}catch(e){}}
    $('save-status').textContent=fallback?'SAVED LOCALLY':'SAVE PROJECT TO KEEP YOUR WORK';
   }
  });
 },650);
}
function historySnapshot(){
 const copy=JSON.parse(JSON.stringify(state));
 for(const l of copy.layers){
  const source=l.params?.source;
  if(!source||!['image','video'].includes(l.type))continue;
  let record=historyByLayer.get(l.id);
  if(!record||record.source!==source){record={source,key:'asset-'+(++historyAssetNumber)};historyByLayer.set(l.id,record);historyAssets.set(record.key,source);}
  l.params.source='history:'+record.key;
 }
 return JSON.stringify(copy);
}
function commit(){
 clearTimeout(historyTimer);
 const snapshot=historySnapshot();
 if(snapshots[historyIndex]!==snapshot){
  snapshots=snapshots.slice(0,historyIndex+1);snapshots.push(snapshot);
  if(snapshots.length>55)snapshots.shift();
  historyIndex=snapshots.length-1;
 }
 updateHistoryButtons();store();
}
function delayedCommit(){clearTimeout(historyTimer);historyTimer=setTimeout(commit,420);store();}
function updateHistoryButtons(){$('undo').disabled=historyIndex<1;$('redo').disabled=historyIndex>=snapshots.length-1;}
function resetAssets(){media.forEach(a=>{if(a.tagName==='VIDEO'){a.pause();a.removeAttribute('src');a.load();}});media.clear();}
function createMedia(layerObj){
 if(!layerObj||!layerObj.params||!layerObj.params.source)return;
 if(media.has(layerObj.id))return;
 const source=layerObj.params.source;
 if(layerObj.type==='image'){
  if(!source.startsWith('data:image/'))return;
  const img=new Image();img.onload=()=>drawSoon();img.onerror=()=>notify('Image could not be loaded');img.src=source;media.set(layerObj.id,img);
 }else if(layerObj.type==='video'){
  if(!source.startsWith('blob:'))return;
  const video=document.createElement('video');video.src=source;video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.onloadeddata=()=>{if(isPlaying)video.play().catch(()=>{});drawSoon();};video.load();media.set(layerObj.id,video);
 }
}
function rehydrate(){resetAssets();state.layers.forEach(createMedia);}
function restore(index){
 if(index<0||index>=snapshots.length)return;
 historyIndex=index;state=JSON.parse(snapshots[index]);
 state.layers.forEach(l=>{const src=l.params?.source;if(typeof src==='string'&&src.startsWith('history:'))l.params.source=historyAssets.get(src.slice(8))||'';});
 selected=state.layers[0]?state.layers[0].id:null;
 rehydrate();sync();store();notify('History restored');
}
function updateAspect(){
 const wh=FORMATS[state.aspect]||FORMATS['4:5'];
 const maxSide=(window.innerWidth<691?440:850)*imageQuality;
 const previewScale=Math.min(1,maxSide/Math.max(wh[0],wh[1]));
 preview.width=Math.round(wh[0]*previewScale);preview.height=Math.round(wh[1]*previewScale);
 $('canvas-outline').style.aspectRatio=wh[0]+'/'+wh[1];
 // An explicit height allows portrait and ultrawide canvases to fit without distortion.
 const avail=Math.min(window.innerWidth<691?window.innerHeight*.52:window.innerHeight*.68,760);
 const fitWidth=Math.min(window.innerWidth<691?window.innerWidth-24:Math.max(300,$('drop-zone').clientWidth-60),avail*wh[0]/wh[1]);
 $('canvas-outline').style.width=Math.max(1,fitWidth)+'px';
 $('canvas-outline').style.height=(Math.max(1,fitWidth)*wh[1]/wh[0])+'px';
 $('aspect').value=state.aspect;
}
function drawSoon(){
 if(isPlaying)return;
 if(needsFrame)return;needsFrame=true;
 requestAnimationFrame(()=>{needsFrame=false;render();});
}
function render(){try{
 const started=performance.now();engine.draw(preview,state.layers,elapsed,media);const cost=performance.now()-started;
 if(cost>85){slowFrames++;if(slowFrames>=3&&imageQuality>.6){imageQuality=Math.max(.6,imageQuality*.76);updateAspect();slowFrames=0;notify('Preview quality adjusted for smoother editing');}}
 else if(cost<55)slowFrames=Math.max(0,slowFrames-1);
 frameTargetMs=cost>90?100:cost>48?66:33;
 $('canvas-status').innerHTML='<span class="live-dot"></span> '+(isPlaying?'LIVE / ANIMATING':'LIVE / READY')+(imageQuality<1?' · ECO PREVIEW':'');
 }catch(error){console.error('Shader Lab render:',error);$('canvas-status').textContent='RENDER ERROR';}}
function animationLoop(time){
 if(!isPlaying)return;
 animationFrame=requestAnimationFrame(animationLoop);
 if(time-lastFrame<frameTargetMs)return;
 elapsed+=(Math.min(60,time-lastFrame||33))/1000;lastFrame=time;render();
}
function startMotion(yes){
 isPlaying=!!yes;$('motion-toggle').setAttribute('aria-pressed',String(isPlaying));$('motion-toggle').textContent=isPlaying?'Ⅱ Pause':'▶ Animate';
 media.forEach(a=>{if(a.tagName==='VIDEO'){if(isPlaying)a.play().catch(()=>{});else a.pause();}});
 if(isPlaying){lastFrame=performance.now();cancelAnimationFrame(animationFrame);animationFrame=requestAnimationFrame(animationLoop);}
 else{cancelAnimationFrame(animationFrame);drawSoon();}
}
function setPreset(key){
 startMotion(false);elapsed=0;resetAssets();state.layers=preset(key);state.name={gold:'Liquid Gold',midnight:'Midnight Orbit',signal:'Signal Field',mono:'Monochrome Contours',aurora:'Aurora Waves',pixel:'Pixel Flux',cymatics:'Cymatic Sand',retro:'Retro Signal'}[key]||'Liquid Gold';selected=state.layers[0].id;
 sync();commit();notify('Preset applied: '+state.name);
}
function sync(){
 $('project-name').value=state.name;
 $('layer-count').textContent=String(state.layers.length).padStart(2,'0');
 $('preset-grid').innerHTML=[['gold','Liquid Gold'],['midnight','Midnight Orbit'],['signal','Signal Field'],['mono','Monochrome'],['aurora','Aurora'],['pixel','Pixel Flux'],['cymatics','Cymatics'],['retro','Retro CRT']].map(v=>'<button class="preset" type="button" data-preset="'+v[0]+'"><span class="preset-swatch"></span><span class="preset-label">'+v[1]+' <span>↗</span></span></button>').join('');
 updateAspect();renderLayers();renderInspector();drawSoon();updateHistoryButtons();
}
function renderLayers(){
 $('layer-count').textContent=String(state.layers.length).padStart(2,'0');
 if(!state.layers.length){layerList.innerHTML='<div class="layer-empty">No layers yet. Add a procedural layer to start making something.</div>';return;}
 layerList.innerHTML=state.layers.map((l,i)=>'<div class="layer-item'+(l.id===selected?' selected':'')+(l.visible===false?' muted':'')+'" data-id="'+esc(l.id)+'" draggable="true" role="button" tabindex="0" aria-label="'+esc(l.name)+' layer">'+
 '<span class="drag-handle" title="Drag to reorder">⠿</span><span class="layer-label"><span class="layer-name">'+ICON[l.type]+' &nbsp;'+esc(l.name)+'</span><span class="layer-kind">'+esc(TITLES[l.type])+'</span></span>'+
 '<span class="layer-actions">'+
 '<button type="button" data-act="up" title="Move up" aria-label="Move layer up" '+(i===0?'disabled':'')+'>↑</button>'+
 '<button type="button" data-act="down" title="Move down" aria-label="Move layer down" '+(i===state.layers.length-1?'disabled':'')+'>↓</button>'+
 '<button type="button" data-act="eye" title="'+(l.visible===false?'Show':'Hide')+' layer" aria-label="Toggle visibility">'+(l.visible===false?'◌':'◉')+'</button>'+
 '<button type="button" data-act="lock" title="Toggle lock" aria-label="Toggle edit lock">'+(l.locked?'▣':'♧')+'</button>'+
 '<button type="button" data-act="delete" class="remove" title="Delete layer" aria-label="Delete layer">×</button></span></div>').join('');
}
function add(type){
 if(!TYPES.includes(type))return;
 if(type==='image'||type==='video'){chooseMedia(type,null);return;}
 if(type==='procedural'||type==='image-shader'){openBrowser(type);return;}
 const l=layer(type);state.layers.unshift(l);selected=l.id;
 renderLayers();renderInspector();drawSoon();commit();
 if(window.innerWidth<691)showMobile('controls');
 notify(TITLES[type]+' layer added');
}
function layerAction(id,act){
 const index=state.layers.findIndex(l=>l.id===id),l=state.layers[index];if(!l)return;
 if(l.locked&&!['lock','eye'].includes(act)){notify('Unlock this layer before moving or deleting it');return;}
 if(act==='up'&&index>0&&!state.layers[index-1].locked)[state.layers[index-1],state.layers[index]]=[state.layers[index],state.layers[index-1]];
 if(act==='down'&&index<state.layers.length-1&&!state.layers[index+1].locked)[state.layers[index+1],state.layers[index]]=[state.layers[index],state.layers[index+1]];
 if(act==='eye')l.visible=l.visible===false?true:false;
 if(act==='lock')l.locked=!l.locked;
 if(act==='delete'){media.get(id)?.pause?.();media.delete(id);state.layers.splice(index,1);if(selected===id)selected=state.layers[0]?state.layers[0].id:null;}
 renderLayers();renderInspector();drawSoon();commit();
}
function group(label,fields){return '<section class="inspector-group"><div class="group-heading">'+label+'</div>'+fields+'</section>';}
function field(label,body){return '<div class="control-field">'+body.replace('%%LABEL%%','<span>'+label+'</span>')+'</div>';}
function range(key,label,min,max,step,unit){
 const l=visibleLayer(),v=num(l.params[key],0);
 return field(label,'<label class="control-label">%%LABEL%% <input aria-label="'+label+' value" data-key="'+key+'" data-type="number" type="number" inputmode="decimal" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'"></label><input aria-label="'+label+'" data-key="'+key+'" data-type="number" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'">');
}
function input(key,label,placeholder,multiline){
 const l=visibleLayer(),v=esc(l.params[key]||'');
 const elem=multiline?'<textarea data-key="'+key+'" data-type="string" rows="3" placeholder="'+esc(placeholder||'')+'">'+v+'</textarea>':'<input data-key="'+key+'" data-type="string" type="text" value="'+v+'" placeholder="'+esc(placeholder||'')+'">';
 return field(label,'<label class="control-label">%%LABEL%%</label>'+elem);
}
function color(key,label){
 const v=visibleLayer().params[key]||'#ffffff';
 return field(label,'<label class="control-label">%%LABEL%% <output>'+esc(v)+'</output></label><input data-key="'+key+'" data-type="string" type="color" value="'+esc(v)+'">');
}
function select(key,label,options){
 const v=visibleLayer().params[key];
 return field(label,'<label class="control-label">%%LABEL%%</label><select data-key="'+key+'" data-type="string">'+options.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>');
}
function positionFields(){return '<div class="dual-fields">'+range('x','X position',0,100,1,'%')+range('y','Y position',0,100,1,'%')+'</div>';}
function renderInspector(){
 const l=visibleLayer();$('inspector-type').textContent=l?ICON[l.type]+' FX':'NONE';
 if(!l){inspector.innerHTML='<div class="empty-inspector">Select a layer to edit its parameters, or add one from the layer panel.</div>';return;}
 const p=l.params;
 let html='<div class="inspector-header"><strong>'+esc(l.name)+'</strong><small>'+esc(TITLES[l.type])+'</small></div>';
 html+=group('LAYER',input('_name','Layer name','Name')+range('opacity','Opacity',0,1,.01,'')+select('blend','Blend mode',BLENDS));
 if(l.type==='procedural'){
  html+=group('PROCEDURAL GENERATOR',select('mode','Pattern',MODES)+
    '<div class="dual-fields">'+color('color1','Primary')+color('color2','Secondary')+'</div>'+
    range('count','Flute count / density',5,220,1,'')+
    range('amplitude','Wave amplitude',0,220,1,'')+
    range('frequency','Frequency',.2,10,.1,'')+
    (p.mode==='silk'?range('refraction','Refraction',.2,3,.05,''):'')+
    range('seed','Seed',0,999,1,''));
  html+=group('MOTION & TRANSFORM',range('speed','Motion speed',0,3,.05,'')+range('rotate','Rotation',-180,180,1,'°'));
  html+='<button type="button" class="inspector-command" data-command="randomize">✳ Randomise this pattern</button>';
 }else if(l.type==='image-shader'){
  html+=group('IMAGE SHADER',select('effect','Effect',EFFECTS)+range('strength','Intensity',0,100,1,'')+
   (['refract','fluted-glass','swirl','ripple'].includes(p.effect)?range('frequency','Flute count / frequency',.5,30,.5,'')+range('speed','Motion speed',0,3,.05,''):'')+
   (['dither','ascii','hex-halftone','duotone'].includes(p.effect)?'<div class="dual-fields">'+color('color1','Light')+color('color2','Dark')+'</div>':'')+
   '<p class="inspector-note">This effect processes the combined layers below it. Move it higher in the stack to apply it to more layers.</p>');
 }else if(l.type==='color'){
  html+=group('BACKGROUND',select('gradient','Fill type',[['solid','Solid'],['linear','Linear Gradient'],['radial','Radial Gradient']])+
  '<div class="dual-fields">'+color('color1','Start colour')+(p.gradient==='solid'?'':color('color2','End colour'))+'</div>'+
  (p.gradient==='radial'?positionFields():''));
 }else if(l.type==='text'){
  html+=group('TYPE',input('text','Content','Enter text',true)+
   select('font','Typeface',[['sans-serif','Sans Serif'],['serif','Serif'],['monospace','Monospace'],['Georgia','Georgia']])+
   select('weight','Weight',[['400','Regular'],['600','Semibold'],['700','Bold'],['800','Extra Bold'],['900','Black']])+
   select('align','Alignment',[['left','Left'],['center','Centre'],['right','Right']])+color('color1','Text colour'));
  html+=group('TRANSFORM',positionFields()+range('size','Font size',2,35,.5,'%')+range('rotate','Rotation',-180,180,1,'°'));
 }else if(l.type==='shape'){
  html+=group('SHAPE',select('shape','Geometry',[['circle','Circle'],['rectangle','Rectangle'],['ellipse','Ellipse'],['triangle','Triangle'],['star','Star'],['hexagon','Hexagon'],['ring','Ring'],['blob','Polygon Disc']])+
   '<div class="dual-fields">'+color('color1','Fill')+color('color2','Outline')+'</div>'+range('stroke','Stroke width',0,25,1,'%'));
  html+=group('TRANSFORM',positionFields()+range('size','Size',1,110,1,'%')+range('rotate','Rotation',-180,180,1,'°')+range('motion','Motion tilt',0,180,1,'°')+range('speed','Motion speed',0,3,.05,''));
 }else if(l.type==='sphere'){
  html+=group('WEBGL / 3D OBJECT',select('geometry','Primitive',[['sphere','Sphere'],['torus','Torus'],['box','Cube'],['cylinder','Cylinder'],['plane','Wobbling Plane']])+'<div class="dual-fields">'+color('color1','Highlight')+color('color2','Shadow')+'</div>');
  html+=group('3D TRANSFORM',positionFields()+range('size','Size',2,100,1,'%')+range('rotate','Y rotation',-180,180,1,'°')+range('tilt','X tilt',-90,90,1,'°')+range('speed','Spin speed',0,3,.05,''));
 }else if(l.type==='image'||l.type==='video'){
  html+=group('MEDIA', '<p class="inspector-note">'+(p.source?(l.type==='video'?'Session video imported.':'Image ready.'):('No '+l.type+' selected.'))+'</p>'+
  '<button type="button" class="inspector-command" data-command="replace-media">↑ '+(p.source?'Replace':'Choose')+' '+TITLES[l.type]+'</button>'+
  select('fit','Fit image',[['cover','Fill / crop'],['contain','Contain']]));
  html+=group('TRANSFORM',positionFields()+range('size','Scale',10,220,1,'%')+range('rotate','Rotation',-180,180,1,'°'));
 }else if(l.type==='blur'){
  html+=group('GAUSSIAN BLUR',range('strength','Blur radius',0,80,1,'px')+'<p class="inspector-note">Softens all visible layers underneath this blur layer.</p>');
 }
 if(l.locked)html='<div class="empty-inspector">This layer is locked. Unlock it in the stack to change settings.</div>';
 inspector.innerHTML=html;
 // Layer name is stored on layer itself, not on the parameter object.
 const nameControl=inspector.querySelector('[data-key="_name"]');if(nameControl)nameControl.value=l.name;
}
function showMobile(which){
 studio.dataset.mobile=which;
 $('sheet-scrim').style.display=(window.innerWidth<691&&(which==='layers'||which==='controls'))?'block':'none';
 document.querySelectorAll('[data-mobile]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.mobile===which)));
 document.querySelectorAll('[data-dock]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.dock===which)));
}
function chooseMedia(type,id){
 pendingMedia=type;replaceMediaId=id;
 $('media-input').accept=type==='video'?'video/*':'image/*';
 $('media-input').value='';$('media-input').click();
}
function handleMedia(file){
 if(!file)return;
 const type=file.type.startsWith('video/')?'video':file.type.startsWith('image/')?'image':null;
 if(!type){notify('Please choose an image or video file');return;}
 if(type==='image'&&file.size>15000000){notify('Image limit: 15 MB. Please use a smaller file.');return;}
 const apply=source=>{
  let current=state.layers.find(l=>l.id===replaceMediaId);
  if(!current||current.type!==type){current=layer(type,{},file.name.slice(0,42));state.layers.unshift(current);}
  current.params.source=source;selected=current.id;
  media.delete(current.id);createMedia(current);sync();commit();notify(type==='video'?'Video added. Video files are not embedded in saved projects.':'Image layer added.');
  if(window.innerWidth<691)showMobile('controls');
 };
 if(type==='video'){apply(URL.createObjectURL(file));return;}
 const reader=new FileReader();
 reader.onload=()=>{
  const raw=String(reader.result),img=new Image();
  img.onload=()=>{
   try{
    if(file.size<1800000&&Math.max(img.naturalWidth,img.naturalHeight)<=1800){apply(raw);return;}
    const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
    const out=document.createElement('canvas');out.width=Math.max(1,Math.round(img.naturalWidth*scale));out.height=Math.max(1,Math.round(img.naturalHeight*scale));
    out.getContext('2d').drawImage(img,0,0,out.width,out.height);
    const compressed=out.toDataURL('image/webp',.88);
    apply(compressed.startsWith('data:image/')?compressed:raw);
   }catch(error){console.warn('Image optimization skipped:',error);apply(raw);}
  };
  img.onerror=()=>notify('This image format could not be decoded');
  img.src=raw;
 };
 reader.onerror=()=>notify('Image could not be read');reader.readAsDataURL(file);
}
function download(blob,name){
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
}
const safeFileName=()=>String(state.name||'shader-lab').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'shader-lab';
function exportPNG(){
 try{const multiplier=Number($('export-size').value)||1;
 const out=document.createElement('canvas');out.width=preview.width*multiplier;out.height=preview.height*multiplier;engine.draw(out,state.layers,elapsed,media);
 out.toBlob(blob=>{if(blob){download(blob,safeFileName()+'.png');notify('PNG exported: '+out.width+' × '+out.height);}else notify('Export failed');},'image/png');}catch(e){console.error(e);notify('Could not export PNG');}
}
function saveProject(){
 const snapshot=JSON.parse(JSON.stringify(state));
 snapshot.layers.forEach(l=>{if(l.type==='video')l.params.source='';});
 const file={format:'kaan-shaderlab',version:1,...snapshot};
 download(new Blob([JSON.stringify(file,null,2)],{type:'application/json'}),safeFileName()+'.shaderlab');
 notify('Project file saved');
}
function loadProject(file){
 if(!file)return;
 const reader=new FileReader();reader.onload=()=>{try{
  const obj=JSON.parse(String(reader.result));if(!obj||!Array.isArray(obj.layers)||obj.layers.length>100||!FORMATS[obj.aspect])throw new Error('Invalid file');
  const clean=obj.layers.map(l=>{
   if(!l||!TYPES.includes(l.type)||!l.params||typeof l.params!=='object')throw new Error('Invalid layer');
   const entry=layer(l.type,l.params,String(l.name||TITLES[l.type]).slice(0,70));entry.visible=l.visible!==false;entry.locked=!!l.locked;
   if(l.type==='image'&&!String(entry.params.source||'').startsWith('data:image/'))entry.params.source='';
   if(l.type==='video')entry.params.source='';
   return entry;
  });
  startMotion(false);state={name:String(obj.name||'Untitled').slice(0,60),aspect:obj.aspect,layers:clean};selected=state.layers[0]?state.layers[0].id:null;rehydrate();sync();commit();notify('Project loaded');
 }catch(e){notify('Invalid or unsupported .shaderlab file');}};reader.readAsText(file);
}
async function recordWebM(){
 if(recording)return;
 if(!preview.captureStream||!window.MediaRecorder){notify('WebM recording is not supported by this browser');return;}
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
 if(!mime){notify('WebM export is not supported by this browser');return;}
 try{
  recording=true;const btn=$('export-webm'),wasPlaying=isPlaying;btn.textContent='● Recording 6s…';btn.disabled=true;
  startMotion(true);
  const stream=preview.captureStream(30),chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{stream.getTracks().forEach(track=>track.stop());recording=false;btn.textContent='● Record WebM';btn.disabled=false;if(!wasPlaying)startMotion(false);
    if(chunks.length)download(new Blob(chunks,{type:'video/webm'}),safeFileName()+'.webm');
    notify(chunks.length?'WebM animation exported':'Recording did not produce video');
  };
  rec.onerror=()=>notify('WebM recording failed');rec.start();setTimeout(()=>{if(rec.state==='recording')rec.stop();},6000);
 }catch(e){recording=false;$('export-webm').disabled=false;$('export-webm').textContent='● Record WebM';notify('Could not start recording');}
}
function randomize(){
 const l=visibleLayer();
 if(!l||l.type!=='procedural'){notify('Select a procedural layer to randomise');return;}
 if(l.locked){notify('Unlock this layer first');return;}
 l.params.seed=Math.floor(Math.random()*999);
 l.params.frequency=Math.round((1.2+Math.random()*5)*10)/10;
 l.params.amplitude=Math.round(40+Math.random()*145);
 l.params.refraction=Math.round((.7+Math.random()*1.8)*100)/100;
 l.params.rotate=Math.round(-32+Math.random()*64);
 l.params.count=Math.round(35+Math.random()*90);
 renderInspector();drawSoon();commit();notify('New pattern generated');
}
$('layer-list').addEventListener('click',e=>{
 const row=e.target.closest('.layer-item');if(!row)return;
 const button=e.target.closest('[data-act]');
 if(button){e.stopPropagation();layerAction(row.dataset.id,button.dataset.act);return;}
 selected=row.dataset.id;renderLayers();renderInspector();
});
$('layer-list').addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('layer-item')){e.preventDefault();selected=e.target.dataset.id;renderLayers();renderInspector();}
});
$('layer-list').addEventListener('dragstart',e=>{
 const row=e.target.closest('.layer-item');if(!row)return;
 if(state.layers.find(l=>l.id===row.dataset.id)?.locked){e.preventDefault();notify('Unlock this layer first');return;}
 dragId=row.dataset.id;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);
});
$('layer-list').addEventListener('dragover',e=>{if(dragId){e.preventDefault();e.dataTransfer.dropEffect='move';}});
$('layer-list').addEventListener('drop',e=>{
 e.preventDefault();const target=e.target.closest('.layer-item');if(!target||!dragId||target.dataset.id===dragId)return;
 const from=state.layers.findIndex(l=>l.id===dragId),to=state.layers.findIndex(l=>l.id===target.dataset.id);
 if(from<0||to<0||state.layers[to].locked||state.layers[from].locked)return;const [moving]=state.layers.splice(from,1);state.layers.splice(to,0,moving);
 renderLayers();drawSoon();commit();
});
$('layer-list').addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.dragging').forEach(e=>e.classList.remove('dragging'));});
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.add)));
$('browse-presets').addEventListener('click',()=>openBrowser('looks'));
$('preset-grid').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b)setPreset(b.dataset.preset);});
function fieldChanged(e){
 const element=e.target.closest('[data-key]');if(!element)return;
 const l=visibleLayer();if(!l||l.locked)return;
 const key=element.dataset.key,kind=element.dataset.type,raw=element.value,value=kind==='number'?Number(raw):raw;
 if(kind==='number'&&!Number.isFinite(value))return;
 inspector.querySelectorAll('[data-key="'+key+'"]').forEach(other=>{if(other!==element)other.value=raw;});
 if(key==='_name'){l.name=String(value).slice(0,70);renderLayers();}
 else{l.params[key]=value;}
 const output=element.closest('.control-field').querySelector('output');
 if(output)output.textContent=raw+(element.type==='range'?(element.closest('.control-field').querySelector('.control-label').textContent.includes('Rotation')?'°':''):'');
 const dependent=['mode','effect','gradient','shape'].includes(key);
 if(dependent)renderInspector();
 drawSoon();delayedCommit();
}
$('inspector').addEventListener('input',fieldChanged);
$('inspector').addEventListener('change',e=>{
 const el=e.target.closest('[data-key]');if(!el)return;
 if(['SELECT','INPUT'].includes(el.tagName)&&el.type!=='range'&&el.type!=='color')fieldChanged(e);
 commit();
});
$('inspector').addEventListener('click',e=>{
 const b=e.target.closest('[data-command]');if(!b)return;
 if(b.dataset.command==='randomize')randomize();
 if(b.dataset.command==='replace-media'){const l=visibleLayer();if(l)chooseMedia(l.type,l.id);}
});
$('media-input').addEventListener('change',e=>handleMedia(e.target.files&&e.target.files[0]));
$('project-input').addEventListener('change',e=>{loadProject(e.target.files&&e.target.files[0]);e.target.value='';});
$('randomize').addEventListener('click',randomize);
$('motion-toggle').addEventListener('click',()=>startMotion(!isPlaying));
$('reset-view').addEventListener('click',()=>{elapsed=0;startMotion(false);drawSoon();notify('Animation reset');});
$('aspect').addEventListener('change',e=>{state.aspect=e.target.value;updateAspect();drawSoon();commit();});
$('project-name').addEventListener('input',e=>{state.name=e.target.value.slice(0,60);delayedCommit();});
$('project-name').addEventListener('change',commit);
$('export-png').addEventListener('click',exportPNG);$('export-png-side').addEventListener('click',exportPNG);
$('save-project').addEventListener('click',saveProject);$('save-project-side').addEventListener('click',saveProject);
$('open-project').addEventListener('click',()=>$('project-input').click());$('load-project-side').addEventListener('click',()=>$('project-input').click());
$('export-webm').addEventListener('click',recordWebM);
$('new-project').addEventListener('click',()=>{
 if(!confirm('Start a new empty project? Save a .shaderlab file first if you want to keep the current composition.'))return;
 startMotion(false);resetAssets();state={name:'Untitled Composition',aspect:'4:5',layers:[]};selected=null;sync();commit();notify('New project created');
});
$('undo').addEventListener('click',()=>{clearTimeout(historyTimer);restore(historyIndex-1);});
$('redo').addEventListener('click',()=>{clearTimeout(historyTimer);restore(historyIndex+1);});
document.querySelectorAll('[data-mobile]').forEach(btn=>btn.addEventListener('click',()=>showMobile(btn.dataset.mobile)));
$('help').addEventListener('click',()=>$('help-dialog').showModal());
$('close-help').addEventListener('click',()=>$('help-dialog').close());
$('close-help-bottom').addEventListener('click',()=>$('help-dialog').close());
window.addEventListener('resize',()=>{updateAspect();drawSoon();});
window.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable]'))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(historyIndex+(e.shiftKey?1:-1));}
 else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();restore(historyIndex+1);}
 else if(e.key===' '){e.preventDefault();startMotion(!isPlaying);}
});
/* Clipboard imports work with photos and transparent PNGs. */
window.addEventListener('paste',e=>{
 const item=Array.from(e.clipboardData?.items||[]).find(i=>i.type.startsWith('image/'));
 if(!item)return;const file=item.getAsFile();if(file){replaceMediaId=null;handleMedia(file);notify('Pasted image added');}
});
const drop=$('drop-zone');
drop.addEventListener('dragover',e=>{e.preventDefault();if(e.dataTransfer.types.includes('Files'))drop.classList.add('is-drag-over');});
drop.addEventListener('dragleave',e=>{if(!drop.contains(e.relatedTarget))drop.classList.remove('is-drag-over');});
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('is-drag-over');const f=Array.from(e.dataTransfer.files||[]).find(f=>f.type.startsWith('image/')||f.type.startsWith('video/'));if(f){replaceMediaId=null;handleMedia(f);}});

/* Touch-first browser for selectable live shader thumbnails. */
const CATEGORIES=[['all','All'],['procedural','Procedural'],['image-shader','Image Effects'],['looks','Looks'],['layers','Elements']];
let browserCategory='all',browserGeneration=0,canvasDrag=null;
function browserItems(){
 return [
 ...MODES.map(([id,title])=>({kind:'procedural',id,title,detail:'GENERATIVE PATTERN'})),
 ...EFFECTS.map(([id,title])=>({kind:'image-shader',id,title,detail:'IMAGE PROCESSING'})),
 ...[['gold','Liquid Gold'],['midnight','Midnight Orbit'],['signal','Signal Field'],['mono','Monochrome'],['aurora','Aurora Waves'],['pixel','Pixel Flux'],['cymatics','Cymatic Sand'],['retro','Retro CRT']].map(([id,title])=>({kind:'looks',id,title,detail:'READY-TO-EDIT LOOK'})),
 ...[['text','Typography'],['shape','Geometry'],['color','Colour / Gradient'],['image','Upload Image'],['video','Upload Video'],['sphere','3D Object'],['blur','Blur']].map(([id,title])=>({kind:'layers',id,title,detail:'COMPOSITION ELEMENT'}))
 ];
}
function browserSample(item){
 const bg={id:'browser-bg',type:'color',visible:true,params:{gradient:'radial',color1:'#b27c78',color2:'#201525',x:52,y:41}};
 const proc={id:'browser-p',type:'procedural',visible:true,params:{...defaults('procedural'),mode:'silk',count:34,amplitude:48,seed:15,color1:'#edc1e6',color2:'#5c39ad'}};
 if(item.kind==='looks')return preset(item.id);
 if(item.kind==='procedural')return [{...proc,params:{...proc.params,mode:item.id,color1:'#e8b7f6',color2:'#8153c6'}},bg];
 if(item.kind==='image-shader')return [{id:'browser-effect',type:'image-shader',visible:true,params:{...defaults('image-shader'),effect:item.id,strength:58,frequency:7,color1:'#f1dbf9',color2:'#25132b'}},proc,bg];
 const type=item.id;
 return [{id:'browser-layer',type,visible:true,params:{...defaults(type),size:45,text:'KAAN',shape:'star',color1:'#d9baff',color2:'#38204b'}},bg];
}
function renderBrowser(){
 const category=browserCategory,search=$('shader-search').value.trim().toLowerCase();
 $('browser-categories').innerHTML=CATEGORIES.map(([id,name])=>'<button type="button" class="'+(id===category?'active':'')+'" data-cat="'+id+'">'+name+'</button>').join('');
 const found=browserItems().filter(v=>(category==='all'||v.kind===category)&&(v.title.toLowerCase().includes(search)||v.detail.toLowerCase().includes(search)));
 $('browser-grid').innerHTML=found.length?found.map(v=>'<button type="button" class="browser-card" data-kind="'+v.kind+'" data-shader="'+esc(v.id)+'"><canvas width="180" height="135" aria-hidden="true"></canvas><strong>'+esc(v.title)+'</strong><small>'+esc(v.detail)+'</small></button>').join(''):'<div class="browser-empty">No effects found. Try another search.</div>';
 const gen=++browserGeneration,thumbs=Array.from($('browser-grid').querySelectorAll('.browser-card'));
 let i=0;
 function batch(){
  if(gen!==browserGeneration||!$('shader-browser').open)return;
  for(let k=0;k<4&&i<thumbs.length;k++,i++){
   const el=thumbs[i],data={id:el.dataset.shader,kind:el.dataset.kind};
   try{engine.draw(el.querySelector('canvas'),browserSample(data),0,new Map());}catch(error){console.warn('Preview:',error);}
  }
  if(i<thumbs.length)requestAnimationFrame(batch);
 }
 requestAnimationFrame(batch);
}
function openBrowser(category='all'){
 browserCategory=CATEGORIES.some(v=>v[0]===category)?category:'all';
 $('shader-search').value='';
 $('shader-browser').showModal();
 renderBrowser();
}
function closeBrowser(){browserGeneration++;$('shader-browser').close();}
$('browser-categories').addEventListener('click',e=>{const btn=e.target.closest('[data-cat]');if(!btn)return;browserCategory=btn.dataset.cat;renderBrowser();});
$('shader-search').addEventListener('input',renderBrowser);
$('close-browser').addEventListener('click',closeBrowser);
$('shader-browser').addEventListener('close',()=>browserGeneration++);
$('browser-grid').addEventListener('click',e=>{
 const el=e.target.closest('[data-shader]');if(!el)return;
 const type=el.dataset.kind,id=el.dataset.shader;
 closeBrowser();
 if(type==='looks'){setPreset(id);showMobile('canvas');return;}
 if(type==='layers'){add(id);return;}
 const label=(type==='procedural'?MODES:EFFECTS).find(v=>v[0]===id)?.[1]||'Shader';
 const layerObj=layer(type,type==='procedural'?{mode:id}:{effect:id},label);
 state.layers.unshift(layerObj);selected=layerObj.id;renderLayers();renderInspector();drawSoon();commit();
 if(window.innerWidth<691)showMobile('controls');
 notify(label+' added');
});
function exportWebP(){
 try{
  const wh=FORMATS[state.aspect]||FORMATS['4:5'],mul=Number($('export-size').value)||1;
  const out=document.createElement('canvas');out.width=wh[0]*mul;out.height=wh[1]*mul;
  engine.draw(out,state.layers,elapsed,media);
  out.toBlob(blob=>{if(blob)download(blob,safeFileName()+'.webp');else notify('WebP export unavailable on this browser.');},'image/webp',.94);
  notify('WebP exported');
 }catch(err){console.error(err);notify('WebP export failed');}
}
$('close-export').addEventListener('click',()=>$('export-dialog').close());
$('export-dialog').addEventListener('click',e=>{
 const b=e.target.closest('[data-export]');if(!b)return;
 $('export-dialog').close();
 if(b.dataset.export==='png')exportPNG();
 if(b.dataset.export==='webp')exportWebP();
 if(b.dataset.export==='webm')recordWebM();
 if(b.dataset.export==='project')saveProject();
});
document.querySelectorAll('[data-dock]').forEach(b=>b.addEventListener('click',()=>{
 const which=b.dataset.dock;
 if(which==='add'){showMobile('canvas');openBrowser('all');}
 else if(which==='presets'){showMobile('canvas');openBrowser('looks');}
 else if(which==='export'){showMobile('canvas');$('export-dialog').showModal();}
 else showMobile(studio.dataset.mobile===which?'canvas':which);
}));
$('sheet-scrim').addEventListener('click',()=>showMobile('canvas'));
/* On-canvas pointer editing: drag text, shapes, images and 3D spheres. */
const MOVE_TYPES=new Set(['text','shape','image','video','sphere']);
preview.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const rect=preview.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*100,py=(e.clientY-rect.top)/rect.height*100;
 const hit=state.layers.find(l=>{
  if(!MOVE_TYPES.has(l.type)||l.visible===false||l.locked)return false;
  const p=l.params,dx=px-Number(p.x??50),dy=py-Number(p.y??50);
  const radius=Math.max(7,Number(p.size??45)*.5);
  return Math.hypot(dx,dy)<radius;
 });
 const chosen=hit||(visibleLayer()&&MOVE_TYPES.has(visibleLayer().type)?visibleLayer():null);
 if(!chosen||chosen.locked)return;
 selected=chosen.id;renderLayers();renderInspector();
 canvasDrag={id:chosen.id,startX:e.clientX,startY:e.clientY,x:Number(chosen.params.x??50),y:Number(chosen.params.y??50)};
 try{preview.setPointerCapture(e.pointerId);}catch(err){}
});
preview.addEventListener('pointermove',e=>{
 if(!canvasDrag)return;
 const l=state.layers.find(l=>l.id===canvasDrag.id);if(!l)return;
 const rect=preview.getBoundingClientRect();
 l.params.x=clampPct(canvasDrag.x+(e.clientX-canvasDrag.startX)/rect.width*100);
 l.params.y=clampPct(canvasDrag.y+(e.clientY-canvasDrag.startY)/rect.height*100);
 drawSoon();
});
const clampPct=v=>Math.round(Math.max(-80,Math.min(180,v))*10)/10;
function finishCanvasDrag(){if(!canvasDrag)return;canvasDrag=null;renderInspector();commit();}
preview.addEventListener('pointerup',finishCanvasDrag);
preview.addEventListener('pointercancel',finishCanvasDrag);

function initialise(){
 let restored=false;
 try{const raw=localStorage.getItem('kaan-shader-lab-v1');if(raw){const obj=JSON.parse(raw);if(obj&&Array.isArray(obj.layers)&&FORMATS[obj.aspect]){state=obj;restored=true;}}}catch(e){}
 if(!restored)state={name:'Liquid Gold',aspect:'4:5',layers:preset('gold')};
 state.layers=state.layers.filter(l=>l&&TYPES.includes(l.type)&&l.params&&typeof l.params==='object').slice(0,100);
 serial=Math.max(serial,0,...state.layers.map(l=>Number(String(l.id||'').match(/^layer-(\d+)$/)?.[1])||0));
 selected=state.layers[0]?state.layers[0].id:null;
 rehydrate();sync();commit();showMobile('canvas');
 const bootSnapshot=JSON.stringify(state);
 readAutoSave().then(saved=>{
  if(saved&&Array.isArray(saved.layers)&&FORMATS[saved.aspect]&&JSON.stringify(state)===bootSnapshot){
   state=saved;serial=Math.max(serial,0,...state.layers.map(l=>Number(String(l.id||'').match(/^layer-(\\d+)$/)?.[1])||0));
   selected=state.layers[0]?.id||null;rehydrate();sync();snapshots=[];historyIndex=-1;commit();
  }
 }).catch(()=>{}).finally(()=>{storageReady=true;store();});
}
initialise();
})();