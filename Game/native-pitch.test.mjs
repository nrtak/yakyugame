import test from 'node:test';import assert from 'node:assert/strict';
import {EMMA_NATIVE_PITCH}from'./native-pitch-data.mjs';
import {nativePitcherPose,nativePitchRelease,defensivePitcherPoint,NATIVE_PITCH_RELEASE_FRAME}from'./pitching-art.mjs';
import {pitchPosition,pitchingPosition}from'./scene-render.mjs';
test('Emma has one unreflected left-handed delivery in two independently rendered views',()=>{
 for(const view of ['front','rear']){
  const d=EMMA_NATIVE_PITCH[view];assert.equal(d.frames.length,38);
  for(const row of d.frames){const [x,y,w,h]=row.rect;assert.ok(x>=0&&y>=0&&x+w<=d.size[0]&&y+h<=d.size[1]);}
  const release=nativePitcherPose({pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:0},view);
  assert.equal(release.frame,NATIVE_PITCH_RELEASE_FRAME);assert.equal(release.throws,'L');assert.equal(release.gloveHand,'R');assert.ok(release.scale>0);assert.equal(release.containsBall,false);
  assert.deepEqual(defensivePitcherPoint(release,release.hand),nativePitchRelease(view));
  const state={pitcherId:'coral-club-emma',pitcherHand:'L',phase:'windup'};
  const pivot=d.frames.filter(r=>r.frame<=33).map(r=>[r.feet.L[0]-r.rect[0],r.feet.L[1]-r.rect[1]]);
  const landing=d.frames.filter(r=>r.frame>=35).map(r=>[r.feet.R[0]-r.rect[0],r.feet.R[1]-r.rect[1]]);
  for(const group of [pivot,landing])for(const p of group)assert.ok(Math.hypot(p[0]-group[0][0],p[1]-group[0][1])<.001);
  let last=0;for(let i=0;i<72;i++){const p=nativePitcherPose({...state,clock:i/100},view);assert.ok(p.frame>=last);last=p.frame;}
 }
 assert.equal(nativePitcherPose({pitcherId:'coral-club-emma',pitcherHand:'R'}),null);
 const pitch={duration:.68,x:0,y:0};
 assert.deepEqual(pitchPosition(pitch,0,'coral-club-emma').x,nativePitchRelease('front').x);
 assert.deepEqual(pitchingPosition(pitch,0,'L').x,nativePitchRelease('rear').x);
 assert.ok(nativePitchRelease('rear').x>300&&nativePitchRelease('front').x<957);
});
