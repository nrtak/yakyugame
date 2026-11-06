import {matchTeams} from './match-engine.mjs';
import {playerById} from './rosters.mjs';

export function occupiedBases(match){
 const labels=['first','second','third'];
 return match.bases.map((id,i)=>({base:i+1,id,name:id?playerById(id).name:null,label:labels[i]}));
}
export function baseDescription(match,{inPlay=false}={}){
 const runners=occupiedBases(match).filter(b=>b.id);
 return (inPlay?'At the start of this play: ':'')+(runners.length?runners.map(b=>b.name+' on '+b.label).join(', '):'Bases empty');
}
export function lineScoreRows(match){
 return matchTeams(match).map((team,side)=>({team:team.name,short:team.short,innings:[...match.lineScore[side]],runs:match.score[side],hits:match.hits[side]}));
}
export function renderMatchCount(element,game){
 const m=game.match,field=game.phase==='field'||game.phase==='steal',outs=game.phase==='review'&&game.event?.halfEnded?3:m.outs+(field?game.defense?.playOuts??0:0);
 const count=`B ${m.balls} · S ${m.strikes} · O ${outs}`,description=baseDescription(m,{inPlay:field});
 const document=element.ownerDocument,text=document.createElement('span'),diamond=document.createElement('span');
 text.textContent=count;diamond.className='base-diamond';diamond.setAttribute('role','img');diamond.setAttribute('aria-label',description);diamond.title=description;
 for(const b of occupiedBases(m)){const bag=document.createElement('i');bag.className='score-base base-'+b.base;bag.classList.toggle('occupied',!!b.id);bag.setAttribute('aria-hidden','true');diamond.append(bag);}
 const home=document.createElement('i');home.className='score-home';home.setAttribute('aria-hidden','true');diamond.append(home);
 element.replaceChildren(text,diamond);
}
export function renderLineScore(element,match){
 const document=element.ownerDocument,table=document.createElement('table'),caption=document.createElement('caption'),head=document.createElement('thead'),header=document.createElement('tr'),body=document.createElement('tbody');
 caption.textContent='Final score by inning';table.append(caption);
 for(const title of ['Team',...Array.from({length:match.innings},(_,i)=>String(i+1)),'R','H']){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}
 head.append(header);table.append(head);
 for(const row of lineScoreRows(match)){const tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=row.short;name.title=row.team;tr.append(name);
  for(const value of [...row.innings,row.runs,row.hits]){const td=document.createElement('td');td.textContent=value===null?'—':String(value);if(value===null){td.setAttribute('aria-label','Not played');td.title='Not played';}tr.append(td);}body.append(tr);
 }
 table.append(body);element.replaceChildren(table);
}
