import {runThroughMotion} from './defense-play.mjs';
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,q)=>a.map((v,i)=>v+(b[i]-v)*q);
const phase=v=>(v%1+1)%1;
export function rigFramePose(clip,leg,action,index,anchor){
 const [w,h]=clip.frameSize,row=leg.row+({run:0,arrival:4,overrun:8}[action]),x=index*w,y=row*h;
 return{asset:clip.asset,sourceWidth:clip.atlasSize[0],rect:[x,y,w,h],anchor:[x+anchor[0],y+anchor[1]],scale:clip.scale,action,frameIndex:index,camera:leg.key,source:'shared-3d-run'};
}
export function sampleRigRunner(clip,s,r){
 if(r.out&&!Number.isFinite(r.taggedAt))return null;
 const time=r.out?r.taggedAt:s.clock;
 if(r.from===r.to){const leg=clip.legs[(r.from-1)+':'+r.from];return leg?rigFramePose(clip,leg,'arrival',8,leg.contact):null;}
 const leg=clip.legs[r.from+':'+r.to];if(!leg)return null;
 const after=time-r.arriveAt;
 if(after>=-1e-8){
  const through=r.from===0&&r.to===1||r.to===4;
  const q=through?runThroughMotion(r,time).progress:clamp(after/clip.arrivalDuration);
  return rigFramePose(clip,leg,through?'overrun':'arrival',Math.min(8,Math.floor(q*8+1e-8)),leg.contact);
 }
 // Align the next contact stride with the bag clock, not an unrelated wall clock.
 const period=clip.period*(r.arriveAt/4.45),index=Math.floor(phase(after/period)*16)%16;
 const blend=clamp(1+after/.16),anchor=mix(leg.root,leg.contact,blend*blend*(3-2*blend));
 return rigFramePose(clip,leg,'run',index,anchor);
}
