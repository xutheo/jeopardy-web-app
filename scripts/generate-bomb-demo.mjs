import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const dir='artifacts/bomb-demo-frames';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:720,height:460},deviceScaleFactor:1});
await page.setContent(`<!doctype html><html><head><style>
*{box-sizing:border-box}body{margin:0;background:#101c29;color:#edf0e9;font-family:Arial,sans-serif;padding:18px}#module{position:relative;border:4px ridge #87949c;border-radius:18px;background:linear-gradient(140deg,#34424c,#14202a);padding:18px 24px;height:350px}.head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-size:19px;font-weight:bold;letter-spacing:1px}.led{display:inline-block;width:12px;height:12px;background:#f8b35a;border-radius:50%;margin-right:10px}#mistakes{font-size:16px;color:#e8b591}.row{position:relative;background:#0a141c88;border:1px solid #637783;border-radius:10px;margin:10px 0;height:116px;padding:12px 16px}.label{font-size:18px;font-weight:bold}.state{float:right;font-size:16px}.row svg{position:absolute;left:15px;top:34px;width:590px;height:72px}.terminal{fill:#9da7ac;stroke:#3b474f;stroke-width:4}.cable{fill:none;stroke-width:11;stroke-linecap:round}.shadow{fill:none;stroke:#0008;stroke-width:17;stroke-linecap:round}#caption{text-align:center;font-size:24px;font-weight:bold;margin:14px 0 5px}#note{text-align:center;color:#b7c6cd;font-size:17px;margin:0}.success{color:#8ce3a9}.error{color:#ff8585}#hand{position:absolute;width:46px;height:56px;z-index:5;filter:drop-shadow(0 3px 3px #0008)}#module.wrong{border-color:#ff665f;background:linear-gradient(140deg,#593034,#291a20)}.wrong #red{border-color:#ff6f6f}.cut{border-color:#64b38a;background:#193e2f55}
</style></head><body><div id="module"><div class="head"><span><i class="led"></i>WIRE MODULE</span><span id="mistakes">0 mistakes</span></div><div class="row" id="blue"><span class="label">Blue ●</span><span class="state" id="blueState">Cut wire</span><svg viewBox="0 0 600 80"><rect class="terminal" x="5" y="22" width="28" height="32" rx="5"/><rect class="terminal" x="567" y="22" width="28" height="32" rx="5"/><path id="blueWire" class="cable" stroke="#78b4f5"/></svg></div><div class="row" id="red"><span class="label">Red ★</span><span class="state" id="redState">Cut wire</span><svg viewBox="0 0 600 80"><rect class="terminal" x="5" y="22" width="28" height="32" rx="5"/><rect class="terminal" x="567" y="22" width="28" height="32" rx="5"/><path class="cable" stroke="#ed7777" d="M25 38 C130 38 150 0 245 28 S435 70 485 42 Q530 30 580 38"/></svg></div><svg id="hand" viewBox="0 0 46 56"><path d="M14 29V7c0-7 9-7 9 0v17c0-6 8-6 8 0v3c1-5 8-4 8 1v12c0 8-5 12-9 14H17c-5-5-7-8-9-13L2 31c-3-6 4-10 8-5l4 5z" fill="#fff4dd" stroke="#16222c" stroke-width="2.5"/></svg></div><p id="caption"></p><p id="note"></p></body></html>`);
for(let frame=0;frame<72;frame++) {
 await page.evaluate(f=>{
  const get=id=>document.getElementById(id), correct=f>=18, wrong=f>=45, flash=f>=45&&f<55;
  get('blueWire').setAttribute('d',correct?'M25 38 C130 38 150 0 245 28 L278 18 M322 60 C400 78 445 61 485 42 Q530 30 580 38':'M25 38 C130 38 150 0 245 28 S435 70 485 42 Q530 30 580 38');
  get('blue').className='row'+(correct?' cut':'');get('blueState').textContent=correct?'CUT ✓':'Cut wire';get('blueState').style.color=correct?'#8ce3a9':'';
  get('module').classList.toggle('wrong',flash);get('module').style.transform=flash?'translateX('+((f%2?1:-1)*6)+'px)':'none';
  get('mistakes').textContent=wrong?'1 mistake':'0 mistakes';get('redState').textContent=flash?'LOCKED · 1s':'Cut wire';
  const progress=Math.min(1,Math.max(0,(f-5)/10));let x=480-180*progress,y=280-158*progress;
  if(f>=30){const p=Math.min(1,(f-30)/12);x=300;y=122+126*p;}
  get('hand').style.left=x+'px';get('hand').style.top=y+'px';get('hand').style.transform=(f===18||f===45)?'scale(.85)':'none';
  get('caption').textContent=wrong?'Incorrect cut — 1 mistake':correct?'Correct cut — wire disconnected':'Follow your team’s clues';get('caption').className=wrong?'error':correct?'success':'';
  get('note').textContent=wrong?'The wire stays intact. Cutting locks for one second.':correct?'Correct cuts stay completed.':'Example only — each puzzle has its own wire order.';
 },frame);
 await page.screenshot({path:dir+'/'+String(frame).padStart(3,'0')+'.png'});
}
await browser.close();
