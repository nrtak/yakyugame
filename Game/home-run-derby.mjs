import {seededRandom,judgeSwing} from './engine.mjs';
import {createBattedBall} from './batted-ball.mjs';

// Headless competition rules. Presentation can use the existing batting scene;
// these rules never modify exhibition scores, rosters, or tournament rewards.
export function createDerby({players,seed=41,pitchesPerTurn=10,tieBreakPitches=3,maxTieBreaks=3}={}){
 if(!Array.isArray(players)||players.length<2||players.length>10||new Set(players.map(p=>p.id)).size!==players.length||players.some(p=>typeof p.id!=='string'||!p.id||!['L','R'].includes(p.bats)||!Number.isFinite(p.power)||p.power<0||p.power>100))throw Error('Choose 2–10 unique hitters with fixed batting hands');
 if(!Number.isSafeInteger(seed)||![pitchesPerTurn,tieBreakPitches,maxTieBreaks].every(n=>Number.isInteger(n)&&n>=1&&n<=30))throw Error('Invalid derby format');
 const config={players:structuredClone(players),seed,pitchesPerTurn,tieBreakPitches,maxTieBreaks};
 return{version:1,config,stage:'qualifying',round:0,eligible:players.map(p=>p.id),turn:0,attempt:0,scores:Object.fromEntries(players.map(p=>[p.id,0])),longest:Object.fromEntries(players.map(p=>[p.id,0])),rounds:[],log:[],over:false,winners:[]};
}
export function derbyPitch(s){
 if(s.over)return null;
 const id=`${s.round}:${s.turn}:${s.attempt}`,random=seededRandom(s.config.seed+s.round*7919+s.turn*211+s.attempt*37);
 return{id,batterId:s.eligible[s.turn],kind:'fast',x:(random()-.5)*.8,y:(random()-.5)*.6,duration:1.45,bend:0,inZone:true};
}
export function applyDerbySwing(state,{pitchId,swing=null}={}){
 const prior=state.log.find(e=>e.pitchId===pitchId);
 if(prior){if(JSON.stringify(prior.swing)!==JSON.stringify(swing))throw Error('That pitch already has a different result');return structuredClone(state);}
 if(state.over)throw Error('Derby already complete');
 const pitch=derbyPitch(state);if(pitchId!==pitch.id)throw Error('Stale derby pitch');
 if(swing!==null&&(![swing.x,swing.y,swing.impactTime].every(Number.isFinite)||Math.abs(swing.x)>2||Math.abs(swing.y)>2||swing.impactTime<0||swing.impactTime>5))throw Error('Invalid derby swing');
 const s=structuredClone(state),batter=s.config.players.find(p=>p.id===pitch.batterId);
 const contact=swing===null?{kind:'take'}:judgeSwing(pitch,swing,swing.impactTime);
 let homeRun=false,distance=0;
 if(contact.kind==='hit'){
  const flight=createBattedBall({...contact,verticalOffset:swing.y-pitch.y},batter);
  homeRun=flight.homeRun;
  distance=Math.round(flight.ground?flight.rollRange:flight.vx/.14*(1-Math.exp(-.14*flight.landingTime)));
 }
 if(homeRun)s.scores[batter.id]++;
 s.longest[batter.id]=Math.max(s.longest[batter.id],homeRun?distance:0);
 s.log.push({pitchId,swing:structuredClone(swing),batterId:batter.id,round:s.round,kind:contact.kind,homeRun,distance});
 s.attempt++;
 const limit=s.stage==='tiebreak'?s.config.tieBreakPitches:s.config.pitchesPerTurn;
 if(s.attempt<limit)return s;
 s.attempt=0;s.turn++;
 if(s.turn<s.eligible.length)return s;
 s.rounds.push({stage:s.stage,scores:structuredClone(s.scores),eligible:[...s.eligible]});
 const ranking=s.eligible.slice().sort((a,b)=>s.scores[b]-s.scores[a]);
 if(s.stage==='qualifying'){
  // Include a tie at the second-place cutoff; never favor roster order.
  const cutoff=s.scores[ranking[1]];s.eligible=ranking.filter(id=>s.scores[id]>=cutoff);s.stage='final';
 }else{
  const leaders=ranking.filter(id=>s.scores[id]===s.scores[ranking[0]]);
  const tieBreaks=s.rounds.filter(r=>r.stage==='tiebreak').length;
  if(leaders.length===1||tieBreaks>=s.config.maxTieBreaks){s.over=true;s.winners=leaders;return s;}
  s.eligible=leaders;s.stage='tiebreak';
 }
 s.round++;s.turn=0;s.scores=Object.fromEntries(s.eligible.map(id=>[id,0]));return s;
}
export function restoreDerby(value){
 if(value?.version!==1||!Array.isArray(value.log)||value.log.length>10000)throw Error('Invalid derby save');
 let rebuilt=createDerby(value.config);
 for(const e of value.log)rebuilt=applyDerbySwing(rebuilt,{pitchId:e.pitchId,swing:e.swing});
 // Recompute every score from the original swings, rejecting edited totals.
 if(JSON.stringify(rebuilt)!==JSON.stringify(value))throw Error('Derby save does not match its swings');
 return rebuilt;
}
