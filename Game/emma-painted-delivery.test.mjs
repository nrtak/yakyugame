import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {defensivePitcherIdle,defensivePitcherFrame,defensivePitcherPose,defensiveRelease} from './pitching-art.mjs';
import {SCENE_ASSETS} from './scene-render.mjs';
import {EMMA_PAINTED_ASSETS,EMMA_PHASES,EMMA_REVIEW_TIMES,emmaPaintedScene} from './emma-painted-delivery.mjs';

test('normal local-game Emma uses the shifted rubber and landing through every rear phase',()=>{
 const idle=defensivePitcherIdle('coral-club-emma','L');assert.deepEqual(idle.world,[540,830]);assert.equal(idle.scale,1.85);
 const frames=EMMA_REVIEW_TIMES.map(t=>defensivePitcherFrame(emmaPaintedScene(t)));assert.deepEqual(frames,Array.from({length:14},(_,i)=>i));
 for(let i=0;i<EMMA_PHASES.length;i++){
  const p=defensivePitcherPose('coral-club-emma','L',i);assert.equal(p.throws,'L');assert.equal(p.gloveHand,'R');assert.equal(p.scale,1.85);
  assert.deepEqual(p.world,i<6?[540,830]:[947,754.15]);assert.equal(SCENE_ASSETS[p.asset],EMMA_PAINTED_ASSETS[p.asset]);
 }
 const release=defensivePitcherPose('coral-club-emma','L',8),at=defensiveRelease('L');
 assert.equal(at.x,release.world[0]+(release.hand[0]-release.anchor[0])*release.scale);
 assert.equal(at.y,release.world[1]+(release.hand[1]-release.anchor[1])*release.scale);
});

test('live artwork excludes the rejected branching-arm paintings even under a renamed asset',()=>{
 const rejected=new Set(['40f0a87773bcf9c26148b5383be33e4e9bf62a5574f5cfa47f1975ff8d0c110d','eb257c9b5af8833bf348d6e692dd1c4ef5d5301e15ea31b8062e98fa3710931e','dd47efd81fbf882a69c7e8f4da6c3c5b9edc49393b7531b5d1943a8bfa8368c1','28c2f396ff83ad28bf3f4bd762895376f92b749115f314474cf7e320a3394c34','3226d4a761e288908f77f01654ecb6a423f1f0889084a1daac8f542f1feaae0c']);
 for(const path of Object.values(SCENE_ASSETS)){
  assert.ok(!/natural-motion|acceleration-v[123]-clean|follow-through-v1/.test(path));
  const bytes=fs.readFileSync(new URL(path,import.meta.url));assert.ok(!rejected.has(createHash('sha256').update(bytes).digest('hex')));
 }
});
