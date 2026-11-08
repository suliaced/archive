/* Character data lives in the files/ folder (see files/core.js for how to add one).
   This file only runs the site. */
const PHYS=["Speed","Strength","Durability","Height","Stamina","Precision"];
const MENT=["Cognition","Social","Adaptability","Creativity","Composure","Perception"];
const PCOL=["#ff5d5d","#ff9a3c","#ffd23f","#2ee6c5","#5aa9ff","#b57cff"];
const MCOL=["#a6ff3c","#ff4fd8","#4dffb0","#ff8f6b","#8f9bff","#e8e86a"];
const LEVELS=10;

const $=id=>document.getElementById(id);
const norm=s=>s.trim().replace(/\s+/g," ").toLowerCase();
const bootMusic = document.getElementById("bootMusic");
const interfaceMusic = document.getElementById("interfaceMusic");
const decryptSfx = document.getElementById("decryptSfx");
const loadedSfx = document.getElementById("loadedSfx");
const typeSfx = document.getElementById("typeSfx");

/* ---- typing sound ----
   Uses a small pool of copies of type.mp3 so rapid ticks overlap smoothly
   instead of cutting each other off (which causes clicks/stutter).
   Each tick gets a tiny random pitch + volume change so it doesn't sound robotic. */
const TYPE_VOLUME = 0.10;      /* overall loudness of the tick (0 to 1) */
const TYPE_MIN_GAP_MS = 55;    /* minimum time between ticks; raise it for calmer sound */
const TYPE_POOL_SIZE = 4;
const typePool = [];
let typePoolIndex = 0;
let lastTypeSound = 0;

if (typeSfx) {
  for (let i = 0; i < TYPE_POOL_SIZE; i++) {
    const a = typeSfx.cloneNode(true);
    a.preload = "auto";
    typePool.push(a);
  }
}

function playTypeSound(){
  if (!typePool.length || fast) return;

  const now = performance.now();
  if (now - lastTypeSound < TYPE_MIN_GAP_MS) return;
  lastTypeSound = now;

  const a = typePool[typePoolIndex];
  typePoolIndex = (typePoolIndex + 1) % typePool.length;

  a.currentTime = 0;
  a.volume = TYPE_VOLUME * (0.8 + Math.random() * 0.4);
  a.playbackRate = 0.95 + Math.random() * 0.14;
  a.play().catch(() => {});
}

function playSfx(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(error => {
    console.info("Sound is waiting for browser audio permission.", error);
  });
}

// Keep both tracks at a safe starting volume and crossfade between them.
const MUSIC_FADE_MS = 1200;
const MUSIC_STEP_MS = 40;
let currentMusic = null;
let musicFadeTimer = null;
let userHasInteracted = false;

[bootMusic, interfaceMusic].forEach(audio => {
  if (audio) audio.volume = 0;
});

function playMusic(track) {
  if (!track) return;
  if (currentMusic === track && !track.paused) return;

  if (musicFadeTimer) {
    clearInterval(musicFadeTimer);
    musicFadeTimer = null;
  }

  const previous = currentMusic;
  currentMusic = track;
  const startVolumes = new Map();
  [bootMusic, interfaceMusic].forEach(audio => {
    if (audio) startVolumes.set(audio, audio.volume);
  });

  // Start the incoming track. Audible autoplay still requires a user gesture
  // in browsers that block autoplay, so the first click/key unlocks playback.
  track.volume = 0;
  track.play().catch(error => {
    console.info("Browser blocked audio until you interact with the page.", error);
  });

  const steps = Math.max(1, Math.ceil(MUSIC_FADE_MS / MUSIC_STEP_MS));
  let step = 0;
  musicFadeTimer = setInterval(() => {
    step++;
    const progress = Math.min(1, step / steps);

    if (previous && previous !== track) {
      previous.volume = Math.max(0, (startVolumes.get(previous) || 0) * (1 - progress));
    }
    track.volume = Math.min(1, progress);

    if (progress >= 1) {
      clearInterval(musicFadeTimer);
      musicFadeTimer = null;
      if (previous && previous !== track) {
        previous.pause();
        previous.currentTime = 0;
        previous.volume = 0;
      }
      track.volume = 1;
    }
  }, MUSIC_STEP_MS);
}

// How long the LOADING screen shows after boot, and how long the boot music takes to fade out.
const LOADING_MS = 3000;
const BOOT_FADE_OUT_MS = 2000;

