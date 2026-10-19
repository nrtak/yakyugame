import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSession,judgeSwing,judgeTake,summarize,SWING_LEAD} from './engine.mjs';
const pitch={x:0,y:0,duration:1.25,inZone:true};
test('centered on-time impact earns perfect contact',()=>{
  const result=judgeSwing(pitch,{x:0,y:0},pitch.duration);
  assert.equal(result.kind,'hit');assert.equal(result.points,100);
});
test('swing lead is accounted for at impact, not button-down',()=>{
  const input=1.25-SWING_LEAD;
  assert.equal(judgeSwing(pitch,{x:0,y:0},input+SWING_LEAD).points,100);
});
test('mistimed and poorly aimed swings miss; glancing contact fouls',()=>{
  for(const delta of [-.3,.3])assert.equal(judgeSwing(pitch,{x:0,y:0},1.25+delta).kind,'miss');
  assert.equal(judgeSwing(pitch,{x:1,y:0},1.25).kind,'miss');
  assert.equal(judgeSwing(pitch,{x:.7,y:0},1.25).kind,'foul');
  assert.equal(judgeSwing(pitch,{x:0,y:0},1.39).kind,'foul');
});
test('taking pitches rewards balls and calls strikes',()=>{
  assert.equal(judgeTake(pitch).kind,'strike');
  const outside={...pitch,x:1.4,inZone:false};assert.equal(judgeTake(outside).kind,'ball');assert.equal(judgeTake(outside).points,50);
});
test('ten-pitch sequence has warmups, three balls, slower changes and repeatable seeds',()=>{
  const session=makeSession(41);
  assert.equal(session.length,10);assert.equal(session.filter(p=>!p.inZone).length,3);
  assert.ok(session.slice(0,3).every(p=>p.kind==='fast'&&p.inZone));
  assert.ok(session.find(p=>p.kind==='change').duration>session[0].duration);
  assert.deepEqual(session,makeSession(41));assert.notDeepEqual(session,makeSession(42));
  for(const p of session)assert.equal(p.inZone,Math.abs(p.x)<=1&&Math.abs(p.y)<=1);
  assert.ok(makeSession(41,'relaxed')[0].duration>makeSession(41,'quick')[0].duration);
});
test('summary distinguishes foul contact, fair hits, good takes and zero swings',()=>{
  assert.equal(summarize([]).averageTimingMs,null);
  const results=[judgeSwing(pitch,{x:0,y:0},1.25),judgeSwing(pitch,{x:.7,y:0},1.25),judgeTake({...pitch,inZone:false})];
  assert.deepEqual(summarize(results),{pitches:3,fairHits:1,contact:2,goodTakes:1,score:170,averageTimingMs:0});
});
test('scores stay bounded across aims and times',()=>{
  for(let x=-2;x<=2;x+=.2)for(let t=.5;t<2;t+=.03){const r=judgeSwing(pitch,{x,y:0},t);assert.ok(r.points>=0&&r.points<=100);assert.ok(Number.isFinite(r.points));}
});
