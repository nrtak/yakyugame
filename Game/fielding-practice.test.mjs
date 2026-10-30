import test from'node:test';import assert from'node:assert/strict';
import{FieldingPractice,FIELDING_DRILLS}from'./fielding-practice.mjs';
import{TEAMS}from'./rosters.mjs';

test('both clubs complete six drills with their own roster and the real defensive rules',()=>{
 for(const team of TEAMS){const p=new FieldingPractice({teamId:team.id});assert.equal(p.start(),true);
  while(p.phase!=='summary'){
   assert.ok(p.defense.players.every(a=>team.players.some(b=>b.id===a.id&&a.throws===b.throws&&a.gloveHand===b.gloveHand)));
   assert.ok(p.defense.runners.every(r=>r.id.startsWith(p.offense.id+'-')));
   let frames=0;while(p.phase==='field'&&frames++<2000){if(p.defense.canTag)p.tagRunner();else if(p.defense.canThrow&&p.defense.recommendation)p.throwTo(p.defense.recommendation);p.step(.01);}
   assert.equal(p.phase,'review');assert.equal(p.throwTo('1B'),false);assert.equal(p.next(),true);
  }
  assert.equal(p.summary.drills,6);assert.equal(p.summary.outs,8);assert.equal(p.summary.results.find(r=>r.id==='fly').outs,1);assert.equal(p.summary.results.find(r=>r.id==='relay').outs,2);assert.equal(p.summary.results.find(r=>r.id==='tag').outs,2);
  const copy=p.summary;copy.results.length=0;assert.equal(p.summary.drills,6);assert.equal(p.next(),false);
 }
 assert.equal(FIELDING_DRILLS.length,6);assert.throws(()=>new FieldingPractice({teamId:'other'}));
});

test('paused drills freeze possession and reject throws or next-drill input',()=>{
 const p=new FieldingPractice();p.start();while(!p.defense.canThrow)p.step(.01);
 p.paused=true;const s=structuredClone(p.defense);p.step(1);assert.deepEqual(p.defense,s);assert.equal(p.throwTo('1B'),false);assert.equal(p.next(),false);
 p.paused=false;assert.equal(p.throwTo('1B'),true);assert.equal(p.throwTo('1B'),false);while(p.phase==='field')p.step(.02);
 const count=p.summary.drills;for(let i=0;i<30;i++)p.step(.05);assert.equal(p.summary.drills,count);
 p.paused=true;assert.equal(p.next(),false);p.paused=false;assert.equal(p.next(),true);assert.equal(p.defense.clock,0);
});

test('late manual throws stay late and holding the ball does not invent an out',()=>{
 const p=new FieldingPractice();assert.equal(p.throwTo('1B'),false);assert.equal(p.next(),false);p.start();
 while(p.phase==='field')p.step(.02);assert.equal(p.summary.outs,0);assert.deepEqual(p.summary.results[0].throws,[]);
 const q=new FieldingPractice();q.start();while(q.defense.clock<4.2&&q.phase==='field')q.step(.01);assert.equal(q.defense.canThrow,true);q.throwTo('1B');while(q.phase==='field')q.step(.02);assert.equal(q.summary.outs,0);assert.equal(q.summary.results[0].call,'safe');
 assert.throws(()=>p.step(-1));assert.throws(()=>p.step(NaN));
});
