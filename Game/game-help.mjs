export const PLAY_TIPS={
 batting:{title:'At the plate',steps:['Drag the Aim pad on the left to move the contact cursor.','Tap Swing as the ball arrives. One tap commits your swing.'],note:'Contact help is on by default. Pitch speed stays the same.'},
 pitching:{title:'On the mound',steps:['Choose a pitch on the right. A check marks your selection.','Drag the Aim pad, then tap Pitch to begin the delivery.'],note:'Once you release, watch the play. Pitch and aim controls wait for the next pitch.'},
 fielding:{title:'Make the play',steps:['Fielders move to the ball automatically. Wait until it is secured.','Tap a base on the throwing diamond. ★ marks the suggested target.'],note:'After a throw is received, you may get another chance to throw for a double or triple play.'}
};
export function tipForGame(game){
 if(['menu','review','final'].includes(game.phase))return null;
 return game.phase==='field'?(game.userBatting?null:'fielding'):game.userBatting?'batting':'pitching';
}
export function defenseFeedback(s){
 if(!s)return{possession:'',call:'',tone:''};
 const owner=s.players?.find(p=>p.id===s.ballOwnerId),base={'1B':'1st','2B':'2nd','3B':'3rd',HOME:'home'}[s.target];
 const possession=s.possession!=='free'&&owner?owner.name+' · '+(s.possession==='throwing-hand'?'Transferring ball':s.phase==='gather'?'Securing ball':'Ball in glove'):s.phase==='throw'?'Ball in flight'+(base?' → '+base:''):'Ball in play';
 const call=s.call==='out'?'OUT':s.call==='safe'?'SAFE':s.call==='no-force'?'NO FORCE · TAG REQUIRED':s.call==='homerun'?'HOME RUN':'';
 return{possession,call,tone:s.call==='out'?'out':s.call==='safe'?'safe':'neutral'};
}
