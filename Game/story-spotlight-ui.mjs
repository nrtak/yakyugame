import {StorySpotlight} from './story-spotlight.mjs';
import {gameControls} from './game-controls.mjs';
import {playerById} from './rosters.mjs';
export function createStorySpotlightUI({profiles,renderer,defenseControls,overlay,update,onStart,onReturn,reducedMotion}){
 const $=id=>document.getElementById(id);let session=null,epoch=0,busy=false,profileId=null,seriesId=null,teamId=null,attemptId=null,credited=false,signature='';
 function setBusy(value){busy=value;for(const id of ['story-spotlight','story-play','story-back'])$(id).disabled=value;}
 function stop(){epoch++;session=null;credited=false;signature='';setBusy(false);}
 async function start(){if(busy)return;const profile=profiles.current,s=profile.progression.activeSeries;if(!profile.id||!s?.story||!s.games.length){$('story-error').textContent='Play the first story game to open this teammate episode.';return;}const token=++epoch;setBusy(true);$('story-error').textContent='Getting the field ready…';try{await renderer.ready;await renderer.prepareDefense(s.userTeamId,{runnerIds:[]});if(token!==epoch)return;onStart();profileId=profile.id;seriesId=s.id;teamId=s.userTeamId;attemptId=crypto.randomUUID();credited=false;signature='';session=new StorySpotlight(teamId);session.start();session.paused=document.hidden;$('story-error').textContent='';update();}catch{if(token===epoch)$('story-error').textContent='The field could not load. Try the teammate episode again.';}finally{if(token===epoch)setBusy(false);}}
 function retry(){if(!session||session.phase!=='summary')return;attemptId=crypto.randomUUID();credited=false;signature='';session=new StorySpotlight(teamId);session.start();session.paused=document.hidden;update();}
 function draw(){if(!session?.defense)return;const s=session.defense;renderer.drawDefense({...s,controlRail:true,reducedMotion:reducedMotion(),showCall:false,showReviewNotice:false,throwTargets:true,runnerNames:Object.fromEntries(s.runners.map(r=>[r.id,playerById(r.id).name]))});defenseControls.position(renderer.metrics.defenseCamera);}
 function refresh(){if(!session)return;const p=session,s=p.defense,summary=p.phase==='summary',key=JSON.stringify([p.phase,p.paused,s.phase,s.canThrow,s.canFieldAction,s.ballOwnerId,s.playOuts,s.recommendation]);if(signature===key)return;signature=key;const c=gameControls(p);
  $('game').dataset.playMode='field';$('game').classList.toggle('menu-open',p.paused||summary);$('hud').hidden=summary;$('coral').textContent=p.definition.speaker;$('coral').style.background=p.team.color;$('half').textContent='ONE PLAY';$('navy').textContent='TEAMMATE EPISODE';$('count').textContent=p.definition.goal;$('pause').hidden=summary;$('pause').disabled=summary;$('phase-label').hidden=summary;$('phase-label').textContent=p.definition.title;$('replay-tips').hidden=true;
  for(const id of ['action','pad','pitch-picker','pitches','next','control-hint','possession','play-call','steals'])$(id).hidden=true;
  defenseControls.render(c,s,{active:!summary});$('message').hidden=summary;$('message').textContent=s.canThrow?'Ball secured · Tap FIRST to finish Mia’s play':s.moveEnabled?'Move '+p.definition.speaker+' toward the gold target':s.airCatch?'Clara makes the catch':p.definition.goal;
  if(summary){let note='Story games and match statistics are unchanged.';if(!credited){credited=true;try{profiles.recordStorySpotlight(profileId,{seriesId,attemptId,...p.result});}catch{note='This attempt could not be added to the story. You can still retry.';}}
   $('spotlight-result-title').textContent=p.result.success?'A teammate you can trust':'One more read';$('spotlight-result-detail').textContent=p.result.detail;$('spotlight-result-reward').textContent=p.result.success?(teamId==='coral-club'?'Mia Holds the Corner badge earned':'Clara’s Call badge earned'):'Optional challenge · Retry whenever you like';$('spotlight-result-note').textContent=profiles.notice||note;overlay('spotlight-results');
  }else overlay(p.paused?'paused':null);
 }
 $('spotlight-retry').addEventListener('click',retry);$('spotlight-back').addEventListener('click',()=>{stop();onReturn();});
 return{get activity(){return session;},start,stop,draw,update:refresh};
}
