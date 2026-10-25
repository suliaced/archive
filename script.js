/* ============ EDIT HERE ============
   TO ADD A PERSON: copy one whole person({ ... }), paste it before the last ],
   and change the values. Stats go from 0 to 10.
   id = the start of their drawing file names: img/<id>-1.png and img/<id>-2.png
   desc = the small description (leave "" for an empty box)
   ms = optional flip speed for this person only (lower = faster) */
const FRAME_MS = 550;  /* default flip speed for everyone, in milliseconds */
const person = p => ({
  name:p.name, code:p.code, nick:p.nick, desc:p.desc||"", ms:p.ms||FRAME_MS,
  frames:["img/"+p.id+"-1.png","img/"+p.id+"-2.png"],
  physical:[p.speed,p.strength,p.durability,p.height,p.stamina,p.precision].map(v=>v||0),
  mental:[p.cognition,p.social,p.adaptability,p.creativity,p.composure,p.perception].map(v=>v||0)
});
const FILES = [
  person({
    name:"Sample One", code:"S-01", nick:"The First", id:"sample-one",
    speed:10, strength:7, durability:8, height:10, stamina:8, precision:2,
    cognition:6, social:7, adaptability:8, creativity:10, composure:4, perception:9,
    desc:"The first. He has seen everything."
  }),
  person({
    name:"Sample Two", code:"S-02", nick:"The Second", id:"sample-two",
    speed:3, strength:8, durability:7, height:9, stamina:6, precision:2,
    cognition:9, social:4, adaptability:5, creativity:8, composure:7, perception:6,
    desc:"The Second. He aint really seen much."
  }),
];
/* =================================== */
const PHYS=["Speed","Strength","Durability","Height","Stamina","Precision"];
const MENT=["Cognition","Social","Adaptability","Creativity","Composure","Perception"];
const PCOL=["#ff5d5d","#ff9a3c","#ffd23f","#2ee6c5","#5aa9ff","#b57cff"];
const MCOL=["#a6ff3c","#ff4fd8","#4dffb0","#ff8f6b","#8f9bff","#e8e86a"];
const LEVELS=10;

const $=id=>document.getElementById(id);
const norm=s=>s.trim().replace(/\s+/g," ").toLowerCase();
const show=id=>document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("on",s.id===id));
const fast=matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep=ms=>new Promise(r=>setTimeout(r,fast?0:ms));
let run=0, timer=null, current=null;
const loaded=new Map();  /* files opened this visit; cleared when the tab reloads or closes */
function renderLoaded(){
  const box=$("lbtns"); box.innerHTML="";
  loaded.forEach(e=>{const b=document.createElement("button");b.type="button";b.className="lb";b.textContent=e.code+"  "+e.nick;b.onclick=()=>{current=e;openProfile(e);};box.appendChild(b);});
  $("loaded").hidden=!loaded.size;
}

/* boot */
(async()=>{
  const log=$("bootlog");
  const type=async s=>{for(const ch of s){log.textContent+=ch;await sleep(ch===" "||ch==="."?12:22+Math.random()*38);}};
  await sleep(400);
  for(const l of ["ARCHIVE SYSTEM v1.0","checking memory .......... ok","mounting records ......... ok","balancing karmas ... ... ok","","ready."]){
    if(l.endsWith(" ok")){ await type(l.slice(0,-2)); await sleep(260); log.textContent+="ok"; }
    else await type(l);
    log.textContent+="\n"; await sleep(l?200:120);
  }
  await sleep(700); show("prompt"); $("q").focus();
})();

/* scramble text into place */
async function scramble(el,text,ms){
  if(fast){el.textContent=text;return;}
  const set="01#$%&*+=<>?/", t0=performance.now();
  while(true){
    const p=Math.min(1,(performance.now()-t0)/ms), n=Math.floor(p*text.length);
    el.textContent=text.split("").map((c,i)=>i<n||c===" "?c:set[Math.random()*set.length|0]).join("");
    if(p>=1)break; await sleep(40);
  }
}

/* search result animation */
async function reveal(e){
  const id=++run, log=$("rlog"), card=$("card");
  log.textContent=""; card.hidden=true; current=e; show("result");
  const ok=()=>id===run;
  if(loaded.has(e.name)){ log.textContent="> file already loaded\n"; $("rcode").textContent=e.code; $("rnick").textContent=e.nick; card.hidden=false; card.focus(); return; }
  for(const l of ["> locating file ...","> found."]){ if(!ok())return; log.textContent+=l+"\n"; await sleep(450); }
  if(!ok())return; log.textContent+="> decrypting ";
  const base=log.textContent;
  for(let i=1;i<=20;i++){ if(!ok())return; log.textContent=base+"["+"█".repeat(i)+"░".repeat(20-i)+"]"; await sleep(60); }
  if(!ok())return; log.textContent+="\n> done\n"; await sleep(300);
  if(!ok())return; card.hidden=false; card.focus(); loaded.set(e.name,e); renderLoaded();
  await Promise.all([scramble($("rcode"),e.code,700),scramble($("rnick"),e.nick,900)]);
}