function fadeOutMusic(track, ms) {
  if (!track || track.paused || track.volume === 0) return;
  const startVolume = track.volume;
  const t0 = performance.now();
  const timer = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms);
    track.volume = Math.max(0, startVolume * (1 - p));
    if (p >= 1) clearInterval(timer);
  }, MUSIC_STEP_MS);
}

function show(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("on", screen.id === id);
  });

  // Change tracks only when switching between the boot screen and the main UI.
  if (id === "boot") {
    playMusic(bootMusic);
  } else if (id === "prompt" || id === "result" || id === "profile") {
    playMusic(interfaceMusic);
  }
}

// Browsers generally block sound until the visitor interacts once.
// Start the appropriate track on that first click or keypress.
function unlockAndStartMusic() {
  if (userHasInteracted) return;
  userHasInteracted = true;
  const activeScreen = document.querySelector(".screen.on");
  if (activeScreen && activeScreen.id === "loading") return;  // the terminal music starts when loading ends
  playMusic(activeScreen && activeScreen.id === "boot" ? bootMusic : interfaceMusic);
}
document.addEventListener("pointerdown", unlockAndStartMusic, { once: true });
document.addEventListener("keydown", unlockAndStartMusic, { once: true });
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
  const type=async s=>{for(const ch of s){log.textContent+=ch;if(ch!==" "&&ch!==".")playTypeSound();await sleep(ch===" "||ch==="."?12:22+Math.random()*38);}};
  await sleep(400);
  for(const l of ["ARCHIVE SYSTEM v1.0","checking memory .......... ok","mounting records ......... ok","balancing karmas ................ ok","","ready."]){
    if(l.endsWith(" ok")){ await type(l.slice(0,-2)); await sleep(260); log.textContent+="ok"; }
    else await type(l);
    log.textContent+="\n"; await sleep(l?200:120);
  }
  await sleep(700);

  /* loading screen: boot music fades out, then the terminal and its music start */
  show("loading");
  fadeOutMusic(bootMusic, BOOT_FADE_OUT_MS);
  const dots=$("loadingDots"); let d=0;
  dots.textContent="";
  const dotTimer=setInterval(()=>{d=(d+1)%4;dots.textContent=".".repeat(d);},350);
  await sleep(LOADING_MS);
  clearInterval(dotTimer);

  show("prompt"); $("q").focus();
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
  if(e.song) loadYT();                    /* start loading the YouTube player while the file "decrypts" */
  const id=++run, log=$("rlog"), card=$("card");
  log.textContent=""; card.hidden=true; current=e; show("result");
  const ok=()=>id===run;
  if(loaded.has(e.name)){ log.textContent="> file already loaded\n"; $("rcode").textContent=e.code; $("rnick").textContent=e.nick; card.hidden=false; card.focus(); return; }
  for(const l of ["> locating file ...","> found"]){ if(!ok())return; log.textContent+=l+"\n"; await sleep(450); }
  if(!ok())return;

  // Start decrypt sound
  decryptSfx.currentTime = 0;
  decryptSfx.play().catch(() => {});

  log.textContent += "> decrypting ";
  const base = log.textContent;

  // Random duration between 500ms and 3500ms
  const decryptTime = Math.floor(
    500 + Math.random() * 3000
  );

  const steps = 20;
  const stepTime = decryptTime / steps;

  for(let i = 1; i <= steps; i++){
    if(!ok()){
      decryptSfx.pause();
      decryptSfx.currentTime = 0;
      return;
    }

    log.textContent =
      base +
      "[" +
      "█".repeat(i) +
      "░".repeat(steps - i) +
      "]";

    await sleep(stepTime);
  }

  // Stop sound immediately when finished
  decryptSfx.pause();
  decryptSfx.currentTime = 0;

  if(!ok())return;
  log.textContent += "\n> done\n";
  await sleep(300);
  if(!ok())return; card.hidden=false; card.focus(); loaded.set(e.name,e); renderLoaded(); playSfx(loadedSfx);
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
  ANG.forEach((a,i)=>{
    const[x,y]=pt(RI,a);
    s+=`<line x1="${C}" y1="${C}" x2="${f(x)}" y2="${f(y)}" stroke="#77756d" stroke-width="1.5"/>`;
    for(let n=1;n<=LEVELS;n++){const[px,py]=pt(RI*n/LEVELS,a),t=(a+90)*Math.PI/180,k=n%5?3.5:6;
      s+=`<line x1="${f(px-Math.cos(t)*k)}" y1="${f(py-Math.sin(t)*k)}" x2="${f(px+Math.cos(t)*k)}" y2="${f(py+Math.sin(t)*k)}" stroke="#77756d" stroke-width="1.3"/>`;}
    const[lx,ly]=pt((RR+RO)/2-1,a),rot=Math.sin(a*Math.PI/180)>.01?a-90:a+90;
    s+=`<text transform="translate(${f(lx)} ${f(ly)}) rotate(${rot})" text-anchor="middle" dominant-baseline="central" font-family="VT323,monospace" font-size="19" fill="${cols[i]}">${labels[i]}</text>`;
  });
  const zeroPts=vals.map((v,i)=>pt(0,ANG[i]));
  const finalPts=vals.map((v,i)=>pt(RI*Math.max(0,Math.min(LEVELS,v))/LEVELS,ANG[i]));
  s+=`<polygon class="stat-shape" points="${zeroPts.map(p=>f(p[0])+","+f(p[1])).join(" ")}" data-final="${finalPts.map(p=>f(p[0])+","+f(p[1])).join(" ")}" fill="rgba(233,231,223,.1)" stroke="rgba(233,231,223,.55)" stroke-width="1.5" stroke-linejoin="round"/>`;
  finalPts.forEach((p,i)=>s+=`<line class="stat-spoke" x1="${C}" y1="${C}" x2="${C}" y2="${C}" data-x="${f(p[0])}" data-y="${f(p[1])}" stroke="${cols[i]}" stroke-width="5" stroke-linecap="round"/><circle class="stat-point" cx="${C}" cy="${C}" r="6.5" data-x="${f(p[0])}" data-y="${f(p[1])}" fill="${cols[i]}"/>`);
  s+=`<circle cx="${C}" cy="${C}" r="5" fill="#e9e7df"/></svg><div class="vals">${labels.map((l,i)=>`<span><i style="background:${cols[i]}"></i>${l}<b>${vals[i]}</b></span>`).join("")}</div>`;
  return s;
}

