import {cpuDifficulty} from './cpu-difficulty.mjs';
import {InningController} from './inning-controller.mjs';
import {TEAMS,currentBatter,currentPitcher,makeMatchPitch,cpuBat,matchTeams} from './match-engine.mjs';
import {venueName} from './rosters.mjs';
import {judgeSwing,judgeTake,SWING_LEAD} from './engine.mjs';
import {pitcherRepertoire} from './pitch-types.mjs';
export const GAME_FORMATS={1:'Practice Inning',3:'Quick Game',7:'Regular Game',9:'Regular Game'};
export function gameFormatLabel(innings){return (GAME_FORMATS[innings]??'Exhibition Game')+' · '+innings+' inning'+(innings===1?'':'s');}

export class DeviceGame {
 constructor({teamId='coral-club',seed=211,assisted=true,innings=1,homeTeamId='navy-stars',difficulty='standard'}={}){cpuDifficulty(difficulty);this.difficulty=difficulty;if(!TEAMS.some(t=>t.id===teamId))throw Error('Unknown team');this.teamId=teamId;this.seed=seed;this.assisted=assisted;this.regulationInnings=innings;this.homeTeamId=homeTeamId;this.reset();}
 reset(){this.inning=new InningController(this.seed,{innings:this.regulationInnings,homeTeamId:this.homeTeamId});this.phase='menu';this.clock=0;this.elapsed=0;this.aim={x:0,y:0};this.swingAt=null;this.pitch=null;this.contact=null;this.paused=false;this.event=null;this.pitchKind='fast';this.autoClock=0;this.atBat=null;}
 get match(){return this.inning.match;}
 get batter(){return currentBatter(this.match);}
 get pitcher(){return currentPitcher(this.match);}
 get repertoire(){return pitcherRepertoire(this.pitcher.id);}
 get teams(){return matchTeams(this.match);}
 get userBatting(){return this.teams[this.match.half].id===this.teamId;}
 get viewingBatting(){return this.phase==='review'&&this.atBat?this.atBat.userBatting:this.userBatting;}
 get renderBatter(){return this.phase==='review'&&this.atBat?this.atBat.batter:this.batter;}
 get renderPitcher(){return this.phase==='review'&&this.atBat?this.atBat.pitcher:this.pitcher;}
 get defense(){return this.inning.defenseState;}
 get venue(){return venueName(this.teams[1]);}
 start(){if(this.phase!=='menu')return false;this.next();return true;}
 next(){if(this.paused||(this.phase!=='menu'&&this.phase!=='review'))return false;if(this.match.over){this.phase='final';return false;}if(!this.repertoire.includes(this.pitchKind))this.pitchKind='fast';this.atBat={batter:this.batter,pitcher:this.pitcher,userBatting:this.userBatting,half:this.match.half,inning:this.match.inning};this.clock=0;this.elapsed=0;this.swingAt=null;this.contact=null;this.event=null;this.cpu=null;this.autoClock=0;this.aim={x:0,y:0};if(this.userBatting){this.pitch=makeMatchPitch(this.match,{difficulty:this.difficulty});this.phase='windup';}else{this.pitch=null;this.phase='pitch-ready';}return true;}
 setAim(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||this.paused||this.swingAt!==null||!['pitch-ready','windup','flight'].includes(this.phase))return;this.aim={x:Math.max(-1.7,Math.min(1.7,x)),y:Math.max(-1.4,Math.min(1.4,y))};}
 choosePitch(kind){if(this.paused||this.phase!=='pitch-ready'||!this.repertoire.includes(kind))return false;this.pitchKind=kind;return true;}
 releasePitch(){if(this.paused||this.phase!=='pitch-ready')return false;this.pitch=makeMatchPitch(this.match,{kind:this.pitchKind,aim:this.aim});this.cpu=cpuBat(this.match,this.pitch,{difficulty:this.difficulty});this.clock=0;this.phase='windup';return true;}
 swing(){if(this.paused||!this.userBatting||this.phase!=='flight'||this.swingAt!==null)return false;this.swingAt=this.elapsed;this.contact=judgeSwing(this.pitch,this.aim,this.elapsed+SWING_LEAD,{forgiving:this.assisted});return true;}
 throwTo(base){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.throwTo(base):false;}
 tagRunner(id){return !this.paused&&this.phase==='field'&&!this.userBatting?this.inning.tagRunner(id):false;}
 finishPitch(outcome){this.event=this.inning.pitchResult(outcome);this.clock=0;this.phase='review';}
 beginFair(contact){
  const verticalOffset=this.userBatting?this.aim.y-this.pitch.y:Math.sin(this.match.pitchNumber*2.37)*.5;
  this.inning.beginFlight({...contact,verticalOffset});this.phase='field';this.clock=0;this.autoClock=0;
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid game time');if(this.paused||['menu','review','final','pitch-ready'].includes(this.phase))return;
  dt=Math.min(.05,dt);this.clock+=dt;
  if(this.phase==='windup'&&this.clock>=.72){this.phase='flight';this.clock=0;this.elapsed=0;}
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
 pause(){if(!['menu','final'].includes(this.phase))this.paused=true;}
 resume(){this.paused=false;}
}
