// Elevated ground-ball play. Rendering and first-base adjudication share this clock.
export const FIELD_CUT_TIME=.14;
export const FIELD_PLAY_DURATION=6.2;
export const FIRST_BASE={x:1238,y:495};
export const RUNNER_ARRIVAL=4.45;
export function firstBaseCall({catchTime,runnerTime,bagTouchTime=0,controlled=true}){
 return controlled&&Math.max(catchTime,bagTouchTime)<runnerTime-1e-8?'out':'safe';
}
export const FIELD_GLOVE_OFFSET={x:.575,y:2.3};
export const FIELD_LOAD_OFFSET={x:-39.1,y:-78.2};
export const FIELD_RELEASE_OFFSET={x:5.75,y:-56.35};
export const FIELD_RECEIVE_OFFSET={x:-40.825,y:-38.525};
const fieldClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fieldMix=(a,b,t)=>a+(b-a)*t;
const fieldLerp=(a,b,t)=>({x:fieldMix(a.x,b.x,t),y:fieldMix(a.y,b.y,t)});
export function usesFieldView(s){return (s.phase==='hit'||s.phase==='camera-review')&&s.clock>=FIELD_CUT_TIME;}
export function fieldPlay(s){
 if(s.result?.flyBall)return flyPlay(s);
 // The roster-correct slice currently supports Ken (SS) to Sora (1B).
 const direction=-.5+fieldClamp(-(s.result?.timingMs??0)/150,-1,1)*.15;
 const destination={x:768+direction*400,y:Math.abs(direction)<.15?540:435};
 const position='SS';
 const origins={P:[768,520],'3B':[370,400],SS:[600,345],'2B':[930,345],'1B':[1190,400]};
 const t=Math.max(0,s.clock-FIELD_CUT_TIME),travel=s.result?.slowGrounder?3.55:2.05,releaseTime=travel+.65;
 const q=fieldClamp(t/travel,0,1),run=fieldClamp((t-.16)/(travel-.5),0,1);
 const [ox,oy]=origins[position];
 const fielder={x:fieldMix(ox,destination.x-FIELD_GLOVE_OFFSET.x,run),y:fieldMix(oy,destination.y-FIELD_GLOVE_OFFSET.y,run)};
 const receiverTarget={x:1240,y:498};
 const cover=1;
 const receiver={...receiverTarget};
 const receivingGlove={x:receiverTarget.x+FIELD_RECEIVE_OFFSET.x,y:receiverTarget.y+FIELD_RECEIVE_OFFSET.y};
 const loadingHand={x:fielder.x+FIELD_LOAD_OFFSET.x,y:fielder.y+FIELD_LOAD_OFFSET.y};
 const releasingHand={x:fielder.x+FIELD_RELEASE_OFFSET.x,y:fielder.y+FIELD_RELEASE_OFFSET.y};
 const throwDuration=Math.max(.65,Math.hypot(receivingGlove.x-releasingHand.x,receivingGlove.y-releasingHand.y)/520);
 const catchTime=releaseTime+throwDuration;
 let ground=fieldLerp({x:768,y:870},destination,q);
 let ball={x:ground.x,y:ground.y-Math.abs(Math.sin(q*Math.PI*4))*12*(1-q)};
 let possession='free',stage='FIELDING';
 if(t>=travel&&t<releaseTime){
  const transfer=fieldClamp((t-travel-.25)/.4,0,1);
  ball=t<travel+.45?fieldLerp(destination,loadingHand,fieldClamp((t-travel-.25)/.2,0,1)):fieldLerp(loadingHand,releasingHand,fieldClamp((t-travel-.45)/.2,0,1));possession=transfer===0?'fielding-glove':'throwing-hand';stage=transfer===0?'BALL IN GLOVE':'TRANSFER';
 }else if(t>=releaseTime){
  const u=fieldClamp((t-releaseTime)/throwDuration,0,1);
  ball=fieldLerp(releasingHand,receivingGlove,u);ball.y-=Math.sin(u*Math.PI)*28;
  ground={x:ball.x,y:ball.y+50};stage=u<1?'THROW TO FIRST':'BALL IN GLOVE';
  if(u===1)possession='receiving-glove';
 }
 const runnerProgress=t<=RUNNER_ARRIVAL?fieldClamp(t/RUNNER_ARRIVAL,0,1):1+.12*Math.sin(fieldClamp((t-RUNNER_ARRIVAL)/1.1,0,1)*Math.PI/2);
 const runner=fieldLerp({x:768,y:870},FIRST_BASE,runnerProgress);
 const outcome=firstBaseCall({catchTime,runnerTime:RUNNER_ARRIVAL});
 const callTime=outcome==='out'?catchTime:RUNNER_ARRIVAL;
 const call=t>=callTime?outcome:null;
 // Follow the batted ball; then follow the throw, holding on the receiving glove.
 const look=fieldClamp((t-.2)/1.4,0,1)*.3;
 const pickupCenter={x:fieldMix(destination.x,destination.x,look),y:destination.y-65};
 let center={x:fieldMix(ground.x,destination.x,look),y:fieldMix(ground.y-65,destination.y-65,look)};
 if(t>=travel)center=pickupCenter;
 if(t>=releaseTime){const u=fieldClamp((t-releaseTime)/throwDuration,0,1);const smooth=u*u*(3-2*u);center=fieldLerp(pickupCenter,{x:receivingGlove.x,y:receiverTarget.y-30},smooth);}
 const camera={x:fieldClamp(center.x-320,0,1536-640),y:fieldClamp(center.y-192,0,1024-384),width:640,height:384};
 return {direction,position,t,q,fielder,receiver,receiverReady:cover===1,receiverRole:'1B',fielderId:'navy-stars-ken',receiverId:'navy-stars-sora',runnerId:'coral-club-emma',runner,runnerProgress,runnerStopped:t>=RUNNER_ARRIVAL+1.1,runnerTime:RUNNER_ARRIVAL,outcome,call,callTime,ground,ball,camera,gathering:run>=1,collected:t>=travel,possession,stage,releaseTime,catchTime,throwing:t>=travel+.25,releasing:t>=travel+.45,received:t>=catchTime};
}
export function flyPlay(s){
 const t=Math.max(0,s.clock-FIELD_CUT_TIME),fielder={x:770,y:200},receiver={x:1240,y:498};
 const glove={x:777.475,y:101.1},load={x:788.4,y:116.625},release={x:757.925,y:150.55};
 const receive={x:receiver.x+FIELD_RECEIVE_OFFSET.x,y:receiver.y+FIELD_RECEIVE_OFFSET.y};
 const catchTime=3,releaseTime=3.7,returnCatchTime=5.05,q=fieldClamp(t/catchTime,0,1);
 const ground=fieldLerp({x:768,y:870},fielder,q);
 let ball=fieldLerp({x:768,y:870},glove,q);ball.y-=Math.sin(q*Math.PI)*130;
 let possession='free',stage='TRACKING FLY',flyPose=0;
 if(t>=3&&t<3.3){ball={...glove};possession='fielding-glove';stage='CAUGHT';}
 else if(t>=3.3&&t<releaseTime){flyPose=1;ball=t<3.5?fieldLerp(glove,load,(t-3.3)/.2):fieldLerp(load,release,(t-3.5)/.2);possession='throwing-hand';stage='RETURN THROW';}
 else if(t>=releaseTime){flyPose=2;const u=fieldClamp((t-releaseTime)/(returnCatchTime-releaseTime),0,1);ball=fieldLerp(release,receive,u);ball.y-=Math.sin(Math.PI*u)*25;stage=u<1?'RETURN THROW':'BALL IN GLOVE';if(u===1)possession='receiving-glove';}
 const camera={x:fieldClamp(ball.x-320,0,896),y:fieldClamp(ball.y-150,0,640),width:640,height:384};
 return {flyBall:true,flyPose,direction:0,position:'CF',t,q,fielder,receiver,fielderId:'navy-stars-mia',receiverId:'navy-stars-sora',receiverRole:'1B',receiverReady:true,ground,ball,camera,collected:t>=3,possession,stage,catchTime,releaseTime,received:t>=returnCatchTime,call:t>=3?'out':null,outcome:'out',callTime:3};
}
export function fieldToScreen(point,camera){return{x:(point.x-camera.x)*1600/camera.width,y:(point.y-camera.y)*960/camera.height};}
