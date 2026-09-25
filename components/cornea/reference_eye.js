/* Self-contained, procedural REFERENCE eye renderer. No patient scalar can enter
 * these dimensions. A source image is a color texture only, never displacement.
 * Native WebGL, with a separate canvas software 3D fallback. No remote assets.
 */
(function(root){'use strict';
const GEOMETRY=Object.freeze({globeRadius:1,corneaRadius:.64,corneaCenterZ:.60,limbusZ:.79,mapRadius:.604});
const VERTEX=`attribute vec2 a_pos; varying vec2 v_uv; void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}`;
const FRAGMENT=`precision highp float;
varying vec2 v_uv;uniform vec2 u_size;uniform vec2 u_angle;uniform float u_zoom;uniform float u_opacity;uniform float u_hasMap;uniform float u_grid;uniform float u_cut;uniform float u_focus;uniform sampler2D u_map;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
float sphere(vec3 o,vec3 d,vec3 c,float r){vec3 q=o-c;float b=dot(q,d),h=b*b-dot(q,q)+r*r;if(h<0.)return 1e4;float t=-b-sqrt(h);return t>0.?t:1e4;}
vec3 lit(vec3 base,vec3 n,vec3 d,float gloss){vec3 l=normalize(vec3(-.5,.8,1.8));float diff=max(dot(n,l),0.);float rim=pow(1.-max(dot(n,-d),0.),3.);float shine=pow(max(dot(reflect(-l,n),-d),0.),gloss);return base*(.38+.66*diff)+vec3(.30,.36,.48)*rim+vec3(.9)*shine*.22;}
vec3 iris(vec2 p){float r=length(p),a=atan(p.y,p.x);float fibres=.50+.22*sin(91.*a+30.*r)+.11*sin(173.*a-41.*r)+.12*sin(45.*a+20.*r);float ring=.5+.5*cos(r*72.);vec3 color=mix(vec3(.07,.12,.18),vec3(.27,.48,.52),fibres*.72+ring*.16);color*=.65+.35*smoothstep(.24,.42,r);color*=1.-.63*smoothstep(.52,.60,r);color=mix(vec3(.008,.012,.025),color,smoothstep(.23,.245,r));return color;}
void main(){vec2 uv=(v_uv-.5)*vec2(u_size.x/u_size.y,1.);vec3 bg=mix(vec3(.055,.052,.095),vec3(.11,.085,.17),v_uv.y);float halo=exp(-dot(uv,uv)*4.5);bg+=vec3(.03,.024,.07)*halo;
float lines=(1.-smoothstep(0.,.0025,abs(fract(uv.x*5.+.5)-.5)))+(1.-smoothstep(0.,.0025,abs(fract(uv.y*5.+.5)-.5)));bg+=lines*.008;
mat3 rotation=ry(u_angle.x)*rx(u_angle.y);vec3 target=vec3(0.,0.,u_focus*.75);vec3 o=rotation*vec3(0.,0.,3.8/u_zoom)+target;vec3 d=normalize(rotation*vec3(uv*2.20,-2.8));
float tg=sphere(o,d,vec3(0.),1.);vec3 pg=o+tg*d;float frontHole=step(.79,pg.z);if(frontHole>.5||u_focus>.5|| (u_cut>.5 && pg.x>.01))tg=1e4;
float tc=sphere(o,d,vec3(0.,0.,.60),.64);vec3 pc=o+tc*d;if(pc.z<.79||(u_cut>.5&&pc.x>.01))tc=1e4;
float ti=(.78-o.z)/d.z;vec3 pi=o+ti*d;if(ti<=0.||length(pi.xy)>.615||(u_cut>.5&&pi.x>.01)||u_focus>.5)ti=1e4;
float tl=sphere(o,d,vec3(0.,0.,.29),.43);vec3 pl=o+tl*d;if(u_cut<.5||u_focus>.5)tl=1e4;
float t=min(min(tg,tc),min(ti,tl));vec3 color=bg;
if(t<9999.){vec3 p=o+t*d;
 if(t==tg){vec3 n=normalize(p);vec3 base=vec3(.86,.88,.92);float red=.018*(.5+.5*sin(54.*atan(p.y,p.x)+sin(17.*p.z)));base+=vec3(red,-red*.5,-red*.5);color=lit(base,rotation*n,rotation*d,40.);}
 if(t==ti)color=lit(iris(pi.xy),rotation*vec3(0.,0.,1.),rotation*d,60.);
 if(t==tl)color=lit(vec3(.46,.65,.74),rotation*normalize(pl-vec3(0.,0.,.29)),rotation*d,95.);
 if(t==tc){vec3 n=normalize(pc-vec3(0.,0.,.60));float q=(.78-o.z)/d.z;vec3 under=o+q*d;vec3 base=length(under.xy)<.615?iris(under.xy):vec3(.72,.79,.86);if(u_focus>.5)base=vec3(.085,.20,.26);float fres=pow(1.-max(dot(n,-d),0.),3.);base=mix(base,vec3(.28,.51,.62),.12+fres*.30);color=lit(base,rotation*n,rotation*d,90.);
  vec2 mapUV=vec2(pc.x/(2.*.604)+.5,.5-pc.y/(2.*.604));vec4 tex=texture2D(u_map,mapUV);float edge=1.-smoothstep(.595,.606,length(pc.xy));float use=u_hasMap*tex.a*edge*u_opacity;color=mix(color,tex.rgb,use);
  if(u_grid>.5){float rings=1.-smoothstep(.007,.012,abs(fract(length(pc.xy)*7.)-.5));float meridian=(1.-smoothstep(.003,.008,abs(pc.x)))+(1.-smoothstep(.003,.008,abs(pc.y)));color=mix(color,vec3(.55,.93,.90),max(rings,meridian)*.25);}
 }
 // Antialiased-look rim and slight vignette, never a map-derived height.
 color=mix(color,bg,smoothstep(0.,1.,0.)*.0);
}
float vignette=1.-.16*pow(length(v_uv-.5)*1.3,2.);gl_FragColor=vec4(color*vignette,1.);}`;
function rotate(x,y,z,yaw,pitch){const cx=Math.cos(pitch),sx=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);const yy=y*cx-z*sx,zz=y*sx+z*cx;return {x:x*cy+zz*sy,y:yy,z:-x*sy+zz*cy};}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Graphics shader compilation failed: '+gl.getShaderInfoLog(s));return s;}
class ReferenceEye{
 constructor(canvas,fallback,notify){this.canvas=canvas;this.fallback=fallback;this.notify=notify||(()=>{});this.yaw=.34;this.pitch=-.13;this.zoom=1;this.opacity=.90;this.grid=false;this.cut=false;this.focus=false;this.texture=null;this.drawPending=false;this.drag=null;this.lost=false;
  try{this.setup();}catch(error){this.gl=null;canvas.hidden=true;fallback.hidden=false;console.warn(error.message);this.notify('Software 3D renderer · accelerated graphics unavailable.');}
  for(const target of [canvas,fallback]){target.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};target.setPointerCapture(e.pointerId);});target.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw-=(e.clientX-this.drag.x)*.009;this.pitch=Math.max(-1.3,Math.min(1.3,this.pitch-(e.clientY-this.drag.y)*.009));this.drag={x:e.clientX,y:e.clientY};this.onChange?.(this.camera());this.draw();});target.addEventListener('pointerup',()=>{this.drag=null;});target.addEventListener('pointercancel',()=>{this.drag=null;});target.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.min(2.2,Math.max(.65,this.zoom*Math.exp(-e.deltaY*.001)));this.onChange?.(this.camera());this.draw();},{passive:false});}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;canvas.hidden=true;fallback.hidden=false;this.notify('Graphics context lost; software 3D fallback is active.');this.draw();});canvas.addEventListener('webglcontextrestored',()=>{try{this.setup();this.lost=false;canvas.hidden=false;fallback.hidden=true;this.setTexture(this.texture);this.notify('WebGL restored.');}catch(_){this.lost=true;}this.draw();});this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas.parentElement);this.draw();
 }
 setup(){const gl=this.canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false});if(!gl)throw new Error('No WebGL');this.gl=gl;const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Graphics linking failed.');this.program=p;gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,'a_pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);this.uniforms=Object.fromEntries(['u_size','u_angle','u_zoom','u_opacity','u_hasMap','u_grid','u_cut','u_focus','u_map'].map(k=>[k,gl.getUniformLocation(p,k)]));this.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));this.canvas.hidden=false;this.fallback.hidden=true;}
 camera(){return {yaw:this.yaw,pitch:this.pitch,zoom:this.zoom};}
 setCamera(c){this.yaw=c.yaw;this.pitch=c.pitch;this.zoom=c.zoom;this.draw();}
 view(name){if(name==='front'){this.yaw=0;this.pitch=0;}if(name==='oblique'){this.yaw=.55;this.pitch=-.22;}if(name==='profile'){this.yaw=1.25;this.pitch=0;}this.draw();this.onChange?.(this.camera());}
 setTexture(canvas){this.texture=canvas||null;try{if(this.gl&&!this.lost){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.tex);if(canvas)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));}}catch(_){this.texture=null;this.notify('Source texture could not be decoded; no replacement map was used.');}this.draw();}
 options(values){for(const k of ['opacity','grid','cut','focus'])if(k in values)this[k]=values[k];this.draw();}
 clear(){this.setTexture(null);this.fallback.getContext('2d').clearRect(0,0,this.fallback.width,this.fallback.height);if(this.offscreen)this.offscreen.getContext('2d').clearRect(0,0,this.offscreen.width,this.offscreen.height);if(this.gl&&!this.lost){this.gl.clearColor(.055,.052,.095,1);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}this.yaw=.34;this.pitch=-.13;this.zoom=1;this.cut=false;this.focus=false;this.draw();}
 draw(){if(this.drawPending)return;this.drawPending=true;requestAnimationFrame(()=>{this.drawPending=false;this.render();});}
 render(){const canvas=this.gl&&!this.lost?this.canvas:this.fallback,box=canvas.parentElement.getBoundingClientRect();if(box.width<1||box.height<1)return;const ratio=Math.min(window.devicePixelRatio||1,1.5),w=Math.max(100,Math.round(box.width*ratio)),h=Math.max(100,Math.round(box.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 if(!this.gl||this.lost){this.software(w,h);canvas.dataset.rendered='reference-software';return;}const gl=this.gl,u=this.uniforms;gl.viewport(0,0,w,h);gl.useProgram(this.program);gl.uniform2f(u.u_size,w,h);gl.uniform2f(u.u_angle,this.yaw,this.pitch);gl.uniform1f(u.u_zoom,this.zoom*(this.focus?1.65:1));gl.uniform1f(u.u_opacity,this.opacity);gl.uniform1f(u.u_hasMap,this.texture?1:0);gl.uniform1f(u.u_grid,this.grid?1:0);gl.uniform1f(u.u_cut,this.cut?1:0);gl.uniform1f(u.u_focus,this.focus?1:0);gl.uniform1i(u.u_map,0);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.rendered='reference-webgl';canvas.dataset.texture=String(!!this.texture);
 }
 software(w,h){
  // Ray/sphere rendering is still 3D, not a flat eye illustration. Geometry is
  // fixed and independent of every patient/scalar/model field. The CPU path
  // keeps the actual viewer usable when hospital browsers disable WebGL.
  const rw=Math.min(w,760),rh=Math.max(160,Math.round(h*rw/w));
  const out=this.offscreen||(this.offscreen=document.createElement('canvas'));
  if(out.width!==rw||out.height!==rh){out.width=rw;out.height=rh;}
  const ctx=out.getContext('2d'),im=ctx.createImageData(rw,rh),pixels=im.data;
  const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cx=Math.cos(this.pitch),sx=Math.sin(this.pitch);
  const rotate=(x,y,z)=>{const yy=y*cx-z*sx,zz=y*sx+z*cx;return [x*cy+zz*sy,yy,-x*sy+zz*cy];};
  const origin=rotate(0,0,3.8/(this.zoom*(this.focus?1.65:1)));origin[2]+=this.focus?.75:0;
  const light=rotate(-.28,.52,.81),[lx,ly,lz]=light,ox=origin[0],oy=origin[1],oz=origin[2];
  const sphere=(dx,dy,dz,center,r)=>{const zz=oz-center,b=ox*dx+oy*dy+zz*dz,disc=b*b-(ox*ox+oy*oy+zz*zz-r*r);return disc>=0?Math.max(0,-b-Math.sqrt(disc)):1e4;};
  const texture=this.texture?this.texture.getContext('2d').getImageData(0,0,this.texture.width,this.texture.height):null;
  const iris=(x,y)=>{const r=Math.sqrt(x*x+y*y),a=Math.atan2(y,x);if(r<.235)return [.013,.021,.035];const fibres=.50+.22*Math.sin(91*a+30*r)+.11*Math.sin(173*a-41*r)+.12*Math.sin(45*a+20*r),ring=.5+.5*Math.cos(r*72),blend=fibres*.72+ring*.16,shade=(.65+.35*Math.min(1,Math.max(0,(r-.24)/.18)))*(1-.63*Math.min(1,Math.max(0,(r-.52)/.08)));return [(.07+.20*blend)*shade,(.12+.36*blend)*shade,(.18+.34*blend)*shade];};
  for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
   const ux=((x+.5)/rw-.5)*rw/rh,uy=.5-(y+.5)/rh,len=Math.hypot(ux*2.2,uy*2.2,2.8),[dx,dy,dz]=rotate(ux*2.2/len,uy*2.2/len,-2.8/len);
   const halo=Math.exp(-(ux*ux+uy*uy)*4.5),bg=[.060+.039*halo,.054+.022*halo,.102+.060*halo];
   let tg=sphere(dx,dy,dz,0,1),tc=sphere(dx,dy,dz,.60,.64),ti=(.78-oz)/dz,tl=sphere(dx,dy,dz,.29,.43);
   const gx=ox+tg*dx,gz=oz+tg*dz,cpx=ox+tc*dx,cpz=oz+tc*dz,ix=ox+ti*dx,iy=oy+ti*dy;
   if(gz>.79||this.focus||(this.cut&&gx>.01))tg=1e4;
   if(cpz<.79||(this.cut&&cpx>.01))tc=1e4;
   if(ti<=0||Math.hypot(ix,iy)>.615||this.focus||(this.cut&&ix>.01))ti=1e4;
   if(!this.cut||this.focus)tl=1e4;
   const t=Math.min(tg,tc,ti,tl);let color=bg;
   if(t<9999&&t>0){const px=ox+t*dx,py=oy+t*dy,pz=oz+t*dz;let n,base;
    if(t===tg){n=[px,py,pz];base=[.89,.90,.93];}
    else if(t===ti){n=[0,0,1];base=iris(px,py);}
    else if(t===tl){n=[px/.43,py/.43,(pz-.29)/.43];base=[.45,.65,.74];}
    else{n=[px/.64,py/.64,(pz-.60)/.64];base=this.focus?[.085,.20,.26]:Math.hypot(ix,iy)<.615?iris(ix,iy):[.72,.79,.86];const fres=(1-Math.max(0,-n[0]*dx-n[1]*dy-n[2]*dz))**3,blend=.12+fres*.30;base=base.map((v,i)=>v*(1-blend)+[.28,.51,.62][i]*blend);}
    const dot=Math.max(0,n[0]*lx+n[1]*ly+n[2]*lz),nv=Math.max(0,-n[0]*dx-n[1]*dy-n[2]*dz),rim=(1-nv)**3;
    const dotRaw=n[0]*lx+n[1]*ly+n[2]*lz;
    const reflection=[2*dotRaw*n[0]-lx,2*dotRaw*n[1]-ly,2*dotRaw*n[2]-lz];
    const shine=Math.max(0,-reflection[0]*dx-reflection[1]*dy-reflection[2]*dz)**(t===tg?40:90);
    color=base.map((v,i)=>v*(.38+.66*dot)+[.22,.26,.36][i]*rim+.30*shine);
    if(t===tc){const r=Math.hypot(px,py);
     if(texture){const tx=Math.min(texture.width-1,Math.max(0,Math.floor((px/1.208+.5)*texture.width))),ty=Math.min(texture.height-1,Math.max(0,Math.floor((.5-py/1.208)*texture.height))),idx=(ty*texture.width+tx)*4,alpha=texture.data[idx+3]/255*this.opacity*Math.min(1,Math.max(0,(.606-r)/.011));color=color.map((v,i)=>v*(1-alpha)+texture.data[idx+i]/255*alpha);}
     if(this.grid){const ring=Math.abs((r*7%1)-.5)<.012,meridian=Math.abs(px)<.004||Math.abs(py)<.004;if(ring||meridian)color=color.map((v,i)=>v*.70+[.55,.93,.90][i]*.30);}
    }
   }
   const vignette=1-.13*Math.min(1,ux*ux+uy*uy),j=(y*rw+x)*4;for(let i=0;i<3;i++)pixels[j+i]=Math.round(Math.min(1,Math.max(0,color[i]*vignette))*255);pixels[j+3]=255;
  }
  ctx.putImageData(im,0,0);const target=this.fallback.getContext('2d');target.imageSmoothingEnabled=true;target.clearRect(0,0,w,h);target.drawImage(out,0,0,w,h);
 }
 dispose(){this.observer.disconnect();if(this.gl){this.gl.deleteTexture(this.tex);this.gl.deleteProgram(this.program);}this.texture=null;}
}
const api={ReferenceEye,GEOMETRY,rotate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReferenceEye3D=api;
})(typeof window!=='undefined'?window:globalThis);
