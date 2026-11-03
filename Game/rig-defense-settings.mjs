import {APPROVED_RIG_CLIPS} from './approved-rig-data.mjs';
// The rules and renderer share the timing of each approved native action.
// GroundDefense can still be used with explicit clocks in isolated fixtures.
export function rigDefenseSettings(teamId){
 const throwSetupById={},tagZoneById={};
 for(const family of['throw','relay','pivot'])for(const c of Object.values(APPROVED_RIG_CLIPS[family]))if(c.teamId===teamId)throwSetupById[c.id]=Math.max(throwSetupById[c.id]??0,c.setupDuration);
 for(const c of Object.values(APPROVED_RIG_CLIPS.tag))if(c.teamId===teamId)tagZoneById[c.id]=structuredClone(c.tagRule);
 return{throwSetupById,tagZoneById};
}
