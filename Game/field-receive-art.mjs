import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
// Exact reviewed candidates approved and registered.
export const RIG_FIELD_RECEIVE_CAST={...APPROVED_RIG_CLIPS.receive};
export const FIELD_RECEIVE_ASSETS=Object.fromEntries(Object.values(RIG_FIELD_RECEIVE_CAST).map(c=>[c.asset,APPROVED_RIG_ASSETS[c.asset]]));
const clamp=v=>Math.max(0,Math.min(1,v));
export function fieldReceiveDirection(v,clip){
 if(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.hypot(v.x,v.y)<1e-6)return null;
 const angle=Math.atan2(v.x,-v.y)*180/Math.PI;
 return Object.entries(clip.directions).map(([key,d])=>[key,Math.abs(((angle-d.yawDegrees+540)%360)-180)]).sort((a,b)=>a[1]-b[1]).find(([,gap])=>gap<=22.5)?.[0]??null;
}
export function sampleFieldReceive(clip,s,p){
 const position=clip.receiverPosition??'1B';
 if(!['1B','P'].includes(position)||clip.id!==p.id||clip.teamId!==s.teamId||clip.throws!==p.throws||clip.gloveHand!==p.gloveHand||!(clip.scale>0)||p.moving||p.tagging||s.airCatch||p.position!==position||p.covering!=='1B'||s.target!=='1B'||s.throwToId!==p.id||!p.bagContact||!['transfer','throw','received','secured','complete'].includes(s.phase))return null;
 if(clip.fromPositions&&!clip.fromPositions.includes(s.players.find(x=>x.id===s.throwFromId)?.position))return null;
 const catchAt=s.throwCatchAt,releaseAt=s.throwReleaseAt;if(!Number.isFinite(catchAt)||!Number.isFinite(releaseAt)||catchAt<=releaseAt||!Number.isFinite(p.motionEndAt)||p.motionEndAt>releaseAt-clip.receiveDuration+1e-8)return null;
 const from=s.throwStart,bag=p.bagContact,key=from&&fieldReceiveDirection({x:from.x-bag.x,y:from.y-bag.y},clip);if(!key)return null;
 const action=s.clock<catchAt?'receive':'secure',q=action==='receive'?clamp((s.clock-(catchAt-clip.receiveDuration))/clip.receiveDuration):clamp((s.clock-catchAt)/clip.secureDuration);
 const seq=clip.frames.filter(f=>f.direction===key&&f.action===action),frame=seq.reduce((a,b)=>!a||Math.abs(b.phase-q)<Math.abs(a.phase-q)?b:a,null),contact=clip.frames.find(f=>f.direction===key&&f.action==='receive'&&f.phase===1);if(!frame||!contact)return null;
 const[x,y,w,h]=frame.cell,absolute=v=>[x+v[0],y+v[1]];
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:absolute(frame.anchor),glove:absolute(frame.glove),hand:absolute(frame.hand),...(clip.receiverPosition==='P'?{footContact:absolute(frame.anchor),contactFoot:clip.bagContactFoot}:{}),scale:clip.scale,throws:clip.throws,gloveHand:clip.gloveHand,bagFoot:true,bagContactFoot:clip.bagContactFoot,bagGroundOffset:clip.bagGroundOffset,catchOffset:[(contact.glove[0]-contact.anchor[0])*clip.scale,(contact.glove[1]-contact.anchor[1])*clip.scale],action,frameIndex:frame.index,camera:key,contactAt:catchAt,source:'shared-3d-field-receive',containsBall:false};
}
export function fieldReceivePose(s,p){const c=RIG_FIELD_RECEIVE_CAST[p.id];return c?sampleFieldReceive(c,s,p):null;}
export function fieldReceiveArtKeys(teamId){return Object.values(RIG_FIELD_RECEIVE_CAST).filter(c=>c.teamId===teamId).map(c=>c.asset);}
export function fieldReceiveFrameDefinitions(id){const c=RIG_FIELD_RECEIVE_CAST[id];return c?c.frames.map(f=>({rect:f.cell,anchor:[f.cell[0]+f.anchor[0],f.cell[1]+f.anchor[1]],scale:c.scale})):[];}
