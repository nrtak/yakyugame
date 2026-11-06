import {BASE_POINTS} from './defense-play.mjs';
import {fieldProject} from './field-camera.mjs';
const names={'1B':'first','2B':'second','3B':'third',HOME:'home'};
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
   const bounds=$('game').getBoundingClientRect();
   for(const b of layer.querySelectorAll('[data-base]')){const point=fieldTargetPosition(b.dataset.base,camera);if(!point){b.hidden=true;continue;}
    const target=controls.bases.find(t=>t.base===b.dataset.base);b.querySelector('small').textContent=target.recommended?'Suggested':target.detail==='Tag needed'?'Tag needed':'Throw here';
    const raw={x:point.x*bounds.width,y:point.y*bounds.height-8},x=Math.max(30,Math.min(bounds.width-30,raw.x)),y=Math.max(112,Math.min(bounds.height*.79,raw.y));
    const edge=Math.abs(x-raw.x)>1||Math.abs(y-raw.y)>1;b.style.left=x+'px';b.style.top=y+'px';b.classList.toggle('edge-target',edge);
    if(edge&&(point.x<0||point.x>1||point.y<0||point.y>(camera.viewHeight??760)/960)){const arrow=Math.abs(raw.y-y)>Math.abs(raw.x-x)?(raw.y>y?'↓':'↑'):(raw.x>x?'→':'←');b.querySelector('small').textContent=arrow+' Off screen';}
   }
  }
  if(active)$('defense-rail').hidden=markers?!controls.tagVisible:!controls.tagVisible&&!controls.throwsVisible;
 }
 function render(controls,state,{active=false}={}){
  last=[controls,state,{active}];$('defense-rail').hidden=!active;layer.hidden=true;
  $('move-pad').hidden=!active||!controls.moveVisible;$('field-action').hidden=!active||!controls.fieldActionVisible;$('field-action').disabled=!controls.fieldActionEnabled;$('field-action').querySelector('b').textContent=controls.fieldActionLabel;
  $('field-action').querySelector('small').textContent=controls.fieldActionLabel==='RECOVER'?'WAIT':'REACH';
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
