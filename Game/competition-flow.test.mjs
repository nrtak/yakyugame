import test from 'node:test';import assert from 'node:assert/strict';
import {createCup,cupFixture,prepareCupMatch,recordCupMatch,restoreCup} from './club-cup.mjs';
import {DerbySession,DERBY_HITTERS,createDerbySaveStore} from './derby-session.mjs';
import {createDerby} from './home-run-derby.mjs';
import {startCup,prepareCupMatch as scheduleCup,recordCupMatch as finishCup} from './tournament-progress.mjs';
import {rewardCollection,collectionSelection} from './reward-collection.mjs';
import {createProfileStore} from './player-profiles.mjs';
import {firstPairCoverage,validateArtworkConnections} from './artwork-coverage.mjs';
import {SCENE_ASSETS} from './scene-render.mjs';
import {readFileSync} from 'node:fs';
const disk=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const result=(f,score)=>({matchId:f.matchId,teamIds:f.teamIds,score,over:true});
test('2, 4 and 8 club Cups resume each round with exact opponents and complete after the right number of wins',()=>{
 for(const count of [2,4,8]){const teamIds=Array.from({length:count},(_,i)=>'club-'+i);let s=createCup({id:'cup'+count,teamIds,userTeamId:teamIds[0],innings:3}),wins=0;
  while(!s.over){const {cup,fixture}=prepareCupMatch(s,'game'+wins);s=restoreCup(JSON.parse(JSON.stringify(cup)));assert.deepEqual(cupFixture(s),fixture);assert.equal(fixture.homeTeamId,fixture.teamIds[1]);s=recordCupMatch(s,result(fixture,fixture.teamIds[0]===teamIds[0]?[3,0]:[0,3]));wins++;}
  assert.equal(wins,Math.log2(count));assert.equal(s.winnerId,teamIds[0]);assert.equal(cupFixture(s),null);assert.deepEqual(restoreCup(s),s);
 }
});
test('Cup draws replay, opponent order cannot change and elimination finishes the remaining bracket',()=>{
 let s=createCup({id:'cup',teamIds:['a','b','c','d'],userTeamId:'a'}),n=prepareCupMatch(s,'draw');const draw=result(n.fixture,[2,2]);s=recordCupMatch(n.cup,draw);assert.equal(s.round,0);assert.equal(s.pendingMatchId,null);assert.deepEqual(recordCupMatch(s,draw),s);
 n=prepareCupMatch(s,'loss');assert.throws(()=>recordCupMatch(n.cup,{...result(n.fixture,[0,1]),teamIds:['b','a']}),/scheduled/);s=recordCupMatch(n.cup,result(n.fixture,[0,1]));assert.equal(s.over,true);assert.notEqual(s.winnerId,'a');assert.equal(s.rounds.length,2);const bad=structuredClone(s);bad.winnerId='a';assert.throws(()=>restoreCup(bad),/match/);
});
test('Cup award and collection access survive replay without making unfinished rewards equippable',()=>{
 let p=startCup(null,{id:'award',teamIds:['coral-club','navy-stars'],userTeamId:'coral-club'}),n=scheduleCup(p,'final');const r=result(n.fixture,[3,1]);p=finishCup(n.progress,r);const again=finishCup(p,r);assert.equal(again.rewardReceipts.length,1);assert.equal(again.cupHistory.length,1);assert.ok(p.unlocks.uniforms.includes('pennant-away'));
 assert.equal(rewardCollection(p).find(x=>x.id==='pennant-away').owned,true);assert.throws(()=>collectionSelection(p,'uniforms','pennant-away'),/not ready/);assert.equal(collectionSelection(p,'stadiums','navy-stars').action,'venue');assert.throws(()=>collectionSelection(p,'stadiums','space-station'),/not ready/);
});
test('Derby waits for each turn, respects pause and resumes the same unfinished pitch without changing hands',()=>{
 const s=new DerbySession();assert.equal(s.phase,'turn-ready');s.step(10);assert.equal(s.phase,'turn-ready');s.startTurn();for(let i=0;i<36;i++)s.step(.05);assert.equal(s.phase,'flight');const pitch=s.pitch;s.paused=true;const elapsed=s.elapsed;s.step(.05);assert.equal(s.swing(),false);assert.equal(s.elapsed,elapsed);s.paused=false;s.setAim(pitch.x,pitch.y);s.swing();for(let i=0;i<80;i++)s.step(.05);assert.equal(s.state.log.length,1);
 const storage=disk(),saves=createDerbySaveStore(storage);saves.save('one','run',s.state);assert.equal(saves.read('two'),null);const reopened=new DerbySession({state:createDerbySaveStore(storage).read('one').state});assert.equal(reopened.phase,'turn-ready');assert.deepEqual(reopened.pitch,s.pitch);assert.equal(reopened.sceneState().batterHand,DERBY_HITTERS.find(x=>x.id===reopened.player.id).bats);saves.clear('one','wrong-run');assert.ok(saves.read('one'));saves.clear('one','run');assert.equal(saves.read('one'),null);
});
test('Derby rejects forged roster hands and preserves malformed saved data',()=>{
 const fake=structuredClone(DERBY_HITTERS.slice(0,2));fake[0].bats=fake[0].bats==='R'?'L':'R';assert.throws(()=>new DerbySession({state:createDerby({players:fake})}),/changed/);
 for(const raw of ['broken','{"version":1,"saves":"oops"}']){const storage=disk();storage.setItem('yakyugame.derby.v1',raw);const saves=createDerbySaveStore(storage);saves.save('x','run',new DerbySession().state);assert.equal(storage.getItem('yakyugame.derby.v1'),raw);assert.match(saves.notice,/could not be opened/);}
});
test('Derby results count once for the originating profile without inflating exhibition games',()=>{
 const storage=disk(),profiles=createProfileStore(storage,()=> 'profile');profiles.create('Player');const s=new DerbySession();let guard=0;while(s.phase!=='summary'&&guard++<10000){if(s.phase==='turn-ready')s.startTurn();s.step(.05);}assert.equal(s.phase,'summary');profiles.recordDerby('profile','derby-run',s.state);profiles.recordDerby('profile','derby-run',s.state);const stats=createProfileStore(storage).current.records;assert.equal(stats.derbies,1);assert.equal(stats.games,0);
});
test('art coverage counts exact batting phases while preserving pitching gaps and rejecting cropped files',()=>{
 const c=firstPairCoverage(),ken=c.find(p=>p.id==='coral-club-ken');assert.equal(c.flatMap(p=>p.opposingBatting).filter(p=>p.exact).length,54);assert.equal(c.find(p=>p.id==='coral-club-emma').pitching[3].pose,null);
 const sizes=Object.fromEntries(Object.entries(SCENE_ASSETS).map(([key,path])=>{const b=readFileSync(new URL(path,import.meta.url));return[key,{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}];}));assert.equal(validateArtworkConnections(sizes).length,18);const bad=structuredClone(sizes);bad[ken.opposingBatting[1].pose.asset].width=10;assert.throws(()=>validateArtworkConnections(bad),/outside image/);
});