function animateWheel(el){
  const svg=el.querySelector("svg");
  if(!svg)return;
  const polygon=svg.querySelector(".stat-shape");
  const spokes=[...svg.querySelectorAll(".stat-spoke")];
  const points=[...svg.querySelectorAll(".stat-point")];
  const final=polygon.dataset.final;
  const startPoints=polygon.getAttribute("points");
  const startTime=performance.now();
  const duration=550;

  if(fast){
    polygon.setAttribute("points",final);
    spokes.forEach(line=>{line.setAttribute("x2",line.dataset.x);line.setAttribute("y2",line.dataset.y);});
    points.forEach(point=>{point.setAttribute("cx",point.dataset.x);point.setAttribute("cy",point.dataset.y);});
    return;
  }

  const start=parsePoints(startPoints), end=parsePoints(final);
  const tick=now=>{
    const p=Math.min(1,(now-startTime)/duration);
    const eased=1-Math.pow(1-p,3);
    polygon.setAttribute("points",interpolatePoints(start,end,eased));
    spokes.forEach(line=>{
      line.setAttribute("x2",f(C+(Number(line.dataset.x)-C)*eased));
      line.setAttribute("y2",f(C+(Number(line.dataset.y)-C)*eased));
    });
    points.forEach(point=>{
      point.setAttribute("cx",f(C+(Number(point.dataset.x)-C)*eased));
      point.setAttribute("cy",f(C+(Number(point.dataset.y)-C)*eased));
    });
    if(p<1)requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function parsePoints(points){
  return points.trim().split(" ").map(p=>p.split(",").map(Number));
}

function interpolatePoints(a,b,p){
  return a.map((pt,i)=>`${f(pt[0]+(b[i][0]-pt[0])*p)},${f(pt[1]+(b[i][1]-pt[1])*p)}`).join(" ");
}

/* ---- profile song (a YouTube video chosen in the survey) ----
   The video is kept out of sight. Opening a profile starts its song, and a small "Now Playing" pill slides in at
   the top right. Click the pill to pause or resume. The terminal music fades down while the song plays. */
let ytPlayer=null, ytLoading=null, ytHost=null, pill=null, pillTimer=null, blockTimer=null;
let duckTimer=null, ducked=false, songToken=0, songState=-1, songName="";

function loadYT(){
  if(ytLoading) return ytLoading;
  ytLoading=new Promise(resolve=>{
    if(window.YT&&YT.Player) return resolve();
    const prev=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{ if(prev) prev(); resolve(); };
    const s=document.createElement("script");
    s.src="https://www.youtube.com/iframe_api";
    s.onerror=()=>resolve();
    document.head.appendChild(s);
  });
  return ytLoading;
}

function fadeInterface(to,ms){
  if(!interfaceMusic) return;
  ducked=(to===0);
  clearInterval(duckTimer);
  const from=interfaceMusic.volume, t0=performance.now(), dur=ms||700;
  duckTimer=setInterval(()=>{
    const p=Math.min(1,(performance.now()-t0)/dur);
    interfaceMusic.volume=Math.max(0,Math.min(1,from+(to-from)*p));
    if(p>=1) clearInterval(duckTimer);
  },40);
}

/* the Now Playing pill */
function pillStyles(){
  if($("npStyles")) return;
  const st=document.createElement("style");
  st.id="npStyles";
  st.textContent=
    "#nowPlaying{position:fixed;top:14px;right:14px;z-index:60;display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 28px));"+
    "padding:6px 14px;border:1px solid var(--tx,#e9e7df);background:rgba(8,8,8,.94);color:var(--tx,#e9e7df);font-size:20px;line-height:1.2;cursor:pointer;"+
    "transform:translateX(calc(100% + 28px));opacity:0;transition:transform .55s cubic-bezier(.2,.9,.2,1),opacity .4s ease;user-select:none}"+
    "#nowPlaying.in{transform:none;opacity:1}"+
    "#nowPlaying:hover,#nowPlaying:focus-visible{background:var(--tx,#e9e7df);color:var(--bg,#080808);outline:none}"+
    "#nowPlaying .np-text{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"+
    "#nowPlaying .np-bars{flex:none;display:flex;align-items:flex-end;gap:2px;height:14px}"+
    "#nowPlaying .np-bars i{display:block;width:3px;height:100%;background:currentColor;transform-origin:bottom;animation:npEq .9s ease-in-out infinite}"+
    "#nowPlaying .np-bars i:nth-child(2){animation-delay:-.3s}#nowPlaying .np-bars i:nth-child(3){animation-delay:-.6s}"+
    "#nowPlaying.paused .np-bars i,#nowPlaying.idle .np-bars i{animation-play-state:paused;transform:scaleY(.25)}"+
    "@keyframes npEq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}"+
    "@media(prefers-reduced-motion:reduce){#nowPlaying{transition:none}#nowPlaying .np-bars i{animation:none;transform:scaleY(.6)}}";
  document.head.appendChild(st);
}

function setPill(text,mode){            /* mode: "playing", "paused" or "idle" */
  pillStyles();
  clearTimeout(pillTimer);
  if(!pill){
    pill=document.createElement("div");
    pill.id="nowPlaying"; pill.setAttribute("role","button"); pill.tabIndex=0;
    pill.innerHTML='<span class="np-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="np-text"></span>';
    const toggle=()=>{
      if(!ytPlayer||!ytPlayer.playVideo) return;
      try{ songState===1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); }catch(err){}
    };
    pill.addEventListener("click",toggle);
    pill.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); toggle(); } });
    document.body.appendChild(pill);
    void pill.offsetWidth;               /* lets the slide-in animation run */
  }
  pill.classList.remove("playing","paused","idle");
  pill.classList.add(mode);
  pill.setAttribute("aria-label",text+" (click to "+(mode==="playing"?"pause":"play")+")");
  pill.querySelector(".np-text").textContent=text;
  pill.classList.add("in");
}

