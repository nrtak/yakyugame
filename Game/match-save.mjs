import {DeviceGame} from './device-game.mjs';
import {TEAMS,allPlayers} from './rosters.mjs';
export const MATCH_SAVE_KEY='yakyugame.match-saves.v1';
const clone=v=>structuredClone(v),uint=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
export function captureMatchCheckpoint(game){
 if(['menu','final'].includes(game.phase)||game.match.over)return null;
 return{version:1,kind:'pitch-checkpoint',settings:{teamId:game.teamId,homeTeamId:game.homeTeamId,seed:game.seed,innings:game.regulationInnings,assisted:game.assisted,pitchKind:game.pitchKind},match:clone(game.match)};
}
export function resumeMatchCheckpoint(value){
 const s=value?.settings,m=value?.match;
 if(value?.version!==1||value.kind!=='pitch-checkpoint'||!s||!m||JSON.stringify(value).length>2000000||![1,3,7,9].includes(s.innings)||!Number.isSafeInteger(s.seed)||typeof s.assisted!=='boolean')throw Error('Saved game is unavailable');
 const game=new DeviceGame(s),ids=game.match.teamIds;
 if(m.over!==false||m.winner!==null||m.innings!==s.innings||m.seed!==s.seed||JSON.stringify(m.teamIds)!==JSON.stringify(ids)||!Number.isInteger(m.inning)||m.inning<1||m.inning>m.innings||![0,1].includes(m.half)||![0,1,2].includes(m.outs)||![0,1,2,3].includes(m.balls)||![0,1,2].includes(m.strikes)||!uint(m.pitchNumber))throw Error('Invalid saved count');
 const offense=TEAMS.find(t=>t.id===ids[m.half]),bases=m.bases;
 if(!Array.isArray(bases)||bases.length!==3||bases.some(id=>id!==null&&!offense.players.some(p=>p.id===id))||new Set(bases.filter(Boolean)).size!==bases.filter(Boolean).length)throw Error('Invalid saved runners');
 for(const key of ['score','hits','order'])if(!Array.isArray(m[key])||m[key].length!==2||!m[key].every(uint))throw Error('Invalid saved score');
 if(m.order.some(n=>n>8)||!Array.isArray(m.lineScore)||m.lineScore.length!==2||m.lineScore.some((line,i)=>!Array.isArray(line)||line.length!==m.innings||line.some(n=>n!==null&&!uint(n))||line.reduce((sum,n)=>sum+(n??0),0)!==m.score[i]))throw Error('Invalid saved innings');
 if(!Array.isArray(m.log)||m.log.length!==m.pitchNumber||m.log.some(e=>!e||typeof e.kind!=='string'||typeof e.title!=='string'))throw Error('Invalid saved play history');
 for(const p of allPlayers())for(const key of ['ab','h','r','rbi','bb','k'])if(!uint(m.stats?.[p.id]?.[key]))throw Error('Invalid saved player statistics');
 game.inning.match=clone(m);game.pitchKind=game.repertoire.includes(s.pitchKind)?s.pitchKind:'fast';
 // Active pitch/field animation is intentionally restarted. Completed outcomes
 // already in match are never replayed or awarded again.
 return game;
}
export function createMatchSaveStore(storage){
 let data={version:1,saves:{}},notice='',writable=true,guest=null;
 try{const raw=storage.getItem(MATCH_SAVE_KEY);if(raw!==null){const parsed=JSON.parse(raw);if(raw.length>4000000||parsed?.version!==1||!parsed.saves||Array.isArray(parsed.saves)||typeof parsed.saves!=='object')throw Error('Unknown saves');data=parsed;}}
 catch{writable=false;notice='Saved games could not be opened. New saves will last for this session.';}
 function persist(){if(!writable)return;try{storage.setItem(MATCH_SAVE_KEY,JSON.stringify(data));}catch{writable=false;notice='This game could not be saved to the device. Keep the app open to continue.';}}
 return{
  get notice(){return notice;},
  read(profileId){const save=profileId?data.saves[profileId]:guest;if(!save)return null;try{if(typeof save.runId!=='string'||!save.runId||typeof save.series!=='boolean')throw Error('Invalid saved game');resumeMatchCheckpoint(save.checkpoint);return clone(save);}catch{notice='This saved game is unavailable. You can start a new game.';return null;}},
  save(profileId,{runId,series=false,game}){const checkpoint=captureMatchCheckpoint(game);if(!checkpoint)return false;if(typeof runId!=='string'||!runId)throw Error('Match ID required');const value={runId,series,checkpoint,savedAt:Date.now()};if(profileId){data.saves[profileId]=value;persist();}else guest=value;return true;},
  clear(profileId,runId){const current=profileId?data.saves[profileId]:guest;if(!current||current.runId!==runId)return false;if(profileId){delete data.saves[profileId];persist();}else guest=null;return true;}
 };
}
