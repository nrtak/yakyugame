import test from 'node:test';import assert from 'node:assert/strict';
import {GroundDefense} from './defense-play.mjs';import {liveRunnerPose} from './running-art.mjs';
import {liveFieldPose,liveBallPoint,poseLandmark,fieldProject} from './live-field-art.mjs';
test('Emma uses her approved four-camera native run and rejects unknown identities',()=>{const r={id:'coral-club-emma',from:0,to:1,arriveAt:4.45};assert.equal(liveRunnerPose({clock:0},r).asset,'rigruncoralclubemma');assert.equal(liveRunnerPose({clock:0},r).action,'run');assert.equal(liveRunnerPose({clock:4.45},r).action,'overrun');assert.equal(liveRunnerPose({clock:0},{...r,from:1,to:2}).camera,'first-second');assert.equal(liveRunnerPose({clock:0},{...r,id:'missing'}),null);});
test('Violet throws toward first with R hand and ball follows the release landmark',()=>{
 const p={id:'navy-stars-lily',position:'C',throws:'R',point:{x:0,y:0}},receiver={id:'navy-stars-sora',point:{x:60,y:60}},s={teamId:'navy-stars',players:[p,receiver],throwFromId:p.id,throwToId:receiver.id,phase:'throw',possession:'free',ball:{x:0,y:0,z:0},throwProgress:0};
 const pose=liveFieldPose(s,p);assert.equal(pose.asset,'navyCatcherThrow');assert.equal(pose.gloveHand,'L');assert.deepEqual(liveBallPoint(s,new Map([[p.id,pose]])),poseLandmark(pose,fieldProject(p.point),'hand'));assert.equal(liveFieldPose(s,{...p,throws:'L'}),null);assert.equal(liveFieldPose({...s,players:[p,{...receiver,point:{x:-60,y:60}}]},p),null);
});
