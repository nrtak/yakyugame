import {fieldDisplayScale} from './field-scaling.mjs';
// Pose coordinates belong to a movement template; appearance variants share
// them only after their own image and camera review. Never reflect a template.
export const FIELD_TEMPLATE_R_FRONT={
 id:'right-throw-front-v2',throws:'R',gloveHand:'L',sourceWidth:1254,
 poses:{
  ready:{rect:[35,25,375,385],anchor:[225,390],glove:[238,310],hand:[220,293]},
  runA:{rect:[475,0,325,405],anchor:[651,395],glove:[740,150],hand:[560,165]},
  runB:{rect:[890,0,310,405],anchor:[1055,390],glove:[1115,194],hand:[944,172]},
  gather:{rect:[25,505,390,300],anchor:[225,789],glove:[235,770],hand:[225,712]},
  transfer:{rect:[475,405,325,410],anchor:[636,805],glove:[605,570],hand:[586,540],mask:[[475,405],[800,405],[800,815],[700,815],[700,790],[600,790],[600,815],[475,815]]},
  throw:{rect:[830,410,415,410],anchor:[1175,805],glove:[1096,600],hand:[1206,513],direction:'right'},
  receive:{rect:[55,825,345,425],anchor:[220,1235],glove:[299,925],hand:[167,954]},
  catch:{rect:[475,795,330,459],anchor:[630,1235],glove:[662,851],hand:[567,912],mask:[[600,795],[710,795],[710,838],[805,838],[805,1254],[475,1254],[475,838],[600,838]]},
  recovery:{rect:[900,795,305,459],anchor:[1052,1235],glove:[1070,1040],hand:[980,1050],mask:[[960,795],[1135,795],[1135,838],[1205,838],[1205,1254],[900,1254],[900,838],[960,838]]}
 }
};
export const FIELD_TEMPLATES={[FIELD_TEMPLATE_R_FRONT.id]:FIELD_TEMPLATE_R_FRONT};
// Review gallery only until the complete sheet passes glove and camera checks.
export const FIELD_REVIEW_CAST={
 'navy-stars-ken':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'assets/scene-navy-ken-field-atlas-v2.png',status:'camera-review-pending'}
};
// Exact sheet approved by the user on October 22. Camera selection is guarded
// separately; approval of this drawing never authorizes reflecting its hands.
export const APPROVED_FIELD_CAST={
 'navy-stars-ken':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'navyKenField',scale:.34},
 'navy-stars-dylan':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'navyDylanField',scale:.34},
 'coral-club-ken':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'coralKenField',scale:.34,poses:{throw:{...FIELD_TEMPLATE_R_FRONT.poses.throw,rect:[830,410,424,410]}}},
 'coral-club-noah':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'coralNoahField',scale:.34,poses:{throw:{...FIELD_TEMPLATE_R_FRONT.poses.throw,rect:[830,410,424,410]}}}
};
// Appearance-only variants of the same approved front-facing movement model.
export const APPROVED_FIELD_ASSETS={};
for(const [id,file] of [
 ['coral-club-dylan','coral-club-dylan-field-atlas-v1'],
 ['coral-club-lily','coral-club-lily-field-atlas-v1'],
 ['coral-club-theo','coral-club-theo-field-atlas-v1'],
 ['navy-stars-noah','navy-stars-noah-field-atlas-v1'],
 ['navy-stars-theo','navy-stars-theo-field-atlas-v1'],
 ['navy-stars-sora','navy-stars-sora-field-atlas-v1'],
 ['navy-stars-emma','navy-stars-emma-field-atlas-v1'],
 ['navy-stars-ryan','navy-stars-ryan-field-atlas-v1']
]){
 const asset='field'+id.replaceAll('-','');
 APPROVED_FIELD_ASSETS[asset]='assets/scene-'+file+'.png';
 APPROVED_FIELD_CAST[id]={template:FIELD_TEMPLATE_R_FRONT.id,asset,scale:.34,
  poses:{throw:{...FIELD_TEMPLATE_R_FRONT.poses.throw,rect:[830,410,424,410]}}};
}
// The new left-throwing sheet currently supplies the inspected fly-catch view.
// Its other actions remain unavailable until clean, isolated crops are ready.
const leftCatch={rect:[1005,0,531,1024],anchor:[1170,1000],glove:[1120,110],hand:[1435,225],
 mask:[[1005,0],[1536,0],[1536,1024],[1080,1024],[1080,920],[1100,820],[1050,600],[1005,520]]};
