import test from 'node:test';import assert from 'node:assert/strict';
import {sampleRigRunner} from './rig-running.mjs';
import {GroundDefense,BASE_POINTS,runThroughMotion} from './defense-play.mjs';
import {liveRunnerPose,runningCoverage,runningArtKeysForDefense} from './running-art.mjs';
const clip={asset:'ownRun',frameSize:[128,160],atlasSize:[2048,1920],scale:.96,period:.64,arrivalDuration:.64,legs:Object.fromEntries(['0:1','1:2','2:3','3:4'].map((k,row)=>[k,{key:k,row,root:[64,145],contact:[80,135]}]))};
test('Ryan owns four runtime base legs while another identity stays an explicit gap',()=>{
 assert.deepEqual(runningCoverage('navy-stars-ryan'),['home-to-first','1:2','2:3','3:4']);
 for(let from=0;from<4;from++)assert.equal(liveRunnerPose({clock:2},{id:'navy-stars-ryan',from,to:from+1,arriveAt:4.45}).asset,'ryanRigRun');
 assert.equal(liveRunnerPose({clock:2},{id:'coral-club-emi',from:1,to:2,arriveAt:4.45}),null);
 assert.ok(runningArtKeysForDefense('coral-club').includes('ryanRigRun'));assert.ok(!runningArtKeysForDefense('navy-stars').includes('ryanRigRun'));
});
test('shared rig follows each camera, alternates strides, and freezes on the game clock',()=>{
 for(let from=0;from<4;from++){
  const r={from,to:from+1,arriveAt:4.45},s={clock:2};
  const a=sampleRigRunner(clip,s,r),b=sampleRigRunner(clip,{clock:2.32},r);
  assert.equal(a.camera,from+':'+(from+1));assert.equal(a.asset,'ownRun');assert.ok(a.scale>0);
  assert.equal((b.frameIndex-a.frameIndex+16)%16,8);assert.deepEqual(sampleRigRunner(clip,s,r),a);
  assert.equal(sampleRigRunner(clip,{clock:4.45},r).action,from===0||from===3?'overrun':'arrival');
 }
});
test('base contact is continuous and bag-holding uses the incoming camera',()=>{
 for(let from=0;from<4;from++){
  const r={from,to:from+1,arriveAt:4.45},before=sampleRigRunner(clip,{clock:4.45-1e-9},r),at=sampleRigRunner(clip,{clock:4.45},r);
  const local=p=>p.anchor.map((v,i)=>v-p.rect[i]);assert.ok(Math.hypot(...local(before).map((v,i)=>v-local(at)[i]))<1e-6);
  assert.equal(sampleRigRunner(clip,{clock:4.45-1e-12},r).action,at.action);
 }
 for(let base=1;base<=3;base++){
  const p=sampleRigRunner(clip,{clock:0},{from:base,to:base,arriveAt:0});
  assert.equal(p.camera,(base-1)+':'+base);assert.equal(p.frameIndex,8);assert.equal(p.action,'arrival');
 }
 assert.equal(sampleRigRunner(clip,{clock:1},{from:0,to:1,arriveAt:4.45,out:true}),null);
});
test('first/home run-through decelerates without changing the adjudicated base contact',()=>{
 const p=new GroundDefense({teamId:'coral-club',batterId:'navy-stars-ryan',bases:['navy-stars-ken','navy-stars-dylan','navy-stars-noah'],target:{x:130,y:280},ballTravel:8});
 for(const r of [p.runners[0],p.runners.find(r=>r.to===4)]){
  const base=r.to===1?BASE_POINTS['1B']:BASE_POINTS.HOME;
  assert.deepEqual(p.runnerPoint(r,r.arriveAt),base);
  const start=runThroughMotion(r,r.arriveAt),end=runThroughMotion(r,r.arriveAt+10);
  assert.equal(start.distance,0);assert.equal(start.speed,90/r.arriveAt);assert.equal(end.speed,0);assert.ok(end.distance>0&&end.distance<=16);
  assert.deepEqual(p.runnerPoint(r,r.arriveAt+10),p.runnerPoint(r,r.arriveAt+11));
 }
 p.step(20);assert.deepEqual(p.resolution.retired,[]);assert.equal(p.resolution.runs.length,1);assert.equal(p.resolution.destinations.find(r=>r.id==='navy-stars-ryan').base,1);
});
