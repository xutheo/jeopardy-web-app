import React, { useLayoutEffect, useRef, useState } from 'react';
import type { View } from '../shared/model';
export function IntroControls({ v,send,disabled }: { v:View;send:(type:string,payload?:unknown)=>Promise<boolean>;disabled:boolean }) {
 const i=v.introCategory!,category=v.boards[v.board][i];
 return <section className="question-card category-intro-host"><span className="eyebrow">BOARD {v.board+1} · CATEGORY {i+1} OF 5</span><h2>{category.title}</h2><p>{category.description || 'No category description added.'}</p><button className="primary" disabled={disabled} onClick={()=>void send('next-category')}>{i===4?'Show board':'Next category'}</button></section>;
}
export function StreamIntro({ v }: {v:View}) {
 const incoming=v.phase==='board'&&!v.current?v.introCategory??null:null;
 const [shown,setShown]=useState(incoming),panel=useRef<HTMLDivElement>(null),lastBoard=useRef(v.board);
 useLayoutEffect(()=>{
  if(lastBoard.current!==v.board){lastBoard.current=v.board;setShown(incoming);return;}
  if(shown===incoming)return;
  const el=panel.current,target=el?.parentElement?.querySelectorAll('.stream-column h2')[shown??0];
  if(shown===null||!el||!target||matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(incoming);return;}
  const from=el.getBoundingClientRect(),to=target.getBoundingClientRect();
  // Animate the title separately from the panel so its font lands at the
  // header's actual size instead of inheriting the panel's nonuniform scale.
  const heading=el.querySelector('h1')!, headingBox=heading.getBoundingClientRect();
  const startText=getComputedStyle(heading),endText=getComputedStyle(target);
  const title=document.createElement('div');title.className='intro-flying-title';title.textContent=heading.textContent;
  Object.assign(title.style,{position:'fixed',zIndex:'8',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',boxSizing:'border-box',pointerEvents:'none',color:endText.color,fontFamily:endText.fontFamily,fontWeight:endText.fontWeight,letterSpacing:endText.letterSpacing,overflowWrap:endText.overflowWrap});
  el.parentElement!.appendChild(title);heading.style.visibility='hidden';
  const titleAnimation=title.animate([
    {left:headingBox.x+'px',top:headingBox.y+'px',width:headingBox.width+'px',height:headingBox.height+'px',fontSize:startText.fontSize,lineHeight:startText.lineHeight,padding:'0px'},
    {left:to.x+'px',top:to.y+'px',width:to.width+'px',height:to.height+'px',fontSize:endText.fontSize,lineHeight:endText.lineHeight,padding:endText.padding}
  ],{duration:650,easing:'ease-in-out',fill:'both'});
  el.classList.add('minimizing');
  const animation=el.animate([{transform:'none',opacity:1},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:1}],{duration:650,easing:'ease-in-out',fill:'forwards'});
  animation.finished.then(()=>{el.style.visibility='hidden';title.remove();}).catch(()=>{});
  const tileAnimations = Array.from(target.parentElement!.querySelectorAll<HTMLElement>('.stream-tile')).map((tile,row) => {
    const spot=tile.getBoundingClientRect(); tile.style.zIndex='6';
    return tile.animate([
      { transform: 'translate('+(from.x+from.width/2-spot.x-spot.width/2)+'px,'+(from.y+from.height/2-spot.y-spot.height/2)+'px) scale(.35)', opacity:0 },
      { transform:'none', opacity:1 }
    ],{ duration:500, delay:100+row*70, easing:'cubic-bezier(.2,.7,.2,1)', fill:'both' });
  });
  let cancelled=false;Promise.all([animation.finished,...tileAnimations.map(a=>a.finished)]).then(()=>{if(!cancelled)setShown(incoming);}).catch(()=>{});
  return ()=>{cancelled=true;animation.cancel();titleAnimation.cancel();title.remove();heading.style.visibility='';tileAnimations.forEach(a=>a.cancel());target.parentElement?.querySelectorAll<HTMLElement>('.stream-tile').forEach(tile=>{tile.style.zIndex='';});el.style.visibility='';el.classList.remove('minimizing');};
 },[incoming,shown,v.board]);
 if(shown===null)return null;
 const cat=v.boards[v.board][shown];
 return <div className="stream-category-intro" ref={panel} key={v.board+'-'+shown}><span>BOARD {v.board+1} · CATEGORY {shown+1} OF 5</span><h1>{cat.title}</h1><p>{cat.description}</p></div>;
}
