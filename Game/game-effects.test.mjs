import test from 'node:test';import assert from 'node:assert/strict';
import {GAME_EFFECTS,GameEffects,effectForEvent,isExceptionalFastball} from './game-effects.mjs';
test('presentation follows resolved results and does not invent diving or ground-rule outcomes',()=>{
 for(const kind of ['single','double','triple','homerun','strikeout'])assert.equal(effectForEvent({kind}),kind);
 assert.equal(effectForEvent({kind:'groundout',playType:'doubleplay'}),'doubleplay');assert.equal(effectForEvent({kind:'fielderschoice',playType:'tripleplay'}),'tripleplay');
 assert.equal(effectForEvent({kind:'flyout'}),null);assert.equal(effectForEvent({kind:'flyout',diving:true}),'divingCatch');assert.equal(effectForEvent({kind:'double',groundRule:true}),'groundRuleDouble');assert.equal(effectForEvent({kind:'foul'}),null);
});
test('an exceptional fastball requires a genuinely short flight and the fastball pitch type',()=>{
 assert.equal(isExceptionalFastball({kind:'fast',duration:.98}),true);for(const p of [{kind:'fast',duration:1.25},{kind:'curve',duration:.9},{kind:'fast',duration:0},{kind:'fast',duration:NaN},null])assert.equal(isExceptionalFastball(p),false);
});
test('all requested graphics finish, pause cleanly and reject repeated event keys',()=>{
 for(const kind of Object.keys(GAME_EFFECTS)){const fx=new GameEffects();assert.equal(fx.play(kind,{key:'event'}),true);assert.equal(fx.play(kind,{key:'event'}),false);fx.step(.2);const before=fx.frame;fx.step(10,{paused:true});assert.deepEqual(fx.frame,before);fx.step(10);assert.equal(fx.frame,null);assert.throws(()=>fx.step(-1));}
});
test('queued transitions play in order and clear cannot replay an old celebration',()=>{
 const fx=new GameEffects();fx.play('tripleplay');fx.play('inning');assert.equal(fx.frame.kind,'tripleplay');fx.step(GAME_EFFECTS.tripleplay.duration+.1);assert.equal(fx.frame.kind,'inning');fx.clear();assert.equal(fx.frame,null);fx.step(10);assert.equal(fx.frame,null);assert.throws(()=>fx.play('fake'));
});
