import {TEAMS} from './rosters.mjs';
import {firstTagContact} from './defense-tags.mjs';

// Feet in a fixed home-to-center coordinate system. Cameras never change sides.
const D=90/Math.sqrt(2);
export const BASE_POINTS={'HOME':{x:0,y:0},'1B':{x:D,y:D},'2B':{x:0,y:2*D},'3B':{x:-D,y:D}};
export const BASE_ORDER=['HOME','1B','2B','3B','HOME'];
export const RUN_THROUGH_SECONDS=1.4;
// Keep the contact clock unchanged, then decelerate through first/home.
// This is visual run-through only: it never awards another base or a force.
export function runThroughMotion(r,time){
 const speed=90/r.arriveAt,duration=Math.min(RUN_THROUGH_SECONDS,32/speed),t=Math.max(0,Math.min(duration,time-r.arriveAt));
 return{duration,distance:speed*(t-t*t/(2*duration)),progress:t/duration,speed:speed*(1-t/duration)};
}
export const DEFENSE_SPOTS={P:{x:0,y:60.5},C:{x:0,y:-6},'1B':{x:64,y:85},'2B':{x:33,y:130},'3B':{x:-64,y:85},SS:{x:-33,y:130},LF:{x:-125,y:220},CF:{x:0,y:270},RF:{x:125,y:220}};
// The receiver's body stays inside the diamond; a separate foot reaches the bag.
export const RECEIVER_OFFSET=4.5,RUNNER_CLEARANCE=3;
export function receivingPoint(base){const b=BASE_POINTS[base],v={'1B':[-1,0],'2B':[0,-1],'3B':[1,0],HOME:[0,1]}[base];return{x:b.x+v[0]*RECEIVER_OFFSET,y:b.y+v[1]*RECEIVER_OFFSET};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,q)=>({x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q});
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const baseIndex=b=>['1B','2B','3B','HOME'].indexOf(b)+1;

