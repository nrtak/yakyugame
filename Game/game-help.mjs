export const PLAY_TIPS={
 batting:{title:'At the plate',steps:['Drag the Aim pad on the left to move the contact cursor.','Tap Swing as the ball arrives. One tap commits your swing.','With a runner on base, choose Steal or Hold before the pitch. A queued steal can be canceled before the next delivery starts.'],note:'Contact help is on by default. Pitch speed stays the same.'},
 pitching:{title:'On the mound',steps:['Choose a pitch on the right. A check marks your selection.','Drag the Aim pad, then tap Pitch to begin the delivery.'],note:'Once you release, watch the play. Pitch and aim controls wait for the next pitch.'},
 fielding:{title:'Make the play',steps:['Use the Move pad to guide the ringed fielder to the ball target. Other players cover the bases automatically.','Slide or Dive gives extra reach. Allow the player to recover before moving or throwing again.','Once the ball is secured, tap a base on the field to throw. Gold marks the suggested play.','If Tag Runner appears, tap it to prepare the tag and wait for the runner.'],note:'Get under a fly ball before it lands to make the catch. You can throw again after a receiver controls the ball.'}
};
export function tipForGame(game){
 if(['menu','review','final','steal'].includes(game.phase))return null;
 return game.phase==='field'?(game.userBatting?null:'fielding'):game.userBatting?'batting':'pitching';
}
export function defenseFeedback(s){
 if(!s)return{possession:'',call:'',tone:''};
 const owner=s.players?.find(p=>p.id===s.ballOwnerId),base={'1B':'1st','2B':'2nd','3B':'3rd',HOME:'home'}[s.target];
 const possession=s.possession!=='free'&&owner?owner.name+' · '+(s.phase==='tag-ready'?'Ready to tag':s.phase==='tag'?'Tag made':s.possession==='throwing-hand'?'Transferring ball':s.phase==='gather'?'Securing ball':'Ball in glove'):s.phase==='throw'?'Ball in flight'+(base?' → '+base:''):'Ball in play';
 const call=s.call==='out'?(s.callKind==='tag'?'TAG OUT':'OUT'):s.call==='safe'?'SAFE':s.call==='no-force'?'NO FORCE · TAG REQUIRED':s.call==='homerun'?'HOME RUN':'';
 return{possession,call,tone:s.call==='out'?'out':s.call==='safe'?'safe':'neutral'};
}
