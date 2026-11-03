import test from 'node:test';import assert from 'node:assert/strict';
import {RIG_FIELD_CAST,FIELD_MOTION_ASSETS,sampleFieldLocomotion,fieldLocomotionPose,fieldMotionDirection} from './field-motion.mjs';
import {GroundDefense} from './defense-play.mjs';import {liveFieldPose} from './live-field-art.mjs';
const id='coral-club-emma',keys=['home-first','first-second','second-third','third-home'];
const clip={id,teamId:'coral-club',throws:'L',gloveHand:'R',scale:.96,period:.64,settleDuration:.4,stopRunPhase:.5,asset:'reviewOnly',frameSize:[128,160],atlasSize:[2048,1920],directions:Object.fromEntries(keys.map((k,row)=>[k,{row,root:[64,146]}])),frames:keys.flatMap((direction,row)=>['run','ready','settle'].flatMap(action=>Array.from({length:action==='run'?16:action==='settle'?9:1},(_,index)=>({direction,action,index,cell:[index*128,(row+({run:0,ready:4,settle:8}[action]))*160,128,160],glove:[42,80],hand:[64,78]}))))};
const p={id,throws:'L',gloveHand:'R',point:{x:0,y:0},motion:{x:10,y:10},motionEndAt:2,moving:true};const s={teamId:'coral-club',clock:1.99,ball:{x:1,y:1},ballOwnerId:null};
test('field approved field registry is connected',()=>{assert.ok(Object.keys(RIG_FIELD_CAST).length>0);assert.ok(Object.keys(FIELD_MOTION_ASSETS).length>0);assert.equal(fieldLocomotionPose(s,p).source,'shared-3d-field-locomotion');});
test('four real field camera quadrants retain positive scales and hand ownership',()=>{
 for(const [i,motion]of [{x:1,y:1},{x:-1,y:1},{x:-1,y:-1},{x:1,y:-1}].entries()){
  assert.equal(fieldMotionDirection(motion),keys[i]);const pose=sampleFieldLocomotion(clip,s,{...p,motion});assert.equal(pose.camera,keys[i]);assert.equal(pose.throws,'L');assert.equal(pose.gloveHand,'R');assert.ok(pose.scale>0);assert.deepEqual([pose.glove[0]-pose.rect[0],pose.hand[0]-pose.rect[0]],[42,64]);
 }
 assert.equal(sampleFieldLocomotion(clip,s,{...p,throws:'R'}),null);assert.equal(sampleFieldLocomotion(clip,s,{...p,id:'navy-stars-mia'}),null);assert.equal(sampleFieldLocomotion(clip,{...s,teamId:'navy-stars'},p),null);
});
test('arrival-aligned run hands off to matching stop phase and holds heading',()=>{
 const end=sampleFieldLocomotion(clip,{...s,clock:2},{...p,moving:false});assert.equal(end.action,'settle');assert.equal(end.frameIndex,0);
 const middle=sampleFieldLocomotion(clip,{...s,clock:2.2},{...p,moving:false});assert.equal(middle.frameIndex,4);
 const ready=sampleFieldLocomotion(clip,{...s,clock:2.41,ball:{x:-10,y:-10}},{...p,moving:false});assert.equal(ready.action,'ready');assert.equal(ready.camera,'home-first');
 assert.equal(sampleFieldLocomotion(clip,{...s,ballOwnerId:id},p),null);assert.equal(sampleFieldLocomotion(clip,s,{...p,tagging:true}),null);
 assert.deepEqual(sampleFieldLocomotion(clip,s,p),sampleFieldLocomotion(clip,s,p),'paused clock is deterministic');
});
test('field sampler does not replace gather, possession or unsupported throws',()=>{
 RIG_FIELD_CAST[id]=clip;try{
  const state={...s,players:[p],fielderId:id,phase:'approach'};assert.equal(liveFieldPose(state,p).source,'shared-3d-field-locomotion');
  assert.notEqual(liveFieldPose({...state,phase:'gather'},p)?.source,'shared-3d-field-locomotion');
  assert.equal(liveFieldPose({...state,phase:'throw',throwFromId:id,throwStart:{x:0,y:0},throwEnd:{x:-10,y:0}},p),null);
 }finally{delete RIG_FIELD_CAST[id];}
});
test('defense exposes committed motion clocks for approach and carry',()=>{
 const play=new GroundDefense();for(const player of play.state.players){assert.ok(Number.isFinite(player.motionStartAt));assert.ok(Number.isFinite(player.motionEndAt));}
});
