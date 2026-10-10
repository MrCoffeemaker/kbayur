/* KAAN Shader Lab - standalone Canvas2D procedural rendering engine */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=x=>x-Math.floor(x);
const rnd=n=>fract(Math.sin(n*127.1+78.233)*43758.5453);
function hexRgb(h){const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return [255,255,255];return [parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16)];}
function rgba(hex,a){const c=hexRgb(hex);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
function lerpColor(a,b,q){const x=hexRgb(a),y=hexRgb(b);return 'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*q)).join(',')+')';}
function ellipseGlow(ctx,x,y,rx,ry,col,a){ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();}
function background(ctx,p,w,h){const g=p.gradient==='solid'?null:(p.gradient==='radial'?ctx.createRadialGradient(w*(p.x||50)/100,h*(p.y||50)/100,1,w*.5,h*.5,Math.max(w,h)*.85):ctx.createLinearGradient(0,0,w,h));if(g){g.addColorStop(0,p.color1||'#332142');g.addColorStop(1,p.color2||'#080b17');ctx.fillStyle=g;}else ctx.fillStyle=p.color1||'#000';ctx.fillRect(0,0,w,h);}
function pathLine(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);}
function silk(ctx,p,w,h,t){
 const count=clamp(+p.count||66,8,220),amp=(+(p.amplitude??100))*h/900,frequency=+p.frequency||2.8,ref=+p.refraction||1.45,seed=+p.seed||0,time=t*(+(p.speed??0.5));
 const top=p.color1||'#ffb759',bottom=p.color2||'#5a220f';
 ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate((+p.rotate||0)*Math.PI/180);ctx.translate(-w*.5,-h*.5);
 ellipseGlow(ctx,w*.64,h*.22,w*.9,h*.65,top,.37);
 ellipseGlow(ctx,w*.4,h*.88,w*.7,h*.8,bottom,.47);
 const yStart=-h*.32,space=h*1.65/count;
 for(let i=0;i<count;i++){
  const row=yStart+i*space;
  const pts=[];
  for(let x=-w*.14;x<=w*1.16;x+=Math.max(6,w/105)){
   const nx=x/w,ny=row/h;
   const swirl=Math.sin(nx*frequency*2.0 + ny*3.7 + seed*.034 + time*.26);
   const middle=Math.exp(-Math.pow((nx-.50)*1.7,2));
   const fold=Math.sin(nx*5.5 - ny*8.2*ref + seed*.041 - time*.38);
   const trough=Math.sin((nx-.27)*Math.PI*1.12)*h*.11*ref;
   const y=row+swirl*amp*(.28+middle*.56)+fold*amp*.3*middle+trough+Math.pow(nx-.35,2)*h*.08;
   pts.push([x,y]);
  }
  pathLine(ctx,pts);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(8,5,8,.45)';ctx.lineWidth=Math.max(2.4,space*.4);ctx.stroke();
  const grad=ctx.createLinearGradient(0,row,w,row+amp);grad.addColorStop(0,rgba(bottom,.72));grad.addColorStop(.28,rgba(top,.7));grad.addColorStop(.59,rgba(top,.93));grad.addColorStop(.8,rgba(bottom,.8));grad.addColorStop(1,rgba(top,.8));
  pathLine(ctx,pts);ctx.lineWidth=Math.max(1.1,space*.13);ctx.strokeStyle=grad;ctx.stroke();
  if(i%3===0){pathLine(ctx,pts);ctx.lineWidth=Math.max(.5,space*.045);ctx.strokeStyle=rgba('#fff4d4',.41);ctx.stroke();}
 }
 ctx.globalCompositeOperation='multiply';ellipseGlow(ctx,w*.83,h*.98,w*.75,h*.72,'#12090b',.62);
 ctx.restore();
}
function topographic(ctx,p,w,h,t){
 const num=clamp(+p.count||48,5,140),amp=(+(p.amplitude??100))*w/900,freq=+p.frequency||2.8,seed=+p.seed||0;
 const cx=w*(.52+Math.sin(seed)*.05),cy=h*.52;
 for(let i=0;i<num;i++){
  const r=(i+1)*Math.max(w,h)*.015,pts=[];
  for(let j=0;j<=180;j++){const a=j/180*TAU;
   const wave=Math.sin(a*freq*2+i*.19+seed*.2+t*(+(p.speed??.4)))*.19*amp+Math.sin(a*9+i*.18)*amp*.08;
   pts.push([cx+Math.cos(a)*(r+wave),cy+Math.sin(a)*(r+wave)*.85]);
  }
  pathLine(ctx,pts);ctx.closePath();ctx.lineWidth=i%4===0?1.9:.9;ctx.strokeStyle=rgba(i%3===0?p.color1:p.color2,.18+(i%7)/12);ctx.stroke();
 }
}
function halftone(ctx,p,w,h,t){
 const step=clamp(Math.round(h/Math.max(7,+p.count||55)),5,70),seed=+p.seed||0;
 const c1=p.color1||'#d8a8ff',c2=p.color2||'#282049';
 for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){
  const v=(Math.sin(x/w*TAU*(+p.frequency||3)+t*(+(p.speed??.3))+seed)*Math.cos(y/h*9+seed*.23)+1)*.5;
  const r=step*.07+v*step*.43;
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=v>.46?rgba(c1,.88):rgba(c2,.84);ctx.fill();
 }
}
function flow(ctx,p,w,h,t){
 const count=clamp(Math.round((+p.count||66)*2.5),20,520),seed=+p.seed||0,amp=+p.amplitude||100,freq=+p.frequency||2.8;
 for(let k=0;k<count;k++){
  let x=rnd(k+seed*7)*w,y=rnd(k*17+seed*3)*h;
  ctx.beginPath();ctx.moveTo(x,y);
  const length=clamp(Math.round(amp*.38),16,120);
  for(let j=0;j<length;j++){
   const ang=Math.sin((x/w*freq*5)+(y/h*freq*3)+t*(+(p.speed??.4))) *2.3 +Math.cos(y/h*5+x/w*4+seed)*1.4;
   x+=Math.cos(ang)*2.7;y+=Math.sin(ang)*2.7;ctx.lineTo(x,y);
   if(x<-20||y<-20||x>w+20||y>h+20)break;
  }
  ctx.strokeStyle=rgba(k%4===0?p.color2:p.color1,.22+rnd(k+90)*.6);
  ctx.lineWidth=.5+rnd(k+50)*1.4;ctx.stroke();
 }
}
function grid(ctx,p,w,h,t){
 const n=clamp(+p.count||50,6,160),step=w/n,seed=+p.seed||0;
 ctx.strokeStyle=rgba(p.color1||'#a9ffdd',.6);ctx.lineWidth=Math.max(.5,w/1100);
 for(let x=0;x<=w;x+=step){ctx.beginPath();for(let y=0;y<=h;y+=8){const off=Math.sin(y/h*(+p.frequency||3)*TAU+x/w*5+seed+t*(+(p.speed??.4)))* (+(p.amplitude??60))*.18;ctx.lineTo(x+off,y);}ctx.stroke();}
 for(let y=0;y<=h;y+=step){ctx.beginPath();for(let x=0;x<=w;x+=8){const off=Math.sin(x/w*(+p.frequency||3)*TAU+y/h*6+seed+t*(+(p.speed??.4)))*(+(p.amplitude??60))*.18;ctx.lineTo(x,y+off);}ctx.stroke();}
}
function orbits(ctx,p,w,h,t){
 const count=clamp(+p.count||66,5,160),seed=+p.seed||0;
 ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate((+p.rotate||0)*Math.PI/180);
 for(let i=0;i<count;i++){const r=Math.min(w,h)*.04+i*Math.max(w,h)/count*.6;
 ctx.beginPath();ctx.ellipse(0,0,r,r*(.6+.16*Math.sin(i*.17+seed)),i*.048+t*(+(p.speed??.4))*.06,Math.sin(i)*.4,TAU-.5);
 ctx.strokeStyle=rgba(i%5?p.color1:p.color2,.32+.45*i/count);ctx.lineWidth=i%7===0?2.2:.8;ctx.stroke();}
 ctx.restore();
}
function noise(ctx,p,w,h,t){
 const count=clamp((+p.count||66)*45,200,14000),seed=(+p.seed||0)+(Math.floor(t*(+(p.speed??.4))*5));
 for(let i=0;i<count;i++){const x=rnd(i*11+seed*16)*w,y=rnd(i*33+seed*19)*h,s=rnd(i*7+seed)*2+0.4;
 ctx.fillStyle=rgba(i%4===0?p.color2:p.color1,.1+rnd(i+seed)*.42);ctx.fillRect(x,y,s,s);}
}

