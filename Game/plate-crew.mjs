// Low receiving stances and the plate official for the rear pitching camera.
// All scales are uniform; no limb, head or sprite is reflected or compressed.
export const PLATE_CREW_ASSETS={
 lowCoralCatcher:'assets/scene-coral-club-sora-catcher-low-11-17-v1.png',
 lowNavyCatcher:'assets/scene-navy-stars-lily-catcher-low-11-17-v1.png',
 plateUmpire:'assets/scene-plate-umpire-11-17-v1.png'
};
const low={
 coralCatcherReceive:{asset:'lowCoralCatcher',width:1189,height:1323,glove:[780,695]},
 navyCatcherReceive:{asset:'lowNavyCatcher',width:1189,height:1323,glove:[775,735]}
};
const receiveFor={coralCatcherTransfer:'coralCatcherReceive',navyCatcherTransfer:'navyCatcherReceive'};
export function plateCrewKeys(id){return['plateUmpire',...(id==='coral-club-sora'?['lowCoralCatcher']:id==='navy-stars-lily'?['lowNavyCatcher']:[])];}
export function lowPitchingCatcher(p,zone){
 const row=low[p.asset]??low[receiveFor[p.asset]];if(!row)return null;
 const anchor=[row.width/2,row.height*.975],scale=284/1322,world=[zone.x-(row.glove[0]-anchor[0])*scale,zone.y-(row.glove[1]-anchor[1])*scale];
 if(p.action==='transfer')return{...p,world,scale:300/p.rect[3]};
 return{...p,asset:row.asset,sourceWidth:row.width,rect:[0,0,row.width,row.height],anchor,glove:[...row.glove],world,scale,throws:'R',gloveHand:'L',action:'receive',containsBall:false};
}
export function plateUmpirePose(catcherX, batterX){
 // The umpire looks past the catcher's inside shoulder from the batter's side.
 const slotX = catcherX + (batterX < catcherX ? -32 : 32);
 return{asset:'plateUmpire',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[512,1515],world:[slotX,502],scale:.225,role:'umpire'};
}
