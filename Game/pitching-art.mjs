// Separate defensive camera drawings. The old batting camera has its own art.
// Positive uniform scales only; hands and cameras are never reflected.
import{pitcherFrame}from'./scene-engine.mjs';
export const DEFENSIVE_PITCH_ASSETS={defensePitchPark:'assets/scene-defense-pitching-park-v2.png',defenseRyanIdle:'assets/scene-reference-ryan-idle-v1.png'};
// Lateral camera parallax in the painted scene: move the near pitcher left
// while keeping the distant plate/batter/catcher registration fixed. No sprite
// reflection, limb deformation or per-phase foot translation is involved.
export const DEFENSIVE_PITCH_CAMERA={rightwardShift:85};
// The user reaffirmed this low rear, full-painted composition on October 28.
// One uniform reference-camera registration is used; no body pieces are warped.
export function referenceArtworkPose(asset,size,bbox,centerX,top,height){
 const cover=960/941,offset=(1600-1672*cover)/2,scale=height/(bbox[3]-bbox[1])*cover;
 return{asset,size,sourceWidth:size[0],rect:[0,0,...size],anchor:[(bbox[0]+bbox[2])/2,bbox[3]],world:[centerX*cover+offset,(top+height)*cover],scale};
}
const ryanIdle=referenceArtworkPose('defenseRyanIdle',[1024,1536],[134,34,892,1502],480,110,765);
// A constant foreground offset keeps the batter's face visible at follow-through.
// It applies to idle, pivot, landing and release together, never per phase.
ryanIdle.world[0]-=80+DEFENSIVE_PITCH_CAMERA.rightwardShift;
const ryanPivot=defensivePitcherPoint(ryanIdle,[772,1491]),ryanScale=.68;
ryanIdle.anchor=[772,1491];ryanIdle.world=[ryanPivot.x,ryanPivot.y];
const ryanLanding=[ryanPivot.x+(990-440)*ryanScale,ryanPivot.y+(1060-1163)*ryanScale];
const phases=['set','lift','stride','release','recovery','acceleration','deceleration','legSwing','finish','armBack'];
for(const phase of phases.slice(0,5))DEFENSIVE_PITCH_ASSETS['defenseRyan'+phase]='assets/scene-defense-ryan-'+phase+'-v2.png';
DEFENSIVE_PITCH_ASSETS.defenseRyanrelease='assets/scene-defense-ryan-release-v3.png';
DEFENSIVE_PITCH_ASSETS.defenseRyanacceleration='assets/scene-defense-ryan-acceleration-v1.png';
DEFENSIVE_PITCH_ASSETS.defenseRyandeceleration='assets/scene-defense-ryan-deceleration-v1.png';
DEFENSIVE_PITCH_ASSETS.defenseRyanlegSwing='assets/scene-defense-ryan-leg-swing-v2.png';
DEFENSIVE_PITCH_ASSETS.defenseRyanfinish='assets/scene-defense-ryan-finish-v3.png';
DEFENSIVE_PITCH_ASSETS.defenseRyanarmBack='assets/scene-defense-ryan-arm-back-v1.png';
for(const [i,version]of [5,4,3,5,4].entries())DEFENSIVE_PITCH_ASSETS['defenseEmma'+phases[i]]='assets/scene-defense-emma-'+phases[i]+'-v'+version+'.png';
const ryan=[
 {size:[1223,1286],rect:[440,85,470,1125],anchor:[555,1182],world:[340,900],support:'R',hand:[797,359],otherFoot:[745,1110]},
 {size:[1222,1287],rect:[460,110,450,1090],anchor:[665,1167],world:[340,900],support:'R',hand:[756,353]},
 {size:[1230,1278],rect:[265,113,850,1080],anchor:[440,1163],world:[340,900],support:'R',hand:[330,211],landing:[990,1060]},
 {size:[1189,1323],rect:[0,0,1189,1323],anchor:[905,1202],world:[725,827.9],scale:.56,support:'L',hand:[1168,214]},
 {size:[1223,1286],rect:[148,123,1040,1080],anchor:[925,1172],world:[725,827.9],support:'L',hand:[1132,701],rightFoot:[240,790],rightFootGrounded:false},
 {size:[1189,1323],rect:[0,0,1189,1323],anchor:[1018,1219],world:[725,827.9],scale:.56,support:'L',hand:[795,83],containsBall:true},
 {size:[1024,1536],rect:[0,0,1024,1536],anchor:[849,1312],world:[725,827.9],scale:.51,support:'L',hand:[953,950]},
 {size:[1223,1286],rect:[0,0,1223,1286],anchor:[630,1235],world:[725,827.9],scale:.68,support:'L',hand:[1055,1000],rightFoot:[840,1090],rightFootGrounded:false},
 {size:[1223,1286],rect:[0,0,1223,1286],anchor:[440,1235],world:[725,827.9],scale:.56,support:'L',hand:[1068,914],rightFoot:[920,1145],rightFootGrounded:true,otherFoot:[920,1145]},
 {size:[1230,1278],rect:[0,0,1230,1278],anchor:[430,1185],world:[340,900],support:'R',hand:[115,304],ballVisible:true}
];
// Source construction owns each support sole. The pivot is now the right shoe
// in the approved rear idle; the left landing remains fixed after the stride.
for(const p of ryan)p.world=p.support==='R'?[ryanPivot.x,ryanPivot.y]:[...ryanLanding];
const emma=[
 {size:[1189,1323],rect:[410,60,520,1200],anchor:[540,1232],world:[330,900],support:'L',hand:[484,337],otherFoot:[762,1154]},
 {size:[1189,1323],rect:[235,5,680,1270],anchor:[573,1248],world:[330,900],support:'L',hand:[423,338]},
 {size:[1190,1322],rect:[235,35,855,1225],anchor:[435,1225],world:[330,900],support:'L',hand:[306,110],landing:[930,1082]},
 {size:[1189,1323],rect:[225,25,785,1215],anchor:[908,1205],world:[646.8,808.48],support:'R',hand:[848,35]},
 {size:[1189,1323],rect:[225,45,805,1210],anchor:[763,1220],world:[646.8,808.48],support:'R',hand:[990,711]}
];
for(const p of emma)p.world[0]-=DEFENSIVE_PITCH_CAMERA.rightwardShift;
export const DEFENSIVE_PITCH_CAST={
 'navy-stars-ryan':{throws:'R',gloveHand:'L',prefix:'defenseRyan',poses:ryan,scale:ryanScale,idle:{...ryanIdle,support:'R',containsBall:true,ballVisible:false,phase:'idle',hand:[763,864],otherFoot:[237,1483]}},
 'coral-club-emma':{throws:'L',gloveHand:'R',prefix:'defenseEmma',poses:emma,scale:.64}
};
export function defensivePitcherIdle(id,hand){
 const cast=DEFENSIVE_PITCH_CAST[id];if(!cast?.idle||cast.throws!==hand)return null;
 return{...cast.idle,throws:cast.throws,gloveHand:cast.gloveHand};
}
export function defensivePitcherPose(id,hand,frame){
 const cast=DEFENSIVE_PITCH_CAST[id],p=cast?.poses[frame];
 if(!p||cast.throws!==hand)return null;
 return{...p,asset:cast.prefix+phases[frame],sourceWidth:p.size[0],scale:p.scale??cast.scale,
  phase:phases[frame],throws:cast.throws,gloveHand:cast.gloveHand,
  containsBall:p.containsBall??false,ballVisible:!p.containsBall&&(p.ballVisible??frame===2)};
}
// Corrective drawings are specific to Ryan's low rear camera. Other pitchers
// and the separate batting camera retain their own phase selection.
export function defensivePitcherFrame(s){
 if(s.pitcherId!=='navy-stars-ryan'||s.pitcherHand!=='R')return pitcherFrame(s);
 if(s.phase==='windup')return s.clock<.16?0:s.clock<.36?1:s.clock<.51?9:s.clock<.63?2:5;
 if(s.phase==='flight')return s.elapsed<.055?3:s.elapsed<.14?6:s.elapsed<.30?4:s.elapsed<.50?7:8;
 if(['hit','result'].includes(s.phase))return 8;
 return 0;
}
export function defensivePitcherPoint(p,point){return{x:p.world[0]+(point[0]-p.anchor[0])*p.scale,y:p.world[1]+(point[1]-p.anchor[1])*p.scale};}
export function defensiveRelease(hand){
 const id=hand==='R'?'navy-stars-ryan':'coral-club-emma',p=defensivePitcherPose(id,hand,3);
 return p?defensivePitcherPoint(p,p.hand):null;
}
