import test from 'node:test';import assert from 'node:assert/strict';
import {GroundDefense} from './defense-play.mjs';import {liveRunnerPose} from './running-art.mjs';
import {liveFieldPose,liveBallPoint,poseLandmark,fieldProject} from './live-field-art.mjs';
test('Emma runs to first through both reviewed strides and arrival without reusing rejected B',()=>{
 const play=new GroundDefense({batterId:'coral-club-emma'});let s=play.state,r=s.runners.find(r=>r.id==='coral-club-emma');assert.equal(liveRunnerPose(s,r).action,'runA');play.step(.16);s=play.state;r=s.runners.find(r=>r.id==='coral-club-emma');assert.equal(liveRunnerPose(s,r).asset,'emmaRunB');while(play.clock<r.arriveAt)play.step(.05);s=play.state;r=s.runners.find(r=>r.id==='coral-club-emma');assert.equal(liveRunnerPose(s,r).action,'arrival');assert.equal(liveRunnerPose(s,{...r,from:1,to:2}),null);assert.equal(liveRunnerPose(s,{...r,id:'navy-stars-emma'}),null);
});
test('Violet throws toward first with R hand and ball follows the release landmark',()=>{
 const p={id:'navy-stars-lily',position:'C',throws:'R',point:{x:0,y:0}},receiver={id:'navy-stars-sora',point:{x:60,y:60}},s={teamId:'navy-stars',players:[p,receiver],throwFromId:p.id,throwToId:receiver.id,phase:'throw',possession:'free',ball:{x:0,y:0,z:0},throwProgress:0};
 const pose=liveFieldPose(s,p);assert.equal(pose.asset,'navyCatcherThrow');assert.equal(pose.gloveHand,'L');assert.deepEqual(liveBallPoint(s,new Map([[p.id,pose]])),poseLandmark(pose,fieldProject(p.point),'hand'));assert.equal(liveFieldPose(s,{...p,throws:'L'}),null);assert.equal(liveFieldPose({...s,players:[p,{...receiver,point:{x:-60,y:60}}]},p),null);
});
