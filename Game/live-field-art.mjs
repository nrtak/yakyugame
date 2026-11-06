import {approvedFieldPose,APPROVED_FIELD_CAST} from './field-atlas.mjs';
import {CATCHER_CAST,catcherFieldPose} from './opposing-art.mjs';
import {fieldLocomotionPose,fieldActionPose} from './field-motion.mjs';
import {fieldControlPose} from './field-control-art.mjs';
import {fieldThrowPose} from './field-throw-art.mjs';
import {fieldReceivePose} from './field-receive-art.mjs';
import {fieldRelayPose} from './field-relay-art.mjs';
import {secondBasePose} from './second-base-art.mjs';
import {secondPivotPose} from './second-pivot-art.mjs';
import {fieldProject} from './field-camera.mjs';
export {fieldProject};
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
export const fieldPoseDefinition=pose=>typeof pose==='string'?LIVE_FIELD_POSES[pose]:pose;
export function poseGround(pose,p){const f=fieldPoseDefinition(pose),bag=f?.originBagPoint??(f?.bagFoot&&p.bagContact);return fieldProject(bag?{x:bag.x+(f.bagGroundOffset?.x??0),y:bag.y+(f.bagGroundOffset?.y??0)}:p.point);}
// The receiver may still be running from the other side of the thrower.
// Select a directional drawing from the committed flight, not that moving body.
const throwsRight=(s,p,receiver)=>(s.throwEnd??receiver?.point)?.x>(s.throwStart??p.point).x;
export function liveFieldPose(s,p){
 if(p.fieldAction)return fieldActionPose(s,p);
 const pivot=secondPivotPose(s,p);if(pivot)return pivot;
 const second=secondBasePose(s,p);if(second)return second;
 if(p.tagging)return null;
 const relay=fieldRelayPose(s,p);if(relay)return relay;
 const receiving=fieldReceivePose(s,p);if(receiving)return receiving;
 if(CATCHER_CAST[p.id]&&p.id.startsWith(s.teamId+'-')&&p.throws==='R'){
  const receiver=s.players.find(x=>x.id===s.throwToId);
  if(s.throwFromId===p.id&&['transfer','throw'].includes(s.phase))return throwsRight(s,p,receiver)?catcherFieldPose(p.id,p.throws,s.phase==='throw'?'throw':'transfer'):null;
  return s.ballOwnerId===p.id&&s.ball.y<=p.point.y+3?catcherFieldPose(p.id,p.throws,'transfer'):null;
 }
 if(APPROVED_FIELD_CAST[p.id]&&p.id.startsWith(s.teamId+'-')){
  const pose=action=>approvedFieldPose(p.id,p.throws,action),receiver=s.players.find(x=>x.id===s.throwToId);
  if(s.airCatch&&p.id===s.fielderId&&(s.phase==='caught'||s.phase==='complete'||s.clock>=s.catchAt-.35))return pose('catch');
  const steppedThrow=fieldThrowPose(s,p);if(steppedThrow)return steppedThrow;
  const control=fieldControlPose(s,p);if(control)return control;
  const holdingCatch=s.phase==='secured'&&s.possession==='receiving-glove'&&s.ballOwnerId===p.id;
  if(s.throwToId===p.id&&p.bagContact&&(['throw','received','complete'].includes(s.phase)||holdingCatch)){
   const from=s.players.find(x=>x.id===s.throwFromId),receive=pose('receive');
   const supportedBase=!receive?.bases||receive.bases.includes(p.covering??s.target);
   const supportedOrigin=!receive?.fromPositions||receive.fromPositions.includes(from?.position);
   return receive&&supportedBase&&supportedOrigin&&(s.throwStart??from?.point)?.x<p.point.x?{...receive,anchor:receive.bagAnchor??[350,1235],bagFoot:true}:null;
  }
  if(s.throwFromId===p.id&&['transfer','throw'].includes(s.phase))return throwsRight(s,p,receiver)?pose(s.phase==='transfer'?'transfer':'throw'):null;
  if(p.id===s.fielderId&&s.phase==='gather')return pose('gather');
  if(s.ballOwnerId===p.id)return pose('transfer');
  if(p.moving)return fieldLocomotionPose(s,p)??(p.motion?.y<0&&Math.abs(p.motion.x)<=-p.motion.y?pose(Math.floor(s.clock*7)%2?'runB':'runA'):null);
  return fieldLocomotionPose(s,p)??(s.ball.y<=p.point.y+3?pose('ready'):null);
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
 const pickup=poses.get(s.fielderId);
 if(s.phase==='approach'&&pickup?.source==='shared-3d-field-control'&&Number.isFinite(pickup.contactAt)){
  const actor=s.players.find(p=>p.id===s.fielderId),at=poseLandmark(pickup,poseGround(pickup,actor));
  const q=Math.max(0,Math.min(1,1-(pickup.contactAt-s.clock)/.12)),blend=q*q*(3-2*q);
  return{x:ground.x+(at.x-ground.x)*blend,y:ground.y-s.ball.z*1.2+(at.y-ground.y+s.ball.z*1.2)*blend};
 }
 if(s.phase==='tag'){const actor=s.players.find(p=>p.id===s.ballOwnerId),pose=poses.get(actor?.id);if(pose?.source==='shared-3d-second-base')return poseLandmark(pose,poseGround(pose,actor));return{x:ground.x,y:ground.y-s.ball.z*1.2};}
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
  return poseLandmark(pose,poseGround(pose,p),pose.ballLandmark??(pose.containsBall||s.possession==='throwing-hand'?'hand':'glove'));
 }
 if(s.phase==='throw'){
  const q=s.throwProgress,from=s.players.find(p=>p.id===s.throwFromId),to=s.players.find(p=>p.id===s.throwToId);
  const launch=poses.get(from?.id),frozen=launch?.releaseOffset&&s.throwStart?(launch.originBagPoint?poseGround(launch,from):fieldProject(s.throwStart)):null;
  const a=frozen?{x:frozen.x+launch.releaseOffset[0],y:frozen.y+launch.releaseOffset[1]}:poses.has(from?.id)?poseLandmark(poses.get(from.id),poseGround(poses.get(from.id),from),'hand'):fieldProject(from?.point??s.ball);
  const receiving=poses.get(to?.id),bag=receiving?.catchOffset&&to?poseGround(receiving,to):null;
  const b=bag?{x:bag.x+receiving.catchOffset[0],y:bag.y+receiving.catchOffset[1]}:poses.has(to?.id)?poseLandmark(poses.get(to.id),poseGround(poses.get(to.id),to)):fieldProject(to?.point??s.ball);
  return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q-Math.sin(Math.PI*q)*38};
 }
 return{x:ground.x,y:ground.y-s.ball.z*1.2};
}
// Some approved transfers contain their one held baseball. Free-flight and tag
// states always use the live ball; never draw a second ball on a held cutout.
export function fieldBallIsPainted(s,poses){return s.phase!=='tag'&&s.possession!=='free'&&!!s.ballOwnerId&&!!fieldPoseDefinition(poses.get(s.ballOwnerId))?.containsBall;}
