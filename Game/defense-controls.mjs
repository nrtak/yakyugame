const names={'1B':'first','2B':'second','3B':'third',HOME:'home'};
// Shared by matches and practice. The default is one suggested action;
// alternative bases stay available in the reserved control rail.
export function createDefenseControls({document,onChange=()=>{}}){
 const $=id=>document.getElementById(id);let expanded=false,lastOwner=null,last=null;
 function render(controls,state,{active=false}={}){
  last=[controls,state,{active}];$('defense-rail').hidden=!active;
  if(!active){expanded=false;lastOwner=null;return;}
  if(lastOwner!==state?.ballOwnerId||!state?.canThrow)expanded=false;lastOwner=state?.ballOwnerId;
  const tag=controls.tagVisible&&!expanded;
  $('throws').hidden=!controls.throwsVisible||!expanded&&(tag||!state?.recommendation);
  $('tag-runner').hidden=!tag;$('tag-runner').disabled=!controls.tagEnabled;$('tag-runner').textContent=controls.tagLabel;
  $('defense-more').hidden=!controls.throwsVisible;$('defense-more').disabled=!!controls.paused;$('defense-more').textContent=expanded?'Suggested play':'Other bases';$('defense-more').setAttribute('aria-expanded',String(expanded));
  $('defense-rail').dataset.expanded=String(expanded);
  for(const b of document.querySelectorAll('[data-base]')){const target=controls.bases.find(t=>t.base===b.dataset.base);b.hidden=!expanded&&!target.recommended;b.disabled=!target.enabled;b.classList.toggle('recommended',target.recommended);b.setAttribute('aria-label',target.ariaLabel);
   const title=document.createElement('b'),hint=document.createElement('small');title.textContent='Throw to '+names[target.base];hint.textContent=target.recommended?'Suggested play':target.detail==='Tag needed'?'Tag the runner':target.detail==='Force out'?'Beat the runner':target.detail==='Runner ahead'?'Runner ahead':'Return the ball';b.replaceChildren(title,hint);
  }
 }
 $('defense-more').addEventListener('click',()=>{if($('defense-more').disabled)return;expanded=!expanded;if(last)render(...last);onChange();});
 return{render,reset(){expanded=false;lastOwner=null;last=null;$('defense-rail').hidden=true;}};
}
