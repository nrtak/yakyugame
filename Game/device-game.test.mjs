import test from 'node:test';import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';import {SWING_LEAD} from './engine.mjs';
const reach=(g,phase)=>{for(let i=0;i<3000;i++){if(g.phase===phase)return;g.step(.01);}throw Error('Did not reach '+phase);};
test('batting contact enters the same defensive controller and applies a completed play once',()=>{
 const g=new DeviceGame();g.start();reach(g,'flight');g.setAim(g.pitch.x,g.pitch.y);while(g.elapsed<g.pitch.duration-SWING_LEAD-.005)g.step(.005);assert.equal(g.swing(),true);assert.equal(g.swing(),false);reach(g,'field');assert.ok(g.defense);reach(g,'review');assert.equal(g.inning.events.length,1);assert.ok(['single','groundout','fielderschoice'].includes(g.event.kind));g.step(10);assert.equal(g.inning.events.length,1);
});
test('pause is idempotent and resume preserves pitch time and contact input',()=>{
 const g=new DeviceGame();g.start();reach(g,'flight');g.step(.1);const elapsed=g.elapsed;g.pause();g.pause();for(let i=0;i<100;i++)g.step(.05);assert.equal(g.elapsed,elapsed);assert.equal(g.swing(),false);g.resume();g.step(.02);assert.ok(g.elapsed>elapsed);
});
test('a complete one-inning device game changes roles and reaches real results',()=>{
 for(const teamId of ['coral-club','navy-stars']){const g=new DeviceGame({teamId});g.start();let seenBat=false,seenPitch=false,plays=0;
  for(let i=0;i<60000&&g.phase!=='final';i++){
   if(g.phase==='pitch-ready'){seenPitch=true;g.choosePitch(plays%2?'curve':'fast');g.setAim(0,0);g.releasePitch();}
   if(g.userBatting&&g.phase==='flight')seenBat=true;
   if(g.phase==='field'&&!g.userBatting&&g.defense.canThrow)g.throwTo(g.defense.recommendation);
   if(g.phase==='review'){plays++;g.next();}else g.step(.05);
  }
  assert.equal(g.phase,'final');assert.equal(g.match.over,true);assert.equal(g.match.inning,1);assert.ok(seenBat&&seenPitch);assert.ok(plays>=6);assert.ok(g.match.log.every(e=>e.inning===1));
 }
});
test('pitch choices and throwing inputs only act in the matching player role',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();assert.equal(g.phase,'pitch-ready');assert.equal(g.choosePitch('curve'),true);assert.equal(g.choosePitch('invalid'),false);assert.equal(g.swing(),false);assert.equal(g.throwTo('1B'),false);g.releasePitch();assert.equal(g.pitch.kind,'curve');assert.equal(g.pitcher.throws,'R');
});
test('paused pitch selection and review controls cannot advance play underneath the pause screen',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.pause();assert.equal(g.choosePitch('curve'),false);assert.equal(g.releasePitch(),false);g.resume();g.phase='review';g.pause();assert.equal(g.next(),false);assert.equal(g.phase,'review');
});
test('real names and handedness survive role changes without borrowing a different character identity',()=>{
 const g=new DeviceGame();assert.equal(g.sceneState().batterId,'coral-club-emma');assert.equal(g.sceneState().pitcherId,'navy-stars-ryan');for(let i=0;i<9;i++)g.inning.pitchResult({kind:'strike'});assert.equal(g.pitcher.id,'coral-club-emma');assert.equal(g.pitcher.throws,'L');assert.equal(g.sceneState().batterName,'Ryan');
});
