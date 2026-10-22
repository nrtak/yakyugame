import {TEAMS} from './rosters.mjs';

// Feet in a fixed home-to-center coordinate system. Cameras never change sides.
const D=90/Math.sqrt(2);
export const BASE_POINTS={'HOME':{x:0,y:0},'1B':{x:D,y:D},'2B':{x:0,y:2*D},'3B':{x:-D,y:D}};
export const BASE_ORDER=['HOME','1B','2B','3B','HOME'];
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
 constructor({teamId='navy-stars',batterId='coral-club-emma',bases=[null,null,null],outs=0,target={x:-40,y:115},ballTravel=1.5,runnerTime=4.45}={}){
  const team=TEAMS.find(t=>t.id===teamId),offense=TEAMS.find(t=>t.id!==teamId);
  if(!team||!offense||!validPoint(target)||target.y<0||Math.abs(target.x)>target.y||distance(target,BASE_POINTS.HOME)>330)throw Error('Invalid field or fair ground-ball target');
  if(!Number.isInteger(outs)||outs<0||outs>2||bases.length!==3||!Number.isFinite(ballTravel)||ballTravel<=0||!Number.isFinite(runnerTime)||runnerTime<=0)throw Error('Invalid play context');
  const ids=[batterId,...bases.filter(Boolean)],allowed=new Set(offense.players.map(p=>p.id));
  if(new Set(ids).size!==ids.length||ids.some(id=>!allowed.has(id)))throw Error('Runner identities must belong to the batting team and be unique');
  this.context={teamId,batterId,bases:[...bases],outs};this.clock=0;this.throw=null;this.throws=[];this.retired=[];this.target={...target};this.ballTravel=ballTravel;this.runnerTime=runnerTime;
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
  bases.forEach((id,i)=>{if(id)this.runners.push({id,from:i+1,to:this.forces[BASE_ORDER[i+2]]===id?i+2:i+1,arriveAt:this.forces[BASE_ORDER[i+2]]===id?Math.max(.4,runnerTime-.55):0});});
 }
 runnerPoint(r,time=this.clock){
  const retired=this.retired.find(x=>x.id===r.id),at=retired?Math.min(time,retired.at):time;
  const point=mix(BASE_POINTS[BASE_ORDER[r.from]],BASE_POINTS[BASE_ORDER[r.to]],r.to===r.from?0:clamp(at/r.arriveAt));
  // Running through first does not award another base or change force timing.
  if(!retired&&r.from===0&&r.to===1&&at>r.arriveAt){const beyond=Math.min(16,(at-r.arriveAt)*24)/Math.sqrt(2);point.x+=beyond;point.y+=beyond;}
  return point;
 }
 playerPoint(p,time=this.clock){
  // Coverage paths end to the side of the bag, never on the runner's target.
  // Interpolation remains continuous and uses the same arrival time as the call.
  return p.carry&&time>=p.carry.startAt?mix(p.carry.from,p.carry.to,clamp((time-p.carry.startAt)/Math.max(.001,p.carry.endAt-p.carry.startAt))):mix(p.start,p.destination,clamp((time-.16)/Math.max(.001,p.arriveAt-.16)));
 }
 get activeForces(){
  const dead=new Set(this.retired.map(r=>r.id)),forces={};
  for(const [base,id]of Object.entries(this.forces)){
   const runner=this.runners.find(r=>r.id===id),behind=runner.from===0?[]:[this.context.batterId,...this.context.bases.slice(0,runner.from-1).filter(Boolean)];
   if(!dead.has(id)&&behind.every(id=>!dead.has(id)))forces[base]=id;
  }return forces;
 }
 get canThrow(){return !this.finished&&this.context.outs+this.retired.length<3&&this.runners.some(r=>r.arriveAt>this.clock&&!this.retired.some(x=>x.id===r.id))&&this.clock>=(this.throw?this.throw.controlAt+.08:this.collectAt);}
 predictThrow(base,at=this.clock){
  const receiver=this.coverage[base];if(!receiver)throw Error('Unknown throw target');
  const holder=this.throw?this.players.find(p=>p.id===this.throw.receiverId):this.fielder;
  const releaseAt=at+.28,start=this.playerPoint(holder,at),speed=125;let flight=.4,end;
  for(let i=0;i<6;i++){end=this.playerPoint(receiver,releaseAt+flight);flight=Math.max(.18,distance(start,end)/speed);}
  const catchAt=releaseAt+flight,controlAt=Math.max(catchAt,receiver.arriveAt),runner=this.runners.find(r=>r.id===this.activeForces[base]);
  const carryEnd=receivingPoint(base),carryTime=distance(start,carryEnd)/24+.08;
  if(distance(start,BASE_POINTS[base])<16&&at+carryTime<controlAt){const atBag=at+carryTime,out=Boolean(runner&&atBag<runner.arriveAt-1e-8);return {base,carry:true,holderId:holder.id,receiverId:holder.id,releaseAt:at,catchAt:atBag,controlAt:atBag,flight:carryTime,start,end:carryEnd,out,runnerId:runner?.id??null,callAt:runner?(out?atBag:runner.arriveAt):atBag,settled:false};}
  const out=Boolean(runner&&controlAt<runner.arriveAt-1e-8);
  return {base,holderId:holder.id,receiverId:receiver.id,releaseAt,catchAt,controlAt,flight,start,end,out,runnerId:runner?.id??null,callAt:runner?(out?controlAt:runner.arriveAt):catchAt,settled:false};
 }
 throwTo(base){if(!BASE_POINTS[base]||!this.canThrow)return false;const next=this.predictThrow(base);if(next.holderId===next.receiverId&&!next.carry)return false;
  if(next.carry){const holder=this.players.find(p=>p.id===next.holderId),old=this.coverage[base];if(old.id!==holder.id){const from=this.playerPoint(old);old.carry={from,to:old.start,startAt:this.clock,endAt:this.clock+distance(from,old.start)/24};old.role='support';old.covering=null;}holder.carry={from:next.start,to:next.end,startAt:this.clock,endAt:next.controlAt};holder.covering=base;this.coverage[base]=holder;}
  this.throw=next;this.throws.push(next);return true;}
 get recommendation(){
  if(!this.canThrow)return null;
  const options=Object.keys(this.activeForces).map(base=>({...this.predictThrow(base),base})).filter(t=>t.out&&(t.carry||t.holderId!==t.receiverId));
  return options.sort((a,b)=>baseIndex(b.base)-baseIndex(a.base))[0]?.base??'1B';
 }
 get finishAt(){
  if(this.context.outs+this.retired.length>=3)return this.throw.controlAt+.35;
  const dead=new Set(this.retired.map(r=>r.id)),runnersAt=Math.max(0,...this.runners.filter(r=>!dead.has(r.id)).map(r=>r.arriveAt+(r.from===0?.7:0)));
  return this.throw?Math.max(runnersAt,this.throw.catchAt+.4,this.throw.controlAt+.25):Math.max(runnersAt,this.collectAt+.4);
 }
 get finished(){return this.clock>=this.finishAt;}
 step(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid elapsed time');this.clock=Math.min(this.clock+dt,this.finishAt);
  const th=this.throw;if(th&&!th.settled&&this.clock>=th.controlAt){th.settled=true;if(th.out&&this.activeForces[th.base]===th.runnerId&&this.context.outs+this.retired.length<3)this.retired.push({id:th.runnerId,base:th.base,force:true,at:th.controlAt});}
  this.clock=Math.min(this.clock,this.finishAt);return this.state;}
 get state(){
  const t=this.clock,th=this.throw,received=Boolean(th&&t>=th.catchAt),called=Boolean(th&&t>=th.callAt);
  let phase=t<this.collectAt?'approach':'secured',possession=t<this.collectAt?'free':'fielding-glove',owner=t<this.collectAt?null:this.fielder.id,ball;
  if(t<this.collectAt){const q=clamp(t/this.ballTravel);ball={...mix(BASE_POINTS.HOME,this.target,q),z:Math.abs(Math.sin(q*Math.PI*4))*.6*(1-q)};}
  else ball={...this.playerPoint(this.fielder),z:3};
  if(t>=this.touchAt&&t<this.collectAt){phase='gather';possession='fielding-glove';owner=this.fielder.id;ball={...this.target,z:3*clamp((t-this.touchAt)/.18)};}
  if(th){
   if(th.carry&&t<th.controlAt){phase='carry';possession='fielding-glove';owner=th.holderId;ball={...this.playerPoint(this.players.find(p=>p.id===owner)),z:3};}
   else if(t<th.releaseAt){phase='transfer';possession='throwing-hand';owner=th.holderId;ball={...th.start,z:3+2*clamp((t-(th.releaseAt-.28))/.28)};}
   else if(!received){phase='throw';possession='free';owner=null;const q=clamp((t-th.releaseAt)/th.flight);ball={...mix(th.start,th.end,q),z:5-q+Math.sin(q*Math.PI)*5};}
   else{phase=this.canThrow?'secured':'received';possession='receiving-glove';owner=th.receiverId;ball={...this.playerPoint(this.players.find(p=>p.id===th.receiverId)),z:4};}
  }
  if(this.finished)phase='complete';
  const options=this.canThrow?Object.keys(BASE_POINTS).filter(b=>b!=='HOME'||this.coverage.HOME).map(base=>{const p=this.predictThrow(base),r=this.runners.find(r=>r.id===this.activeForces[base]);return{base,receiverId:p.receiverId,force:Boolean(r),margin:r?r.arriveAt-p.controlAt:null,out:p.out};}):[];
  return {teamId:this.context.teamId,clock:t,phase,ball,possession,ballOwnerId:owner,fielderId:this.fielder.id,canThrow:this.canThrow,recommendation:this.recommendation,throwOptions:options,throwFromId:th?.holderId??null,throwToId:th?.receiverId??null,throwProgress:th?clamp((t-th.releaseAt)/th.flight):0,target:th?.base??null,call:called?(th.out?'out':th.runnerId?'safe':'no-force'):null,playOuts:this.retired.length,playType:this.retired.length===3?'tripleplay':this.retired.length===2?'doubleplay':null,
   players:this.players.map(p=>{const carry=p.carry&&t>=p.carry.startAt,from=carry?p.carry.from:p.start,to=carry?p.carry.to:p.destination,end=carry?p.carry.endAt:p.arriveAt;return{id:p.id,name:p.name,position:p.position,throws:p.throws,gloveHand:p.gloveHand,role:p.role,covering:p.covering??null,point:this.playerPoint(p),moving:t>(carry?p.carry.startAt:.16)&&t<end,motion:{x:to.x-from.x,y:to.y-from.y},bagContact:p.covering&&t>=end?{...BASE_POINTS[p.covering]}:null};}),
   runners:this.runners.map(r=>({...r,point:this.runnerPoint(r),out:this.retired.some(x=>x.id===r.id)})),finished:this.finished};
 }
 get resolution(){
  if(!this.finished)return null;
  const retired=this.retired.map(({id,base,force})=>({id,base,force})),outIds=new Set(retired.map(r=>r.id)),thirdForce=this.context.outs+retired.length>=3;
  const survivors=this.runners.filter(r=>!outIds.has(r.id)),runs=thirdForce?[]:survivors.filter(r=>r.to===4).map(r=>r.id);
  return {kind:'defensiveplay',context:structuredClone(this.context),retired,destinations:survivors.filter(r=>r.to<4).map(r=>({id:r.id,base:r.to})),runs,
   recordAs:retired.length?(outIds.has(this.context.batterId)?'groundout':'fielderschoice'):'single',detail:this.throw?`${this.throws.map(t=>t.base).join(' → ')}. ${retired.length===3?'Triple play.':retired.length===2?'Double play.':retired.length===1?'Force out.':this.throw.runnerId?'Runner reaches safely.':'No force at that base; a tag would be required.'}`:'Runners reach safely while the ball is held.'};
 }
}
