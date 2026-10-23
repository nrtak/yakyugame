import {approvedFieldPose,APPROVED_FIELD_CAST} from './field-atlas.mjs';
import {CATCHER_CAST,catcherFieldPose} from './opposing-art.mjs';
// Source coordinates are registered to the feet; images are never mirrored.
export const LIVE_FIELD_POSES={
 kenRunA:{asset:'fielder',rect:[0,0,510,1024],anchor:[240,900],glove:[330,665]},
 kenRunB:{asset:'fielder',rect:[512,0,510,1024],anchor:[770,900],glove:[965,490]},
 kenGather:{asset:'fielder',rect:[1024,0,512,1024],anchor:[1275,800],glove:[1280,820]},
 kenLoad:{asset:'fieldThrow',rect:[0,0,520,1024],anchor:[470,920],glove:[320,455],hand:[130,235]},
 kenRelease:{asset:'fieldThrow',rect:[520,0,504,1024],anchor:[930,920],glove:[790,465],hand:[980,405],mask:[[520,0],[1024,0],[1024,1024],[565,1024],[565,800],[520,800]]},
 soraReceive:{asset:'fieldThrow',rect:[1024,0,512,1024],anchor:[1470,705],glove:[1115,370],bagFoot:true},
 miaCatch:{asset:'flyFielder',rect:[0,0,545,1024],anchor:[280,960],glove:[345,100]}
};
export const LIVE_FIELD_SCALE=.14;
export function fieldProject(p){const d=1+.008982*p.y;return{x:768+11.608*p.x/d,y:(870-1.447*p.y)/d};}
export const fieldPoseDefinition=pose=>typeof pose==='string'?LIVE_FIELD_POSES[pose]:pose;
export function poseGround(pose,p){return fieldProject(fieldPoseDefinition(pose)?.bagFoot&&p.bagContact?p.bagContact:p.point);}
export function liveFieldPose(s,p){
 if(CATCHER_CAST[p.id]&&p.id.startsWith(s.teamId+'-')&&p.throws==='R'){
  const receiver=s.players.find(x=>x.id===s.throwToId);
  if(s.throwFromId===p.id&&['transfer','throw'].includes(s.phase))return receiver?.point.x>p.point.x?catcherFieldPose(p.id,p.throws,s.phase==='throw'?'throw':'transfer'):null;
  return s.ballOwnerId===p.id&&s.ball.y<=p.point.y+3?catcherFieldPose(p.id,p.throws,'transfer'):null;
 }
 if(APPROVED_FIELD_CAST[p.id]&&p.id.startsWith(s.teamId+'-')){
  const pose=action=>approvedFieldPose(p.id,p.throws,action),receiver=s.players.find(x=>x.id===s.throwToId);
  if(s.airCatch&&p.id===s.fielderId&&(s.phase==='caught'||s.phase==='complete'||s.clock>=s.catchAt-.35))return pose('catch');
  if(s.throwToId===p.id&&p.bagContact&&['throw','received','complete'].includes(s.phase)){
   const from=s.players.find(x=>x.id===s.throwFromId),receive=pose('receive');
   return receive&&from?.point.x<p.point.x?{...receive,anchor:[350,1235],bagFoot:true}:null;
  }
  if(s.throwFromId===p.id&&['transfer','throw'].includes(s.phase))return receiver?.point.x>p.point.x?pose(s.phase==='transfer'?'transfer':'throw'):null;
  if(p.id===s.fielderId&&s.phase==='gather')return pose('gather');
  if(s.ballOwnerId===p.id)return pose('transfer');
  if(p.moving)return p.motion?.y<0&&Math.abs(p.motion.x)<=-p.motion.y?pose(Math.floor(s.clock*7)%2?'runB':'runA'):null;
  return s.ball.y<=p.point.y+3?pose('ready'):null;
 }
 if(s.teamId!=='navy-stars')return null;
 if(p.id==='navy-stars-mia'&&p.id===s.fielderId&&s.airCatch&&(s.phase==='caught'||s.phase==='complete'||(s.phase==='airborne'&&s.clock>=s.catchAt-.35)))return 'miaCatch';
 if(p.id==='navy-stars-ken'){
  if(p.id===s.fielderId){
   if(s.phase==='transfer')return s.target==='1B'&&s.throwFromId===p.id?'kenLoad':null;
   if(s.phase==='throw')return s.target==='1B'&&s.throwFromId===p.id?'kenRelease':null;
   if(s.phase==='carry')return null;
   if(s.phase==='gather'||s.ballOwnerId===p.id)return 'kenGather';
   if(s.phase==='approach'&&s.ball.y<=p.point.y+2)return Math.floor(s.clock*7)%2?'kenRunB':'kenRunA';
  }
  return null;
 }
 if(p.id==='navy-stars-sora'&&p.covering==='1B'&&p.bagContact&&(!s.throwFromId||s.players.find(x=>x.id===s.throwFromId)?.point.x<p.point.x))return 'soraReceive';
 return null;
}
export function poseLandmark(pose,point,landmark='glove'){
 const p=fieldPoseDefinition(pose),at=p[landmark]??p.glove,scale=p.scale??LIVE_FIELD_SCALE;
 return{x:point.x+(at[0]-p.anchor[0])*scale,y:point.y+(at[1]-p.anchor[1])*scale};
}
export function liveBallPoint(s,poses){
 const ground=fieldProject(s.ball);
 if(s.phase==='airborne'&&s.airCatch&&s.fielderId==='navy-stars-mia'&&poses.get(s.fielderId)==='miaCatch'){
  const q=Math.min(1,s.clock/s.catchAt),offset=poseLandmark('miaCatch',{x:0,y:0});
  return{x:ground.x+offset.x*q**4,y:ground.y-s.ball.z*1.2+(offset.y+(s.catchHeight??6)*1.2)*q**4};
 }
 const incoming=poses.get(s.fielderId);
 if(s.phase==='airborne'&&s.airCatch&&typeof incoming==='object'&&incoming?.action==='catch'){
  const q=Math.min(1,s.clock/s.catchAt),fielder=s.players.find(p=>p.id===s.fielderId),at=poseLandmark(incoming,fieldProject(fielder.point));
  return{x:ground.x+(at.x-ground.x)*q**8,y:ground.y-s.ball.z*1.2+(at.y-ground.y+s.ball.z*1.2)*q**8};
 }
 if(s.possession!=='free'&&s.ballOwnerId&&poses.has(s.ballOwnerId)){
  const p=s.players.find(p=>p.id===s.ballOwnerId),pose=poses.get(p.id);
  return poseLandmark(pose,poseGround(pose,p),s.possession==='throwing-hand'?'hand':'glove');
 }
 if(s.phase==='throw'){
  const q=s.throwProgress,from=s.players.find(p=>p.id===s.throwFromId),to=s.players.find(p=>p.id===s.throwToId);
  const a=poses.has(from?.id)?poseLandmark(poses.get(from.id),poseGround(poses.get(from.id),from),'hand'):fieldProject(from?.point??s.ball);
  const b=poses.has(to?.id)?poseLandmark(poses.get(to.id),poseGround(poses.get(to.id),to)):fieldProject(to?.point??s.ball);
  return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q-Math.sin(Math.PI*q)*38};
 }
 return{x:ground.x,y:ground.y-s.ball.z*1.2};
}
