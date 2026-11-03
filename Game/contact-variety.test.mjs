import test from 'node:test';
import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';
import {SWING_LEAD} from './engine.mjs';

function swing(seed,offset=0){
 const g=new DeviceGame({seed});g.start();while(g.phase==='windup')g.step(.01);
 g.setAim(g.pitch.x,g.pitch.y+offset);
 while(g.elapsed<g.pitch.duration-SWING_LEAD-.001)g.step(.001);
 assert.ok(g.swing());while(g.phase!=='field')g.step(.01);
 return g;
}
test('centered fair swings produce varied physical plays instead of guaranteed caught lines',()=>{
 const types=new Set(),results=new Set();
 for(let seed=1;seed<=60;seed++){
  const g=swing(seed);types.add(g.defense.flightType);
  for(let i=0;g.phase==='field'&&i<6000;i++)g.step(.01);
  assert.equal(g.phase,'review');assert.equal(g.inning.events.length,1);results.add(g.event.kind);
 }
 assert.deepEqual(types,new Set(['Line drive','Fly ball','Ground ball']));
 assert.ok(results.has('single')&&results.has('flyout')&&results.has('groundout')&&results.has('homerun'));
});
test('contact geometry replays deterministically and vertical aim still controls loft',()=>{
 for(const seed of [2,7,31]){
  const a=swing(seed),b=swing(seed),above=swing(seed,-.25),below=swing(seed,.25);
  assert.deepEqual(a.defense,b.defense);
  assert.ok(above.defense.launchAngle>a.defense.launchAngle);
  assert.ok(below.defense.launchAngle<a.defense.launchAngle);
 }
});
test('explicit authored practice flights retain their own launch and spray',()=>{
 const g=new DeviceGame();g.start();g.beginFair({quality:.6,launchAngle:0,direction:-.5});
 assert.equal(g.defense.launchAngle,0);assert.equal(g.defense.flightType,'Ground ball');
});
