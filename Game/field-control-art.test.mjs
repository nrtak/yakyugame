import test from 'node:test';import assert from 'node:assert/strict';
import {RIG_FIELD_CONTROL_CAST,FIELD_CONTROL_ASSETS,sampleFieldControl,fieldControlPose} from './field-control-art.mjs';
import {GroundDefense} from './defense-play.mjs';import {liveFieldPose,liveBallPoint,poseLandmark,poseGround} from './live-field-art.mjs';
const id='coral-club-emma',keys=['home-first','first-second','second-third','third-home'];
const clip={id,teamId:'coral-club',throws:'L',gloveHand:'R',scale:.96,prepLead:.36,settleDuration:.4,asset:'reviewOnly',atlasSize:[2432,1280],directions:Object.fromEntries(keys.map((k,row)=>[k,{row,root:[64,146]}])),frames:keys.flatMap((direction,row)=>['gather','transfer'].flatMap(action=>Array.from({length:action==='gather'?19:17},(_,index)=>({direction,action,index,cell:[index*128,(row+(action==='transfer'?4:0))*160,128,160],glove:[42,80],hand:[action==='transfer'&&index>0?65:42,80]}))))};
const p={id,throws:'L',gloveHand:'R',point:{x:-10,y:50},motion:{x:0,y:0},motionEndAt:0,moving:false},base={teamId:'coral-club',clock:4,ball:{x:-10,y:50,z:0},phase:'gather',players:[p],fielderId:id,ballOwnerId:id,possession:'fielding-glove',fieldingOrigin:{x:0,y:0},fieldingTouchAt:4,fieldingCollectAt:4.18};
test('field-control approved registry retains exact identities',()=>{assert.ok(Object.keys(RIG_FIELD_CONTROL_CAST).length>0);assert.ok(Object.keys(FIELD_CONTROL_ASSETS).length>0);assert.equal(fieldControlPose(base,p).source,'shared-3d-field-control');});
test('pickup contact and bare-hand extraction use committed play clocks',()=>{
 assert.equal(sampleFieldControl(clip,{...base,clock:3.63,phase:'approach',ballOwnerId:null},p),null);
 const contact=sampleFieldControl(clip,base,p);assert.equal(contact.action,'gather');assert.equal(contact.frameIndex,12);assert.equal(contact.camera,'third-home');assert.equal(contact.gloveHand,'R');assert.equal(contact.throws,'L');
 const funnel=sampleFieldControl(clip,{...base,clock:4.18,phase:'secured'},p);assert.equal(funnel.frameIndex,18);
 const transfer=sampleFieldControl(clip,{...base,clock:4.4,phase:'transfer',throwFromId:id,transferStartAt:4.2,transferEndAt:4.48,possession:'throwing-hand'},p);assert.equal(transfer.action,'transfer');assert.equal(transfer.frameIndex,11);assert.equal(transfer.containsBall,false);
});
test('late arrivals, instant turns, wrong identities and catching/throwing never use pickup art',()=>{
 for(const actor of [{...p,throws:'R'},{...p,gloveHand:'L'},{...p,id:'navy-stars-mia'},{...p,moving:true},{...p,tagging:true},{...p,motion:{x:1,y:1},motionEndAt:0},{...p,motion:{x:1,y:-1},motionEndAt:3.5}])assert.equal(sampleFieldControl(clip,base,actor),null);
 for(const state of [{...base,teamId:'navy-stars'},{...base,airCatch:true},{...base,phase:'throw'},{...base,phase:'received'},{...base,phase:'carry'}])assert.equal(sampleFieldControl(clip,state,p),null);
});
test('live ball meets the right glove at contact and follows left hand during transfer',()=>{
 RIG_FIELD_CONTROL_CAST[id]=clip;try{
  const before={...base,clock:4,phase:'approach',ballOwnerId:null,possession:'free'},pose=liveFieldPose(before,p),poses=new Map([[id,pose]]);assert.equal(pose.source,'shared-3d-field-control');assert.deepEqual(liveBallPoint(before,poses),poseLandmark(pose,poseGround(pose,p)));
  const transfer={...base,clock:4.4,phase:'transfer',throwFromId:id,transferStartAt:4.2,transferEndAt:4.48,possession:'throwing-hand'},hand=liveFieldPose(transfer,p);assert.deepEqual(liveBallPoint(transfer,new Map([[id,hand]])),poseLandmark(hand,poseGround(hand,p),'hand'));
  assert.equal(liveFieldPose({...transfer,phase:'throw',throwStart:{x:0,y:0},throwEnd:{x:-5,y:0}},p),null);
 }finally{delete RIG_FIELD_CONTROL_CAST[id];}
});
test('defense exposes glove contact and transfer clocks without changing duration',()=>{
 const play=new GroundDefense();let s=play.state;assert.ok(Math.abs(s.fieldingCollectAt-s.fieldingTouchAt-.18)<1e-8);assert.deepEqual(s.fieldingOrigin,{x:0,y:0});while(!play.canThrow)play.step(.01);play.throwTo('1B');s=play.state;assert.ok(Math.abs(s.transferEndAt-s.transferStartAt-.28)<1e-8);
});