export class GroundDefense {
 constructor({teamId='navy-stars',batterId='coral-club-emma',bases=[null,null,null],outs=0,target={x:-40,y:115},ballTravel=1.5,runnerTime=4.45,runnerTimes={},runnerAdvances={},runnerStarts={},throwSetupSeconds=.28,throwSetupById={},tagZoneById={}}={}){
  const team=TEAMS.find(t=>t.id===teamId),offense=TEAMS.find(t=>t.id!==teamId);
  if(!team||!offense||!validPoint(target)||target.y<0||Math.abs(target.x)>target.y||distance(target,BASE_POINTS.HOME)>330)throw Error('Invalid field or fair ground-ball target');
  if(!Number.isInteger(outs)||outs<0||outs>2||bases.length!==3||!Number.isFinite(ballTravel)||ballTravel<=0||!Number.isFinite(runnerTime)||runnerTime<=0)throw Error('Invalid play context');
  if(!Number.isFinite(throwSetupSeconds)||throwSetupSeconds<.05||throwSetupSeconds>2)throw Error('Invalid throw setup duration');
  if(!throwSetupById||typeof throwSetupById!=='object'||Array.isArray(throwSetupById)||Object.entries(throwSetupById).some(([id,t])=>!team.players.some(p=>p.id===id)||!Number.isFinite(t)||t<.05||t>2))throw Error('Invalid player throw setup');
  if(!tagZoneById||typeof tagZoneById!=='object'||Array.isArray(tagZoneById)||Object.entries(tagZoneById).some(([id,z])=>!team.players.some(p=>p.id===id)||!z||!BASE_POINTS[z.base]||!validPoint(z.offset)||Math.hypot(z.offset.x,z.offset.y)>5.5||!Number.isFinite(z.radius)||z.radius<=0||z.radius>1.25||!Number.isFinite(z.windupSeconds)||z.windupSeconds<0||z.windupSeconds>.8||z.secureSeconds!==undefined&&(!Number.isFinite(z.secureSeconds)||z.secureSeconds<0||z.secureSeconds>.5)))throw Error('Invalid player tag zone');
  const ids=[batterId,...bases.filter(Boolean)],allowed=new Set(offense.players.map(p=>p.id));
  if(new Set(ids).size!==ids.length||ids.some(id=>!allowed.has(id)))throw Error('Runner identities must belong to the batting team and be unique');
  if(!runnerTimes||typeof runnerTimes!=='object'||Array.isArray(runnerTimes)||Object.entries(runnerTimes).some(([id,t])=>!bases.includes(id)||!Number.isFinite(t)||t<=0))throw Error('Invalid runner times');
  for(const [id,to] of Object.entries(runnerAdvances))if(!bases.includes(id)||to!==bases.indexOf(id)+2||to>3||bases[to-1])throw Error('Invalid voluntary runner advance');
  for(const [id,q] of Object.entries(runnerStarts))if(!bases.includes(id)||!Number.isFinite(q)||q<0||q>=1)throw Error('Invalid runner lead');
  this.context={runnerAdvances:{...runnerAdvances},runnerStarts:{...runnerStarts},teamId,batterId,bases:[...bases],outs,runnerTime,runnerTimes:{...runnerTimes},throwSetupSeconds,throwSetupById:{...throwSetupById},tagZoneById:structuredClone(tagZoneById)};this.clock=0;this.throw=null;this.throws=[];this.retired=[];this.tagAttempt=null;this.lastTag=null;this.target={...target};this.ballTravel=ballTravel;this.runnerTime=runnerTime;
  this.players=team.players.map(p=>({...p,start:{...DEFENSE_SPOTS[p.position]},destination:{...DEFENSE_SPOTS[p.position]},role:'support',arriveAt:0}));
  this.fielder=this.players.slice().sort((a,b)=>distance(a.start,target)-distance(b.start,target))[0];
  this.fielder.role='field';this.fielder.destination={...target};this.fielder.arriveAt=.16+distance(this.fielder.start,target)/24;
  this.touchAt=Math.max(ballTravel,this.fielder.arriveAt);this.collectAt=this.touchAt+.18;
  this.coverage={};const used=new Set([this.fielder.id]);
  const candidates={'1B':['1B','P','2B'],'3B':['3B','SS','P'],'HOME':['C','P','3B'],'2B':['2B','SS','CF']};
  for(const base of ['1B','3B','HOME','2B']){
   const p=candidates[base].map(pos=>this.players.find(p=>p.position===pos)).find(p=>!used.has(p.id))??this.players.find(p=>!used.has(p.id));
   used.add(p.id);p.role='cover';p.covering=base;p.destination=receivingPoint(base);p.arriveAt=.16+distance(p.start,p.destination)/24;this.coverage[base]=p;
  }
  // Remaining fielders support the lane; nobody converges on the pickup point.
  for(const p of this.players.filter(p=>p.role==='support')){
   if(['LF','CF','RF'].includes(p.position)){p.role='backup';p.destination=target.y<160?{LF:{x:-85,y:110},CF:{x:0,y:160},RF:{x:85,y:110}}[p.position]:{x:p.start.x+(target.x-p.start.x)*.25,y:p.start.y+(target.y-p.start.y)*.25};p.arriveAt=.16+distance(p.start,p.destination)/24;}
  }
  this.forces={'1B':batterId};let chain=true;
  for(let i=0;i<3;i++){chain=chain&&Boolean(bases[i]);if(chain)this.forces[BASE_ORDER[i+2]]=bases[i];}
  this.runners=[{id:batterId,from:0,to:1,arriveAt:runnerTime}];
  bases.forEach((id,i)=>{if(id)this.runners.push({id,from:i+1,to:this.forces[BASE_ORDER[i+2]]===id||runnerAdvances[id]===i+2?i+2:i+1,arriveAt:this.forces[BASE_ORDER[i+2]]===id||runnerAdvances[id]===i+2?(runnerTimes[id]??Math.max(.4,runnerTime-.55)):0});});
 }
 runnerPoint(r,time=this.clock){
  const retired=this.retired.find(x=>x.id===r.id),at=retired?Math.min(time,retired.at):time;
  const point=mix(BASE_POINTS[BASE_ORDER[r.from]],BASE_POINTS[BASE_ORDER[r.to]],r.to===r.from?0:(this.context.runnerStarts[r.id]??0)+(1-(this.context.runnerStarts[r.id]??0))*clamp(at/r.arriveAt));
  // Running through first does not award another base or change force timing.
  if(!retired&&(r.from===0&&r.to===1||r.to===4)&&at>r.arriveAt){const a=BASE_POINTS[BASE_ORDER[r.from]],b=BASE_POINTS[BASE_ORDER[r.to]],beyond=runThroughMotion(r,at).distance;point.x+=(b.x-a.x)/90*beyond;point.y+=(b.y-a.y)/90*beyond;}
  return point;
 }
 enableManualFielding(target=this.target){
  if(this.clock!==0||this.throw)throw Error('Manual control must begin with the play');
  this.manual={id:this.fielder.id,point:{...this.fielder.start},input:{x:0,y:0},motion:{x:0,y:0},moving:false,startedAt:0,stoppedAt:0,target:{...target},deadline:Math.max(12,this.ballTravel+8)};
  this.touchAt=Infinity;this.collectAt=Infinity;return this;
 }
 setFielderInput(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(!this.manual||this.clock>=this.touchAt||this.finished)return false;
  const length=Math.max(1,Math.hypot(x,y));this.manual.input={x:x/length,y:y/length};return true;
 }
 fieldBallAt(time){const q=clamp(time/this.ballTravel);return{...mix(BASE_POINTS.HOME,this.target,q),z:Math.abs(Math.sin(q*Math.PI*4))*.6*(1-q)};}
 performFieldAction(){
  const m=this.manual;if(!m||this.clock>=this.touchAt||this.finished||m.action&&this.clock<m.action.recoverUntil)return false;
  let x=m.input.x,y=m.input.y;if(Math.hypot(x,y)<.1){x=m.target.x-m.point.x;y=m.target.y-m.point.y;}const length=Math.hypot(x,y);if(length<.01)return false;
  m.action={kind:this.flight&&!this.flight.ground&&this.clock<this.flight.landingTime?'dive':'slide',startedAt:this.clock,recoverUntil:this.clock+1.05,direction:{x:x/length,y:y/length}};return true;
 }
 manualTouch(time,ball){this.touchAt=time;this.collectAt=time+.18;this.target={x:ball.x,y:ball.y};this.manual.input={x:0,y:0};this.manual.moving=false;this.manual.stoppedAt=time;}
 advanceManual(dt){
  if(!this.manual||this.clock>=this.touchAt)return;
  const m=this.manual,from={...m.point},at=this.clock+dt,action=m.action&&this.clock<m.action.recoverUntil?m.action:null;
  const burst=action?Math.max(0,Math.min(at,action.startedAt+.32)-Math.max(this.clock,action.startedAt)):0;
  m.point.x+=action?action.direction.x*38*burst:m.input.x*24*dt;m.point.y+=action?action.direction.y*38*burst:m.input.y*24*dt;
  // Stay in the playable field, including foul territory behind home.
  m.point.y=Math.max(-12,Math.min(330,m.point.y));const radius=Math.hypot(m.point.x,m.point.y);if(radius>330){m.point.x*=330/radius;m.point.y*=330/radius;}
  const motion={x:m.point.x-from.x,y:m.point.y-from.y},moving=Math.hypot(motion.x,motion.y)>1e-6;
  if(moving){if(!m.moving)m.startedAt=this.clock;m.motion=motion;}else if(m.moving)m.stoppedAt=at;m.moving=moving;
  const ball=this.fieldBallAt(at),reach=action&&at<action.startedAt+.55?8:5.5;
  if(at>=.16&&ball.z<=(action?(action.kind==='dive'?4:1.5):8)&&distance(m.point,ball)<=reach)this.manualTouch(at,ball);
 }
 playerPoint(p,time=this.clock){
  // Coverage paths end to the side of the bag, never on the runner's target.
  // Interpolation remains continuous and uses the same arrival time as the call.
  if(p.carry&&time>=p.carry.startAt)return mix(p.carry.from,p.carry.to,clamp((time-p.carry.startAt)/Math.max(.001,p.carry.endAt-p.carry.startAt)));
  if(this.manual?.id===p.id)return{...this.manual.point};
  return mix(p.start,p.destination,clamp((time-.16)/Math.max(.001,p.arriveAt-.16)));
 }
 get activeForces(){
  const dead=new Set(this.retired.map(r=>r.id)),forces={};
  for(const [base,id]of Object.entries(this.forces)){
   const runner=this.runners.find(r=>r.id===id),behind=runner.from===0?[]:[this.context.batterId,...this.context.bases.slice(0,runner.from-1).filter(Boolean)];
   if(!dead.has(id)&&behind.every(id=>!dead.has(id)))forces[base]=id;
  }return forces;
 }
 get canThrow(){return !this.finished&&this.context.outs+this.retired.length<3&&(!this.manual?.action||this.clock>=this.manual.action.recoverUntil)&&(this.manual&&!this.throw||this.runners.some(r=>r.arriveAt>this.clock&&!this.retired.some(x=>x.id===r.id)))&&this.clock>=(this.throw?this.throw.controlAt+.08:this.collectAt)&&(!this.lastTag||this.clock>=this.lastTag.at+.18);}
 get tagOptions(){
  if(this.finished||this.context.outs+this.retired.length>=3||this.tagAttempt||this.clock<(this.throw?this.throw.controlAt:this.collectAt))return[];
  const holder=this.throw?this.players.find(p=>p.id===this.throw.receiverId):this.fielder,point=this.playerPoint(holder);
  return this.runners.filter(r=>r.from>0&&r.to!==r.from&&this.clock<r.arriveAt-1e-8&&!this.retired.some(x=>x.id===r.id)&&this.activeForces[BASE_ORDER[r.to]]!==r.id&&distance(point,BASE_POINTS[BASE_ORDER[r.to]])<=8).map(r=>({id:r.id,base:BASE_ORDER[r.to],holderId:holder.id}));
 }
 tagRunner(id){const target=this.tagOptions.find(t=>!id||t.id===id);if(!target)return false;const z=this.context.tagZoneById[target.holderId],zone=z?.base===target.base?structuredClone(z):null,controlAt=this.throw?this.throw.controlAt:this.collectAt;this.lastTagMiss=null;this.tagAttempt={...target,armedAt:this.clock,motionStartedAt:zone?Math.max(this.clock,controlAt+(zone.secureSeconds??.18)):this.clock,controlAt,zone};return true;}
 predictThrow(base,at=this.clock){
  const receiver=this.coverage[base];if(!receiver)throw Error('Unknown throw target');
  const holder=this.throw?this.players.find(p=>p.id===this.throw.receiverId):this.fielder;
  const setupSeconds=this.context.throwSetupById[holder.id]??this.context.throwSetupSeconds,releaseAt=at+setupSeconds,start=this.playerPoint(holder,at),speed=125;let flight=.4,end;
  for(let i=0;i<6;i++){end=this.playerPoint(receiver,releaseAt+flight);flight=Math.max(.18,distance(start,end)/speed);}
  const catchAt=releaseAt+flight,controlAt=Math.max(catchAt,receiver.arriveAt),runner=this.runners.find(r=>r.id===this.activeForces[base]);
  const carryEnd=receivingPoint(base),carryTime=distance(start,carryEnd)/24+.08;
  if(distance(start,BASE_POINTS[base])<16&&at+carryTime<controlAt){const atBag=at+carryTime,out=Boolean(runner&&atBag<runner.arriveAt-1e-8);return {base,carry:true,holderId:holder.id,receiverId:holder.id,releaseAt:at,catchAt:atBag,controlAt:atBag,flight:carryTime,start,end:carryEnd,out,runnerId:runner?.id??null,callAt:runner?(out?atBag:runner.arriveAt):atBag,settled:false};}
  const out=Boolean(runner&&controlAt<runner.arriveAt-1e-8);
  return {base,holderId:holder.id,receiverId:receiver.id,startedAt:at,setupSeconds,releaseAt,catchAt,controlAt,flight,start,end,out,runnerId:runner?.id??null,callAt:runner?(out?controlAt:runner.arriveAt):catchAt,settled:false};
 }
 throwTo(base){if(!BASE_POINTS[base]||!this.canThrow)return false;const next=this.predictThrow(base);if(next.holderId===next.receiverId&&!next.carry)return false;
  const tagRunner=this.runners.find(r=>r.to!==r.from&&BASE_ORDER[r.to]===base&&r.arriveAt>this.clock&&!this.retired.some(x=>x.id===r.id)&&this.activeForces[base]!==r.id);next.tagRunnerId=tagRunner?.id??null;if(tagRunner)next.callAt=tagRunner.arriveAt;
  if(next.carry){const holder=this.players.find(p=>p.id===next.holderId),old=this.coverage[base];if(old.id!==holder.id){const from=this.playerPoint(old);old.carry={from,to:old.start,startAt:this.clock,endAt:this.clock+distance(from,old.start)/24};old.role='support';old.covering=null;}holder.carry={from:next.start,to:next.end,startAt:this.clock,endAt:next.controlAt};holder.covering=base;this.coverage[base]=holder;}
  this.tagAttempt=null;this.lastTag=null;this.lastTagMiss=null;this.throw=next;this.throws.push(next);return true;}
 get recommendation(){
  if(!this.canThrow)return null;
  const options=Object.keys(this.activeForces).map(base=>({...this.predictThrow(base),base})).filter(t=>t.out&&(t.carry||t.holderId!==t.receiverId));
  const force=options.sort((a,b)=>baseIndex(b.base)-baseIndex(a.base))[0]?.base;if(force)return force;
  if(this.tagAttempt||this.throw?.tagRunnerId&&this.clock>=this.throw.controlAt&&this.runners.some(r=>r.id===this.throw.tagRunnerId&&this.clock<r.arriveAt))return null;
  const tagBases=this.runners.filter(r=>r.from>0&&r.to!==r.from&&r.arriveAt>this.clock&&!this.retired.some(x=>x.id===r.id)&&this.activeForces[BASE_ORDER[r.to]]!==r.id).map(r=>({base:BASE_ORDER[r.to],arriveAt:r.arriveAt,prediction:this.predictThrow(BASE_ORDER[r.to])})).filter(t=>t.prediction.holderId!==t.prediction.receiverId&&t.prediction.controlAt<t.arriveAt);
  return tagBases.sort((a,b)=>b.arriveAt-a.arriveAt)[0]?.base??'1B';
 }
 get finishAt(){
  if(this.manual&&!Number.isFinite(this.collectAt))return this.manual.deadline;
  if(this.context.outs+this.retired.length>=3){const last=this.retired.at(-1);return last.at+(last.force?.35:.45);}
  const dead=new Set(this.retired.map(r=>r.id)),runnersAt=Math.max(0,...this.runners.filter(r=>!dead.has(r.id)).map(r=>r.arriveAt+(r.from===0||r.to===4?runThroughMotion(r,r.arriveAt).duration:0)));
  const tagHold=Math.max(this.lastTag?this.lastTag.at+.45:0,this.lastTagMiss?Math.max(this.lastTagMiss.at,this.lastTagMiss.readyAt)+.4:0);
  return this.throw?Math.max(runnersAt,this.throw.catchAt+.4,this.throw.controlAt+.25,tagHold):Math.max(runnersAt,this.collectAt+(this.manual?3:.4),tagHold);
 }
 get finished(){return this.clock>=this.finishAt;}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid elapsed time');if(this.manual&&dt>.05){while(dt>1e-9&&!this.finished){const step=Math.min(.05,dt);this.step(step);dt-=step;}return this.state;}const before=this.clock;this.advanceManual(Math.min(dt,Math.max(0,this.finishAt-this.clock)));this.clock=Math.min(this.clock+dt,this.finishAt);
  const th=this.throw;if(th&&!th.settled&&this.clock>=th.controlAt){th.settled=true;if(th.out&&this.activeForces[th.base]===th.runnerId&&this.context.outs+this.retired.length<3)this.retired.push({id:th.runnerId,base:th.base,force:true,at:th.controlAt});}
  const attempt=this.tagAttempt;if(attempt&&this.context.outs+this.retired.length<3){const runner=this.runners.find(r=>r.id===attempt.id),holder=this.players.find(p=>p.id===attempt.holderId);
   if(!runner||this.retired.some(r=>r.id===attempt.id)||this.activeForces[attempt.base]===attempt.id)this.tagAttempt=null;
   else{const at=firstTagContact({from:Math.max(before,attempt.motionStartedAt+(attempt.zone?.windupSeconds??0)),to:this.clock,arriveAt:runner.arriveAt,holderPoint:t=>{const p=this.playerPoint(holder,t);return attempt.zone?{x:p.x+attempt.zone.offset.x,y:p.y+attempt.zone.offset.y}:p;},runnerPoint:t=>this.runnerPoint(runner,t),startPoint:BASE_POINTS[BASE_ORDER[runner.from]],...(attempt.zone?{reach:attempt.zone.radius}:{})});
    if(at!==null){const tag={holderId:holder.id,controlAt:attempt.controlAt,holderPoint:this.playerPoint(holder,at),runnerPoint:this.runnerPoint(runner,at),motionStartedAt:attempt.motionStartedAt,base:attempt.base,zone:attempt.zone?structuredClone(attempt.zone):null};this.retired.push({id:runner.id,base:attempt.base,force:false,at,tag});this.lastTag={...tag,id:runner.id,at};this.tagAttempt=null;}
    else if(this.clock>=runner.arriveAt){if(attempt.zone)this.lastTagMiss={holderId:holder.id,runnerId:runner.id,base:attempt.base,armedAt:attempt.armedAt,startedAt:attempt.motionStartedAt,readyAt:attempt.motionStartedAt+attempt.zone.windupSeconds,at:runner.arriveAt,zone:structuredClone(attempt.zone)};this.tagAttempt=null;}
   }
  }
  this.clock=Math.min(this.clock,this.finishAt);return this.state;}
 get state(){
  const t=this.clock,th=this.throw,received=Boolean(th&&t>=th.catchAt),called=Boolean(th&&t>=th.callAt);
  let phase=t<this.collectAt?'approach':'secured',possession=t<this.collectAt?'free':'fielding-glove',owner=t<this.collectAt?null:this.fielder.id,ball;
  if(t<this.collectAt){ball=this.fieldBallAt(t);}
  else ball={...this.playerPoint(this.fielder),z:3};
  if(t>=this.touchAt&&t<this.collectAt){phase='gather';possession='fielding-glove';owner=this.fielder.id;ball={...this.target,z:3*clamp((t-this.touchAt)/.18)};}
  if(th){
   if(th.carry&&t<th.controlAt){phase='carry';possession='fielding-glove';owner=th.holderId;ball={...this.playerPoint(this.players.find(p=>p.id===owner)),z:3};}
   else if(t<th.releaseAt){phase='transfer';possession='throwing-hand';owner=th.holderId;ball={...th.start,z:3+2*clamp((t-(th.startedAt??th.releaseAt-.28))/(th.setupSeconds??.28))};}
   else if(!received){phase='throw';possession='free';owner=null;const q=clamp((t-th.releaseAt)/th.flight);ball={...mix(th.start,th.end,q),z:5-q+Math.sin(q*Math.PI)*5};}
   else{phase=this.canThrow?'secured':'received';possession='receiving-glove';owner=th.receiverId;ball={...this.playerPoint(this.players.find(p=>p.id===th.receiverId)),z:4};}
  }
  const tagVisible=this.lastTag&&t<this.lastTag.at+.45;if(this.tagAttempt){phase='tag-ready';}if(tagVisible){phase='tag';possession='fielding-glove';owner=this.lastTag.holderId;ball={...this.lastTag.runnerPoint,z:3};}
  if(this.finished)phase='complete';
  const options=this.canThrow?Object.keys(BASE_POINTS).filter(b=>b!=='HOME'||this.coverage.HOME).map(base=>{const p=this.predictThrow(base),r=this.runners.find(r=>r.id===this.activeForces[base]),tagRequired=!r&&this.runners.some(r=>r.from>0&&r.to!==r.from&&BASE_ORDER[r.to]===base&&r.arriveAt>t&&!this.retired.some(x=>x.id===r.id));return{base,receiverId:p.receiverId,force:Boolean(r),tagRequired,margin:r?r.arriveAt-p.controlAt:null,out:p.out};}):[];
  return {teamId:this.context.teamId,clock:t,phase,ball,possession,ballOwnerId:owner,fielderId:this.fielder.id,canFieldAction:!!this.manual&&t<this.touchAt&&!this.finished&&(!this.manual.action||t>=this.manual.action.recoverUntil),fieldActionLabel:this.flight&&!this.flight.ground&&t<this.flight.landingTime?'DIVE':'SLIDE',manualFielding:!!this.manual,activeFielderId:this.manual?.id??null,moveEnabled:!!this.manual&&!this.finished&&t<this.touchAt,fieldingTarget:this.manual?{...this.manual.target}:null,canThrow:this.canThrow,canTag:this.tagOptions.length>0,tagOptions:this.tagOptions,tagPending:Boolean(this.tagAttempt),tagPoint:tagVisible?{...this.lastTag.runnerPoint}:null,callKind:this.lastTag?'tag':null,recommendation:this.recommendation,throwOptions:options,throwFromId:th?.holderId??null,throwToId:th?.receiverId??null,throwProgress:th?clamp((t-th.releaseAt)/th.flight):0,target:th?.base??null,call:this.lastTag?'out':called?(th.out?'out':th.runnerId||th.tagRunnerId?'safe':'no-force'):null,playOuts:this.retired.length,playType:this.retired.length===3?'tripleplay':this.retired.length===2?'doubleplay':null,
   throwStart:th?{...th.start}:null,throwEnd:th?{...th.end}:null,throwReleaseAt:th?.releaseAt??null,throwCatchAt:th?.catchAt??null,throwControlAt:th?.controlAt??null,
   previousThrow:this.throws.length>1?(()=>{const t=this.throws.at(-2);return{base:t.base,receiverId:t.receiverId,holderId:t.holderId,start:{...t.start},end:{...t.end},bag:{...BASE_POINTS[t.base]},forceRunnerId:t.runnerId??null,out:t.out,catchAt:t.catchAt,controlAt:t.controlAt};})():null,
   tagMotion:this.tagAttempt?{holderId:this.tagAttempt.holderId,runnerId:this.tagAttempt.id,base:this.tagAttempt.base,armedAt:this.tagAttempt.armedAt,startedAt:this.tagAttempt.motionStartedAt,readyAt:this.tagAttempt.motionStartedAt+(this.tagAttempt.zone?.windupSeconds??0),contactAt:null,outcome:null,zone:this.tagAttempt.zone?structuredClone(this.tagAttempt.zone):null}:tagVisible?{holderId:this.lastTag.holderId,runnerId:this.lastTag.id,base:this.lastTag.base,armedAt:this.lastTag.motionStartedAt,startedAt:this.lastTag.motionStartedAt,readyAt:this.lastTag.motionStartedAt+(this.lastTag.zone?.windupSeconds??0),contactAt:this.lastTag.at,outcome:'out',zone:this.lastTag.zone?structuredClone(this.lastTag.zone):null}:this.lastTagMiss&&t<Math.max(this.lastTagMiss.at,this.lastTagMiss.readyAt)+.4?{...structuredClone(this.lastTagMiss),contactAt:null,outcome:'safe',missAt:this.lastTagMiss.at}:null,
   throwForceRunnerId:th?.runnerId??null,
   fieldingOrigin:{...BASE_POINTS.HOME},fieldingTouchAt:this.touchAt,fieldingCollectAt:this.collectAt,transferStartAt:th&&!th.carry?(th.startedAt??th.releaseAt-.28):null,transferEndAt:th&&!th.carry?th.releaseAt:null,
   players:this.players.map(p=>{const carry=p.carry&&t>=p.carry.startAt,manual=this.manual?.id===p.id&&!carry,from=carry?p.carry.from:p.start,to=carry?p.carry.to:p.destination,end=carry?p.carry.endAt:p.arriveAt;return{id:p.id,name:p.name,position:p.position,throws:p.throws,gloveHand:p.gloveHand,role:p.role,covering:p.covering??null,point:this.playerPoint(p),tagging:this.tagAttempt?.holderId===p.id||Boolean(tagVisible&&this.lastTag.holderId===p.id),controlled:manual,fieldAction:manual&&this.manual.action&&t<this.manual.action.recoverUntil?{...this.manual.action,progress:clamp((t-this.manual.action.startedAt)/1.05)}:null,moving:manual?this.manual.moving&&t<this.touchAt:t>(carry?p.carry.startAt:.16)&&t<end,motionStartAt:manual?this.manual.startedAt:carry?p.carry.startAt:.16,motionEndAt:manual?(this.manual.moving?Infinity:this.manual.stoppedAt):end,motion:manual?{...this.manual.motion}:{x:to.x-from.x,y:to.y-from.y},bagContact:p.covering&&t>=end?{...BASE_POINTS[p.covering]}:null};}),
   runners:this.runners.map(r=>({...r,point:this.runnerPoint(r),out:this.retired.some(x=>x.id===r.id),taggedAt:this.retired.find(x=>x.id===r.id&&!x.force)?.at??null})),finished:this.finished};
 }
 get resolution(){
  if(!this.finished)return null;
  const retired=structuredClone(this.retired),outIds=new Set(retired.map(r=>r.id)),third=this.context.outs+retired.length>=3?retired.at(-1):null,cancelRuns=third&&(third.force||third.id===this.context.batterId);
  const survivors=this.runners.filter(r=>!outIds.has(r.id)),runs=cancelRuns?[]:survivors.filter(r=>r.to===4&&(!third||r.arriveAt<third.at-1e-8)).map(r=>r.id);
  return {kind:'defensiveplay',context:structuredClone(this.context),retired,destinations:survivors.filter(r=>r.to<4).map(r=>({id:r.id,base:r.to})),runs,
   recordAs:retired.length?(outIds.has(this.context.batterId)?'groundout':'fielderschoice'):'single',detail:this.throw?`${this.throws.map(t=>t.base).join(' → ')}. ${retired.length===3?'Triple play.':retired.length===2?(retired.some(r=>!r.force)?'Double play · Tag out.':'Double play.'):retired.length===1?(retired[0].force?'Force out.':'Tag out.'):this.throw.runnerId||this.throw.tagRunnerId?'Runner reaches safely.':'No force at that base; a tag would be required.'}`:this.manual&&!Number.isFinite(this.collectAt)?'Ball not secured. Runners reach safely.':'Runners reach safely while the ball is held.'};
 }
}
