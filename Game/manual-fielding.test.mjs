import test from'node:test';import assert from'node:assert/strict';
import{GroundDefense}from'./defense-play.mjs';import{FlightDefense}from'./flight-defense.mjs';import{DeviceGame}from'./device-game.mjs';import{fieldDirectionFromScreen,fieldTargetPosition}from'./defense-controls.mjs';import{fieldProject}from'./field-camera.mjs';import{captureMatchCheckpoint,resumeMatchCheckpoint}from'./match-save.mjs';
import{fieldLocomotionPose}from'./field-motion.mjs';
const options={teamId:'navy-stars',batterId:'coral-club-emma',target:{x:-40,y:115}};
function chase(play){const s=play.state,p=s.players.find(p=>p.id===s.activeFielderId),target=s.fieldingTarget;if(s.moveEnabled){const x=target.x-p.point.x,y=target.y-p.point.y,length=Math.hypot(x,y);play.setFielderInput(length>1?x/length:0,length>1?y/length:0);}play.step(.02);}
test('manual fielding does not move the selected player or award possession without reaching the ball',()=>{
 const p=new GroundDefense(options).enableManualFielding(),initial=p.playerPoint(p.fielder);p.step(4);
 assert.deepEqual(p.playerPoint(p.fielder),initial);assert.equal(p.state.ballOwnerId,null);assert.equal(p.canThrow,false);assert.ok(p.players.filter(x=>x.role==='cover').some(x=>Math.hypot(p.playerPoint(x).x-x.start.x,p.playerPoint(x).y-x.start.y)>1));
 p.step(20);assert.equal(p.finished,true);assert.equal(p.resolution.retired.length,0);assert.match(p.resolution.detail,/not secured/);
});
test('steering reaches a grounder, gathers it, then allows a legal base throw',()=>{
 const p=new GroundDefense(options).enableManualFielding();let ticks=0;while(!p.canThrow&&ticks++<600)chase(p);
 assert.ok(ticks<600);assert.equal(p.state.ballOwnerId,p.fielder.id);assert.equal(p.state.moveEnabled,false);assert.equal(p.setFielderInput(1,0),false);assert.equal(p.throwTo('1B'),true);assert.equal(p.canThrow,false);
 while(!p.finished)p.step(.02);assert.ok(p.resolution.retired.length===1);assert.equal(p.state.throwToId,p.coverage['1B'].id);
});
test('center-field fly selects CF, shows landing area and catches only after user positioning',()=>{
 const o={...options,contact:{quality:.5,launchAngle:40,direction:0}},p=new FlightDefense(o).enableManualFielding();assert.equal(p.fielder.position,'CF');assert.ok(p.state.fieldingTarget.y>200);let ticks=0;
 while(!p.finished&&ticks++<900)chase(p);assert.ok(ticks<900);assert.equal(p.resolution.kind,'flyout');assert.ok(p.touchAt<p.flight.landingTime);
 const miss=new FlightDefense(o).enableManualFielding();miss.setFielderInput(0,1);while(!miss.finished)miss.step(.02);assert.notEqual(miss.resolution.kind,'flyout');assert.equal(miss.state.airCatch,false);assert.equal(miss.resolution.retired.length,0);
});
test('movement stays bounded, analog speed cannot be boosted and invalid input is rejected',()=>{
 const p=new GroundDefense(options).enableManualFielding(),before=p.playerPoint(p.fielder);assert.equal(p.setFielderInput(NaN,1),false);p.setFielderInput(100,100);p.step(1);const after=p.playerPoint(p.fielder);assert.ok(Math.abs(Math.hypot(after.x-before.x,after.y-before.y)-24)<1e-6);p.step(50);assert.ok(Math.hypot(p.manual.point.x,p.manual.point.y)<=330.001);
});
test('manual input is user-defense only, pauses safely, and persists in pitch checkpoints',()=>{
 const g=new DeviceGame({teamId:'navy-stars',homeTeamId:'navy-stars',manualFielding:true});g.start();g.beginFair({quality:.5,launchAngle:40,direction:0});assert.equal(g.defense.manualFielding,true);g.setFielderInput(1,0);const before=g.defense.players.find(p=>p.id===g.defense.activeFielderId).point;g.pause();assert.equal(g.setFielderInput(1,0),false);g.step(.05);g.resume();g.step(.05);assert.deepEqual(g.defense.players.find(p=>p.id===g.defense.activeFielderId).point,before);
 assert.equal(resumeMatchCheckpoint(captureMatchCheckpoint(g)).manualFielding,true);
 const batting=new DeviceGame({teamId:'coral-club',homeTeamId:'navy-stars',manualFielding:true});batting.start();batting.beginFair({quality:.5,launchAngle:40,direction:0});assert.equal(batting.defense.manualFielding,false);assert.equal(batting.setFielderInput(1,0),false);
});
test('base markers use the rendered camera and movement directions follow its perspective',()=>{
 const camera={x:100,y:200,width:1200},home=fieldProject({x:0,y:0}),p=fieldTargetPosition('HOME',camera);assert.equal(p.x,(home.x-100)/1200);assert.equal(p.y,(home.y-200)/1200*1600/960);assert.equal(fieldTargetPosition('NO',camera),null);
 for(const point of[{x:0,y:60},{x:100,y:240}]){const v=fieldDirectionFromScreen(0,-1,point),a=fieldProject(point),b=fieldProject({x:point.x+v.x*.001,y:point.y+v.y*.001});assert.ok(b.y<a.y);assert.ok(Math.abs(b.x-a.x)<1e-6);}
});
test('manual native locomotion animates without an automatic arrival time',()=>{const p=new FlightDefense({...options,contact:{quality:.5,launchAngle:40,direction:0}}).enableManualFielding();p.setFielderInput(0,-1);p.step(.05);let s=p.state,f=s.players.find(f=>f.id===s.activeFielderId);assert.equal(f.controlled,true);assert.ok(fieldLocomotionPose(s,f));const first=fieldLocomotionPose(s,f).frameIndex;p.step(.2);s=p.state;f=s.players.find(f=>f.id===s.activeFielderId);assert.notEqual(fieldLocomotionPose(s,f).frameIndex,first);});
test('slide/dive has a bounded burst, cannot repeat during recovery, and cannot catch a high ball',()=>{const p=new GroundDefense({...options,target:{x:120,y:210}}).enableManualFielding(),before=p.playerPoint(p.fielder);p.setFielderInput(1,0);assert.equal(p.performFieldAction(),true);assert.equal(p.performFieldAction(),false);p.step(.4);assert.ok(Math.abs(p.playerPoint(p.fielder).x-before.x-12.16)<.01);const held=p.playerPoint(p.fielder);p.step(.3);assert.deepEqual(p.playerPoint(p.fielder),held);p.step(.4);assert.equal(p.performFieldAction(),true);const high=new GroundDefense(options).enableManualFielding();high.fieldBallAt=()=>({...high.manual.point,z:20});high.performFieldAction();high.step(.4);assert.equal(high.state.ballOwnerId,null);});
