import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{createHash}from'node:crypto';import{NATIVE_FIELD_ACTIONS}from'./field-action-data.mjs';import{fieldActionPose}from'./field-motion.mjs';
test('native slide/dive registration keeps own identities, anatomical equipment and four independent views',()=>{
 const locks=JSON.parse(fs.readFileSync(new URL('./scene-art-lock.json',import.meta.url)));
 for(const[id,c]of Object.entries(NATIVE_FIELD_ACTIONS)){assert.equal(c.id,id);assert.equal(c.throws,'L');assert.equal(c.gloveHand,'R');assert.equal(Object.keys(c.directions).length,4);assert.equal(c.frames.length,136);const digest=createHash('sha256').update(fs.readFileSync(new URL(c.path,import.meta.url))).digest('hex');assert.equal(digest,locks.assets[c.path]);
 for(const direction of[{x:1,y:1},{x:-1,y:1},{x:-1,y:-1},{x:1,y:-1}])for(const kind of['slide','dive']){const p={id,throws:'L',gloveHand:'R',fieldAction:{kind,direction,progress:.4}},pose=fieldActionPose({teamId:c.teamId},p);assert.ok(pose.scale>0);assert.equal(pose.action,kind);assert.equal(pose.source,'own-native-field-action');assert.equal(fieldActionPose({teamId:c.teamId},{...p,id:'another-player'}),null);assert.equal(fieldActionPose({teamId:c.teamId},{...p,throws:'R'}),null);}
 }
});
