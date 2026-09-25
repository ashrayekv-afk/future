/* Pure data contracts. Patient measurements never enter the fictional risk fixtures. */
(function(root){'use strict';
const fields=[
 {key:'Kmax',label:'Maximum keratometry',short:'Kmax',unit:'D',digits:1,low:20,high:100},
 {key:'C',label:'Thinnest pachymetry',short:'Thickness',unit:'µm',digits:0,low:200,high:800},
 {key:'B',label:'Posterior radius',short:'B · PRC',unit:'mm',digits:2,low:2.5,high:12.5},
 {key:'A',label:'Anterior radius',short:'A · ARC',unit:'mm',digits:2,low:2.5,high:12.5},
 {key:'BAD_D',label:'Belin–Ambrósio deviation',short:'BAD-D',unit:'',digits:2,low:-5,high:60},
 {key:'ARTmax',label:'Relational thickness',short:'ARTmax',unit:'',digits:1,low:1,high:1000}
];
function number(value,low=-Infinity,high=Infinity){
 if(!['number','string'].includes(typeof value)||String(value).trim()==='')return null;
 const n=Number(value);return Number.isFinite(n)&&n>=low&&n<=high?n:null;
}
function values(raw){return Object.fromEntries(fields.map(f=>[f.key,number(raw?.[f.key],f.low,f.high)]));}
function cleanContext(raw){
 if(raw?.type!=='nkpi:benefit:context'||raw.version!==1||typeof raw.session!=='string'||!raw.session||raw.session.length>120||!Number.isSafeInteger(raw.revision)||raw.revision<0||!Array.isArray(raw.eyes)||raw.eyes.length>2)throw new Error('Invalid benefit context');
 const seen=new Set(),eyes=raw.eyes.map(c=>{
  if(!c||!['OD','OS'].includes(c.eye)||seen.has(c.eye)||!['baseline','longitudinal'].includes(c.mode))throw new Error('Invalid eye context');
  seen.add(c.eye);const days=number(c.interval_days,1,36525);
  return {eye:c.eye,mode:c.mode,age:number(c.age,18,100),interval_days:c.mode==='longitudinal'&&Number.isInteger(days)?days:null,
   first:values(c.first),latest:c.mode==='longitudinal'?values(c.latest):null,
   verified:c.verified===true&&raw.sourceDirty!==true,imported:c.imported===true,demo:c.demo===true};
 });
 return {session:raw.session,revision:raw.revision,eyes};
}
function patientSummary(c){
 if(!c)return null;
 const paired=c.mode==='longitudinal',differenceReady=c.verified&&paired&&c.interval_days!==null;
 return {...c,paired,differenceReady,rows:fields.map(f=>({...f,first:c.first[f.key],latest:paired?c.latest[f.key]:null,
  delta:differenceReady&&c.first[f.key]!==null&&c.latest[f.key]!==null?c.latest[f.key]-c.first[f.key]:null}))};
}
const times=[0,3,6,12,18,24];
/* Handcrafted design examples. These arrays are not fitted model parameters. */
const examples={
 a:{age:22,title:'Larger illustrative difference',history:[['Kmax','D',52,53.1,1],['Thinnest pachymetry','µm',470,462,0],['Posterior radius B','mm',5.8,5.65,2]],
  baseline:{surveillance:[0,5,11,28,40,52],cxl:[0,2,4,9,13,17],sLow:[0,2,5,17,27,36],sHigh:[0,9,18,41,56,70],cLow:[0,0,1,3,5,7],cHigh:[0,5,9,17,24,31],effectLow:[0,-1,1,7,10,13],effectHigh:[0,7,13,31,44,56]},
  followup:{surveillance:[0,8,18,42,56,65],cxl:[0,3,6,12,16,20],sLow:[0,4,11,31,42,50],sHigh:[0,13,27,54,70,82],cLow:[0,1,2,6,8,10],cHigh:[0,6,11,20,27,33],effectLow:[0,-1,4,18,24,28],effectHigh:[0,11,20,42,56,62]}},
 b:{age:29,title:'Uncertain illustrative difference',history:[['Kmax','D',55.2,55.4,1],['Thinnest pachymetry','µm',444,443,0],['Posterior radius B','mm',5.3,5.31,2]],
  baseline:{surveillance:[0,2,5,12,18,24],cxl:[0,1,3,6,9,12],sLow:[0,0,1,4,7,10],sHigh:[0,6,12,24,33,42],cLow:[0,0,0,1,2,3],cHigh:[0,5,9,17,23,29],effectLow:[0,-4,-6,-10,-13,-16],effectHigh:[0,6,10,22,31,40]},
  followup:{surveillance:[0,2,4,10,15,20],cxl:[0,1,3,6,9,12],sLow:[0,0,1,3,5,7],sHigh:[0,5,10,21,29,37],cLow:[0,0,0,1,2,3],cHigh:[0,5,8,15,21,27],effectLow:[0,-4,-5,-8,-11,-14],effectHigh:[0,6,7,16,23,30]}}
};
function demo(example='a',visit='followup',horizon=12){
 if(!Object.hasOwn(examples,example)||!['baseline','followup'].includes(visit)||![6,12,24].includes(horizon))throw new Error('Unknown simulated example');
 const fixture=examples[example],data=fixture[visit],i=times.indexOf(horizon);
 return JSON.parse(JSON.stringify({kind:'simulation',example,visit,horizon,age:fixture.age,title:fixture.title,times,history:fixture.history,
  data,surveillance:data.surveillance[i],cxl:data.cxl[i],benefit:data.surveillance[i]-data.cxl[i],range:[data.effectLow[i],data.effectHigh[i]]}));
}
const api={fields,number,cleanContext,patientSummary,demo};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NKPIBenefit=api;
})(typeof window!=='undefined'?window:globalThis);
