/* A numerical corneal cap on an explicitly illustrative globe. No shape
 * amplification. The estimated back surface is a labelled depth-offset model;
 * native posterior surfaces, when present, use supplied coordinates instead. */
(function(root){'use strict';
const N=root.NumericalMaps,TAU=Math.PI*2,finite=Number.isFinite;
const sphere=[],rim=[],SIZE=8,LIMBUS=4.5,limbusZ=Math.sqrt(SIZE*SIZE-LIMBUS*LIMBUS);
const point=(r,a,z)=>[r*Math.cos(a),r*Math.sin(a),z];
function faces(target,a,b,c,d,type){target.push({v:[a,b,c],type},{v:[b,d,c],type});}
const theta0=Math.asin(LIMBUS/SIZE);
for(let j=0;j<24;j++)for(let i=0;i<64;i++){const v=(j,i)=>{const t=theta0+(Math.PI-theta0)*j/24,a=TAU*i/64;return[SIZE*Math.sin(t)*Math.cos(a),SIZE*Math.sin(t)*Math.sin(a),SIZE*Math.cos(t)];};faces(sphere,v(j,i),v(j,i+1),v(j+1,i),v(j+1,i+1),'sclera');}
function capMesh(model){const out=[],ys=model.y,xs=model.x,ySign=model.coordinates?.y_positive==='inferior'?-1:1;
 const front=model.z,posterior=model.posterior;
 const p=(i,j,back)=>{const height=back?(posterior?posterior[j][i]:finite(model.thickness?.[j][i])&&model.kind==='estimated'?front[j][i]-model.thickness[j][i]/1000:null):front[j][i];return finite(height)?[xs[i],ys[j]*ySign,SIZE+height]:null;};
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++)for(const back of [false,true]){const v=[p(i,j,back),p(i+1,j,back),p(i,j+1,back),p(i+1,j+1,back)];if(v.every(Boolean))faces(out,...v,back?'back':'front');}
 // A narrow, shaded outer rim connects the modeled cap to the reference globe.
 // Keep every interpolation corner inside the cap's supported grid boundary.
 const radius=Math.max(.1,model.radius-.3);
 for(let i=0;i<96;i++){const a=TAU*i/96,b=TAU*(i+1)/96,inner=angle=>{const x=radius*Math.cos(angle),y=radius*Math.sin(angle),z=N.sampleGrid(x,y,xs,ys,front);return finite(z)?[x,y*ySign,SIZE+z-.2]:null;};const p0=inner(a),p1=inner(b);if(p0&&p1)faces(out,p0,point(LIMBUS,a*ySign,limbusZ),p1,point(LIMBUS,b*ySign,limbusZ),'rim');}
 // A section on x=0 reveals the actual supplied or explicitly modeled shell.
 const i=xs.reduce((best,x,k)=>Math.abs(x)<Math.abs(xs[best])?k:best,0);
 for(let j=0;j<ys.length-1;j++){const v=[p(i,j,false),p(i,j,true),p(i,j+1,false),p(i,j+1,true)];if(v.every(Boolean))faces(out,...v,'edge');}
 return out;
}
class NumericalEye extends root.ReferenceEye3D.ReferenceEye{
 constructor(...args){super(...args);this.model=null;this.mesh=null;this.cut=false;this.layer=document.createElement('canvas');this.textureRadius=4;}
 setModel(model,cut=false){this.model=model;this.mesh=model?capMesh(model):null;this.cut=!!cut;if(model){this.canvas.hidden=true;this.fallback.hidden=false;}else{this.canvas.hidden=!this.gl||this.lost;this.fallback.hidden=!!this.gl&&!this.lost;}this.draw();}
 clear(){this.model=null;this.mesh=null;super.clear();}
 render(){if(!this.model)return super.render();const canvas=this.fallback,box=canvas.parentElement.getBoundingClientRect(),w=Math.max(200,Math.round(box.width)),h=Math.max(200,Math.round(box.height)),scale=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);const bg=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.75);bg.addColorStop(0,'#252238');bg.addColorStop(1,'#111220');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const rw=Math.round(w*1.2),rh=Math.round(h*1.2),layer=this.layer;layer.width=rw;layer.height=rh;const lc=layer.getContext('2d'),im=lc.createImageData(rw,rh),depth=new Float32Array(rw*rh),tex=this.texture?this.texture.getContext('2d').getImageData(0,0,this.texture.width,this.texture.height):null;
  const yaw=-this.yaw,pitch=-this.pitch,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),rotate=v=>{const y=v[1]*cp-v[2]*sp,z=v[1]*sp+v[2]*cp;return[v[0]*cy+z*sy,y,-v[0]*sy+z*cy];};
  const vertex=(v,type)=>{const q=rotate(v),k=Math.min(rw,rh)*1.27*this.zoom/(28-q[2]),p=[rw/2+q[0]*k,rh*.52-q[1]*k,1/(28-q[2])];let normal=type==='sclera'?v.map(x=>x/SIZE):type==='edge'?[1,0,0]:[v[0]/7.5,v[1]/7.5,1];let len=Math.hypot(...normal);normal=rotate(normal.map(x=>x/len));const light=Math.max(0,-.3*normal[0]+.45*normal[1]+.84*normal[2]),shade=.5+.52*light;let color;
   if(type==='sclera')color=[219,231,243].map(x=>x*shade);else if(type==='back')color=[83,145,175].map(x=>x*shade);else if(type==='edge')color=[227,237,246].map(x=>x*(.78+.22*light));else if(type==='rim')color=[32,66,79].map(x=>x*shade);else{color=[97,108,123];if(tex){const x=Math.max(0,Math.min(tex.width-1,Math.round((v[0]/this.textureRadius+1)*(tex.width-1)/2))),y=Math.max(0,Math.min(tex.height-1,Math.round((1-v[1]/this.textureRadius)*(tex.height-1)/2))),j=(y*tex.width+x)*4;if(tex.data[j+3])color=[tex.data[j],tex.data[j+1],tex.data[j+2]];}color=color.map(x=>x*(.90+.1*shade));}return {p,color};};
  const cache=new Map();
  for(const f of [...sphere,...this.mesh]){const mx=f.v.reduce((s,v)=>s+v[0],0)/3;if(f.type==='edge'&&!this.cut)continue;if(f.type==='back'&&!this.cut)continue;if(this.cut&&['front','back','rim'].includes(f.type)&&mx>.001)continue;const vs=f.v.map(v=>{const key=f.type+v.join(',');if(!cache.has(key))cache.set(key,vertex(v,f.type));return cache.get(key);}),a=vs[0].p,b=vs[1].p,c=vs[2].p,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(rw-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(rh-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const aa=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,bb=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den,cc=1-aa-bb;if(aa<-.00001||bb<-.00001||cc<-.00001)continue;const qa=aa*a[2],qb=bb*b[2],qc=cc*c[2],q=qa+qb+qc,i=y*rw+x;if(q<=depth[i])continue;depth[i]=q;for(let k=0;k<3;k++)im.data[i*4+k]=(qa*vs[0].color[k]+qb*vs[1].color[k]+qc*vs[2].color[k])/q;im.data[i*4+3]=255;}
  }
  lc.putImageData(im,0,0);ctx.drawImage(layer,0,0,w,h);canvas.dataset.rendered='numerical-'+this.model.kind;canvas.dataset.shape=this.model.method;canvas.dataset.texture=String(!!this.texture);
 }
}
root.NumericalEye3D={NumericalEye,capMesh};
})(typeof window!=='undefined'?window:globalThis);
