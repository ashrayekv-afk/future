/* Local, dependency-free UI. No network requests, patient risk prediction or persistent storage. */
(()=>{'use strict';
const $=id=>document.getElementById(id),C=window.NKPIBenefit;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=1)=>v===null||!Number.isFinite(v)?'—':Number(v).toFixed(d);
const signed=(v,d=1)=>v===null?'—':(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d);
const state={mode:'patient',eye:'OD',example:'a',visit:'followup',horizon:12,ranges:true,series:{surveillance:true,cxl:true},inspect:3};
let context={session:null,revision:-1,eyes:[]},contextError=false,lastHeight=0,heightQueued=false,chartWidth=600;
function post(type,extra={}){if(window.parent!==window)window.parent.postMessage({type,...extra},window.location.origin);}
function height(){if(heightQueued)return;heightQueued=true;requestAnimationFrame(()=>{heightQueued=false;const h=Math.ceil($('benefit-app').getBoundingClientRect().height)+4;if(h>0&&h!==lastHeight){lastHeight=h;post('nkpi:benefit:height',{height:h});}});}
function pressed(selector,key,value){for(const b of document.querySelectorAll(selector))b.setAttribute('aria-pressed',String(b.dataset[key]===String(value)));}
function setMode(mode){state.mode=mode==='demo'?'demo':'patient';render();}
function tableHead(paired,first='Baseline'){return '<tr><th scope="col">Measurement</th><th scope="col">'+first+'</th>'+(paired?'<th scope="col">Latest</th><th scope="col">Change</th>':'')+'</tr>';}
function renderPatient(){
 const c=C.patientSummary(context.eyes.find(c=>c.eye===state.eye));
 for(const b of document.querySelectorAll('[data-eye]')){b.disabled=!context.eyes.some(c=>c.eye===b.dataset.eye);b.setAttribute('aria-pressed',String(b.dataset.eye===state.eye));}
 const any=c?.rows.some(r=>r.first!==null||r.latest!==null);
 $('patient-empty').hidden=!!any;$('patient-head').hidden=!any;$('patient-rows').hidden=!any;$('patient-meta').hidden=!any;
 $('context-caption').textContent=c?(c.eye==='OD'?'Right eye':'Left eye')+' · '+(c.paired?'Two visits':'Single visit'):'Measurements flow here from the calculator above.';
 $('verification').textContent=!any?'Awaiting input':c.demo?'SYNTHETIC INPUT':c.verified?'SOURCE VERIFIED':'CHECK SOURCE';
 $('patient-subtitle').textContent=c?.paired?'Latest minus baseline · observed values':'First / only visit';
 $('patient-meta').innerHTML=c?'<span>Age at first scan: '+fmt(c.age,1)+'</span><span>'+(c.paired?(c.interval_days===null?'Visit interval missing':c.interval_days+' days between scans'):'One examination')+'</span><span>'+(c.imported?'Imported values':'Entered values')+'</span>':'';
 $('patient-head').innerHTML=tableHead(c?.paired,c?.paired?'Baseline':'Selected visit');
 $('patient-rows').innerHTML=c?c.rows.map(r=>'<tr><td><b>'+esc(r.short)+'</b><small>'+esc(r.label)+(r.unit?' · '+esc(r.unit):'')+'</small></td><td>'+fmt(r.first,r.digits)+'</td>'+(c.paired?'<td>'+fmt(r.latest,r.digits)+'</td><td><span class="delta">'+signed(r.delta,r.digits)+'</span></td>':'')+'</tr>').join(''):'';
 let note=!any?'Add measurements above, or explore the simulated example to see the proposed treatment-benefit display.':!c.verified?'Source verification is pending. Reconfirm the measurements above before reviewing differences.':c.paired&&c.interval_days===null?'Confirm the visit interval above to show differences.':'Observed differences are not a treatment-benefit estimate or a confirmation of progression.';
 if(c?.demo&&any)note='SYNTHETIC CALCULATOR EXAMPLE · '+note;
 if(contextError)note='The measurement context could not be verified. Reopen this panel through the calculator; previous values have been cleared.';
 $('patient-banner').textContent=note;
 $('patient-footnote').textContent='Only available values within the calculator’s input bounds are shown. Missing or invalid values remain blank (—). '+(c?.paired?'Changes require verified values at both visits and a valid interval.':'A single visit cannot demonstrate observed progression.');
}
function drawRange(s){
 const x=v=>14+(v+20)/90*242,[low,high]=s.range;
 $('range-chart').setAttribute('viewBox','0 0 270 54');
 $('range-chart').setAttribute('aria-label','Simulated benefit '+s.benefit+' percentage points; illustrative range '+low+' to '+high+' percentage points');
 $('range-chart').innerHTML='<line x1="14" y1="22" x2="256" y2="22" stroke="#dfd7ec" stroke-width="4" stroke-linecap="round"/>'+[-20,0,20,40,60].map(t=>'<text x="'+x(t)+'" y="46" text-anchor="middle" font-size="10" fill="#82758f">'+t+'</text>').join('')+'<line x1="'+x(0)+'" x2="'+x(0)+'" y1="8" y2="33" stroke="#9f91b4" stroke-dasharray="3 3"/><line x1="'+x(low)+'" x2="'+x(high)+'" y1="22" y2="22" stroke="'+(low<=0?'#b28642':'#9975d2')+'" stroke-width="6" stroke-linecap="round"/><circle cx="'+x(s.benefit)+'" cy="22" r="5" fill="#57388e" stroke="#fff" stroke-width="2"/>';
}
function updateReadout(s){const i=state.inspect;
 $('inspect-time').value=String(i);$('inspect-time').setAttribute('aria-valuetext',s.times[i]+' months');$('inspect-month').textContent=s.times[i]+' mo';
 $('point-readout').textContent=s.times[i]+' mo · Surveillance '+s.data.surveillance[i]+'% · CXL '+s.data.cxl[i]+'% · Difference '+(s.data.surveillance[i]-s.data.cxl[i])+' pp';
}
function drawChart(){
 if(state.mode!=='demo')return;
 const s=C.demo(state.example,state.visit,state.horizon),svg=$('risk-chart');
 const width=Math.max(270,Math.round(svg.getBoundingClientRect().width||600)),height=width<410?300:320;
 chartWidth=width;const left=40,right=14,top=27,bottom=40,plotW=width-left-right,plotH=height-top-bottom;
 const x=t=>left+t/24*plotW,y=v=>top+(100-v)/100*plotH;
 const path=values=>s.times.map((t,i)=>(i?'L':'M')+x(t).toFixed(2)+','+y(values[i]).toFixed(2)).join(' ');
 const band=(low,high)=>path(high)+' '+s.times.map((_,i)=>{const k=s.times.length-1-i;return 'L'+x(s.times[k]).toFixed(2)+','+y(low[k]).toFixed(2);}).join(' ')+' Z';
 const i=state.inspect,markX=x(s.times[i]);let out='<title>Fictional treatment comparison</title><desc>Simulated cumulative risk, not a trained prediction. '+s.horizon+' months: surveillance '+s.surveillance+' percent, CXL '+s.cxl+' percent.</desc>';
 out+='<text class="axis-title" x="'+left+'" y="12">Simulated cumulative risk (%)</text>';
 out+=[0,20,40,60,80,100].map(v=>'<line class="grid" stroke="#e7e3ee" stroke-width="1" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="'+(left-10)+'" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>').join('');
 out+=[0,6,12,18,24].map(t=>'<text x="'+x(t)+'" y="'+(height-22)+'" text-anchor="middle">'+t+'</text>').join('');
 out+='<text class="axis-title" x="'+(left+plotW/2)+'" y="'+(height-3)+'" text-anchor="middle">Months after selected visit</text>';
 for(const [key,lo,hi,color]of [['surveillance','sLow','sHigh','#207f89'],['cxl','cLow','cHigh','#6a48b8']]){
  if(!state.series[key])continue;
  if(state.ranges)out+='<path class="band" opacity="0.12" data-band="'+key+'" d="'+band(s.data[lo],s.data[hi])+'" fill="'+color+'"/>';
  out+='<path class="curve" fill="none" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" data-line="'+key+'" d="'+path(s.data[key])+'" stroke="'+color+'"'+(key==='surveillance'?' stroke-dasharray="6 5"':'')+'/>';
 }
 out+='<line x1="'+markX+'" x2="'+markX+'" y1="'+top+'" y2="'+y(0)+'" stroke="#b9abc9" stroke-dasharray="3 4"/>';
 for(const [key,color]of [['surveillance','#207f89'],['cxl','#6a48b8']])if(state.series[key])out+='<circle class="point" stroke="#fff" stroke-width="2" cx="'+markX+'" cy="'+y(s.data[key][i])+'" r="5" fill="'+color+'"/>';
 svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('font-family','Arial, sans-serif');svg.setAttribute('font-size','11');svg.setAttribute('fill','#706d82');svg.innerHTML=out;updateReadout(s);
}
function renderDemo(){
 const s=C.demo(state.example,state.visit,state.horizon),paired=state.visit==='followup';
 $('example-select').value=state.example;pressed('[data-visit]','visit',state.visit);pressed('[data-horizon]','horizon',state.horizon);
 for(const b of document.querySelectorAll('[data-series]'))b.setAttribute('aria-pressed',String(state.series[b.dataset.series]));
 $('show-ranges').checked=state.ranges;
 $('benefit-horizon').textContent='AT '+s.horizon+' MONTHS · SIMULATED';$('benefit-number').textContent=String(s.benefit);
 $('benefit-explanation').textContent=s.benefit+' percentage points lower risk';$('benefit-range').textContent=s.range[0]+' to '+s.range[1]+' pp';
 $('surveillance-risk').textContent=s.surveillance+'%';$('cxl-risk').textContent=s.cxl+'%';
 const uncertain=s.range[0]<=0&&s.range[1]>=0;
 $('benefit-status').textContent=uncertain?'The illustrative range includes no benefit. This example is inconclusive.':'The illustrative range is above zero. This is a fictional example, not evidence of benefit for an actual patient.';
 $('benefit-status').classList.toggle('uncertain',uncertain);
 $('calculation').textContent='Absolute difference: '+s.surveillance+'% − '+s.cxl+'% = '+s.benefit+' percentage points';
 $('history-caption').textContent='Age at baseline '+s.age+(paired?' · 12 months between fictional visits':' · Baseline information only');
 $('history-head').innerHTML=tableHead(paired);
 $('history-rows').innerHTML=s.history.map(([name,unit,first,latest,digits])=>'<tr><td>'+esc(name)+' <small>('+esc(unit)+')</small></td><td>'+fmt(first,digits)+'</td>'+(paired?'<td>'+fmt(latest,digits)+'</td><td>'+signed(latest-first,digits)+'</td>':'')+'</tr>').join('');
 drawRange(s);drawChart();
}
function render(){
 $('patient-view').hidden=state.mode!=='patient';$('demo-view').hidden=state.mode!=='demo';
 $('patient-mode').setAttribute('aria-pressed',String(state.mode==='patient'));$('demo-mode').setAttribute('aria-pressed',String(state.mode==='demo'));
 if(state.mode==='patient')renderPatient();else renderDemo();height();
}
$('patient-mode').addEventListener('click',()=>setMode('patient'));
for(const id of ['demo-mode','patient-explore'])$(id).addEventListener('click',()=>setMode('demo'));
for(const b of document.querySelectorAll('[data-eye]'))b.addEventListener('click',()=>{if(b.disabled)return;state.eye=b.dataset.eye;renderPatient();height();});
$('example-select').addEventListener('change',e=>{if(!['a','b'].includes(e.target.value))return;state.example=e.target.value;state.inspect=[0,3,6,12,18,24].indexOf(state.horizon);renderDemo();height();});
for(const b of document.querySelectorAll('[data-visit]'))b.addEventListener('click',()=>{state.visit=b.dataset.visit;renderDemo();height();});
for(const b of document.querySelectorAll('[data-horizon]'))b.addEventListener('click',()=>{state.horizon=Number(b.dataset.horizon);state.inspect=[0,3,6,12,18,24].indexOf(state.horizon);renderDemo();height();});
$('show-ranges').addEventListener('change',e=>{state.ranges=e.target.checked;drawChart();});
for(const b of document.querySelectorAll('[data-series]'))b.addEventListener('click',()=>{const key=b.dataset.series,other=key==='cxl'?'surveillance':'cxl';if(state.series[key]&&!state.series[other])return;state.series[key]=!state.series[key];renderDemo();});
$('inspect-time').addEventListener('input',e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=5){state.inspect=n;drawChart();}});
function inspectPointer(e){if(state.mode!=='demo')return;const svg=$('risk-chart'),rect=svg.getBoundingClientRect();if(!rect.width)return;const x=(e.clientX-rect.left)*chartWidth/rect.width;const month=Math.max(0,Math.min(24,(x-40)/(chartWidth-54)*24));const times=[0,3,6,12,18,24];state.inspect=times.reduce((best,t,i)=>Math.abs(t-month)<Math.abs(times[best]-month)?i:best,0);drawChart();}
$('risk-chart').addEventListener('pointermove',e=>{if(e.pointerType!=='touch')inspectPointer(e);});$('risk-chart').addEventListener('click',inspectPointer);
window.addEventListener('message',e=>{
 if(e.source!==window.parent||e.origin!==window.location.origin||e.data?.type!=='nkpi:benefit:context')return;
 try{const next=C.cleanContext(e.data);if(next.session===context.session&&next.revision<context.revision)return;
  const changed=next.session!==context.session||next.revision!==context.revision;context=next;contextError=false;
  if(changed){state.mode='patient';state.example='a';state.visit='followup';state.horizon=12;state.inspect=3;state.ranges=true;state.series={surveillance:true,cxl:true};}
  if(!context.eyes.some(c=>c.eye===state.eye))state.eye=context.eyes[0]?.eye||'OD';
 }catch(_){context={session:null,revision:-1,eyes:[]};contextError=true;state.mode='patient';}
 render();
});
window.addEventListener('resize',()=>{drawChart();height();});
new ResizeObserver(height).observe($('benefit-app'));
render();post('nkpi:benefit:ready');
})();
