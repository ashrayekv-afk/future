/* Calibrated, IMAGE-ESTIMATED maps. No OCR guesses, simulated patient values,
 * cross-eye matching, or silently inferred measurement registration.
 * Native numerical grids use the separate validated export contract.
 */
(function(root){'use strict';
const node=typeof module!=='undefined'&&module.exports;
const profiles=node?require('./calibration_profiles.js'):root.MapCalibrationProfiles;
const R=node?require('./report_comparison.js'):root.ReportComparison;
const finite=v=>typeof v==='number'&&Number.isFinite(v),fail=s=>{throw new Error(s);};
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
const axes=Array.from({length:81},(_,i)=>Math.round((-4+i*.1)*100)/100);
const profileJobs=new Map();
async function profileImage(uri){if(!profileJobs.has(uri))profileJobs.set(uri,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Map calibration could not be loaded.'));im.src=uri;}));return profileJobs.get(uri);}
async function verifyCalibration(candidate){const role=candidate.region.role,p=profiles[role];if(!p||candidate.page.kind!==p.kind)fail('Numerical reconstruction currently supports the calibrated Topometric curvature and Belin thickness layouts.');const n=R.normalized(candidate);R.verifyFrame(candidate,n);
 for(const patch of p.patches){const [x,y,w,h]=patch.box,expected=await profileImage(patch.image),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(expected,0,0,w,h);const a=c.getContext('2d').getImageData(0,0,w,h).data,b=n.canvas.getContext('2d').getImageData(x,y,w,h).data;let sum=0,changed=0;for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));sum+=d;if(d>10)changed++;}
 // Deliberately strict: an unrecognized/recompressed legend needs a new profile,
 // rather than assuming that its colors retain the same clinical values.
 if(sum/(w*h)>.35||changed/(w*h)>.001)fail('This printed scale or zoom does not match a verified calibration. The original map remains available; numerical change is withheld.');}
 return {normalized:n,profile:p};
}
function decodePixel(rgb,palette){if(Math.max(...rgb)<100||Math.max(...rgb)-Math.min(...rgb)<45)return null;let best=-1,error=Infinity;for(let i=0;i<palette.length;i++){const c=palette[i].rgb,d=(rgb[0]-c[0])**2+(rgb[1]-c[1])**2+(rgb[2]-c[2])**2;if(d<error){error=d;best=i;}}return error<=45*45?{index:best,value:palette[best].value,error:Math.sqrt(error)}:null;}
async function extract(candidate){const {normalized:n,profile:p}=await verifyCalibration(candidate),role=candidate.region.role,px=n.canvas.getContext('2d').getImageData(0,0,1200,838).data;
 const values=axes.map(()=>axes.map(()=>null)),native=axes.map(()=>axes.map(()=>null)),uncertainty=axes.map(()=>axes.map(()=>null));let count=0,possible=0;
 for(let j=0;j<axes.length;j++)for(let i=0;i<axes.length;i++){const x=axes[i],y=axes[j];if(x*x+y*y>16.0001)continue;possible++;const xx=Math.round(p.center[0]+x*p.pixelRadius/4.5),yy=Math.round(p.center[1]-y*p.pixelRadius/4.5),at=(yy*1200+xx)*4,center=decodePixel([px[at],px[at+1],px[at+2]],p.palette);if(!center)continue;
  const patch=[];for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const k=((yy+dy)*1200+xx+dx)*4,d=decodePixel([px[k],px[k+1],px[k+2]],p.palette);if(d)patch.push(d.value);}
  if(patch.length<30)continue;patch.sort((a,b)=>a-b);const lo=patch[Math.floor(patch.length*.2)],hi=patch[Math.floor(patch.length*.8)],v=median(patch),tolerance=role==='thickness'?40:.45;
  if(hi-lo>tolerance||Math.abs(center.value-v)>tolerance)continue;
  const u=role==='thickness'?20:Math.max(.15,(hi-lo)/2);native[j][i]=v;
  values[j][i]=role==='thickness'?v:337.5/v;
  uncertainty[j][i]=role==='thickness'?u:Math.max(337.5/Math.max(.1,v-u)-337.5/v,337.5/v-337.5/(v+u));count++;
 }
 if(count/possible<.45)fail('Too little unobscured map area could be decoded reliably. Original report view is retained.');
 return {role,kind:'estimated',source:'calibrated_report_image',profile:p.id,x:[...axes],y:[...axes],values,native,uncertainty,count,coverage:count/possible,unit:role==='thickness'?'µm':'D',dp:role==='thickness'?0:1,definition:role==='thickness'?'report_pachymetry':'axial_keratometric_1.3375',alignment:'printed-vertex-and-9mm-display',coordinates:{x_positive:'report-right',y_positive:'superior'},candidate};
}
function nativeMap(surface,role){const thickness=role==='thickness',grid=thickness?surface.thickness_um:surface.anterior?.curvature_D;if(!grid)fail('The selected numerical map is absent from this export.');let count=0;for(const row of grid)for(const v of row)if(finite(v))count++;
 return {role,kind:surface.kind,source:surface.source,x:surface.x_mm,y:surface.y_mm,values:grid,native:thickness?grid:grid.map(r=>r.map(v=>finite(v)&&v>0?337.5/v:null)),count,coverage:count/(grid.length*grid[0].length),unit:thickness?'µm':'D',dp:thickness?0:1,definition:thickness?surface.thickness_definition:surface.anterior.curvature_type,coordinates:surface.coordinate_system,surface};}
