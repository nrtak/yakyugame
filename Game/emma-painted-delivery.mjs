import {PITCH_WINDUP_SECONDS} from './engine.mjs';
import {EMMA_PAINTED_ASSETS,EMMA_PHASES,emmaPaintedPose,emmaPaintedFrame as originalFrame,emmaPaintedRelease,emmaPaintedScene} from './emma-painted-keyframes.mjs';
export {EMMA_PAINTED_ASSETS,EMMA_PHASES,emmaPaintedPose,emmaPaintedRelease,emmaPaintedScene};
export const EMMA_REAR_SCALE=1.85;
export const EMMA_REAR_OFFSET_X=140;
export const EMMA_APPROVED_FRAME_MAP=Array.from({length:14},(_,i)=>i);
// The two added drawings were rejected for a branching shoulder connection.
// Keep only the established whole paintings and refine their pacing.
const windupCuts=[.14,.31,.50,.67,.81,.93,1.025];
export function emmaPaintedFrame(s,view='rear'){
 if(view==='front')return originalFrame(s,'front');
 if(s.phase==='windup'){
  const t=Math.max(0,s.clock??0)/PITCH_WINDUP_SECONDS*1.12;
  const i=windupCuts.findIndex(v=>t<v);return i<0?7:i;
 }
 if(!['flight','hit','result'].includes(s.phase))return 0;
 const t=Number.isFinite(s.elapsed)?Math.max(0,s.elapsed)+(['hit','result'].includes(s.phase)?Math.max(0,s.clock??0):0):Infinity;
 return t<.035?8:t<.105?9:t<.20?10:t<.34?11:t<.48?12:13;
}
export const EMMA_REVIEW_TIMES=[.06,.22,.40,.58,.74,.87,.975,1.075].map(t=>t/1.12*PITCH_WINDUP_SECONDS).concat([0,.07,.15,.27,.41,.78].map(t=>PITCH_WINDUP_SECONDS+t));
