/* Numerical longitudinal maps on the existing fixed reference eye.
 * Never subtracts image colors, summary extrema or independent fitted references.
 */
(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./surface_schema.js'):root.CornealData;
const METRICS=Object.freeze({
 curvature_front:{label:'Anterior curvature',unit:'D',layer:'anterior',map:'curvature_D',dp:1},
 elevation_front:{label:'Anterior elevation',unit:'µm',layer:'anterior',map:'elevation_um',dp:0},
 elevation_back:{label:'Posterior elevation',unit:'µm',layer:'posterior',map:'elevation_um',dp:0},
 thickness:{label:'Thickness / pachymetry',unit:'µm',map:'thickness_um',dp:0}
});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=s=>{throw new Error(s);};
function compare(first,latest,role){
 const m=METRICS[role];if(!m)fail('Select curvature, elevation or thickness for the Change map.');
 if(!first||!latest)fail('Change needs numerical maps from both visits. Report images alone cannot supply point-by-point differences.');
 const a=C.validate(first),b=C.validate(latest);
 if(a.eye!==b.eye||a.visit!=='first'||b.visit!=='latest')fail('Change requires baseline and latest maps for the same eye, in that order.');
 if(a.kind!==b.kind||a.source!==b.source)fail('Patient and synthetic maps cannot be compared.');
 if(!same(a.coordinate_system,b.coordinate_system)||!same(a.x_mm,b.x_mm)||!same(a.y_mm,b.y_mm))fail('The visits must use identical registered coordinates and axis conventions. No alignment or resampling is guessed.');
 if(!a.comparison||!b.comparison||!same(a.comparison,b.comparison))fail('The numerical exports need matching verified registration and map-definition keys. Matching grid sizes alone is not enough.');
 if(m.map==='elevation_um'){
  const x=a[m.layer]?.elevation_reference,y=b[m.layer]?.elevation_reference;
  if(!x?.reference_id||!y?.reference_id||!same(x,y))fail('Elevation Change needs the same fixed reference surface for both visits. Separate best-fit references cannot be subtracted here.');
 }
 if(m.map==='curvature_D'&&a[m.layer]?.curvature_type!==b[m.layer]?.curvature_type)fail('Curvature definitions differ between visits.');
 if(m.map==='thickness_um'&&a.thickness_definition!==b.thickness_definition)fail('Thickness definitions differ between visits.');
 const ag=m.map==='thickness_um'?a.thickness_um:a[m.layer]?.[m.map],bg=m.map==='thickness_um'?b.thickness_um:b[m.layer]?.[m.map];
 if(!ag||!bg)fail(m.label+' was not supplied numerically for both visits.');
 // The numerical map is independent of z shape; only overlap of supplied map
 // values is used. Invalid/missing map samples remain holes.
 const delta=ag.map((row,j)=>row.map((v,i)=>C.finite(v)&&C.finite(bg[j][i])?bg[j][i]-v:null));
 if(!C.hasCell(delta))fail('No complete overlapping 2 × 2 map cell is available.');
 let bound=0,count=0;delta.forEach(row=>row.forEach(v=>{if(C.finite(v)){bound=Math.max(bound,Math.abs(v));count++;}}));
 const step=m.unit==='D'?.1:1,limit=Math.max(step,Math.ceil((bound-1e-10)/step)*step);
 return {metric:m,role,eye:a.eye,kind:a.kind,x:a.x_mm,y:a.y_mm,coordinates:a.coordinate_system,baseline:ag,latest:bg,delta,limit,count};
}
function format(v,dp=0){if(!C.finite(v))return '—';const n=Math.abs(v)<.5*10**(-dp)?0:v;return (n>0?'+':'')+n.toFixed(dp);}
const STOPS=[[27,49,160],[0,161,242],[42,193,83],[255,221,44],[220,36,46]];
function color(v,limit){const t=Math.max(0,Math.min(4,2+2*v/limit)),i=Math.min(3,Math.floor(t)),f=t-i;return STOPS[i].map((n,k)=>Math.round(n+(STOPS[i+1][k]-n)*f));}
function texture(data){
 const size=640,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d'),im=ctx.createImageData(size,size),radius=Math.max(...data.x.map(Math.abs),...data.y.map(Math.abs));
 const ix=v=>Math.round((.5+v/(2*radius))*(size-1)),iy=v=>Math.round((.5-v/(2*radius))*(size-1));
 for(let j=0;j<data.y.length-1;j++)for(let i=0;i<data.x.length-1;i++){
  const a=data.delta[j][i],b=data.delta[j][i+1],c=data.delta[j+1][i],d=data.delta[j+1][i+1];
  if(![a,b,c,d].every(C.finite))continue;
  const x0=ix(data.x[i]),x1=ix(data.x[i+1]),y0=iy(data.y[j+1]),y1=iy(data.y[j]);
  for(let y=Math.max(0,y0);y<=Math.min(size-1,y1);y++)for(let x=Math.max(0,x0);x<=Math.min(size-1,x1);x++){
   if(Math.hypot(x-319.5,y-319.5)>318)continue;
   const u=(x-x0)/Math.max(1,x1-x0),v=(y-y0)/Math.max(1,y1-y0),value=(c*(1-u)+d*u)*(1-v)+(a*(1-u)+b*u)*v,k=(y*size+x)*4;
   im.data.set([...color(value,data.limit),255],k);
  }
 }
 ctx.putImageData(im,0,0);
 ctx.strokeStyle='rgba(25,36,55,.45)';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();ctx.arc(320,320,230,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 32px Arial';ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.fillStyle='#20263b';
 // Labels are actual grid samples, not interpolated values or global extrema.
 const rows=Math.max(1,Math.ceil(data.y.length/5)),cols=Math.max(1,Math.ceil(data.x.length/5));
 for(let j=0;j<data.y.length;j+=rows)for(let i=0;i<data.x.length;i+=cols){const x=ix(data.x[i]),y=iy(data.y[j]),v=data.delta[j][i];
  if(!C.finite(v)||Math.hypot(x-320,y-320)>270||!im.data[(Math.max(0,Math.min(639,y))*size+Math.max(0,Math.min(639,x)))*4+3])continue;
  const label=format(v,data.metric.dp);ctx.strokeText(label,x,y);ctx.fillText(label,x,y);
 }
 return canvas;
}
function sample(data,row,col){if(!Number.isInteger(row)||!Number.isInteger(col)||row<0||col<0||row>=data.y.length||col>=data.x.length)return null;return {x:data.x[col],y:data.y[row],baseline:data.baseline[row][col],latest:data.latest[row][col],change:data.delta[row][col]};}
const api={METRICS,compare,texture,color,format,sample};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VisitComparison=api;
})(typeof window!=='undefined'?window:globalThis);
