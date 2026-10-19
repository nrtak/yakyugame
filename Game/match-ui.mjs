import {SWING_LEAD,judgeSwing} from './engine.mjs';
import {createMatch,applyOutcome,makeMatchPitch,cpuBat,contactOutcome,currentBatter,currentPitcher,halfLabel,resultHeadline,playerOfGame,TEAMS} from './match-engine.mjs';
import {createRenderer} from './match-render.mjs';

const $=id=>document.getElementById(id),canvas=$('field'),renderer=createRenderer(canvas);
let match=createMatch(),phase='intro',clock=0,elapsed=0,last=0,pitch=null,swing=null,aim={x:0,y:0};
let pending=null,play=null,event=null,playTime=0,chosenPitch='fast',releasePosition=0,cpuDecision=null;
let previousPhase='ready',rosterPhase='intro',returnPanel=null,drag=null,seed=211,audio=null,demo=false;
const activePhases=['ready','meter','windup','flight','play','call','review'];
const panels=['intro-panel','break-panel','pause-panel','final-panel','roster-panel'];
const contactKinds=['single','double','triple','homerun','groundout','flyout'];

function panel(id){$('modal-layer').hidden=!id;panels.forEach(p=>$(p).hidden=p!==id);}
function setAction(word,enabled){$('action-word').textContent=word;$('action').disabled=!enabled;$('action-key').textContent=word==='RELEASE'?'TAP NOW':'SPACE';}
function syncAim(){$('aim-x').value=Math.round(aim.x*100);$('aim-y').value=Math.round(aim.y*100);}
function sound(kind){
  if(!$('sound').checked)return;
  try{
    if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const start=audio.currentTime;
    const notes=kind==='homerun'?[523,659,784]:kind==='hit'?[880,440]:kind==='out'?[220]:[400];
    notes.forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind==='hit'?'triangle':'sine';osc.frequency.setValueAtTime(freq,start+i*.07);gain.gain.setValueAtTime(.0001,start+i*.07);gain.gain.exponentialRampToValueAtTime(.09,start+i*.07+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+i*.07+.16);osc.connect(gain);gain.connect(audio.destination);osc.start(start+i*.07);osc.stop(start+i*.07+.18);});
  }catch{/* Audio is optional when unavailable. */}
}
function updateHUD(){
  $('away-score').textContent=match.score[0];$('home-score').textContent=match.score[1];
  $('inning').textContent=match.over?'FINAL':`${match.half===0?'TOP':'BOT'} ${match.inning}`;
  $('half-role').textContent=match.over?'3 INNINGS':match.half===0?'YOU BAT':'YOU PITCH';
  $('balls').textContent=match.balls;$('strikes').textContent=match.strikes;$('outs').textContent=match.outs;
  // Display third, second, first as a compact companion to the field's runners.
  $('base-state').textContent=[2,1,0].map(i=>match.bases[i]?'◆':'◇').join(' ');
  $('base-state').setAttribute('aria-label',match.bases.some(Boolean)?`Runners on ${match.bases.map((id,i)=>id?['first','second','third'][i]:null).filter(Boolean).join(', ')}`:'Bases empty');
  const b=currentBatter(match),p=currentPitcher(match);
  $('batter-name').textContent=`${b.name}${b.captain?' · CAPTAIN':''} · ${b.position}`;
  $('pitcher-name').textContent=`vs ${p.name} · P`;
  $('pitch-info').textContent=match.half===0?'CORAL AT BAT':'NAVY AT BAT · YOU PITCH';
}
function status(title,detail){$('status').textContent=title;$('detail').textContent=detail;}
function controls(){
  const defense=match.half===1;
  $('pitch-options').hidden=!(defense&&['ready','meter'].includes(phase));
  $('release-wrap').hidden=phase!=='meter';
  $('pause').disabled=!activePhases.includes(phase);
  $('next').disabled=phase!=='review';
  $('next').textContent=event?.atBatEnded?'Next batter →':'Next pitch →';
  if(demo)setAction('DEMO',false);
  else if(phase==='ready'&&defense)setAction('PITCH',true);
  else if(phase==='meter')setAction('RELEASE',true);
  else if(phase==='flight'&&!defense)setAction('SWING',!swing);
  else setAction(defense?'PITCH':'SWING',false);
  $('field-hint').textContent=demo?'Demo game · both teams play automatically':phase==='play'?'Your teammates handle fielding and running':defense?'Aim · choose a pitch · release in the green':'Drag to aim · Space or tap to swing';
}
function advance(){
  if(match.over)return;
  panel(null);pending=null;play=null;event=null;swing=null;cpuDecision=null;elapsed=0;clock=0;playTime=0;$('callout').textContent='';
  if(match.half===0){pitch=makeMatchPitch(match,{speed:$('speed').value});phase='windup';status(`${currentBatter(match).name} is at the plate`,`${match.balls} balls · ${match.strikes} strikes · ${match.outs} out${match.outs===1?'':'s'}`);}
  else{phase='ready';pitch=null;status(`Pitch to ${currentBatter(match).name}`,`Drag the target, choose a pitch, then tap Pitch and release in the green.`);}
  if(demo&&pitch)cpuDecision=cpuBat(match,pitch);
  updateHUD();controls();canvas.focus({preventScroll:true});
}
function newGame(isDemo=false){
  demo=isDemo;
  match=createMatch({seed:seed++});aim={x:0,y:0};syncAim();chosenPitch='fast';
  document.querySelectorAll('[data-pitch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pitch===chosenPitch)));
  advance();sound('start');
}
function startPitch(){
  const releaseError=Math.abs(releasePosition-.5)*2;
  pitch=makeMatchPitch(match,{speed:$('speed').value,kind:chosenPitch,aim:{...aim},releaseError});
  cpuDecision=cpuBat(match,pitch);
  phase='windup';clock=0;elapsed=0;swing=null;controls();
  status(`${currentPitcher(match).name}: ${chosenPitch==='fast'?'fastball':chosenPitch==='curve'?'curveball':'changeup'}`,releaseError<.24?'Clean release. Watch the batter.':'Release missed the center. The pitch may drift.');
}
function action(){
  if(demo)return;
  if(phase==='ready'&&match.half===1){phase='meter';clock=0;releasePosition=0;controls();status('Find the green center','Tap Release as the marker crosses the middle.');return;}
  if(phase==='meter'){startPitch();return;}
  if(phase==='flight'&&match.half===0&&!swing){
    swing={inputTime:elapsed,impactTime:elapsed+SWING_LEAD,aim:{...aim}};
    const contact=judgeSwing(pitch,swing.aim,swing.impactTime);
    swing.outcome=contact.kind==='hit'?contactOutcome(match,contact):{kind:contact.kind,detail:contact.detail};
    swing.feedback=contact;controls();
  }
}
function finishPitch(outcome){
  play={...outcome,pitchKind:pitch.kind};pending=applyOutcome(match,play);event=pending.event;playTime=0;clock=0;
  $('callout').textContent=event.title;
  const timing=swing?.feedback?.timingMs;
  const timingText=typeof timing==='number'?` · ${Math.round(Math.abs(timing))} ms ${timing<0?'early':'late'}`:'';
  status(event.title,`${event.detail}${timingText}${event.runs?` · ${event.runs} run${event.runs===1?'':'s'} scored`:''}`);
  phase=contactKinds.includes(play.kind)||event.kind==='walk'?'play':'call';
  sound(play.kind==='homerun'?'homerun':['single','double','triple'].includes(play.kind)?'hit':['groundout','flyout','strikeout'].includes(event.kind)?'out':'pitch');controls();
}
function commitPlay(){
  match=pending.match;updateHUD();
  if(match.over){showFinal();return;}
  if(event.halfEnded){
    phase='break';clock=0;aim={x:0,y:0};syncAim();
    $('break-kicker').textContent=`${event.completedHalf.toUpperCase()} COMPLETE`;
    $('break-title').textContent=match.half===0?'Your turn to bat.':'Take the mound.';
    $('break-detail').textContent=match.half===0?`Coral is back at the plate. ${currentBatter(match).name} leads off ${halfLabel(match).toLowerCase()}.`:'Navy is coming up. Choose fastballs, curves and changeups; aim near the edges and vary your pitches.';
    $('break-score').textContent=`CORAL ${match.score[0]} — ${match.score[1]} NAVY`;
    panel('break-panel');controls();$('continue').focus({preventScroll:true});return;
  }
  phase='review';clock=0;controls();if(!demo)$('next').focus({preventScroll:true});
}
function makeCell(tag,value){const cell=document.createElement(tag);cell.textContent=value;return cell;}
function lineScore(){
  const table=document.createElement('table');table.className='line-table';table.setAttribute('aria-label','Final inning-by-inning score');
  const head=document.createElement('tr');['TEAM',...Array.from({length:match.innings},(_,i)=>i+1),'R','H'].forEach(v=>head.append(makeCell('th',v)));table.append(head);
  TEAMS.forEach((t,i)=>{const row=document.createElement('tr');[t.short,...match.lineScore[i].map(n=>n===null?'—':n),match.score[i],match.hits[i]].forEach((v,j)=>{const cell=makeCell(j===0?'th':'td',v);if(j>match.innings)cell.className='total';row.append(cell);});table.append(row);});
  $('line-score').replaceChildren(table);
}
function showFinal(){
  phase='final';panel('final-panel');$('callout').textContent='';
  $('final-title').textContent=resultHeadline(match);
  $('captain-reaction').textContent=match.winner===0?'Maya: “We backed each other up. That’s our game!”':match.winner===1?'Maya: “Good game, Kai. We’ll be ready for the rematch.”':'Maya: “Even after three innings? We’ll settle it next time!”';
  lineScore();
  const star=playerOfGame(match),s=match.stats[star.id],strong=document.createElement('strong'),detail=document.createElement('span');
  strong.textContent=(match.hits[0]+match.hits[1]===0)?'A pitchers’ afternoon':`Standout · ${star.name}`;
  detail.textContent=(match.hits[0]+match.hits[1]===0)?'Both teams kept the bats quiet.':`${s.h} hit${s.h===1?'':'s'} · ${s.rbi} RBI · ${s.r} run${s.r===1?'':'s'}`;
  $('final-highlight').replaceChildren(strong,detail);status('Final score',`Coral ${match.score[0]} — Navy ${match.score[1]} · ${match.pitchNumber} pitches`);controls();$('rematch').focus({preventScroll:true});
}
function openRoster(boxScore=false){
  if(phase==='roster')return;
  rosterPhase=phase;returnPanel=panels.find(p=>!$(p).hidden)??null;phase='roster';
  $('roster-title').textContent=boxScore?'Game box score':'Meet the teams';
  const grid=document.createElement('div');grid.className='roster-grid';
  TEAMS.forEach(team=>{
    const section=document.createElement('section');section.className='roster-team';
    const title=document.createElement('h3');title.textContent=team.name;const desc=document.createElement('p');desc.textContent=team.motto;section.append(title,desc);
    const table=document.createElement('table');table.className='roster-table';const header=document.createElement('tr');
    (boxScore?['#','PLAYER','POS','AB','H','R','RBI','BB']:['#','PLAYER','POS','CON','PWR','SPD']).forEach(t=>header.append(makeCell('th',t)));table.append(header);
    team.players.forEach(p=>{const row=document.createElement('tr');if(p.captain)row.className='captain';
      const s=match.stats[p.id],values=boxScore?[p.number,p.name+(p.captain?' ★':''),p.position,s.ab,s.h,s.r,s.rbi,s.bb]:[p.number,p.name+(p.captain?' ★':''),p.position,p.contact,p.power,p.speed];
      values.forEach(v=>row.append(makeCell('td',v)));table.append(row);
    });section.append(table);grid.append(section);
  });$('roster-content').replaceChildren(grid);panel('roster-panel');controls();$('roster-close').focus({preventScroll:true});
}
function closeRoster(){phase=rosterPhase;panel(returnPanel);controls();last=performance.now();if(activePhases.includes(phase))canvas.focus({preventScroll:true});else if(phase==='paused')$('resume').focus({preventScroll:true});else if(phase==='intro')$('start').focus({preventScroll:true});}
function pause(){
  if(!activePhases.includes(phase))return;
  previousPhase=phase;phase='paused';panel('pause-panel');controls();$('resume').focus({preventScroll:true});
}
function resume(){if(phase!=='paused')return;phase=previousPhase;panel(null);controls();last=performance.now();canvas.focus({preventScroll:true});}
function setup(){
  match=createMatch({seed});phase='intro';demo=false;aim={x:0,y:0};syncAim();pitch=null;swing=null;play=null;event=null;pending=null;
  panel('intro-panel');$('callout').textContent='';status('Maya and Kai are ready.','Two teams, nine players each, one community ballpark.');updateHUD();controls();
}
function canAim(){return !demo&&!swing&&(['ready','meter'].includes(phase)||(['windup','flight'].includes(phase)&&match.half===0));}
canvas.addEventListener('pointerdown',e=>{
  if(!canAim()||drag)return;
  const p=renderer.point(e,match.half===1);drag={id:e.pointerId,x:p.x,y:p.y,aim:{...aim},direct:Math.abs(p.x-p.z.x)<p.z.sx*2.2&&Math.abs(p.y-p.z.y)<p.z.sy*1.8};canvas.setPointerCapture(e.pointerId);moveAim(e);
});
function moveAim(e){if(!drag||e.pointerId!==drag.id||!canAim())return;
  const p=renderer.point(e,match.half===1),z=p.z;
  const x=drag.direct?(p.x-z.x)/z.sx:drag.aim.x+(p.x-drag.x)/77*.7;
  const y=drag.direct?(z.y-p.y)/z.sy:drag.aim.y-(p.y-drag.y)/95*.7;
  aim={x:Math.max(-1.8,Math.min(1.8,x)),y:Math.max(-1.5,Math.min(1.5,y))};syncAim();
}
canvas.addEventListener('pointermove',moveAim);
for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{if(e.pointerId===drag?.id)drag=null;});
$('action').addEventListener('pointerdown',e=>{e.preventDefault();action();});
// Pointer input already performs the action on press; keyboard activation has detail=0.
$('action').addEventListener('click',e=>{if(e.detail===0)action();});
$('start').addEventListener('click',()=>newGame(false));$('watch-demo').addEventListener('click',()=>newGame(true));$('continue').addEventListener('click',advance);
$('next').addEventListener('click',()=>{if(phase==='review')advance();});
$('rematch').addEventListener('click',setup);$('pause-restart').addEventListener('click',setup);
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);
$('roster-open').addEventListener('click',()=>openRoster(false));$('intro-teams').addEventListener('click',()=>openRoster(false));
$('boxscore-open').addEventListener('click',()=>openRoster(true));$('roster-close').addEventListener('click',closeRoster);
document.querySelectorAll('[data-pitch]').forEach(button=>button.addEventListener('click',()=>{
  if(!['ready','meter'].includes(phase))return;chosenPitch=button.dataset.pitch;
  document.querySelectorAll('[data-pitch]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
$('aim-toggle').addEventListener('click',()=>{const open=$('aim-controls').hidden;$('aim-controls').hidden=!open;$('aim-toggle').setAttribute('aria-expanded',String(open));});
for(const axis of ['x','y'])$('aim-'+axis).addEventListener('input',e=>{if(canAim())aim[axis]=Number(e.target.value)/100;});
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.code==='Space'&&['ready','meter','flight'].includes(phase)&&(e.target.tagName!=='BUTTON'||e.target.id==='action')){e.preventDefault();if(!e.repeat)action();}
  if(e.code==='Enter'&&phase==='review'&&e.target.tagName!=='BUTTON'){e.preventDefault();advance();}
  if(e.code.startsWith('Arrow')&&canAim()){
    e.preventDefault();aim.x=Math.max(-1.8,Math.min(1.8,aim.x+(e.code==='ArrowRight'?.1:e.code==='ArrowLeft'?-.1:0)));
    aim.y=Math.max(-1.5,Math.min(1.5,aim.y+(e.code==='ArrowUp'?.1:e.code==='ArrowDown'?-.1:0)));syncAim();
  }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&activePhases.includes(phase))pause();last=performance.now();});