/* wheel */
const C=170,RO=165,RR=130,RI=112,ANG=[-90,-30,30,90,150,210];
const pt=(r,a)=>{const t=a*Math.PI/180;return[C+r*Math.cos(t),C+r*Math.sin(t)]};
const f=n=>n.toFixed(1);
function sector(r1,r2,a1,a2){const[x1,y1]=pt(r2,a1),[x2,y2]=pt(r2,a2),[x3,y3]=pt(r1,a2),[x4,y4]=pt(r1,a1);
  return`M${f(x1)} ${f(y1)}A${r2} ${r2} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 0 0 ${f(x4)} ${f(y4)}Z`}
function wheel(labels,vals,cols,pid){
  let s=`<svg viewBox="0 0 340 340" role="img" aria-label="${labels.map((l,i)=>l+" "+vals[i]+" of "+LEVELS).join(", ")}">
  <defs><pattern id="h${pid}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#3a3935" stroke-width="2"/></pattern></defs>
  <circle cx="${C}" cy="${C}" r="${RO}" fill="#080808" stroke="#e9e7df" stroke-width="2"/>
  <circle cx="${C}" cy="${C}" r="${RR}" fill="none" stroke="#e9e7df" stroke-width="1.2"/>`;
  ANG.forEach(a=>s+=`<path d="${sector(RR,RO,a+19,a+41)}" fill="url(#h${pid})" stroke="#3a3935" stroke-width="1.2"/>`);
  s+=`<circle cx="${C}" cy="${C}" r="${RI}" fill="#0c0c0b" stroke="#e9e7df" stroke-width="2.5"/>`;
  const pts=vals.map((v,i)=>pt(RI*Math.max(0,Math.min(LEVELS,v))/LEVELS,ANG[i]));
  ANG.forEach((a,i)=>{
    const[x,y]=pt(RI,a);
    s+=`<line x1="${C}" y1="${C}" x2="${f(x)}" y2="${f(y)}" stroke="#77756d" stroke-width="1.5"/>`;
    for(let n=1;n<=LEVELS;n++){const[px,py]=pt(RI*n/LEVELS,a),t=(a+90)*Math.PI/180,k=n%5?3.5:6;
      s+=`<line x1="${f(px-Math.cos(t)*k)}" y1="${f(py-Math.sin(t)*k)}" x2="${f(px+Math.cos(t)*k)}" y2="${f(py+Math.sin(t)*k)}" stroke="#77756d" stroke-width="1.3"/>`;}
    const[lx,ly]=pt((RR+RO)/2-1,a),rot=Math.sin(a*Math.PI/180)>.01?a-90:a+90;
    s+=`<text transform="translate(${f(lx)} ${f(ly)}) rotate(${rot})" text-anchor="middle" dominant-baseline="central" font-family="VT323,monospace" font-size="19" fill="${cols[i]}">${labels[i]}</text>`;
  });
  s+=`<polygon points="${pts.map(p=>f(p[0])+","+f(p[1])).join(" ")}" fill="rgba(233,231,223,.1)" stroke="rgba(233,231,223,.55)" stroke-width="1.5" stroke-linejoin="round"/>`;
  pts.forEach((p,i)=>s+=`<line x1="${C}" y1="${C}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${cols[i]}" stroke-width="5" stroke-linecap="round"/><circle cx="${f(p[0])}" cy="${f(p[1])}" r="6.5" fill="${cols[i]}"/>`);
  s+=`<circle cx="${C}" cy="${C}" r="5" fill="#e9e7df"/></svg><div class="vals">${labels.map((l,i)=>`<span><i style="background:${cols[i]}"></i>${l}<b>${vals[i]}</b></span>`).join("")}</div>`;
  return s;
}

/* profile */
function openProfile(e){
  $("ptitle").textContent=e.code+" // "+e.name; $("pcode").textContent=e.code; $("pnick").textContent=e.nick;
  $("c1").innerHTML=wheel(PHYS,e.physical,PCOL,"p"); $("c2").innerHTML=wheel(MENT,e.mental,MCOL,"m");
  $("desc").textContent=e.desc||"";
  const box=$("portrait"); box.innerHTML="";
  const imgs=e.frames.map((src,i)=>{const im=new Image();im.alt=i?"":"Drawing of "+e.name;im.src=src;
    im.onerror=()=>{im.remove();if(!box.querySelector("img")&&!box.querySelector(".ph")){const d=document.createElement("div");d.className="ph";d.textContent="no drawing yet";box.appendChild(d);}};
    box.appendChild(im);return im;});
  let k=0; imgs[0].classList.add("show"); clearInterval(timer);
  if(imgs.length>1)timer=setInterval(()=>{imgs[k].classList.remove("show");k=(k+1)%imgs.length;imgs[k].classList.add("show");},e.ms||FRAME_MS);
  show("profile"); window.scrollTo(0,0); $("close").focus();
}

/* events */
$("sf").addEventListener("submit",ev=>{ev.preventDefault();
  const hit=FILES.find(x=>norm(x.name)===norm($("q").value));
  if(hit){$("msg").textContent="";reveal(hit);} else $("msg").textContent="No file found. Check the exact name and try again.";});
$("card").addEventListener("click",()=>openProfile(current));
const home=()=>{run++;clearInterval(timer);$("q").value="";$("msg").textContent="";show("prompt");$("q").focus();};
$("rback").addEventListener("click",home); $("close").addEventListener("click",home);
