/* Visual comparison of original report pixels. No measurements are decoded.
 * Both visits use one identical report-coordinate crop, so changing color
 * coverage cannot independently recenter or rescale the two images.
 * This aligns the printed layout only, not the measured corneal surfaces.
 */
(function(root){'use strict';
const fail=s=>{throw new Error(s);};
const WINDOWS={curvature_front:[607,228,138],elevation_front:[212,204,96],elevation_back:[489,204,96],thickness:[1013,204,106]};
function normalized(candidate){
 const im=candidate.loaded.image,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,s=w/1200,body=h/s-838;
 if(Math.min(Math.abs(body),Math.abs(body-64))>1)fail('This report layout needs a separate color-scale check before visual comparison.');
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=838;
 canvas.getContext('2d').drawImage(im,0,body*s,w,838*s,0,0,1200,838);
 return {canvas,w,h,s,body};
}
function verifyFrame(candidate,n){
 const top=candidate.page.kind==='topometric',ctx=n.canvas.getContext('2d'),d=ctx.getImageData(0,0,1200,838).data;
 const gray=(x,y)=>{const i=(y*1200+x)*4;return [Math.max(d[i],d[i+1],d[i+2]),Math.min(d[i],d[i+1],d[i+2])];};
 // These are printed panel rules, independent of the shape/color coverage.
 for(const x of top?[347,770,1191]:[61,338,614,863]){
  let best=0;for(let dx=-1;dx<=1;dx++){let count=0;for(let y=65;y<320;y++){const [hi,lo]=gray(x+dx,y);if(hi<115&&hi-lo<30)count++;}best=Math.max(best,count/255);}
  if(best<.75)fail('The printed report frame could not be verified. Use the fixed Baseline and Latest views.');
 }
 const x0=top?420:70,x1=top?740:330;let border=0,white=0;
 for(let x=x0;x<x1;x++){let [hi,lo]=gray(x,41);if(lo>95&&hi<175&&hi-lo<20)border++;[hi,lo]=gray(x,46);if(lo>210)white++;}
 if(border/(x1-x0)<.9||white/(x1-x0)<.9)fail('The report header/frame position differs from the supported layout.');
 const w=WINDOWS[candidate.region.role];
 if(!w||Math.abs(candidate.region.cx*n.w/n.s-w[0])>70||Math.abs(candidate.region.cy*n.h/n.s-n.body-w[1])>70)fail('The identified map is outside its verified report panel.');
}
function sharedRegion(a,b){
 if(!a||!b||a.page.kind!==b.page.kind||!['topometric','belin'].includes(a.page.kind))fail('Visual comparison needs matching Topometric or Belin report layouts.');
 if(!a.region||!b.region||a.region.role!==b.region.role)fail('Both visits need the same automatically identified map.');
 if(!(a.page.kind==='topometric'?['curvature_front']:['elevation_front','elevation_back','thickness']).includes(a.region.role))fail('The requested map does not belong to this report layout.');
 const an=normalized(a),bn=normalized(b);
 if(Math.abs(an.w/an.h-bn.w/bn.h)>.002)fail('The report page proportions differ. A shared map window cannot be established.');
 verifyFrame(a,an);verifyFrame(b,bn);
 const [x,y,r]=WINDOWS[a.region.role];
 return {cx:x/1200,cy:(y+an.body)/(838+an.body),rx:r/1200,ry:r/(838+an.body),role:a.region.role,identity:'verified-report-frame'};
}
function legend(candidate){
 const n=normalized(candidate),role=candidate.region.role,top=candidate.page.kind==='topometric';
 const box=top?[358,45,57,361]:role==='thickness'?[1139,45,59,310]:[1,45,60,785];
 const c=document.createElement('canvas');c.width=box[2];c.height=box[3];
 c.getContext('2d').drawImage(n.canvas,box[0],box[1],box[2],box[3],0,0,c.width,c.height);
 return c;
}
function matchingLegends(a,b){
 const ac=legend(a),bc=legend(b),ap=ac.getContext('2d').getImageData(0,0,ac.width,ac.height).data,bp=bc.getContext('2d').getImageData(0,0,bc.width,bc.height).data;
 if(ap.length!==bp.length)fail('The printed color scales differ.');
 let sum=0,changed=0,colored=0;for(let i=0;i<ap.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(ap[i+k]-bp[i+k]));sum+=d;if(d>10)changed++;if(Math.max(ap[i],ap[i+1],ap[i+2])-Math.min(ap[i],ap[i+1],ap[i+2])>50)colored++;}
 const n=ap.length/4;
 if(colored/n<.25||sum/n>.25||changed/n>.0005)fail('The printed legends do not match closely enough. Compare the fixed Baseline and Latest views with their source scales.');
 return true;
}
function create(a,b,texture){const region=sharedRegion(a,b);matchingLegends(a,b);return {region,first:texture.crop(a.loaded.image,region),latest:texture.crop(b.loaded.image,region),mode:'visual',alignment:'verified-printed-frame-only'};}
const api={sharedRegion,legend,matchingLegends,create,normalized,verifyFrame};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReportComparison=api;
})(typeof window!=='undefined'?window:globalThis);
