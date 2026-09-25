'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../components/cornea/map_texture.js'),C=require('../components/cornea/surface_schema.js'),V=require('../components/cornea/visit_comparison.js');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const regions=[[.176,.242],[.407,.242],[.845,.242],[.176,.543],[.407,.543],[.176,.86],[.407,.86]].map(([cx,cy])=>({cx,cy,rx:.09,ry:.129}));
const describe=r=>T.describe({image:{naturalWidth:1200,naturalHeight:838},regions:r},'belin');
test('Thickness is the pachymetry circle, separate from both elevations',()=>{const r=describe(regions);assert.equal(r[2].role,'thickness');assert.equal(r[0].role,'elevation_front');assert.equal(r[1].role,'elevation_back');});
test('Missing unrelated circles do not break thickness selection',()=>{for(const n of [0,1,3,4,5,6])assert.equal(describe(regions.filter((_,i)=>i!==n)).find(r=>r.cx===.845).role,'thickness');});
test('Detection order does not change map identity',()=>assert.equal(describe([...regions].reverse()).find(r=>r.cx===.845).role,'thickness'));
test('An extra color region does not shift the thickness index',()=>assert.equal(describe([{cx:.65,cy:.75},...regions]).find(r=>r.cx===.845).role,'thickness'));
test('No thickness circle means no thickness substitute',()=>assert(!describe(regions.filter((_,i)=>i!==2)).some(r=>r.role==='thickness')));
test('Ambiguous thickness circles remain unlabelled',()=>assert(!describe([...regions,{...regions[2]}]).some(r=>r.role==='thickness')));
test('Generic three-across layout does not get Belin labels',()=>assert(describe(regions.slice(0,3)).every(r=>r.role===null)));
test('Changed report aspect preserves known relative map layout',()=>assert.equal(T.describe({image:{naturalWidth:1000,naturalHeight:1000},regions},'belin')[2].role,'thickness'));
function pair(){const a=JSON.parse(fs.readFileSync(path.join(__dirname,'../components/cornea/synthetic_demo.json'),'utf8'));a.visit='first';a.comparison={alignment:'verified_common_grid',registration_id:'synthetic-pair-1',map_definition_id:'synthetic-map-1'};for(const layer of ['anterior','posterior'])a[layer].elevation_reference.reference_id='synthetic-fixed-'+layer;const b=structuredClone(a);b.visit='latest';for(const layer of ['anterior','posterior'])for(const map of ['curvature_D','elevation_um'])b[layer][map]=b[layer][map].map(row=>row.map(n=>n===null?null:n+(map==='curvature_D'?1.6:18)));b.thickness_um=b.thickness_um.map(row=>row.map(n=>n===null?null:n-18));return [a,b];}
const sample=d=>d.delta.flat().find(C.finite);
for(const [role,expected] of [['curvature_front',1.6],['elevation_front',18],['elevation_back',18],['thickness',-18]])test(role+' uses latest minus baseline with correct map',()=>{const [a,b]=pair(),d=V.compare(a,b,role);assert(Math.abs(sample(d)-expected)<1e-10);assert.equal(d.metric.unit,role==='curvature_front'?'D':'µm');});
test('Comparison does not mutate either visit',()=>{const [a,b]=pair(),old=JSON.stringify([a,b]);V.compare(a,b,'thickness');assert.equal(JSON.stringify([a,b]),old);});
test('Baseline and latest readout use the same grid sample',()=>{const [a,b]=pair(),d=V.compare(a,b,'thickness'),j=24,i=24,p=V.sample(d,j,i);assert.equal(p.baseline,a.thickness_um[j][i]);assert.equal(p.latest,b.thickness_um[j][i]);assert.equal(p.change,-18);});
test('Missing samples stay missing, not zero change',()=>{const [a,b]=pair();b.thickness_um[24][24]=null;const d=V.compare(a,b,'thickness');assert.equal(d.delta[24][24],null);assert.equal(V.format(d.delta[24][24]),'—');});
test('All-zero changes use a finite symmetric scale',()=>{const [a]=pair(),b=structuredClone(a);b.visit='latest';const d=V.compare(a,b,'thickness');assert.equal(sample(d),0);assert.equal(d.limit,1);assert.deepEqual(V.color(0,d.limit),[42,193,83]);});
test('Signed readout avoids negative zero',()=>{assert.equal(V.format(-.0001,1),'0.0');assert.equal(V.format(1.6,1),'+1.6');assert.equal(V.format(-18),'-18');});
for(const [name,mutate,role] of [
 ['different eyes',b=>b.eye='OS','thickness'],
 ['reversed visit',b=>b.visit='first','thickness'],
 ['mixed synthetic/patient',b=>{b.kind='measured';b.source='device_numeric_export';},'thickness'],
 ['different axes',b=>b.coordinate_system.x_positive='nasal','thickness'],
 ['shifted coordinates',b=>b.x_mm=b.x_mm.map(x=>x+.001),'thickness'],
 ['missing registration',b=>delete b.comparison,'thickness'],
 ['different registration',b=>b.comparison.registration_id='other','thickness'],
 ['different map definitions',b=>b.comparison.map_definition_id='other','thickness'],
 ['missing pachymetry',b=>delete b.thickness_um,'thickness'],
 ['different curvature definition',b=>b.anterior.curvature_type='mean','curvature_front'],
 ['independent elevation reference',b=>b.posterior.elevation_reference.reference_id='other','elevation_back'],
 ['unspecified common elevation reference',b=>delete b.posterior.elevation_reference.reference_id,'elevation_back'],
 ['different reference diameter',b=>b.posterior.elevation_reference.fit_diameter_mm=7,'elevation_back'],
 ['no complete overlapping map cells',b=>b.thickness_um=b.thickness_um.map((row,j)=>row.map((n,i)=>i===j?n:null)),'thickness']
])test(name+' blocks Change',()=>{const [a,b]=pair();mutate(b);assert.throws(()=>V.compare(a,b,role));});
test('Image-only visit cannot invent Change',()=>assert.throws(()=>V.compare(null,null,'thickness')));
test('Legacy numerical files remain valid without comparison metadata',()=>{const [a]=pair();delete a.comparison;assert.equal(C.validate(a).visit,'first');});
console.log(count+' map routing / comparison checks passed.');
module.exports={pair,regions};
