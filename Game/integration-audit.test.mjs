import test from 'node:test';import assert from 'node:assert/strict';
import {DeviceGame} from './device-game.mjs';import {SWING_LEAD} from './engine.mjs';
import {createMatchSaveStore,resumeMatchCheckpoint,captureMatchCheckpoint} from './match-save.mjs';
import {createProfileStore,completedMatchRecord} from './player-profiles.mjs';
import {GroundDefense} from './defense-play.mjs';import {applyOutcome,createMatch,currentBatter} from './match-engine.mjs';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
function advance(g,tick){
 if(g.phase==='review'){g.next();return;}
 if(g.phase==='pitch-ready'){g.choosePitch(g.repertoire[tick%g.repertoire.length]);g.setAim(0,0);g.releasePitch();}
 if(g.userBatting&&g.phase==='flight'&&g.swingAt===null&&g.elapsed>=g.pitch.duration-SWING_LEAD-.005){g.setAim(g.pitch.x,g.pitch.y+(tick%3===0?-.4:.15));g.swing();}
 if(g.phase==='field'&&!g.userBatting&&g.defense.canThrow)g.throwTo(g.defense.recommendation);
 g.step(.02);
}
test('seeded Practice Innings preserve outs, scores, runner identities and results for either home team',()=>{
 for(const seed of [17,73,211,991])for(const homeTeamId of ['coral-club','navy-stars']){
  const g=new DeviceGame({seed,homeTeamId,teamId:seed%2?'coral-club':'navy-stars'});g.start();
  for(let tick=0;tick<100000&&g.phase!=='final';tick++)advance(g,tick);
  assert.equal(g.phase,'final');assert.equal(g.match.pitchNumber,g.match.log.length);assert.ok(g.match.log.every(e=>e.outsAfterPlay<=3));
  for(let side=0;side<2;side++){assert.equal(g.match.score[side],g.match.lineScore[side].reduce((n,x)=>n+(x??0),0));const players=g.teams[side].players;assert.equal(g.match.hits[side],players.reduce((n,p)=>n+g.match.stats[p.id].h,0));}
  assert.equal(g.next(),false);const count=g.match.pitchNumber;g.step(1);assert.equal(g.match.pitchNumber,count);
 }
});
test('relaunch during every active phase restarts only the unfinished pitch and preserves completed play history',()=>{
 const seen=new Set(),g=new DeviceGame();g.start();
 for(let tick=0;tick<30000&&g.phase!=='final';tick++){
  if(!seen.has(g.phase)&&['windup','flight','contact','field','review'].includes(g.phase)&&!g.match.over){seen.add(g.phase);const snap=captureMatchCheckpoint(g),restored=resumeMatchCheckpoint(JSON.parse(JSON.stringify(snap)));assert.deepEqual(restored.match,g.match);restored.start();assert.equal(restored.match.pitchNumber,g.match.pitchNumber);assert.deepEqual(restored.match.log,g.match.log);assert.equal(restored.batter.id,g.batter.id);}
  advance(g,tick);
 }
 assert.deepEqual([...seen].sort(),['windup','flight','contact','field','review'].sort());
});

test('all four game lengths finish at every opponent skill and recover a checkpoint during play',()=>{
 for(const innings of [1,3,7,9])for(const difficulty of ['relaxed','standard','challenging']){
  let g=new DeviceGame({innings,difficulty,seed:731+innings,teamId:innings%3?'coral-club':'navy-stars',homeTeamId:innings%3?'navy-stars':'coral-club'});g.start();let restored=false;
  for(let tick=0;tick<600000&&g.phase!=='final';tick++){
   if(!restored&&g.match.pitchNumber>=5&&!g.match.over){const before=structuredClone(g.match);g=resumeMatchCheckpoint(JSON.parse(JSON.stringify(captureMatchCheckpoint(g))));assert.deepEqual(g.match,before);assert.equal(g.difficulty,difficulty);g.start();restored=true;}
   advance(g,tick);
  }
  assert.equal(g.phase,'final',innings+' innings / '+difficulty);assert.equal(restored,true);assert.ok(g.match.inning<=innings);assert.equal(g.match.pitchNumber,g.match.log.length);
  for(let side=0;side<2;side++){assert.equal(g.match.score[side],g.match.lineScore[side].reduce((n,x)=>n+(x??0),0));assert.equal(g.match.hits[side],g.teams[side].players.reduce((n,p)=>n+g.match.stats[p.id].h,0));assert.equal(g.match.score[side],g.teams[side].players.reduce((n,p)=>n+g.match.stats[p.id].r,0));}
 }
});
test('actual completed games advance a saved series and grant its reward exactly once across relaunch',()=>{
 const disk=memory(),profiles=createProfileStore(disk,()=> 'audit-player'),player=profiles.create('Audit');profiles.startSeries(player.id,{id:'series-audit',teamIds:['coral-club','navy-stars'],userTeamId:'coral-club',innings:1});
 let store=profiles;
 for(let i=0;i<2;i++){
  const fixture=store.prepareSeriesMatch(player.id,'match-'+i),g=new DeviceGame(fixture);g.start();
  // Three away outs, then a home HR; alternate which side wins to give Coral two wins.
  if(fixture.homeTeamId==='navy-stars'){g.finishPitch({kind:'homerun'});g.next();}
  for(let out=0;out<3;out++)for(let strike=0;strike<3;strike++){g.finishPitch({kind:'strike'});g.next();}
  if(fixture.homeTeamId==='coral-club'){g.finishPitch({kind:'homerun'});g.next();}else for(let out=0;out<3;out++)for(let strike=0;strike<3;strike++){g.finishPitch({kind:'strike'});g.next();}
  assert.equal(g.phase,'final');const result={matchId:fixture.matchId,teamIds:g.match.teamIds,score:g.match.score,over:g.match.over};store.recordMatch(player.id,fixture.matchId,completedMatchRecord(g.match,'coral-club'));store.recordSeriesMatch(player.id,result);store=createProfileStore(disk);store.recordSeriesMatch(player.id,result);
 }
 assert.equal(store.current.records.games,2);assert.equal(store.current.progression.activeSeries.winnerId,'coral-club');assert.equal(store.current.progression.rewardReceipts.length,1);assert.deepEqual(store.current.progression.unlocks.uniforms,['club-classic']);
});
