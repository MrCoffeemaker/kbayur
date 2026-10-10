/* KAAN Shader Lab / Zero-dependency WebGL primitives, with Canvas2D fallback */
(function(){
'use strict';
let renderer=null;
const geometryCache=new Map();
const max=(a,b)=>Math.max(a,b);
function makeGeometry(shape){
 const data=[],push=(v)=>data.push(...v);
 const tri=(a,b,c)=>{push(a);push(b);push(c);};
 const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
 const wrap=(fn,nu,nv)=>{
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){
   const u=i/nu,v=j/nv,U=(i+1)/nu,V=(j+1)/nv;
   quad(fn(u,v),fn(U,v),fn(U,V),fn(u,V));
  }
 };
 const label=shape||'sphere';
 if(label==='torus'){
  wrap((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI*2,R=.68,r=.32;
   const x=(R+r*Math.cos(b))*Math.cos(a),y=(R+r*Math.cos(b))*Math.sin(a),z=r*Math.sin(b);
   return [x,y,z,Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)];},52,24);
 }else if(label==='box'){
  const faces=[
   [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[0,0,1]],
   [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
   [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]],
   [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]],
   [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1],[0,1,0]],
   [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]]
  ];
  for(const face of faces){const normal=face[4];quad(...face.slice(0,4).map(v=>[...v.map(x=>x*.69),...normal]));}
 }else if(label==='cylinder'){
  wrap((u,v)=>{const a=u*Math.PI*2,z=(v-.5)*1.8;return [Math.cos(a)*.75,Math.sin(a)*.75,z,Math.cos(a),Math.sin(a),0];},50,2);
  for(const sign of [-1,1])for(let i=0;i<50;i++){const a=i/50*Math.PI*2,b=(i+1)/50*Math.PI*2,z=sign*.9;const c=[0,0,z,0,0,sign],p=[Math.cos(a)*.75,Math.sin(a)*.75,z,0,0,sign],q=[Math.cos(b)*.75,Math.sin(b)*.75,z,0,0,sign];if(sign===1)tri(c,p,q);else tri(c,q,p);}
 }else if(label==='plane'){
  wrap((u,v)=>{const x=(u-.5)*1.9,y=(v-.5)*1.9;return [x,y,Math.sin(u*14)*Math.cos(v*12)*.11,0,0,1];},48,48);
 }else{
  wrap((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI,r=Math.sin(b),x=Math.cos(a)*r,y=Math.sin(a)*r,z=Math.cos(b);
   return [x,y,z,x,y,z];},40,28);
 }
 return new Float32Array(data);
}
function shader(gl,type,source){
 const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Shader compile failed');
 return sh;
}
function setup(){
 const canvas=document.createElement('canvas');
 canvas.width=384;canvas.height=384;
 const gl=canvas.getContext('webgl',{alpha:true,depth:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
 if(!gl)return null;
 const vertex=shader(gl,gl.VERTEX_SHADER,
 'attribute vec3 aPosition;attribute vec3 aNormal;uniform float uTime;uniform float uSpin;uniform float uTilt;uniform float uSpeed;uniform float uMode;varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 p=aPosition;if(uMode>3.5){p.z+=.12*sin(p.x*11.0+uTime*uSpeed*2.0)*cos(p.y*8.0+uTime*uSpeed);}float a=uSpin+uTime*uSpeed*.65;float b=uTilt+sin(uTime*uSpeed*.5)*.06;mat3 ry=mat3(cos(a),0.0,-sin(a),0.0,1.0,0.0,sin(a),0.0,cos(a));mat3 rx=mat3(1.0,0.0,0.0,0.0,cos(b),sin(b),0.0,-sin(b),cos(b));mat3 rot=ry*rx;vec3 q=rot*p;vPosition=q;vNormal=normalize(rot*aNormal);gl_Position=vec4(q.xy*2.2,-q.z,3.3-q.z);}'
 );
 const fragment=shader(gl,gl.FRAGMENT_SHADER,
 'precision mediump float;uniform vec3 uLightColor;uniform vec3 uDarkColor;varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal),light=normalize(vec3(-.50,.74,1.15));float d=max(dot(n,light),0.0);float highlight=pow(max(dot(reflect(-light,n),normalize(vec3(0.0,0.0,1.0))),0.0),35.0);float rim=pow(1.0-abs(n.z),3.0);vec3 colour=mix(uDarkColor,uLightColor,clamp(.12+d*.86+highlight*.58,0.0,1.0));colour+=rim*uLightColor*.24;gl_FragColor=vec4(colour,1.0);}'
 );
 const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'WebGL link failed');
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 const position=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal');
 gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(normal);
 gl.vertexAttribPointer(position,3,gl.FLOAT,false,24,0);
 gl.vertexAttribPointer(normal,3,gl.FLOAT,false,24,12);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 return {canvas,gl,program,buffer,uniforms:Object.fromEntries(['uTime','uSpin','uTilt','uSpeed','uMode','uLightColor','uDarkColor'].map(k=>[k,gl.getUniformLocation(program,k)]))};
}
function colour(hex){
 const m=/^#?([a-f\d]{6})$/i.exec(hex||'')||[null,'d6b4ff'];
 return [parseInt(m[1].slice(0,2),16)/255,parseInt(m[1].slice(2,4),16)/255,parseInt(m[1].slice(4,6),16)/255];
}
function render(p,t,size){
 if(renderer===null){try{renderer=setup()||false;}catch(e){console.warn('WebGL unavailable:',e);renderer=false;}}
 if(!renderer)return null;
 const r=renderer,gl=r.gl;const target=Math.min(1024,max(128,Math.round(size)));
 if(r.canvas.width!==target){r.canvas.width=target;r.canvas.height=target;}
 gl.viewport(0,0,target,target);
 gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const shape=['sphere','torus','box','cylinder','plane'].includes(p.geometry)?p.geometry:'sphere';
 let mesh=geometryCache.get(shape);if(!mesh){mesh=makeGeometry(shape);geometryCache.set(shape,mesh);}
 gl.bindBuffer(gl.ARRAY_BUFFER,r.buffer);if(r.activeShape!==shape){gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);r.activeShape=shape;}
 gl.useProgram(r.program);const u=r.uniforms;
 gl.uniform1f(u.uTime,t);gl.uniform1f(u.uSpin,(Number(p.rotate)||0)*Math.PI/180);
 gl.uniform1f(u.uTilt,Number(p.tilt??25)*Math.PI/180);
 gl.uniform1f(u.uSpeed,Number(p.speed??.4));gl.uniform1f(u.uMode,shape==='plane'?4:0);
 gl.uniform3fv(u.uLightColor,colour(p.color1||'#d6b4ff'));gl.uniform3fv(u.uDarkColor,colour(p.color2||'#1b1640'));
 gl.drawArrays(gl.TRIANGLES,0,mesh.length/6);gl.flush();
 return r.canvas;
}
window.Kaan3D={render};
})();