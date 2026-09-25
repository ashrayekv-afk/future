'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),C=require('../components/benefit/benefit_core.js');
const first={A:6.72,B:5.02,C:478,Kmax:54.8,BAD_D:7.4,ARTmax:165},latest={A:6.61,B:4.87,C:465,Kmax:56.1,BAD_D:8.2,ARTmax:142};
const make=()=>({type:'nkpi:benefit:context',version:1,session:'s1',revision:1,sourceDirty:false,eyes:[{eye:'OS',mode:'longitudinal',age:29,interval_days:365,verified:true,first:{...first},latest:{...latest}}]});
let raw=make(),clean=C.cleanContext(raw),p=C.patientSummary(clean.eyes[0]);
assert.equal(p.eye,'OS');assert.equal(p.differenceReady,true);assert.equal(p.rows.find(r=>r.key==='C').delta,-13);
assert(Math.abs(p.rows.find(r=>r.key==='Kmax').delta-1.3)<1e-12);
raw.eyes[0].first.C=700;assert.equal(clean.eyes[0].first.C,478,'Context must be copied');
for(const value of [null,undefined,'',true,{},NaN,Infinity,'nope',199,801]){raw=make();raw.eyes[0].first.C=value;p=C.patientSummary(C.cleanContext(raw).eyes[0]);assert.equal(p.rows.find(r=>r.key==='C').delta,null);}
for(const days of [null,'',true,0,1.5,36526]){raw=make();raw.eyes[0].interval_days=days;p=C.patientSummary(C.cleanContext(raw).eyes[0]);assert.equal(p.differenceReady,false);assert(p.rows.every(r=>r.delta===null));}
raw=make();raw.sourceDirty=true;assert(C.patientSummary(C.cleanContext(raw).eyes[0]).rows.every(r=>r.delta===null));
raw=make();raw.eyes[0].verified=false;assert.equal(C.patientSummary(C.cleanContext(raw).eyes[0]).differenceReady,false);
raw=make();raw.eyes[0].mode='baseline';p=C.patientSummary(C.cleanContext(raw).eyes[0]);assert.equal(p.latest,null);assert(p.rows.every(r=>r.latest===null&&r.delta===null));
for(const mutate of [r=>r.eyes.push(r.eyes[0]),r=>r.eyes[0].eye='XX',r=>r.revision=-1,r=>r.version=2,r=>r.session='',r=>r.eyes=null]){raw=make();mutate(raw);assert.throws(()=>C.cleanContext(raw));}
raw=make();raw.patient_name='Unwanted';raw.eyes[0].score=96;raw.eyes[0].first.filename='Unwanted';assert(!JSON.stringify(C.cleanContext(raw)).includes('Unwanted'));assert(!('score' in C.cleanContext(raw).eyes[0]));
for(const example of ['a','b'])for(const visit of ['baseline','followup'])for(const horizon of [6,12,24]){
 const d=C.demo(example,visit,horizon),i=d.times.indexOf(horizon);
 assert.equal(d.benefit,d.surveillance-d.cxl);assert.equal(d.surveillance,d.data.surveillance[i]);
 for(const key of ['surveillance','cxl','sLow','sHigh','cLow','cHigh'])assert(d.data[key].every((n,j,a)=>n>=0&&n<=100&&(j===0||n>=a[j-1])));
 for(let j=0;j<d.times.length;j++){assert(d.data.sLow[j]<=d.data.surveillance[j]&&d.data.surveillance[j]<=d.data.sHigh[j]);assert(d.data.cLow[j]<=d.data.cxl[j]&&d.data.cxl[j]<=d.data.cHigh[j]);}
 if(example==='b')assert(d.range[0]<0&&d.range[1]>0);
}
const fixture=C.demo();fixture.data.cxl[3]=99;assert.equal(C.demo().cxl,12);assert.throws(()=>C.demo('patient'));assert.throws(()=>C.demo('a','latest'));assert.throws(()=>C.demo('a','baseline',18));
// Run the actual parent context/dispatch functions with calculator state.
const source=fs.readFileSync(path.join(root,'components/app.js'),'utf8');
const functions=source.slice(source.indexOf('function viewerContext()'),source.indexOf('function invalidate('));
let sent;const env={cases:{OD:{enabled:false},OS:{...make().eyes[0],enabled:true}},S:{finite:C.number? v=>C.number(v)!==null:null},F:C.fields,session:'s1',revision:9,sourceDirty:false,importedEyes:new Set(['OS']),window:{location:{origin:'https://local.example'}},$:()=>({contentWindow:{postMessage:(data,origin)=>sent={data,origin}}})};
vm.createContext(env);vm.runInContext(functions+'; resetViewer();',env);
const parentPayload=JSON.parse(JSON.stringify(sent.data));assert.equal(sent.origin,'https://local.example');assert.equal(parentPayload.type,'nkpi:benefit:context');assert.equal(parentPayload.eyes.length,1);assert.equal(parentPayload.eyes[0].imported,true);assert.equal(C.cleanContext(parentPayload).eyes[0].latest.C,465);
assert(!('maps' in parentPayload));assert(!('score' in parentPayload.eyes[0]));
assert(source.includes("d.type==='nkpi:benefit:ready'"));assert(source.includes("d.type==='nkpi:benefit:height'"));
const html=fs.readFileSync(path.join(root,'components/index.html'),'utf8');assert(html.includes('src="benefit/index.html"'));assert(html.includes('id="report-panel"'));assert(!html.includes('src="cornea/index.html"'));
console.log('PASS: numeric validation, missing/invalid input, verified differences, dirty-source holds, eye/visit isolation, 12 fixtures, parent message contract, unchanged source gallery entry.');
