import{TEAMS}from'./rosters.mjs';
import{GroundDefense}from'./defense-play.mjs';
import{FlightDefense}from'./flight-defense.mjs';

export const FIELDING_DRILLS=[
 {id:'shortstop',title:'Grounder to shortstop',hint:'Secure the ball, then throw to first.',target:{x:-40,y:115}},
 {id:'catcher',title:'Slow roller near home',hint:'Let the catcher gather it, then choose a base.',target:{x:0,y:4},ballTravel:.6},
 {id:'outfield',title:'Grounder to right field',hint:'Track the runner and get the ball back to first.',target:{x:120,y:210}},
 {id:'fly',title:'Center-field fly ball',hint:'Follow the catch. No throw is needed for the fly out.',contact:{quality:.6,launchAngle:40,direction:0}},
 {id:'relay',title:'Runner on first',hint:'Try a force at second, then continue the relay to first.',target:{x:-40,y:115},runnerOnFirst:true},
 {id:'tag',title:'First, then tag at second',hint:'Take the out at first. Throw to second, then tap Tag Runner.',target:{x:64,y:66},runnerOnFirst:true,tagSequence:true}
];

// Uses the same possession, force, receiver and runner clocks as a real game.
// Practice results are session-only and never enter match/profile statistics.
export class FieldingPractice{
 constructor({teamId='navy-stars'}={}){
  this.team=TEAMS.find(t=>t.id===teamId);if(!this.team)throw Error('Unknown practice team');
  this.offense=TEAMS.find(t=>t.id!==teamId);this.teamId=teamId;this.userBatting=false;
  this.index=0;this.phase='ready';this.paused=false;this.results=[];this.play=null;
 }
 get drill(){return FIELDING_DRILLS[this.index];}
 get defense(){const s=this.play?.state??null;if(s&&this.drill.tagSequence)s.recommendation=this.play.retired.length===0?'1B':s.tagPending||s.canTag||s.throwToId===this.play.coverage['2B'].id?null:'2B';return s;}
 get summary(){return{drills:this.results.length,total:FIELDING_DRILLS.length,outs:this.results.reduce((n,r)=>n+r.outs,0),throws:this.results.reduce((n,r)=>n+r.throws.length,0),results:structuredClone(this.results)};}
 start(){if(this.paused||this.phase!=='ready')return false;
  const d=this.drill,options={teamId:this.teamId,batterId:this.offense.players[0].id,bases:[d.runnerOnFirst?this.offense.players[1].id:null,null,null],outs:0};
  this.play=d.contact?new FlightDefense({...options,contact:d.contact}):new GroundDefense({...options,target:{...d.target},ballTravel:d.ballTravel??1.5});
  this.phase='field';return true;
 }
 throwTo(base){return !this.paused&&this.phase==='field'?this.play.throwTo(base):false;}
 tagRunner(){return !this.paused&&this.phase==='field'?this.play.tagRunner():false;}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid practice time');if(this.paused||this.phase!=='field')return;
  this.play.step(Math.min(.05,dt));if(!this.play.finished)return;
  const resolution=this.play.resolution,outs=resolution.kind==='flyout'?1:resolution.retired?.length??0;
  this.results.push({id:this.drill.id,title:this.drill.title,outs,throws:this.play.throws.map(t=>t.base),call:this.defense.call,detail:resolution.detail});this.phase='review';
 }
 next(){if(this.paused||this.phase!=='review')return false;
  if(this.index===FIELDING_DRILLS.length-1){this.phase='summary';return true;}
  this.index++;this.phase='ready';return this.start();
 }
}
