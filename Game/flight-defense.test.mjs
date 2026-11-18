import test from 'node:test';import assert from 'node:assert/strict';
import {createBattedBall,battedBallAt,planInterception} from './batted-ball.mjs';
import {FlightDefense} from './flight-defense.mjs';import {createMatch,applyOutcome,TEAMS} from './match-engine.mjs';
import {gameControls} from './game-controls.mjs';
import {defenseFeedback} from './game-help.mjs';
import {liveBallPoint} from './live-field-art.mjs';
import {fieldProject} from './field-camera.mjs';
import {liveRunnerPose} from './running-art.mjs';
const batter=TEAMS[0].players[0];
test('a playable gap drive can become a double, a triple, or a single with a tag out',()=>{
 for(const home of TEAMS)for(const choice of ['hold','tag','late-pickup']){
  const away=TEAMS.find(t=>t!==home),id=away.players[0].id;
  const match=createMatch({homeTeamId:home.id});
  const p=new FlightDefense({teamId:home.id,batterId:id,contact:{quality:.8,launchAngle:28,direction:.35}});
  if(choice==='late-pickup')p.enableManualFielding();
  let last={x:0,y:0},tagged=false;
  while(!p.finished){
   const s=p.step(.025),r=s.runners[0];
   assert.ok(Math.hypot(r.point.x-last.x,r.point.y-last.y)<1,'continuous travel around the bag');
   assert.equal(r.to-r.from,1);last=r.point;
   if(choice==='tag'&&r.to===2&&p.canThrow&&!p.throw){assert.equal(s.throwOptions.find(o=>o.base==='2B').tagRequired,true);p.throwTo('2B');}
   if(choice==='tag'&&p.tagOptions.length)tagged=p.tagRunner();
  }
  const {match:result,event}=applyOutcome(match,p.resolution);
  assert.equal(result.hits[0],1);assert.equal(result.stats[id].h,1);
  if(choice==='tag'){assert.equal(tagged,true);assert.equal(result.outs,1);assert.equal(event.kind,'single');assert.equal(event.retired[0].force,false);}
  else{const base=choice==='hold'?2:3;assert.equal(result.bases[base-1],id);assert.equal(event.kind,base===2?'double':'triple');}
 }
});
const options=contact=>({teamId:'navy-stars',batterId:batter.id,bases:[null,null,null],outs:0,contact});
test('a home run follows the free ball past the fence through the final call',()=>{
 for(const direction of [-.6,0,.6]){
  const p=new FlightDefense(options({quality:1,launchAngle:35,direction}));
  const wall=p.flight.wallTime;
  for(const t of [wall-.02,wall+.02,wall+.55,p.finishAt]){
   p.step(t-p.clock);
   const s=p.state,ground=fieldProject(s.ball);
   assert.equal(s.ballOwnerId,null);assert.equal(s.possession,'free');
   assert.deepEqual(s.ball,battedBallAt(p.flight,p.clock));
   assert.deepEqual(liveBallPoint(s,new Map()),{x:ground.x,y:ground.y-s.ball.z*1.2});
   assert.equal(s.canTag,false);assert.equal(s.canThrow,false);
   assert.equal(defenseFeedback(s).possession,p.clock>=wall?'Over the fence':'Ball in play');
  }
 }
});
test('a ball below the top of the wall changes from a diving catch to a playable rebound',()=>{
 const p=new FlightDefense(options({quality:1,launchAngle:18.2,direction:0})).enableManualFielding();
 const wall=p.flight.wallTime;assert.ok(wall>0&&wall<p.flight.landingTime&&!p.plan.homeRun);
 p.step(wall-.01);assert.equal(p.state.fieldActionLabel,'DIVE');
 p.step(.011);const s=p.state;assert.equal(s.phase,'approach');assert.equal(s.airCatch,false);
 assert.equal(gameControls({phase:'field',userBatting:false,defense:s}).fieldActionLabel,'SLIDE');
 assert.equal(p.performFieldAction(),true);assert.equal(p.manual.action.kind,'slide');
});
test('contact angle and quality affect flight without a random hit-type assignment',()=>{
 const ground=createBattedBall({quality:.7,verticalOffset:.5},batter),fly=createBattedBall({quality:.7,verticalOffset:-.5},batter),weak=createBattedBall({quality:.2,verticalOffset:-.5},batter);
 assert.ok(ground.ground);assert.ok(!fly.ground);assert.ok(fly.speed>weak.speed);assert.ok(fly.landingTime>ground.landingTime);assert.ok(battedBallAt(fly,1).z>8);
 assert.deepEqual(createBattedBall({quality:.7,verticalOffset:-.5},batter),fly);
});
test('opposite batting hands pull in opposite directions and wall clearance requires height',()=>{
 const r=createBattedBall({quality:1,timingMs:-60,launchAngle:35},batter),l=createBattedBall({quality:1,timingMs:-60,launchAngle:35},{...batter,bats:'L'});
 assert.equal(r.direction,-l.direction);assert.ok(battedBallAt(r,1).x<0);assert.ok(battedBallAt(l,1).x>0);assert.ok(r.homeRun);assert.ok(battedBallAt(r,r.wallTime).z>8);
 const low=createBattedBall({quality:1,launchAngle:8},batter);assert.equal(low.homeRun,false);
});
test('fielders intercept ground balls along the path rather than waiting at their final roll distance',()=>{
 const f=createBattedBall({quality:.8,launchAngle:-4},batter),p=planInterception(f,TEAMS[1].players);
 assert.ok(p.time<f.rollTime);assert.ok(Math.hypot(p.point.x,p.point.y)<f.rollRange);assert.equal(p.airCatch,false);
});
test('a reachable fly retires the batter once and holds occupied bases',()=>{
 const m=createMatch({innings:1});m.bases[0]=TEAMS[0].players[1].id;const p=new FlightDefense({...options({quality:.6,launchAngle:40,direction:0}),bases:m.bases});
 assert.equal(p.plan.airCatch,true);const before=p.state;assert.deepEqual(before.runners.find(r=>r.from===1).point,{x:90/Math.sqrt(2),y:90/Math.sqrt(2)});
 const held=before.runners.find(r=>r.from===1);
 assert.equal(held.to,held.from);assert.deepEqual(liveRunnerPose(before,held),liveRunnerPose({...before,clock:.25},held));
 assert.ok(liveRunnerPose(before,held),'held runner has a planted figure');
 while(!p.finished)p.step(.01);assert.equal(p.state.possession,'fielding-glove');assert.equal(p.state.ballOwnerId,p.fielder.id);assert.equal(p.state.playOuts,1);assert.equal(p.throwTo('1B'),false);
 const result=applyOutcome(m,p.resolution);assert.equal(result.match.outs,1);assert.deepEqual(result.match.bases,m.bases);assert.equal(result.event.kind,'flyout');
});
test('a caught third out ends the half without awarding runs; home runs score all occupied bases',()=>{
 const m=createMatch({innings:1});m.outs=2;m.bases=[TEAMS[0].players[1].id,TEAMS[0].players[2].id,TEAMS[0].players[3].id];
 const caught=new FlightDefense({...options({quality:.6,launchAngle:40,direction:0}),bases:m.bases,outs:2});while(!caught.finished)caught.step(.03);const a=applyOutcome(m,caught.resolution);assert.equal(a.match.half,1);assert.deepEqual(a.match.score,[0,0]);
 const hr=new FlightDefense({...options({quality:1,launchAngle:35,direction:0}),bases:m.bases,outs:2});assert.equal(hr.plan.homeRun,true);assert.equal(hr.state.call,null);while(!hr.finished)hr.step(.03);assert.equal(hr.state.call,'homerun');const b=applyOutcome(m,hr.resolution);assert.equal(b.match.score[0],4);assert.equal(b.match.outs,2);assert.equal(b.match.stats[batter.id].rbi,4);
});
test('a low line drive can fall safely and still resolve through manual defensive throws',()=>{
 let found;for(const direction of [-.7,-.4,0,.4,.7])for(const quality of [.4,.6,.8]){const p=new FlightDefense(options({quality,launchAngle:16,direction}));if(!p.plan.airCatch&&!p.plan.homeRun)found=p;}
 assert.ok(found);while(!found.finished){if(found.canThrow)found.throwTo(found.recommendation);found.step(.02);}assert.equal(found.resolution.kind,'defensiveplay');assert.ok(found.state.ballOwnerId);
});