function compare(a,b){if(!a||!b||a.role!==b.role||a.definition!==b.definition||a.kind!==b.kind||a.source!==b.source)fail('Both visits need the same map type, definition and data source.');if(JSON.stringify(a.x)!==JSON.stringify(b.x)||JSON.stringify(a.y)!==JSON.stringify(b.y)||JSON.stringify(a.coordinates)!==JSON.stringify(b.coordinates))fail('Map coordinates differ between visits.');if(a.kind==='estimated'&&(a.profile!==b.profile||a.alignment!==b.alignment))fail('Image calibration or printed coordinates differ between visits.');
 const delta=a.values.map((row,j)=>row.map((v,i)=>finite(v)&&finite(b.values[j][i])?b.values[j][i]-v:null));let bound=0,count=0;delta.forEach(row=>row.forEach(v=>{if(finite(v)){bound=Math.max(bound,Math.abs(v));count++;}}));if(count<9)fail('Too few matching numerical samples are available.');const step=a.unit==='D'?.5:10,limit=Math.max(step,Math.ceil((bound-1e-10)/step)*step);
 const u=a.kind==='estimated'?delta.map((row,j)=>row.map((v,i)=>finite(v)?a.uncertainty[j][i]+b.uncertainty[j][i]:null)):null;
 return {...a,values:delta,baseline:a.values,latest:b.values,uncertainty:u,limit,count,isChange:true,coverage:count/Math.max(a.count,b.count)};
}
const DELTA=[[35,102,213],[123,181,242],[243,244,247],[247,174,96],[190,45,54]];
function deltaColor(value,limit){const t=Math.max(0,Math.min(4,2+2*value/limit)),i=Math.min(3,Math.floor(t)),f=t-i;return DELTA[i].map((v,k)=>Math.round(v+(DELTA[i+1][k]-v)*f));}
function sourceColor(map,v){const p=profiles[map.role],native=map.role==='thickness'?v:337.5/v;let best=0,d=Infinity;for(let i=0;i<p.palette.length;i++){const error=Math.abs(p.palette[i].value-native);if(error<d){d=error;best=i;}}return p.palette[best].rgb;}
function format(v,dp=0,signed=false){if(!finite(v))return '—';if(Math.abs(v)<.5*10**-dp)v=0;return (signed&&v>0?'+':'')+v.toFixed(dp).replace('-','−');}
function texture(map,{labels=true,size=480}={}){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),im=ctx.createImageData(size,size),radius=Math.max(...map.x.map(Math.abs),...map.y.map(Math.abs));
 const ySign=map.coordinates?.y_positive==='inferior'?-1:1;const nx=map.x.length,ny=map.y.length,xlo=map.x[0],xhi=map.x[nx-1],ylo=map.y[0],yhi=map.y[ny-1];
 // A rectilinear grid need not be uniformly sampled (native exports).
 const locate=(axis,v)=>{let i=0;while(i<axis.length-2&&axis[i+1]<v)i++;return i;};
 const xnodes=Array.from({length:size},(_,k)=>{const x=(k/(size-1)*2-1)*radius;return {x,i:locate(map.x,x)};}),ynodes=Array.from({length:size},(_,k)=>{const y=(1-k/(size-1)*2)*radius*ySign;return {y,j:locate(map.y,y)};});
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){const {x,i}=xnodes[px],{y,j}=ynodes[py];if(x*x+y*y>radius*radius||x<xlo||x>xhi||y<ylo||y>yhi)continue;const v=[map.values[j][i],map.values[j][i+1],map.values[j+1][i],map.values[j+1][i+1]],u=(x-map.x[i])/(map.x[i+1]-map.x[i]),w=(y-map.y[j])/(map.y[j+1]-map.y[j]);let n;if(v.every(finite))n=(v[0]*(1-u)+v[1]*u)*(1-w)+(v[2]*(1-u)+v[3]*u)*w;else{n=v[(w>=.5?2:0)+(u>=.5?1:0)];if(!finite(n))continue;}const k=(py*size+px)*4;im.data.set([...(map.isChange?deltaColor(n,map.limit):sourceColor(map,n)),255],k);}
 ctx.putImageData(im,0,0);ctx.strokeStyle='rgba(30,33,48,.38)';ctx.lineWidth=1.2;ctx.setLineDash([4,5]);for(const r of [1.5,2.5,3.5])if(r<radius){ctx.beginPath();ctx.arc(size/2,size/2,r/radius*(size-1)/2,0,Math.PI*2);ctx.stroke();}ctx.setLineDash([]);
 if(labels){ctx.font='500 '+Math.round(size/25)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';for(const [qx,qy]of [[-.5,0],[0,0],[.5,0],[0,.5],[0,-.5],[-.35,-.55],[.35,.55]]){const i=Math.round((qx+1)/2*(nx-1)),j=Math.round((qy+1)/2*(ny-1)),v=map.values[j][i];if(!finite(v))continue;const x=(map.x[i]/radius+1)*(size-1)/2,y=(1-map.y[j]*ySign/radius)*(size-1)/2,s=format(v,map.dp,map.isChange),w=ctx.measureText(s).width;ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(x-w/2-3,y-size/45,w+6,size/22);ctx.fillStyle='#242336';ctx.fillText(s,x,y);}}
 return canvas;
}
function pick(map,u,v){if(u<0||u>1||v<0||v>1)return null;const radius=Math.max(...map.x.map(Math.abs),...map.y.map(Math.abs)),x=(2*u-1)*radius,y=(1-2*v)*radius*(map.coordinates?.y_positive==='inferior'?-1:1);if(x*x+y*y>radius*radius)return null;const nearest=(a,n)=>a.reduce((best,q,i)=>Math.abs(q-n)<Math.abs(a[best]-n)?i:best,0),i=nearest(map.x,x),j=nearest(map.y,y);return {x:map.x[i],y:map.y[j],value:map.values[j][i],baseline:map.baseline?.[j][i],latest:map.latest?.[j][i],uncertainty:map.uncertainty?.[j][i]};}
// Smoothing/interpolation below is ONLY for the illustrative geometry, never
// written back into a numerical heatmap or a longitudinal difference grid.
function modelField(map){return map.values.map((row,j)=>row.map((_,i)=>{if(map.x[i]**2+map.y[j]**2>16.001)return null;const values=[];for(let dj=-5;dj<=5;dj++)for(let di=-5;di<=5;di++){if(di*di+dj*dj>25)continue;const v=map.values[j+dj]?.[i+di];if(finite(v))values.push(v);}return values.length>=8?median(values):null;}));}
function sampleGrid(x,y,xs,ys,grid){let i=0,j=0;if(x<xs[0]||x>xs.at(-1)||y<ys[0]||y>ys.at(-1))return null;while(i<xs.length-2&&xs[i+1]<x)i++;while(j<ys.length-2&&ys[j+1]<y)j++;const v=[grid[j][i],grid[j][i+1],grid[j+1][i],grid[j+1][i+1]];if(!v.every(finite))return null;const u=(x-xs[i])/(xs[i+1]-xs[i]),w=(y-ys[j])/(ys[j+1]-ys[j]);return (v[0]*(1-u)+v[1]*u)*(1-w)+(v[2]*(1-u)+v[3]*u)*w;}
function reconstruct(curvature,thick){if(!curvature||!thick||curvature.role!=='curvature_front'||thick.role!=='thickness')return null;if(JSON.stringify(curvature.x)!==JSON.stringify(thick.x)||JSON.stringify(curvature.y)!==JSON.stringify(thick.y)||JSON.stringify(curvature.coordinates)!==JSON.stringify(thick.coordinates))return null;if(!['axial','axial_keratometric_1.3375'].includes(curvature.definition))return null;
 const cf=modelField(curvature),tf=modelField(thick),x=curvature.x,y=curvature.y,z=x.length?y.map(()=>x.map(()=>null)):[];let count=0;
 for(let j=0;j<y.length;j++)for(let i=0;i<x.length;i++){const r=Math.hypot(x[i],y[j]);if(r>3.8||!finite(cf[j][i])||!finite(tf[j][i]))continue;const steps=Math.max(1,Math.ceil(r/.06)),dr=r/steps;let sag=0,ok=true;for(let k=0;k<steps;k++){const s=(k+.5)*dr,u=r?s/r:0,power=sampleGrid(x[i]*u,y[j]*u,x,y,cf);if(!finite(power)||power<=0){ok=false;break;}const radius=337.5/power;if(radius<=s+.1){ok=false;break;}sag+=s/Math.sqrt(radius*radius-s*s)*dr;}if(ok){z[j][i]=-sag;count++;}}
 if(count<150)return null;
 return {kind:'estimated',method:'smoothed-meridional-integration',x,y,z,thickness:tf,radius:3.8,count,coordinates:curvature.coordinates,notice:'Approximate shape from smoothed axial curvature. Back surface uses thickness as a model depth offset; neither is a measured surface.'};
}
function measuredModel(surface){if(!surface?.anterior?.z_mm)return null;const sign=surface.coordinate_system.z_positive==='anterior'?1:-1,z=surface.anterior.z_mm.map(row=>row.map(v=>finite(v)?v*sign:null)),zs=z.flat().filter(finite);if(!zs.length)return null;const center=sampleGrid(0,0,surface.x_mm,surface.y_mm,z);if(!finite(center))return null;return {kind:surface.kind,method:'supplied-surface-coordinates',x:surface.x_mm,y:surface.y_mm,z:z.map(row=>row.map(v=>finite(v)?v-center:null)),posterior:surface.posterior?.z_mm?.map(row=>row.map(v=>finite(v)?v*sign-center:null)),thickness:surface.thickness_um||null,radius:Math.min(4,Math.max(...surface.x_mm.map(Math.abs))),coordinates:surface.coordinate_system,count:zs.length,notice:'Surface coordinates from the supplied numerical export. The surrounding eye remains illustrative.'};}
function originalTexture(map){if(!map.candidate||map.isChange)return null;const p=profiles[map.role],n=R.normalized(map.candidate),r=p.pixelRadius*4/4.5,c=document.createElement('canvas');c.width=c.height=480;const ctx=c.getContext('2d');ctx.save();ctx.beginPath();ctx.arc(240,240,239,0,Math.PI*2);ctx.clip();ctx.drawImage(n.canvas,p.center[0]-r,p.center[1]-r,r*2,r*2,0,0,480,480);ctx.restore();return c;}
const api={extract,verifyCalibration,decodePixel,nativeMap,compare,texture,originalTexture,pick,format,deltaColor,sourceColor,reconstruct,measuredModel,sampleGrid,modelField,profiles};if(node)module.exports=api;else root.NumericalMaps=api;
})(typeof window!=='undefined'?window:globalThis);
