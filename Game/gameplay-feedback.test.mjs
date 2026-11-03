import test from'node:test';import assert from'node:assert/strict';
import{GamePacing,automaticPitchDelay}from'./game-pacing.mjs';
import{DeviceGame}from'./device-game.mjs';
import{createMatch,makeMatchPitch}from'./match-engine.mjs';
import{PITCH_TYPES,projectPitch}from'./pitch-types.mjs';
import{pitchingPosition,pitchingRelease,PITCHING_GEOMETRY,FIELD_PLAY_HEIGHT,createDefensiveCameraTracker}from'./scene-render.mjs';
import{GroundDefense}from'./defense-play.mjs';
import{fieldProject,liveBallPoint,liveFieldPose}from'./live-field-art.mjs';
import{isExceptionalFastball}from'./game-effects.mjs';

test('game opening freezes the first pitch and pauses without consuming the announcement',()=>{
 const p=new GamePacing(),g=new DeviceGame();g.start();p.begin();
 for(let i=0;i<20;i++)if(p.step(.05))g.step(.05);assert.equal(g.clock,0);assert.ok(p.active);
 const remaining=p.remaining;for(let i=0;i<50;i++)p.step(.05,{paused:true});assert.equal(p.remaining,remaining);
 for(let i=0;i<30;i++)if(p.step(.05))g.step(.05);assert.equal(p.active,false);assert.ok(g.clock<.15);
 p.begin({resumed:true});assert.equal(p.resumed,true);p.clear();assert.equal(p.active,false);assert.throws(()=>p.step(NaN));
});

test('only completed batting-side reviews request automatic next-pitch pacing',()=>{
 for(const teamId of['coral-club','navy-stars']){const g=new DeviceGame({teamId});g.start();g.finishPitch({kind:'strike'});const delay=automaticPitchDelay(g);assert.equal(delay,teamId==='coral-club'?1.05:null);
  if(delay!==null){const n=g.match.pitchNumber;for(let i=0;i<30;i++)g.step(.05);assert.ok(g.clock>=delay);assert.equal(g.match.pitchNumber,n);assert.equal(g.next(),true);assert.equal(g.phase,'windup');}
 }
 const g=new DeviceGame();g.start();for(let i=0;i<8;i++){g.finishPitch({kind:'strike'});g.next();}g.finishPitch({kind:'strike'});assert.equal(g.event.halfEnded,true);assert.equal(g.userBatting,false);assert.equal(automaticPitchDelay(g),2.2);
});

test('pause freezes automatic batting review time and cannot record another outcome',()=>{
 const g=new DeviceGame();g.start();g.finishPitch({kind:'ball'});g.step(.05);g.pause();const before=g.clock;for(let i=0;i<100;i++)g.step(.05);assert.equal(g.clock,before);assert.equal(g.match.pitchNumber,1);assert.equal(g.next(),false);g.resume();g.step(.05);assert.ok(g.clock>before);
});

test('fastballs, changeups and breaking pitches have distinct playable flight times and paths',()=>{
 const m=createMatch(),fast=makeMatchPitch(m,{kind:'fast',aim:{x:0,y:0}}),change=makeMatchPitch(m,{kind:'change',aim:{x:0,y:0}}),curve=makeMatchPitch(m,{kind:'curve',aim:{x:0,y:0}});
 assert.ok(fast.duration<.8);assert.ok(change.duration>=fast.duration*1.4);assert.ok(curve.duration>fast.duration&&curve.duration<change.duration);
 assert.equal(isExceptionalFastball(fast),false);assert.equal(isExceptionalFastball(makeMatchPitch(m,{kind:'fast',difficulty:'challenging'})),true);
 const at=p=>pitchingPosition(p,p.duration*.65,'R');assert.ok(Math.hypot(at(fast).x-at(curve).x,at(fast).y-at(curve).y)>8);assert.ok(at(change).q===.65);
});

test('each pitch starts at the authored release hand and clamps at its target without a return jump',()=>{
 const m=createMatch();for(const kind of Object.keys(PITCH_TYPES)){if(!['fast','curve','change','sinker','cutter'].includes(kind))continue;const p=makeMatchPitch(m,{kind,aim:{x:0,y:0}}),start=pitchingPosition(p,0,'R');assert.equal(start.x,pitchingRelease('R').x);assert.equal(start.y,pitchingRelease('R').y);
  const end=pitchingPosition(p,p.duration,'R'),later=pitchingPosition(p,p.duration+.3,'R');assert.deepEqual(later,end);assert.equal(end.x,PITCHING_GEOMETRY.zone.x-p.x*PITCHING_GEOMETRY.zone.rx);assert.equal(end.y,PITCHING_GEOMETRY.zone.y-p.y*PITCHING_GEOMETRY.zone.ry);
 }
});

test('non-fluttering pitches do not bobble vertically for a center-zone target in either camera',()=>{
 const m=createMatch();for(const kind of['fast','curve','change','sinker','cutter']){const p=makeMatchPitch(m,{kind,aim:{x:0,y:0}});p.x=0;p.y=0;for(const reverse of[false,true]){let last=0;for(let i=0;i<=1000;i++){const v=projectPitch(p,p.duration*i/1000,{x:30,y:10},{x:500,y:200,rx:65,ry:86},reverse);assert.ok(v.y>=last-1e-8);last=v.y;}}}
});

test('the control rail preserves uniform field scaling and leaves the live ball and runners above buttons',()=>{
 const play=new GroundDefense({target:{x:-40,y:115}}),tracker=createDefensiveCameraTracker();let frames=0;
 while(!play.finished&&frames++<1500){const s={...play.state,controlRail:true},poses=new Map(s.players.map(p=>[p.id,liveFieldPose(s,p)]).filter(([,p])=>p)),ball=liveBallPoint(s,poses),camera=tracker.sample(s,ball);assert.ok(Math.abs(camera.height/camera.width-FIELD_PLAY_HEIGHT/1600)<1e-10);
  for(const point of[ball,...s.runners.filter(r=>!r.out).map(r=>fieldProject(r.point))]){const y=(point.y-camera.y)*1600/camera.width;assert.ok(y>=0&&y<=FIELD_PLAY_HEIGHT,JSON.stringify({y,s:s.phase}));}
  if(s.canThrow&&s.recommendation)play.throwTo(s.recommendation);play.step(.01);
 }assert.ok(play.finished);
});
