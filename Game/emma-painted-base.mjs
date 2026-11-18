import {PITCH_WINDUP_SECONDS} from './engine.mjs';

// Established painted source geometry, connected locally on November 16.
export const EMMA_PAINTED_ASSETS={
 defenseEmmaRightKneeLift:'assets/scene-emma-delivery-11-16-defenseEmmaRightKneeLift.png',
 defenseEmmaFirstBaseStart:'assets/scene-emma-delivery-11-16-defenseEmmaFirstBaseStart.png',
 defenseEmmaTransition:'assets/scene-emma-delivery-11-16-defenseEmmaTransition.png',
 emmaPitchTransition:'assets/scene-emma-delivery-11-16-emmaPitchTransition.png',
 emmaPitchStartAngle:'assets/scene-emma-delivery-11-16-emmaPitchStartAngle.png',
 defenseEmmaMatched:'assets/scene-emma-delivery-11-16-defenseEmmaMatched.png',
 emmaPitchMatched:'assets/scene-emma-delivery-11-16-emmaPitchMatched.png',
 defenseEmmaMoundPark:'assets/scene-emma-delivery-11-16-defenseEmmaMoundPark.png'
};
export const EMMA_PHASES=['Set','Right knee lift','Closed stride / arm separation','Lead-foot plant / arm load','Release','Deceleration','Rear-leg carry','Returning step','Grounded finish'];
const sheets={
 rear:{size:[1205,1306],asset:'defenseEmmaMatched',scale:1.45,pivot:[400,830],
  anchors:[[140,409],[140,408],[90,409],[320,365],[285,365],[280,375],[280,385],[255,395],[267,400]],
  hands:[[225,115],[225,115],[100,70],[160,50],[307,83],[327,255],[293,268],[250,274],[245,278]],
  feet:[[265,405],[245,290],[310,368],[110,408],[80,408],[55,270],[90,220],[155,370],[140,400]]},
 front:{size:[1205,1305],asset:'emmaPitchMatched',scale:.5,pivot:[957,546],
  anchors:[[250,420],[230,420],[300,420],[105,413],[105,412],[115,413],[135,412],[110,412],[105,412]],
  hands:[[235,132],[235,132],[295,54],[242,48],[57,150],[112,286],[139,304],[160,303],[205,308]],
  feet:[[150,420],[110,320],[75,420],[320,410],[320,393],[325,277],[330,181],[220,368],[280,413]]}
};
const localToAtlas=(p,rect)=>[p[0]+rect[0],p[1]+rect[1]];
export function emmaPaintedFrame(s){
 if(s.phase==='windup'){
  const t=Math.max(0,s.clock??0)/PITCH_WINDUP_SECONDS;
  return t<.22?0:t<.48?1:t<.77?2:3;
 }
 if(!['flight','hit','result'].includes(s.phase))return 0;
 const t=Number.isFinite(s.elapsed)?Math.max(0,s.elapsed)+(['hit','result'].includes(s.phase)?Math.max(0,s.clock??0):0):Infinity;
 return t<.08?4:t<.22?5:t<.40?6:t<.62?7:8;
}
export function emmaPaintedPose(frame,view='rear'){
 const sheet=sheets[view];if(!sheet||!Number.isInteger(frame)||frame<0||frame>8)return null;
 const [w,h]=sheet.size,c=frame%3,r=Math.floor(frame/3),x=Math.round(c*w/3),y=Math.round(r*h/3);
 const rect=[x,y,Math.round((c+1)*w/3)-x,Math.round((r+1)*h/3)-y];
 const stride=sheet.anchors[2],lead=sheet.feet[2];
 const landing=[sheet.pivot[0]+(lead[0]-stride[0])*sheet.scale,sheet.pivot[1]+(lead[1]-stride[1])*sheet.scale];
 if(view==='rear'&&frame===1){
  const k=1206/402;
  return {asset:'defenseEmmaRightKneeLift',size:[402,1305/k],sourceWidth:402,rect:[0,0,402,1305/k],
   anchor:[550/k,1220/k],hand:[440/k,405/k],otherFoot:[335/k,865/k],world:[...sheet.pivot],scale:sheet.scale,
   frame,phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support:'L',feetGrounded:{L:true,R:false},containsBall:false,ballVisible:false};
 }
 if(view==='rear'&&frame<2){
  const k=1705/803,x=frame*852.5;
  const raw=frame===0?{anchor:[495,865],hand:[360,285],foot:[365,844]}:{anchor:[1240,865],hand:[1160,285],foot:[1095,605]};
  return {asset:'defenseEmmaFirstBaseStart',size:[803,922/k],sourceWidth:803,rect:[x/k,0,852.5/k,922/k],
   anchor:raw.anchor.map(v=>v/k),hand:raw.hand.map(v=>v/k),otherFoot:raw.foot.map(v=>v/k),
   world:[...sheet.pivot],scale:sheet.scale,frame,phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support:'L',
   feetGrounded:{L:true,R:frame===0},containsBall:false,ballVisible:false};
 }
 if(frame===2||frame===3){
  const late=frame===3,width=view==='rear'?1706:1705,k=width/804;
  const marks=view==='rear'?
   [{anchor:[230,840],hand:[103,445],foot:[718,747]},{anchor:[1550,815],hand:[1020,180],foot:[1120,845]}]:
   [{anchor:[605,843],hand:[745,400],foot:[260,785]},{anchor:[977,861],hand:[1450,155],foot:[1545,800]}];
  const raw=marks[late?1:0],rect=[late?402:0,0,402,922/k];
  return {asset:view==='rear'?'defenseEmmaTransition':'emmaPitchTransition',size:[804,922/k],sourceWidth:804,rect,
   anchor:raw.anchor.map(v=>v/k),hand:raw.hand.map(v=>v/k),otherFoot:raw.foot.map(v=>v/k),
   world:[...(late?landing:sheet.pivot)],scale:sheet.scale,frame,phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support:late?'R':'L',
   feetGrounded:{L:!late,R:late},containsBall:false,ballVisible:true};
 }
 if(view==='front'&&frame<2){
  // Resolution normalization only: each whole painted sprite keeps its aspect.
  const k=1705/803,x=frame*852.5;
  const raw=frame===0?{anchor:[435,824],hand:[500,245],foot:[390,865]}:{anchor:[1240,862],hand:[1305,245],foot:[1350,620]};
  return {asset:'emmaPitchStartAngle',size:[803,922/k],sourceWidth:803,rect:[x/k,0,852.5/k,922/k],
   anchor:raw.anchor.map(v=>v/k),hand:raw.hand.map(v=>v/k),otherFoot:raw.foot.map(v=>v/k),
   world:[...sheet.pivot],scale:sheet.scale,frame,phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support:'L',
   feetGrounded:{L:true,R:frame===0},containsBall:false,ballVisible:false};
 }
 return {asset:sheet.asset,size:sheet.size,sourceWidth:w,rect,anchor:localToAtlas(sheet.anchors[frame],rect),
  hand:localToAtlas(sheet.hands[frame],rect),otherFoot:localToAtlas(sheet.feet[frame],rect),
  world:frame<=2?[...sheet.pivot]:landing,scale:sheet.scale,frame,
  phase:EMMA_PHASES[frame],throws:'L',gloveHand:'R',support:frame<=2?'L':'R',
  feetGrounded:{L:frame<5||frame===8,R:frame!==1},containsBall:false,ballVisible:frame===2||frame===3};
}
export function emmaPaintedRelease(view='rear'){
 const p=emmaPaintedPose(4,view);return {x:p.world[0]+(p.hand[0]-p.anchor[0])*p.scale,y:p.world[1]+(p.hand[1]-p.anchor[1])*p.scale};
}
export const EMMA_REVIEW_TIMES=[.05,.33,.66,.96,PITCH_WINDUP_SECONDS,PITCH_WINDUP_SECONDS+.10,PITCH_WINDUP_SECONDS+.25,PITCH_WINDUP_SECONDS+.45,PITCH_WINDUP_SECONDS+.70];
export function emmaPaintedScene(t){
 const s={pitcherId:'coral-club-emma',pitcherName:'Emma',pitcherHand:'L',batterId:'navy-stars-ryan',batterName:'Ryan',batterHand:'R',catcherId:'coral-club-sora',homeTeamId:'coral-club',venue:'Coral Field',liveDefense:true,aim:{x:0,y:0},pitch:{duration:.68,x:0,y:0,bend:0},swingAt:null};
 if(t<PITCH_WINDUP_SECONDS)return {...s,phase:'windup',clock:t,elapsed:0};
 const elapsed=t-PITCH_WINDUP_SECONDS;
 return elapsed<.68?{...s,phase:'flight',clock:0,elapsed}:{...s,phase:'result',clock:elapsed-.68,elapsed:.68,pitchOutcome:{kind:'strike'}};
}
