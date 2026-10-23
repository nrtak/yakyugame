import test from 'node:test';import assert from 'node:assert/strict';
import {createProfileStore,PROFILE_STORAGE_KEY,profileName,completedMatchRecord} from './player-profiles.mjs';
import {createMatch,applyOutcome} from './match-engine.mjs';
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('two people retain separate settings and the selected profile survives relaunch',()=>{
 const disk=memory();let n=0;const store=createProfileStore(disk,()=>String(++n));
 const first=store.create('  Alex  ');store.update({teamId:'navy-stars',sensitivity:'0.7',assisted:false});
 const second=store.create('Sam');assert.equal(store.current.preferences.teamId,'coral-club');store.update({sensitivity:'1.3'});
 store.select(first.id);assert.equal(store.current.preferences.sensitivity,'0.7');assert.equal(store.current.preferences.assisted,false);
 const reopened=createProfileStore(disk);assert.equal(reopened.current.name,'Alex');assert.equal(reopened.current.preferences.teamId,'navy-stars');
 reopened.select(second.id);assert.equal(reopened.current.preferences.sensitivity,'1.3');
});
test('guest preferences are temporary and cannot change another player',()=>{
 const disk=memory(),store=createProfileStore(disk,()=> 'one'),saved=store.create('Player');store.update({sensitivity:'0.7'});
 store.useGuest();store.update({sensitivity:'1.3',teamId:'navy-stars'});assert.equal(store.current.name,'Guest');
 const reopened=createProfileStore(disk);assert.equal(reopened.current.id,null);assert.equal(reopened.current.preferences.sensitivity,'1');
 store.select(saved.id);assert.equal(store.current.preferences.sensitivity,'0.7');assert.equal(store.players.length,1);
});
test('invalid and duplicate names are rejected, and returned data cannot mutate saved preferences',()=>{
 const store=createProfileStore(memory(),()=> 'id');assert.throws(()=>store.create('   '));assert.throws(()=>profileName('x'.repeat(21)));assert.throws(()=>profileName('A\u200bB'));
 store.create('Alex');assert.throws(()=>store.create('aLEX'),/already in use/);assert.throws(()=>store.select('missing'));
 const snapshot=store.current;snapshot.preferences.sensitivity='1.3';assert.equal(store.current.preferences.sensitivity,'1');
 store.update({sensitivity:'oops',teamId:'unknown',assisted:'no'});assert.deepEqual(store.current.preferences,{teamId:'coral-club',homeTeamId:'navy-stars',innings:1,sensitivity:'1',assisted:true,difficulty:'standard',reducedMotion:false});
});
test('blocked storage still allows play and reports session-only changes',()=>{
 const store=createProfileStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},()=> 'id');
 store.create('Alex');assert.equal(store.current.name,'Alex');assert.match(store.notice,/session/);
 const disk=memory(),full=createProfileStore({...disk,setItem(){throw Error('full');}},()=> 'id');full.create('Sam');assert.equal(full.current.name,'Sam');assert.match(full.notice,/session/);
});
test('malformed or future saved data is preserved while a temporary session remains usable',()=>{
 for(const raw of ['broken','{"version":2,"players":[]}','{"version":1,"players":[{"id":"x","name":"A"},{"id":"x","name":"B"}]}']){
  const disk=memory();disk.setItem(PROFILE_STORAGE_KEY,raw);const store=createProfileStore(disk,()=> 'new');store.create('Sam');assert.equal(disk.getItem(PROFILE_STORAGE_KEY),raw);assert.match(store.notice,/session/);
 }
});
test('finished games count once for the player who started them and survive reopening',()=>{
 const disk=memory();let id=0;const store=createProfileStore(disk,()=>String(++id)),first=store.create('Alex'),second=store.create('Sam');
 const summary={outcome:'win',runs:3,hits:5,strikeouts:2};assert.equal(store.recordMatch(first.id,'one',summary),true);assert.equal(store.recordMatch(first.id,'one',summary),false);assert.equal(store.current.records.games,0);
 const reopen=createProfileStore(disk);reopen.select(first.id);assert.equal(reopen.current.records.games,1);assert.equal(reopen.current.records.wins,1);assert.equal(reopen.current.records.hits,5);assert.equal(reopen.recordMatch(first.id,'one',summary),false);assert.equal(reopen.recordMatch(null,'guest',summary),false);
 assert.throws(()=>reopen.recordMatch(second.id,'bad',{...summary,hits:-1}));
});

