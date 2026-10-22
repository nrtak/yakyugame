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
 get canThrow(){if(this.plan?.airCatch||this.plan?.homeRun)return false;return super.canThrow;}
 get finishAt(){if(this.plan?.airCatch||this.plan?.homeRun)return this.plan.time+1;return super.finishAt;}
 get state(){
  const s=super.state;if(!this.plan)return s;
  s.flightType=this.flight.ground?'Ground ball':this.flight.angle<25?'Line drive':'Fly ball';s.launchAngle=this.flight.angle;s.airCatch=Boolean(this.plan.airCatch);s.catchAt=this.plan.time;s.catchHeight=this.plan.point.z;
  if(this.clock<this.plan.time){s.ball=battedBallAt(this.flight,this.clock);s.phase=this.flight.ground?'approach':'airborne';s.possession='free';s.ballOwnerId=null;}
  if(this.plan.airCatch){
   s.runners=s.runners.map(r=>r.id===this.context.batterId?{...r,out:this.clock>=this.plan.time}:this.context.outs<2?{...r,point:{...BASE_POINTS[['HOME','1B','2B','3B'][r.from]]}}:r);
   if(this.clock>=this.plan.time){s.ball={...this.plan.point,z:6};s.ballOwnerId=this.fielder.id;s.possession='fielding-glove';s.phase=this.finished?'complete':'caught';s.playOuts=1;s.call='out';}
  }
  if(this.plan.homeRun){s.phase=this.finished?'complete':this.clock>=this.plan.time?'homerun':'airborne';s.ball=battedBallAt(this.flight,Math.min(this.clock,this.plan.time+.5));s.call=this.clock>=this.plan.time?'homerun':null;s.runners=[];}
  return s;
 }
 get resolution(){if(!this.finished)return null;if(this.plan.homeRun)return{kind:'homerun',detail:'The ball cleared the fence above the wall.'};if(this.plan.airCatch)return{kind:'flyout',detail:'Caught before the bounce. Runners held their bases.'};return super.resolution;}
}
