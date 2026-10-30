import {swingFrame,pitcherFrame} from './scene-engine.mjs';
import {PRACTICE_CAPTAINS} from './batting-practice.mjs';
import {playerById} from './rosters.mjs';
import {projectPitch} from './pitch-types.mjs';
import {APPROVED_FIELD_ASSETS,APPROVED_FIELD_CAST} from './field-atlas.mjs';
import {OPPOSING_ASSETS,CATCHER_CAST,opposingBatterPose,catcherPose,opposingArtKeys,catcherAction} from './opposing-art.mjs';
import {RUNNING_ASSETS,liveRunnerPose} from './running-art.mjs';
import {DEFENSIVE_PITCH_ASSETS,DEFENSIVE_PITCH_CAST,defensivePitcherPose,defensivePitcherFrame,defensivePitcherIdle,defensivePitcherPoint,defensiveRelease} from './pitching-art.mjs';
import {DEFENSE_BATTING_ASSETS,defenseBatterPose,defenseBatterKeys,defensiveBatterFrame} from './defense-batting-art.mjs';
import {usesFieldView,fieldPlay} from './field-camera.mjs';
import {LIVE_FIELD_POSES,LIVE_FIELD_SCALE,fieldProject,liveFieldPose,liveBallPoint,poseGround,fieldPoseDefinition} from './live-field-art.mjs';
export const SCENE_ASSETS={flyFielder:'assets/scene-mia-fly-return-v1.png',fieldThrow:'assets/scene-ken-sora-throw-v1.png',fieldPark:'assets/scene-field-elevated-v1.png',fielder:'assets/scene-ken-field-v1.png',park:'assets/scene-ballpark-v3.png',batterReady:'assets/scene-emma-ready-v8.png',batterMotion:'assets/scene-emma-motion-v8.png',pitcherSet:'assets/scene-ryan-set-v3.png',pitcherLift:'assets/scene-ryan-lift-v3.png',pitcherStride:'assets/scene-ryan-stride-v3.png',pitcherRelease:'assets/scene-ryan-release-v3.png',pitcherRecovery:'assets/scene-ryan-recovery-v3.png'};
// Whole-body v7 drawings share a planted front-foot anchor. These are local
// review assets, not a fully validated anatomical animation or final art.
export const BATTER_POSES=[
 {asset:'batterReady',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[672,1338],world:[580,843],scale:.6},
 {asset:'batterMotion',sourceWidth:1774,rect:[130,0,960,887],anchor:[573,837],world:[580,843],scale:.9},
 {asset:'batterMotion',sourceWidth:1774,rect:[130,0,960,887],anchor:[573,837],world:[580,843],scale:.9},
 {asset:'batterMotion',sourceWidth:1774,rect:[1095,0,679,887],anchor:[1595,838],world:[580,843],scale:.9}
];
// Explicit team-qualified identity mapping: unsupported players never borrow art.
export const BATTER_CAST={
 'coral-club-emma':{ready:'batterReady',motion:'batterMotion'},
 'coral-club-mia':{ready:'miaReady',motion:'miaMotion'},
 'coral-club-ken':{ready:'kenReady',motion:'kenMotion'},
 'coral-club-lily':{ready:'lilyReady',motion:'lilyMotion'},
 'coral-club-dylan':{ready:'dylanReady',motion:'dylanMotion'}
};
Object.assign(SCENE_ASSETS,{miaReady:'assets/scene-coral-mia-ready-v2.png',miaMotion:'assets/scene-coral-mia-motion-v2.png',kenReady:'assets/scene-coral-ken-ready-v2.png',kenMotion:'assets/scene-coral-ken-motion-v2.png',lilyReady:'assets/scene-coral-lily-ready-v2.png',lilyMotion:'assets/scene-coral-lily-motion-v2.png',dylanReady:'assets/scene-coral-dylan-ready-v2.png',dylanMotion:'assets/scene-coral-dylan-motion-v2.png'});
for(const name of ['noah','emi','sora']){const id='coral-club-'+name,key='coral'+name;SCENE_ASSETS[key+'Ready']='assets/scene-coral-'+name+'-ready-v1.png';SCENE_ASSETS[key+'Motion']='assets/scene-coral-'+name+'-motion-v1.png';BATTER_CAST[id]={ready:key+'Ready',motion:key+'Motion'};}
SCENE_ASSETS.coralemiReady='assets/scene-coral-emi-ready-v4.png';SCENE_ASSETS.coralemiMotion='assets/scene-coral-emi-motion-v4.png';
for(const name of ['noah','sora'])for(const phase of ['Ready','Motion'])SCENE_ASSETS['coral'+name+phase]='assets/scene-coral-'+name+'-'+phase.toLowerCase()+'-v2.png';
SCENE_ASSETS.coralsoraReady='assets/scene-coral-club-sora-batting-home-ready-v3.png';
SCENE_ASSETS.coralsoraMotion='assets/scene-coral-club-sora-batting-home-motion-v3.png';
for(const name of ['ryan','mia','ken','lily','noah','emma','sora','theo']){
 const ready='navy'+name+'Ready',motion='navy'+name+'Motion';
 SCENE_ASSETS[ready]='assets/scene-navy-'+name+'-ready-v2.png';SCENE_ASSETS[motion]='assets/scene-navy-'+name+'-motion-v2.png';
 BATTER_CAST['navy-stars-'+name]={ready,motion,hand:'R'};
}
// Left-handed drawings are authored independently, never reflected at runtime.
export const LEFT_BATTER_POSES=[
 {sourceWidth:1024,rect:[0,0,1024,1536],anchor:[400,1345],world:[1140,843],scale:.6},
 {sourceWidth:1774,rect:[0,0,1090,887],anchor:[495,838],world:[1140,843],scale:.9},
 {sourceWidth:1774,rect:[0,0,1090,887],anchor:[495,838],world:[1140,843],scale:.9},
 {sourceWidth:1774,rect:[1095,0,679,887],anchor:[1260,838],world:[1140,843],scale:.9}
];
SCENE_ASSETS.coraltheoReady='assets/scene-coral-theo-ready-v3.png';SCENE_ASSETS.coraltheoMotion='assets/scene-coral-theo-motion-v4.png';
BATTER_CAST['coral-club-theo']={ready:'coraltheoReady',motion:'coraltheoMotion',hand:'L',poses:LEFT_BATTER_POSES};
SCENE_ASSETS.navydylanReady='assets/scene-navy-dylan-ready-v1.png';SCENE_ASSETS.navydylanMotion='assets/scene-navy-dylan-motion-v2.png';
BATTER_CAST['navy-stars-dylan']={ready:'navydylanReady',motion:'navydylanMotion',hand:'L',poses:LEFT_BATTER_POSES};
Object.assign(SCENE_ASSETS,{coralScenery:'assets/scene-coral-field-scenery-v1.png',navyScenery:'assets/scene-navy-stadium-scenery-v1.png'});
SCENE_ASSETS.navyDylanField='assets/scene-navy-dylan-field-atlas-v1.png';
SCENE_ASSETS.navyKenField='assets/scene-navy-ken-field-atlas-v3.png';
Object.assign(SCENE_ASSETS,APPROVED_FIELD_ASSETS);
Object.assign(SCENE_ASSETS,OPPOSING_ASSETS);
Object.assign(SCENE_ASSETS,RUNNING_ASSETS);
Object.assign(SCENE_ASSETS,DEFENSIVE_PITCH_ASSETS);
Object.assign(SCENE_ASSETS,DEFENSE_BATTING_ASSETS);
SCENE_ASSETS.menuCaptains='assets/menu-a3-emma-ryan-v1.png';SCENE_ASSETS.menuBackground='assets/menu-sakura-league-background-v1.png';
SCENE_ASSETS.coralKenField='assets/scene-coral-ken-field-atlas-v4.png';SCENE_ASSETS.coralNoahField='assets/scene-coral-noah-field-atlas-v2.png';
for(const p of PRACTICE_CAPTAINS){const key=p.id.replaceAll('-','');SCENE_ASSETS[key+'Ready']='assets/scene-'+p.id+'-ready-v1.png';SCENE_ASSETS[key+'Motion']='assets/scene-'+p.id+'-motion-v1.png';BATTER_CAST[p.id]={ready:key+'Ready',motion:key+'Motion',hand:p.bats,...(p.bats==='L'?{poses:LEFT_BATTER_POSES}:{})};}
// Yui's contact barrel extends farther than the shared sheet's gutter. Her
// own crops retain that tip and exclude it from the neighboring follow frame.
BATTER_CAST['sakura-blossoms-yui'].poses=BATTER_POSES.map((p,i)=>({...p,rect:i===3?[1125,0,649,887]:i>0?[130,0,995,887]:p.rect}));
export const STADIUM_ART={'coral-club':'coralScenery','navy-stars':'navyScenery'};
// Venue variation is confined to scenery above the playing surface. The base
// image continues to supply every mound, rubber, base and batter-box landmark.
export const STADIUM_SCENERY_HEIGHT=480;
export function characterBatterPose(id,hand,frame){
 const cast=BATTER_CAST[id];if(!cast||hand!==(cast.hand??'R'))return null;
 const p=(cast.poses??BATTER_POSES)[frame];if(!p)return null;
 return {...p,asset:frame===0?cast.ready:cast.motion};
}
export function batterPoint(frame,point){const p=BATTER_POSES[frame];return{x:p.world[0]+(point[0]-p.anchor[0])*p.scale,y:p.world[1]+(point[1]-p.anchor[1])*p.scale};}
// Local whole-body review drawings: R throws, L wears glove. Never mirror.
// Register the R pivot sole for set/lift, then the L landing sole through recovery.
// Positive uniform scaling preserves the drawings; this is not final anatomy approval.
export const PITCHER_POSES=[
 {asset:'pitcherSet',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[696,1430],world:[957,546],support:'R'},
 {asset:'pitcherLift',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[600,1470],world:[957,546],support:'R'},
 {asset:'pitcherStride',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[650,1480],world:[988,590],support:'L'},
 {asset:'pitcherRelease',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[658,1450],world:[988,590],support:'L'},
 {asset:'pitcherRecovery',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[775,1475],world:[988,590],support:'L'}
];
export const PITCHER_SCALE=.15;
SCENE_ASSETS.emmaPitchLift='assets/scene-coral-emma-pitch-home-lift-v7.png';
SCENE_ASSETS.emmaPitchSet='assets/scene-coral-emma-pitch-home-set-v6.png';
export function characterPitcherPose(id,frame){
 if(id==='navy-stars-ryan')return PITCHER_POSES[frame]??null;
 if(id==='coral-club-emma'&&(frame===0||frame===1))return{asset:frame===0?'emmaPitchSet':'emmaPitchLift',sourceWidth:1024,rect:[0,0,1024,1536],anchor:[750,1435],world:[957,546],support:'L'};
 return null;
}
export function pitcherPoint(frame,point){const p=PITCHER_POSES[frame];return {x:p.world[0]+(point[0]-p.anchor[0])*PITCHER_SCALE,y:p.world[1]+(point[1]-p.anchor[1])*PITCHER_SCALE};}
export const PITCH_RELEASE_FRAME=3;
export const PITCH_RELEASE_HAND=[158,250];
// Preserve the existing hitting target while aligning the new barrel to it.
export const BAT_CONTACT_POINT=batterPoint(2,[573+320/.9,837-320/.9]);
export const SCENE_GEOMETRY={width:1600,height:960,zone:{...BAT_CONTACT_POINT,rx:65,ry:86},release:pitcherPoint(PITCH_RELEASE_FRAME,PITCH_RELEASE_HAND)};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createArtLoader(paths,makeImage=()=>new Image()){
 const art={},pending=new Map(),measurements=new Map(),wanted=new Set();let peakDecodedBytes=0,loads=0,failures=0;
 const decodedBytes=()=>Object.values(art).reduce((n,img)=>n+(img.naturalWidth??0)*(img.naturalHeight??0)*4,0);
 function load(keys){return Promise.all([...new Set(keys)].map(key=>{
  wanted.add(key);if(art[key])return art[key];if(pending.has(key))return pending.get(key);
  if(!paths[key])return Promise.reject(new Error('Unknown artwork: '+key));
  const started=performance.now();loads++;
  const request=new Promise((resolve,reject)=>{const img=makeImage();img.onload=()=>{if(wanted.has(key))art[key]=img;pending.delete(key);measurements.set(key,{key,width:img.naturalWidth??0,height:img.naturalHeight??0,loadMs:performance.now()-started});peakDecodedBytes=Math.max(peakDecodedBytes,decodedBytes());resolve(img);};img.onerror=()=>{failures++;pending.delete(key);reject(new Error('Unable to load '+key));};img.src=paths[key];});pending.set(key,request);return request;
 }));}
 function retain(keys){wanted.clear();for(const key of keys)wanted.add(key);for(const key of Object.keys(art))if(!wanted.has(key))delete art[key];}
 return{art,load,retain,get metrics(){return{loadedKeys:Object.keys(art),pending:pending.size,loads,failures,decodedBytes:decodedBytes(),peakDecodedBytes,images:[...measurements.values()],note:'RGBA image estimate only; excludes browser, GPU, canvas and WebKit memory.'};}};
}
export function pitchPosition(p,t){const b=projectPitch(p,t,p.release??SCENE_GEOMETRY.release,SCENE_GEOMETRY.zone);return {...b,r:6+8*b.q*b.q};}
// Defensive camera: low behind the mound, looking toward the plate.
// The target reverses horizontally; character images never do.
export const PITCHING_GEOMETRY={pitcher:{x:400,y:900},plate:{x:1085,y:560},zone:{x:1085,y:360,rx:83,ry:95}};
export function pitchingRelease(hand){return defensiveRelease(hand)??{x:400,y:300};}
export function pitchingPosition(p,t,hand){const b=projectPitch(p,t,pitchingRelease(hand),PITCHING_GEOMETRY.zone,true);return{...b,r:13-7*Math.min(1,b.q)};}
export function pitchingActorPose(p,role='batter'){
 if(!p)return null;
 if(role==='catcher'){
  // Keep the receiver's feet fixed across receive/transfer. His/her receiving
  // mitt sits over home plate; no whole-body teleport to chase a pitch.
  const receiveScale=284/1322,world=[1085-(780-595)*receiveScale,360-(555-1289)*receiveScale];
  return{...p,world,scale:p.action==='transfer'?300/p.rect[3]:receiveScale};
 }
 // An opposite-side drawing cannot be converted by moving or reflecting it.
 return ['MOUND+THIRD','LOW-REAR'].includes(p.camera)?{...p}:null;
}
function defensiveCameraFocus(s,ballPoint){
 const ids=new Set([s.fielderId,s.ballOwnerId,s.throwFromId,s.throwToId]);
 return[fieldProject(s.ball),ballPoint,...s.players.filter(p=>ids.has(p.id)||!['LF','CF','RF'].includes(p.position)).map(p=>fieldProject(p.point)),...s.runners.filter(r=>!r.out).map(r=>fieldProject(r.point))].filter(Boolean);
}
// Keep the live ball, fielding action, receiver and runners in a raised overview.
export function defensiveFieldCamera(s,ballPoint){
 const focus=defensiveCameraFocus(s,ballPoint);
 const xs=focus.map(p=>p.x),ys=focus.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const width=Math.max(1150,right-left+200,(bottom-top+240)/.6),height=width*.6;
 const x=clamp((left+right-width)/2,Math.min(0,1536-width),Math.max(0,1536-width));
 const y=clamp((top+bottom-height)/2+20,Math.min(-240,top-110),Math.max(0,1024-height));
 return{x,y,width,height};
}
// Camera movement follows play time, so pause/review does not let it drift.
// The target may change at a pickup or throw; ease the view without hiding the
// current ball or any active receiver/runner outside its safe frame.
export function createDefensiveCameraTracker(){
 let previous=null;
 const reset=()=>{previous=null;};
 function sample(s,ballPoint){
  const target=defensiveFieldCamera(s,ballPoint),key=s.teamId+':'+s.fielderId;
  if(s.reducedMotion){previous={key,clock:s.clock,camera:target};return target;}
  if(!previous||previous.key!==key||s.clock<previous.clock){
   const width=Math.max(1536,target.width),height=width*.6;
   previous={key,clock:s.clock,camera:{x:target.x+(target.width-width)/2,y:target.y+(target.height-height)/2,width,height}};
  }
  if(s.clock===previous.clock)return{...previous.camera};
  const dt=Math.min(.1,s.clock-previous.clock),q=1-Math.exp(-dt/.18),old=previous.camera;
  const center={x:old.x+old.width/2+(target.x+target.width/2-old.x-old.width/2)*q,y:old.y+old.height/2+(target.y+target.height/2-old.y-old.height/2)*q};
  let width=old.width+(target.width-old.width)*q;
  // The desired frame already has broad actor margins. This smaller emergency
  // inset prevents a momentary hand/glove-anchor change from forcing a zoom jump.
  for(const p of defensiveCameraFocus(s,ballPoint))width=Math.max(width,Math.abs(p.x-center.x)*2+40,(Math.abs(p.y-center.y)*2+40)/.6);
  const height=width*.6,camera={x:center.x-width/2,y:center.y-height/2,width,height};
  previous={key,clock:s.clock,camera};return{...camera};
 }
 return{sample,reset};
}
export function createSceneRenderer(canvas){const c=canvas.getContext('2d'),bank=createArtLoader(SCENE_ASSETS),art=bank.art;
 const fieldCameraTracker=createDefensiveCameraTracker();
 let lastView='bat',fieldTransitionStart=0,fieldTransitionImage=null,lastFieldCamera=null;
 const defenseSets={'coral-club':['fieldPark','coralKenField','coralNoahField'],'navy-stars':['fieldPark','fielder','fieldThrow','flyFielder','navyDylanField','navyKenField']};
 for(const [id,cast]of Object.entries(DEFENSIVE_PITCH_CAST))defenseSets[id.startsWith('coral-club')?'coral-club':'navy-stars'].push(...Object.keys(DEFENSIVE_PITCH_ASSETS).filter(key=>key.startsWith(cast.prefix)));
 for(const [id,cast]of Object.entries(APPROVED_FIELD_CAST)){const team=id.startsWith('coral-club-')?'coral-club':'navy-stars';for(const asset of [cast.asset,...Object.values(cast.poses??{}).map(p=>p.asset).filter(Boolean)])if(!defenseSets[team].includes(asset))defenseSets[team].push(asset);}
 for(const [id,cast]of Object.entries(CATCHER_CAST))defenseSets[id.startsWith('coral-club')?'coral-club':'navy-stars'].push(cast.receive,cast.transfer);
 defenseSets['coral-club'].push('coralCatcherThrow');
 defenseSets['navy-stars'].push('navyCatcherThrow',...Object.keys(RUNNING_ASSETS));
 const batterKeys=new Set(Object.values(BATTER_CAST).flatMap(p=>[p.ready,p.motion])),venueKeys=new Set(Object.values(STADIUM_ART)),defenseKeys=new Set(Object.values(defenseSets).flat()),opposingKeys=new Set([...Object.keys(OPPOSING_ASSETS),...Object.keys(DEFENSE_BATTING_ASSETS)]),pinned=Object.keys(SCENE_ASSETS).filter(key=>!key.startsWith('menu')&&!batterKeys.has(key)&&!venueKeys.has(key)&&!defenseKeys.has(key)&&!opposingKeys.has(key));
 let recent=['coral-club-emma'],currentVenue='navyScenery',currentDefense=[],currentOpposing=[];const failedCharacters=new Set();const ready=bank.load([...pinned,'batterReady','batterMotion',currentVenue]);
 function retainArt(){bank.retain([...pinned,currentVenue,...currentDefense,...currentOpposing,...recent.flatMap(x=>[BATTER_CAST[x].ready,BATTER_CAST[x].motion])]);}
 async function prepareOpposing(batterId,catcherId){currentOpposing=[...opposingArtKeys(null,catcherId),...defenseBatterKeys(batterId)];await bank.load(currentOpposing);retainArt();}
 async function prepareDefense(id){const keys=defenseSets[id];if(!keys)throw Error('Unknown defending team');currentDefense=keys;await bank.load(keys);retainArt();}
 async function prepareVenue(id){const key=STADIUM_ART[id];if(!key)return;currentVenue=key;await bank.load([key]);retainArt();}
 async function prepareBatter(id,hand){const cast=BATTER_CAST[id];if(!cast||!characterBatterPose(id,hand,0))return;
  // Recency follows the requested lineup, not network completion order. An old
  // request finishing late must not evict the player currently on screen.
  recent=[...recent.filter(x=>x!==id),id].slice(-2);
  try{await bank.load([cast.ready,cast.motion]);failedCharacters.delete(id);retainArt();}
  catch(error){failedCharacters.add(id);throw error;}
 }
 function oval(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
 function sprite(image,rect,anchor,world,scale,mask=null){if(mask){c.save();c.beginPath();mask.forEach((p,i)=>c[i?'lineTo':'moveTo'](world[0]+(p[0]-anchor[0])*scale,world[1]+(p[1]-anchor[1])*scale));c.closePath();c.clip();}c.drawImage(image,...rect,world[0]+(rect[0]-anchor[0])*scale,world[1]+(rect[1]-anchor[1])*scale,rect[2]*scale,rect[3]*scale);if(mask)c.restore();}
 function pitcher(frame,id='navy-stars-ryan'){const p=characterPitcherPose(id,frame),img=p&&art[p.asset];if(!img)return false;const k=img.naturalWidth/p.sourceWidth;oval(p.world[0],p.world[1],24,4,'#173b3e30');sprite(img,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),p.world,PITCHER_SCALE/k);return true;}
 function batter(frame,id='coral-club-emma',hand='R'){const p=characterBatterPose(id,hand,frame),img=art[p.asset],k=img.naturalWidth/p.sourceWidth;
  sprite(img,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),p.world,p.scale/k);
 }
 function ball(x,y,r){oval(x+2,y+4,r,r,'#14324542');oval(x,y,r,r,'#fffdf2');c.save();c.translate(x,y);c.strokeStyle='#df625d';c.lineWidth=Math.max(1,r*.12);for(const side of [-1,1]){c.beginPath();c.arc(side*r*.8,0,r*.7,side<0?-.9:2.2,side<0?.9:4.1);c.stroke();}c.restore();}
 function fieldView(s){
  if(!art.fieldPark||!art.fielder||!art.fieldThrow||!art.flyFielder){prepareDefense('navy-stars').catch(()=>{});return;}
  const f=fieldPlay(s),v=f.camera,scale=1600/v.width;
  c.save();c.scale(scale,scale);c.translate(-v.x,-v.y);
  c.drawImage(art.fieldPark,0,0,1536,1024);
  const pose=f.gathering?2:Math.floor(f.t*7)%2;
  const poses=[{rect:[0,0,510,1024],anchor:[240,900]},{rect:[512,0,510,1024],anchor:[770,900]},{rect:[1024,0,512,1024],anchor:[1275,800]}];
  const p=poses[pose],k=art.fielder.naturalWidth/1536;
  const throwPoses=[{rect:[0,0,520,1024],anchor:[470,920]},{rect:[520,0,504,1024],anchor:[930,920]},{rect:[1024,0,512,1024],anchor:[1470,705]}];
  const actionSprite=(n,where)=>{const p=throwPoses[n],k=art.fieldThrow.naturalWidth/1536;sprite(art.fieldThrow,p.rect.map(v=>v*k),p.anchor.map(v=>v*k),[where.x,where.y],.115/k,n===1?LIVE_FIELD_POSES.kenRelease.mask.map(p=>p.map(n=>n*k)):null);};
  // Receiver covers the bag before the throw; the bag is not the ball target.
  oval(f.receiver.x,f.receiver.y,19,5,'#193c4050');
  actionSprite(2,f.receiver);
  oval(f.fielder.x,f.fielder.y,19,5,'#193c4050');
  if(f.flyBall){const poses=[{rect:[0,0,545,1024],anchor:[280,960]},{rect:[550,0,500,1024],anchor:[810,970]},{rect:[1055,0,481,1024],anchor:[1305,980]}],p=poses[f.flyPose],k=art.flyFielder.naturalWidth/1536;sprite(art.flyFielder,p.rect.map(n=>n*k),p.anchor.map(n=>n*k),[f.fielder.x,f.fielder.y],.115/k);}else if(f.throwing)actionSprite(f.releasing?1:0,f.fielder);else sprite(art.fielder,p.rect.map(n=>n*k),p.anchor.map(n=>n*k),[f.fielder.x,f.fielder.y],.115/k);
  if(!f.collected)oval(f.ground.x,f.ground.y+1,5,2,'#17354070');
  // Possession changes the ball's anchor, never its visibility. Draw it over
  // the open glove pocket so the pickup remains readable on a phone.
  ball(f.ball.x,f.ball.y,4);
  c.restore();
  const actor=playerById(f.received?f.receiverId:f.fielderId);
  c.fillStyle='#183b54df';c.fillRect(40,810,410,76);c.fillStyle='#fff';c.font='bold 24px system-ui';c.fillText(actor.name+' · '+actor.position+' · '+f.stage,60,844);c.font='18px system-ui';c.fillText(f.flyBall?'Fly catch and return':'First-base timing · runner art pending',60,873);
  if(f.call){c.fillStyle=f.call==='out'?'#a83735ee':'#176b50ee';c.fillRect(630,110,340,65);c.fillStyle='white';c.font='bold 34px system-ui';c.textAlign='center';c.fillText(f.flyBall?'FLY OUT':f.call==='out'?'OUT AT FIRST':'SAFE AT FIRST',800,154);c.textAlign='start';}
 }
 function draw(s){lastView='bat';fieldTransitionImage=null;fieldCameraTracker.reset();lastFieldCamera=null;c.clearRect(0,0,1600,960);if(!art.park)return;if(usesFieldView(s)){fieldView(s);return;}c.drawImage(art.park,0,0,1600,960);
  const scenery=art[STADIUM_ART[s.homeTeamId??'navy-stars']];if(scenery)c.drawImage(scenery,0,0,scenery.naturalWidth,scenery.naturalHeight/2,0,0,1600,STADIUM_SCENERY_HEIGHT);
  c.save();c.fillStyle='#f4f5df';c.textAlign='center';c.font='bold 25px system-ui';c.fillText(s.venue??'Navy Stadium',1097,244,244);c.restore();
  const id=s.batterId??'coral-club-emma',hand=s.batterHand??'R',pose=characterBatterPose(id,hand,swingFrame(s));
  if(pose&&!art[pose.asset]&&!failedCharacters.has(id))prepareBatter(id,hand).catch(()=>{});
  // No captain-clone placeholders: supporting players need their own reviewed art.
  if(!pitcher(pitcherFrame(s),s.pitcherId??'navy-stars-ryan')){oval(957,490,42,42,'#173d59');c.fillStyle='white';c.font='bold 21px system-ui';c.textAlign='center';c.fillText(s.pitcherName+' · LHP',957,498);c.font='16px system-ui';c.fillText('Pitching frames in progress',957,560);c.textAlign='start';}
  if(pose&&art[pose.asset]){oval(470,925,87,12,'#173b3e25');batter(swingFrame(s),s.batterId,s.batterHand);}
  else{const left=s.batterHand!=='L',x=left?430:1220;c.fillStyle='#193d58e8';c.fillRect(x-150,715,300,115);c.fillStyle='#fff';c.font='bold 25px system-ui';c.textAlign='center';c.fillText(s.batterName+' · '+s.batterHand+' BAT',x,758);c.font='19px system-ui';c.fillText('Character artwork pending',x,795);c.textAlign='start';const t=s.swingAt===null?0:Math.max(0,s.elapsed-s.swingAt),a=t<.14?-1.1+t*9: .2+Math.min(t-.14,.4)*3;c.save();c.translate(left?680:1110,645);c.rotate(left?a:-a);c.strokeStyle='#d5a157';c.lineWidth=22;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(165,-100);c.stroke();c.restore();}
  const z=SCENE_GEOMETRY.zone;c.strokeStyle='#fff9e3bb';c.lineWidth=3;c.strokeRect(z.x-z.rx,z.y-z.ry,z.rx*2,z.ry*2);const x=z.x+s.aim.x*z.rx,y=z.y-s.aim.y*z.ry;
  c.strokeStyle='#fffef0';c.lineWidth=3;c.beginPath();c.arc(x,y,29,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-39,y);c.lineTo(x-18,y);c.moveTo(x+18,y);c.lineTo(x+39,y);c.moveTo(x,y-39);c.lineTo(x,y-18);c.moveTo(x,y+18);c.lineTo(x,y+39);c.stroke();
  if(s.phase==='flight'){const b=pitchPosition(s.pitch,s.elapsed);ball(b.x,b.y,b.r);const remain=clamp(1-s.elapsed/s.pitch.duration,0,1);c.strokeStyle='#ffe8a9b0';c.lineWidth=2;c.beginPath();c.arc(x,y,29+remain*70,0,Math.PI*2);c.stroke();}
  else if(s.phase==='hit'){const q=clamp(s.clock/1.3,0,1),start=pitchPosition(s.pitch,Math.min(s.pitch.duration,s.swingAt+.14)),dir=fieldPlay(s).direction;const end={x:900+dir*480,y:450};const bx=start.x+(end.x-start.x)*q,by=start.y+(end.y-start.y)*q-Math.sin(q*Math.PI)*200;ball(bx,by,Math.max(3,14*(1-q)));}
 }
 function drawDefense(s){
  if(lastView==='pitch'&&!s.reducedMotion&&canvas.ownerDocument){fieldTransitionImage=canvas.ownerDocument.createElement('canvas');fieldTransitionImage.width=1600;fieldTransitionImage.height=960;fieldTransitionImage.getContext('2d').drawImage(canvas,0,0);fieldTransitionStart=s.clock;}
  lastView='field';
  if(!art.fieldPark){c.clearRect(0,0,1600,960);return;}
  const poses=new Map(s.players.map(p=>[p.id,liveFieldPose(s,p)]).filter(([,pose])=>pose));
  const b=liveBallPoint(s,poses),camera=fieldCameraTracker.sample(s,b),scale=1600/camera.width;lastFieldCamera={...camera,clock:s.clock};
  c.clearRect(0,0,1600,960);c.fillStyle='#8bb75a';c.fillRect(0,0,1600,960);c.save();c.scale(scale,scale);c.translate(-camera.x,-camera.y);c.drawImage(art.fieldPark,0,0,1536,1024);
  const actors=[...s.players.map(p=>({p,q:fieldProject(p.point)})),...s.runners.filter(r=>!r.out||Number.isFinite(r.taggedAt)&&s.clock-r.taggedAt<.45).map(r=>({p:r,q:fieldProject(r.point),runner:true}))].sort((a,b)=>a.q.y-b.q.y);
  for(const {p,q,runner}of actors){
   const pose=runner?liveRunnerPose(s,p):poses.get(p.id);oval(q.x,q.y,18,5,'#153a3e35');
   if(pose&&art[fieldPoseDefinition(pose).asset]){const a=fieldPoseDefinition(pose),k=art[a.asset].naturalWidth/(a.sourceWidth??1536),foot=poseGround(pose,p);sprite(art[a.asset],a.rect.map(n=>n*k),a.anchor.map(n=>n*k),[foot.x,foot.y],(a.scale??LIVE_FIELD_SCALE)/k,a.mask?.map(p=>p.map(n=>n*k)));}
   else{oval(q.x,q.y-20,14,14,runner?'#d76659':'#244d70');c.fillStyle='white';c.font='bold 12px system-ui';c.textAlign='center';c.fillText(runner?'R':p.position,q.x,q.y-16);c.textAlign='start';}
   c.fillStyle='#153a4bdc';c.font='bold 12px system-ui';c.textAlign='center';c.fillText(p.name??s.runnerNames?.[p.id]??'Runner',q.x,q.y+20);c.textAlign='start';
  }
  ball(b.x,b.y,4.5);if(s.tagPoint){const tag=fieldProject(s.tagPoint);c.strokeStyle='#ffd461';c.lineWidth=3;c.beginPath();c.arc(tag.x,tag.y,18,0,Math.PI*2);c.stroke();}c.restore();
  if(s.call&&s.showCall!==false){c.fillStyle='#153a4bed';c.fillRect(40,140,360,65);c.fillStyle='white';c.font='bold 30px system-ui';c.textAlign='center';c.fillText(s.call==='homerun'?'HOME RUN':s.airCatch?'CAUGHT · OUT':s.playType==='doubleplay'?'DOUBLE PLAY':s.playType==='tripleplay'?'TRIPLE PLAY':s.call==='out'?'OUT':s.call==='safe'?'SAFE':'TAG REQUIRED',220,184);c.textAlign='start';}
  if(s.showReviewNotice!==false){c.fillStyle='#153a4bdc';c.fillRect(440,850,720,42);c.fillStyle='white';c.font='20px system-ui';c.textAlign='center';c.fillText('Character views still in progress use named markers',800,878);c.textAlign='start';}
  if(s.reducedMotion)fieldTransitionImage=null;
  if(fieldTransitionImage){const q=clamp((s.clock-fieldTransitionStart)/.38,0,1);if(q>=1||s.clock<fieldTransitionStart)fieldTransitionImage=null;else{c.save();c.globalAlpha=1-q;c.drawImage(fieldTransitionImage,80*q,48*q,1600*(1-.1*q),960*(1-.1*q));c.restore();}}
 }
 function drawPitching(s){
  lastView='pitch';fieldTransitionImage=null;fieldCameraTracker.reset();lastFieldCamera=null;
  c.clearRect(0,0,1600,960);
  // Approved composition supplies scenery only; all actors/ball remain live.
  const park=art.defensePitchPark;if(!park)return;
  const cover=Math.max(1600/park.naturalWidth,960/park.naturalHeight);
  c.drawImage(park,(1600-park.naturalWidth*cover)/2,(960-park.naturalHeight*cover)/2,park.naturalWidth*cover,park.naturalHeight*cover);
  const catcher=pitchingActorPose(catcherPose(s.catcherId,catcherAction(s)),'catcher'),frame=defensiveBatterFrame(s),batter=defenseBatterPose(s.batterId,s.batterHand,frame);
  const paint=p=>{const img=p&&art[p.asset];if(!img)return false;const k=img.naturalWidth/p.sourceWidth;sprite(img,p.rect.map(n=>n*k),p.anchor.map(n=>n*k),p.world,p.scale/k);return true;};
  const catcherDrawn=paint(catcher),batterDrawn=paint(batter);
  c.textAlign='center';c.font='bold 24px system-ui';c.fillStyle='#173747';
  if(!catcherDrawn)c.fillText(s.catcherName??'Catcher',1010,310);
  if(!batterDrawn){const x=s.batterHand==='L'?860:1270;oval(x,420,38,38,'#cc625a');c.fillText(s.batterName+' · '+s.batterHand+' BAT',x,470);c.font='18px system-ui';c.fillText('New camera artwork pending',x,500);}
  const delivery=(['pitch-ready','ready','intro'].includes(s.phase)?defensivePitcherIdle(s.pitcherId,s.pitcherHand):null)??defensivePitcherPose(s.pitcherId,s.pitcherHand,defensivePitcherFrame(s));
  if(delivery){
   oval(delivery.world[0],delivery.world[1]+3,48,9,'#173b3e26');
   const extra=delivery.otherFoot??delivery.landing;if(extra){const foot=defensivePitcherPoint(delivery,extra);oval(foot.x,foot.y+3,48,9,'#173b3e26');}
   paint(delivery);if(delivery.ballVisible&&s.phase==='windup'){const hand=defensivePitcherPoint(delivery,delivery.hand);ball(hand.x,hand.y,11);}
  }
  else c.fillText(s.pitcherName+' · '+s.pitcherHand+'HP',400,810);
  c.textAlign='start';
  const z=PITCHING_GEOMETRY.zone;c.strokeStyle='#fff9';c.lineWidth=3;c.strokeRect(z.x-z.rx,z.y-z.ry,z.rx*2,z.ry*2);
  const tx=z.x-s.aim.x*z.rx,ty=z.y-s.aim.y*z.ry;c.strokeStyle='white';c.beginPath();c.arc(tx,ty,28,0,Math.PI*2);c.stroke();
  if(s.phase==='flight'&&s.pitch){const p=pitchingPosition(s.pitch,s.elapsed,s.pitcherHand);ball(p.x,p.y,p.r);}
  // Brief contact hold, then the raised view uses the actual batted-ball path.
  if(s.phase==='hit'&&s.pitch){const at=pitchingPosition(s.pitch,s.elapsed,s.pitcherHand);ball(at.x,at.y,6);}
  if(s.phase==='result'&&['ball','strike','miss'].includes(s.pitchOutcome?.kind)&&catcherDrawn&&!catcher.containsBall){const at={x:catcher.world[0]+(catcher.glove[0]-catcher.anchor[0])*catcher.scale,y:catcher.world[1]+(catcher.glove[1]-catcher.anchor[1])*catcher.scale};ball(at.x,at.y,7);}
 }
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1600/r.width,y:(e.clientY-r.top)*960/r.height};}
 return {ready,prepareBatter,prepareVenue,prepareDefense,prepareOpposing,draw,drawDefense,drawPitching,point,get metrics(){return{...bank.metrics,defenseCamera:lastFieldCamera};}};
}
