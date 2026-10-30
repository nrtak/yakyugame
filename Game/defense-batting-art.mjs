// MOUND+THIRD camera. Opposite-side approved art remains in opposing-art.mjs;
// it is not reflected or silently relabeled for this camera.
import{referenceArtworkPose,defensivePitcherPoint}from'./pitching-art.mjs';
import{SWING_LEAD}from'./engine.mjs';
const emmaReference=referenceArtworkPose('defenseBatemmaReady',[1024,1536],[232,8,844,1486],945,59,492),emmaFoot=defensivePitcherPoint(emmaReference,[430,1472]);
export const DEFENSE_BATTING_ASSETS={};
const phases=['ready','contact','follow'];
export const DEFENSE_BATTING_CAST={
 'coral-club-emma':{hand:'R',prefix:'defenseBatemma',camera:'LOW-REAR',world:[emmaFoot.x,emmaFoot.y],scale:emmaReference.scale,
  ready:{file:'assets/scene-reference-emma-bat-ready-v2.png',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[430,1472]}},
 'navy-stars-ryan':{hand:'R',prefix:'defenseBatryan',world:[1230,560],scale:.30,
  ready:{file:'assets/scene-defense-ryan-bat-ready-third-v1.png',sourceWidth:1227,rect:[0,0,1227,1282],anchor:[500,1200]}}
};
for(const cast of Object.values(DEFENSE_BATTING_CAST))for(const phase of phases)if(cast[phase])DEFENSE_BATTING_ASSETS[cast.prefix+phase]=cast[phase].file;
export function defenseBatterPose(id,hand,frame){
 const cast=DEFENSE_BATTING_CAST[id],phase=frame===3?'follow':frame===1||frame===2?'contact':'ready',p=cast?.[phase];
 if(!p||cast.hand!==hand)return null;
 return{...p,asset:cast.prefix+phase,hand,phase,camera:cast.camera??'MOUND+THIRD',gaze:'toward-pitcher',world:cast.world,scale:cast.scale};
}
export function defenseBatterKeys(id){const cast=DEFENSE_BATTING_CAST[id];return cast?phases.filter(p=>cast[p]).map(p=>cast.prefix+p):[];}
// These authored drawings represent impact and the later finish. A contact
// drawing is not a loading pose95ms before the scoring instant.
export function defensiveBatterFrame(s){
 if(s.swingAt===null||s.swingAt===undefined)return 0;
 const t=s.elapsed-s.swingAt+(['hit','result'].includes(s.phase)?s.clock:0)+1e-8;
 return t<SWING_LEAD?0:t<.24?2:t<.64?3:0;
}
