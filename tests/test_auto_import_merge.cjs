'use strict';
// Production import routing with simulated decoded pages/OCR and extraction.
// Does not claim real DICOM decoding or OCR accuracy.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let loaded,headers={},extracted=[],manualCalls=0;
class ImportError extends Error{constructor(code,message){super(message);this.code=code;}}
const ctx={console,state:{processEpoch:1},document:{addEventListener(){}},resetResultsOnly(){},visitCard(){},reportFilenameParts(){},isSupportedReportImage(){},parseArchive(){},basename:p=>p.split('/').pop(),timestampFromPrefix:()=>null,REQUIRED_SUFFIXES:{topometric:'-0006',belin:'-0011',progression:'-0012'},setProgress(){},ensureWorkers:async()=>[{}],blobToBitmap:async b=>({filename:b.filename,close(){}}),recognizeHeader:async(_,b)=>({text:headers[b.filename]||''}),pairGenericPages:()=>[],NKPIArchiveReader:{ImportError,open:async()=>loaded,summarize:()=>''},extractStudy:async d=>{extracted.push(d);return {eye:d.forcedEye,descriptor:d};},reconcileStudyLaterality:s=>s};
vm.createContext(ctx);
const app=fs.readFileSync(path.join(root,'components/extractor/app.js'),'utf8');vm.runInContext(app.slice(app.indexOf('function classifyReportTitle('),app.indexOf('async function recognizeHeader(')),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'components/extractor/archive_integration.js'),'utf8'),ctx);
ctx.chooseReportPages=async()=>{manualCalls++;return [{manual:true,forcedEye:'OD',pages:{},zip:loaded.zip}];};ctx.blankSourceStudy=async()=>({eye:'OD',values:{A:null,B:null,C:null,Kmax:null,BAD_D:null,ARTmax:null}});
function setup(rows,converted=true){headers=Object.fromEntries(rows);loaded={imageFiles:rows.map(r=>r[0]),metadata:Object.fromEntries(rows.map(([f])=>[f,{converted,original:f+'.original.dcm'}])),zip:{file:f=>({async:async()=>({filename:f})})},diagnostic:{issues:{}}};extracted=[];manualCalls=0;}
(async()=>{
setup([['1.png','Topometric KC-Staging OD'],['2.png','Belin Ambrosio Enhanced Ectasia OD'],['3.png','Topometric KC-Staging OS'],['4.png','Belin Ambrosio Enhanced Ectasia OS']]);
let result=await ctx.parseArchive({},'Baseline');assert.equal(result.length,2);assert.equal(manualCalls,0);assert.equal(extracted[0].forcedEye,'OD');assert.equal(extracted[1].forcedEye,'OS');assert.equal(extracted[0].pages.belin,'2.png');assert.equal(extracted[0].originalPages.belin,'2.png.original.dcm');console.log('PASS automatic decoded-page route reaches extraction and retains original source paths for both eyes');
assert.equal(ctx.autoHeaderEye('OD OS'),null);assert.equal(ctx.autoHeaderEye('METHOD'),null);assert.equal(ctx.autoHeaderEye('eye: OS'),'OS');console.log('PASS printed-eye token handling retained');
setup([['report.PdfReport.0000-0006.jpg',''],['report.PdfReport.0000-0011.jpg','']],false);result=await ctx.parseArchive({},'Baseline');assert.equal(result.length,1);assert.equal(manualCalls,0);assert.equal(extracted[0].pages.topometric,'report.PdfReport.0000-0006.jpg');console.log('PASS known JPEG export retains original direct extraction path');
setup([['unknown.png','Unrecognized report']]);result=await ctx.parseArchive({},'Baseline');assert.equal(manualCalls,1);assert.equal(extracted.length,0);assert(Object.values(result[0].values).every(v=>v===null));console.log('PASS unidentified pages retain explicit fallback with no invented measurements');
setup([['1.png','Topometric KC-Staging OD'],['2.png','Belin Ambrosio Enhanced Ectasia OD']]);vm.runInContext('forceManualImport=true',ctx);await ctx.parseArchive({},'Baseline');assert.equal(manualCalls,1);vm.runInContext('forceManualImport=false',ctx);console.log('PASS explicit manual import still works');
await assert.rejects(ctx.autoIdentifyConvertedReports(loaded,'Baseline',0,[{}]),e=>e.code==='cancelled');console.log('PASS automatic header scan rejects an already obsolete source generation');
console.log('6 automatic-import merge checks passed (simulated OCR/decoded inputs).');
})().catch(e=>{console.error(e);process.exitCode=1;});
