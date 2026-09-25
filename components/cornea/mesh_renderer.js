/* Numerical mesh renderer. Canvas 2D + orthographic projection; no GPU/CDN required.
 * All triangle vertices come from supplied x/y/z grids. A face requires all four
 * corners of its grid cell to have both geometry and the selected numerical map.
 */
(function(root){'use strict';
function buildMesh(data,layers,map){
  const points=[],faces=[];
  for(const layer of layers){
    const z=data[layer].z_mm,m=map==='thickness_um'?data.thickness_um:data[layer][map];
    if(!m)throw new Error('Numerical overlay was not supplied.');
    const indices=z.map((row,j)=>row.map((height,i)=>{
      const value=m[j][i];if(!Number.isFinite(height)||!Number.isFinite(value))return -1;
      const index=points.length;points.push({x:data.x_mm[i],y:data.y_mm[j],z:height,value,row:j,col:i,layer});return index;
    }));
    for(let j=0;j<indices.length-1;j++)for(let i=0;i<indices[j].length-1;i++){
      const a=indices[j][i],b=indices[j][i+1],c=indices[j+1][i],d=indices[j+1][i+1];
      if([a,b,c,d].some(n=>n<0))continue;
      for(const vertices of [[a,b,d],[a,d,c]])faces.push({vertices,value:vertices.reduce((s,n)=>s+points[n].value,0)/3,layer});
    }
  }
  if(!faces.length)throw new Error('No complete supported grid cells exist for this overlay.');
  const extent=key=>{let lo=Infinity,hi=-Infinity;for(const p of points){lo=Math.min(lo,p[key]);hi=Math.max(hi,p[key]);}return [lo,hi];};
  const bounds={x:extent('x'),y:extent('y'),z:extent('z')};
  let low=Infinity,high=-Infinity;for(const p of points){low=Math.min(low,p.value);high=Math.max(high,p.value);}
  if(map==='elevation_um'){high=Math.max(Math.abs(low),Math.abs(high));low=-high;}
  if(low===high){low-=.001;high+=.001;}
  return {points,faces,bounds,low,high};
}
function rotate(x,y,z,yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);const u=cy*x+sy*z,w=-sy*x+cy*z;return {x:u,y:cp*y-sp*w,z:sp*y+cp*w};}
const sequential=[[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
const diverging=[[45,79,163],[159,193,228],[248,247,244],[226,153,122],[166,31,44]];
function color(value,low,high,diverge=false){const stops=diverge?diverging:sequential,t=Math.max(0,Math.min(1,(value-low)/(high-low)))*(stops.length-1),i=Math.min(stops.length-2,Math.floor(t)),fraction=t-i;return 'rgb('+stops[i].map((v,k)=>Math.round(v+(stops[i+1][k]-v)*fraction)).join(',')+')';}
class SurfaceCanvas {
  constructor(canvas,onSelect){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw new Error('Canvas is unavailable.');
    this.onSelect=onSelect;this.mesh=null;this.data=null;this.points=[];this.zoom=1;this.yaw=-.35;this.pitch=-.75;this.pending=false;this.selection=null;this.drag=null;
    this.resizeObserver=new ResizeObserver(()=>this.request());this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!this.drag||!this.mesh)return;const d=this.drag,dx=e.clientX-d.x,dy=e.clientY-d.y;d.moved ||= Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>4;if(d.moved){this.yaw+=dx*.009;this.pitch+=dy*.009;this.request();}d.x=e.clientX;d.y=e.clientY;});
    canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved)this.pick(e);this.drag=null;});
    canvas.addEventListener('pointercancel',()=>{this.drag=null;});
    canvas.addEventListener('wheel',e=>{if(!this.mesh)return;e.preventDefault();this.zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});
  }
  clear(){this.mesh=null;this.data=null;this.points=[];this.selection=null;this.canvas.dataset.rendered='false';this.request();}
  set(data,layers,map,options={}){this.data=data;this.layers=layers;this.map=map;this.options=options;this.mesh=buildMesh(data,layers,map);this.request();return this.mesh;}
  select(point){this.selection=point;this.request();}
  resetView(){this.zoom=1;this.view('oblique');}
  view(name){const views={front:[0,0],back:[Math.PI,0],oblique:[-.35,-.75],profile:[Math.PI/2,0]};if(views[name])[this.yaw,this.pitch]=views[name];this.request();}
  zoomBy(factor){this.zoom=Math.max(.35,Math.min(4,this.zoom*factor));this.request();}
  request(){if(this.pending)return;this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.draw();});}
  pick(event){if(!this.mesh)return;const rect=this.canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;let best=null;for(const p of this.points){const d=(p.sx-x)**2+(p.sy-y)**2;if(d>196)continue;if(!best||d<best.distance-1||(Math.abs(d-best.distance)<1&&p.depth>best.point.depth))best={distance:d,point:p};}if(best)this.onSelect?.({layer:best.point.layer,row:best.point.row,col:best.point.col});}
  draw(){
    const rect=this.canvas.getBoundingClientRect(),w=Math.max(240,rect.width),h=Math.max(240,rect.height),dpr=Math.min(2,window.devicePixelRatio||1);
    if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
    const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#FBFAFD';ctx.fillRect(0,0,w,h);
    if(!this.mesh)return;
    const m=this.mesh,b=m.bounds,center={x:(b.x[0]+b.x[1])/2,y:(b.y[0]+b.y[1])/2,z:(b.z[0]+b.z[1])/2};
    const span=Math.max(b.x[1]-b.x[0],b.y[1]-b.y[0],b.z[1]-b.z[0],.001),scale=Math.min(w-130,h-60)/span/1.12*this.zoom;
    const ySign=this.data.coordinate_system.y_positive==='superior'?1:-1,zSign=this.data.coordinate_system.z_positive==='anterior'?1:-1;
    const project=p=>{const r=rotate(p.x-center.x,ySign*(p.y-center.y),zSign*(p.z-center.z),this.yaw,this.pitch);return {...p,sx:(w-58)/2+r.x*scale,sy:h/2-r.y*scale,depth:r.z};};
    this.points=m.points.map(project);
    const faces=m.faces.map(f=>({...f,depth:f.vertices.reduce((s,i)=>s+this.points[i].depth,0)/3})).sort((a,b)=>a.depth-b.depth);
    ctx.lineWidth=.25;ctx.globalAlpha=this.layers.length>1?.74:1;
    for(const f of faces){const a=this.points[f.vertices[0]],b=this.points[f.vertices[1]],c=this.points[f.vertices[2]];ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.lineTo(c.sx,c.sy);ctx.closePath();ctx.fillStyle=color(f.value,m.low,m.high,this.map==='elevation_um');ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.stroke();}
    ctx.globalAlpha=1;
    // Markers refer to supplied numerical samples only, never inferred locations.
    for(const marker of this.options.markers||[]){const p=project(marker);this.marker(p,marker.label,marker.symbol);}
    if(this.selection){const p=this.points.find(p=>p.layer===this.selection.layer&&p.row===this.selection.row&&p.col===this.selection.col);if(p)this.marker(p,'Selected sample','circle');}
    const barX=w-59,barY=Math.max(68,(h-240)/2),barH=Math.min(240,h-130),barW=13;
    for(let k=0;k<barH;k++){ctx.fillStyle=color(m.high-(m.high-m.low)*k/barH,m.low,m.high,this.map==='elevation_um');ctx.fillRect(barX,barY+k,barW,1.5);}
    ctx.font='10px Arial';ctx.fillStyle='#51435D';ctx.textAlign='left';
    for(let k=0;k<=4;k++){const value=m.high-(m.high-m.low)*k/4;ctx.fillText(value.toFixed(this.map==='z_mm'?2:1),barX+18,barY+barH*k/4+3);}
    ctx.save();ctx.translate(barX-7,barY+barH/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(this.options.mapLabel||this.map,0,0);ctx.restore();
    // A millimetre scale bar shares exactly the geometry's pixel/mm scale.
    const lengthMM=this.zoom>2?.5:1,px=scale*lengthMM;ctx.strokeStyle='#4E2A84';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,h-25);ctx.lineTo(24+px,h-25);ctx.stroke();ctx.fillStyle='#4E2A84';ctx.textAlign='left';ctx.fillText(lengthMM+' mm · projection scale',24,h-34);
    const glyph={x:45,y:48};for(const [name,v,tint]of [['x',[1,0,0],'#4E2A84'],['y',[0,ySign,0],'#2D6C62'],['z',[0,0,zSign],'#9A5D27']]){const r=rotate(...v,this.yaw,this.pitch);ctx.strokeStyle=tint;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(glyph.x,glyph.y);ctx.lineTo(glyph.x+27*r.x,glyph.y-27*r.y);ctx.stroke();ctx.fillStyle=tint;ctx.fillText('+'+name,glyph.x+33*r.x,glyph.y-33*r.y);}
    ctx.fillStyle='#6D6474';ctx.font='10px Arial';ctx.textAlign='right';ctx.fillText(m.faces.length.toLocaleString()+' supported triangles',w-18,h-15);
    this.canvas.dataset.rendered='true';
  }
  marker(p,label,symbol){const ctx=this.ctx;ctx.save();ctx.fillStyle='#FFFFFF';ctx.strokeStyle='#251637';ctx.lineWidth=2;ctx.beginPath();if(symbol==='diamond'){ctx.moveTo(p.sx,p.sy-6);ctx.lineTo(p.sx+6,p.sy);ctx.lineTo(p.sx,p.sy+6);ctx.lineTo(p.sx-6,p.sy);ctx.closePath();}else ctx.arc(p.sx,p.sy,5,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.font='10px Arial';ctx.textAlign='left';const tx=p.sx+10,ty=p.sy+(label.startsWith('Thinnest')?18:-8),tw=ctx.measureText(label).width;ctx.fillStyle='rgba(255,255,255,.94)';ctx.fillRect(tx-3,ty-10,tw+6,14);ctx.fillStyle='#251637';ctx.fillText(label,tx,ty);ctx.restore();}
}
const api={buildMesh,rotate,color,SurfaceCanvas};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NumericalMesh=api;
})(typeof window!=='undefined'?window:globalThis);
