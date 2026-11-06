/* engine.js — 数学 / 输入 / 音频 / 存档 / 资源加载 / 精灵动画 */
(function(){
const E = {};

/* ---------- 数学 ---------- */
E.clamp=(v,a,b)=>v<a?a:v>b?b:v;
E.lerp=(a,b,t)=>a+(b-a)*t;
/* v9 注释：签名是 rand(max, min)，两个参数都带默认值，调用处有 rand(620,900) 也有 rand(1.5,0)，
   都能正确返回 [min,max] 区间的值，但顺序反直觉，新代码请按 (max,min) 传 */
E.rand=(a=1,b=0)=>b+Math.random()*(a-b);
E.randInt=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
E.pick=arr=>arr[Math.floor(Math.random()*arr.length)];
E.dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
E.ang=(x1,y1,x2,y2)=>Math.atan2(y2-y1,x2-x1);
E.angDiff=(a,b)=>{let d=(b-a+Math.PI*3)%(Math.PI*2)-Math.PI;return d;};
E.shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
E.weighted=(items,weights)=>{let s=0;for(const w of weights)s+=w;let r=Math.random()*s;for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i];}return items[items.length-1];};

/* ---------- 输入 ---------- */
const keys={}, mouse={x:0,y:0,down:false,wx:0,wy:0};
E.keys=keys; E.mouse=mouse;
E.initInput=function(canvas){
  window.addEventListener("keydown",e=>{
    keys[e.code]=true;
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup",e=>{keys[e.code]=false;});
  window.addEventListener("blur",()=>{for(const k in keys)keys[k]=false;});
  canvas.addEventListener("mousemove",e=>{
    const r=canvas.getBoundingClientRect();
    mouse.x=(e.clientX-r.left)*(canvas.width/r.width);
    mouse.y=(e.clientY-r.top)*(canvas.height/r.height);
    mouse.sx=e.clientX; mouse.sy=e.clientY;
  });
  canvas.addEventListener("mousedown",()=>mouse.down=true);
  window.addEventListener("mouseup",()=>mouse.down=false);
  canvas.addEventListener("contextmenu",e=>e.preventDefault());
};
E.key=(c)=>!!keys[c];

/* ---------- 手柄 / 触屏 ---------- */
E.padAim={active:false,x:0,y:0};
E.touchAxis={x:0,y:0,active:false};
function stickUI(active,dx,dy){
  const s=document.getElementById("touch-stick"); if(!s)return;
  s.classList.toggle("active",!!active);
  const k=s.querySelector(".stick-knob"); if(k) k.style.transform="translate("+((dx||0)*24)+"px,"+((dy||0)*24)+"px)";
}
const padPrev={};
E.pollPad=function(){
  const pads=navigator.getGamepads?navigator.getGamepads():null;
  if(!pads) return;
  let gp=null; for(const p of pads){ if(p&&p.connected){ gp=p; break; } }
  if(!gp){ E.padAim.active=false; return; }
  const ax=gp.axes[0]||0, ay=gp.axes[1]||0;
  const dz=v=>Math.abs(v)<0.28?0:v;
  const lx=dz(ax), ly=dz(ay);
  keys.KeyA=lx<-0.2; keys.KeyD=lx>0.2; keys.KeyW=ly<-0.2; keys.KeyS=ly>0.2;
  const rx=dz(gp.axes[2]||0), ry=dz(gp.axes[3]||0);
  if(Math.hypot(rx,ry)>0.3){ E.padAim.active=true; E.padAim.x=rx; E.padAim.y=ry; } else E.padAim.active=false;
  const btn=(i)=>!!(gp.buttons[i]&&gp.buttons[i].pressed);
  const edge=(i,code)=>{ const p=btn(i); if(p&&!padPrev[i]) keys[code]=true; if(!p&&padPrev[i]) keys[code]=false; padPrev[i]=p; };
  edge(0,"Space"); edge(2,"Digit1"); edge(3,"Digit2"); edge(1,"Digit3"); edge(5,"Digit4"); edge(4,"Digit5"); edge(9,"Escape");
  edge(12,"KeyE");
};
window.addEventListener("touchstart",e=>{
  for(const t of e.changedTouches){
    // 触屏技能/按钮上的触摸不再传给摇杆和瞄准，避免按技能时角色朝右下角施法
    const el=t.target;
    if(el&&el.closest&&el.closest("#hud,button,.overlay,.slot")) continue;
    if(t.clientX < window.innerWidth*0.5){ touchStart={id:t.identifier,x:t.clientX,y:t.clientY}; stickUI(true,0,0); }
    else { touchAim={x:t.clientX,y:t.clientY}; if(E.onTapRight) E.onTapRight(t.clientX,t.clientY); }
  }
},{passive:true});
let touchStart=null, touchAim=null;
window.addEventListener("touchmove",e=>{
  for(const t of e.changedTouches){
    if(touchStart&&t.identifier===touchStart.id){
      const dx=(t.clientX-touchStart.x)/60, dy=(t.clientY-touchStart.y)/60;
      E.touchAxis.x=E.clamp(dx,-1,1); E.touchAxis.y=E.clamp(dy,-1,1); E.touchAxis.active=true;
      stickUI(true,E.touchAxis.x,E.touchAxis.y);
      keys.KeyA=E.touchAxis.x<-0.2; keys.KeyD=E.touchAxis.x>0.2; keys.KeyW=E.touchAxis.y<-0.2; keys.KeyS=E.touchAxis.y>0.2;
    }
  }
},{passive:true});
window.addEventListener("touchend",e=>{
  for(const t of e.changedTouches){
    if(touchStart&&t.identifier===touchStart.id){ touchStart=null; E.touchAxis.active=false; E.touchAxis.x=0; E.touchAxis.y=0; keys.KeyA=keys.KeyD=keys.KeyW=keys.KeyS=false; stickUI(false,0,0); }
  }
},{passive:true});

/* ---------- BGM（单一 Audio 元素，切换时硬停旧曲） ---------- */
E.bgm={cur:null,pending:null,audio:null,volume:0.45,enabled:true};
E.bgm._ensure=function(){
  if(!E.bgm.audio){
    try{
      const a=new Audio();
      a.loop=true; a.preload="auto"; a.playsInline=true;
      try{a.setAttribute("playsinline","");}catch(e){}
      E.bgm.audio=a;
    }catch(e){ return null; }
  }
  return E.bgm.audio;
};
E.bgm.play=function(key){
  const list=(window.WZ&&window.WZ.bgm)||{};
  const src=list[key];
  if(!src){ E.bgm.stop(); return; }
  const a=E.bgm._ensure(); if(!a) return;
  E.bgm.pending=key;
  // 同一首正在播放，或同一首暂停后续播
  if(E.bgm.cur===key && a._bgmKey===key){
    if(!a.paused) return;
    try{
      a.volume=E.bgm.volume;
      const p=a.play();
      if(p&&p.catch) p.catch(()=>{ if(a.paused) E.bgm.cur=null; });
    }catch(e){ E.bgm.cur=null; }
    return;
  }
  // 硬停旧曲：pause + 清空 src + load，避免移动端残留
  try{ a.pause(); a.currentTime=0; a.removeAttribute("src"); a.load(); }catch(e){}
  try{
    a.src=src; a._bgmKey=key; a.loop=true; a.volume=E.bgm.volume; a.muted=false;
    const p=a.play();
    E.bgm.cur=key;
    if(p&&p.catch) p.catch(()=>{ if(a.paused) E.bgm.cur=null; });
  }catch(e){ E.bgm.cur=null; }
};
E.bgm.stop=function(){
  const a=E.bgm.audio;
  if(a){
    try{ a.pause(); a.currentTime=0; a.removeAttribute("src"); a.load(); a._bgmKey=null; }catch(e){}
  }
  E.bgm.cur=null; E.bgm.pending=null;
};
E.bgm.setVolume=function(v){ E.bgm.volume=Math.max(0,Math.min(1,Number(v)||0)); if(E.bgm.audio) E.bgm.audio.volume=E.bgm.volume; };
E.bgm.isPlaying=function(){ return !!(E.bgm.audio&&!E.bgm.audio.paused&&!E.bgm.audio.ended); };

/* ---------- 音频（WebAudio 合成，无外部资源） ---------- */
let actx=null, masterGain=null;
E.audio={volume:0.6};
E.audio.init=function(){
  if(actx)return;
  try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  masterGain=actx.createGain(); masterGain.gain.value=E.audio.volume*0.5; masterGain.connect(actx.destination);
};
E.audio.setVolume=function(v){ E.audio.volume=v; if(masterGain) masterGain.gain.value=v*0.5; };
function tone(freq,dur,type="square",vol=0.3,slide=0){
  if(!actx||E.audio.volume<=0)return;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,actx.currentTime);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),actx.currentTime+dur);
  g.gain.setValueAtTime(vol,actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
  o.connect(g);g.connect(masterGain);o.start();o.stop(actx.currentTime+dur);
}
E.sfx={
  hit:()=>tone(220,0.06,"square",0.10,-60),
  crit:()=>tone(520,0.10,"triangle",0.16,180),
  kill:()=>tone(140,0.10,"sawtooth",0.10,-60),
  hurt:()=>tone(90,0.18,"sawtooth",0.22,-40),
  level:()=>{tone(660,0.10,"triangle",0.18,220);setTimeout(()=>tone(880,0.16,"triangle",0.18,180),90);},
  gold:()=>tone(980,0.05,"sine",0.08,120),
  skill:()=>tone(300,0.16,"sine",0.16,260),
  wave:()=>{tone(330,0.12,"sine",0.16,120);setTimeout(()=>tone(440,0.18,"sine",0.16,120),110);},
  die:()=>{tone(200,0.5,"sawtooth",0.3,-150);}
};

