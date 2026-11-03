import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
import {fieldMotionDirection} from './field-motion.mjs';
import {RIG_FIELD_CONTROL_CAST,sampleFieldControl} from './field-control-art.mjs';
export const RIG_FIELD_THROW_CAST={...APPROVED_RIG_CLIPS.throw};
export const FIELD_THROW_ASSETS=Object.fromEntries(Object.values(RIG_FIELD_THROW_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
export const FIELD_THROW_SETUP=.16+.42+.28*.64;
const throwClamp=v=>Math.max(0,Math.min(1,v));
export function fieldThrowBranch(incoming,outgoing){
 const a=Math.atan2(incoming.x,-incoming.y),b=Math.atan2(outgoing.x,-outgoing.y),angle=((b-a)*180/Math.PI+540)%360-180;
 if(Math.hypot(incoming.x,incoming.y)<1e-6||Math.hypot(outgoing.x,outgoing.y)<1e-6)return null;
 const choices=[['left',-90],['straight',0],['right',90]].sort((a,b)=>Math.abs(angle-a[1])-Math.abs(angle-b[1]));return Math.abs(angle-choices[0][1])<=22.5?choices[0][0]:null;
}
export function sampleFieldThrow(clip,s,p){
 if(clip.id!==p.id||clip.teamId!==s.teamId||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0)||p.moving||p.tagging||s.airCatch||s.throwFromId!==p.id||!['transfer','throw','received','complete'].includes(s.phase))return null;
 if(!Number.isFinite(s.transferStartAt)||!(s.transferEndAt>s.transferStartAt)||s.transferEndAt-s.transferStartAt<clip.setupDuration-1e-6)return null;
 const from=s.throwStart??p.point,to=s.throwEnd,origin=s.fieldingOrigin??{x:0,y:0};if(!to)return null;
 const incoming={x:origin.x-from.x,y:origin.y-from.y},outgoing={x:to.x-from.x,y:to.y-from.y},key=fieldMotionDirection(incoming),branch=fieldThrowBranch(incoming,outgoing);if(!branch||!clip.directions[key])return null;
 const traveled=Math.hypot(p.motion?.x??0,p.motion?.y??0)>1e-7;
 if(traveled&&(!Number.isFinite(s.fieldingTouchAt)||!Number.isFinite(p.motionEndAt)||p.motionEndAt+.4>s.fieldingTouchAt-.36+1e-8||fieldMotionDirection(p.motion)!==key))return null;
 const dt=s.clock-s.transferStartAt;
 if(dt<clip.extractDuration){const control=RIG_FIELD_CONTROL_CAST[p.id];return control?sampleFieldControl(control,{...s,transferEndAt:s.transferStartAt+clip.extractDuration},p):null;}
 const elapsed=dt-clip.extractDuration;let action,q;
 if(elapsed<clip.turnDuration){action='turn';q=throwClamp(elapsed/clip.turnDuration);}
 else if(elapsed<clip.turnDuration+clip.throwDuration){action='throw';q=throwClamp((elapsed-clip.turnDuration)/clip.throwDuration);}
 else{action='follow';q=throwClamp((elapsed-clip.turnDuration-clip.throwDuration)/clip.followDuration);}
 const frames=clip.frames.filter(f=>f.direction===key&&f.branch===branch&&f.action===action),f=frames.reduce((best,f)=>!best||Math.abs(f.phase-q)<Math.abs(best.phase-q)?f:best,null);if(!f)return null;
 const [x,y,w,h]=f.cell,absolute=point=>[x+point[0],y+point[1]],release=clip.frames.find(f=>f.direction===key&&f.branch===branch&&f.action==='throw'&&Math.abs(f.phase-clip.releasePhase)<1e-6);if(!release)return null;
 const root=clip.directions[key].root;
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:absolute(root),glove:absolute(f.glove),hand:absolute(f.hand),releaseOffset:[(release.hand[0]-root[0])*clip.scale,(release.hand[1]-root[1])*clip.scale],scale:clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,action,frameIndex:f.index,camera:key,branch,source:'shared-3d-field-throw',containsBall:false};
}
export function fieldThrowPose(s,p){const c=RIG_FIELD_THROW_CAST[p.id];return c?sampleFieldThrow(c,s,p):null;}
export function fieldThrowArtKeys(teamId){return Object.values(RIG_FIELD_THROW_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function fieldThrowFrameDefinitions(id){const c=RIG_FIELD_THROW_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+c.directions[f.direction].root[0],f.cell[1]+c.directions[f.direction].root[1]],scale:c.scale})):[];}
