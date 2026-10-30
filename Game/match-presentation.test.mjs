import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyOutcome} from './match-engine.mjs';
import {teamSummary,matchSummary,MatchFlowPreview} from './match-presentation.mjs';

test('captains and handedness come from current team identities, not legacy art names',()=>{
 const coral=teamSummary('coral-club'),navy=teamSummary('navy-stars');
 assert.equal(coral.captain,'Emma');assert.equal(coral.throws,'Left-handed');
 assert.equal(navy.captain,'Ryan');assert.equal(navy.throws,'Right-handed');
 for(const team of [coral,navy]){assert.equal(team.lineup.length,9);assert.equal(new Set(team.lineup.map(p=>p.position)).size,9);}
 assert.throws(()=>teamSummary('sakura-blossoms'),/Unknown team/);
});
test('selected side changes role at the half inning and unplayed score is not rendered as a run',()=>{
 let m=createMatch({innings:1});
 assert.equal(matchSummary(m).role,'batting');assert.equal(matchSummary(m,'navy-stars').role,'pitching');
 assert.deepEqual(matchSummary(m).rows.map(r=>r.innings[0]),['—','—']);
 for(let i=0;i<3;i++)m=applyOutcome(m,{kind:'groundout'}).match;
 assert.equal(matchSummary(m).role,'pitching');assert.equal(matchSummary(m,'navy-stars').role,'batting');
 assert.equal(matchSummary(m).outs,0);assert.equal(matchSummary(m).pitcher,'Emma');
});
test('scripted preview uses real scoring and reaches a one-inning final exactly once',()=>{
 const flow=new MatchFlowPreview();const final=flow.finish();
 assert.equal(final.over,true);assert.deepEqual(final.score,[1,0]);assert.deepEqual(final.hits,[2,1]);
 const coral=matchSummary(final),navy=matchSummary(final,'navy-stars');
 assert.equal(coral.result,'You win!');assert.equal(navy.result,'Good game');
 assert.equal(coral.stats.find(p=>p.id==='coral-club-emma').r,1);
 assert.equal(flow.next(),null);assert.equal(flow.match.log.length,13);
 flow.reset();assert.deepEqual(flow.match.score,[0,0]);assert.equal(flow.index,0);
});
test('a drawn one-inning game is presented as a draw for either selected team',()=>{
 let m=createMatch({innings:1});for(let i=0;i<6;i++)m=applyOutcome(m,{kind:'flyout'}).match;
 assert.equal(matchSummary(m).result,'Draw');assert.equal(matchSummary(m,'navy-stars').result,'Draw');
 assert.equal(matchSummary(m).winningTeam,null);
});
