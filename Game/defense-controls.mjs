import {BASE_POINTS} from './defense-play.mjs';
import {fieldProject} from './field-camera.mjs';
const names={'1B':'first','2B':'second','3B':'third',HOME:'home'};
const clampTarget=(v,a,b)=>Math.max(a,Math.min(b,v));
const targetOverlap=(a,b,gap=6)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
// Lay out all choices together. Independent edge clamps can stack several
// bases into one hit area when a wide field camera compresses the diamond.
export function layoutFieldTargets(targets,{width,height,blocked=[]}){
 if(!(width>0&&height>0))return[];
 const size=clampTarget(width*.095,52,64),margin=8,top=10,bottom=Math.max(top,height*.79-size),right=Math.max(margin,width-margin-size),placed=[];
 if(width<2*margin+size||height*.79<top+size)return[];
 for(const target of [...targets].sort((a,b)=>Number(b.recommended)-Number(a.recommended))){
  const desired={x:target.x-size/2,y:target.y-size-8},candidates=[];
  const step=Math.max(12,size/2);
  for(let y=top;y<=bottom+1;y+=step)for(let x=margin;x<=right+1;x+=step)candidates.push({x,y,width:size,height:size});
  candidates.unshift({x:clampTarget(desired.x,margin,right),y:clampTarget(desired.y,top,bottom),width:size,height:size});
  const free=candidates.filter(r=>!blocked.some(b=>targetOverlap(r,b,4))&&!placed.some(b=>targetOverlap(r,b)));
  free.sort((a,b)=>Math.hypot(a.x-desired.x,a.y-desired.y)-Math.hypot(b.x-desired.x,b.y-desired.y));
  const rect=free[0];if(!rect)break;
  placed.push({...target,...rect,edge:Math.hypot(rect.x-desired.x,rect.y-desired.y)>8});
 }
 if(placed.length===targets.length)return placed;
 // A compact row avoids a greedy center placement dividing a short phone
 // viewport into unusable slivers. Each destination retains its own button.
 const rowWidth=targets.length*size+Math.max(0,targets.length-1)*8;
 if(rowWidth>width-2*margin)return[];
 const ordered=[...targets].sort((a,b)=>a.x-b.x),idealX=ordered.reduce((n,p)=>n+p.x,0)/targets.length-rowWidth/2,left=clampTarget(idealX,margin,width-margin-rowWidth),rows=[];
 for(let y=top;y<=bottom+1;y+=4){const row=ordered.map((target,i)=>({...target,x:left+i*(size+8),y,width:size,height:size,edge:true}));if(row.every(r=>!blocked.some(b=>targetOverlap(r,b,4))))rows.push(row);}
 rows.sort((a,b)=>a.reduce((n,r,i)=>n+Math.hypot(r.x+size/2-ordered[i].x,r.y+size+8-ordered[i].y),0)-b.reduce((n,r,i)=>n+Math.hypot(r.x+size/2-ordered[i].x,r.y+size+8-ordered[i].y),0));
 return rows[0]??[]; // A genuinely constrained layout uses the accessible rail.
}
export function fieldTargetPosition(base,camera){
 const p=BASE_POINTS[base];if(!p||!camera||!Number.isFinite(camera.width)||camera.width<=0)return null;
 const q=fieldProject(p);return{x:(q.x-camera.x)/camera.width,y:(q.y-camera.y)/camera.width*1600/960};
}
export function fieldDirectionFromScreen(x,y,point){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!point)return{x:0,y:0};
 const magnitude=Math.min(1,Math.hypot(x,y)),d=1+.008982*point.y,dy=-y*d*d/9.26134,dx=x*d/11.608+.008982*point.x/d*dy,length=Math.hypot(dx,dy);
 return length?{x:dx/length*magnitude,y:dy/length*magnitude}:{x:0,y:0};
}
export function createDefenseControls({document,onChange=()=>{}}){
 const $=id=>document.getElementById(id);let expanded=false,lastOwner=null,last=null,lastCamera=null;
 const layer=document.createElement('div');layer.id='field-targets';layer.hidden=true;layer.setAttribute('role','group');layer.setAttribute('aria-label','Tap a base to throw');
 for(const button of $('throws').querySelectorAll('[data-base]')){const target=button.cloneNode(true);target.classList.add('field-target');layer.append(target);}
 $('game').append(layer);
 function position(camera){
  lastCamera=camera;const [controls,state,options]=last??[],active=options?.active;
  const markers=!!active&&controls.throwsVisible&&!controls.paused&&!!camera;
  layer.hidden=!markers;$('defense-rail').dataset.fieldTargets=String(markers);
  if(markers){
   $('throws').hidden=true;$('defense-more').hidden=true;
   const bounds=$('game').getBoundingClientRect(),buttons=[...layer.querySelectorAll('[data-base]')];
   const blocked=['hud','pause','phase-label','message','control-hint','possession','play-call','tag-runner'].flatMap(id=>{const el=$(id);if(!el||el.hidden)return[];const r=el.getBoundingClientRect();return r.width&&r.height?[{x:r.left-bounds.left,y:r.top-bounds.top,width:r.width,height:r.height}]:[];});
   const targets=buttons.flatMap(b=>{const p=fieldTargetPosition(b.dataset.base,camera),target=controls.bases.find(t=>t.base===b.dataset.base);return p?[{base:b.dataset.base,x:p.x*bounds.width,y:p.y*bounds.height,recommended:target.recommended}]:[];});
   const positions=layoutFieldTargets(targets,{width:bounds.width,height:bounds.height,blocked});
   if(positions.length!==buttons.length){layer.hidden=true;$('throws').hidden=false;$('defense-rail').hidden=false;$('defense-rail').dataset.fieldTargets='false';for(const b of $('throws').querySelectorAll('[data-base]'))b.hidden=false;return;}
   for(const b of buttons){const point=fieldTargetPosition(b.dataset.base,camera),rect=positions.find(p=>p.base===b.dataset.base);if(!point||!rect){b.hidden=true;continue;}
    const target=controls.bases.find(t=>t.base===b.dataset.base);
    const edge=rect.edge;b.style.left=rect.x+'px';b.style.top=rect.y+'px';b.style.width=rect.width+'px';b.style.height=rect.height+'px';b.classList.toggle('edge-target',edge);
    b.querySelector('small').textContent=!target.enabled?target.detail:target.recommended?'Suggested':target.detail==='Tag needed'?'Tag needed':edge?'Tap to throw':'Throw here';
   }
  }
  if(active)$('defense-rail').hidden=markers?!controls.tagVisible:!controls.tagVisible&&!controls.throwsVisible;
 }
 function render(controls,state,{active=false}={}){
  last=[controls,state,{active}];$('defense-rail').hidden=!active;layer.hidden=true;
  $('game').dataset.defenseStep=!active?'none':controls.moveVisible?'move':controls.tagVisible?'tag':controls.throwsVisible?'throw':'watch';
  $('move-pad').hidden=!active||!controls.moveVisible;$('field-action').hidden=!active||!controls.fieldActionVisible;$('field-action').disabled=!controls.fieldActionEnabled;$('field-action').querySelector('b').textContent=controls.fieldActionLabel;
  $('field-action').querySelector('small').textContent=controls.fieldActionLabel==='RECOVER'?'WAIT':controls.fieldActionLabel==='SLIDE'?'STOP BALL':'CATCH BALL';
  if(!active){expanded=false;lastOwner=null;return;}
  if(lastOwner!==state?.ballOwnerId||!state?.canThrow)expanded=false;lastOwner=state?.ballOwnerId;
  const tag=controls.tagVisible&&!expanded;
  $('throws').hidden=!controls.throwsVisible||!expanded&&(tag||!state?.recommendation);
  $('tag-runner').hidden=!tag;$('tag-runner').disabled=!controls.tagEnabled;$('tag-runner').textContent=controls.tagLabel;
  $('defense-more').hidden=!controls.throwsVisible;$('defense-more').disabled=!!controls.paused;$('defense-more').textContent=expanded?'Suggested play':'Other bases';$('defense-more').setAttribute('aria-expanded',String(expanded));
  $('defense-rail').dataset.expanded=String(expanded);
  for(const b of document.querySelectorAll('[data-base]')){const target=controls.bases.find(t=>t.base===b.dataset.base),field=b.classList.contains('field-target');b.hidden=field?!controls.throwsVisible:!expanded&&!target.recommended;b.disabled=!target.enabled;b.classList.toggle('recommended',target.recommended);b.setAttribute('aria-label',target.ariaLabel);
   const title=document.createElement('b'),hint=document.createElement('small');title.textContent=field?target.label:'Throw to '+names[target.base];hint.textContent=target.recommended?'Suggested':target.detail==='Tag needed'?'Tag needed':field?'Throw here':target.detail==='Force out'?'Beat the runner':target.detail==='Runner ahead'?'Runner ahead':'Return the ball';b.replaceChildren(title,hint);
  }
  position(lastCamera);
 }
 $('defense-more').addEventListener('click',()=>{if($('defense-more').disabled)return;expanded=!expanded;if(last)render(...last);onChange();});
 return{render,position,reset(){expanded=false;lastOwner=null;last=null;lastCamera=null;layer.hidden=true;$('defense-rail').hidden=true;$('move-pad').hidden=true;$('field-action').hidden=true;}};
}
