import test from'node:test';import assert from'node:assert/strict';
import{CaptainBattingPractice,PRACTICE_CAPTAINS}from'./batting-practice.mjs';
import{FieldingPractice}from'./fielding-practice.mjs';
import{DerbySession}from'./derby-session.mjs';
import{createDerby,applyDerbySwing,derbyPitch}from'./home-run-derby.mjs';
import{GroundDefense}from'./defense-play.mjs';
import{gameControls}from'./game-controls.mjs';

test('paused batting practice rejects finite aim changes as well as swing input',()=>{
 const p=new CaptainBattingPractice(PRACTICE_CAPTAINS[0].id);p.start();p.setAim(.3,-.2);p.paused=true;
 p.setAim(1,1);assert.deepEqual(p.aim,{x:.3,y:-.2});assert.equal(p.swing(),false);
 p.paused=false;p.setAim(.4,.5);assert.deepEqual(p.aim,{x:.4,y:.5});
});

test('a reviewed fielding drill cannot restart and duplicate its result',()=>{
 const p=new FieldingPractice();p.start();while(p.phase==='field')p.step(.05);
 const before=structuredClone(p.summary),clock=p.defense.clock;
 assert.equal(p.start(),false);for(let i=0;i<200;i++)p.step(.05);
 assert.deepEqual(p.summary,before);assert.equal(p.defense.clock,clock);
 assert.equal(p.next(),true);assert.equal(p.index,1);assert.equal(p.defense.clock,0);
});

test('Derby result presentation retains the completed hitter, pitch number and round at turn boundaries',()=>{
 let initial=new DerbySession(),state=createDerby({players:initial.state.config.players});
 for(let i=0;i<9;i++)state=applyDerbySwing(state,{pitchId:derbyPitch(state).id});
 const p=new DerbySession({state}),hitter=p.player.id;p.startTurn();
 while(p.phase!=='result')p.step(.05);
 assert.equal(p.presentation.player.id,hitter);assert.equal(p.presentation.attempt,10);assert.equal(p.presentation.limit,10);assert.equal(p.presentation.stage,'qualifying');
 assert.equal(p.player.id,state.config.players[1].id);
 while(p.phase==='result')p.step(.05);assert.equal(p.presentation.attempt,1);assert.equal(p.presentation.player.id,p.player.id);
 // The final qualifying pitch must not display FINAL/1 while its result remains.
 state=createDerby({players:initial.state.config.players});for(let i=0;i<19;i++)state=applyDerbySwing(state,{pitchId:derbyPitch(state).id});
 const q=new DerbySession({state});q.startTurn();while(q.phase!=='result')q.step(.05);
 assert.equal(q.state.stage,'final');assert.equal(q.presentation.stage,'qualifying');assert.equal(q.presentation.attempt,10);
});

test('empty-base throw choices do not incorrectly promise an available tag',()=>{
 const p=new GroundDefense();while(!p.canThrow)p.step(.01);
 const controls=gameControls({phase:'field',userBatting:false,paused:false,defense:p.state});
 assert.equal(controls.bases.find(b=>b.base==='1B').detail,'Force out');
 for(const base of['2B','3B','HOME']){const option=controls.bases.find(b=>b.base===base);assert.equal(option.detail,'No force');assert.doesNotMatch(option.ariaLabel,/tag required/);}
 const q=new GroundDefense({bases:['coral-club-ken',null,null],target:{x:64,y:66}});
 while(!q.canThrow)q.step(.01);q.throwTo('1B');while(!q.canThrow)q.step(.01);
 const tag=gameControls({phase:'field',userBatting:false,paused:false,defense:q.state}).bases.find(b=>b.base==='2B');
 assert.equal(tag.detail,'Tag needed');assert.match(tag.ariaLabel,/tag required/);
});