/* ---------- 存档 ---------- */
/* 存档 key 随游戏改名一并更换为 seadragon_ 前缀。
   旧 beidou_ 开头的存档不再读取，进度从零开始（已知并接受）。 */
const SAVE_KEY="seadragon_potato_save_v1";
E.save={ data:{ bestWave:{}, unlockedChars:["ray","elin","luna"], unlockedMaps:["forest","snow"], totalGold:0, bank:0,
  runs:0, kills:0, wins:0, talents:{}, dailyBest:{}, relicSeen:{}, endlessBest:0, options:{bgm:0.45,sfx:0.5}, ach:{}, talentSpent:0, dailyRuns:0, bossKills:0, skin:"1", skins:{"1":1} } };
E.save.load=function(){
  try{ const s=localStorage.getItem(SAVE_KEY); if(s) E.save.data=Object.assign(E.save.data,JSON.parse(s)); }catch(e){}
  const d=E.save.data; d.skins=d.skins||{"1":1}; d.skins["1"]=1; d.skin=d.skin||"1"; d.bossKills=d.bossKills||0; d.totalGold=d.totalGold||0;
  return E.save.data;
};
E.save.write=function(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(E.save.data)); }catch(e){} };
E.getDmgSkin=function(){ const d=E.save.data||{}; const ok=d.skins&&d.skins[d.skin]; const id=ok?d.skin:"1"; return (window.WZ&&WZ.dmgSkins&&(WZ.dmgSkins[id]||WZ.dmgSkins["1"]))||null; };
E.save.reset=function(){ try{ localStorage.removeItem(SAVE_KEY);}catch(e){} E.save.load(); };

