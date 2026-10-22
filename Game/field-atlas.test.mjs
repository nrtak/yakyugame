import test from 'node:test';import assert from 'node:assert/strict';
import {FIELD_TEMPLATE_R_FRONT,fieldAtlasPose,atlasLandmark} from './field-atlas.mjs';
test('atlas crops and landmarks stay in the source image with positive scale',()=>{
 for(const [action,p]of Object.entries(FIELD_TEMPLATE_R_FRONT.poses)){
  const [x,y,w,h]=p.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1254&&y+h<=1254,action);
  for(const point of [p.anchor,p.glove,p.hand,...(p.mask??[])])assert.ok(point.every(n=>Number.isFinite(n)&&n>=0&&n<=1254),action);
  assert.deepEqual(atlasLandmark(p,{x:100,y:100},'glove',.34),{x:100+(p.glove[0]-p.anchor[0])*.34,y:100+(p.glove[1]-p.anchor[1])*.34});
 }
});
test('review atlas rejects opposite throwing hand and unrelated identity',()=>{
 assert.equal(fieldAtlasPose('navy-stars-ken','L','ready'),null);assert.equal(fieldAtlasPose('coral-club-ken','R','ready'),null);
 assert.equal(fieldAtlasPose('navy-stars-ken','R','unknown'),null);
 for(const action of Object.keys(FIELD_TEMPLATE_R_FRONT.poses)){const p=fieldAtlasPose('navy-stars-ken','R',action);assert.equal(p.throws,'R');assert.equal(p.gloveHand,'L');}
});
