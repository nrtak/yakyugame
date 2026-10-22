import test from 'node:test';import assert from 'node:assert/strict';
import {GroundDefense,BASE_POINTS,DEFENSE_SPOTS,RUNNER_CLEARANCE,RECEIVER_OFFSET} from './defense-play.mjs';
import {InningController} from './inning-controller.mjs';
import {createMatch,applyOutcome,currentBatter} from './match-engine.mjs';
const ready=p=>p.step(p.collectAt);
const finish=p=>{p.step(20);return p.resolution;};
const loaded=()=>{let m=createMatch({innings:1});for(let i=0;i<3;i++)m=applyOutcome(m,{kind:'single'}).match;return m;};
const fromMatch=(m,options={})=>new GroundDefense({...options,teamId:m.half===0?'navy-stars':'coral-club',batterId:currentBatter(m).id,bases:m.bases,outs:m.outs});

test('field coordinates preserve 90-foot basepaths and mound distance',()=>{
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);for(const [a,b]of[['HOME','1B'],['1B','2B'],['2B','3B'],['3B','HOME']])assert.ok(Math.abs(d(BASE_POINTS[a],BASE_POINTS[b])-90)<1e-8);assert.equal(DEFENSE_SPOTS.P.y,60.5);
});
test('automatic selection and coverage use real team-qualified identities without duplicate receivers',()=>{
 for(const target of [{x:-45,y:105},{x:60,y:85},{x:0,y:60},{x:0,y:10},{x:0,y:250}]){
  const p=new GroundDefense({target});assert.equal(p.state.players.length,9);const ids=Object.values(p.coverage).map(r=>r.id);assert.equal(new Set(ids).size,4);assert.ok(!ids.includes(p.fielder.id));assert.ok(ids.every(id=>id.startsWith('navy-stars-')));
 }
 const p=new GroundDefense({target:{x:60,y:85}});assert.equal(p.fielder.position,'1B');assert.equal(p.coverage['1B'].position,'P');
});
test('touch controls wait for a secured ball and accept one valid base selection',()=>{
 const p=new GroundDefense();assert.equal(p.throwTo('1B'),false);p.step(p.touchAt+.05);assert.equal(p.state.phase,'gather');assert.equal(p.canThrow,false);p.step(.2);assert.equal(p.canThrow,true);assert.equal(p.throwTo('invalid'),false);assert.equal(p.throwTo('1B'),true);assert.equal(p.throwTo('2B'),false);assert.equal(p.state.phase,'transfer');
});
test('early throws retire the batter; holding the ball has a real timing consequence',()=>{
 const early=new GroundDefense();ready(early);early.throwTo('1B');assert.equal(finish(early).recordAs,'groundout');
 const late=new GroundDefense();ready(late);late.step(1.7);late.throwTo('1B');assert.equal(finish(late).recordAs,'single');
 const held=new GroundDefense();assert.equal(finish(held).recordAs,'single');assert.equal(held.state.ballOwnerId,held.fielder.id);
});
test('tie at the receiving bag is safe',()=>{
 const sample=new GroundDefense();const receive=sample.predictThrow('1B',sample.collectAt).controlAt;
 const p=new GroundDefense({runnerTime:receive});ready(p);p.throwTo('1B');assert.equal(finish(p).recordAs,'single');
});
test('a throw to third with only a runner on second cannot manufacture a force out',()=>{
 const p=new GroundDefense({bases:[null,'coral-club-mia',null]});assert.deepEqual(Object.keys(p.forces),['1B']);ready(p);p.throwTo('3B');const r=finish(p);assert.equal(p.state.call,'no-force');assert.deepEqual(r.retired,[]);assert.ok(r.destinations.some(r=>r.id==='coral-club-mia'&&r.base===2));
});
test('the force chain stops at an empty base and recommendations never invent a force',()=>{
 const p=new GroundDefense({bases:['coral-club-mia',null,'coral-club-ken']});assert.deepEqual(Object.keys(p.forces),['1B','2B']);ready(p);assert.ok(['1B','2B'].includes(p.recommendation));
});
test('fielder choice retires the correct forced runner and advances the actual batter',()=>{
 const m=loaded(),p=fromMatch(m);ready(p);p.throwTo('2B');const r=finish(p);assert.equal(r.recordAs,'fielderschoice');assert.equal(r.retired[0].id,m.bases[0]);const next=applyOutcome(m,r);assert.equal(next.match.outs,1);assert.equal(next.match.bases[0],currentBatter(m).id);assert.equal(next.match.bases[1],null);assert.equal(next.match.bases[2],m.bases[1]);assert.equal(next.match.score[0],1);assert.equal(next.match.hits[0],3);
});
test('third-out force suppresses runs and changes sides; loaded force at home is valid',()=>{
 let m=loaded();m.outs=2;const p=fromMatch(m);ready(p);p.throwTo('HOME');const r=finish(p);assert.equal(r.retired[0].id,m.bases[2]);assert.deepEqual(r.runs,[]);const next=applyOutcome(m,r);assert.equal(next.match.half,1);assert.deepEqual(next.match.score,[0,0]);assert.deepEqual(next.match.bases,[null,null,null]);
});
test('ball is visible throughout pickup, transfer, flight, and receiving possession',()=>{
 const p=new GroundDefense();const owners=new Set();let prior;
 for(let i=0;i<1200&&!p.finished;i++){if(p.canThrow)p.throwTo('1B');const s=p.step(.005);owners.add(s.possession);assert.ok([s.ball.x,s.ball.y,s.ball.z].every(Number.isFinite));if(prior)assert.ok(Math.hypot(s.ball.x-prior.x,s.ball.y-prior.y,s.ball.z-prior.z)<5);prior=s.ball;if(s.possession==='receiving-glove'){const owner=s.players.find(a=>a.id===s.ballOwnerId);assert.ok(Math.hypot(owner.point.x-s.ball.x,owner.point.y-s.ball.y)<1e-6);}}
 assert.deepEqual([...owners].sort(),['fielding-glove','free','receiving-glove','throwing-hand']);
});
test('rules reject stale context, fake outs, duplicate destinations and scoring overrides',()=>{
 const m=loaded(),p=fromMatch(m);ready(p);p.throwTo('2B');const r=finish(p);
 for(const edit of [x=>x.context.outs++,x=>x.retired[0].base='1B',x=>x.destinations.push({...x.destinations[0]}),x=>x.recordAs='single']){const bad=structuredClone(r);edit(bad);assert.throws(()=>applyOutcome(m,bad));}
 assert.equal(m.outs,0);assert.equal(m.log.length,3);
});
test('one complete inning accepts manual throws, changes actors, and applies each play once',()=>{
 const c=new InningController();for(let n=0;n<6;n++){const s=c.beginDefense();assert.equal(s.fielderId.startsWith(n<3?'navy-stars-':'coral-club-'),true);assert.equal(c.throwTo('1B'),false);let event=null;for(let i=0;i<300&&!event;i++){if(c.defenseState?.canThrow)c.throwTo('1B');event=c.step(.05);}assert.equal(event.kind,'groundout');assert.equal(c.step(1),null);}
 assert.equal(c.view,'final');assert.equal(c.events.length,6);assert.deepEqual(c.match.score,[0,0]);assert.equal(c.match.winner,null);assert.throws(()=>c.beginDefense());
});
test('invalid teams, duplicate runners, wrong-team runners and non-finite time fail early',()=>{
 for(const opts of [{teamId:'unknown'},{bases:['coral-club-emma',null,null]},{bases:['navy-stars-ken',null,null]},{target:{x:100,y:20}},{outs:3}])assert.throws(()=>new GroundDefense(opts));
 const p=new GroundDefense();for(const t of [-1,NaN,Infinity])assert.throws(()=>p.step(t));
});
const sequence=(p,bases)=>{let i=0;for(let n=0;n<10000&&!p.finished;n++){if(p.canThrow&&i<bases.length){assert.equal(p.throwTo(bases[i++]),true);}p.step(.002);}assert.ok(p.finished);return p.resolution;};
test('second-to-first turns a timed double play, with no RBI for its scoring run',()=>{
 const m=loaded(),p=fromMatch(m),r=sequence(p,['2B','1B']);assert.equal(r.retired.length,2);assert.equal(r.retired[0].id,m.bases[0]);assert.equal(r.retired[1].id,currentBatter(m).id);const result=applyOutcome(m,r);assert.equal(result.match.outs,2);assert.equal(result.event.playType,'doubleplay');assert.equal(result.match.score[0],1);assert.equal(result.match.stats[currentBatter(m).id].rbi,0);
});
test('near-third pickup, bag touch, second and first can complete a triple play',()=>{
 const m=loaded(),p=fromMatch(m,{target:{x:-64,y:66}}),r=sequence(p,['3B','2B','1B']);assert.equal(p.throws[0].carry,true);assert.equal(p.throws[0].holderId,p.throws[0].receiverId);assert.equal(r.retired.length,3);assert.deepEqual(r.retired.map(x=>x.id),[m.bases[1],m.bases[0],currentBatter(m).id]);const result=applyOutcome(m,r);assert.equal(result.event.playType,'tripleplay');assert.equal(result.match.half,1);assert.deepEqual(result.match.score,[0,0]);assert.deepEqual(result.match.bases,[null,null,null]);
});
test('retiring the batter first removes forces ahead; a later bag touch cannot be another force out',()=>{
 const m=loaded(),p=fromMatch(m),r=sequence(p,['1B','2B']);assert.equal(r.retired.length,1);assert.equal(r.retired[0].id,currentBatter(m).id);assert.deepEqual(p.activeForces,{});const bad=structuredClone(r);bad.retired.push({id:m.bases[0],base:'2B',force:true});assert.throws(()=>applyOutcome(m,bad),/removed force/);
});
test('one out before a double play ends the half and cancels runs on the third force out',()=>{
 const m=loaded();m.outs=1;const p=fromMatch(m),r=sequence(p,['2B','1B']);assert.equal(r.retired.length,2);assert.deepEqual(r.runs,[]);const result=applyOutcome(m,r);assert.equal(result.match.half,1);assert.deepEqual(result.match.score,[0,0]);
});
test('two existing outs allow only one more retirement and reject an invented fourth out',()=>{
 const m=loaded();m.outs=2;const p=fromMatch(m),r=sequence(p,['2B','1B']);assert.equal(r.retired.length,1);assert.equal(p.throwTo('1B'),false);const bad=structuredClone(r);bad.retired.push({id:currentBatter(m).id,base:'1B',force:true});assert.throws(()=>applyOutcome(m,bad),/Too many/);
});
test('a late relay cannot turn into a guaranteed double play',()=>{
 const m=loaded(),p=fromMatch(m);ready(p);p.throwTo('2B');p.step(3);assert.ok(p.retired.length===1);assert.equal(p.canThrow,false);p.step(2);assert.equal(p.finished,true);assert.equal(p.resolution.retired.length,1);
});

