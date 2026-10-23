import test from 'node:test';import assert from 'node:assert/strict';
import {createDerby,derbyPitch,applyDerbySwing,restoreDerby} from './home-run-derby.mjs';
const players=[{id:'left',bats:'L',power:90},{id:'right',bats:'R',power:90},{id:'third',bats:'R',power:80}];
const take=s=>applyDerbySwing(s,{pitchId:derbyPitch(s).id});
const homer=s=>{const p=derbyPitch(s);return applyDerbySwing(s,{pitchId:p.id,swing:{x:p.x,y:p.y-.25,impactTime:p.duration}});};
test('all contestants get equal qualifying pitches; ties at the finalist cutoff advance together',()=>{
 let s=createDerby({players,pitchesPerTurn:2});const initial=structuredClone(s);
 for(let i=0;i<6;i++)s=take(s);
 assert.deepEqual(initial,createDerby({players,pitchesPerTurn:2}));assert.equal(s.stage,'final');assert.equal(s.rounds[0].eligible.length,3);assert.equal(s.log.length,6);assert.equal(s.eligible.length,3);
});
test('home runs use shared flight physics, finals reset scores and a winner receives no phantom match runs',()=>{
 let s=createDerby({players:players.slice(0,2),pitchesPerTurn:1});s=homer(s);assert.equal(s.log[0].homeRun,true);assert.ok(s.longest.left>330);s=take(s);assert.equal(s.stage,'final');assert.equal(s.scores.left,0);s=homer(s);s=take(s);assert.equal(s.over,true);assert.deepEqual(s.winners,['left']);assert.equal(s.log.length,4);assert.equal(derbyPitch(s),null);
});
test('equal tie breaks give each hitter the same chance and end in a shared result at the limit',()=>{
 let s=createDerby({players:players.slice(0,2),pitchesPerTurn:1,tieBreakPitches:2,maxTieBreaks:2});while(!s.over)s=take(s);
 assert.deepEqual(s.winners,['left','right']);assert.equal(s.log.length,12);assert.equal(s.rounds.filter(r=>r.stage==='tiebreak').length,2);
});
test('reopening recomputes scores and rejects edited totals; retrying a completed swing cannot count it twice',()=>{
 let s=createDerby({players});const p=derbyPitch(s),command={pitchId:p.id,swing:{x:p.x,y:p.y-.25,impactTime:p.duration}};s=applyDerbySwing(s,command);assert.deepEqual(applyDerbySwing(s,command),s);assert.deepEqual(restoreDerby(JSON.parse(JSON.stringify(s))),s);
 const edited=structuredClone(s);edited.scores.left=99;assert.throws(()=>restoreDerby(edited));assert.throws(()=>applyDerbySwing(s,{pitchId:p.id}));assert.throws(()=>applyDerbySwing(s,{pitchId:'stale'}));assert.throws(()=>applyDerbySwing(s,{pitchId:derbyPitch(s).id,swing:{x:NaN,y:0,impactTime:1}}));
});
test('invalid rosters and format fail before starting',()=>{assert.throws(()=>createDerby({players:[players[0],players[0]]}));assert.throws(()=>createDerby({players,pitchesPerTurn:0}));assert.throws(()=>createDerby({players:[...players,{id:'bad',bats:'switch',power:90}]}));});
