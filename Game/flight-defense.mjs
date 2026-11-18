import {GroundDefense,BASE_POINTS} from './defense-play.mjs';
import {createBattedBall,battedBallAt,planInterception} from './batted-ball.mjs';
import {TEAMS,playerById} from './rosters.mjs';
export class FlightDefense extends GroundDefense {
 constructor(options){
  const batter=playerById(options.batterId),flight=createBattedBall(options.contact,batter),team=TEAMS.find(t=>t.id===options.teamId),plan=planInterception(flight,team.players);
  const radius=Math.hypot(plan.point.x,plan.point.y),k=Math.min(1,329.99/radius);
  super({...options,target:{x:plan.point.x*k,y:plan.point.y*k},ballTravel:plan.time});
  this.flight=flight;this.plan=plan;
  // A ball off the wall must drop and be gathered before the throw back in.
  if(flight.wallTime!==null&&!flight.homeRun&&!plan.airCatch){
   this.touchAt=Math.max(this.touchAt,flight.wallTime+.75);
   this.collectAt=this.touchAt+.55;
  }
 }
 enableManualFielding(){
  if(this.plan.homeRun)return this;
  const time=this.flight.ground?this.flight.stopTime:Math.min(this.flight.landingTime,this.flight.wallTime??Infinity),target=battedBallAt(this.flight,time);
  // Pick the closest defender to the landing/pickup area, then keep the
  // selection stable throughout the approach instead of switching under a thumb.
  const nearest=this.players.slice().sort((a,b)=>Math.hypot(a.start.x-target.x,a.start.y-target.y)-Math.hypot(b.start.x-target.x,b.start.y-target.y))[0];
  if(nearest.id!==this.fielder.id){const previous=this.fielder;[previous.role,nearest.role]=[nearest.role,previous.role];[previous.covering,nearest.covering]=[nearest.covering,previous.covering];[previous.destination,nearest.destination]=[nearest.destination,previous.destination];[previous.arriveAt,nearest.arriveAt]=[nearest.arriveAt,previous.arriveAt];for(const base of Object.keys(this.coverage))if(this.coverage[base].id===nearest.id)this.coverage[base]=previous;this.fielder=nearest;}
  super.enableManualFielding(target);this.plan={...this.plan,fielderId:this.fielder.id};this.manual.deadline=Math.max(12,this.flight.stopTime+6);return this;
 }
 fieldBallAt(time){return this.flight?battedBallAt(this.flight,time):super.fieldBallAt(time);}
 advanceOnDeepHit(){
  if(this.flight.homeRun||this.context.outs+this.retired.length>=3)return;
  const bounce=this.flight.ground?0:Math.min(this.flight.landingTime,this.flight.wallTime??Infinity);
  if(this.clock<bounce||this.plan.airCatch&&(!this.manual||Number.isFinite(this.touchAt)))return;
  const point=this.clock>=this.touchAt?this.target:this.fieldBallAt(this.clock);
  const depth=Math.hypot(point.x,point.y);
  if(depth<160||this.throw)return;
  // Front runners decide first so a trailing runner never enters an occupied bag.
  const alive=this.runners.filter(r=>!this.retired.some(out=>out.id===r.id));
  let changed=false;
  for(const runner of [...alive].sort((a,b)=>b.to-a.to)){
   if(runner.to===4||runner.id===this.context.batterId&&runner.to===3)continue;
   const held=runner.from===runner.to;
   if(!held&&(this.clock<runner.arriveAt||this.clock-runner.arriveAt>.051))continue;
   if(alive.some(other=>other!==runner&&other.to===runner.to+1&&other.to!==4))continue;
   const duration=this.context.runnerTime*(75/(playerById(runner.id).speed||75))**.35*.92;
   // An outfielder's distance to the next bag and time to secure the ball
   // determine whether the runner commits. A delayed pickup opens the third base lane.
   const next=BASE_POINTS[['HOME','1B','2B','3B','HOME'][runner.to+1]];
   const pickupDistance=this.manual?Math.hypot(this.manual.point.x-point.x,this.manual.point.y-point.y):0;
   const pickup=this.manual?this.clock+pickupDistance/24+(this.manual.moving?0:Math.min(2,pickupDistance/15)):this.collectAt;
   const secureAt=this.clock>=this.touchAt?this.collectAt:pickup;
   const returnTime=secureAt+(this.context.throwSetupById[this.fielder.id]??this.context.throwSetupSeconds)+Math.hypot(point.x-next.x,point.y-next.y)/125;
   // Commit aggressively to second on a gap hit. Third needs more daylight.
   const riskWindow=runner.to===1&&depth>=270?2.15:.65;
   if(!held&&returnTime<this.clock+duration-riskWindow)continue;
   const startAt=held?this.clock:runner.arriveAt;
   const leg={from:runner.to,to:runner.to+1,startAt,arriveAt:startAt+duration};
   this.context.extraLegs??={};
   (this.context.extraLegs[runner.id]??=[]).push(leg);
   Object.assign(runner,{from:leg.from,to:leg.to,legStartAt:startAt,arriveAt:leg.arriveAt});
   if(this.manual)this.manual.deadline=Math.max(this.manual.deadline,leg.arriveAt+.5);
   changed=true;
  }
  return changed;
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid elapsed time');
  // Stop at each bag even when a replay advances its clock in one large step.
  let state;
  while(dt>1e-9&&!this.finished){
   const step=Math.min(.05,dt);state=super.step(step);dt-=step;
   if(this.advanceOnDeepHit())state=this.state;
  }
  return state??this.state;
 }
 manualTouch(time,ball){super.manualTouch(time,ball);this.plan={...this.plan,time,point:{...ball},airCatch:!this.flight.ground&&time<this.flight.landingTime&&(this.flight.wallTime===null||time<this.flight.wallTime)};}
 get canThrow(){if(this.plan?.airCatch||this.plan?.homeRun)return false;return super.canThrow;}
 get tagOptions(){return this.plan?.airCatch||this.plan?.homeRun?[]:super.tagOptions;}
 get fieldActionKind(){
  const firstContact=Math.min(this.flight.landingTime,this.flight.wallTime??Infinity);
  return !this.flight.ground&&this.clock<firstContact?'dive':'slide';
 }
 get finishAt(){if(this.manual&&!Number.isFinite(this.touchAt))return super.finishAt;if(this.plan?.airCatch||this.plan?.homeRun)return this.plan.time+1;return super.finishAt;}
 get state(){
  const s=super.state;if(!this.plan)return s;
  s.flightType=this.flight.ground?'Ground ball':this.flight.angle<25?'Line drive':'Fly ball';s.launchAngle=this.flight.angle;s.airCatch=Boolean(this.plan.airCatch)&&(!this.manual||Number.isFinite(this.touchAt));s.catchAt=this.plan.time;s.catchHeight=this.plan.point.z;
  if(this.manual&&!Number.isFinite(this.touchAt)){s.ball=this.fieldBallAt(this.clock);s.phase=this.finished?'complete':this.fieldActionKind==='dive'?'airborne':'approach';s.possession='free';s.ballOwnerId=null;s.landingAt=this.flight.ground?this.flight.stopTime:Math.min(this.flight.landingTime,this.flight.wallTime??Infinity);if(!this.flight.ground&&this.clock>=s.landingAt)s.fieldingTarget=this.fieldBallAt(Math.min(this.flight.stopTime,this.clock+.3));s.catchWindow=s.ball.z<=16&&Math.hypot(s.ball.x-this.manual.point.x,s.ball.y-this.manual.point.y)<=12;return s;}
  if(this.clock<this.plan.time){s.ball=battedBallAt(this.flight,this.clock);s.phase=this.fieldActionKind==='dive'?'airborne':'approach';s.possession='free';s.ballOwnerId=null;}
  if(this.plan.airCatch){
   s.runners=s.runners.map(r=>r.id===this.context.batterId?{...r,out:this.clock>=this.plan.time}:this.context.outs<2?{...r,to:r.from,arriveAt:0,point:{...BASE_POINTS[['HOME','1B','2B','3B'][r.from]]}}:r);
   if(this.clock>=this.plan.time){s.ball={...this.plan.point,z:6};s.ballOwnerId=this.fielder.id;s.possession='fielding-glove';s.phase=this.finished?'complete':'caught';s.playOuts=1;s.call='out';}
  }
  if(this.plan.homeRun){s.phase=this.finished?'complete':this.clock>=this.plan.time?'homerun':'airborne';s.ball=battedBallAt(this.flight,this.clock);s.possession='free';s.ballOwnerId=null;s.call=this.clock>=this.plan.time?'homerun':null;s.runners=[];}
  return s;
 }
 get resolution(){if(!this.finished)return null;if(this.plan.homeRun)return{kind:'homerun',detail:'The ball cleared the fence above the wall.'};if(this.plan.airCatch&&(!this.manual||Number.isFinite(this.touchAt)))return{kind:'flyout',detail:'Caught before the bounce. Runners held their bases.'};return super.resolution;}
}
