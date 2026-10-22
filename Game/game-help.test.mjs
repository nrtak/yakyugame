import test from 'node:test';import assert from 'node:assert/strict';
import {tipForGame,defenseFeedback} from './game-help.mjs';
import {GroundDefense} from './defense-play.mjs';
import {createProfileStore} from './player-profiles.mjs';
test('tips match the active user role, not the field camera alone',()=>{
 assert.equal(tipForGame({phase:'windup',userBatting:true}),'batting');assert.equal(tipForGame({phase:'pitch-ready',userBatting:false}),'pitching');assert.equal(tipForGame({phase:'field',userBatting:false}),'fielding');assert.equal(tipForGame({phase:'field',userBatting:true}),null);
 for(const phase of ['menu','review','final'])assert.equal(tipForGame({phase,userBatting:true}),null);
});
test('tutorial acknowledgments survive relaunch per player and guest stays temporary',()=>{
 const data=new Map(),disk={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};let n=0;const store=createProfileStore(disk,()=>String(++n)),a=store.create('A');store.finishTutorial(['pitching','pitching','unknown']);store.create('B');assert.deepEqual(store.current.tutorials,[]);store.useGuest();store.finishTutorial(['batting']);assert.deepEqual(store.current.tutorials,['batting']);const reopened=createProfileStore(disk);assert.deepEqual(reopened.current.tutorials,[]);reopened.select(a.id);assert.deepEqual(reopened.current.tutorials,['pitching']);reopened.resetTutorials();assert.deepEqual(createProfileStore(disk).current.tutorials,[]);
});
test('possession and safe/out cues follow real play state, not a predicted throw',()=>{
 const play=new GroundDefense();assert.equal(defenseFeedback(play.state).call,'');while(!play.canThrow)play.step(.01);assert.match(defenseFeedback(play.state).possession,/Ball in glove/);play.throwTo('1B');assert.match(defenseFeedback(play.state).possession,/Transferring/);assert.equal(defenseFeedback(play.state).call,'');while(play.clock<play.throw.catchAt)play.step(.01);assert.match(defenseFeedback(play.state).possession,/Ball in glove/);while(!play.finished)play.step(.01);assert.equal(defenseFeedback(play.state).call,'OUT');
 const late=new GroundDefense();while(late.clock<3.8)late.step(.01);late.throwTo('1B');while(!late.finished)late.step(.01);assert.equal(defenseFeedback(late.state).call,'SAFE');
 assert.equal(defenseFeedback({call:'no-force',possession:'free'}).call,'NO FORCE · TAG REQUIRED');assert.equal(defenseFeedback(null).call,'');
});
