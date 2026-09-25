'use strict';
const assert=require('assert');const T=require('../components/cornea/map_texture.js'),R=require('../components/cornea/reference_eye.js');let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
function image(w,h,shapes){const px=new Uint8ClampedArray(w*h*4).fill(255);for(const shape of shapes)for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(shape.kind==='disk'?(x-shape.x)**2+(y-shape.y)**2<shape.r**2:x>=shape.x&&x<shape.x+shape.w&&y>=shape.y&&y<shape.y+shape.h){const i=(y*w+x)*4;px[i]=20;px[i+1]=180;px[i+2]=100;}}return px;}
test('Two independent circular map regions are located in source pixel space',()=>{const a=T.detect(image(420,300,[{kind:'disk',x:110,y:140,r:68},{kind:'disk',x:310,y:140,r:68}]),420,300);assert.equal(a.length,2);assert(Math.abs(a[0].cx-110/420)<.02);assert(Math.abs(a[1].cy-140/300)<.02);});
test('A thin colored legend is not proposed as a corneal disk',()=>{assert.equal(T.detect(image(420,300,[{kind:'rect',x:210,y:70,w:13,h:180}]),420,300).length,0);});
test('No color image produces no invented crop',()=>assert.equal(T.detect(image(420,300,[]),420,300).length,0));
test('Manual circle must remain within the actual report',()=>assert.throws(()=>T.manualRegion(.05,.05,.25,1.3)));
test('Manual circle preserves image aspect ratio',()=>{const r=T.manualRegion(.5,.5,.12,1.5);assert.equal(r.ry,.18);assert.equal(r.method,'operator-selected');});
test('Reference geometry is immutable and has no patient input parameters',()=>{assert(Object.isFrozen(R.GEOMETRY));assert.equal(R.GEOMETRY.globeRadius,1);assert(!('Kmax' in R.GEOMETRY));assert(!('age' in R.GEOMETRY));});
test('Reference rotation preserves Euclidean geometry',()=>{const v=R.rotate(.2,.3,.8,.7,-.4);assert(Math.abs(v.x*v.x+v.y*v.y+v.z*v.z-.77)<1e-12);});
test('Supported Topometric positions receive separate front/back identities',()=>{const d={image:{naturalWidth:1200,naturalHeight:838},regions:[{cx:.505,cy:.271},{cx:.808,cy:.271}]};const r=T.describe(d,'topometric');assert.equal(r[0].role,'curvature_front');assert.equal(r[1].role,'curvature_back');});
test('Unknown report layouts keep generic labels',()=>{const d={image:{naturalWidth:1200,naturalHeight:838},regions:[{cx:.3,cy:.5},{cx:.7,cy:.5}]};assert(T.describe(d,'report').every(r=>r.role===null));});
test('Belin reference-surface difference is not labelled serial progression',()=>{const d={image:{naturalWidth:1200,naturalHeight:838},regions:[[.176,.242],[.407,.242],[.845,.242],[.176,.543],[.407,.543],[.176,.86],[.407,.86]].map(([cx,cy])=>({cx,cy,rx:.065,ry:.093}))};const r=T.describe(d,'belin');assert.equal(r[2].role,'thickness');assert(r[5].label.includes('reference-surface difference'));assert(!r[5].label.includes('progression'));});
console.log(count+' auto3D unit checks passed.');
