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
  recovery:{rect:[900,830,305,424],anchor:[1052,1235],glove:[1070,1040],hand:[980,1050]}
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
 'navy-stars-dylan':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'navyDylanField',scale:.34},
 'coral-club-ken':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'coralKenField',scale:.34,poses:{throw:{...FIELD_TEMPLATE_R_FRONT.poses.throw,rect:[830,410,424,410]}}},
 'coral-club-noah':{template:FIELD_TEMPLATE_R_FRONT.id,asset:'coralNoahField',scale:.34,poses:{throw:{...FIELD_TEMPLATE_R_FRONT.poses.throw,rect:[830,410,424,410]}}}
};
export function approvedFieldPose(id,throwHand,action){
 const cast=APPROVED_FIELD_CAST[id],template=FIELD_TEMPLATES[cast?.template];if(!cast||template.throws!==throwHand||!template.poses[action])return null;
 return{...(cast.poses?.[action]??template.poses[action]),asset:cast.asset,sourceWidth:template.sourceWidth,scale:cast.scale,throws:template.throws,gloveHand:template.gloveHand,action};
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