test('covering players keep bodies aside while a separate receiving foot contacts the official bag',()=>{
 const p=new GroundDefense();p.step(2);
 for(const f of p.state.players.filter(p=>p.covering)){assert.deepEqual(f.bagContact,BASE_POINTS[f.covering]);assert.ok(Math.abs(Math.hypot(f.point.x-f.bagContact.x,f.point.y-f.bagContact.y)-RECEIVER_OFFSET)<1e-8);}
 const early=new GroundDefense().state.players.find(p=>p.covering==='1B');assert.equal(early.bagContact,null);
});
test('routine coverage and backup routes clear runners with bases empty and loaded',()=>{
 for(const target of [{x:-45,y:105},{x:60,y:85},{x:0,y:60},{x:0,y:10},{x:0,y:250},{x:-64,y:66},{x:100,y:150}])for(const bases of [[null,null,null],['coral-club-mia','coral-club-ken','coral-club-lily']]){
  const p=new GroundDefense({target,bases});let previous;
  for(let t=0;t<=5;t+=.02){const points=p.players.filter(f=>f.role!=='field').map(f=>p.playerPoint(f,t));
   for(const point of points)for(const r of p.runners)assert.ok(Math.hypot(point.x-p.runnerPoint(r,t).x,point.y-p.runnerPoint(r,t).y)>=RUNNER_CLEARANCE-1e-8);
   if(previous)points.forEach((point,i)=>assert.ok(Math.hypot(point.x-previous[i].x,point.y-previous[i].y)<=.481));previous=points;
  }
 }
});
test('safe batter-runners touch then run through first without receiving an extra base',()=>{
 const p=new GroundDefense();p.step(p.runnerTime);assert.deepEqual(p.state.runners[0].point,BASE_POINTS['1B']);p.step(.7);
 assert.ok(Math.hypot(p.state.runners[0].point.x-BASE_POINTS['1B'].x,p.state.runners[0].point.y-BASE_POINTS['1B'].y)>15.9);
 assert.deepEqual(p.resolution.destinations,[{id:'coral-club-emma',base:1}]);
});
test('a relay starts at the receiving player, and outs stay retired through later throws',()=>{
 const m=loaded(),p=fromMatch(m);ready(p);p.throwTo('2B');while(!p.canThrow&&!p.finished)p.step(.002);const receiver=p.state.ballOwnerId,prior=p.state.ball;p.throwTo('1B');assert.equal(p.throw.holderId,receiver);assert.ok(Math.hypot(p.state.ball.x-prior.x,p.state.ball.y-prior.y)<.01);assert.equal(p.state.runners.filter(r=>r.out).length,1);p.step(.5);assert.equal(p.state.runners.filter(r=>r.out).length,1);
});
