/* Run with two local ZIP paths. Patient files are never part of this package.
 * Tests production image analysis, crop comparison and actual report pixels.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const JSZip=require('../components/extractor/vendor/jszip-3.10.1.min.js');
global.document={createElement:()=>createCanvas(1,1)};
const T=require('../components/cornea/map_texture.js'),R=require('../components/cornea/report_comparison.js');
const argv=process.argv.slice(2);
async function reports(filename){
 const z=await JSZip.loadAsync(fs.readFileSync(filename)),groups=new Map();
 for(const name of Object.keys(z.files)){const m=name.match(/^(.*?)\.PdfReport\.0000-00(06|11)\.jpe?g$/i);if(!m)continue;const group=groups.get(m[1])||{};group[m[2]==='06'?'topometric':'belin']=name;groups.set(m[1],group);}
 assert.equal(groups.size,2,'Fixture must have two eye report sets');
 const output=[];
 for(const group of groups.values()){
  const eye={};for(const kind of ['topometric','belin']){const image=await loadImage(await z.file(group[kind]).async('nodebuffer')),loaded=T.analyze(image);loaded.regions=T.describe(loaded,kind);for(const role of kind==='topometric'?['curvature_front']:['elevation_front','elevation_back','thickness']){const region=T.roleRegion(loaded.regions,role);assert(region,'Missing '+role);eye[role]={page:{kind},loaded,region};}}output.push(eye);
 }
 return output;
}
function cloneImage(candidate){const im=candidate.loaded.image,c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return {...candidate,loaded:{...candidate.loaded,image:c}};}
(async()=>{
 if(argv.length!==2)throw new Error('Usage: node tests/test_report_comparison.cjs BASELINE.zip FOLLOWUP.zip');
 const [a,b]=await Promise.all(argv.map(reports));let n=0;
 for(let e=0;e<2;e++)for(const role of ['curvature_front','elevation_front','elevation_back','thickness']){
  const d=R.create(a[e][role],b[e][role],T);assert.equal(d.mode,'visual');assert(!('delta'in d));assert(!('unit'in d));assert.equal(d.first.width,640);assert.equal(d.latest.width,640);
  const p=d.first.getContext('2d').getImageData(0,0,640,640).data,q=d.latest.getContext('2d').getImageData(0,0,640,640).data;
  let diff=0;for(let i=0;i<p.length;i+=4)if(p[i+3]&&q[i+3]&&Math.max(...[0,1,2].map(k=>Math.abs(p[i+k]-q[i+k])))>20)diff++;assert(diff>200,'The visits must apply different original pixels');
  console.log('PASS eye',e+1,role,'original textures differ; printed scales match');n++;
 }
 const first=a[0].curvature_front,last=b[0].curvature_front;
 const same=R.create(first,first,T);assert.deepEqual(same.first.toBuffer('image/png'),same.latest.toBuffer('image/png'));console.log('PASS identical report produces identical comparison textures');
 assert.throws(()=>R.create(first,b[0].thickness,T),/layout|same/);
 const shifted={...last,region:{...last.region,cx:last.region.cx+.1}};assert.throws(()=>R.create(first,shifted,T),/panel/);
 const changed=cloneImage(last),c=changed.loaded.image.getContext('2d');c.fillStyle='#00ff00';c.fillRect(365,130,25,25);assert.throws(()=>R.create(first,changed,T),/legends/);
 const resized={...last,loaded:{...last.loaded,image:{width:1000,height:1200}}};assert.throws(()=>R.sharedRegion(first,resized),/proportions|layout/);
 console.log('PASS mixed maps, shifted layouts, changed scales and page proportions rejected');
 // Reproduce the failure class: color segmentation moves/shrinks a circle,
 // although the original printed report frame is unchanged.
 for(let e=0;e<2;e++)for(const role of ['curvature_front','elevation_front','elevation_back','thickness']){
  const original=b[e][role],drift={...original,region:{...original.region,cx:original.region.cx+.025,cy:original.region.cy+.035,rx:original.region.rx*.65,ry:original.region.ry*.65},loaded:{...original.loaded,regions:original.loaded.regions.map(r=>({...r,cx:r.cx+.035,cy:r.cy+.04}))}};
  const normal=R.create(a[e][role],original,T),fixed=R.create(a[e][role],drift,T);
  assert.deepEqual(fixed.region,normal.region);assert.deepEqual(fixed.latest.toBuffer('image/png'),normal.latest.toBuffer('image/png'));
 }
 console.log('PASS all eight crops are invariant to shifted/shrunken color detections and unrelated map anchors');
 const moved=cloneImage(last),mc=moved.loaded.image.getContext('2d');mc.fillStyle='#ddd';mc.fillRect(765,125,12,255);assert.throws(()=>R.create(first,moved,T),/frame/);
 console.log('PASS damaged actual printed frame is rejected independently of color-region metadata');

 const redBox={cx:.583,cy:.294,rx:.023,ry:.03};const raw=a[0].thickness.loaded.regions.map(r=>({...r,role:null}));const d=T.describe({regions:[...raw,redBox],image:{}},'belin');assert(T.roleRegion(d,'thickness'));console.log('PASS small colored summary boxes do not take the thickness role');
 console.log(`${n}/8 real paired-map comparisons; 16/16 maps extracted; compatibility guards passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
