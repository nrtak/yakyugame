const BASE_NAMES={'1B':'1st base','2B':'2nd base','3B':'3rd base',HOME:'home plate'};
export function defensiveControlGuide(s){
 const selected=s?.players?.find(p=>p.id===s.activeFielderId),owner=s?.players?.find(p=>p.id===s.ballOwnerId);
 const ballStatus=s?.phase==='gather'?'FIELDING':s?.phase==='transfer'?'TRANSFERRING':'BALL SECURED';
 const heading=s?.moveEnabled&&selected?'YOU · '+selected.name+' · '+selected.position:owner?owner.name+' · '+ballStatus:'DEFENSE';
 const hint=s?.tagPending?'Tag ready · Wait for the runner':s?.canTag?'Tap TAG RUNNER to make the out':s?.canThrow?'Tap a base to throw · Gold is suggested':s?.moveEnabled?s?.canFieldAction===false?'Recovering · Movement returns shortly':'Move to the gold target · Slide or Dive for extra reach':s?.phase==='throw'?'Throw on the way · Receiver takes over':s?.phase==='gather'||s?.phase==='transfer'?'Securing the ball · Throw targets appear next':'Watch the ball · Players are covering the bases';
 return{heading,hint};
}
export function gameControls(game){
 const phase=game.phase,field=phase==='field'||phase==='steal',batting=game.userBatting,review=phase==='review',playing=!['menu','final'].includes(phase);
 const actionVisible=playing&&!field&&!review;
 const actionEnabled=actionVisible&&!game.paused&&(batting?phase==='flight'&&game.swingAt===null:phase==='pitch-ready');
 const aimEnabled=actionVisible&&!game.paused&&game.swingAt===null&&(batting?['windup','flight'].includes(phase):phase==='pitch-ready');
 const guide=defensiveControlGuide(game.defense);
 return{
  paused:!!game.paused,
  heading:phase==='steal'?'STEAL ATTEMPT':field?(batting?'RUNNERS ADVANCING':guide.heading):review?'PLAY COMPLETE':batting?'BATTING':'PITCHING',
  hint:field?(game.userBatting?'Your runners advance automatically':guide.hint):review?(game.atBat?.userBatting?'The pitcher is getting ready for the next pitch':'Continue when you’re ready'):batting?(game.swingAt!==null?'Swing committed · Watch the play':phase==='flight'?'Tap Swing as the ball arrives':'Aim now · Swing when the ball arrives'):phase==='pitch-ready'?'Choose a pitch · Drag Aim · Tap Pitch':'Pitch in progress · Watch the batter',
  actionVisible,actionEnabled,actionLabel:batting?'SWING':'PITCH',
  actionDetail:batting?(game.swingAt!==null?'SWUNG':phase==='flight'?'TAP NOW':'GET READY'):phase==='pitch-ready'?'TAP TO THROW':phase==='windup'?'WINDUP':phase==='contact'?'IN PLAY':'IN FLIGHT',
  aimVisible:actionVisible,aimEnabled,pitchesVisible:!batting&&phase==='pitch-ready',throwsVisible:field&&!batting&&!!game.defense?.canThrow,
  moveVisible:field&&!batting&&!!game.defense?.moveEnabled,moveEnabled:field&&!batting&&!game.paused&&!!game.defense?.moveEnabled,
  fieldActionVisible:field&&!batting&&!!game.defense?.moveEnabled,fieldActionEnabled:field&&!batting&&!game.paused&&!!game.defense?.canFieldAction,fieldActionLabel:game.defense?.moveEnabled&&!game.defense?.canFieldAction?'RECOVER':game.defense?.fieldActionLabel??'DIVE',
  tagVisible:field&&!batting&&!!(game.defense?.canTag||game.defense?.tagPending),tagEnabled:field&&!batting&&!game.paused&&!!game.defense?.canTag,tagLabel:game.defense?.tagPending?'READY TO TAG':'TAG RUNNER',
  bases:['2B','3B','1B','HOME'].map(base=>{const option=game.defense?.throwOptions?.find(o=>o.base===base),enabled=field&&!batting&&!game.paused&&!!game.defense?.canThrow&&option?.available!==false;
   return{base,label:base==='HOME'?'HOME':base.slice(0,1)+({1:'ST',2:'ND',3:'RD'}[base[0]]),enabled,recommended:enabled&&game.defense?.recommendation===base,
    detail:!game.defense?.canThrow?'Wait for ball':option?.available===false?'Already here':option?.force?(option.out?'Force out':'Runner ahead'):option?.tagRequired?'Tag needed':option?'No force':'Throw',
    ariaLabel:option?.available===false?'Ball already at '+BASE_NAMES[base]:'Throw to '+BASE_NAMES[base]+(enabled&&game.defense?.recommendation===base?', suggested target':'')+(option?.force?(option.out?', force out available':', runner ahead'):option?.tagRequired?', tag required':option?', no force':'')};
  })
 };
}
