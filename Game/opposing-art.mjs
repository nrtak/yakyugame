// Authored mound/first-base views. No reflected home-camera substitutes.
export const OPPOSING_ASSETS={},OPPOSING_CAST={};
for(const team of ['coral-club','navy-stars'])for(const name of team==='coral-club'?['emma','mia','ken','lily','dylan','noah','emi','sora','theo']:['ryan','mia','ken','lily','dylan','noah','emma','sora','theo']){
 const id=team+'-'+name,key='opposing'+id.replaceAll('-','');
 OPPOSING_ASSETS[key+'Ready']='assets/scene-'+id+'-batting-mound-ready.png';
 OPPOSING_CAST[id]={hand:id==='coral-club-theo'||id==='navy-stars-dylan'?'L':'R',ready:key+'Ready'};
}
for(const name of ['ken','dylan','noah','sora']){
 const id='coral-club-'+name;
 OPPOSING_ASSETS[OPPOSING_CAST[id].ready]='assets/scene-'+id+'-batting-mound-ready-v2.png';
}
OPPOSING_ASSETS[OPPOSING_CAST['navy-stars-lily'].ready]='assets/scene-navy-stars-lily-batting-mound-ready-v2.png';
for(const [id,phase,version]of [['coral-club-emma','contact',1],['coral-club-emma','follow',1],['coral-club-theo','contact',2],['coral-club-mia','contact',1],['coral-club-mia','follow',1],['navy-stars-ryan','contact',1],['coral-club-ken','contact',1],['coral-club-ken','follow',2],['coral-club-dylan','contact',1],['coral-club-lily','contact',1],['coral-club-lily','follow',1],['navy-stars-ryan','follow',1]]){
 const key='opposing'+id.replaceAll('-','')+phase;
 OPPOSING_ASSETS[key]='assets/scene-'+id+'-batting-mound-'+phase+'-v'+version+'.png';OPPOSING_CAST[id][phase]=key;
}
for(const [id,phases]of [['coral-club-dylan',['follow']],['coral-club-noah',['contact','follow']],['coral-club-emi',['contact','follow']],['coral-club-sora',['contact','follow']],['navy-stars-mia',['contact','follow']],['navy-stars-ken',['contact','follow']],['navy-stars-noah',['contact','follow']],['navy-stars-lily',['contact','follow']],['navy-stars-emma',['contact','follow']],['navy-stars-sora',['contact','follow']],['navy-stars-theo',['contact']],['coral-club-theo',['follow']]])for(const phase of phases){
 const key='opposing'+id.replaceAll('-','')+phase;
 OPPOSING_ASSETS[key]='assets/scene-'+id+'-batting-mound-'+phase+'-v1.png';OPPOSING_CAST[id][phase]=key;
}
for(const [id,phase,version]of [['navy-stars-dylan','contact',2],['navy-stars-dylan','follow',1],['navy-stars-theo','follow',2]]){
 const key='opposing'+id.replaceAll('-','')+phase;
 OPPOSING_ASSETS[key]='assets/scene-'+id+'-batting-mound-'+phase+'-v'+version+'.png';OPPOSING_CAST[id][phase]=key;
}
// Foot positions from each October 23 drawing, not a shared crop assumption.
const OPPOSING_PHASE_ANCHORS={
 'coral-club-ken':{contact:[805,1450],follow:[875,1440]},
 'coral-club-dylan':{contact:[800,1430],follow:[855,1455]},
 'coral-club-noah':{contact:[800,1460],follow:[865,1460]},
 'coral-club-emi':{contact:[805,1425],follow:[855,1460]},
 'coral-club-lily':{contact:[790,1435],follow:[850,1440]},
 'coral-club-sora':{ready:[805,1500],contact:[805,1410],follow:[860,1450]},
 'navy-stars-mia':{contact:[810,1430],follow:[855,1460]},
 'navy-stars-ken':{contact:[800,1430],follow:[875,1460]},
 'navy-stars-noah':{contact:[820,1425],follow:[875,1460]},
 'navy-stars-lily':{ready:[810,1500],contact:[800,1420],follow:[875,1440]},
 'navy-stars-emma':{contact:[810,1410],follow:[875,1470]},
 'navy-stars-sora':{contact:[800,1420],follow:[875,1460]},
 'navy-stars-theo':{contact:[800,1410],follow:[850,1370]},
 'navy-stars-dylan':{contact:[800,1280],follow:[875,1440]},
 'coral-club-theo':{follow:[875,1440]},
 'navy-stars-ryan':{follow:[825,1450]}
};
// Margin repairs use a smaller drawing; preserve the actor's on-field body scale.
const OPPOSING_PHASE_SCALES={'navy-stars-dylan':{contact:.30},'navy-stars-theo':{follow:.30}};
export function opposingBatterPose(id,hand,frame){
 const cast=OPPOSING_CAST[id];if(!cast||cast.hand!==hand)return null;
 const phase=frame===3?'follow':frame===1||frame===2?'contact':'ready';
 const asset=cast[phase]??(phase==='follow'?cast.contact:null)??cast.ready;
 // Stable lead-foot registration across the separate full-body drawings.
 const actual=asset===cast.ready?'ready':asset===cast.contact?'contact':'follow';
 const anchor=OPPOSING_PHASE_ANCHORS[id]?.[actual]??(hand==='L'?(actual==='contact'?[765,1415]:[805,1450]):actual==='ready'?[780,1480]:[790,1420]);
 return{asset,sourceWidth:1024,rect:[0,0,1024,1536],anchor,world:hand==='L'?[1080,535]:[740,535],scale:OPPOSING_PHASE_SCALES[id]?.[actual]??.25,phase:actual,requestedPhase:phase,hand};
}
export const CATCHER_CAST={
 'navy-stars-lily':{receive:'navyCatcherReceive',transfer:'navyCatcherTransfer',width:1190,height:1322,transferWidth:1189,transferHeight:1323},
 'coral-club-sora':{receive:'coralCatcherReceive',transfer:'coralCatcherTransfer',width:1189,height:1323,transferWidth:1024,transferHeight:1536}
};
Object.assign(OPPOSING_ASSETS,{navyCatcherReceive:'assets/scene-navy-lily-catcher-receive-v1.png',navyCatcherTransfer:'assets/scene-navy-lily-catcher-transfer-v1.png',coralCatcherReceive:'assets/scene-coral-sora-catcher-receive-v2.png',coralCatcherTransfer:'assets/scene-coral-sora-catcher-transfer-v1.png'});
OPPOSING_ASSETS.navyCatcherThrow='assets/scene-navy-lily-catcher-throw-v1.png';
OPPOSING_ASSETS.coralCatcherThrow='assets/scene-coral-club-sora-catcher-throw-v2.png';
const CATCHER_THROW_POSES={
 'navy-stars-lily':{asset:'navyCatcherThrow',sourceWidth:1325,rect:[0,0,1325,1187],anchor:[1120,1150],glove:[900,510],hand:[1280,305],scale:.13},
 'coral-club-sora':{asset:'coralCatcherThrow',sourceWidth:1325,rect:[0,0,1325,1187],anchor:[1020,1035],glove:[820,550],hand:[1110,420],scale:.26}
};
export function catcherFieldPose(id,hand,action){
 if(hand!=='R')return null;
 if(action==='throw'){const pose=CATCHER_THROW_POSES[id];return pose?{...pose,action,throws:'R',gloveHand:'L'}:null;}
 const p=catcherPose(id,action);return p?{...p,scale:action==='transfer'?.13:.11}:null;
}
export function catcherPose(id,action='receive'){
 const cast=CATCHER_CAST[id];if(!cast||!['receive','transfer'].includes(action))return null;
 const transfer=action==='transfer',w=transfer?cast.transferWidth:cast.width,h=transfer?cast.transferHeight:cast.height;
 return{asset:cast[action],sourceWidth:w,rect:[0,0,w,h],anchor:[w*.5,h*.975],world:[800,485],scale:(transfer?300:260)/h,glove:transfer?(id==='navy-stars-lily'?[710,520]:[610,590]):[780,555],throws:'R',gloveHand:'L',containsBall:transfer,action};
}
export function opposingArtKeys(batterId,catcherId){const b=OPPOSING_CAST[batterId],c=CATCHER_CAST[catcherId];return [...(b?[b.ready,b.contact,b.follow].filter(Boolean):[]),...(c?[c.receive,c.transfer]:[])];}
export function catcherAction(s){return s.phase==='result'&&['ball','strike','miss'].includes(s.pitchOutcome?.kind)&&s.clock>=.2?'transfer':'receive';}
