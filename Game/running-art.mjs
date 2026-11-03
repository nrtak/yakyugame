import {APPROVED_RIG_CLIPS,APPROVED_RIG_ASSETS} from './approved-rig-data.mjs';
// Own-identity, camera-specific running drawings. Never reflect a base leg.
import {RYAN_RUN_CLIP} from './rig-running-data.mjs';
import {sampleRigRunner,rigFramePose} from './rig-running.mjs';
// Own-ID clips only. A review build may add a candidate explicitly; production
// contains only the locally registered Ryan clip until new skins are accepted.
export const RIG_RUNNING_CAST={'navy-stars-ryan':RYAN_RUN_CLIP,...APPROVED_RIG_CLIPS.run};
export const RUNNING_ASSETS={
 ryanRigRun:'assets/scene-navy-stars-ryan-rig-running-10-30-v1.png',
 emmaRunSheet:'assets/scene-coral-emma-base-running-v1.png',
 emmaRunB:'assets/scene-coral-emma-running-stride-b-v5.png',
 claraRunA:'assets/scene-navy-stars-mia-run-home-first-runA-10-30-v1.png',
 claraRunB:'assets/scene-navy-stars-mia-run-home-first-runB-10-30-v1.png',
 claraRunArrival:'assets/scene-navy-stars-mia-run-home-first-arrival-10-30-v1.png'
};
export const RUNNING_CAST={
 'navy-stars-ryan':{teamId:'navy-stars',legs:Object.fromEntries(Object.entries(RYAN_RUN_CLIP.legs).map(([key,leg])=>[key,{
  runA:rigFramePose(RYAN_RUN_CLIP,leg,'run',0,leg.root),
  runB:rigFramePose(RYAN_RUN_CLIP,leg,'run',8,leg.root),
  arrival:rigFramePose(RYAN_RUN_CLIP,leg,'arrival',8,leg.contact)
 }]))},
 'coral-club-emma':{teamId:'coral-club',legs:{'0:1':{
  runA:{asset:'emmaRunSheet',sourceWidth:1942,rect:[0,0,710,809],anchor:[425,775],scale:.18},
  runB:{asset:'emmaRunB',sourceWidth:1374,rect:[0,0,1374,1145],anchor:[760,1100],scale:.127},
  arrival:{asset:'emmaRunSheet',sourceWidth:1942,rect:[1370,0,572,809],anchor:[1685,775],scale:.18}
 }}},
 'navy-stars-mia':{teamId:'navy-stars',legs:{'0:1':{
  runA:{asset:'claraRunA',sourceWidth:942,rect:[0,0,942,956],anchor:[520,830],scale:.18},
  runB:{asset:'claraRunB',sourceWidth:1374,rect:[0,0,1374,1145],anchor:[700,1100],scale:.12},
  arrival:{asset:'claraRunArrival',sourceWidth:779,rect:[0,0,779,956],anchor:[320,835],scale:.18}
 }}}
};
for(const c of Object.values(APPROVED_RIG_CLIPS.run)){RUNNING_ASSETS[c.asset]=APPROVED_RIG_ASSETS[c.asset];RUNNING_CAST[c.id]={teamId:c.teamId,legs:Object.fromEntries(Object.entries(c.legs).map(([key,l])=>[key,{runA:rigFramePose(c,l,'run',0,l.root),runB:rigFramePose(c,l,'run',8,l.root),arrival:rigFramePose(c,l,'arrival',8,l.contact)}]))};}
export function liveRunnerPose(s,r){
 if(RIG_RUNNING_CAST[r.id])return sampleRigRunner(RIG_RUNNING_CAST[r.id],s,r);
 const leg=RUNNING_CAST[r.id]?.legs[r.from+':'+r.to];
 if(!leg||r.out)return null;
 const action=s.clock>=r.arriveAt?'arrival':Math.floor(s.clock*7)%2?'runB':'runA';
 return {...leg[action],action};
}
// The fielding club must load the opposing runners, not its own batting art.
export function runningArtKeysForDefense(teamId){
 if(!['coral-club','navy-stars'].includes(teamId))return[];
 return [...new Set(Object.values(RUNNING_CAST).filter(c=>c.teamId!==teamId).flatMap(c=>Object.values(c.legs).flatMap(leg=>Object.values(leg).map(p=>p.asset))))];
}
export function runningCoverage(id){return Object.keys(RUNNING_CAST[id]?.legs??{}).map(key=>key==='0:1'?'home-to-first':key);}
export function runningFrameDefinitions(id){return Object.entries(RUNNING_CAST[id]?.legs??{}).flatMap(([leg,poses])=>Object.entries(poses).map(([action,pose])=>({leg,action,pose})));}
