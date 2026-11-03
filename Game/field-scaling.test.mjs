import test from'node:test';import assert from'node:assert/strict';
import{FIELD_STANDING_HEIGHT,fieldDisplayScale}from'./field-scaling.mjs';
import{APPROVED_FIELD_CAST,FIELD_TEMPLATE_R_FRONT,approvedFieldPose}from'./field-atlas.mjs';
import{catcherFieldPose,catcherPose}from'./opposing-art.mjs';
import{GroundDefense}from'./defense-play.mjs';
import{liveFieldPose,poseGround,poseLandmark,liveBallPoint,fieldProject}from'./live-field-art.mjs';

test('standing fielders match the accepted running stature and catcher throws no longer double in size',()=>{
 // Measured opaque crown-to-sole spans in the locked approved source crops.
 const standing=approvedFieldPose('navy-stars-ken','R','recovery');
 assert.ok(Math.abs(standing.scale*424-FIELD_STANDING_HEIGHT)<.001);
 const coral=catcherFieldPose('coral-club-sora','R','throw'),navy=catcherFieldPose('navy-stars-lily','R','throw');
 assert.ok(Math.abs(coral.scale*844-navy.scale*1138)<.001);
 assert.ok(coral.scale*844>115&&coral.scale*844<135);
 assert.equal(fieldDisplayScale('unregistered-fixture','receive',.16),.16);
});

test('field size correction preserves source feet, physical hands and the independent pitching view',()=>{
 const saved=JSON.stringify(APPROVED_FIELD_CAST);
 for(const id of ['coral-club-ken','navy-stars-ken'])for(const action of Object.keys(FIELD_TEMPLATE_R_FRONT.poses)){
  const p=approvedFieldPose(id,'R',action),source=APPROVED_FIELD_CAST[id].poses?.[action]??FIELD_TEMPLATE_R_FRONT.poses[action];
  assert.deepEqual(p.anchor,source.anchor);assert.deepEqual(p.glove,source.glove);assert.deepEqual(p.hand,source.hand);assert.ok(p.scale>0);assert.equal(p.throws,'R');assert.equal(p.gloveHand,'L');
 }
 const left=approvedFieldPose('coral-club-emma','L','throw');assert.equal(left.throws,'L');assert.equal(left.gloveHand,'R');assert.equal(approvedFieldPose('coral-club-emma','R','throw'),null);
 assert.equal(JSON.stringify(APPROVED_FIELD_CAST),saved);
 const recovery=FIELD_TEMPLATE_R_FRONT.poses.recovery;
 assert.ok(recovery.rect[1]<815,'The recovery crop must retain the complete cap crown at source y815.');
 const contains=([x,y],polygon)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 assert.ok(contains([1050,816],recovery.mask));assert.equal(contains([1180,807],recovery.mask),false,'The neighboring throw shoe stays excluded.');
 for(const id of ['coral-club-sora','navy-stars-lily'])assert.equal(catcherPose(id).scale,260/catcherPose(id).rect[3]);
});

test('scaled right, left and catcher releases keep the live ball at the rendered hand and receiver glove',()=>{
 for(const [teamId,target,actorId]of [
  ['navy-stars',{x:-40,y:115},'navy-stars-ken'],['navy-stars',null,'navy-stars-mia'],
  ['coral-club',{x:0,y:4},'coral-club-sora'],['navy-stars',{x:0,y:4},'navy-stars-lily']
 ]){
  const context={teamId,batterId:teamId==='navy-stars'?'coral-club-emma':'navy-stars-ryan'},point=target??new GroundDefense(context).state.players.find(p=>p.id===actorId).point;
  const play=new GroundDefense({...context,target:point,...(target?.y===4?{ballTravel:.6}:{})});
  for(let n=0;n<3000&&!play.canThrow;n++)play.step(.01);assert.ok(play.canThrow);assert.equal(play.state.fielderId,actorId);play.throwTo('1B');
  for(let n=0;n<3000&&play.state.phase!=='throw';n++)play.step(.01);const s=play.state;assert.equal(s.phase,'throw');
  const poses=new Map(s.players.map(p=>[p.id,liveFieldPose(s,p)]).filter(([,p])=>p)),actor=s.players.find(p=>p.id===actorId),pose=poses.get(actorId);assert.ok(pose);
  assert.deepEqual(liveBallPoint({...s,possession:'free',ballOwnerId:null,throwProgress:0},poses),poseLandmark(pose,poseGround(pose,actor),'hand'));
  const receiver=s.players.find(p=>p.id===s.throwToId),receive=poses.get(receiver.id),ground=receive?poseGround(receive,receiver):fieldProject(receiver.point),expected=receive?.catchOffset?{x:ground.x+receive.catchOffset[0],y:ground.y+receive.catchOffset[1]}:receive?poseLandmark(receive,ground):ground,at=liveBallPoint({...s,possession:'free',ballOwnerId:null,throwProgress:1},poses);
  assert.ok(Math.hypot(at.x-expected.x,at.y-expected.y)<1e-8);
 }
});
