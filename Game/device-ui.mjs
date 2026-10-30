import {DeviceGame,GAME_FORMATS,gameFormatLabel} from './device-game.mjs';
import {PITCH_TYPES,projectPitch} from './pitch-types.mjs';
import {createSceneRenderer,SCENE_GEOMETRY,pitchPosition,STADIUM_ART,SCENE_ASSETS} from './scene-render.mjs';
import {TEAMS,playerById,venueName} from './rosters.mjs';
import {createProfileStore,completedMatchRecord} from './player-profiles.mjs';
import {gameControls} from './game-controls.mjs';
import {PLAY_TIPS,tipForGame,defenseFeedback} from './game-help.mjs';
import {createMatchSaveStore,resumeMatchCheckpoint} from './match-save.mjs';
import {seriesFixture} from './tournament-progress.mjs';
import {cupFixture} from './club-cup.mjs';
import {createCompetitionUI} from './competition-ui.mjs';
import {createFieldingPracticeUI} from './fielding-practice-ui.mjs';
import {CaptainBattingPractice,PRACTICE_CAPTAINS} from './batting-practice.mjs';
import {GameEffects,effectForEvent,isExceptionalFastball,drawGameEffect,drawPitchSpeedTrail} from './game-effects.mjs';
const $=id=>document.getElementById(id),canvas=$('field'),ctx=canvas.getContext('2d'),renderer=createSceneRenderer(canvas);
for(const option of $('innings').options)option.textContent=gameFormatLabel(Number(option.value));
const profiles=createProfileStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
const matchSaves=createMatchSaveStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
const effects=new GameEffects(),motionPreference=matchMedia('(prefers-reduced-motion: reduce)');let lastPresentedEvent=null,announcedEffect='',reduceEffects=false;
let game=new DeviceGame(),loaded=false,last=performance.now(),drag=null,lastField=null,shown='',uiSignature='',preparing=false,loadEpoch=0,loadError='',menuPage='home',settingsReturn='home',matchProfileId=null,matchRunId=null,matchSeries=false,matchCup=false,activeTip=null;
let practice=null,practiceProfileId=null,practiceRunId=null,pitchPickerOpen=false;
const competitions=createCompetitionUI({profiles,renderer,overlay,showMenu,home,update});
const fieldingPractice=createFieldingPracticeUI({renderer,overlay,showMenu,home,update,reducedMotion:()=>reduceEffects||motionPreference.matches,onStart(){effects.clear();$('effects-layer').getContext('2d').clearRect(0,0,1600,960);drag=null;last=performance.now();}});
const activity=()=>fieldingPractice.activity??competitions.activity??practice;
for(const p of PRACTICE_CAPTAINS){const o=document.createElement('option');o.value=p.id;o.textContent=p.team+' · '+p.name+' · '+p.bats+' BAT';$('practice-captain').append(o);}
function overlay(which){$('overlay').hidden=!which;document.querySelector('.card').dataset.screen=which??'game';for(const id of ['home','profiles','settings-page','records-page','menu','paused','results','tutorial','practice-menu','practice-results','fielding-menu','fielding-results','competitions','derby-menu','derby-results','collection','cup-bracket'])$(id).hidden=id!==which;}
function refreshProfile(){
 const p=profiles.current,prefs=p.preferences;
 const series=p.progression.activeSeries,seriesMode=$('play-mode').value==='series',activeSeries=seriesMode&&series?.status==='active',cupMode=$('play-mode').value==='cup',cup=p.progression.activeCup,activeCup=cupMode&&cup&&!cup.over;
 if(activeSeries){const fixture=seriesFixture(series);prefs.teamId=fixture.teamId;prefs.homeTeamId=fixture.homeTeamId;prefs.innings=fixture.innings;}
 if(seriesMode&&!activeSeries)prefs.homeTeamId=TEAMS[1].id;
 if(activeCup){const f=cupFixture(cup);prefs.teamId=f.teamId;prefs.homeTeamId=f.homeTeamId;prefs.innings=f.innings;}
 for(const id of ['team','innings'])$(id).disabled=!!(activeSeries||activeCup);$('home-team').disabled=seriesMode||cupMode;
 $('series-summary').hidden=!seriesMode&&!cupMode;
 $('series-summary').textContent=!p.id?'Choose a player profile to save a series.':activeSeries?series.teamIds.map((id,i)=>TEAMS.find(t=>t.id===id).short+' '+seriesFixture(series).wins[i]).join(' · ')+' · Game '+seriesFixture(series).gameNumber+'. Resume your saved game from the start of the current pitch.':'First team to two wins takes the series. Home stadiums alternate. Drawn games are replayed.';
 if(cupMode)$('series-summary').textContent=!p.id?'Choose a player profile to save a Cup.':activeCup?cupFixture(cup).roundLabel+' · '+cupFixture(cup).teamIds.map(id=>TEAMS.find(t=>t.id===id)?.name??id).join(' vs '):'Knockout Cup · '+TEAMS.length+' ready clubs · Draws replay the round.';
 reduceEffects=prefs.reducedMotion;
 $('active-player').textContent=$('matchup-player').textContent='Playing as '+p.name;
 $('settings-player').textContent=p.name+' · PREFERENCES';$('settings-save-note').textContent=p.id?'Changes save automatically for this player.':'Guest changes last for this session.';
 $('difficulty').value=prefs.difficulty;$('sensitivity').value=prefs.sensitivity;$('assistance').value=prefs.assisted?'on':'off';$('menu-motion').value=prefs.reducedMotion?'off':'on';$('team').value=prefs.teamId;
 $('innings').value=String(prefs.innings);$('home-team').value=prefs.homeTeamId;$('home-length').textContent=gameFormatLabel(prefs.innings)+' · Local play';
 const home=TEAMS.find(t=>t.id===prefs.homeTeamId),away=TEAMS.find(t=>t.id!==home.id);$('venue').textContent=venueName(home);$('home-label').textContent=home.short;$('away-label').textContent=away.short;$('matchup-length').textContent=gameFormatLabel(prefs.innings);$('matchup-format').textContent=GAME_FORMATS[prefs.innings].toUpperCase();
 $('game').classList.toggle('reduced-motion',prefs.reducedMotion);
 $('game').style.setProperty('--venue-image','url("'+SCENE_ASSETS[STADIUM_ART[prefs.homeTeamId]]+'")');
 const saved=matchSaves.read(p.id);$('resume-saved').hidden=$('saved-summary').hidden=!saved;if(saved){const m=saved.checkpoint.match;$('saved-summary').textContent=(m.half===0?'Top ':'Bottom ')+m.inning+' · '+m.score.join('–')+' · Current pitch restarts';}
 $('storage-notice').textContent=profiles.notice||matchSaves.notice;$('storage-notice').hidden=!$('storage-notice').textContent;
}
function showMenu(page){if(game.phase!=='menu'||preparing)return;menuPage=page;refreshProfile();uiSignature='';update();}
function showProfiles(){
 const list=$('profile-list');list.replaceChildren();
 if(!profiles.players.length){const empty=document.createElement('p');empty.className='hint';empty.textContent='No saved players yet.';list.append(empty);}
 for(const p of profiles.players){const button=document.createElement('button');button.type='button';button.textContent=p.name;button.setAttribute('aria-pressed',String(profiles.current.id===p.id));button.addEventListener('click',()=>{profiles.select(p.id);refreshProfile();showMenu('home');});list.append(button);}
 $('profile-error').textContent='';$('profile-name').value='';showMenu('profiles');
}
function settings(from){settingsReturn=from;refreshProfile();const a=renderer.metrics;$('art-metrics').textContent=a.loadedKeys.length+' images held · '+(a.decodedBytes/1048576).toFixed(1)+' MB estimated image memory · '+(a.peakDecodedBytes/1048576).toFixed(1)+' MB peak · '+a.failures+' load failures. This estimate excludes browser and graphics memory. Physical iPhone testing is still needed.';showMenu('settings-page');}
function showRecords(){
 const p=profiles.current,r=p.records,list=$('record-values');$('records-player').textContent=p.name+' · RECORDS';list.replaceChildren();
 for(const [label,value]of [['Games',r.games],['Wins',r.wins],['Losses',r.losses],['Draws',r.draws],['Runs',r.runs],['Hits',r.hits],['Pitching strikeouts',r.strikeouts],['Series titles',p.progression.seriesHistory.filter(s=>s.winnerId===s.userTeamId).length],['Cup titles',p.progression.cupHistory.filter(c=>c.winnerId===c.config.userTeamId).length],['Derbies',r.derbies],['Derby titles',r.derbyTitles],['Derby home runs',r.derbyHomeRuns],['Longest Derby HR',r.longestHomeRun+' ft']]){const box=document.createElement('div');box.className='record-cell';const number=document.createElement('b'),caption=document.createElement('span');number.textContent=value;caption.textContent=label;box.append(number,caption);list.append(box);}
 $('records-note').textContent=p.id?'Your completed game totals are saved on this device.':'Create a player profile to keep your records. Guest games are not saved.';showMenu('records-page');
}
function home(){fieldingPractice.stop();competitions.stop();loadEpoch++;practice=null;pitchPickerOpen=false;preparing=false;loadError='';effects.clear();lastPresentedEvent=null;activeTip=null;game.reset();lastField=null;drag=null;menuPage='home';refreshProfile();uiSignature='';update();}
refreshProfile();
function dot(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function label(text,x,y,size=22,color='#173747'){ctx.font=`bold ${size}px system-ui`;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y);ctx.textAlign='start';}
function pitching(){renderer.drawPitching(game.sceneState());}
function draw(){
 if(fieldingPractice.activity){fieldingPractice.draw();return;}
 if(competitions.activity){renderer.draw(competitions.activity.sceneState());return;}
 if(practice){renderer.draw(practice.sceneState());return;}
 if(game.phase==='field'||(game.phase==='review'&&lastField)){const s=game.defense??lastField;renderer.drawDefense({...s,reducedMotion:reduceEffects||motionPreference.matches,showCall:false,showReviewNotice:false,runnerNames:Object.fromEntries(s.runners.map(r=>[r.id,playerById(r.id).name]))});return;}
 if(!game.viewingBatting&&game.phase!=='menu'){pitching();return;}
 const s=game.sceneState();if(s.pitch&&game.renderPitcher.throws==='L')s.pitch={...s.pitch,release:{x:1000,y:SCENE_GEOMETRY.release.y}};renderer.draw(s);
}
function results(){
 matchSaves.clear(matchProfileId,matchRunId);
 const m=game.match,teams=game.teams;$('winner').textContent=m.winner===null?'A friendly draw':teams[m.winner].name+' wins';$('final-score').textContent=`${teams[0].short} ${m.score[0]} — ${m.score[1]} ${teams[1].short}`;$('final-length').textContent=gameFormatLabel(m.innings).toUpperCase()+' · FINAL';
 profiles.recordMatch(matchProfileId,matchRunId,completedMatchRecord(m,game.teamId));refreshProfile();
 $('series-result').hidden=!matchSeries;
 if(matchSeries){const progress=profiles.recordSeriesMatch(matchProfileId,{matchId:matchRunId,teamIds:m.teamIds,score:m.score,over:m.over}),s=progress.activeSeries,fixture=seriesFixture(s);
  $('series-result').textContent=s.status==='complete'?TEAMS.find(t=>t.id===s.winnerId).name+' wins the series!':s.teamIds.map((id,i)=>TEAMS.find(t=>t.id===id).short+' '+fixture.wins[i]).join(' · ')+(m.winner===null?' · Draw: replay this game.':' · Next game ready.');
  $('again').textContent=s.status==='complete'?'Start New Series':'Next Series Game';refreshProfile();
 }else $('again').textContent='Play Again';
 if(matchCup){const progress=profiles.recordCupMatch(matchProfileId,{matchId:matchRunId,teamIds:m.teamIds,score:m.score,over:m.over}),c=progress.activeCup;$('series-result').hidden=false;$('series-result').textContent=c.over?(TEAMS.find(t=>t.id===c.winnerId).name+' wins the Cup!'+(c.winnerId===c.config.userTeamId?' Pennant Away and Control Lab earned.':'')):m.winner===null?'Draw · Replay this Cup round.':cupFixture(c).roundLabel+' is next!';$('again').textContent=c.over?'Start New Cup':'Next Cup Game';refreshProfile();}
 const table=document.createElement('table'),head=document.createElement('tr');for(const t of ['Player','AB','H','R','RBI']){const th=document.createElement('th');th.textContent=t;head.append(th);}table.append(head);
 for(const team of TEAMS)for(const p of team.players){const s=m.stats[p.id];if(!s.ab&&!s.bb&&!s.r)continue;const tr=document.createElement('tr');for(const v of [team.short+' · '+p.name,s.ab,s.h,s.r,s.rbi]){const td=document.createElement('td');td.textContent=v;tr.append(td);}table.append(tr);}$('stats').replaceChildren(table);
}
function openTip(role){activeTip=role;game.pause();drag=null;const help=PLAY_TIPS[role];$('tip-title').textContent=help.title;$('tip-note').textContent=role==='batting'&&!game.assisted?'Contact help is off. You can change it in Game Settings.':help.note;$('tip-steps').replaceChildren(...help.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
function update(){
 if(fieldingPractice.activity){fieldingPractice.update();return;}
 if(competitions.activity){competitions.update();return;}
 if(practice){updatePractice();return;}
 const tip=tipForGame(game);if(tip&&!preparing&&!game.paused&&!activeTip&&!profiles.current.tutorials.includes(tip))openTip(tip);
 const m=game.match,field=game.phase==='field',s=game.defense;
 const signature=JSON.stringify([menuPage,preparing,loadError,activeTip,pitchPickerOpen,game.phase,game.paused,game.userBatting,game.swingAt!==null,game.pitchKind,game.batter.id,game.pitcher.id,m.score,m.inning,m.half,m.balls,m.strikes,m.outs,m.over,s?.phase,s?.possession,s?.call,s?.ballOwnerId,s?.throwToId,s?.target,s?.canThrow,s?.canTag,s?.tagPending,s?.recommendation,s?.playOuts,s?.flightType,s?.throwOptions?.map(o=>[o.base,o.force,o.out,o.tagRequired]),game.event?.title,game.event?.detail]);
 if(signature===uiSignature)return;uiSignature=signature;
 if(!preparing&&matchRunId&&!['menu','final'].includes(game.phase))matchSaves.save(matchProfileId,{runId:matchRunId,series:matchSeries,cup:matchCup,game});
 $('resume-saved').disabled=!loaded||preparing;
 if(game.event&&game.event!==lastPresentedEvent){lastPresentedEvent=game.event;const kind=effectForEvent(game.event),key='play-'+m.pitchNumber;
  if(kind)effects.play(kind,{key});else if(game.event.atBatEnded&&!game.event.halfEnded&&(m.pitchNumber+game.seed)%5===0)effects.play('crowd',{key});
 }
 const teams=game.teams;$('coral').textContent=teams[0].short+' '+m.score[0];$('navy').textContent=teams[1].short+' '+m.score[1];$('coral').style.background=teams[0].color;$('navy').style.background=teams[1].color;$('half').textContent=m.over?'FINAL':((game.phase==='review'&&game.atBat?game.atBat.half:m.half)===0?'TOP':'BOT')+' '+(game.phase==='review'&&game.atBat?game.atBat.inning:m.inning);$('count').textContent=`B ${m.balls} · S ${m.strikes} · O ${(game.phase==='review'&&game.event?.halfEnded?3:m.outs+(field?s?.playOuts??0:0))}`;
 const controls=gameControls(game);$('pause').disabled=['menu','final'].includes(game.phase);$('pad').hidden=!controls.aimVisible;$('pad').setAttribute('aria-disabled',String(!controls.aimEnabled));$('action').hidden=!controls.actionVisible;$('action').querySelector('b').textContent=controls.actionLabel;$('action').querySelector('small').textContent=controls.actionDetail;$('action').setAttribute('aria-label',controls.actionLabel+' · '+controls.actionDetail);$('action').disabled=!controls.actionEnabled;
 if(!controls.pitchesVisible||game.paused)pitchPickerOpen=false;
 $('pitch-picker').hidden=!controls.pitchesVisible;$('pitch-picker').disabled=game.paused;$('pitch-picker').textContent=PITCH_TYPES[game.pitchKind].name+' · Change';$('pitch-picker').setAttribute('aria-expanded',String(pitchPickerOpen));$('pitches').hidden=!controls.pitchesVisible||!pitchPickerOpen;
 $('phase-label').hidden=['menu','final'].includes(game.phase);$('phase-label').textContent=controls.heading;$('control-hint').hidden=['menu','final','review'].includes(game.phase);$('control-hint').textContent=controls.hint;$('game').dataset.playMode=field?'field':game.userBatting?'bat':'pitch';
 const pitchPanel=$('pitches');if(pitchPanel.dataset.pitcher!==game.pitcher.id){pitchPanel.dataset.pitcher=game.pitcher.id;pitchPanel.replaceChildren(...game.repertoire.map(kind=>{const b=document.createElement('button');b.dataset.pitch=kind;b.textContent=PITCH_TYPES[kind].name;b.title=PITCH_TYPES[kind].hint;return b;}));}
 for(const p of document.querySelectorAll('[data-pitch]')){p.setAttribute('aria-pressed',String(p.dataset.pitch===game.pitchKind));p.disabled=game.paused;}
 $('throws').hidden=!controls.throwsVisible;for(const b of document.querySelectorAll('[data-base]')){const target=controls.bases.find(t=>t.base===b.dataset.base);b.disabled=!target.enabled;b.classList.toggle('recommended',target.recommended);b.setAttribute('aria-label',target.ariaLabel);const name=document.createElement('b'),detail=document.createElement('small');name.textContent=(target.recommended?'★ ':'')+target.label;detail.textContent=target.detail;b.replaceChildren(name,detail);b.title=target.ariaLabel;}
 $('tag-runner').hidden=!controls.tagVisible;$('tag-runner').disabled=!controls.tagEnabled;$('tag-runner').textContent=controls.tagLabel;
 $('next').disabled=preparing;$('start').disabled=!loaded||preparing;$('start').textContent=preparing?'Getting players ready…':loadError?'Try Again':$('play-mode').value==='cup'?(profiles.current.progression.activeCup&&!profiles.current.progression.activeCup.over?'Resume Club Cup':'Start Club Cup'):$('play-mode').value==='series'?(profiles.current.progression.activeSeries?.status==='active'?'Resume Series':'Start Rivalry Series'):'Start '+GAME_FORMATS[Number($('innings').value)];$('next').hidden=game.phase!=='review';$('next').textContent=m.over?'See Results →':game.event?.halfEnded?'Change Sides →':'Next Pitch →';
 let message=game.batter.name+' · '+game.batter.bats+' BAT vs '+game.pitcher.name+' · '+game.pitcher.throws+'HP';
 if(game.phase==='field'){const owner=s?.players.find(p=>p.id===s.ballOwnerId),receiver=s?.players.find(p=>p.id===s.throwToId);message=s?.tagPending?'Ready to tag · Waiting for the runner':s?.canTag&&!game.userBatting?'Tap Tag Runner · A tag is needed for this out':s?.canThrow?(owner?.name??'Fielder')+' has the ball · '+(game.userBatting?'Defense choosing a throw':'Tap a base'+(s.playOuts?' for another out':'')):s?.phase==='airborne'?s.flightType+' · Tracking the ball':s?.phase==='caught'?owner.name+' makes the catch · Runners hold':s?.phase==='homerun'?'Over the fence · Home run':s?.phase==='approach'?'Ball in play · '+s.players.find(p=>p.id===s.fielderId)?.name+' is fielding':s?.phase==='carry'?'Touching the bag':s?.phase==='throw'?'Throw to '+s.target+' · '+receiver?.name+' receiving':(owner?.name??'Fielder')+' securing the ball';}
 else if(game.phase==='review')message=game.event.title+' · '+game.event.detail;
 $('message').textContent=loadError||message;$('matchup-error').textContent=loadError;$('matchup-error').hidden=!loadError;
 const feedback=defenseFeedback(field?s:game.phase==='review'?lastField:null);$('possession').hidden=!field;$('possession').textContent=feedback.possession;$('play-call').hidden=!feedback.call;$('play-call').textContent=feedback.call;$('play-call').dataset.tone=feedback.tone;
 $('hud').hidden=game.phase==='menu';$('pause').hidden=game.phase==='menu';$('message').hidden=game.phase==='menu';
 $('game').classList.toggle('menu-open',game.phase==='menu'||game.phase==='final'||game.paused);
 if(activeTip)overlay('tutorial');else if(game.paused)overlay('paused');else if(game.phase==='menu')overlay(menuPage);else if(game.phase==='final'){if(shown!=='final'){results();effects.play('end',{key:'final',title:m.winner===null?'A FRIENDLY DRAW':teams[m.winner].short+' WINS!',subtitle:teams[0].short+' '+m.score[0]+' · '+teams[1].short+' '+m.score[1]});}overlay('results');}else overlay(null);shown=game.paused?'paused':game.phase;
}
async function prepareAndAdvance(start=false){
 if(preparing||game.paused)return;const current=game,token=++loadEpoch;preparing=true;loadError='';update();
 try{await Promise.all([renderer.prepareBatter(game.batter.id,game.batter.bats),renderer.prepareVenue(game.homeTeamId),renderer.prepareDefense(game.teams[1-game.match.half].id),renderer.prepareOpposing(game.batter.id,game.teams[1-game.match.half].players.find(p=>p.position=== 'C').id)]);if(token!==loadEpoch||current!==game||game.paused)return;const changeSides=game.event?.halfEnded;lastField=null;effects.clear();start?game.start():game.next();
  if(start)effects.play('start',{key:'start',subtitle:game.teams[0].short+' vs. '+game.teams[1].short});else if(changeSides&&!game.match.over)effects.play('inning',{key:'half-'+game.match.inning+'-'+game.match.half,title:(game.match.half===0?'TOP ':'BOTTOM ')+game.match.inning,subtitle:game.teams[game.match.half].short+' up to bat'});
  last=performance.now();}
 catch{loadError='Character images could not load. Tap again to retry.';}
 finally{if(token===loadEpoch){preparing=false;uiSignature='';update();}}
}
async function begin(){if(!loaded||preparing)return;const saved=matchSaves.read(profiles.current.id);if(($('play-mode').value==='series'&&saved?.series&&saved.runId===profiles.current.progression.activeSeries?.pendingMatchId)||($('play-mode').value==='cup'&&saved?.cup&&saved.runId===profiles.current.progression.activeCup?.pendingMatchId))return resumeSavedGame();lastPresentedEvent=null;effects.clear();matchProfileId=profiles.current.id;matchRunId=crypto.randomUUID();matchSeries=$('play-mode').value==='series';matchCup=$('play-mode').value==='cup';let options={teamId:$('team').value,homeTeamId:$('home-team').value,innings:Number($('innings').value),seed:211,assisted:$('assistance').value==='on',difficulty:$('difficulty').value};
 if(matchSeries){try{if(profiles.current.progression.activeSeries?.status!=='active')profiles.startSeries(matchProfileId,{id:crypto.randomUUID(),teamIds:TEAMS.map(t=>t.id),userTeamId:options.teamId,innings:options.innings});const fixture=profiles.prepareSeriesMatch(matchProfileId,matchRunId);matchRunId=fixture.matchId;options={...options,teamId:fixture.teamId,homeTeamId:fixture.homeTeamId,innings:fixture.innings};}catch(error){loadError=error.message;uiSignature='';update();return;}}
 if(matchCup){try{if(!profiles.current.progression.activeCup||profiles.current.progression.activeCup.over)profiles.startCup(matchProfileId,{id:crypto.randomUUID(),teamIds:TEAMS.map(t=>t.id),userTeamId:options.teamId,innings:options.innings,seed:211});const fixture=profiles.prepareCupMatch(matchProfileId,matchRunId);matchRunId=fixture.matchId;options={...options,teamId:fixture.teamId,homeTeamId:fixture.homeTeamId,innings:fixture.innings};}catch(error){loadError=error.message;uiSignature='';update();return;}}
 game=new DeviceGame(options);await prepareAndAdvance(true);}
async function resumeSavedGame(){if(!loaded||preparing)return;const saved=matchSaves.read(profiles.current.id);if(!saved){refreshProfile();return;}game=resumeMatchCheckpoint(saved.checkpoint);matchProfileId=profiles.current.id;matchRunId=saved.runId;matchSeries=saved.series;matchCup=!!saved.cup;$('play-mode').value=matchCup?'cup':matchSeries?'series':'single';lastField=null;activeTip=null;lastPresentedEvent=null;effects.clear();await prepareAndAdvance(true);}
async function startPractice(){if(!loaded||preparing)return;const p=PRACTICE_CAPTAINS.find(p=>p.id===$('practice-captain').value),token=++loadEpoch;preparing=true;$('practice-start').disabled=true;$('practice-error').textContent='Loading captain…';try{await renderer.prepareBatter(p.id,p.bats);if(token!==loadEpoch)return;practice=new CaptainBattingPractice(p.id);practiceProfileId=profiles.current.id;practiceRunId=crypto.randomUUID();effects.clear();activeTip=null;practice.start();last=performance.now();}catch{$('practice-error').textContent='Character images could not load. Please try again.';}finally{if(token===loadEpoch){preparing=false;$('practice-start').disabled=false;update();}}}
function updatePractice(){
 const s=practice,summary=s.phase==='summary';$('hud').hidden=false;$('coral').textContent=s.player.name;$('navy').textContent=s.player.bats+' BAT';$('half').textContent='PITCH '+Math.min(10,s.index+1)+'/10';$('count').textContent=s.results.filter(r=>r.kind==='hit').length+' fair hits · Batting practice';
 $('pause').hidden=false;$('pause').disabled=summary;$('pitch-picker').hidden=$('pitches').hidden=$('throws').hidden=$('tag-runner').hidden=$('next').hidden=$('possession').hidden=$('play-call').hidden=true;$('replay-tips').hidden=true;
 $('action').hidden=summary;$('action').disabled=s.paused||s.phase!=='flight'||s.swingAt!==null;$('action').querySelector('b').textContent='SWING';$('action').querySelector('small').textContent=s.swingAt!==null?'SWUNG':s.phase==='flight'?'TAP NOW':'GET READY';$('pad').hidden=summary;$('pad').setAttribute('aria-disabled',String(s.paused||s.swingAt!==null));
 $('phase-label').hidden=summary;$('phase-label').textContent='BATTING PRACTICE';$('game').dataset.playMode='bat';$('message').hidden=summary;$('message').textContent=s.phase==='result'?s.result.title:'Drag to aim · Tap Swing just before the ball arrives';$('control-hint').hidden=true;$('game').classList.toggle('menu-open',s.paused||summary);
 if(summary){profiles.recordPractice(practiceProfileId,practiceRunId,'batting',s.summary.score);$('practice-score').textContent=s.player.name+' · '+s.summary.fairHits+' fair hits out of 10 pitches · '+s.summary.score+' points';overlay('practice-results');}else overlay(s.paused?'paused':null);
}
function act(){if(fieldingPractice.activity)return;pitchPickerOpen=false;if(competitions.activity)competitions.activity.swing();else if(practice)practice.swing();else game.userBatting?game.swing():game.releasePitch();update();}
function pause(){loadEpoch++;preparing=false;$('practice-start').disabled=false;if(activity())activity().paused=true;else game.pause();drag=null;last=performance.now();update();}
window.GameLifecycle={pause};
function closeTip(skip=false){if(!activeTip)return;profiles.finishTutorial(skip?Object.keys(PLAY_TIPS):[activeTip]);activeTip=null;game.resume();last=performance.now();uiSignature='';update();}
$('tip-continue').addEventListener('click',()=>closeTip());$('tip-skip').addEventListener('click',()=>closeTip(true));$('replay-tips').addEventListener('click',()=>{profiles.resetTutorials();openTip(tipForGame(game)??(game.viewingBatting?'batting':'pitching'));uiSignature='';update();});
$('resume-saved').addEventListener('click',resumeSavedGame);
$('open-practice').addEventListener('click',()=>{$('practice-error').textContent='';showMenu('practice-menu');});$('practice-back').addEventListener('click',()=>showMenu('home'));$('practice-start').addEventListener('click',startPractice);$('practice-again').addEventListener('click',()=>{practice=null;startPractice();});$('practice-home').addEventListener('click',home);
for(const id of ['start','again'])$(id).addEventListener('click',begin);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',()=>{if(activity())activity().paused=false;else game.resume();last=performance.now();update();});$('exit').addEventListener('click',home);$('results-home').addEventListener('click',home);$('next').addEventListener('click',()=>{if(fieldingPractice.activity)fieldingPractice.next();else if(competitions.activity)competitions.startTurn();else if(game.phase==='review')prepareAndAdvance();});
$('play-ball').addEventListener('click',()=>showMenu('menu'));$('matchup-back').addEventListener('click',()=>showMenu('home'));
$('play-mode').addEventListener('change',()=>{loadError='';refreshProfile();uiSignature='';update();});
$('open-profiles').addEventListener('click',showProfiles);$('profiles-back').addEventListener('click',()=>showMenu('home'));
$('open-records').addEventListener('click',showRecords);$('records-back').addEventListener('click',()=>showMenu('home'));
$('open-settings').addEventListener('click',()=>settings('home'));$('matchup-settings').addEventListener('click',()=>settings('menu'));$('settings-back').addEventListener('click',()=>showMenu(settingsReturn));
$('use-guest').addEventListener('click',()=>{profiles.useGuest();refreshProfile();showMenu('home');});
$('create-profile').addEventListener('submit',e=>{e.preventDefault();try{profiles.create($('profile-name').value);refreshProfile();showMenu('home');}catch(error){$('profile-error').textContent=error.message;}});
for(const id of ['sensitivity','assistance','difficulty','menu-motion','team','innings','home-team'])$(id).addEventListener('change',()=>{profiles.update({teamId:$('team').value,homeTeamId:$('home-team').value,innings:Number($('innings').value),sensitivity:$('sensitivity').value,assisted:$('assistance').value==='on',difficulty:$('difficulty').value,reducedMotion:$('menu-motion').value==='off'});refreshProfile();uiSignature='';update();});
$('pitch-picker').addEventListener('click',()=>{if(!gameControls(game).pitchesVisible||game.paused)return;pitchPickerOpen=!pitchPickerOpen;update();});
$('pitches').addEventListener('click',e=>{const b=e.target.closest('[data-pitch]');if(b){game.choosePitch(b.dataset.pitch);pitchPickerOpen=false;update();$('pitch-picker').focus();}});for(const b of document.querySelectorAll('[data-base]'))b.addEventListener('click',()=>{if(fieldingPractice.activity)fieldingPractice.throwTo(b.dataset.base);else game.throwTo(b.dataset.base);update();});
$('tag-runner').addEventListener('click',()=>{if(fieldingPractice.activity)fieldingPractice.tagRunner();else game.tagRunner();update();});
function isTextEntry(target){const el=target?.closest?.('input,textarea,[contenteditable]');return !!el&&(el.isContentEditable||el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&['text','search','email','url','tel','password','number'].includes(el.type));}
for(const type of ['contextmenu','selectstart','dragstart'])$('game').addEventListener(type,e=>{if(!isTextEntry(e.target))e.preventDefault();});
function beginDrag(e){if(activity()?(activity().paused||activity().swingAt!==null||!['ready','windup','flight'].includes(activity().phase)):!gameControls(game).aimEnabled)return;const p=renderer.point(e);drag={id:e.pointerId,start:p,aim:{...(activity()??game).aim}};e.currentTarget.setPointerCapture(e.pointerId);}
function moveDrag(e){if(!drag||drag.id!==e.pointerId)return;const p=renderer.point(e),s=Number($('sensitivity').value);(activity()??game).setAim(drag.aim.x+(p.x-drag.start.x)/150*s*(activity()||game.userBatting?1:-1),drag.aim.y-(p.y-drag.start.y)/150*s);}
for(const id of ['field','pad']){$(id).addEventListener('pointerdown',e=>{e.preventDefault();beginDrag(e);});$(id).addEventListener('pointermove',moveDrag);for(const t of ['pointerup','pointercancel'])$(id).addEventListener(t,()=>{drag=null;});}
 $('action').addEventListener('pointerdown',e=>{e.preventDefault();act();});$('action').addEventListener('click',e=>{if(e.detail===0)act();});
document.addEventListener('keydown',e=>{if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)||fieldingPractice.activity)return;if(e.code==='Space'&&!e.repeat&&e.target.tagName!=='BUTTON'){e.preventDefault();act();}if(e.code.startsWith('Arrow')){e.preventDefault();(activity()??game).setAim((activity()??game).aim.x+(e.code==='ArrowRight'?.1:e.code==='ArrowLeft'?-.1:0)*(activity()||game.userBatting?1:-1),(activity()??game).aim.y+(e.code==='ArrowUp'?.1:e.code==='ArrowDown'?-.1:0));}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();last=performance.now();});
function frame(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(fieldingPractice.activity){fieldingPractice.activity.step(dt);draw();update();requestAnimationFrame(frame);return;}if(competitions.activity){competitions.activity.step(dt);draw();update();requestAnimationFrame(frame);return;}if(practice){practice.step(dt);draw();update();requestAnimationFrame(frame);return;}$('replay-tips').hidden=false;if(game.phase==='field')lastField=game.defense;game.step(dt);
 if(game.phase==='flight'&&isExceptionalFastball(game.pitch))effects.play('fastball',{key:'fast-'+game.match.pitchNumber});
 draw();update();effects.step(dt,{paused:game.paused});const effectFrame=effects.frame,reducedMotion=reduceEffects||motionPreference.matches;drawGameEffect($('effects-layer'),effectFrame,{reducedMotion});
 if(!reducedMotion&&game.viewingBatting&&game.phase==='flight'&&isExceptionalFastball(game.pitch))drawPitchSpeedTrail($('effects-layer'),Array.from({length:6},(_,i)=>pitchPosition(game.pitch,Math.max(0,game.elapsed-(5-i)*.012))));
 const announcement=effectFrame?effectFrame.title+'. '+effectFrame.subtitle:'';if(announcement&&announcement!==announcedEffect){$('effect-announcement').textContent=announcement;announcedEffect=announcement;}
 else if(!announcement&&announcedEffect){$('effect-announcement').textContent='';announcedEffect='';}
 requestAnimationFrame(frame);}
renderer.ready.then(()=>{loaded=true;$('start').disabled=false;$('start').textContent='Start '+GAME_FORMATS[Number($('innings').value)];requestAnimationFrame(frame);}).catch(()=>{$('message').textContent='Artwork could not load. Please reopen the app.';$('start').textContent='Unable to load artwork';});