function hidePill(){
  if(!pill) return;
  const p=pill; pill=null;
  p.classList.remove("in");
  pillTimer=setTimeout(()=>p.remove(),650);
}

function stopSong(){
  songToken++;
  songState=-1;
  clearTimeout(blockTimer);
  if(ytPlayer){ try{ ytPlayer.destroy(); }catch(err){} ytPlayer=null; }
  if(ytHost) ytHost.innerHTML="";
  hidePill();
  if(ducked) fadeInterface(1);
}

async function startSong(e){
  stopSong();
  if(!e.song) return;
  const my=songToken;
  songName=e.songTitle||"a song";

  await loadYT();
  if(my!==songToken) return;                          /* they already left this profile */
  if(!(window.YT&&YT.Player)) return;                 /* YouTube unreachable: the profile just stays quiet */

  if(!ytHost){
    ytHost=document.createElement("div");
    ytHost.setAttribute("aria-hidden","true");
    /* invisible but still "on screen", so the browser lets it play */
    ytHost.style.cssText="position:fixed;left:0;bottom:0;width:200px;height:200px;opacity:0;pointer-events:none;z-index:-1;overflow:hidden";
    document.body.appendChild(ytHost);
  }
  const holder=document.createElement("div");
  ytHost.appendChild(holder);

  ytPlayer=new YT.Player(holder,{
    width:"200", height:"200", videoId:e.song,
    playerVars:{ autoplay:1, controls:0, playsinline:1, rel:0, disablekb:1 },
    events:{
      onReady:ev=>{
        if(my!==songToken) return;
        try{ ev.target.setVolume(100); ev.target.playVideo(); }catch(err){}
        /* if the browser blocks autoplay, offer a click-to-play pill */
        blockTimer=setTimeout(()=>{ if(my===songToken&&songState!==1) setPill("Click to play: "+songName,"idle"); },2500);
      },
      onStateChange:ev=>{
        if(my!==songToken) return;
        songState=ev.data;
        if(ev.data===1){ clearTimeout(blockTimer); setPill("Now Playing: "+songName,"playing"); fadeInterface(0); }
        else if(ev.data===2){ setPill("Paused: "+songName,"paused"); fadeInterface(1); }
        else if(ev.data===0){ hidePill(); fadeInterface(1); }
      },
      onError:()=>{
        if(my!==songToken) return;
        clearTimeout(blockTimer);
        setPill("Song unavailable","idle"); fadeInterface(1);
        const t=my; setTimeout(()=>{ if(t===songToken) hidePill(); },2800);
      }
    }
  });
}