test('old match and practice receipts survive more than 64 completions and reopening',()=>{
 const disk=memory(),store=createProfileStore(disk,()=> 'one'),p=store.create('Alex'),summary={outcome:'win',runs:1,hits:1,strikeouts:1};
 store.recordMatch(p.id,'original',summary);store.recordPractice(p.id,'original','batting',100);
 for(let i=0;i<100;i++){store.recordMatch(p.id,'match-'+i,summary);store.recordPractice(p.id,'practice-'+i,'pitching',i);}
 const reopen=createProfileStore(disk);assert.equal(reopen.recordMatch(p.id,'original',summary),false);assert.equal(reopen.recordPractice(p.id,'original','batting',999),false);assert.equal(reopen.current.records.games,101);assert.equal(reopen.current.records.practice.batting,100);
});
test('practice records keep only the best completed score for each drill',()=>{
 const store=createProfileStore(memory(),()=> 'id'),p=store.create('Alex');store.recordPractice(p.id,'one','batting',400);store.recordPractice(p.id,'two','batting',200);store.recordPractice(p.id,'three','pitching',650);
 assert.deepEqual(store.current.records.practice,{batting:400,pitching:650});assert.equal(store.recordPractice(p.id,'one','batting',900),false);assert.throws(()=>store.recordPractice(p.id,'four','batting',1001));
});
test('match records are derived from final team scores and opposing strikeouts',()=>{
 let match=createMatch({innings:1});assert.throws(()=>completedMatchRecord(match,'coral-club'));
 for(let i=0;i<18;i++)match=applyOutcome(match,{kind:'strike'}).match;
 const record=completedMatchRecord(match,'coral-club');assert.deepEqual(record,{outcome:'draw',runs:0,hits:0,strikeouts:3});
});
test('game length and home venue preferences persist independently for each profile',()=>{
 const disk=memory();let n=0;const store=createProfileStore(disk,()=>String(++n)),first=store.create('Alex');store.update({innings:9,homeTeamId:'coral-club'});store.create('Sam');assert.equal(store.current.preferences.innings,1);
 const reopen=createProfileStore(disk);reopen.select(first.id);assert.equal(reopen.current.preferences.innings,9);assert.equal(reopen.current.preferences.homeTeamId,'coral-club');reopen.update({innings:2});assert.equal(reopen.current.preferences.innings,1);
});
test('old profiles gain separate progression without losing settings or game records',()=>{const disk=memory();disk.setItem(PROFILE_STORAGE_KEY,JSON.stringify({version:1,activeId:'old',players:[{id:'old',name:'Alex',preferences:{innings:7,teamId:'navy-stars'},records:{games:4,wins:3}}]}));const store=createProfileStore(disk);assert.equal(store.current.preferences.innings,7);assert.equal(store.current.records.games,4);assert.equal(store.current.progression.activeSeries,null);store.startSeries('old',{id:'s1',teamIds:['coral-club','navy-stars'],userTeamId:'navy-stars',innings:7});const reopen=createProfileStore(disk);assert.equal(reopen.current.progression.activeSeries.id,'s1');assert.equal(reopen.current.records.wins,3);});
test('series fixtures stay with their starting player across profile changes and relaunch',()=>{const disk=memory();let n=0;const store=createProfileStore(disk,()=>String(++n)),a=store.create('Alex');store.startSeries(a.id,{id:'s1',teamIds:['coral-club','navy-stars'],userTeamId:'coral-club',innings:3});const f=store.prepareSeriesMatch(a.id,'g1'),b=store.create('Sam');store.recordSeriesMatch(a.id,{matchId:f.matchId,over:true,teamIds:['coral-club','navy-stars'],score:[3,1]});assert.equal(store.current.progression.activeSeries,null);const reopen=createProfileStore(disk);reopen.select(a.id);assert.equal(reopen.current.progression.activeSeries.games.length,1);assert.equal(reopen.prepareSeriesMatch(a.id,'g2').homeTeamId,'coral-club');reopen.select(b.id);assert.equal(reopen.current.progression.activeSeries,null);assert.throws(()=>store.startSeries(null,{}),/profile/);});
