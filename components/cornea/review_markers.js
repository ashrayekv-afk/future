/* Browser-local, source-image review pins. No diagnosis, scalar interpolation,
 * anatomical coordinates, score contribution or cross-visit registration.
 */
(function(root){'use strict';
const LABELS=Object.freeze({review:'Area to review',curvature:'Curvature pattern · review',thickness:'Thickness pattern · review',elevation:'Elevation pattern · review',artifact:'Possible artifact · review'});
function sourceKey(c){if(!c||!c.session||!['OD','OS'].includes(c.eye)||!['first','latest'].includes(c.visit)||!c.source_id||!c.page?.id||!c.page?.url||!c.region)return null;const r=c.region;if(!['cx','cy','rx','ry'].every(k=>Number.isFinite(r[k]))||r.rx<=0||r.ry<=0)return null;return JSON.stringify([c.session,c.eye,c.visit,c.source_id,c.page.id,c.page.url,...['cx','cy','rx','ry'].map(k=>r[k])]);}
function point(u,v){if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||u>1||v<0||v>1||Math.hypot(2*u-1,2*v-1)>.985)throw new Error('Place the marker inside the selected map circle, not on its label or legend.');return {u,v};}
class Store{
 constructor(){this.maps=new Map();this.sequence=0;}
 list(c){const key=sourceKey(c);return (key?this.maps.get(key)||[]:[]).map(m=>({...m}));}
 add(c,u,v,kind='review'){const key=sourceKey(c);if(!key)throw new Error('Select a loaded source map before adding a marker.');if(!(kind in LABELS))throw new Error('Unknown review marker type.');point(u,v);const values=this.list(c);if(values.length>=12)throw new Error('This map already has 12 review markers. Remove a marker before adding another.');if(!this.maps.has(key)&&this.maps.size>=32)this.maps.delete(this.maps.keys().next().value);const m={id:++this.sequence,u,v,kind,label:LABELS[kind]};values.push(m);this.maps.set(key,values);return {...m};}
 remove(c,id){const key=sourceKey(c);if(key)this.maps.set(key,this.list(c).filter(m=>m.id!==id));}
 undo(c){const key=sourceKey(c);if(key){const values=this.list(c);values.pop();this.maps.set(key,values);}}
 clear(c){const key=sourceKey(c);if(key)this.maps.delete(key);}
 reset(){this.maps.clear();this.sequence=0;}
}
function drawPin(ctx,x,y,index,radius){ctx.save();ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(2,radius*.18);ctx.fillStyle='#422270';ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=4;ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='bold '+Math.round(radius*1.25)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(index),x,y+radius*.04);ctx.restore();}
function paint(original,markers){if(!markers.length)return original;const canvas=document.createElement('canvas');canvas.width=original.width;canvas.height=original.height;const ctx=canvas.getContext('2d');ctx.drawImage(original,0,0);markers.forEach((m,i)=>drawPin(ctx,m.u*canvas.width,m.v*canvas.height,i+1,Math.max(10,canvas.width*.040)));return canvas;}
function reportPoint(region,marker){return {x:region.cx+(2*marker.u-1)*region.rx,y:region.cy+(2*marker.v-1)*region.ry};}
const api={LABELS,Store,sourceKey,point,paint,drawPin,reportPoint};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReviewMarkers=api;
})(typeof window!=='undefined'?window:globalThis);
