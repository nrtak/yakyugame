import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
// Exact reviewed relay files approved for this release.
import{fieldReceiveDirection}from'./field-receive-art.mjs';
export const RIG_FIELD_RELAY_CAST={...APPROVED_RIG_CLIPS.relay};
export const FIELD_RELAY_ASSETS=Object.fromEntries(Object.values(RIG_FIELD_RELAY_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
export const FIELD_RELAY_SETUP=.22+.44+.32*.64;
const clamp=v=>Math.max(0,Math.min(1,v)),angle=v=>Math.atan2(v.x,-v.y)*180/Math.PI,wrap=a=>(a+540)%360-180;
export function sampleFieldRelay(clip,s,p){
 const prior=s.previousThrow;
 if(clip.id!==p.id||clip.teamId!==s.teamId||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0)||p.moving||p.tagging||s.airCatch||s.throwFromId!==p.id||s.target!=='2B'||p.position!=='1B'||!prior||prior.base!=='1B'||prior.receiverId!==p.id||!prior.bag||!prior.start||!['transfer','throw','received','secured','complete'].includes(s.phase))return null;
 if(!Number.isFinite(s.transferStartAt)||!Number.isFinite(s.transferEndAt)||!Number.isFinite(prior.catchAt)||!Number.isFinite(prior.controlAt)||s.transferStartAt<Math.max(prior.catchAt+clip.secureDuration,prior.controlAt)-1e-8||s.transferEndAt-s.transferStartAt<clip.setupDuration-1e-8)return null;
 const key=fieldReceiveDirection({x:prior.start.x-prior.bag.x,y:prior.start.y-prior.bag.y},clip),from=s.throwStart,to=s.throwEnd;if(!key||!from||!to)return null;
 const camera=clip.directions[key],heading=angle({x:to.x-from.x,y:to.y-from.y}),delta=wrap(heading-camera.yawDegrees);if(Math.abs(wrap(delta-camera.targetYaw))>clip.targetTolerance)return null;
 const dt=s.clock-s.transferStartAt;let action,q;
 if(dt<clip.extractDuration){action='extract';q=clamp(dt/clip.extractDuration);}
 else if(dt<clip.extractDuration+clip.turnDuration){action='turn';q=clamp((dt-clip.extractDuration)/clip.turnDuration);}
 else if(dt<clip.extractDuration+clip.turnDuration+clip.throwDuration){action='throw';q=clamp((dt-clip.extractDuration-clip.turnDuration)/clip.throwDuration);}
 else{action='follow';q=clamp((dt-clip.extractDuration-clip.turnDuration-clip.throwDuration)/clip.followDuration);}
 const seq=clip.frames.filter(f=>f.direction===key&&f.action===action),f=seq.reduce((a,b)=>!a||Math.abs(b.phase-q)<Math.abs(a.phase-q)?b:a,null),release=clip.frames.find(f=>f.direction===key&&f.action==='throw'&&f.phase===clip.releasePhase);if(!f||!release)return null;
 const[x,y,w,h]=f.cell,absolute=v=>[x+v[0],y+v[1]],anchor=camera.anchor;
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:absolute(anchor),glove:absolute(f.glove),hand:absolute(f.hand),scale:clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,originBagPoint:{...prior.bag},bagGroundOffset:clip.bagGroundOffset,ballLandmark:action==='extract'&&f.phase<clip.handoffPhase?'glove':'hand',releaseOffset:[(release.hand[0]-anchor[0])*clip.scale,(release.hand[1]-anchor[1])*clip.scale],action,frameIndex:f.index,camera:key,branch:camera.branch,source:'shared-3d-field-relay',containsBall:false};
}
export function fieldRelayPose(s,p){const c=RIG_FIELD_RELAY_CAST[p.id];return c?sampleFieldRelay(c,s,p):null;}
export function fieldRelayArtKeys(teamId){return Object.values(RIG_FIELD_RELAY_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function fieldRelayFrameDefinitions(id){const c=RIG_FIELD_RELAY_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+c.directions[f.direction].anchor[0],f.cell[1]+c.directions[f.direction].anchor[1]],scale:c.scale})):[];}
