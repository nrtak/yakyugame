import {GroundDefense,BASE_POINTS} from './defense-play.mjs';
import {createBattedBall,battedBallAt,planInterception} from './batted-ball.mjs';
import {TEAMS,playerById} from './rosters.mjs';
export class FlightDefense extends GroundDefense {
 constructor(options){
  const batter=playerById(options.batterId),flight=createBattedBall(options.contact,batter),team=TEAMS.find(t=>t.id===options.teamId),plan=planInterception(flight,team.players);
  const radius=Math.hypot(plan.point.x,plan.point.y),k=Math.min(1,329.99/radius);
  super({...options,target:{x:plan.point.x*k,y:plan.point.y*k},ballTravel:plan.time});
  this.flight=flight;this.plan=plan;
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
 manualTouch(time,ball){super.manualTouch(time,ball);this.plan={...this.plan,time,point:{...ball},airCatch:!this.flight.ground&&time<this.flight.landingTime&&(this.flight.wallTime===null||time<this.flight.wallTime)};}
 get canThrow(){if(this.plan?.airCatch||this.plan?.homeRun)return false;return super.canThrow;}
 get finishAt(){if(this.manual&&!Number.isFinite(this.touchAt))return super.finishAt;if(this.plan?.airCatch||this.plan?.homeRun)return this.plan.time+1;return super.finishAt;}
 get state(){
  const s=super.state;if(!this.plan)return s;
  s.flightType=this.flight.ground?'Ground ball':this.flight.angle<25?'Line drive':'Fly ball';s.launchAngle=this.flight.angle;s.airCatch=Boolean(this.plan.airCatch)&&(!this.manual||Number.isFinite(this.touchAt));s.catchAt=this.plan.time;s.catchHeight=this.plan.point.z;
  if(this.manual&&!Number.isFinite(this.touchAt)){s.ball=this.fieldBallAt(this.clock);s.phase=this.finished?'complete':this.flight.ground||this.clock>=this.flight.landingTime?'approach':'airborne';s.possession='free';s.ballOwnerId=null;s.landingAt=this.flight.ground?this.flight.stopTime:this.flight.landingTime;if(!this.flight.ground&&this.clock>=this.flight.landingTime)s.fieldingTarget=this.fieldBallAt(Math.min(this.flight.stopTime,this.clock+.3));s.catchWindow=s.ball.z<=16&&Math.hypot(s.ball.x-this.manual.point.x,s.ball.y-this.manual.point.y)<=12;return s;}
  if(this.clock<this.plan.time){s.ball=battedBallAt(this.flight,this.clock);s.phase=this.flight.ground?'approach':'airborne';s.possession='free';s.ballOwnerId=null;}
  if(this.plan.airCatch){
   s.runners=s.runners.map(r=>r.id===this.context.batterId?{...r,out:this.clock>=this.plan.time}:this.context.outs<2?{...r,point:{...BASE_POINTS[['HOME','1B','2B','3B'][r.from]]}}:r);
   if(this.clock>=this.plan.time){s.ball={...this.plan.point,z:6};s.ballOwnerId=this.fielder.id;s.possession='fielding-glove';s.phase=this.finished?'complete':'caught';s.playOuts=1;s.call='out';}
  }
  if(this.plan.homeRun){s.phase=this.finished?'complete':this.clock>=this.plan.time?'homerun':'airborne';s.ball=battedBallAt(this.flight,Math.min(this.clock,this.plan.time+.5));s.call=this.clock>=this.plan.time?'homerun':null;s.runners=[];}
  return s;
 }
 get resolution(){if(!this.finished)return null;if(this.plan.homeRun)return{kind:'homerun',detail:'The ball cleared the fence above the wall.'};if(this.plan.airCatch&&(!this.manual||Number.isFinite(this.touchAt)))return{kind:'flyout',detail:'Caught before the bounce. Runners held their bases.'};return super.resolution;}
}
