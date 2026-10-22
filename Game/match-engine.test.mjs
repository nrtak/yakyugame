import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyOutcome,currentBatter,makeMatchPitch,cpuBat,contactOutcome,TEAMS} from './match-engine.mjs';
const play=(m,kind)=>applyOutcome(m,{kind}).match;
const strikeout=m=>{for(let i=0;i<3;i++)m=play(m,'strike');return m;};
const walk=m=>{for(let i=0;i<4;i++)m=play(m,'ball');return m;};

test('early contact pulls toward the batting-hand side and late contact goes opposite',()=>{
 for(const hand of ['R','L']){
  const m=createMatch({innings:1});m.order[0]=TEAMS[0].players.findIndex(p=>p.bats===hand);
  assert.ok(m.order[0]>=0);
  const early=contactOutcome(m,{quality:.8,timingMs:-70}),late=contactOutcome(m,{quality:.8,timingMs:70});
  assert.equal(Math.sign(early.direction),hand==='R'?-1:1);
  assert.equal(late.direction,-early.direction);
 }
});
test('two co-ed lineups have nine unique positions and one captain each',()=>{
  for(const t of TEAMS){assert.equal(t.players.length,9);assert.equal(t.players.filter(p=>p.captain).length,1);assert.equal(new Set(t.players.map(p=>p.position)).size,9);assert.equal(new Set(t.players.map(p=>p.gender)).size,2);}
});
test('fouls cannot become a third strike, and takes can walk a batter',()=>{
  let m=createMatch();m=play(play(m,'strike'),'strike');
  for(let i=0;i<5;i++)m=play(m,'foul');assert.equal(m.strikes,2);assert.equal(m.outs,0);
  m=walk(m);assert.equal(m.bases[0],'coral-club-emma');assert.equal(m.strikes,0);assert.equal(m.balls,0);assert.equal(currentBatter(m).id,'coral-club-mia');assert.equal(m.stats['coral-club-emma'].bb,1);assert.equal(m.stats['coral-club-emma'].ab,0);
});
test('three outs switch sides, clear runners, and preserve lineup order',()=>{
  let m=createMatch();m=walk(m);for(let i=0;i<3;i++)m=strikeout(m);
  assert.equal(m.half,1);assert.equal(m.inning,1);assert.equal(m.outs,0);assert.deepEqual(m.bases,[null,null,null]);assert.equal(m.order[0],4);
  for(let i=0;i<3;i++)m=strikeout(m);assert.equal(m.half,0);assert.equal(m.inning,2);assert.equal(currentBatter(m).id,'coral-club-dylan');
});
test('walks move only forced runners, including a bases-loaded run',()=>{
  let m=createMatch();m.bases=[null,'coral-club-dylan','coral-club-noah'];m=walk(m);assert.deepEqual(m.bases,['coral-club-emma','coral-club-dylan','coral-club-noah']);assert.equal(m.score[0],0);
  m=walk(m);assert.equal(m.score[0],1);assert.deepEqual(m.bases,['coral-club-mia','coral-club-emma','coral-club-dylan']);assert.equal(m.stats['coral-club-noah'].r,1);assert.equal(m.stats['coral-club-mia'].rbi,1);
});
test('single, double, triple and home run advance occupied bases without collisions',()=>{
  const expectations={single:{bases:['coral-club-emma','coral-club-mia','coral-club-ken'],runs:1},double:{bases:[null,'coral-club-emma','coral-club-mia'],runs:2},triple:{bases:[null,null,'coral-club-emma'],runs:3},homerun:{bases:[null,null,null],runs:4}};
  for(const [kind,expected] of Object.entries(expectations)){
    let m=createMatch();m.bases=['coral-club-mia','coral-club-ken','coral-club-lily'];m=play(m,kind);
    assert.deepEqual(m.bases,expected.bases);assert.equal(m.score[0],expected.runs);assert.equal(m.stats['coral-club-emma'].rbi,expected.runs);assert.equal(m.hits[0],1);assert.equal(m.stats['coral-club-emma'].ab,1);
  }
});
test('routine outs hold runners and do not count as hits',()=>{
  let m=createMatch();m.bases=['coral-club-dylan',null,null];m=play(m,'groundout');assert.equal(m.outs,1);assert.equal(m.bases[0],'coral-club-dylan');assert.equal(m.hits[0],0);m=play(m,'flyout');assert.equal(m.outs,2);
});
test('six scoreless half-innings complete exactly three innings as a draw',()=>{
  let m=createMatch();for(let i=0;i<18;i++)m=strikeout(m);
  assert.equal(m.over,true);assert.equal(m.winner,null);assert.equal(m.pitchNumber,54);assert.deepEqual(m.lineScore,[[0,0,0],[0,0,0]]);assert.equal(m.inning,3);
});
test('home lead skips bottom of final inning, away lead still requires it',()=>{
  let m=createMatch();m.inning=3;m.score=[0,1];m.outs=2;m.strikes=2;
  let result=applyOutcome(m,{kind:'strike'});assert.equal(result.match.over,true);assert.equal(result.match.winner,1);assert.equal(result.match.lineScore[1][2],null);
  m.score=[1,0];result=applyOutcome(m,{kind:'strike'});assert.equal(result.match.over,false);assert.equal(result.match.half,1);
});
test('walk-off hit and bases-loaded walk finish immediately',()=>{
  let m=createMatch();m.inning=3;m.half=1;m.score=[0,0];m.bases=[null,null,'navy-stars-lily'];
  let r=applyOutcome(m,{kind:'single'});assert.equal(r.match.over,true);assert.equal(r.event.walkOff,true);assert.equal(r.match.winner,1);
  m.bases=['navy-stars-mia','navy-stars-ken','navy-stars-lily'];m.balls=3;r=applyOutcome(m,{kind:'ball'});assert.equal(r.match.over,true);assert.equal(r.event.kind,'walk');assert.equal(r.match.score[1],1);
});
test('walk-off home run scores all runners',()=>{
  let m=createMatch();m.inning=3;m.half=1;m.bases=['navy-stars-mia','navy-stars-ken','navy-stars-lily'];
  const r=applyOutcome(m,{kind:'homerun'});assert.equal(r.match.score[1],4);assert.equal(r.match.over,true);assert.equal(r.event.runs,4);
});
test('non-home-run walk-off scores only the winning run',()=>{
  let m=createMatch();m.inning=3;m.half=1;m.bases=['navy-stars-mia','navy-stars-ken','navy-stars-lily'];
  const r=applyOutcome(m,{kind:'double'});assert.equal(r.match.score[1],1);assert.equal(r.event.runs,1);assert.equal(r.match.over,true);
});
test('inning count can be extended without rewriting transitions',()=>{
  let m=createMatch({innings:9});for(let i=0;i<54;i++)m=play(m,'groundout');assert.equal(m.over,true);assert.equal(m.inning,9);assert.equal(m.lineScore[0].length,9);
});
test('match transitions do not mutate callers and completed games reject extra pitches',()=>{
  const m=createMatch(),snapshot=structuredClone(m);play(m,'single');assert.deepEqual(m,snapshot);
  m.over=true;assert.throws(()=>play(m,'strike'),/complete/);
});
test('pitch selection, location and speed reach CPU decisions deterministically',()=>{
  const m=createMatch();const p=makeMatchPitch(m,{kind:'curve',aim:{x:.8,y:.6},releaseError:0});
  assert.equal(p.kind,'curve');assert.ok(p.bend!==0);assert.ok(Math.abs(p.x-.8)<.1);assert.equal(p.inZone,true);
  assert.deepEqual(cpuBat(m,p),cpuBat(m,p));assert.deepEqual(contactOutcome(m,{quality:.9}),contactOutcome(m,{quality:.9}));
  assert.ok(makeMatchPitch(m,{speed:'relaxed'}).duration>makeMatchPitch(m,{speed:'quick'}).duration);
});
test('one hundred simulated games finish with consistent runs, hits, bases and inning totals',()=>{
  let combinedRuns=0;
  for(let seed=0;seed<100;seed++){
    let m=createMatch({seed}),steps=0;
    while(!m.over&&steps++<1500){
      const pitch=makeMatchPitch(m,{kind:['fast','curve','change'][steps%3]});
      const outcome=cpuBat(m,pitch);m=applyOutcome(m,{...outcome,pitchKind:pitch.kind}).match;
      assert.ok(m.outs>=0&&m.outs<3);assert.ok(m.balls>=0&&m.balls<4);assert.ok(m.strikes>=0&&m.strikes<3);
      const occupied=m.bases.filter(Boolean);assert.equal(new Set(occupied).size,occupied.length);
      for(let t=0;t<2;t++){
        assert.equal(m.lineScore[t].reduce((a,b)=>a+(b??0),0),m.score[t]);
        assert.equal(TEAMS[t].players.reduce((n,p)=>n+m.stats[p.id].r,0),m.score[t]);
        assert.equal(TEAMS[t].players.reduce((n,p)=>n+m.stats[p.id].h,0),m.hits[t]);
      }
    }
    assert.ok(m.over,`Seed ${seed} did not finish`);assert.ok(m.inning<=3);
    combinedRuns+=m.score[0]+m.score[1];
  }
  assert.ok(combinedRuns/100>1&&combinedRuns/100<10,'three-inning scoring stays playable rather than hit-heavy marathons');
});