/* Additional original mobile-friendly generative algorithms */
function extraPattern(ctx,p,w,h,t){
 const mode=p.mode||'',n=clamp(+p.count||60,6,180),amp=+(p.amplitude??75),freq=+(p.frequency??3),seed=+p.seed||1,a=p.color1||'#ffd1a1',b=p.color2||'#302043',speed=+(p.speed??.4);
 if(mode==='chladni'){
   const cell=Math.max(3,Math.ceil(Math.max(w,h)/230)),fx=Math.max(1,Math.round(freq)),fy=fx+2;
   for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){
    const u=x/w*Math.PI,v=y/h*Math.PI;
    const z=Math.sin(fx*u+seed*.02)*Math.sin(fy*v+t*speed)-Math.sin(fy*u)*Math.sin(fx*v+seed*.02);
    if(Math.abs(z)<.06+amp/5000){ctx.fillStyle=Math.abs(z)<.035?a:b;ctx.fillRect(x,y,cell,cell);}
   }
 }else if(mode==='moire'){
   ctx.save();ctx.lineWidth=Math.max(.5,amp/140);
   for(let k=0;k<2;k++){const cx=w*(k?.7:.35),cy=h*(k?.54:.43);
    for(let i=0;i<n;i++){ctx.beginPath();const r=(i+1)*Math.max(w,h)*1.4/n;ctx.ellipse(cx,cy,r,r,0,0,TAU);ctx.strokeStyle=rgba(k?a:b,.22+.55*i/n);ctx.stroke();}
   }ctx.restore();
 }else if(mode==='pixelgrid'){
   const cell=clamp(Math.round(Math.max(w,h)/n),4,80);
   for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){
    const z=Math.sin(x/w*freq*TAU+Math.sin(y/h*7)+t*speed)*Math.cos(y/h*freq*TAU+seed*.1);
    const k=clamp((z+1)/2,0,1);
    ctx.fillStyle=lerpColor(b,a,k);ctx.globalAlpha=.32+.65*k;
    const size=cell*(.2+.77*k);ctx.fillRect(x+(cell-size)/2,y+(cell-size)/2,size,size);
   }ctx.globalAlpha=1;
 }else if(mode==='plasma'){
   const cell=Math.max(4,Math.ceil(Math.max(w,h)/155));
   for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){
    const u=x/w,v=y/h;
    const z=Math.sin(u*freq*5+t*speed)+Math.cos(v*freq*8-t*speed*.6)+Math.sin((u+v)*freq*7+seed*.1);
    ctx.fillStyle=lerpColor(b,a,clamp((z+3)/6,0,1));ctx.fillRect(x,y,cell,cell);
   }
 }else if(mode==='waveform'){
   ctx.save();ctx.lineWidth=Math.max(.5,amp/90);ctx.lineCap='round';
   for(let i=0;i<n;i++){const y0=h*i/n;ctx.beginPath();for(let x=0;x<=w;x+=Math.max(3,w/140)){
    const u=x/w;
    const wave=Math.sin(u*TAU*freq+i*.22+t*speed+seed*.04)+Math.sin(u*freq*11+i*.09-t*speed*.7)*.3;
    const y=y0+wave*amp*(.2+.6*Math.sin(i/n*Math.PI));
    if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }ctx.strokeStyle=rgba(i%4?a:b,.25+.6*Math.abs(Math.sin(i*.12)));ctx.stroke();}ctx.restore();
 }else if(mode==='sunburst'){
   const cx=w*.5,cy=h*.54;ctx.save();ctx.translate(cx,cy);ctx.rotate(t*speed*.03);
   for(let i=0;i<n*3;i++){const theta=i/(n*3)*TAU,inner=8+(i%7)*amp*.22;ctx.beginPath();
    ctx.moveTo(Math.cos(theta)*inner,Math.sin(theta)*inner);
    ctx.lineTo(Math.cos(theta)*Math.max(w,h)*1.3,Math.sin(theta)*Math.max(w,h)*1.3);
    ctx.strokeStyle=rgba(i%4?a:b,.16+.5*rnd(i+seed));ctx.lineWidth=.6+rnd(i*3+seed)*amp*.04;ctx.stroke();
   }ctx.restore();
 }else if(mode==='starfield'){
   const stars=Math.min(2500,n*19);ctx.save();
   for(let i=0;i<stars;i++){const z=rnd(i*12+seed),x=rnd(i*21+seed)*w,y=rnd(i*13+seed)*h,r=.35+z*amp*.024;ctx.fillStyle=rgba(i%6?a:b,.4+z*.6);ctx.fillRect(x,y,r,r);if(i%67===0){ctx.strokeStyle=rgba(a,.3+z*.3);ctx.beginPath();ctx.moveTo(x-3*r,y);ctx.lineTo(x+3*r,y);ctx.moveTo(x,y-3*r);ctx.lineTo(x,y+3*r);ctx.stroke();}}
   ctx.restore();
 }else if(mode==='interference'){
   const cell=Math.max(3,Math.ceil(Math.max(w,h)/200));
   for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){
    const d1=Math.hypot((x-w*.34)/w,(y-h*.4)/h),d2=Math.hypot((x-w*.66)/w,(y-h*.55)/h);
    const z=Math.cos(d1*TAU*freq*6-t*speed*2)+Math.cos(d2*TAU*freq*6+t*speed*1.3);
    if(z>-.3){ctx.fillStyle=rgba(z>1?a:b,.18+clamp(z/2,0,.75));ctx.fillRect(x,y,cell,cell);}
   }
 }else if(mode==='ribbonmesh'){
  ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate((+p.rotate||0)*Math.PI/180);ctx.translate(-w*.5,-h*.5);
  for(let i=0;i<n;i++){
   const y0=i/n*h*1.6-h*.3;
   ctx.beginPath();
   for(let x=0;x<=w;x+=Math.max(4,w/110)){
    const u=x/w;const wave=Math.sin(u*freq*TAU+i*.11+seed*.04+t*speed)*amp*.46+Math.cos(u*10+i*.21)*amp*.18;
    if(x===0)ctx.moveTo(x,y0+wave);else ctx.lineTo(x,y0+wave);
   }
   ctx.strokeStyle=rgba(i%2?a:b,.32+i/n*.55);ctx.lineWidth=1+(i%8===0?amp*.055:0);ctx.stroke();
  }ctx.restore();
 }else if(mode==='checkers'){
   const cell=clamp(Math.round(Math.max(w,h)/(n*.55)),9,90);
   for(let y=-cell;y<h+cell;y+=cell)for(let x=-cell;x<w+cell;x+=cell){
    const xi=Math.round(x/cell),yi=Math.round(y/cell),wave=Math.sin(x/w*freq*TAU+t*speed+seed*.04)*amp*.28;
    ctx.fillStyle=(xi+yi)%2?a:b;
    ctx.fillRect(x+wave,y+Math.cos(x/w*TAU*freq+yi*.23)*amp*.14,cell,cell);
   }
 }
}

