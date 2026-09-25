// Node DOM/message harness with native Canvas pixels. Not a live-browser test.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const native=require('@napi-rs/canvas');
const root=require('node:path').resolve(__dirname,'..');
let all=[],ids={},queue=[],timerId=0;const timers=new Map();const pendingLoads=new Map(),images=new Map(),realEyes=[];
class El{
 constructor(tag='div',attrs=''){this.tagName=tag.toUpperCase();this.attrs={};this.dataset={};this.handlers={};this.children=[];this.style={};this.hidden=false;this.disabled=false;this.checked=/\bchecked\b/.test(attrs);this._value='';this.textContent='';this._classes=new Set();this.classList={add:(x)=>this._classes.add(x),remove:x=>this._classes.delete(x),toggle:(x,on)=>{if(on??!this._classes.has(x))this._classes.add(x);else this._classes.delete(x);}};for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){this.setAttribute(m[1],m[2]);if(m[1]==='id'){this.id=m[2];ids[this.id]=this;}if(m[1]==='value')this._value=m[2];}all.push(this);}
 setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=String(v);}
 getAttribute(k){return this.attrs[k]??null;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}
 dispatch(type,more={}){for(const f of this.handlers[type]||[])f({target:this,currentTarget:this,preventDefault(){},...more});}
 append(...children){this.children.push(...children);for(const c of children)c.parentElement=this;}appendChild(c){this.append(c);return c;}replaceChildren(...children){this.children=[];this.append(...children);if(this.tagName==='SELECT')this._value=children[0]?.value||'';}
 get options(){return this.children;}get value(){return this._value;}set value(v){this._value=String(v);}set innerHTML(v){this.children=[];this._html=v;}get innerHTML(){return this._html||'';}
 getBoundingClientRect(){return {width:this.viewWidth||440,height:this.viewHeight||(this.id==='atlas'?1400:350),left:0,top:0};}scrollIntoView(){}setPointerCapture(){}
 querySelector(sel){return this.children.find(x=>x.value===sel.match(/value=([^\]]+)/)?.[1])||null;}querySelectorAll(sel){return query(sel);}
}
function canvas(attrs=''){const e=new El('canvas',attrs),c=native.createCanvas(640,640);for(const k of Object.keys(e))c[k]=e[k];for(const k of Object.getOwnPropertyNames(El.prototype))if(k!=='constructor'&&typeof Object.getOwnPropertyDescriptor(El.prototype,k).value==='function')c[k]=El.prototype[k];c.parentElement=new El();const get=c.getContext.bind(c);c.getContext=type=>type==='2d'?get('2d'):null;if(e.id)ids[e.id]=c;return c;}
function query(sel){const a=sel.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);return a?all.filter(e=>a[1] in e.attrs&&(!a[2]||e.attrs[a[1]]===a[2])):[];}
const html=fs.readFileSync(root+'/components/cornea/index.html','utf8');for(const m of html.matchAll(/<([a-z][a-z0-9]*)([^>]*)>/g)){if(m[1]==='canvas')canvas(m[2]);else new El(m[1],m[2]);}
const listeners={};const parent={postMessage(){}};
const ctx={Image:native.Image,console:{log:console.log,warn(){}},URL,location:{origin:'http://test.local'},Math,Uint8Array,Uint8ClampedArray,Int32Array,Float32Array,Map,Set,Number,structuredClone,document:{getElementById:id=>ids[id],createElement:tag=>tag==='canvas'?canvas():new El(tag),querySelectorAll:query},ResizeObserver:class{observe(){}},requestAnimationFrame:f=>{queue.push(f);return queue.length;},setTimeout:(fn)=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),parent,devicePixelRatio:1,addEventListener:(type,f)=>(listeners[type]??=[]).push(f)};ctx.window=ctx;
ctx.matchMedia=()=>({matches:false,addEventListener(){}});
const context=vm.createContext(ctx);for(const file of ['surface_schema.js','map_texture.js','visit_comparison.js','report_comparison.js','reference_eye.js','calibration_profiles.js','numerical_maps.js','numerical_eye.js'])vm.runInContext(fs.readFileSync(root+'/components/cornea/'+file,'utf8'),context,{filename:file});
const RealEye=ctx.NumericalEye3D.NumericalEye;ctx.NumericalEye3D.NumericalEye=class extends RealEye{constructor(...args){super(...args);realEyes.push(this);}};
function loaded(url){const image=images.get(url);if(!image)throw Error('Missing image');return ctx.ReportTexture.analyze(image);}
ctx.ReportTexture.load=async url=>{if(pendingLoads.has(url))await pendingLoads.get(url);return loaded(url);};
vm.runInContext(fs.readFileSync(root+'/components/cornea/auto_viewer.js','utf8'),context,{filename:'auto_viewer.js'});
async function settle(){for(let i=0;i<100;i++){await new Promise(setImmediate);while(queue.length)queue.shift()();const loading=['OD','OS'].some(eye=>ids[eye+'-status'].dataset.state==='loading');if(!loading&&i>2)return;}throw Error('Viewer did not settle');}
function message(data,origin='http://test.local',source=parent){for(const f of listeners.message||[])f({data,origin,source});}
function click(attr,value){const e=all.find(e=>e.attrs[attr]===value);assert(e,'Missing button '+value);e.dispatch('click');}
const debug=eye=>ctx.Auto3D.debug().eyes[eye||'OD'];
let maps=[],slots=[];const init=(session='new-v5')=>message({type:'nkpi:cornea:init',session,slots});const reports=(session='new-v5')=>message({type:'nkpi:cornea:reports',session,maps});
(async()=>{
 assert.equal(all.filter(e=>e.tagName==='BUTTON').length,5);assert.equal(all.filter(e=>e.tagName==='SELECT').length,0);await settle();
 const args=process.argv.slice(2);assert.equal(args.length,2,'Pass baseline and follow-up ZIP paths');const JSZip=require('../components/extractor/vendor/jszip-3.10.1.min.js');
 for(const [i,file]of args.entries()){const zip=await JSZip.loadAsync(fs.readFileSync(file)),groups=new Map();for(const name of Object.keys(zip.files)){const m=name.match(/^(.*?)\.PdfReport\.0000-00(06|11)\.jpe?g$/i);if(!m)continue;const g=groups.get(m[1])||{};g[m[2]==='06'?'topometric':'belin']=name;groups.set(m[1],g);}assert.equal(groups.size,2);let ei=0;for(const g of groups.values()){const eye=['OD','OS'][ei++],visit=i?'latest':'first',pages=[];for(const [kind,name]of Object.entries(g)){const url=`blob:http://test.local/v5-${eye}-${visit}-${kind}`;images.set(url,await native.loadImage(await zip.file(name).async('nodebuffer')));pages.push({id:kind,kind,label:kind,url});}maps.push({eye,visit,source_id:eye+'-'+visit,pages,surface:null});slots.push({eye,visit,source_confirmed:true});}}
 init();reports();await settle();assert(!ids['OS-card'].hidden);console.log('PASS five controls, automatic both-eye import, first render');
 const baselineModels={},latestModels={};
 for(const role of ['curvature_front','thickness']){click('data-map',role);await settle();for(const visit of ['first','latest','change']){click('data-visit',visit);await settle();for(const [i,eye]of ['OD','OS'].entries()){assert.equal(debug(eye).comparisonMode,'estimated',ids[eye+'-status'].textContent);assert.equal(debug(eye).model,'estimated');assert(debug(eye).texture);assert(debug(eye).count>2500);assert.equal(debug(eye).changeAvailable,visit==='change');assert(!ids[eye+'-flat-wrap'].hidden);assert(!ids[eye+'-legend'].hidden);assert(ids[eye+'-flat-label'].textContent.includes(role==='thickness'?'µm':'D'));assert.equal(realEyes[i].cut,role==='thickness');if(visit==='first')baselineModels[eye]=structuredClone(realEyes[i].model);if(visit==='latest')latestModels[eye]=structuredClone(realEyes[i].model);if(process.env.NKPI_PREVIEW_DIR){fs.writeFileSync(process.env.NKPI_PREVIEW_DIR+'/'+eye+'-'+visit+'-'+role+'-eye.png',ids[eye+'-fallback'].toBuffer('image/png'));fs.writeFileSync(process.env.NKPI_PREVIEW_DIR+'/'+eye+'-'+visit+'-'+role+'-flat.png',ids[eye+'-flat'].toBuffer('image/png'));}}
 if(visit==='change'){assert.equal(ids['OD-low'].textContent,ids['OS-low'].textContent);assert.equal(ids['OD-high'].textContent,ids['OS-high'].textContent);}
 console.log('PASS',role,visit,'both eyes, numeric texture and geometry');}}
 for(const eye of ['OD','OS']){assert.notDeepEqual(baselineModels[eye].z,latestModels[eye].z);assert.notDeepEqual(baselineModels[eye].thickness,latestModels[eye].thickness);}console.log('PASS both visits change real model vertices and thickness arrays');
 const before=ctx.Auto3D.debug();message({type:'nkpi:cornea:reports',session:'new-v5',maps:[]},'http://wrong-origin');assert.deepEqual(ctx.Auto3D.debug(),before);console.log('PASS foreign-origin messages ignored');
 slots=slots.map(s=>({...s,source_confirmed:false}));init();await settle();assert(!debug().changeAvailable);assert(!debug().texture);assert.equal(debug().model,null);console.log('PASS revoked source verification removes numeric changes and geometry');
 slots=slots.map(s=>({...s,source_confirmed:true}));init();await settle();assert(debug().changeAvailable);
 click('data-map','curvature_front');click('data-map','thickness');click('data-visit','latest');await settle();assert.equal(ctx.Auto3D.debug().role,'thickness');assert(!debug().changeAvailable);assert.equal(debug().model,'estimated');console.log('PASS rapid map/visit switching applies the current selection');
 const realMaps=maps;maps=maps.filter(m=>!(m.eye==='OS'&&m.visit==='latest'));reports();await settle();assert(!debug('OS').texture);assert.equal(debug('OS').model,null);assert(debug('OD').texture);console.log('PASS absent follow-up does not reuse the baseline or other eye');
 maps=realMaps;reports();await settle();click('data-visit','change');await settle();assert(debug().changeAvailable);
 init('reset-session');await settle();assert.equal(ctx.Auto3D.debug().slots.length,0);assert(!debug().texture);assert(!debug('OS').texture);assert.equal(debug().model,null);console.log('PASS session reset clears grids, textures, and modeled geometry');
 console.log('ALL VIEWER TESTS PASSED (mock DOM, real report pixels, native Canvas).');
})().catch(e=>{console.error(e);process.exitCode=1;});
