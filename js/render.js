/* render.js — 画布渲染：地面、精灵、特效、伤害数字 */
(function(){
const R = {};
const E = window.ENG;
const W = window.WZ = window.WZ || {};

class Renderer{
  constructor(canvas){
    this.cv=canvas; this.ctx=canvas.getContext("2d");
    this.cam={x:0,y:0,w:0,h:0};
    this.shake=0; this.shakeX=0; this.shakeY=0;
    this.ground=null;
    this.quality="mid"; this.viewZoom=0.82;
    this.dpr=Math.min(window.devicePixelRatio||1, 2);
    this.resize();
    window.addEventListener("resize",()=>this.resize());
  }
  resize(){
    const w=window.innerWidth,h=window.innerHeight;
    this.cv.width=Math.floor(w*this.dpr); this.cv.height=Math.floor(h*this.dpr);
    this.cv.style.width=w+"px"; this.cv.style.height=h+"px";
    const touch=document.body.classList.contains("touch") && w<=1000 && h<=1000;
    this.zoom = touch ? Math.max(0.6,Math.min(1.2,this.viewZoom||0.82)) : 1;
    this.cam.w=w/this.zoom; this.cam.h=h/this.zoom;
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.world) this.buildGround(this.world.map);
  }
  buildGround(map){
    this.world = this.world||{};
    const W0=this.world.w, H0=this.world.h;
    const pal=map.palette;
    const c=document.createElement("canvas");
    c.width=W0; c.height=H0;
    const g=c.getContext("2d");
    const grad=g.createLinearGradient(0,0,W0*0.4,H0);
    grad.addColorStop(0,pal.top); grad.addColorStop(1,pal.bottom);
    g.fillStyle=grad; g.fillRect(0,0,W0,H0);
    // 场景背景素材（Map\Back 导出）
    const bgs=map.bg||[];
    const softCache=this._softCache||(this._softCache={});
    const soft=(src)=>{
      if(softCache[src])return softCache[src];
      const rec=ENG.loadImage(src);
      if(!rec||!rec.ready)return null;
      const cv=document.createElement("canvas");
      cv.width=rec.img.width; cv.height=rec.img.height;
      const c2=cv.getContext("2d");
      c2.drawImage(rec.img,0,0);
      c2.globalCompositeOperation="destination-in";
      const lg=c2.createLinearGradient(0,0,0,cv.height);
      lg.addColorStop(0,"rgba(0,0,0,0.05)"); lg.addColorStop(0.35,"rgba(0,0,0,1)"); lg.addColorStop(1,"rgba(0,0,0,0.1)");
      c2.fillStyle=lg; c2.fillRect(0,0,cv.width,cv.height);
      const rg=c2.createLinearGradient(0,0,cv.width,0);
      rg.addColorStop(0,"rgba(0,0,0,0)"); rg.addColorStop(0.2,"rgba(0,0,0,1)"); rg.addColorStop(0.8,"rgba(0,0,0,1)"); rg.addColorStop(1,"rgba(0,0,0,0)");
      c2.globalCompositeOperation="destination-in";
      c2.fillStyle=rg; c2.fillRect(0,0,cv.width,cv.height);
      softCache[src]=cv; return cv;
    };
    for(const b of bgs){
      const cv=soft(b.s); if(!cv)continue;
      const sc=b.scale||1, iw=cv.width*sc, ih=cv.height*sc;
      g.globalAlpha=b.a==null?0.45:b.a;
      g.drawImage(cv,(b.x||0)*W0,(b.y||0)*H0,iw,ih);
      g.globalAlpha=1;
    }
    // 斑驳纹理
    const seedRand=(s)=>{let x=s;return()=>{x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;}};
    const rnd=seedRand(map.id.length*7919+13);
    for(let i=0;i<1400;i++){
      const x=rnd()*W0,y=rnd()*H0,r=8+rnd()*46;
      g.globalAlpha=0.028+rnd()*0.04;
      g.fillStyle= rnd()>0.5? pal.grid : "#ffffff";
      g.beginPath(); g.ellipse(x,y,r,r*0.6,rnd()*3,0,Math.PI*2); g.fill();
    }
    // 主题装饰
    if(map.theme==="snow"){
      for(let i=0;i<90;i++){
        const x=rnd()*W0,y=rnd()*H0,r=40+rnd()*150;
        g.globalAlpha=0.10+rnd()*0.12; g.fillStyle="#ffffff";
        g.beginPath(); g.ellipse(x,y,r,r*0.42,rnd()*0.6-0.3,0,Math.PI*2); g.fill();
      }
      for(let i=0;i<26;i++){
        const x=rnd()*W0,y=rnd()*H0,r=50+rnd()*140;
        g.globalAlpha=0.16+rnd()*0.12; g.fillStyle="#a9d8ff";
        g.beginPath(); g.ellipse(x,y,r,r*0.5,rnd()*3,0,Math.PI*2); g.fill();
        g.globalAlpha=0.30; g.strokeStyle="#e6f6ff"; g.lineWidth=2; g.stroke();
      }
      // 雪堆：硬边 + 投影
      for(let i=0;i<40;i++){
        const x=rnd()*W0,y=rnd()*H0,r=50+rnd()*120;
        g.globalAlpha=0.55; g.fillStyle="#f7fbff";
        g.beginPath(); g.ellipse(x,y,r,r*0.38,0,Math.PI,Math.PI*2); g.fill();
        g.globalAlpha=0.18; g.fillStyle="#7f9dbb";
        g.beginPath(); g.ellipse(x,y+3,r,r*0.30,0,0,Math.PI); g.fill();
      }
    } else if(map.theme==="desert"){
      for(let i=0;i<70;i++){
        const x=rnd()*W0,y=rnd()*H0,r=60+rnd()*180;
        g.globalAlpha=0.07+rnd()*0.09; g.fillStyle= rnd()>0.5?"#f2d9a4":"#7d5c2e";
        g.beginPath(); g.ellipse(x,y,r,r*0.22,0,0,Math.PI*2); g.fill();
      }
    } else if(map.theme==="tower"){
      // 石板地面
      const TS=96;
      for(let ty=0;ty<H0;ty+=TS){
        for(let tx=0;tx<W0;tx+=TS){
          const v=rnd();
          g.globalAlpha=1;
          g.fillStyle= v>0.72? "#2b2140" : v>0.38? "#251b38":"#1f1730";
          g.fillRect(tx,ty,TS,TS);
          g.globalAlpha=0.10+rnd()*0.10; g.fillStyle="#8f7bc4";
          g.fillRect(tx+2,ty+2,TS-4,3);
        }
      }
      g.globalAlpha=0.55; g.strokeStyle="#0a0612"; g.lineWidth=4;
      for(let y=0;y<H0;y+=TS){ g.beginPath(); g.moveTo(0,y); g.lineTo(W0,y); g.stroke(); }
      for(let x=0;x<W0;x+=TS){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,H0); g.stroke(); }
      g.globalAlpha=0.18; g.strokeStyle="#b79cff"; g.lineWidth=1;
      for(let i=0;i<26;i++){
        const x=Math.floor(rnd()*(W0/96))*96, y=Math.floor(rnd()*(H0/96))*96;
        g.beginPath(); g.moveTo(x+8,y+8); g.lineTo(x+40+rnd()*40,y+30+rnd()*50); g.stroke();
      }
    } else {
      for(let i=0;i<120;i++){
        const x=rnd()*W0,y=rnd()*H0,r=3+rnd()*10;
        g.globalAlpha=0.10+rnd()*0.14; g.fillStyle= rnd()>0.6?"#8fe0a0":"#1b3a28";
        g.beginPath(); g.ellipse(x,y,r,r*0.7,0,0,Math.PI*2); g.fill();
      }
    }
    g.globalAlpha=1;
    // 网格
    g.strokeStyle=pal.grid; g.globalAlpha=0.25; g.lineWidth=1;
    for(let x=0;x<W0;x+=64){ g.beginPath();g.moveTo(x,0);g.lineTo(x,H0);g.stroke(); }
    for(let y=0;y<H0;y+=64){ g.beginPath();g.moveTo(0,y);g.lineTo(W0,y);g.stroke(); }
    g.globalAlpha=1;
    // 边界
    g.strokeStyle=pal.accent; g.lineWidth=6; g.globalAlpha=0.5;
    g.strokeRect(3,3,W0-6,H0-6); g.globalAlpha=1;
    this.ground=c;
  }
  setWorld(w,h,map){
    this.world={w,h,map}; this.buildGround(map);
    const th=map.theme||"forest";
    const n= th==="snow"?150: th==="desert"?90: th==="tower"?70:60;
    let seed=map.id.length*104729+7;
    const rr=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    this.weather={theme:th,t:0,list:[]};
    for(let i=0;i<n;i++) this.weather.list.push({x:rr()*w,y:rr()*h,s: th==="snow"?1.8+rr()*2.8:0.8+rr()*2,
      vx: th==="snow"?-22-rr()*26: th==="desert"?38+rr()*30: (rr()-0.5)*16,
      vy: th==="snow"?42+rr()*46: th==="desert"?(rr()-0.5)*10: th==="tower"?-26-rr()*26:(rr()-0.5)*8,
      a: th==="snow"?0.55+rr()*0.45:0.25+rr()*0.5, ph:rr()*6.28});
  }
  shakeAdd(v){ this.shake=Math.min(24,this.shake+v); }
  update(dt){
    if(this.weather) this.weather.t+=dt;
    if(this.shake>0){
      this.shake=Math.max(0,this.shake-dt*60);
      this.shakeX=(Math.random()-0.5)*this.shake;
      this.shakeY=(Math.random()-0.5)*this.shake;
    } else { this.shakeX=this.shakeY=0; }
  }
  follow(x,y,dt,world){
    const tx=E.clamp(x-this.cam.w/2,0,Math.max(0,world.w-this.cam.w));
    // 手机横屏高度较矮：主角脚底锚点下移，避免 300px 立绘头部被裁
    const fy=E.clamp(246/this.cam.h,0.5,0.92);
    const ty=E.clamp(y-this.cam.h*fy,0,Math.max(0,world.h-this.cam.h));
    const k=Math.min(1,dt*12);
    this.cam.x=E.lerp(this.cam.x,tx,k); this.cam.y=E.lerp(this.cam.y,ty,k);
  }
  begin(){
    const ctx=this.ctx;
    ctx.save();
    ctx.clearRect(0,0,this.cam.w,this.cam.h);
    const z=this.zoom||1;
    ctx.scale(z,z);
    ctx.translate(-Math.round(this.cam.x)+this.shakeX/z,-Math.round(this.cam.y)+this.shakeY/z);
  }
  end(){ this.drawWeather(); this.ctx.restore(); }
  drawWeather(){
    const w=this.weather; if(!w)return;
    const ctx=this.ctx, W=this.world.w, H=this.world.h;
    const th=w.theme;
    const col= th==="snow"?"#ffffff": th==="desert"?"#f0dcae": th==="tower"?"#c0a2ff":"#a9f0b4";
    ctx.save(); ctx.fillStyle=col;
    for(const p of w.list){
      let x=p.x+w.t*p.vx+p.vx, y=p.y+w.t*p.vy+p.vy;
      x=((x%W)+W)%W; y=((y%H)+H)%H;
      ctx.globalAlpha=p.a*(th==="forest"?0.5:1);
      const sway=Math.sin(w.t*1.7+p.ph)*(th==="snow"?9:4);
      ctx.beginPath(); ctx.arc(x+sway,y,p.s,0,6.2832); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.restore();
  }
  toScreen(wx,wy){ const z=this.zoom||1; return {x:(wx-this.cam.x)*z+this.shakeX, y:(wy-this.cam.y)*z+this.shakeY}; }
  toWorld(sx,sy){ const z=this.zoom||1, d=this.dpr||1; return {x:sx/d/z+this.cam.x-this.shakeX/z, y:sy/d/z+this.cam.y-this.shakeY/z}; }

  drawGround(){
    if(!this.ground)return;
    const ctx=this.ctx;
    ctx.drawImage(this.ground,0,0);
  }
  drawShadow(x,y,w,h,alpha){
    const ctx=this.ctx;
    ctx.save(); ctx.globalAlpha=alpha||0.28; ctx.fillStyle="#000";
    ctx.beginPath(); ctx.ellipse(x,y,w*0.42,h*0.16,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  drawMobFrame(frame,x,y,scale,flip,tint,alpha){
    if(!frame||!frame.img)return;
    const rec=frame.img;
    if(!rec.ready||rec.error)return;
    const ctx=this.ctx;
    ctx.save();
    ctx.globalAlpha=alpha==null?1:alpha;
    const w=frame.w*scale,h=frame.h*scale;
    const dx=x-w/2, dy=y-h;
    if(flip){ ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0); }
    if(tint){ ctx.filter=tint; }
    ctx.drawImage(rec.img,dx,dy,w,h);
    if(tint){ ctx.filter="none"; }
    ctx.restore();
  }
  drawFx(frame,x,y,scale,flip,alpha,glow,angle){
    if(!frame)return;
    const parts=Array.isArray(frame)?frame:(frame.img?[frame]:null);
    if(!parts||!parts.length)return;
    const ctx=this.ctx, s=scale||1;
    let bx=1e9,by=1e9,bx2=-1e9,by2=-1e9;
    for(const p of parts){
      const rec=p.img||(window.ENG&&ENG.loadImage(p.s));
      if(!rec||!rec.ready||rec.error)continue;
      const w=(p.w||rec.width)*s,h=(p.h||rec.height)*s, ox=(p.ox||0)*s, oy=(p.oy||0)*s;
      bx=Math.min(bx,x-ox); by=Math.min(by,y-oy); bx2=Math.max(bx2,x-ox+w); by2=Math.max(by2,y-oy+h);
    }
    if(bx2<bx)return;
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    if(glow&&!window.__plainFx){
      const cx=(bx+bx2)/2, cy=(by+by2)/2, rad=Math.min(360,Math.max(8,Math.max(bx2-bx,by2-by)*0.35));
      const g=ctx.createRadialGradient(cx,cy,rad*0.15,cx,cy,rad);
      g.addColorStop(0,glow+"55"); g.addColorStop(0.45,glow+"16"); g.addColorStop(1,glow+"00");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=alpha==null?1:alpha;
    // 不使用 ctx.filter：部分 Canvas 实现下会卡死，用 lighter 叠画代替提亮
    if(angle){ ctx.translate(x,y); ctx.rotate(angle); ctx.translate(-x,-y); }
    if(flip){ ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0); }
    const sorted=parts.slice().sort((a,b)=>(a.z||0)-(b.z||0));
    for(const p of sorted){
      const rec=p.img||(window.ENG&&ENG.loadImage(p.s));
      if(!rec||!rec.ready||rec.error)continue;
      const w=(p.w||rec.width)*s,h=(p.h||rec.height)*s, ox=(p.ox||0)*s, oy=(p.oy||0)*s;
      ctx.drawImage(rec.img,x-ox,y-oy,w,h);
      ctx.globalAlpha=(alpha==null?1:alpha)*0.18;
      ctx.drawImage(rec.img,x-ox,y-oy,w,h);
      ctx.globalAlpha=alpha==null?1:alpha;
    }
    ctx.restore();
  }
  drawComposite(cv,x,y,ax,ay,scale,flip,alpha){
    if(!cv)return;
    const ctx=this.ctx;
    ctx.save();
    ctx.globalAlpha=alpha==null?1:alpha;
    if(flip){ ctx.translate(x,0); ctx.scale(-1,1); ctx.translate(-x,0); }
    ctx.drawImage(cv,x-ax*scale,y-ay*scale,cv.width*scale,cv.height*scale);
    ctx.restore();
  }
  // 血条
  drawBar(x,y,w,ratio,color,bg){
    const ctx=this.ctx;
    ctx.save();
    ctx.fillStyle=bg||"rgba(0,0,0,.6)";
    ctx.fillRect(x-w/2,y,w,4);
    ctx.fillStyle=color;
    ctx.fillRect(x-w/2,y,w*E.clamp(ratio,0,1),4);
    ctx.restore();
  }
  // 弧线斩击
  drawArc(x,y,ang,range,arc,color,alpha){
    const ctx=this.ctx;
    ctx.save(); ctx.globalAlpha=alpha==null?0.75:alpha;
    ctx.strokeStyle=color||"#fff"; ctx.lineWidth=6; ctx.lineCap="round";
    ctx.beginPath(); ctx.arc(x,y,range,ang-arc/2,ang+arc/2); ctx.stroke();
    ctx.globalAlpha=0.25; ctx.lineWidth=16; ctx.beginPath(); ctx.arc(x,y,range,ang-arc/2,ang+arc/2); ctx.stroke();
    ctx.restore();
  }
  drawCircle(x,y,r,color,alpha,fill){
    const ctx=this.ctx;
    ctx.save(); ctx.globalAlpha=alpha==null?1:alpha;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    if(fill){ ctx.fillStyle=color; ctx.fill(); } else { ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke(); }
    ctx.restore();
  }
  // 伤害皮肤数字（BasicEff/damageSkin）
  drawDamageSkin(skin,text,x,y,crit,alpha){
    const frames=skin&&(crit?skin.crit:skin.normal); if(!frames)return false;
    const str=String(text==null?"":text).replace(/[^0-9]/g,""); if(!str)return false;
    let maxH=1; for(const ch of str){ const f=frames[+ch]; if(f&&f.h>maxH)maxH=f.h; }
    const target=crit?28:20, sc=target/maxH;
    let total=0; for(const ch of str){ const f=frames[+ch]; if(f) total+=f.w*sc*0.9; }
    const ctx=this.ctx; let cx=x-total/2;
    ctx.save(); ctx.globalAlpha=alpha==null?1:alpha; ctx.imageSmoothingEnabled=false;
    for(const ch of str){
      const f=frames[+ch]; if(!f)continue;
      const rec=ENG.loadImage(f.s);
      if(!rec||!rec.ready||rec.error){ ctx.restore(); return false; }
      const w=f.w*sc, h=f.h*sc;
      ctx.drawImage(rec.img,cx,y-(f.oy||f.h)*sc,w,h);
      cx+=w*0.9;
    }
    ctx.restore(); return true;
  }
  drawText(x,y,text,color,size,alpha){
    const ctx=this.ctx;
    ctx.save(); ctx.globalAlpha=alpha==null?1:alpha;
    ctx.font="bold "+(size||14)+"px 'Microsoft YaHei',sans-serif";
    ctx.textAlign="center"; ctx.lineWidth=3; ctx.strokeStyle="rgba(0,0,0,.75)";
    ctx.strokeText(text,x,y); ctx.fillStyle=color||"#fff"; ctx.fillText(text,x,y);
    ctx.restore();
  }
}

R.Renderer=Renderer;
window.RENDER=R;
})();
