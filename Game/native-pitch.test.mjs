import test from 'node:test';import assert from 'node:assert/strict';
import {EMMA_NATIVE_PITCH,RYAN_NATIVE_PITCH}from'./native-pitch-data.mjs';
import {nativePitcherPose,nativePitchCandidatePose,nativePitchRelease,defensivePitcherPoint,NATIVE_PITCH_RELEASE_FRAME,nativePitchFrame}from'./pitching-art.mjs';
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

test('Ryan native motion is retained for review but its rejected appearance cannot enter live gameplay',()=>{
 for(const view of ['front','rear']){
  const clip=RYAN_NATIVE_PITCH[view];assert.equal(clip.frames.length,38);
  const poses=clip.frames.map(row=>nativePitchCandidatePose({pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'windup',clock:0},view));
  assert.ok(poses.every(p=>p.throws==='R'&&p.gloveHand==='L'&&p.scale>0));
  const pivot=clip.frames.filter(r=>r.frame<=33).map(r=>[r.feet.R[0]-r.rect[0],r.feet.R[1]-r.rect[1]]);
  const landing=clip.frames.filter(r=>r.frame>=35).map(r=>[r.feet.L[0]-r.rect[0],r.feet.L[1]-r.rect[1]]);
  for(const group of [pivot,landing])for(const p of group)assert.ok(Math.hypot(p[0]-group[0][0],p[1]-group[0][1])<.001,'Support foot remains registered');
  const release=nativePitchCandidatePose({pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'flight',elapsed:0},view);
  assert.equal(release.frame,40);assert.equal(release.containsBall,false);assert.equal(release.ballVisible,false);
  assert.ok(Object.values(defensivePitcherPoint(release,release.hand)).every(Number.isFinite));assert.equal(nativePitchRelease(view,'navy-stars-ryan'),null);assert.equal(nativePitcherPose({pitcherId:'navy-stars-ryan',pitcherHand:'R',phase:'flight',elapsed:0},view),null);
  assert.notEqual(release.asset,nativePitchCandidatePose({pitcherId:'coral-club-emma',pitcherHand:'L',phase:'flight',elapsed:0},view).asset);
 }
 assert.equal(nativePitchCandidatePose({pitcherId:'navy-stars-ryan',pitcherHand:'L'}),null);
});

test('native follow-through continues on the result clock and reaches its grounded final pose',()=>{
 const state={pitcherId:'coral-club-emma',pitcherHand:'L',phase:'result',elapsed:.05,clock:0};
 assert.ok(nativePitchFrame(state)<73,'An early result must not skip the leg swing');
 let last=0;
 for(let i=0;i<=70;i++){
  const s={...state,clock:i/100},frame=nativePitchFrame(s);assert.ok(frame>=last);last=frame;
  for(const view of ['front','rear'])assert.equal(nativePitcherPose(s,view).throws,'L');
 }
 assert.equal(last,73);assert.equal(nativePitchFrame({...state,clock:.57}),73);
 assert.equal(nativePitchFrame({...state,phase:'ready'}),1);
});

import {NATIVE_PITCH_ASSETS} from './pitching-art.mjs';
import {SCENE_ASSETS} from './scene-render.mjs';
test('the release artwork catalogue excludes rejected Ryan atlases while retaining his painted delivery',()=>{
 for(const clip of Object.values(RYAN_NATIVE_PITCH))assert.ok(!Object.values(SCENE_ASSETS).includes(clip.asset),'Rejected atlas must not be packaged through the runtime catalogue');
 assert.ok(!('ryanPitchNative' in NATIVE_PITCH_ASSETS));assert.ok(!('defenseRyanNative' in NATIVE_PITCH_ASSETS));
 for(const key of ['defenseRyanrelease','defenseRyanlegSwing','defenseRyanfinish'])assert.ok(SCENE_ASSETS[key]);
});
