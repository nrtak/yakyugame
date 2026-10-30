import test from'node:test';import assert from'node:assert/strict';
import{GroundDefense}from'./defense-play.mjs';
import{FlightDefense}from'./flight-defense.mjs';
import{createDefensiveCameraTracker,defensiveFieldCamera}from'./scene-render.mjs';
import{fieldProject,liveFieldPose,liveBallPoint}from'./live-field-art.mjs';
const ballFor=s=>liveBallPoint(s,new Map(s.players.map(p=>[p.id,liveFieldPose(s,p)]).filter(([,pose])=>pose)));
const inside=(p,c)=>p.x>=c.x&&p.x<=c.x+c.width&&p.y>=c.y&&p.y<=c.y+c.height;

test('raised camera freezes on the play clock and resets for the next delivery',()=>{
 const play=new GroundDefense(),tracker=createDefensiveCameraTracker();tracker.sample(play.state,ballFor(play.state));
 play.step(.1);const first=tracker.sample(play.state,ballFor(play.state));
 for(let i=0;i<60;i++)assert.deepEqual(tracker.sample(play.state,ballFor(play.state)),first);
 play.step(.1);assert.notDeepEqual(tracker.sample(play.state,ballFor(play.state)),first);
 const fresh=new GroundDefense().state;assert.deepEqual(tracker.sample(fresh,ballFor(fresh)),createDefensiveCameraTracker().sample(fresh,ballFor(fresh)));
 tracker.reset();assert.deepEqual(tracker.sample(play.state,ballFor(play.state)),createDefensiveCameraTracker().sample(play.state,ballFor(play.state)));
});

test('smooth tracking keeps ball, receiving fielder and live runners inside the view through handoffs',()=>{
 for(const kind of['ground','fly']){
  const play=kind==='ground'?new GroundDefense({bases:['coral-club-mia',null,null]}):new FlightDefense({teamId:'navy-stars',batterId:'coral-club-emma',contact:{quality:.6,launchAngle:40,direction:.55}}),tracker=createDefensiveCameraTracker();let previous;
  while(!play.finished){
   const s=play.state,b=ballFor(s),camera=tracker.sample(s,b),ids=new Set([s.fielderId,s.ballOwnerId,s.throwFromId,s.throwToId]);
   for(const p of[b,...s.players.filter(p=>ids.has(p.id)).map(p=>fieldProject(p.point)),...s.runners.filter(r=>!r.out).map(r=>fieldProject(r.point))])assert.ok(inside(p,camera),JSON.stringify({kind,phase:s.phase,p,camera}));
   if(previous)assert.ok(Math.hypot(camera.x-previous.x,camera.y-previous.y)<25,'No camera jump at pickup or throw');
   previous=camera;if(play.canThrow)play.throwTo(play.recommendation);play.step(1/60);
  }
 }
});

test('reduced motion uses immediate framing without pull-up or camera easing',()=>{
 const play=new GroundDefense(),tracker=createDefensiveCameraTracker();tracker.sample(play.state,ballFor(play.state));play.step(.2);
 const s={...play.state,reducedMotion:true},b=ballFor(s);assert.deepEqual(tracker.sample(s,b),defensiveFieldCamera(s,b));
});

test('tracking is consistent at30 and60 frames per second',()=>{
 function follow(dt){const play=new GroundDefense(),tracker=createDefensiveCameraTracker();let camera;for(let i=0;i<=2/dt;i++){camera=tracker.sample(play.state,ballFor(play.state));play.step(dt);}return camera;}
 const a=follow(1/30),b=follow(1/60);for(const key of['x','y','width','height'])assert.ok(Math.abs(a[key]-b[key])<5,JSON.stringify({key,a:a[key],b:b[key]}));
});
