import test from 'node:test';import assert from 'node:assert/strict';
import {createMatch,applyOutcome,currentBatter} from './match-engine.mjs';
test('ground-rule double awards two bases to each runner and records one hit with correct RBI',()=>{
 let m=createMatch();for(let i=0;i<3;i++)m=applyOutcome(m,{kind:'single'}).match;
 const before=structuredClone(m),batter=currentBatter(m),r=applyOutcome(m,{kind:'groundruledouble'});
 assert.deepEqual(m,before);assert.deepEqual(r.match.bases,[null,batter.id,m.bases[0]]);assert.equal(r.match.score[0],2);assert.equal(r.match.hits[0],4);assert.equal(r.match.stats[batter.id].rbi,2);assert.equal(r.event.kind,'double');assert.equal(r.event.groundRule,true);
});
test('non-HR ground-rule walk-off stops at the winning run',()=>{
 let m=createMatch({innings:1});m=applyOutcome(m,{kind:'homerun'}).match;for(let i=0;i<3;i++)m=applyOutcome(m,{kind:'groundout'}).match;for(let i=0;i<3;i++)m=applyOutcome(m,{kind:'single'}).match;
 const r=applyOutcome(m,{kind:'groundruledouble'});assert.equal(r.match.over,true);assert.equal(r.event.walkOff,true);assert.deepEqual(r.match.score,[1,2]);assert.equal(r.event.runs,2);
});