FIELD_TEMPLATES['left-throw-catch-front-v3']={id:'left-throw-catch-front-v3',throws:'L',gloveHand:'R',sourceWidth:1536,poses:{catch:leftCatch}};
for(const [id,version]of [['coral-club-emi',3],['coral-club-emma',1],['coral-club-mia',3],['navy-stars-mia',3]]){
 const asset='field'+id.replaceAll('-','');APPROVED_FIELD_ASSETS[asset]='assets/scene-'+id+'-field-three-v'+version+'.png';
 APPROVED_FIELD_CAST[id]={template:'left-throw-catch-front-v3',asset,scale:.14};
}
APPROVED_FIELD_ASSETS.navyClaraGather='assets/scene-navy-stars-mia-field-front-gather-capfix-v2.png';
APPROVED_FIELD_CAST['navy-stars-mia'].poses={gather:{asset:'navyClaraGather',sourceWidth:1317,rect:[0,0,1317,1194],anchor:[690,1120],glove:[665,1000],hand:[835,980],scale:.11}};
// October30 approved isolated left-throw transfers. Each full image has its own
// registration; the baked single baseball remains in the external LEFT fingers.
for(const [id,asset,anchor,glove,hand]of [
 ['coral-club-emma','coralEmmaTransfer',[670,1618],[590,685],[635,680]],
 ['coral-club-mia','coralMiaTransfer',[660,1608],[520,660],[574,660]],
 ['coral-club-emi','coralEmiTransfer',[670,1608],[600,750],[656,736]],
 ['navy-stars-mia','navyClaraTransfer',[680,1615],[620,700],[710,697]]
]){
 APPROVED_FIELD_ASSETS[asset]='assets/scene-'+id+'-transfer-short-hair-v1.png';
 APPROVED_FIELD_CAST[id].poses={...APPROVED_FIELD_CAST[id].poses,transfer:{asset,sourceWidth:1280,rect:[0,0,1280,1792],anchor,glove,hand,scale:.1,containsBall:true,camera:'front'}};
}
APPROVED_FIELD_ASSETS.navyClaraThrow='assets/scene-navy-stars-mia-throw-short-hair-v1.png';
APPROVED_FIELD_CAST['navy-stars-mia'].poses.throw={asset:'navyClaraThrow',sourceWidth:1450,rect:[0,0,1450,1573],anchor:[500,1415],glove:[480,590],hand:[1280,430],scale:.114,direction:'right',camera:'front'};
// Approved October30 own Coral variants of the same LEFT-throw construction.
// The live selector still rejects targets on the opposite side of this view.
for(const [id,key,height,anchor,glove,hand]of [
 ['coral-club-emma','coralEmmaThrow',1508,[510,1325],[490,590],[1235,425]],
 ['coral-club-mia','coralMiaThrow',1507,[510,1305],[490,590],[1210,440]],
 ['coral-club-emi','coralEmiThrow',1507,[500,1330],[480,590],[1230,440]]
]){
 APPROVED_FIELD_ASSETS[key]='assets/scene-'+id+'-field-throw-10-30-v1.png';
 APPROVED_FIELD_CAST[id].poses.throw={asset:key,sourceWidth:1403,rect:[0,0,1403,height],anchor,glove,hand,scale:.12,direction:'right',camera:'front'};
}
export function approvedFieldPose(id,throwHand,action){
 const cast=APPROVED_FIELD_CAST[id],template=FIELD_TEMPLATES[cast?.template],pose=cast?.poses?.[action]??template?.poses[action];
 if(!cast||template.throws!==throwHand||!pose)return null;
 const asset=pose.asset??cast.asset,scale=fieldDisplayScale(asset,action,pose.scale??cast.scale,pose.asset?null:template.id);
 return{...pose,asset,sourceWidth:pose.sourceWidth??template.sourceWidth,scale,throws:template.throws,gloveHand:template.gloveHand,action};
}
export function fieldAtlasPose(id,throwHand,action){
 const cast=FIELD_REVIEW_CAST[id],template=FIELD_TEMPLATES[cast?.template];
 if(!cast||template.throws!==throwHand||!template.poses[action])return null;
 return {...template.poses[action],asset:cast.asset,sourceWidth:template.sourceWidth,throws:template.throws,gloveHand:template.gloveHand};
}
export function atlasLandmark(pose,ground,which='glove',scale=.34){
 const at=pose[which];if(!at)return null;
 return{x:ground.x+(at[0]-pose.anchor[0])*scale,y:ground.y+(at[1]-pose.anchor[1])*scale};
}
