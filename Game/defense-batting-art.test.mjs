import test from 'node:test';import assert from 'node:assert/strict';
import {DEFENSE_BATTING_ASSETS,defenseBatterPose,defenseBatterKeys,defensiveBatterFrame} from './defense-batting-art.mjs';
import {firstPairCoverage} from './artwork-coverage.mjs';
import {PITCHING_GEOMETRY,pitchingActorPose} from './scene-render.mjs';
import {opposingBatterPose} from './opposing-art.mjs';
test('captain stances retain their own art and explicitly authored camera/box',()=>{
 for(const id of ['coral-club-emma','navy-stars-ryan']){
  const p=defenseBatterPose(id,'R',0);assert.ok(p);assert.ok(p.scale>0);
  if(id==='coral-club-emma'){assert.equal(p.camera,'LOW-REAR');assert.ok(p.world[0]<PITCHING_GEOMETRY.zone.x-PITCHING_GEOMETRY.zone.rx);assert.ok(DEFENSE_BATTING_ASSETS[p.asset].includes('reference-emma'));}
  else{assert.equal(p.camera,'MOUND+THIRD');assert.ok(p.world[0]>PITCHING_GEOMETRY.zone.x+PITCHING_GEOMETRY.zone.rx);}
  assert.ok(DEFENSE_BATTING_ASSETS[p.asset].includes(id.split('-').at(-1)));assert.equal(defenseBatterPose(id,'L',0),null);
  assert.equal(pitchingActorPose(opposingBatterPose(id,'R',0)),null);
 }
});
test('unverified new-camera swings and other identities remain gaps, without reflected or ready-frame substitutes',()=>{
 for(const id of ['coral-club-emma','navy-stars-ryan'])for(const frame of [1,2,3])assert.equal(defenseBatterPose(id,'R',frame),null);
 assert.equal(defenseBatterPose('coral-club-mia','R',0),null);assert.deepEqual(defenseBatterKeys('coral-club-mia'),[]);
 assert.equal(Object.keys(DEFENSE_BATTING_ASSETS).length,2);
 assert.ok(!Object.values(DEFENSE_BATTING_ASSETS).some(path=>path.includes('contact')||path.includes('follow')));
});
test('source-camera coverage stays separate from the new camera',()=>{
 const c=firstPairCoverage();assert.equal(c.flatMap(p=>p.opposingBatting).filter(p=>p.exact).length,54);
 assert.equal(c.flatMap(p=>p.defensiveBatting).filter(p=>p.pose).length,2);
 assert.equal(c.flatMap(p=>p.defensivePitching).filter(p=>p.pose).length,10);
});

test('new-camera impact and finish follow the scoring instant without using contact as a loading pose',()=>{
 const s={phase:'flight',elapsed:1,swingAt:1,clock:0};
 for(const [elapsed,frame]of [[1,0],[1.045,0],[1.139,0],[1.14,2],[1.239,2],[1.24,3],[1.639,3],[1.64,0]])assert.equal(defensiveBatterFrame({...s,elapsed}),frame);
 assert.equal(defensiveBatterFrame({...s,swingAt:null}),0);
 assert.equal(defensiveBatterFrame({...s,phase:'hit',elapsed:1.14,clock:.12}),3);
});
