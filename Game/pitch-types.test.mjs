import test from 'node:test';import assert from 'node:assert/strict';
import {PITCH_TYPES,PITCHER_EXTRAS,pitcherRepertoire,pitchMovement,pitchOffset,projectPitch} from './pitch-types.mjs';
import {createMatch,currentPitcher,makeMatchPitch} from './match-engine.mjs';
import {DeviceGame} from './device-game.mjs';
const captainIds=['aqua-pearls-nina','blue-comets-chloe','coral-club-emma','crimson-hawks-daniel','emerald-dragons-kenta','forest-foxes-oliver','golden-suns-hana','navy-stars-ryan','sakura-blossoms-yui','sand-dunes-leo'];
test('all ten fixed captains have the common three plus one to three distinct real extras',()=>{
 assert.deepEqual(Object.keys(PITCHER_EXTRAS).sort(),captainIds.slice().sort());
 const combinations=new Set();for(const captainId of captainIds){const extras=PITCHER_EXTRAS[captainId],repertoire=pitcherRepertoire(captainId);assert.ok(extras.length>=1&&extras.length<=3);assert.deepEqual(repertoire.slice(0,3),['fast','curve','change']);assert.equal(new Set(repertoire).size,repertoire.length);assert.ok(repertoire.every(k=>PITCH_TYPES[k]));combinations.add([...extras].sort().join());repertoire.pop();assert.equal(pitcherRepertoire(captainId).length,3+extras.length);}
 assert.equal(combinations.size,10);
});
test('movement has continuous endpoints and remains anatomically consistent across hands and cameras',()=>{
 const release={x:30,y:15},zone={x:100,y:200,rx:65,ry:86};
 for(const kind of Object.keys(PITCH_TYPES))for(const hand of ['R','L']){
  const p={kind,x:.7,y:-.4,duration:1.25,movement:pitchMovement(kind,hand,.19)};
  for(const reverse of [false,true]){const start=projectPitch(p,0,release,zone,reverse),end=projectPitch(p,p.duration,release,zone,reverse);assert.equal(start.x,release.x);assert.equal(start.y,release.y);assert.equal(end.x,100+(reverse?-1:1)*.7*65);assert.equal(end.y,200+.4*86);
   let prior=start;for(let i=1;i<=1000;i++){const next=projectPitch(p,i/1000*p.duration,release,zone,reverse);assert.ok(Math.hypot(next.x-prior.x,next.y-prior.y)<1);prior=next;}
  }
 }
 const right=pitchMovement('cutter','R'),left=pitchMovement('cutter','L');assert.ok(right.side>0);assert.equal(right.side,-left.side);assert.ok(pitchMovement('sinker','R').side<0);assert.ok(pitchMovement('splitter','R').drop>pitchMovement('cutter','R').drop);
 const p={x:0,y:0,duration:1,movement:right};const a=projectPitch(p,.7,{x:0,y:0},{x:0,y:0,rx:1,ry:1}),b=projectPitch(p,.7,{x:0,y:0},{x:0,y:0,rx:1,ry:1},true);assert.equal(a.x,-b.x);
});
test('pitch types change the actual flight and timing rather than just a label',()=>{
 const signatures=new Set();for(const kind of Object.keys(PITCH_TYPES)){const p={movement:pitchMovement(kind,'R',.37)};signatures.add(JSON.stringify([PITCH_TYPES[kind].duration,pitchOffset(p,.4),pitchOffset(p,.8)]));}
 assert.equal(signatures.size,Object.keys(PITCH_TYPES).length);assert.equal(PITCH_TYPES.fast.duration,1);
});
test('CPU and human pitches use the same fixed repertoire and preserve pitcher identity through innings',()=>{
 for(const half of [0,1]){const m=createMatch();m.half=half;const pitcher=currentPitcher(m),allowed=pitcherRepertoire(pitcher.id),seen=new Set();for(let n=0;n<150;n++){m.pitchNumber=n;const p=makeMatchPitch(m);seen.add(p.kind);assert.ok(allowed.includes(p.kind));assert.equal(p.pitcherId,pitcher.id);assert.equal(p.throws,pitcher.throws);assert.deepEqual(p,makeMatchPitch(m));}assert.deepEqual([...seen].sort(),allowed.slice().sort());
  for(const kind of allowed)assert.equal(makeMatchPitch(m,{kind}).kind,kind);
  assert.throws(()=>makeMatchPitch(m,{kind:'imaginary'}),/repertoire/);
 }
 const g=new DeviceGame({teamId:'navy-stars'});g.start();assert.equal(g.choosePitch('sinker'),true);assert.equal(g.choosePitch('knuckle'),false);g.releasePitch();assert.equal(g.pitch.kind,'sinker');assert.equal(g.pitch.duration,1.25*1.04);g.reset();assert.equal(g.repertoire.includes('sinker'),true);assert.equal(g.pitchKind,'fast');
 const m=createMatch();assert.equal(makeMatchPitch(m,{kind:'fast'}).duration,1.25);
});
