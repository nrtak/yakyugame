import{FieldingPractice,FIELDING_DRILLS}from'./fielding-practice.mjs';
import{TEAMS,playerById}from'./rosters.mjs';
import{gameControls}from'./game-controls.mjs';
import{defenseFeedback}from'./game-help.mjs';

export function createFieldingPracticeUI({renderer,overlay,showMenu,home,update,reducedMotion,onStart}){
 const $=id=>document.getElementById(id);let session=null,epoch=0,signature='',summaryShown=false;
 for(const t of TEAMS){const o=document.createElement('option');o.value=t.id;o.textContent=t.name;$('fielding-team').append(o);}
 function stop(){epoch++;session=null;signature='';summaryShown=false;$('fielding-start').disabled=false;}
 async function start(){const token=++epoch,teamId=$('fielding-team').value;$('fielding-start').disabled=true;$('fielding-error').textContent='';
  try{await renderer.ready;await renderer.prepareDefense(teamId);if(token!==epoch)return;
   onStart();session=new FieldingPractice({teamId});session.start();session.paused=document.hidden;signature='';summaryShown=false;update();
  }catch{if(token===epoch)$('fielding-error').textContent='The field images could not load. Tap Start to try again.';}
  finally{if(token===epoch)$('fielding-start').disabled=false;}
 }
 function draw(){if(!session?.defense)return;const s=session.defense;renderer.drawDefense({...s,reducedMotion:reducedMotion(),showCall:false,showReviewNotice:false,runnerNames:Object.fromEntries(s.runners.map(r=>[r.id,playerById(r.id).name]))});}
 function refresh(){if(!session)return;const p=session,s=p.defense,summary=p.phase==='summary',controls=gameControls(p),feedback=defenseFeedback(s);
  const key=JSON.stringify([p.phase,p.paused,p.index,s.phase,s.ballOwnerId,s.call,s.canThrow,s.canTag,s.tagPending,s.recommendation,s.playOuts,s.throwOptions.map(o=>[o.base,o.force,o.out,o.tagRequired])]);if(key===signature)return;signature=key;
  $('game').dataset.playMode='field';$('game').classList.toggle('menu-open',p.paused||summary);
  $('hud').hidden=summary;$('coral').textContent=p.team.short;$('coral').style.background=p.team.color;$('half').textContent='DRILL '+(p.index+1)+'/'+FIELDING_DRILLS.length;$('navy').textContent='OUTS '+(p.summary.outs+(p.phase==='field'?(s.playOuts??0):0));$('navy').style.background='#254e6b';$('count').textContent=p.drill.title;
  $('pause').hidden=summary;$('pause').disabled=summary;$('phase-label').hidden=summary;$('phase-label').textContent='FIELDING PRACTICE';$('replay-tips').hidden=true;
  for(const id of['action','pad','pitch-picker','pitches','control-hint'])$(id).hidden=true;
  $('throws').hidden=summary||!controls.throwsVisible;for(const b of document.querySelectorAll('[data-base]')){const target=controls.bases.find(t=>t.base===b.dataset.base);b.disabled=!target.enabled;b.classList.toggle('recommended',target.recommended);b.setAttribute('aria-label',target.ariaLabel);const name=document.createElement('b'),detail=document.createElement('small');name.textContent=(target.recommended?'★ ':'')+target.label;detail.textContent=target.detail;b.replaceChildren(name,detail);}
  $('tag-runner').hidden=summary||!controls.tagVisible;$('tag-runner').disabled=!controls.tagEnabled;$('tag-runner').textContent=controls.tagLabel;
  $('possession').hidden=summary;$('possession').textContent=feedback.possession;$('play-call').hidden=summary||!feedback.call;$('play-call').textContent=feedback.call;$('play-call').dataset.tone=feedback.tone;
  $('message').hidden=summary;$('message').textContent=p.phase==='review'?p.results.at(-1).detail:s.tagPending?'Ready to tag · Waiting for the runner':s.canTag?'Tap Tag Runner · An out needs a tag':s.canThrow?'Ball secured · Tap a base to throw':s.phase==='throw'?'Throw to '+({'1B':'first base','2B':'second base','3B':'third base',HOME:'home plate'}[s.target]??'the receiver'):s.phase==='caught'?'Caught · Batter out':p.drill.hint;
  $('next').hidden=p.phase!=='review';$('next').disabled=p.paused;$('next').textContent=p.index===FIELDING_DRILLS.length-1?'See Practice Results →':'Next Drill →';
  if(summary){if(!summaryShown){$('fielding-score').textContent=p.summary.drills+' drills complete · '+p.summary.outs+' outs · '+p.summary.throws+' throws';$('fielding-drill-results').replaceChildren(...p.results.map(r=>{const li=document.createElement('li');li.textContent=r.title+' · '+r.outs+' out'+(r.outs===1?'':'s')+' · '+(r.throws.length?r.throws.join(' → '):'No throw');return li;}));summaryShown=true;}overlay('fielding-results');}
  else overlay(p.paused?'paused':null);
 }
 $('open-fielding').addEventListener('click',()=>{$('fielding-error').textContent='';showMenu('fielding-menu');});$('fielding-back').addEventListener('click',()=>{stop();showMenu('home');});$('fielding-start').addEventListener('click',start);$('fielding-again').addEventListener('click',()=>{stop();start();});$('fielding-home').addEventListener('click',home);
 return{get activity(){return session;},draw,update:refresh,start,stop,next(){if(session?.next()){signature='';update();}},throwTo(base){if(session?.throwTo(base)){signature='';update();}},tagRunner(){if(session?.tagRunner()){signature='';update();}}};
}
