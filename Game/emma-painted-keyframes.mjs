import {PITCH_WINDUP_SECONDS} from './engine.mjs';
import {EMMA_PAINTED_ASSETS as BASE_ASSETS,emmaPaintedFrame as baseFrame,emmaPaintedPose as basePose,emmaPaintedRelease as baseRelease,emmaPaintedScene} from './emma-painted-base.mjs';
export {emmaPaintedScene};
export const EMMA_REAR_SCALE=1.85;
export const EMMA_REAR_SCALE_FACTOR=EMMA_REAR_SCALE/1.45;
export const EMMA_REAR_OFFSET_X=140;
const rubberPivot=[400,830];
export const EMMA_PAINTED_ASSETS={...BASE_ASSETS,
 defenseEmmaSmoothStart:'assets/scene-emma-delivery-11-16-defenseEmmaSmoothStart.png',
 defenseEmmaSmoothStep:'assets/scene-emma-delivery-11-16-defenseEmmaSmoothStep.png',
 defenseEmmaSmoothThrow:'assets/scene-emma-delivery-11-16-defenseEmmaSmoothThrow.png'};
export const EMMA_PHASES=['Set','Rising right knee','Right knee lift','Knee lowering / separation','Short airborne step','Closed stride / arm separation','Lead-foot plant / arm load','Release preparation','Release','Early follow-through','Deceleration','Rear-leg carry','Returning step','Grounded finish'];
export const EMMA_BASE_FRAMES=[0,null,1,null,null,2,3,null,4,null,5,6,7,8];
const baseToSmooth=[0,2,5,6,8,10,11,12,13];
const windupCuts=[.10,.23,.37,.46,.57,.74,.91];
export function emmaPaintedFrame(s,view='rear'){
 if(view==='front')return baseToSmooth[baseFrame(s)];
 if(s.phase==='windup'){
  const t=Math.max(0,s.clock??0)/PITCH_WINDUP_SECONDS*1.12;
  const i=windupCuts.findIndex(v=>t<v);return i<0?7:i;
 }
 if(!['flight','hit','result'].includes(s.phase))return 0;
 const t=Number.isFinite(s.elapsed)?Math.max(0,s.elapsed)+(['hit','result'].includes(s.phase)?Math.max(0,s.clock??0):0):Infinity;
 return t<.035?8:t<.095?9:t<.22?10:t<.40?11:t<.62?12:13;
}
const extras={
 1:{asset:'defenseEmmaSmoothStart',width:2087,height:754,columns:3,cell:0,anchor:[374,704],hand:[284,224],foot:[283,549],support:'L',ball:false},
 3:{asset:'defenseEmmaSmoothStart',width:2087,height:754,columns:3,cell:1,anchor:[1030,704],hand:[956,310],foot:[849,589],support:'L',ball:true},
 4:{asset:'defenseEmmaSmoothStep',width:1774,height:887,columns:2,cell:0,anchor:[395,815],hand:[310,401],foot:[563,689],support:'L',ball:true},
 7:{asset:'defenseEmmaSmoothThrow',width:2086,height:754,columns:3,cell:0,anchor:[620,676],hand:[310,124],foot:[212,675],support:'R',ball:true},
 9:{asset:'defenseEmmaSmoothThrow',width:2086,height:754,columns:3,cell:2,anchor:[1865,676],hand:[1960,417],foot:[1487,530],support:'R',ball:false}
};
function sourcePaintedPose(frame,view='rear'){
 if(!Number.isInteger(frame)||frame<0||frame>=EMMA_PHASES.length)return null;
 const extra=extras[frame];
 if(view==='rear'&&extra){
  const w=402*extra.columns,k=extra.width/w,rect=[extra.cell*402,0,402,extra.height/k];
  const support=extra.support,base=basePose(support==='L'?0:3,'rear');
  return {asset:extra.asset,size:[w,extra.height/k],sourceWidth:w,rect,anchor:extra.anchor.map(v=>v/k),hand:extra.hand.map(v=>v/k),otherFoot:extra.foot.map(v=>v/k),
   world:[...base.world],scale:base.scale,frame,phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support,
   feetGrounded:{L:support==='L',R:support==='R'},containsBall:false,ballVisible:extra.ball};
 }
 const fallback={1:0,3:1,4:1,7:3,9:4};
 const p=basePose(EMMA_BASE_FRAMES[frame]??fallback[frame],view);
 return p?{...p,frame,phase:EMMA_PHASES[frame]}:null;
}
export function emmaPaintedPose(frame,view='rear'){
 const p=sourcePaintedPose(frame,view);if(!p||view!=='rear')return p;
 // Uniformly enlarge the entire delivery about the planted rubber pivot.
 // Landing locations and the hand travel grow with the same transform.
 return {...p,scale:p.scale*EMMA_REAR_SCALE_FACTOR,
  world:p.world.map((v,i)=>rubberPivot[i]+(v-rubberPivot[i])*EMMA_REAR_SCALE_FACTOR+(i===0?EMMA_REAR_OFFSET_X:0))};
}
export function emmaPaintedRelease(view='rear'){
 if(view!=='rear')return baseRelease(view);
 const p=emmaPaintedPose(8,view);return {x:p.world[0]+(p.hand[0]-p.anchor[0])*p.scale,y:p.world[1]+(p.hand[1]-p.anchor[1])*p.scale};
}
export const EMMA_REVIEW_TIMES=[.05,.16,.29,.41,.51,.65,.82,1.015].map(t=>t/1.12*PITCH_WINDUP_SECONDS).concat([0,.06,.14,.30,.51,.78].map(t=>PITCH_WINDUP_SECONDS+t));
