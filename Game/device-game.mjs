import {cpuDifficulty} from './cpu-difficulty.mjs';
import {InningController} from './inning-controller.mjs';
import {TEAMS,currentBatter,currentPitcher,makeMatchPitch,cpuBat,matchTeams,stealChoices,makeStealAttempt} from './match-engine.mjs';
import {BASE_POINTS,DEFENSE_SPOTS,receivingPoint} from './defense-play.mjs';
import {venueName} from './rosters.mjs';
import {judgeSwing,judgeTake,SWING_LEAD,seededRandom,PITCH_WINDUP_SECONDS} from './engine.mjs';
import {pitcherRepertoire} from './pitch-types.mjs';
export const GAME_FORMATS={1:'Practice Inning',3:'Quick Game',7:'Regular Game',9:'Regular Game'};
export function gameFormatLabel(innings){return (GAME_FORMATS[innings]??'Exhibition Game')+' · '+innings+' inning'+(innings===1?'':'s');}

export class DeviceGame {
 constructor({teamId='coral-club',seed=211,assisted=true,innings=1,homeTeamId='navy-stars',difficulty='standard',manualFielding=false}={}){cpuDifficulty(difficulty);this.difficulty=difficulty;if(!TEAMS.some(t=>t.id===teamId))throw Error('Unknown team');this.teamId=teamId;this.seed=seed;this.assisted=assisted;this.regulationInnings=innings;this.homeTeamId=homeTeamId;this.manualFielding=!!manualFielding;this.reset();}
 setFielderInput(x,y){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.setFielderInput(x,y):false;}
 performFieldAction(){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.performFieldAction():false;}
 reset(){this.inning=new InningController(this.seed,{innings:this.regulationInnings,homeTeamId:this.homeTeamId});this.phase='menu';this.clock=0;this.elapsed=0;this.aim={x:0,y:0};this.swingAt=null;this.pitch=null;this.contact=null;this.paused=false;this.event=null;this.pitchKind='fast';this.autoClock=0;this.atBat=null;this.stealIntent=null;this.steal=null;this.pendingPitch=null;}
 get match(){return this.inning.match;}
 get batter(){return currentBatter(this.match);}
 get pitcher(){return currentPitcher(this.match);}
 get repertoire(){return pitcherRepertoire(this.pitcher.id);}
 get teams(){return matchTeams(this.match);}
 get userBatting(){return this.teams[this.match.half].id===this.teamId;}
 get viewingBatting(){return this.phase==='review'&&this.atBat?this.atBat.userBatting:this.userBatting;}
 get renderBatter(){return this.phase==='review'&&this.atBat?this.atBat.batter:this.batter;}
 get renderPitcher(){return this.phase==='review'&&this.atBat?this.atBat.pitcher:this.pitcher;}
 get defense(){return this.phase==='steal'&&this.steal?this.stealScene():this.inning.defenseState;}
 get stealOptions(){return this.userBatting&&['review','windup'].includes(this.phase)&&!this.match.over&&!this.steal?stealChoices(this.match):[];}
 queueSteal(id){if(this.paused||!this.stealOptions.some(o=>o.runnerId===id))return false;if(this.phase==='review'){this.stealIntent=this.stealIntent===id?null:id;return true;}this.steal=makeStealAttempt(this.match,id,this.clock,this.pitch.duration);return true;}
 stealScene(){
  const a=this.steal,t=a.clock,team=matchTeams(this.match)[1-this.match.half],catcher=team.players.find(p=>p.id===a.catcherId),receiver=team.players.find(p=>p.position===(a.to===2?'2B':'3B')),target=a.to===2?'2B':'3B',bag=BASE_POINTS[target],start=DEFENSE_SPOTS.C,end=receivingPoint(target),q=Math.max(0,Math.min(1,(Math.min(t,!a.safe?a.tagAt:Infinity)-a.departAt)/a.runDuration)),from=BASE_POINTS[a.from===1?'1B':'2B'],runnerPoint={x:from.x+(bag.x-from.x)*(a.lead/90+(1-a.lead/90)*q),y:from.y+(bag.y-from.y)*(a.lead/90+(1-a.lead/90)*q)},flight=Math.max(0,Math.min(1,(t-a.releaseAt)/(a.controlAt-a.releaseAt))),called=t>=a.tagAt;
  const phase=t<a.releaseAt?'transfer':t<a.controlAt?'throw':called&&!a.safe?'tag':'received',owner=t<a.releaseAt?catcher.id:t<a.controlAt?null:receiver.id;
  const players=team.players.map(p=>({id:p.id,name:p.name,position:p.position,throws:p.throws,gloveHand:p.gloveHand,role:p.id===receiver.id?'cover':'support',point:p.id===receiver.id?{...end}:{...DEFENSE_SPOTS[p.position]},covering:p.id===receiver.id?target:null,bagContact:p.id===receiver.id?{...bag}:null,moving:false,motion:{x:0,y:0},motionEndAt:0,motionStartAt:0,tagging:phase==='tag'&&p.id===receiver.id}));
  const runners=this.match.bases.flatMap((id,i)=>id?[id===a.runnerId?{id,from:a.from,to:a.to,arriveAt:a.arrivalAt,point:runnerPoint,out:called&&!a.safe,taggedAt:called&&!a.safe?a.tagAt:null}:{id,from:i+1,to:i+1,arriveAt:0,point:{...BASE_POINTS[['1B','2B','3B'][i]]},out:false}]:[]);
  return{teamId:team.id,clock:t,phase,ball:t<a.releaseAt?{...start,z:3}:t<a.controlAt?{x:start.x+(end.x-start.x)*flight,y:start.y+(end.y-start.y)*flight,z:4+Math.sin(flight*Math.PI)*4}:{...end,z:3},players,runners,fielderId:catcher.id,ballOwnerId:owner,possession:phase==='throw'?'free':phase==='transfer'?'throwing-hand':'receiving-glove',canThrow:false,canTag:false,throwOptions:[],throwFromId:catcher.id,throwToId:receiver.id,throwStart:{...start},throwEnd:{...end},throwReleaseAt:a.releaseAt,throwCatchAt:a.controlAt,throwControlAt:a.controlAt,target,call:called?(a.safe?'safe':'out'):null,playOuts:called&&!a.safe?1:0,finished:t>=a.endAt};
 }
 get venue(){return venueName(this.teams[1]);}
 start(){if(this.phase!=='menu')return false;this.next();return true;}
 next(){if(this.paused||(this.phase!=='menu'&&this.phase!=='review'))return false;if(this.match.over){this.phase='final';return false;}if(!this.repertoire.includes(this.pitchKind))this.pitchKind='fast';this.atBat={batter:this.batter,pitcher:this.pitcher,userBatting:this.userBatting,half:this.match.half,inning:this.match.inning};this.clock=0;this.elapsed=0;this.swingAt=null;this.contact=null;this.event=null;this.cpu=null;this.autoClock=0;this.aim={x:0,y:0};if(this.userBatting){this.pitch=makeMatchPitch(this.match,{difficulty:this.difficulty});this.phase='windup';if(this.stealIntent&&stealChoices(this.match).some(c=>c.runnerId===this.stealIntent))this.steal=makeStealAttempt(this.match,this.stealIntent,0,this.pitch.duration);this.stealIntent=null;}else{this.pitch=null;this.phase='pitch-ready';}return true;}
 setAim(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||this.paused||this.swingAt!==null||!['pitch-ready','windup','flight'].includes(this.phase))return;this.aim={x:Math.max(-1.7,Math.min(1.7,x)),y:Math.max(-1.4,Math.min(1.4,y))};}
 choosePitch(kind){if(this.paused||this.phase!=='pitch-ready'||!this.repertoire.includes(kind))return false;this.pitchKind=kind;return true;}
 releasePitch(){if(this.paused||this.phase!=='pitch-ready')return false;this.pitch=makeMatchPitch(this.match,{kind:this.pitchKind,aim:this.aim});this.cpu=cpuBat(this.match,this.pitch,{difficulty:this.difficulty});this.clock=0;this.phase='windup';return true;}
 swing(){if(this.paused||!this.userBatting||this.phase!=='flight'||this.swingAt!==null)return false;this.swingAt=this.elapsed;this.contact=judgeSwing(this.pitch,this.aim,this.elapsed+SWING_LEAD,{forgiving:this.assisted});return true;}
 throwTo(base){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.throwTo(base):false;}
 tagRunner(id){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.tagRunner(id):false;}
 finishPitch(outcome){const thirdStrike=this.match.outs===2&&this.match.strikes===2&&['strike','miss'].includes(outcome.kind),forcedWalk=outcome.kind==='ball'&&this.match.balls===3&&this.steal&&this.match.bases.slice(0,this.steal.from).every(Boolean);if(this.steal&&outcome.kind!=='foul'&&!thirdStrike&&!forcedWalk&&this.phase!=='steal'){this.pendingPitch=outcome;this.phase='steal';this.clock=0;return;}const steal=this.steal;this.steal=null;this.pendingPitch=null;this.event=this.inning.pitchResult({...outcome,...(steal?{steal}:{}) ,...(this.pitch?{pitchKind:this.pitch.kind}:{})});this.clock=0;this.phase='review';}
 beginFair(contact){
  const verticalOffset=this.userBatting?this.aim.y-this.pitch.y:Math.sin(this.match.pitchNumber*2.37)*.5;
  // Aim is a contact window, not a perfectly repeatable bat/ball collision.
  // Resolve the unobserved barrel angle and contact point once per pitch. Only
  // flight inputs vary: fielders and baserunners still determine the outcome.
  const random=seededRandom(this.match.seed+this.match.pitchNumber*1103+739);
  random();random(); // Mix adjacent saved seeds before sampling the barrel.
  const launchAngle=contact.launchAngle??18-verticalOffset*50+(random()-.5)*32;
  const timing=(contact.timingMs??0)/140*(this.batter.bats==='L'?-1:1);
  const direction=contact.direction??Math.max(-.85,Math.min(.85,timing+(random()-.5)*.8+(this.pitch?.x??0)*.18));
  const attempt=this.steal,runnerAdvances={},runnerStarts={},runnerTimes={};if(attempt){const traveled=Math.min(89,attempt.lead+Math.max(0,attempt.clock-attempt.departAt)*attempt.speed);runnerAdvances[attempt.runnerId]=attempt.to;runnerStarts[attempt.runnerId]=traveled/90;runnerTimes[attempt.runnerId]=(90-traveled)/attempt.speed;}this.steal=null;this.stealIntent=null;
  this.inning.beginFlight({...contact,verticalOffset,launchAngle,direction},{pitchKind:this.pitch?.kind,manualFielding:this.manualFielding&&!this.userBatting,runnerAdvances,runnerStarts,runnerTimes});this.phase='field';this.clock=0;this.autoClock=0;
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid game time');if(this.paused||['menu','final','pitch-ready'].includes(this.phase))return;
  if(this.phase==='review'){this.clock+=Math.min(.05,dt);return;}
  dt=Math.min(.05,dt);this.clock+=dt;
  if(this.steal)this.steal.clock+=dt;
  if(this.phase==='steal'){if(this.steal.clock>=this.steal.endAt)this.finishPitch(this.pendingPitch);return;}
  if(this.phase==='windup'&&this.clock>=PITCH_WINDUP_SECONDS){this.phase='flight';this.clock=0;this.elapsed=0;}
  else if(this.phase==='flight'){
   this.elapsed+=dt;
   if(this.userBatting){
    if(this.contact&&this.elapsed>=this.swingAt+SWING_LEAD&&this.contact.kind==='hit'){this.elapsed=this.swingAt+SWING_LEAD;this.phase='contact';this.clock=0;}
    else if(this.elapsed>=Math.max(this.pitch.duration+.2,this.swingAt===null?0:this.swingAt+SWING_LEAD)){this.finishPitch(this.contact??judgeTake(this.pitch));}
   }else{
    const fair=['single','double','triple','homerun','groundout','flyout'].includes(this.cpu.kind);
    if(fair&&this.elapsed>=this.pitch.duration){this.elapsed=this.pitch.duration;this.contact=this.cpu;this.phase='contact';this.clock=0;}
    else if(!fair&&this.elapsed>=this.pitch.duration+.05)this.finishPitch(this.cpu);
   }
  }else if(this.phase==='contact'&&this.clock>=.16)this.beginFair(this.contact);
  else if(this.phase==='field'){
   if(this.userBatting&&this.defense?.canTag)this.inning.tagRunner();
   if(this.userBatting&&this.defense?.canThrow&&this.defense.recommendation){this.autoClock+=dt;if(this.autoClock>=.12){this.inning.throwTo(this.defense.recommendation);this.autoClock=0;}}else this.autoClock=0;
   const event=this.inning.step(dt);if(event){this.event=event;this.clock=0;this.phase='review';}
  }
 }
 sceneState(){const batter=this.renderBatter,pitcher=this.renderPitcher,team=this.teams.find(t=>t.players.some(p=>p.id===pitcher.id)),catcher=team.players.find(p=>p.position==='C');
  const cpuSwings=!this.viewingBatting&&this.cpu&&!['ball','strike'].includes(this.cpu.kind),swingAt=cpuSwings&&this.pitch?Math.max(0,this.pitch.duration-SWING_LEAD):this.swingAt;
  return {venue:this.venue,homeTeamId:this.homeTeamId,liveDefense:true,phase:this.phase==='contact'?'hit':this.phase==='review'?'result':this.phase,clock:this.clock,elapsed:this.elapsed,pitch:this.pitch,aim:this.aim,swingAt,result:this.contact,pitchOutcome:this.contact??this.cpu??this.event,batterId:batter.id,batterName:batter.name,batterHand:batter.bats,pitcherId:pitcher.id,pitcherName:pitcher.name,pitcherHand:pitcher.throws,catcherId:catcher.id,catcherName:catcher.name,teamColor:team.color};}
 pause(){if(!['menu','final'].includes(this.phase)){this.inning.setFielderInput(0,0);this.paused=true;}}
 resume(){this.paused=false;}
}