function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(!['paused','roster','intro','final'].includes(phase)&&(phase!=='break'||demo))clock+=dt;
  if(demo&&phase==='ready'&&clock>.65){pitch=makeMatchPitch(match,{speed:$('speed').value});cpuDecision=cpuBat(match,pitch);phase='windup';clock=0;controls();}
  else if(demo&&phase==='review'&&clock>.8)advance();
  else if(demo&&phase==='break'&&clock>2.5)advance();
  else if(phase==='meter'){
    const wave=(clock*1.25)%2;releasePosition=wave<=1?wave:2-wave;$('release-marker').style.left=`${releasePosition*98}%`;
    if(clock>2.3)startPitch();
  }else if(phase==='windup'){
    if(clock>=.72){phase='flight';elapsed=0;clock=0;controls();}
  }else if(phase==='flight'){
    elapsed+=dt;
    if(demo){
      if(!swing&&elapsed>=pitch.duration-SWING_LEAD&&!['ball','strike'].includes(cpuDecision.kind))swing={inputTime:elapsed};
      if(elapsed>=pitch.duration+.08)finishPitch(cpuDecision);
    }else if(match.half===0){
      if(swing&&elapsed>=swing.impactTime&&['hit','foul'].includes(swing.feedback.kind))finishPitch(swing.outcome);
      else if(elapsed>=Math.max(pitch.duration+.2,swing?.impactTime??0))finishPitch(swing?swing.outcome:{kind:pitch.inZone?'strike':'ball',detail:pitch.inZone?'That pitch crossed the zone.':'Outside the zone. Good take.'});
    }else if(elapsed>=pitch.duration+.08)finishPitch(cpuDecision);
  }else if(phase==='play'){
    playTime+=dt;if(playTime>=(play.kind==='homerun'?3.1:2.25))commitPlay();
  }else if(phase==='call'&&clock>=.85)commitPlay();
  renderer.draw({match,phase,clock,elapsed,pitch,swing,aim,play,event,playTime,cpuSwing:cpuDecision&&!['ball','strike'].includes(cpuDecision.kind),guide:$('guide').checked});
  requestAnimationFrame(frame);
}
setup();requestAnimationFrame(frame);