function procedural(ctx,p,w,h,t){
 const mode=p.mode||'silk';
 if(mode==='silk')silk(ctx,p,w,h,t);
 else if(mode==='topographic')topographic(ctx,p,w,h,t);
 else if(mode==='halftone')halftone(ctx,p,w,h,t);
 else if(mode==='flow')flow(ctx,p,w,h,t);
 else if(mode==='grid')grid(ctx,p,w,h,t);
 else if(mode==='orbits')orbits(ctx,p,w,h,t);
 else if(mode==='noise')noise(ctx,p,w,h,t);
 else extraPattern(ctx,p,w,h,t);
}
function drawShape(ctx,p,w,h,t){
 const s=Math.min(w,h)*(+(p.size??35))/100,cx=w*(+(p.x??50))/100,cy=h*(+(p.y??50))/100;
 ctx.save();ctx.translate(cx,cy);ctx.rotate(((+p.rotate||0)+Math.sin(t*(+(p.speed??0)))*(+p.motion||0))*Math.PI/180);
 ctx.beginPath();const shape=p.shape||'circle';
 if(shape==='rectangle')ctx.rect(-s/2,-s/2,s,s);
 else if(shape==='ellipse')ctx.ellipse(0,0,s*.6,s*.39,0,0,TAU);
 else if(shape==='ring'){ctx.arc(0,0,s*.5,0,TAU);ctx.arc(0,0,s*.35,0,TAU,true);}
 else {const n=shape==='triangle'?3:shape==='star'?10:shape==='hexagon'?6:64;for(let i=0;i<=n;i++){const a=i/n*TAU-Math.PI/2;const r=shape==='star'?(i%2?s*.23:s*.5):s*.5;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
 ctx.fillStyle=p.color1||'#ffffff';ctx.fill(p.fillRule==='evenodd'||shape==='ring'?'evenodd':'nonzero');
 if((+p.stroke||0)>0){ctx.strokeStyle=p.color2||'#000';ctx.lineWidth=+p.stroke*s/100;ctx.stroke();}
 ctx.restore();
}
function drawText(ctx,p,w,h){
 const s=Math.min(w,h)*(+p.size||10)/100;
 ctx.save();ctx.translate(w*(+(p.x??50))/100,h*(+(p.y??50))/100);ctx.rotate((+p.rotate||0)*Math.PI/180);
 ctx.textAlign=p.align||'center';ctx.textBaseline='middle';ctx.fillStyle=p.color1||'#fff';
 ctx.font=(p.weight||'700')+' '+s+'px '+(p.font||'sans-serif');
 const lines=String(p.text||'SHADER LAB').split('\n').slice(0,10);const lh=s*1.16;
 lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*lh,w*.92));ctx.restore();
}
function drawSphere(ctx,p,w,h,t){
 const s=Math.min(w,h)*(+p.size||50)/100,x=w*(+(p.x??50))/100,y=h*(+(p.y??50))/100;
 ctx.save();ellipseGlow(ctx,x+s*.17,y+s*.35,s*.68,s*.3,'#000000',.63);
 ctx.beginPath();ctx.arc(x,y,s*.5,0,TAU);ctx.clip();
 const g=ctx.createRadialGradient(x-s*.21,y-s*.26,s*.04,x+s*.12,y+s*.14,s*.82);
 g.addColorStop(0,'#fff8e8');g.addColorStop(.12,p.color1||'#e7a1f7');g.addColorStop(.58,p.color2||'#282144');g.addColorStop(1,'#07070f');ctx.fillStyle=g;ctx.fillRect(x-s,y-s,s*2,s*2);
 for(let i=0;i<28;i++){const yy=y-s*.5+i*s/27;ctx.beginPath();ctx.ellipse(x,yy,s*.5,Math.max(.2,s*.11*Math.abs(Math.sin((i+t*(+(p.speed??.2)))* .2))),0,0,Math.PI);
 ctx.strokeStyle=rgba(p.color1||'#ffddaa',.03+.13*i/28);ctx.lineWidth=1;ctx.stroke();}
 ctx.restore();
}
function image(ctx,p,w,h,asset){
 if(!asset||(!asset.complete&&asset.tagName==='IMG')||(asset.tagName==='VIDEO'&&asset.readyState<2))return;
 const aw=asset.videoWidth||asset.naturalWidth||asset.width,ah=asset.videoHeight||asset.naturalHeight||asset.height;if(!aw||!ah)return;
 const fit=p.fit||'cover',s=+p.size||100;
 const k=(fit==='contain'?Math.min(w/aw,h/ah):Math.max(w/aw,h/ah))*s/100;
 const dw=aw*k,dh=ah*k;
 ctx.save();ctx.translate(w*(+(p.x??50))/100,h*(+(p.y??50))/100);ctx.rotate((+p.rotate||0)*Math.PI/180);
 ctx.drawImage(asset,-dw/2,-dh/2,dw,dh);ctx.restore();
}

