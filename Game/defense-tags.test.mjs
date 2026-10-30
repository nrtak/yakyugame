import test from'node:test';import assert from'node:assert/strict';
import{GroundDefense,BASE_POINTS}from'./defense-play.mjs';
import{TAG_REACH}from'./defense-tags.mjs';
import{createMatch,applyOutcome,currentBatter,TEAMS}from'./match-engine.mjs';
import{DeviceGame}from'./device-game.mjs';
import{liveFieldPose,liveBallPoint,fieldProject}from'./live-field-art.mjs';
const wait=(p,fn)=>{for(let n=0;n<3000&&!fn();n++)p.step(.002);assert.ok(fn());};
function setup({match,runnerTimes={}}={}){const m=match??createMatch({innings:1});if(!m.bases[0])m.bases[0]=TEAMS[0].players[1].id;return{m,p:new GroundDefense({teamId:'navy-stars',batterId:currentBatter(m).id,bases:m.bases,outs:m.outs,target:{x:64,y:66},runnerTimes})};}
function toSecond(p){wait(p,()=>p.canThrow);assert.equal(p.throwTo('1B'),true);wait(p,()=>p.canThrow);assert.equal(p.retired.length,1);assert.deepEqual(p.activeForces,{});assert.equal(p.throwTo('2B'),true);wait(p,()=>p.tagOptions.length>0);}
function finish(p){for(let n=0;n<3000&&!p.finished;n++)p.step(.01);assert.ok(p.finished);return p.resolution;}

test('a reverse relay requires a real tag; a prepared tag waits for controlled contact',()=>{
 const a=setup();toSecond(a.p);const noTag=finish(a.p);assert.equal(noTag.retired.length,1);assert.equal(a.p.state.call,'safe');
 const{m,p}=setup();assert.equal(p.tagRunner(),false);toSecond(p);assert.equal(p.tagRunner(),true);assert.equal(p.tagRunner(),false);assert.equal(p.retired.length,1);assert.equal(p.state.phase,'tag-ready');
 wait(p,()=>p.retired.length===2);const tag=p.retired[1];assert.equal(tag.force,false);assert.ok(tag.tag.controlAt<=tag.at);assert.ok(p.clock>=tag.at);assert.ok(!p.finished,'Hold the actual tag contact before ending a two-out play');assert.ok(Math.hypot(tag.tag.holderPoint.x-tag.tag.runnerPoint.x,tag.tag.holderPoint.y-tag.tag.runnerPoint.y)<=TAG_REACH+1e-6);
 assert.equal(p.state.callKind,'tag');assert.equal(p.state.call,'out');assert.equal(liveFieldPose(p.state,p.state.players.find(a=>a.id===tag.tag.holderId)),null);
 const ball=liveBallPoint(p.state,new Map()),expected=fieldProject(p.state.ball);assert.deepEqual(ball,{x:expected.x,y:expected.y-3.6});
 const out=applyOutcome(m,finish(p));assert.equal(out.match.outs,2);assert.equal(out.event.tagOuts,1);assert.equal(out.event.playType,'doubleplay');
});

test('runner on a base or protected first-base overrun cannot be tagged by proximity alone',()=>{
 const{p}=setup();toSecond(p);wait(p,()=>p.clock>=p.runners[1].arriveAt);assert.equal(p.tagRunner(),false);assert.equal(p.retired.length,1);
 const q=new GroundDefense();q.step(q.runnerTime);assert.deepEqual(q.state.runners[0].point,BASE_POINTS['1B']);assert.equal(q.tagRunner(),false);q.step(.2);assert.equal(q.tagRunner(),false);
});

test('throwing away cancels a prepared tag, and large time steps do not skip a valid touch',()=>{
 const q=setup().p;toSecond(q);q.tagRunner();wait(q,()=>q.canThrow);assert.equal(q.throwTo('3B'),true);assert.equal(q.tagAttempt,null);assert.equal(finish(q).retired.length,1);
 const times=[];for(const dt of[.002,.05,20]){const p=setup().p;toSecond(p);p.tagRunner();for(let n=0;n<3000&&!p.finished;n++)p.step(dt);assert.equal(p.retired.length,2);times.push(p.retired[1].at);}assert.ok(Math.max(...times)-Math.min(...times)<1e-7);
});

test('third tag-out timing counts only runs that crossed home before the tag',()=>{
 let loaded=createMatch({innings:1});for(let i=0;i<3;i++)loaded=applyOutcome(loaded,{kind:'single'}).match;loaded.outs=1;
 for(const homeTime of[3.2,5]){const{m,p}=setup({match:loaded,runnerTimes:{[loaded.bases[0]]:4.5,[loaded.bases[2]]:homeTime}});toSecond(p);p.tagRunner();const r=finish(p),out=applyOutcome(m,r);assert.equal(r.retired.length,2);assert.equal(r.retired.at(-1).force,false);assert.equal(out.match.half,1);assert.equal(out.match.score[0],homeTime===3.2?1:0);}
});

test('rules reject missing control, impossible reach, forged runner positions and force relabeling',()=>{
 const{m,p}=setup();toSecond(p);p.tagRunner();const r=finish(p);
 for(const mutate of [x=>{delete x.retired[1].tag;},x=>{x.retired[1].tag.controlAt=x.retired[1].at+1;},x=>{x.retired[1].tag.holderPoint.x+=100;},x=>{x.retired[1].tag.runnerPoint.y+=10;},x=>{x.retired[0].force=false;}]){const bad=structuredClone(r);mutate(bad);assert.throws(()=>applyOutcome(m,bad));}
});

test('device pause freezes a prepared tag and rejects new tag input',()=>{
 const g=new DeviceGame({teamId:'navy-stars'});g.start();g.match.bases[0]=TEAMS[0].players[1].id;g.inning.beginDefense({target:{x:64,y:66}});g.phase='field';const p=g.inning.pending;toSecond(p);
 g.pause();assert.equal(g.tagRunner(),false);const before=structuredClone(g.defense);g.step(1);assert.deepEqual(g.defense,before);g.resume();assert.equal(g.tagRunner(),true);g.pause();const armed=structuredClone(g.defense);g.step(1);assert.deepEqual(g.defense,armed);
});
