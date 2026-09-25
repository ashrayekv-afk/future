'use strict';
/* Production UI in a minimal DOM/message harness; this is not a browser-layout test. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../components/benefit'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const C=require(path.join(root,'benefit_core.js')),ids={},elements=[],events={},posted=[];
let width=650;
class Element{
 constructor(attrs=''){this.attrs={};this.dataset={};this.handlers={};this.hidden=false;this.textContent='';this.innerHTML='';this.checked=true;this.disabled=false;this.value='';this.classes=new Set();this.classList={toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)};
 for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){this.attrs[m[1]]=m[2];if(m[1]==='id'){assert(!ids[m[2]],'Duplicate DOM ID');ids[m[2]]=this;}if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];}elements.push(this);}
 setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(k,f){this.handlers[k]=f;}getBoundingClientRect(){return {left:0,width,height:1500};}
 click(extra={}){if(!this.disabled)this.handlers.click?.({target:this,...extra});}
}
for(const m of html.matchAll(/<([a-z][a-z0-9]*)([^>]*)>/g))new Element(m[2]);
const parent={postMessage:(data,origin)=>posted.push({data,origin})};
const window={NKPIBenefit:C,parent,location:{origin:'https://local.example'},addEventListener:(name,handler)=>events[name]=handler};
vm.runInNewContext(fs.readFileSync(path.join(root,'benefit.js'),'utf8'),{window,document:{getElementById:id=>{assert(ids[id],id);return ids[id];},querySelectorAll:selector=>elements.filter(e=>selector.slice(1,-1) in e.attrs)},ResizeObserver:class{observe(){}},requestAnimationFrame:f=>f(),console});
const button=(key,value)=>elements.find(e=>e.dataset[key]===String(value));
const first={A:6.72,B:5.02,C:478,Kmax:54.8,BAD_D:7.4,ARTmax:165},latest={A:6.61,B:4.87,C:465,Kmax:56.1,BAD_D:8.2,ARTmax:142};
const payload=(revision=1)=>({type:'nkpi:benefit:context',version:1,session:'s1',revision,eyes:[{eye:'OD',mode:'baseline',verified:true,first:{...first}},{eye:'OS',mode:'longitudinal',verified:true,age:29,interval_days:365,first:{...first},latest:{...latest}}]});
function message(data,extra={}){events.message({data,source:parent,origin:'https://local.example',...extra});}
assert(ids['demo-view'].hidden);assert(!ids['patient-view'].hidden);assert(ids['patient-empty'].hidden===false);assert(posted.some(p=>p.data.type==='nkpi:benefit:ready'));
message(payload());assert(ids['patient-rows'].innerHTML.includes('478'));assert(!ids['patient-head'].innerHTML.includes('Latest'));
button('eye','OS').click();assert(ids['patient-rows'].innerHTML.includes('465'));assert(ids['patient-rows'].innerHTML.includes('−13'));assert(ids['patient-head'].innerHTML.includes('Latest'));
message({...payload(2),eyes:[]},{origin:'https://foreign.example'});assert(ids['patient-rows'].innerHTML.includes('465'));
message({...payload(2),eyes:[]},{source:{}});assert(ids['patient-rows'].innerHTML.includes('465'));
ids['demo-mode'].click();assert(ids['patient-view'].hidden);assert.equal(ids['benefit-number'].textContent,'30');assert.equal(ids['surveillance-risk'].textContent,'42%');assert.equal(ids['cxl-risk'].textContent,'12%');
assert(!ids['history-rows'].innerHTML.includes('478'));assert(!ids['history-rows'].innerHTML.includes('465'),'Patient values must never populate fictional history');
for(const example of ['a','b']){
 ids['example-select'].handlers.change({target:{value:example}});
 for(const visit of ['baseline','followup']){button('visit',visit).click();
  for(const horizon of [6,12,24]){button('horizon',horizon).click();const d=C.demo(example,visit,horizon);
   assert.equal(ids['benefit-number'].textContent,String(d.benefit));assert.equal(ids['surveillance-risk'].textContent,d.surveillance+'%');assert.equal(ids['cxl-risk'].textContent,d.cxl+'%');
   assert(!/NaN|undefined|Infinity/.test(ids['risk-chart'].innerHTML));assert.equal((ids['history-rows'].innerHTML.match(/<td>/g)||[]).length,visit==='baseline'?6:12);
   assert.equal(ids['benefit-status'].classes.has('uncertain'),example==='b');
  }
 }
}
ids['show-ranges'].handlers.change({target:{checked:false}});assert(!ids['risk-chart'].innerHTML.includes('data-band='));
button('series','surveillance').click();assert(!ids['risk-chart'].innerHTML.includes('data-line="surveillance"'));
button('series','cxl').click();assert(ids['risk-chart'].innerHTML.includes('data-line="cxl"'),'Last line stays visible');button('series','surveillance').click();
ids['inspect-time'].handlers.input({target:{value:'2'}});assert(ids['point-readout'].textContent.startsWith('6 mo'));assert.equal(ids['inspect-time'].attrs['aria-valuetext'],'6 months');
ids['risk-chart'].click({clientX:width/2});assert(ids['point-readout'].textContent.startsWith('12 mo'));
message({...payload(2),sourceDirty:true});assert(ids['demo-view'].hidden);assert(ids['patient-banner'].textContent.includes('verification is pending'));assert(!ids['patient-rows'].innerHTML.includes('−13'));
message(payload(1));assert(!ids['patient-rows'].innerHTML.includes('−13'),'Older context cannot restore verified differences');
message(payload(3));assert(ids['patient-rows'].innerHTML.includes('−13'));
ids['demo-mode'].click();message({type:'nkpi:benefit:context',version:1,session:'s2',revision:0,eyes:[]});assert(ids['demo-view'].hidden);assert.equal(ids['patient-rows'].innerHTML,'');assert(ids['patient-empty'].hidden===false);
message({...payload(),version:7});assert(ids['patient-banner'].textContent.includes('could not be verified'));assert.equal(ids['patient-rows'].innerHTML,'');
message(payload(4));button('eye','OD').click();assert(!ids['patient-head'].innerHTML.includes('Latest'));assert(!ids['patient-rows'].innerHTML.includes('465'));
// Produce exact SVG fixtures for optional raster inspection; no patient data written.
ids['demo-mode'].click();
for(const w of [650,280]){width=w;events.resize();assert.equal(ids['risk-chart'].attrs.viewBox,'0 0 '+w+' '+(w<410?300:320));assert(!/NaN|undefined/.test(ids['risk-chart'].innerHTML));
 if(process.argv[2]){fs.mkdirSync(process.argv[2],{recursive:true});const style='<style>text{font:11px Arial;fill:#706d82}.axis-title{font-size:10px}.grid{stroke:#e7e3ee;stroke-width:1}.curve{fill:none;stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.band{opacity:.12}.point{stroke:#fff;stroke-width:2}</style>';fs.writeFileSync(path.join(process.argv[2],'benefit-chart-'+w+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif" font-size="11" fill="#706d82" width="'+w+'" height="'+(w<410?300:320)+'" viewBox="'+ids['risk-chart'].attrs.viewBox+'"><rect width="100%" height="100%" fill="white"/>'+style+ids['risk-chart'].innerHTML+'</svg>');}
}
assert(posted.every(p=>p.origin==='https://local.example'));assert(posted.every(p=>['nkpi:benefit:ready','nkpi:benefit:height'].includes(p.data.type)),'No numeric example is posted to the calculator');
console.log('PASS: production UI events, 12 scenario combinations, arithmetic, missing data, eye switch, demo isolation, verification revocation, old-message rejection, foreign sender/origin rejection, patient reset, legend/ranges, pointer/keyboard readout, narrow/wide SVG output.');
