import test from 'node:test';import assert from 'node:assert/strict';
import {defensiveHomePlate,PITCHING_GEOMETRY} from './scene-render.mjs';
import {defenseBatterPose} from './defense-batting-art.mjs';
import {catcherPose,opposingArtKeys} from './opposing-art.mjs';
import {lowPitchingCatcher,plateUmpirePose} from './plate-crew.mjs';
test('rear home plate has five convex corners with its wide edge facing the mound',()=>{
 const p=defensiveHomePlate();assert.equal(p.length,5);assert.equal(new Set(p.map(p=>p.join(','))).size,5);
 assert.equal(p[0][1],p[1][1]);assert.ok(p[0][0]<p[1][0]);assert.ok(p[0][1]>PITCHING_GEOMETRY.plate.y);
 assert.deepEqual(p[3],[PITCHING_GEOMETRY.plate.x,PITCHING_GEOMETRY.plate.y-19]);
 const signs=p.map((a,i)=>{const b=p[(i+1)%5],c=p[(i+2)%5];return Math.sign((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]));});assert.ok(signs.every(s=>s===signs[0]&&s!==0));
});
test('both pitching scenes load their own low catcher and place the umpire behind the inside shoulder',()=>{
 for(const [catcherId,batterId] of [['coral-club-sora','navy-stars-ryan'],['navy-stars-lily','coral-club-emma']]){
  const catcher=lowPitchingCatcher(catcherPose(catcherId),PITCHING_GEOMETRY.zone);
  const batter=defenseBatterPose(batterId,'R',0);
  const ump=plateUmpirePose(catcher.world[0],batter.world[0]);
  const keys=opposingArtKeys(null,catcherId);
  assert.ok(keys.includes(ump.asset)&&keys.includes(catcher.asset));
  assert.ok(ump.world[1]<catcher.world[1]);
  assert.ok(Math.abs(ump.world[0]-catcher.world[0])<40);
  assert.equal(Math.sign(ump.world[0]-catcher.world[0]),Math.sign(batter.world[0]-catcher.world[0]));
 }
});
test('Ryan batting stature grows uniformly at the same planted foot without changing hand or camera',()=>{
 const p=defenseBatterPose('navy-stars-ryan','R',0);assert.equal(p.scale,.354);assert.deepEqual(p.world,[1230,560]);assert.deepEqual(p.anchor,[500,1200]);assert.equal(p.hand,'R');assert.equal(p.camera,'MOUND+THIRD');assert.equal(defenseBatterPose('navy-stars-ryan','L',0),null);
});
