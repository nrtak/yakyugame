import {DEFENSE_SPOTS} from './defense-play.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const PARK_FENCE={distance:330,height:8};
// Distances are feet, time seconds. Outcomes come from flight and interception.
export function createBattedBall(contact,batter){
 const q=clamp(contact.quality??.5,0,1),direction=clamp(contact.direction??(contact.timingMs??0)/140*(batter.bats==='L'?-1:1),-.85,.85);
 const angle=clamp(contact.launchAngle??14-(contact.verticalOffset??0)*50,-12,65),r=angle*Math.PI/180;
 const speed=(48+q*98)*(1+((batter.power??75)-75)*.003),vx=speed*Math.cos(r),vz=speed*Math.sin(r),g=32.174;
 const landingTime=(vz+Math.sqrt(vz*vz+2*g*3))/g,ground=angle<8,rollTime=Math.sqrt((65+q*190)/18);
 const f={quality:q,direction,angle,speed,vx,vz,landingTime,ground,rollTime,rollRange:65+q*190,fence:{...PARK_FENCE}};
 const wallTime=ground?Infinity:(-Math.log(1-f.fence.distance*.14/vx)/.14);
 f.wallTime=Number.isFinite(wallTime)&&wallTime>0&&wallTime<landingTime?wallTime:null;
 f.homeRun=f.wallTime!==null&&3+vz*f.wallTime-.5*g*f.wallTime**2>f.fence.height;
 f.stopTime=ground?rollTime:Math.min(landingTime,f.wallTime??Infinity)+1.5;
 return f;
}
export function battedBallAt(f,time){
 const t=Math.max(0,time);let distance,z;
 if(f.ground){const q=clamp(t/f.rollTime,0,1);distance=f.rollRange*(2*q-q*q);z=Math.abs(Math.sin(q*Math.PI*5))*.65*(1-q);}
 else{const air=Math.min(t,f.landingTime,f.homeRun?Infinity:f.wallTime??Infinity);distance=f.vx/.14*(1-Math.exp(-.14*air));z=Math.max(0,3+f.vz*air-.5*32.174*air**2);
  if(!f.homeRun&&f.wallTime!==null&&t>=f.wallTime){distance=f.fence.distance-Math.min(12,(t-f.wallTime)*8);z=Math.max(0,z-(t-f.wallTime)*12);}
  else if(t>f.landingTime){distance+=Math.min(35,(t-f.landingTime)*20);z=Math.abs(Math.sin((t-f.landingTime)*7))*.4*Math.max(0,1-(t-f.landingTime)/1.5);}
 }
 distance=Math.min(f.homeRun?450:f.fence.distance,distance);const a=f.direction*Math.PI/4;
 return{x:Math.sin(a)*distance,y:Math.cos(a)*distance,z};
}
export function planInterception(f,players){
 if(f.homeRun)return {homeRun:true,time:f.wallTime,point:battedBallAt(f,f.wallTime)};
 for(let t=.2;t<f.stopTime+20;t+=.02){const point=battedBallAt(f,t);if(point.z>8)continue;
  const eligible=players.map(p=>({p,d:Math.hypot(DEFENSE_SPOTS[p.position].x-point.x,DEFENSE_SPOTS[p.position].y-point.y)})).filter(x=>x.d<=Math.max(0,t-.16)*24);
  if(eligible.length){eligible.sort((a,b)=>a.d-b.d);return{fielderId:eligible[0].p.id,time:t,point,airCatch:!f.ground&&t<f.landingTime&&(f.wallTime===null||t<f.wallTime)};}
 }
 throw Error('Unable to field batted ball');
}
