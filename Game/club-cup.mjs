import {seededRandom} from './engine.mjs';
const copy=v=>structuredClone(v),id=v=>typeof v==='string'&&v.length>0&&v.length<160;
export function createCup(config){
 const {teamIds,userTeamId,innings=3,seed=311}=config??{};
 if(!id(config?.id)||![2,4,8].includes(teamIds?.length)||new Set(teamIds).size!==teamIds.length||!teamIds.every(id)||!teamIds.includes(userTeamId)||![1,3,7,9].includes(innings)||!Number.isSafeInteger(seed))throw Error('Choose 2, 4 or 8 distinct clubs for a Cup.');
 const s={version:1,config:{id:config.id,teamIds:[...teamIds],userTeamId,innings,seed},rounds:[],round:0,pendingMatchId:null,history:[],over:false,winnerId:null};
 addRound(s,teamIds);return s;
}
function addRound(s,clubs){
 const round={label:clubs.length===2?'Final':clubs.length===4?'Semifinal':'Quarterfinal',matches:[]};
 for(let i=0;i<clubs.length;i+=2){const pair=clubs.slice(i,i+2),m={teamIds:pair,score:null,winnerId:null,simulated:!pair.includes(s.config.userTeamId)};
  if(m.simulated){const random=seededRandom(s.config.seed+s.round*7919+i*137),score=[Math.floor(random()*8),Math.floor(random()*8)];if(score[0]===score[1])score[1]++;m.score=score;m.winnerId=pair[score[0]>score[1]?0:1];}round.matches.push(m);
 }
 s.rounds.push(round);
 if(round.matches.every(m=>m.winnerId))advance(s);
}
function advance(s){const winners=s.rounds[s.round].matches.map(m=>m.winnerId);if(winners.length===1){s.over=true;s.winnerId=winners[0];return;}s.round++;addRound(s,winners);}
export function cupFixture(s){
 if(s.over)return null;const m=s.rounds[s.round].matches.find(m=>!m.winnerId);
 return{matchId:s.pendingMatchId,teamId:s.config.userTeamId,teamIds:[...m.teamIds],homeTeamId:m.teamIds[1],innings:s.config.innings,roundLabel:s.rounds[s.round].label,round:s.round};
}
export function prepareCupMatch(value,matchId){const s=restoreCup(value);if(s.over)throw Error('This Cup is complete.');if(s.pendingMatchId)return{cup:s,fixture:cupFixture(s)};if(!id(matchId)||s.history.some(e=>e.matchId===matchId))throw Error('A new Cup game ID is required.');s.pendingMatchId=matchId;return{cup:s,fixture:cupFixture(s)};}
function applyResult(s,result){
 const f=cupFixture(s);
 if(!f||s.pendingMatchId!==result.matchId||result.over!==true||!Array.isArray(result.teamIds)||result.teamIds.length!==2||!result.teamIds.every((t,i)=>t===f.teamIds[i])||!Array.isArray(result.score)||result.score.length!==2||!result.score.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000))throw Error('A completed scheduled Cup game is required.');
 s.history.push(copy(result));s.pendingMatchId=null;const [a,b]=result.score;if(a===b)return;
 const m=s.rounds[s.round].matches.find(m=>!m.winnerId);m.score=[a,b];m.winnerId=m.teamIds[a>b?0:1];advance(s);
}
export function recordCupMatch(value,result){const s=restoreCup(value),prior=s.history.find(e=>e.matchId===result?.matchId);if(prior){if(JSON.stringify(prior)!==JSON.stringify(result))throw Error('This Cup game already has a different result.');return s;}applyResult(s,result);return s;}
export function restoreCup(value){
 if(value?.version!==1||!Array.isArray(value.history)||value.history.length>1000)throw Error('Invalid Cup save.');const s=createCup(value.config);
 for(const e of value.history){if(!id(e?.matchId)||s.history.some(x=>x.matchId===e.matchId))throw Error('Duplicate Cup game.');s.pendingMatchId=e.matchId;applyResult(s,e);}
 if(value.pendingMatchId!==null){if(s.over||!id(value.pendingMatchId)||s.history.some(e=>e.matchId===value.pendingMatchId))throw Error('Invalid pending Cup game.');s.pendingMatchId=value.pendingMatchId;}
 if(JSON.stringify(s)!==JSON.stringify(value))throw Error('Cup save does not match its completed games.');return s;
}
