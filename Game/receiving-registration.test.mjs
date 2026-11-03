import {suspendApprovedFieldRegistries} from './test-rig-isolation.mjs';
import test from'node:test';import assert from'node:assert/strict';import{GroundDefense}from'./defense-play.mjs';import{APPROVED_FIELD_CAST}from'./field-atlas.mjs';import{liveFieldPose,poseGround,fieldProject,liveBallPoint,poseLandmark,fieldBallIsPainted}from'./live-field-art.mjs';
test('an isolated receiver keeps its authored contact foot on the bag and the live ball in its own glove',(t)=>{suspendApprovedFieldRegistries(t);
 const cast=APPROVED_FIELD_CAST['coral-club-mia'],before=cast.poses;try{
  cast.poses={...before,receive:{asset:'fixtureReceive',sourceWidth:1260,rect:[0,0,1260,1684],anchor:[650,1450],bagAnchor:[1050,1420],glove:[350,600],hand:[620,710],scale:.11,bases:['1B']}};
  const d=new GroundDefense({teamId:'coral-club',batterId:'navy-stars-ryan',target:{x:-40,y:115},runnerTime:10});d.step(d.collectAt+.01);assert.equal(d.throwTo('1B'),true);d.step(.29);const s=d.state,p=s.players.find(p=>p.id===s.throwToId),pose=liveFieldPose(s,p);assert.equal(p.id,'coral-club-mia');assert.deepEqual(pose.anchor,[1050,1420]);assert.equal(pose.bagFoot,true);assert.deepEqual(poseGround(pose,p),fieldProject(p.bagContact));
  const caught={...s,phase:'received',possession:'receiving-glove',ballOwnerId:p.id};assert.deepEqual(liveBallPoint(caught,new Map([[p.id,pose]])),poseLandmark(pose,fieldProject(p.bagContact)));
  assert.equal(liveFieldPose({...s,throwStart:{x:p.point.x+20,y:80}},p),null);assert.equal(liveFieldPose(s,{...p,covering:'3B'}),null);assert.equal(liveFieldPose(s,{...p,throws:'R'}),null);
 }finally{cast.poses=before;}
});

test('a first baseman retains the glove catch until a new throw and rejects unsupported throw-origin positions',(t)=>{suspendApprovedFieldRegistries(t);
 const cast=APPROVED_FIELD_CAST['navy-stars-sora'],before=cast.poses;try{
  cast.poses={...before,receive:{asset:'fixtureRoutineReceive',sourceWidth:1693,rect:[0,0,1693,1253],anchor:[1390,1018],bagAnchor:[1390,1018],glove:[306,424],hand:[702,516],scale:.16,bases:['1B'],fromPositions:['SS','2B','3B']}};
  const d=new GroundDefense({teamId:'navy-stars',batterId:'coral-club-emma',bases:['coral-club-ken',null,null],target:{x:-40,y:115},runnerTime:10,runnerTimes:{'coral-club-ken':12}});d.step(d.collectAt+.01);assert.equal(d.throwTo('1B'),true);
  d.step(d.throw.releaseAt-.01-d.clock);const beforeRelease=d.state,receiver=beforeRelease.players.find(p=>p.id===beforeRelease.throwToId);assert.equal(receiver.id,'navy-stars-sora');assert.notEqual(liveFieldPose(beforeRelease,receiver)?.asset,'fixtureRoutineReceive');
  d.step(d.throw.controlAt+.09-d.clock);const s=d.state,p=s.players.find(p=>p.id===s.throwToId);assert.equal(s.phase,'secured');assert.equal(s.possession,'receiving-glove');const receive=liveFieldPose(s,p);assert.equal(receive.asset,'fixtureRoutineReceive');assert.equal(receive.throws,'R');assert.equal(receive.gloveHand,'L');const poses=new Map([[p.id,receive]]);assert.deepEqual(liveBallPoint(s,poses),poseLandmark(receive,fieldProject(p.bagContact)));assert.equal(fieldBallIsPainted(s,poses),false);
  const from=s.players.find(p=>p.id===s.throwFromId);for(const position of['P','C','LF'])assert.equal(liveFieldPose({...s,players:s.players.map(x=>x.id===from.id?{...x,position}:x)},p),null);
  assert.equal(liveFieldPose({...s,throwStart:{x:p.point.x+5,y:80}},p),null);assert.equal(liveFieldPose(s,{...p,covering:'3B'}),null);
  assert.equal(d.throwTo('2B'),true);assert.equal(d.state.phase,'transfer');assert.equal(liveFieldPose(d.state,d.state.players.find(x=>x.id===p.id)),null); // Opposite-direction transfer art is unsupported; never retain the receiving stretch.
 }finally{cast.poses=before;}
});
