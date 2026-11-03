import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
export const RIG_SECOND_BASE_CAST={...APPROVED_RIG_CLIPS.tag};
export const SECOND_BASE_ASSETS=Object.fromEntries(Object.values(RIG_SECOND_BASE_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
const clamp=x=>Math.max(0,Math.min(1,x));
export function sampleSecondBase(clip,s,p){
 if(clip.id!==p.id||clip.teamId!==s.teamId||p.throws!=='R'||p.gloveHand!=='L'||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0)||p.moving||s.airCatch||p.position!=='2B'||p.covering!=='2B'||s.target!=='2B'||s.throwToId!==p.id||s.throwForceRunnerId!=null||!s.throwStart||!s.throwEnd)return null;
 const from=s.players.find(p=>p.id===s.throwFromId);if(from?.position!=='1B')return null;
 const heading=Math.atan2(s.throwStart.x-p.point.x,-(s.throwStart.y-p.point.y))*180/Math.PI;if(Math.abs((heading-clip.yawDegrees+540)%360-180)>15)return null;
 if(!Number.isFinite(s.throwCatchAt)||!Number.isFinite(s.throwReleaseAt)||!Number.isFinite(p.motionEndAt)||p.motionEndAt>s.throwReleaseAt-clip.receiveDuration+1e-8)return null;
 const motion=s.tagMotion?.holderId===p.id?s.tagMotion:null;let action,q;
 if(motion&&s.clock>=motion.startedAt){
  if(!motion.zone||Math.abs(motion.zone.offset.x-clip.tagRule.offset.x)>1e-6||Math.abs(motion.zone.offset.y-clip.tagRule.offset.y)>1e-6||Math.abs(motion.zone.radius-clip.tagRule.radius)>1e-6||Math.abs(motion.zone.windupSeconds-clip.tagDuration)>1e-6)return null;
  const recoverAt=motion.outcome==='out'?motion.contactAt+clip.tagHoldDuration:motion.outcome==='safe'?Math.max(motion.missAt,motion.readyAt)+clip.tagHoldDuration:Infinity;
  action=s.clock<recoverAt?'tag':'recover';q=action==='tag'?clamp((s.clock-motion.startedAt)/clip.tagDuration):clamp((s.clock-recoverAt)/clip.recoverDuration);
 }else if(s.clock<s.throwCatchAt){action='receive';q=clamp((s.clock-(s.throwCatchAt-clip.receiveDuration))/clip.receiveDuration);}
 else{if(p.tagging&&!motion)return null;action='secure';q=clamp((s.clock-s.throwCatchAt)/clip.secureDuration);}
 const frames=clip.frames.filter(f=>f.action===action),f=frames.reduce((a,b)=>!a||Math.abs(b.phase-q)<Math.abs(a.phase-q)?b:a,null),contact=clip.frames.find(f=>f.action==='receive'&&f.phase===1);if(!f||!contact)return null;const[x,y,w,h]=f.cell,at=v=>[x+v[0],y+v[1]];
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:at(clip.anchor),glove:at(f.glove),hand:at(f.hand),scale:clip.scale,throws:'R',gloveHand:'L',catchOffset:[(contact.glove[0]-clip.anchor[0])*clip.scale,(contact.glove[1]-clip.anchor[1])*clip.scale],action,frameIndex:f.index,camera:clip.camera,source:'shared-3d-second-base',containsBall:false};
}
export function secondBasePose(s,p){const c=RIG_SECOND_BASE_CAST[p.id];return c?sampleSecondBase(c,s,p):null;}
export function secondBaseArtKeys(teamId){return Object.values(RIG_SECOND_BASE_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function secondBaseFrameDefinitions(id){const c=RIG_SECOND_BASE_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+c.anchor[0],f.cell[1]+c.anchor[1]],scale:c.scale})):[];}