/* ---------- 资源 ---------- */
E.images={};
E.loadImage=function(src,opts){
  if(E.images[src]){ const r0=E.images[src];
    if(r0&&!r0.ready&&!r0.error&&r0.img&&r0.img.complete&&r0.img.naturalWidth>0) r0.ready=true;
    if(opts&&opts.priority&&r0&&r0.img){ try{ r0.img.fetchPriority=opts.priority; }catch(e){} }
    return r0; }
  const img=new Image();
  const rec={img,ready:false};
  /* 先挂事件再设 src：缓存命中的图片可能在赋值后立刻完成，晚挂 onload 会永远等不到 */
  img.onload=()=>{rec.ready=true;};
  img.onerror=()=>{rec.error=true;};
  img.decoding="async";
  if(opts&&opts.priority){ try{ img.fetchPriority=opts.priority; }catch(e){} }
  img.src=src;
  if(img.complete&&img.naturalWidth>0) rec.ready=true;
  E.images[src]=rec;
  return rec;
};
E.preloadAll=function(list,onProgress,opts){
  let done=0; const total=list.length||1;
  return Promise.all(list.map(src=>new Promise(res=>{
    const r=E.loadImage(src,opts);
    const fin=()=>{done++;onProgress&&onProgress(done/total);res();};
    if(r.ready||r.error||(r.img.complete&&r.img.naturalWidth>0)) { fin(); return; }
    r.img.addEventListener("load",fin);
    r.img.addEventListener("error",fin);
  })));
};
/* v7.1：分批预加载，避免一次性创建上千张 Image 占满浏览器同源连接队列
   （此前动漫伤害皮肤图片排在大队列末尾，导致数字一直回退为纯文本） */
