import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
import {fieldMotionDirection} from './field-motion.mjs';
// Exact reviewed surfaces and motion approved for this release.
export const RIG_FIELD_CONTROL_CAST={...APPROVED_RIG_CLIPS.control};
export const FIELD_CONTROL_ASSETS=Object.fromEntries(Object.values(RIG_FIELD_CONTROL_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
const clampControl=q=>Math.max(0,Math.min(1,q));
export function sampleFieldControl(clip,s,p){
 if(clip.id!==p.id||clip.teamId!==s.teamId||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0)||p.tagging||p.moving||s.airCatch||p.id!==s.fielderId)return null;
 const touch=s.fieldingTouchAt,collect=s.fieldingCollectAt,start=touch-clip.prepLead;
 if(!Number.isFinite(touch)||!Number.isFinite(collect)||collect<=touch)return null;
 const origin=s.fieldingOrigin??{x:0,y:0},incoming={x:origin.x-p.point.x,y:origin.y-p.point.y},key=fieldMotionDirection(incoming);if(!key||!clip.directions[key])return null;
 const traveled=Math.hypot(p.motion?.x??0,p.motion?.y??0)>1e-7;
 // A late arrival or a turn needs its own animation. Do not replace that gap
 // with a sliding squat or a reversed camera at first glove contact.
 if(traveled&&(p.motionEndAt+clip.settleDuration>start+1e-8||fieldMotionDirection(p.motion)!==key))return null;
 let action='gather',q;
 if(s.phase==='transfer'&&s.throwFromId===p.id){
  if(s.ballOwnerId!==p.id||!Number.isFinite(s.transferStartAt)||!(s.transferEndAt>s.transferStartAt))return null;
  action='transfer';q=clampControl((s.clock-s.transferStartAt)/(s.transferEndAt-s.transferStartAt));
 }else if(s.phase==='approach'&&s.clock>=start&&s.clock<=touch){q=clampControl((s.clock-start)/(collect-start));}
 else if(s.phase==='gather'&&s.ballOwnerId===p.id){q=clampControl((s.clock-start)/(collect-start));}
 else if(['secured','complete'].includes(s.phase)&&s.ballOwnerId===p.id&&s.possession==='fielding-glove'){q=1;}
 else return null;
 const count=action==='gather'?19:17,index=Math.min(count-1,Math.round(q*(count-1))),f=clip.frames.find(f=>f.direction===key&&f.action===action&&f.index===index);if(!f)return null;
 const [x,y,w,h]=f.cell,absolute=at=>[x+at[0],y+at[1]];
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:absolute(clip.directions[key].root),glove:absolute(f.glove),hand:absolute(f.hand),scale:clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,action,frameIndex:index,camera:key,source:'shared-3d-field-control',containsBall:false,contactAt:touch};
}
export function fieldControlPose(s,p){const c=RIG_FIELD_CONTROL_CAST[p.id];return c?sampleFieldControl(c,s,p):null;}
export function fieldControlArtKeys(teamId){return Object.values(RIG_FIELD_CONTROL_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function fieldControlFrameDefinitions(id){const c=RIG_FIELD_CONTROL_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+c.directions[f.direction].root[0],f.cell[1]+c.directions[f.direction].root[1]],scale:c.scale})):[];}
