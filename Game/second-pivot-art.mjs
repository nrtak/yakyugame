import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
// Exact reviewed pivot files approved for this release.
export const RIG_SECOND_PIVOT_CAST={...APPROVED_RIG_CLIPS.pivot};
export const SECOND_PIVOT_ASSETS=Object.fromEntries(Object.values(RIG_SECOND_PIVOT_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
export const SECOND_PIVOT_SETUP=.22+.44+.32*.64;
const clamp=x=>Math.max(0,Math.min(1,x)),wrap=x=>(x+540)%360-180;
const heading=(a,b)=>Math.atan2(a.x-b.x,-(a.y-b.y))*180/Math.PI;
export function sampleSecondPivot(c,s,p){
 if(c.id!==p.id||c.teamId!==s.teamId||p.position!=='2B'||p.covering!=='2B'||p.throws!=='R'||p.gloveHand!=='L'||c.throws!=='R'||c.gloveHand!=='L'||!(c.scale>0)||p.moving||p.tagging||s.airCatch||!p.bagContact)return null;
 let action,q,bag=p.bagContact,ballLandmark='glove';
 const outgoing=s.throwFromId===p.id&&s.target==='1B',prior=s.previousThrow;
 if(outgoing){
  if(!prior||prior.base!=='2B'||prior.receiverId!==p.id||prior.forceRunnerId==null||!prior.bag||!prior.start||!s.throwEnd||!s.throwStart||!Number.isFinite(prior.catchAt)||!Number.isFinite(prior.controlAt)||!Number.isFinite(s.transferStartAt)||!Number.isFinite(s.transferEndAt)||s.transferStartAt<Math.max(prior.catchAt+c.secureDuration,prior.controlAt)-1e-8||s.transferEndAt-s.transferStartAt<c.setupDuration-1e-8||Math.abs(wrap(heading(prior.start,prior.bag)-c.yawDegrees))>c.tolerance||Math.abs(wrap(heading(s.throwEnd,s.throwStart)-c.yawDegrees))>c.tolerance)return null;
  bag=prior.bag;const dt=s.clock-s.transferStartAt;
  if(dt<c.extractDuration){action='extract';q=clamp(dt/c.extractDuration);}
  else if(dt<c.extractDuration+c.turnDuration){action='turn';q=clamp((dt-c.extractDuration)/c.turnDuration);}
  else if(dt<c.extractDuration+c.turnDuration+c.throwDuration){action='throw';q=clamp((dt-c.extractDuration-c.turnDuration)/c.throwDuration);}
  else{action='follow';q=clamp((dt-c.extractDuration-c.turnDuration-c.throwDuration)/c.followDuration);}
 }else{
  const from=s.players.find(x=>x.id===s.throwFromId);
  if(s.target!=='2B'||s.throwToId!==p.id||s.throwForceRunnerId==null||from?.position!=='1B'||!s.throwStart||Math.abs(wrap(heading(s.throwStart,bag)-c.yawDegrees))>c.tolerance||!Number.isFinite(s.throwCatchAt)||!Number.isFinite(s.throwReleaseAt)||!Number.isFinite(p.motionEndAt)||p.motionEndAt>s.throwReleaseAt-c.receiveDuration+1e-8)return null;
  action=s.clock<s.throwCatchAt?'receive':'secure';q=action==='receive'?clamp((s.clock-s.throwCatchAt+c.receiveDuration)/c.receiveDuration):clamp((s.clock-s.throwCatchAt)/c.secureDuration);
 }
 const seq=c.frames.filter(f=>f.action===action),f=seq.reduce((a,b)=>!a||Math.abs(b.phase-q)<Math.abs(a.phase-q)?b:a,null),catchFrame=c.frames.find(f=>f.action==='receive'&&f.phase===1),release=c.frames.find(f=>f.action==='throw'&&f.phase===c.releasePhase);if(!f||!catchFrame||!release)return null;
 if(outgoing&&!(action==='extract'&&f.phase<c.handoffPhase))ballLandmark='hand';
 const[x,y,w,h]=f.cell,at=v=>[x+v[0],y+v[1]],delta=v=>[(v[0]-c.anchor[0])*c.scale,(v[1]-c.anchor[1])*c.scale];
 return{asset:c.asset,sourceWidth:c.atlasSize[0],rect:[x,y,w,h],anchor:at(c.anchor),glove:at(f.glove),hand:at(f.hand),...(f.bagFoot?{footContact:at(f.bagFoot),contactFoot:'L'}:{}),scale:c.scale,throws:'R',gloveHand:'L',originBagPoint:{...bag},bagGroundOffset:c.bagGroundOffset,bagFoot:true,ballLandmark,catchOffset:delta(catchFrame.glove),...(outgoing?{releaseOffset:delta(release.hand)}:{}),action,frameIndex:f.index,camera:c.camera,source:'shared-3d-second-pivot',containsBall:false};
}
export function secondPivotPose(s,p){const c=RIG_SECOND_PIVOT_CAST[p.id];return c?sampleSecondPivot(c,s,p):null;}
export function secondPivotArtKeys(teamId){return Object.values(RIG_SECOND_PIVOT_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function secondPivotFrameDefinitions(id){const c=RIG_SECOND_PIVOT_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+c.anchor[0],f.cell[1]+c.anchor[1]],scale:c.scale,bagFoot:true,bagGroundOffset:c.bagGroundOffset})):[];}