E.preloadChunked=function(list,chunk,delay,onProgress,opts){
  const arr=[...new Set((list||[]).filter(Boolean))];
  chunk=Math.max(1,chunk||16); delay=Math.max(0,delay==null?40:delay);
  const isBg=!!(opts&&opts.background);
  let i=0;
  return new Promise(resolve=>{
    const step=()=>{
      /* 后台大批量素材遇到“正在换皮肤”时让路，避免 6000+ 图片堵住 20 张数字帧 */
      if(isBg&&E.__preloadHold>0){ setTimeout(step,120); return; }
      if(i>=arr.length){ resolve(arr.length); return; }
      const part=arr.slice(i,i+chunk); i+=part.length;
      E.preloadAll(part, null, isBg?{priority:"low"}:null).then(()=>{
        onProgress&&onProgress(i/(arr.length||1));
        setTimeout(step,delay);
      });
    };
    step();
  });
};
E.holdPreload=function(){ E.__preloadHold=(E.__preloadHold||0)+1; };
E.releasePreload=function(){ E.__preloadHold=Math.max(0,(E.__preloadHold||0)-1); };

/* ---------- 精灵动画 ---------- */
class SpriteAnim{
  constructor(frames,defaultDelay=140){
    this.frames=frames||[]; this.i=0; this.t=0; this.done=false; this.defaultDelay=defaultDelay;
  }
  update(dt){
    if(!this.frames.length)return;
    this.t+=dt*1000;
    const f=this.frames[this.i];
    const d=(f&&f.d)||this.defaultDelay;
    while(this.t>=d){ this.t-=d; this.i++; if(this.i>=this.frames.length){ this.done=true; this.i=this.frames.length-1; if(this.loop) this.i=0; else break; } }
  }
  set(name,list,loop){ this.frames=list||[]; this.i=0; this.t=0; this.done=false; this.loop=!!loop; }
  get frame(){ return this.frames[this.i]; }
}
E.SpriteAnim=SpriteAnim;

/* ---------- 画布工具 ---------- */
E.roundRect=function(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
};
E.shade=function(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=E.clamp(r,0,255);g=E.clamp(g,0,255);b=E.clamp(b,0,255);
  return "#"+(1<<24|r<<16|g<<8|b).toString(16).slice(1);
};

window.ENG=E;
})();
