import test from 'node:test';import assert from 'node:assert/strict';
import {newMatchSeed} from './match-engine.mjs';import {DeviceGame} from './device-game.mjs';
import {captureMatchCheckpoint,resumeMatchCheckpoint} from './match-save.mjs';
test('new exhibitions draw a fresh seed, while a saved game resumes its exact sequence',()=>{
 let next=100;const source={getRandomValues(a){a[0]=++next;return a;}};
 const seeds=Array.from({length:6},()=>newMatchSeed(source));assert.equal(new Set(seeds).size,6);
 const pitches=seeds.map(seed=>{const g=new DeviceGame({seed});g.start();return g.pitch;});assert.ok(new Set(pitches.map(p=>JSON.stringify(p))).size>1);
 const g=new DeviceGame({seed:seeds[0]});g.start();g.finishPitch({kind:'strike'});
 const loaded=resumeMatchCheckpoint(captureMatchCheckpoint(g));assert.equal(loaded.match.seed,seeds[0]);loaded.start();g.next();assert.deepEqual(loaded.pitch,g.pitch);
});
test('zero entropy output becomes a usable nonzero seed and missing randomness is explicit',()=>{
 assert.equal(newMatchSeed({getRandomValues(a){a[0]=0;return a;}}),1);assert.throws(()=>newMatchSeed({}),/randomness/);
});