/* Post-processing passes run on existing stacked content. */
function advancedEffect(f,original,o,p,w,h,t,fx,amount){
 const freq=+(p.frequency??5),speed=+(p.speed??.4);
 if(fx==='fluted-glass'){
  const flutes=Math.max(3,Math.round(freq*5)),width=w/flutes;
  for(let i=0;i<flutes;i++){
   const x=i*width,dx=Math.sin((i/flutes)*Math.PI*3.2+t*speed*.9)*amount*.42;
   f.drawImage(original,Math.max(0,Math.min(w-1,x+dx)),0,Math.min(width+1,w-Math.max(0,Math.min(w-1,x+dx))),h,x,0,width+1,h);
   let grad=f.createLinearGradient(x,0,x+width,0);
   grad.addColorStop(0,'#00000030');grad.addColorStop(.3,'#ffffff28');grad.addColorStop(.53,'#ffffff08');grad.addColorStop(1,'#00000046');
   f.fillStyle=grad;f.fillRect(x,0,width+1,h);
  }return true;
 }
 if(fx==='swirl'){
  const tile=Math.max(4,Math.ceil(Math.max(w,h)/140)),cx=w*.5,cy=h*.5,rmax=Math.min(w,h)*.75;
  for(let y=0;y<h;y+=tile)for(let x=0;x<w;x+=tile){
   const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy),theta=Math.atan2(dy,dx)+(1-r/rmax)*amount*.034+t*speed*.13;
   const sx=clamp(Math.round(cx+Math.cos(theta)*r),0,w-tile),sy=clamp(Math.round(cy+Math.sin(theta)*r),0,h-tile);
   f.drawImage(original,sx,sy,Math.min(tile,w-sx),Math.min(tile,h-sy),x,y,tile,tile);
  }return true;
 }
 if(fx==='ripple'){
  const row=Math.max(2,Math.round(h/230));
  for(let y=0;y<h;y+=row){const offset=Math.sin(y/h*TAU*freq+t*speed*3)*amount*.53;f.drawImage(original,0,y,w,Math.min(row,h-y),offset,y,w,Math.min(row,h-y));}
  return true;
 }
 if(fx==='vignette'){
  f.drawImage(original,0,0);const g=f.createRadialGradient(w*.5,h*.48,w*.06,w*.5,h*.5,Math.max(w,h)*.77);
  g.addColorStop(0,'#00000000');g.addColorStop(1,'rgba(0,0,0,'+(amount/100)+')');
  f.fillStyle=g;f.fillRect(0,0,w,h);return true;
 }
 if(fx==='scanlines'){
  f.drawImage(original,0,0);const stride=Math.max(2,Math.round(3+amount/16));
  f.fillStyle='rgba(0,0,0,'+(.18+amount/200)+')';
  for(let y=0;y<h;y+=stride)f.fillRect(0,y,w,Math.max(1,stride*.35));
  return true;
 }
 if(fx==='grain'){
  f.drawImage(original,0,0);const count=Math.min(18000,Math.round(w*h/45));
  for(let i=0;i<count;i++){
   const x=rnd(i*6+Math.floor(t*12))*w,y=rnd(i*35+Math.floor(t*8))*h;
   f.fillStyle=i%2===0?'rgba(255,255,255,'+(amount/600)+')':'rgba(0,0,0,'+(amount/300)+')';
   f.fillRect(x,y,1+amount/45,1+amount/45);
  }return true;
 }
 if(fx==='mirror'){
  f.drawImage(original,0,0);f.save();f.translate(w,0);f.scale(-1,1);f.drawImage(original,0,0,w*.5,h,0,0,w*.5,h);f.restore();return true;
 }
 if(fx==='posterize'||fx==='duotone'||fx==='edge'||fx==='emboss'){
  const img=o.getImageData(0,0,w,h),a=img.data,b=f.createImageData(w,h),z=b.data;
  const levels=Math.max(2,Math.round(2+(100-amount)/11));
  const c0=hexRgb(p.color1||'#f2c5ff'),c1=hexRgb(p.color2||'#201323');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4;
   if(fx==='posterize'){for(let c=0;c<3;c++)z[i+c]=Math.round(a[i+c]/255*(levels-1))*255/(levels-1);}
   else if(fx==='duotone'){const v=(a[i]*.299+a[i+1]*.587+a[i+2]*.114)/255;for(let c=0;c<3;c++)z[i+c]=c0[c]*(1-v)+c1[c]*v;}
   else if(fx==='emboss'){const off=(clamp(x+1,0,w-1)+(clamp(y+1,0,h-1))*w)*4;for(let c=0;c<3;c++)z[i+c]=clamp(128+(a[i+c]-a[off+c])*(1+amount/35),0,255);}
   else {const xl=(y*w+clamp(x-1,0,w-1))*4,xr=(y*w+clamp(x+1,0,w-1))*4,yu=(clamp(y-1,0,h-1)*w+x)*4,yd=(clamp(y+1,0,h-1)*w+x)*4;const d=Math.abs((a[xr]+a[xr+1]+a[xr+2])-(a[xl]+a[xl+1]+a[xl+2]))+Math.abs((a[yd]+a[yd+1]+a[yd+2])-(a[yu]+a[yu+1]+a[yu+2]));z[i]=z[i+1]=z[i+2]=clamp(d*(.3+amount/60),0,255);}
   z[i+3]=a[i+3];
  }
  f.putImageData(b,0,0);return true;
 }
 if(fx==='ascii'){
  f.fillStyle=p.color2||'#13101a';f.fillRect(0,0,w,h);
  const pixel=clamp(Math.round(8+amount*.33),8,42),data=o.getImageData(0,0,w,h).data;
  const chars='@%#*+=-:. ';f.fillStyle=p.color1||'#c2ffe1';f.font=Math.round(pixel*.92)+'px monospace';f.textAlign='left';f.textBaseline='middle';
  for(let y=0;y<h;y+=pixel)for(let x=0;x<w;x+=pixel*.6){
    const i=(Math.floor(y)*w+Math.floor(x))*4,luma=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;
    f.fillText(chars[clamp(Math.floor(luma/256*chars.length),0,chars.length-1)],x,y);
  }return true;
 }
 if(fx==='hex-halftone'){
  const d=o.getImageData(0,0,w,h).data,spacing=Math.max(6,Math.round(7+amount*.18));
  f.fillStyle=p.color2||'#151224';f.fillRect(0,0,w,h);
  for(let y=0,ry=0;y<h;y+=spacing*.86,ry++)for(let x=(ry%2)*spacing*.5;x<w;x+=spacing){
   const px=clamp(Math.floor(x),0,w-1),py=clamp(Math.floor(y),0,h-1),idx=(py*w+px)*4,v=(d[idx]+d[idx+1]+d[idx+2])/765;
   f.fillStyle=p.color1||'#f9d4f8';f.beginPath();
   const rr=Math.max(.5,v*spacing*.58);
   for(let k=0;k<=6;k++){const ang=k*TAU/6,xx=x+Math.cos(ang)*rr,yy=y+Math.sin(ang)*rr;if(k===0)f.moveTo(xx,yy);else f.lineTo(xx,yy);}f.closePath();f.fill();
  }return true;
 }
 return false;
}

