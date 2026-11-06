import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
import {NATIVE_FIELD_ACTIONS} from './field-action-data.mjs';
// Exact native versions approved November2,2026; unsupported motion returns null.
export const RIG_FIELD_CAST={...APPROVED_RIG_CLIPS.locomotion};
export const FIELD_MOTION_ASSETS={...Object.fromEntries(Object.values(RIG_FIELD_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]])),...Object.fromEntries(Object.values(NATIVE_FIELD_ACTIONS).map(c=>[c.asset,c.path]))};
const fieldMotionPhase=v=>(v%1+1)%1;
export function fieldMotionDirection(v){
 if(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.hypot(v.x,v.y)<1e-7)return null;
 return v.y>=0?(v.x>=0?'home-first':'first-second'):(v.x<0?'second-third':'third-home');
}
export function sampleFieldLocomotion(clip,s,p){
 if(p.tagging||s.ballOwnerId===p.id||clip.id!==p.id||clip.teamId!==s.teamId||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0))return null;
 const elapsed=s.clock-(p.controlled&&p.moving?p.motionStartAt:p.motionEndAt),hasTravel=Math.hypot(p.motion?.x??0,p.motion?.y??0)>1e-7;
 const stopping=!p.moving&&hasTravel&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<clip.settleDuration;
 // Keep the approach heading through the stop and ready hold; an instant
 // quarter-turn would hide a missing turn animation and pop the planted foot.
 const heading=p.moving||hasTravel&&Number.isFinite(elapsed)&&elapsed>=0?p.motion:{x:s.ball.x-p.point.x,y:s.ball.y-p.point.y};
 const key=fieldMotionDirection(heading)??fieldMotionDirection(p.motion);if(!key)return null;
 const camera=clip.directions[key];if(!camera)return null;
 let action='ready',index=0;
 if(p.moving){
  if(!Number.isFinite(p.motionEndAt)&&!p.controlled)return null;
  action='run';index=Math.floor(fieldMotionPhase(elapsed/clip.period+clip.stopRunPhase)*16+1e-8)%16;
 }else if(stopping){action='settle';index=Math.min(8,Math.floor(elapsed/clip.settleDuration*8+1e-8));}
 const frame=clip.frames.find(f=>f.direction===key&&f.action===action&&f.index===index);if(!frame)return null;
 const [x,y,w,h]=frame.cell,absolute=point=>[x+point[0],y+point[1]];
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:absolute(camera.root),glove:absolute(frame.glove),hand:absolute(frame.hand),scale:clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,action,frameIndex:index,camera:key,source:'shared-3d-field-locomotion'};
}
export function fieldLocomotionPose(s,p){const clip=RIG_FIELD_CAST[p.id];return clip?sampleFieldLocomotion(clip,s,p):null;}
export function fieldActionPose(s,p){const clip=NATIVE_FIELD_ACTIONS[p.id],a=p.fieldAction;if(!clip||!a||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||clip.teamId!==s.teamId)return null;const direction=fieldMotionDirection(a.direction),camera=clip.directions[direction],index=Math.min(16,Math.floor(a.progress*16)),f=clip.frames.find(f=>f.action===a.kind&&f.direction===direction&&f.index===index);if(!f||!camera)return null;const [x,y,w,h]=f.cell;return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:[x+camera.root[0],y+camera.root[1]],glove:[x+f.glove[0],y+f.glove[1]],hand:[x+f.hand[0],y+f.hand[1]],scale:camera.scale??clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,action:a.kind,camera:direction,frameIndex:index,source:'own-native-field-action'};}
export function fieldMotionArtKeys(teamId){return[...Object.values(RIG_FIELD_CAST),...Object.values(NATIVE_FIELD_ACTIONS)].filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function fieldMotionFrameDefinitions(id){
 const clip=RIG_FIELD_CAST[id];if(!clip)return[];
 return clip.frames.map(f=>{const [x,y,w,h]=f.cell;return{rect:[x,y,w,h],anchor:[x+clip.directions[f.direction].root[0],y+clip.directions[f.direction].root[1]],scale:clip.scale};});
}
