import {TEAMS} from './rosters.mjs';
import {PRACTICE_CAPTAINS} from './batting-practice.mjs';
import {normalizeProgression} from './tournament-progress.mjs';
export function rewardCollection(progress){const p=normalizeProgression(progress);return[
 ...TEAMS.map(t=>({id:t.id,kind:'stadiums',name:t.id==='navy-stars'?'Navy Stadium':'Coral Field',owned:true,ready:true,action:'venue',detail:'Ready to play'})),
 {id:'space-station',kind:'stadiums',name:'Space Station Stadium',owned:p.unlocks.stadiums.includes('space-station'),ready:false,detail:'Secret stadium · Challenge and opening still to come'},
 ...[{id:'club-classic',name:'Club Classic',detail:'Win a Rivalry Series'},{id:'pennant-away',name:'Pennant Away',detail:'Win a Club Cup'}].map(x=>({...x,kind:'uniforms',owned:p.unlocks.uniforms.includes(x.id),ready:false,detail:p.unlocks.uniforms.includes(x.id)?'Earned · Uniform fitting coming soon':x.detail})),
 ...PRACTICE_CAPTAINS.map(c=>({id:c.id,kind:'captains',name:c.name+' · '+c.team,owned:true,ready:true,action:'practice',detail:'Available for batting practice'})),
 ...TEAMS.flatMap(t=>t.players.filter(p=>!p.captain).map(c=>({id:c.id,teamId:t.id,kind:'supportPlayers',name:c.name+' · '+t.name,owned:true,ready:true,action:'club',detail:'Available with '+t.name}))),
 {id:'control-lab',kind:'pitchTraining',name:'Control Lab',owned:p.unlocks.pitchTraining.includes('control-lab'),ready:false,detail:p.unlocks.pitchTraining.includes('control-lab')?'Earned · Training course coming soon':'Win a Club Cup'}
 ];}
export function collectionSelection(progress,kind,id){const item=rewardCollection(progress).find(i=>i.kind===kind&&i.id===id);if(!item?.owned||!item.ready||!item.action)throw Error('This reward is not ready to use yet.');return{action:item.action,id:item.id,teamId:item.teamId};}
export function rewardNames(progress){const names={'rivalry-series-champion':'Rivalry Series Champion','club-cup-champion':'Club Cup Champion','home-run-derby-champion':'Home Run Derby Champion'};return normalizeProgression(progress).awards.map(id=>names[id]??id);}
