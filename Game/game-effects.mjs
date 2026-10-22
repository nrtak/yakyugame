export const GAME_EFFECTS={
 single:{title:'SINGLE',subtitle:'A base hit!',color:'#55c1a0',duration:1.25,bases:1},
 double:{title:'DOUBLE',subtitle:'Into scoring position!',color:'#5aa9e9',duration:1.4,bases:2},
 triple:{title:'TRIPLE',subtitle:'All the way to third!',color:'#a38be7',duration:1.5,bases:3},
 homerun:{title:'HOME RUN!',subtitle:'Around the bases!',color:'#ffc75c',duration:1.8,bases:4,burst:true},
 groundRuleDouble:{title:'GROUND-RULE DOUBLE',subtitle:'Two bases awarded',color:'#5aa9e9',duration:1.6,bases:2},
 strikeout:{title:'STRIKEOUT',subtitle:'Three strikes!',color:'#6eaee1',duration:1.15,stamp:'K'},
 doubleplay:{title:'DOUBLE PLAY!',subtitle:'Two outs on one play',color:'#4fc7ab',duration:1.5,stamp:'2'},
 tripleplay:{title:'TRIPLE PLAY!',subtitle:'Three outs on one play',color:'#ffc75c',duration:1.8,stamp:'3',burst:true},
 inning:{title:'CHANGE SIDES',subtitle:'A new half inning',color:'#80b9dc',duration:1},
 start:{title:'PLAY BALL!',subtitle:'Coral Club vs. Navy Stars',color:'#ff8776',duration:.7},
 end:{title:'FINAL',subtitle:'Thanks for playing!',color:'#ffc75c',duration:1.6,burst:true},
 fastball:{title:'HEAT!',subtitle:'Exceptional fastball',color:'#ff9b62',duration:.7,compact:true,speed:true},
 divingCatch:{title:'DIVING CATCH!',subtitle:'What a play!',color:'#78d1ba',duration:1.5,speed:true},
 crowd:{title:"LET’S GO!",subtitle:'The crowd is cheering',color:'#ffb096',duration:1.1,compact:true}
};
export function effectForEvent(event){
 if(!event)return null;
 if(['doubleplay','tripleplay'].includes(event.playType))return event.playType;
 if(event.kind==='double'&&event.groundRule===true)return 'groundRuleDouble';
 if(event.kind==='flyout'&&event.diving===true)return 'divingCatch';
 return ['single','double','triple','homerun','strikeout'].includes(event.kind)?event.kind:null;
}
export function isExceptionalFastball(pitch){return pitch?.kind==='fast'&&Number.isFinite(pitch.duration)&&pitch.duration>0&&pitch.duration<=1;}
export class GameEffects{
 constructor(){this.clear();}
 clear(){this.current=null;this.queue=[];this.time=0;this.seen=new Set();}
 play(kind,options={}){
  if(!GAME_EFFECTS[kind])throw Error('Unknown game effect');
  if(options.key&&this.seen.has(options.key))return false;
  if(options.key)this.seen.add(options.key);
  // Bound memory even in a longer match. Keys only guard recent presentation.
  if(this.seen.size>128)this.seen.delete(this.seen.values().next().value);
  const effect={kind,...GAME_EFFECTS[kind],...options};
  if(!this.current){this.current=effect;this.time=0;}else if(this.queue.length<3)this.queue.push(effect);
  return true;
 }
 step(dt,{paused=false}={}){
  if(!Number.isFinite(dt)||dt<0)throw Error('Invalid animation time');
  if(paused||!this.current)return;
  this.time+=dt;
  while(this.current&&this.time>=this.current.duration){this.time-=this.current.duration;this.current=this.queue.shift()??null;}
 }
 get frame(){if(!this.current)return null;return{...this.current,progress:Math.min(1,this.time/this.current.duration),elapsed:this.time};}
}
const clamp=v=>Math.max(0,Math.min(1,v));
export function drawGameEffect(canvas,frame,{reducedMotion=false}={}){
 const c=canvas.getContext('2d');c.clearRect(0,0,1600,960);if(!frame)return;
 const q=frame.progress,fade=clamp(q/.12)*clamp((1-q)/.16),compact=frame.compact;
 const settle=1-(1-clamp(q/.2))**3,scale=reducedMotion?1:.88+.12*settle;
 const x=compact?1260:800,y=compact?205:260,w=compact?470:frame.title.length>16?1090:900,h=compact?130:170;
 c.save();c.globalAlpha=fade;c.translate(x,y);c.scale(scale,scale);
 if(!reducedMotion&&frame.burst){
  for(let i=0;i<14;i++){const angle=i*Math.PI/7-.8,d=130+frame.elapsed*75;c.save();c.rotate(angle);c.fillStyle=i%2?'#fff3bd':'#ffc75c';c.globalAlpha=fade*.8;c.fillRect(d,-4,24,8);c.restore();}
 }
 if(frame.speed&&!reducedMotion){c.strokeStyle=frame.color;c.lineWidth=5;for(let i=0;i<5;i++){const dx=((frame.elapsed*700+i*91)%500)-250;c.beginPath();c.moveTo(dx-230,-65+i*25);c.lineTo(dx-130,-65+i*25);c.stroke();}}
 c.shadowColor='#0a273973';c.shadowBlur=18;c.shadowOffsetY=7;
 c.beginPath();c.moveTo(-w/2+18,-h/2);c.lineTo(w/2,-h/2);c.lineTo(w/2-18,h/2);c.lineTo(-w/2,h/2);c.closePath();c.fillStyle='#173e5af5';c.fill();c.shadowBlur=0;c.shadowOffsetY=0;
 c.strokeStyle=frame.color;c.lineWidth=4;c.stroke();c.fillStyle=frame.color;c.fillRect(-w/2+26,-h/2+18,7,h-36);
 c.textAlign='center';c.textBaseline='middle';c.font=`italic 900 ${compact?44:frame.title.length>16?48:64}px system-ui`;c.lineWidth=3;c.strokeStyle='#0b283b';c.strokeText(frame.title,0,-13,w-90);c.fillStyle='#fffdf0';c.fillText(frame.title,0,-13,w-90);
 c.font=`700 ${compact?18:23}px system-ui`;c.fillStyle=frame.color;c.fillText(frame.subtitle,0,compact?35:42,w-90);
 if(frame.bases){
  const active=Math.min(4,Math.floor(q*5)+1),r=15;
  for(let n=0;n<4;n++){const at=[[-w/2+72,4],[-w/2+91,-15],[-w/2+72,-34],[-w/2+53,-15]][n];c.save();c.translate(...at);c.rotate(Math.PI/4);c.fillStyle=n<frame.bases&&(reducedMotion||n<active)?frame.color:'#567080';c.fillRect(-r/2,-r/2,r,r);c.restore();}
 }
 if(frame.stamp){c.font='900 30px system-ui';c.fillStyle=frame.color;c.fillText(frame.stamp,w/2-54,4);}
 c.restore();
}
export function drawPitchSpeedTrail(canvas,points){
 if(points.length<2)return;const c=canvas.getContext('2d');c.save();c.lineCap='round';
 for(let i=1;i<points.length;i++){c.globalAlpha=i/points.length*.55;c.strokeStyle=i%2?'#ffbe73':'#fff2bb';c.lineWidth=2+i;c.beginPath();c.moveTo(points[i-1].x,points[i-1].y);c.lineTo(points[i].x,points[i].y);c.stroke();}
 c.restore();
}
