import {createCup,restoreCup,prepareCupMatch as prepareBracketMatch,recordCupMatch as recordBracketMatch} from './club-cup.mjs';
const clone=v=>structuredClone(v);
export const SECRET_STADIUM={id:'space-station',name:'Space Station Stadium',secret:true,criteria:null,artReady:false};
const uniqueStrings=value=>[...new Set(Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.length>0&&x.length<160):[])];
export function emptyProgression(){return{version:1,activeSeries:null,seriesHistory:[],activeCup:null,cupHistory:[],rewardReceipts:[],awards:[],unlocks:{uniforms:[],stadiums:[],captains:[],supportPlayers:[],pitchTraining:[],reservePitchSlots:0}};}
export function normalizeProgression(value){
 const out=emptyProgression();if(value==null)return out;
 if(value.version!==1)throw Error('Unknown progression data');
 out.rewardReceipts=uniqueStrings(value.rewardReceipts);out.awards=uniqueStrings(value.awards);
 for(const kind of ['uniforms','stadiums','captains','supportPlayers','pitchTraining'])out.unlocks[kind]=uniqueStrings(value.unlocks?.[kind]);
 const slots=value.unlocks?.reservePitchSlots;out.unlocks.reservePitchSlots=Number.isSafeInteger(slots)?Math.max(0,Math.min(4,slots)):0;
 if(value.activeSeries){validateSeries(value.activeSeries);out.activeSeries=clone(value.activeSeries);}
 out.seriesHistory=(Array.isArray(value.seriesHistory)?value.seriesHistory:[]).map(s=>{validateSeries(s);return clone(s);});
 if(value.activeCup)out.activeCup=restoreCup(value.activeCup);
 out.cupHistory=(Array.isArray(value.cupHistory)?value.cupHistory:[]).map(restoreCup);return out;
}
function validateSeries(s){
 if(!s||typeof s.id!=='string'||!s.id||s.kind!=='rivalry-series'||!Array.isArray(s.teamIds)||s.teamIds.length!==2||s.teamIds[0]===s.teamIds[1]||s.teamIds.some(t=>typeof t!=='string'||!t)||!s.teamIds.includes(s.userTeamId)||![1,3,7,9].includes(s.innings)||!['active','complete'].includes(s.status)||!Array.isArray(s.games))throw Error('Invalid series');
 const ids=new Set(),wins=[0,0];
 for(const g of s.games){if(typeof g.matchId!=='string'||!g.matchId||ids.has(g.matchId)||!Array.isArray(g.score)||g.score.length!==2||!g.score.every(n=>Number.isSafeInteger(n)&&n>=0)||wins.some(n=>n>=2))throw Error('Invalid series result');ids.add(g.matchId);if(g.score[0]!==g.score[1])wins[g.score[0]>g.score[1]?0:1]++;}
 const champion=wins.findIndex(n=>n>=2);if((s.status==='complete')!==(champion>=0)||s.winnerId!==(champion<0?null:s.teamIds[champion]))throw Error('Invalid series winner');
 if(s.pendingMatchId!==null&&(typeof s.pendingMatchId!=='string'||!s.pendingMatchId||ids.has(s.pendingMatchId)||s.status!=='active'))throw Error('Invalid pending series game');
 return wins;
}
export function startSeries(progress,{id,teamIds,userTeamId,innings=3}){
 const p=normalizeProgression(progress);if(p.activeSeries?.status==='active')throw Error('Finish the current series first');
 if(p.seriesHistory.some(s=>s.id===id)||p.activeSeries?.id===id)throw Error('Series ID already used');
 const s={id,kind:'rivalry-series',teamIds:clone(teamIds),userTeamId,innings,status:'active',winnerId:null,games:[],pendingMatchId:null};validateSeries(s);p.activeSeries=s;return p;
}
export function prepareSeriesMatch(progress,matchId){
 const p=normalizeProgression(progress),s=p.activeSeries;if(!s||s.status!=='active')throw Error('No active series');
 if(s.pendingMatchId)return{progress:p,fixture:seriesFixture(s)};
 if(typeof matchId!=='string'||!matchId||s.games.some(g=>g.matchId===matchId))throw Error('A new match ID is required');
 s.pendingMatchId=matchId;return{progress:p,fixture:seriesFixture(s)};
}
export function seriesFixture(s){
 const wins=validateSeries(s),decisive=s.games.filter(g=>g.score[0]!==g.score[1]).length;
 return{matchId:s.pendingMatchId,teamId:s.userTeamId,homeTeamId:s.teamIds[(decisive+1)%2],innings:s.innings,gameNumber:decisive+1,wins,teamIds:clone(s.teamIds)};
}
export function grantProgressReward(progress,{id,award,unlocks={}}){
 const p=normalizeProgression(progress);if(typeof id!=='string'||!id)throw Error('Reward receipt required');if(p.rewardReceipts.includes(id))return p;
 if(award!=null&&(typeof award!=='string'||!award))throw Error('Invalid award');
 for(const kind of Object.keys(unlocks)){
  if(!['uniforms','stadiums','captains','supportPlayers','pitchTraining','reservePitchSlots'].includes(kind))throw Error('Unknown reward type');
  if(kind==='reservePitchSlots'){if(!Number.isInteger(unlocks[kind])||unlocks[kind]<0||unlocks[kind]>4)throw Error('Invalid reserve slot reward');p.unlocks[kind]=Math.max(p.unlocks[kind],unlocks[kind]);}
  else{if(!Array.isArray(unlocks[kind])||unlocks[kind].some(x=>typeof x!=='string'||!x))throw Error('Invalid unlock');p.unlocks[kind]=uniqueStrings([...p.unlocks[kind],...unlocks[kind]]);}
 }
 p.rewardReceipts.push(id);if(award&&!p.awards.includes(award))p.awards.push(award);return p;
}
export function recordSeriesMatch(progress,{matchId,teamIds,score,over}){
 let p=normalizeProgression(progress),s=p.activeSeries;if(!s)throw Error('No series');
 // Result screens may be reopened; a recorded fixture cannot award twice.
 if(s.games.some(g=>g.matchId===matchId))return p;
 if(s.status!=='active'||s.pendingMatchId!==matchId||over!==true||!Array.isArray(teamIds)||teamIds.length!==2||new Set(teamIds).size!==2||!s.teamIds.every(t=>teamIds.includes(t))||!Array.isArray(score)||score.length!==2||!score.every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Completed scheduled series match required');
 const fixture=seriesFixture(s);if(teamIds[1]!==fixture.homeTeamId)throw Error('Series home team changed');
 s.games.push({matchId,score:s.teamIds.map(id=>score[teamIds.indexOf(id)])});s.pendingMatchId=null;
 const wins=s.teamIds.map((_,i)=>s.games.filter(g=>g.score[i]>g.score[1-i]).length),winner=wins.findIndex(n=>n>=2);
 if(winner>=0){s.status='complete';s.winnerId=s.teamIds[winner];p.seriesHistory.push(clone(s));if(s.winnerId===s.userTeamId)p=grantProgressReward(p,{id:'series:'+s.id,award:'rivalry-series-champion',unlocks:{uniforms:['club-classic']}});}
 validateSeries(p.activeSeries);return p;
}
export function venueUnlockStatus(id,progress,readyVenues,defaultVenues=['coral-club','navy-stars']){
 const p=normalizeProgression(progress),owned=defaultVenues.includes(id)||p.unlocks.stadiums.includes(id);
 return!owned?'locked':readyVenues.includes(id)?'playable':'unlocked-awaiting-art';
}
export function startCup(progress,config){const p=normalizeProgression(progress);if(p.activeCup&&!p.activeCup.over)throw Error('Finish your current Cup first.');if(p.cupHistory.some(c=>c.config.id===config.id))throw Error('Cup ID already used.');p.activeCup=createCup(config);return p;}
export function prepareCupMatch(progress,matchId){const p=normalizeProgression(progress);if(!p.activeCup)throw Error('Start a Cup first.');const next=prepareBracketMatch(p.activeCup,matchId);p.activeCup=next.cup;return{progress:p,fixture:next.fixture};}
export function recordCupMatch(progress,result){let p=normalizeProgression(progress);if(!p.activeCup)throw Error('No active Cup.');p.activeCup=recordBracketMatch(p.activeCup,result);const c=p.activeCup;if(c.over&&!p.cupHistory.some(x=>x.config.id===c.config.id)){p.cupHistory.push(clone(c));if(c.winnerId===c.config.userTeamId)p=grantProgressReward(p,{id:'cup:'+c.config.id,award:'club-cup-champion',unlocks:{uniforms:['pennant-away'],pitchTraining:['control-lab']}});}return p;}