/* profile */
function openProfile(e){
  stopSong();
  if(e.guide){
    clearInterval(timer);

    $("ptitle").textContent = e.code + " // " + e.name;
    $("pcode").textContent = "";
    $("pnick").textContent = "";

    document.querySelector(".identity").style.display = "none";
    document.querySelector(".categories").style.display = "none";

    $("pdesc").style.whiteSpace = "";
    $("pdesc").innerHTML = e.desc;

    show("profile");
    window.scrollTo(0,0);
    $("close").focus();

    return;
  }
  document.querySelector(".identity").style.display = "";
  document.querySelector(".categories").style.display = "";
  $("ptitle").textContent=e.code+" // "+e.name; $("pcode").textContent=e.code; $("pnick").textContent=e.nick;
  $("pdesc").textContent=e.desc||"";
  $("pdesc").style.whiteSpace="pre-line";   /* keeps the line breaks in survey descriptions */
  $("c1").innerHTML=wheel(PHYS,e.physical,PCOL,"p"); $("c2").innerHTML=wheel(MENT,e.mental,MCOL,"m");
  $("physical-desc").textContent=e.physicalDesc||"";
  $("mental-desc").textContent=e.mentalDesc||"";

  document.querySelectorAll(".category-btn").forEach(btn=>{
    btn.setAttribute("aria-expanded","false");
    const panel=$(btn.getAttribute("aria-controls"));
    panel.hidden=true;
  });

  const box=$("portrait"); box.innerHTML="";
  const imgs=e.frames.map((src,i)=>{const im=new Image();im.alt=i?"":"Drawing of "+e.name;im.src=src;
    im.onerror=()=>{im.remove();if(!box.querySelector("img")&&!box.querySelector(".ph")){const d=document.createElement("div");d.className="ph";d.textContent="no drawing yet";box.appendChild(d);}};
    box.appendChild(im);return im;});
  let k=0; imgs[0].classList.add("show"); clearInterval(timer);
  if(imgs.length>1)timer=setInterval(()=>{imgs[k].classList.remove("show");k=(k+1)%imgs.length;imgs[k].classList.add("show");},e.ms||FRAME_MS);
  show("profile"); window.scrollTo(0,0); $("close").focus();
  startSong(e);
}

/* events */
/* category accordions */
document.querySelectorAll(".category-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const panel=$(btn.getAttribute("aria-controls"));
    const opening=btn.getAttribute("aria-expanded")!=="true";
    btn.setAttribute("aria-expanded",String(opening));
    panel.hidden=!opening;
    if(opening && panel.querySelector("svg")) animateWheel(panel);
  });
});

$("q").addEventListener("input",playTypeSound);
$("sf").addEventListener("submit",ev=>{ev.preventDefault();
  const hit=FILES.find(x=>norm(x.name)===norm($("q").value));
  if(hit){$("msg").textContent="";reveal(hit);} else $("msg").textContent="no file found.";});
$("card").addEventListener("click",()=>openProfile(current));
const home=()=>{
  run++;
  stopSong();
  clearInterval(timer);

  decryptSfx.pause();
  decryptSfx.currentTime = 0;

  $("q").value="";
  $("msg").textContent="";
  show("prompt");
  $("q").focus();
};

$("rback").addEventListener("click",home);
$("close").addEventListener("click",home);