function effect(ctx,p,w,h,t){
 const original=document.createElement('canvas');original.width=w;original.height=h;
 const o=original.getContext('2d',{willReadFrequently:true});o.drawImage(ctx.canvas,0,0);
 const amount=clamp(+p.strength||20,0,100),scale=Math.max(1,Math.round(amount/3)),fx=p.effect||'refract';
 const out=document.createElement('canvas');out.width=w;out.height=h;const f=out.getContext('2d',{willReadFrequently:true});
 if(fx==='refract'){
  const stride=Math.max(2,Math.round(h/150));
  for(let y=0;y<h;y+=stride){const dx=Math.sin(y/h*TAU*(+p.frequency||5)+t*(+p.speed||.5)*1.7)*amount*.85;f.drawImage(original,0,y,w,Math.min(stride,h-y),dx,y,w,Math.min(stride,h-y));}
 }else if(fx==='pixelate'){
  const tw=Math.max(1,Math.round(w/scale)),th=Math.max(1,Math.round(h/scale));
  const small=document.createElement('canvas');small.width=tw;small.height=th;small.getContext('2d').drawImage(original,0,0,tw,th);f.imageSmoothingEnabled=false;f.drawImage(small,0,0,w,h);
 }else if(fx==='chromatic'){
  const src=o.getImageData(0,0,w,h),dst=f.createImageData(w,h),a=src.data,b=dst.data,off=Math.round(amount*.3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,lr=(y*w+clamp(x+off,0,w-1))*4,lb=(y*w+clamp(x-off,0,w-1))*4;b[i]=a[lr];b[i+1]=a[i+1];b[i+2]=a[lb+2];b[i+3]=a[i+3];}
  f.putImageData(dst,0,0);
 }else if(fx==='halftone'){
  f.fillStyle='#111015';f.fillRect(0,0,w,h);
  const step=Math.max(5,Math.round(5+amount*.35)),img=o.getImageData(0,0,w,h).data;
  for(let y=step/2;y<h;y+=step)for(let x=step/2;x<w;x+=step){const i=(Math.floor(y)*w+Math.floor(x))*4,b=(img[i]+img[i+1]+img[i+2])/765,r=step*.5*b;f.beginPath();f.arc(x,y,r,0,TAU);f.fillStyle='rgb('+img[i]+','+img[i+1]+','+img[i+2]+')';f.fill();}
 }else if(fx==='dither'){
  const src=o.getImageData(0,0,w,h),d=src.data,step=clamp(Math.round(2+amount*.08),2,10);
  for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const i=(y*w+x)*4,gray=(d[i]*.299+d[i+1]*.587+d[i+2]*.114),threshold=((x/step+y/step)%2)*36+110;f.fillStyle=gray>threshold?p.color1||'#ffffff':p.color2||'#191323';f.fillRect(x,y,step,step);}
 }else if(fx==='invert'){
  f.filter='invert('+(amount/100)+')';f.drawImage(original,0,0);f.filter='none';
 }else if(!advancedEffect(f,original,o,p,w,h,t,fx,amount)){f.drawImage(original,0,0);}
 ctx.save();ctx.globalAlpha=clamp(p.opacity===undefined?1:+p.opacity,0,1);ctx.globalCompositeOperation='source-over';ctx.drawImage(out,0,0);ctx.restore();
}
function blur(ctx,p,w,h){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const x=c.getContext('2d');x.filter='blur('+clamp(+p.strength||10,0,80)+'px)';x.drawImage(ctx.canvas,0,0);
 ctx.save();ctx.globalAlpha=clamp(p.opacity===undefined?1:+p.opacity,0,1);ctx.drawImage(c,0,0);ctx.restore();
}
function draw(canvas,layers,t,media){
 const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true}),w=canvas.width,h=canvas.height;
 ctx.fillStyle='#09090e';ctx.fillRect(0,0,w,h);
 for(let j=layers.length-1;j>=0;j--){
  const layer=layers[j];if(layer.visible===false)continue;
  const p=layer.params||{};
  if(layer.type==='image-shader'){effect(ctx,p,w,h,t);continue;}
  if(layer.type==='blur'){blur(ctx,p,w,h);continue;}
  ctx.save();ctx.globalAlpha=clamp(p.opacity===undefined?1:+p.opacity,0,1);
  ctx.globalCompositeOperation=p.blend||'source-over';
  if(layer.type==='procedural')procedural(ctx,p,w,h,t);
  else if(layer.type==='color')background(ctx,p,w,h);
  else if(layer.type==='shape')drawShape(ctx,p,w,h,t);
  else if(layer.type==='text')drawText(ctx,p,w,h);
  else if(layer.type==='sphere')drawSphere(ctx,p,w,h,t);
  else if(layer.type==='image'||layer.type==='video')image(ctx,p,w,h,media.get(layer.id));
  ctx.restore();
 }
}
window.ShaderEngine={draw,clamp,hexRgb};
})();