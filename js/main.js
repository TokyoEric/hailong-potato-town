window.__DL=window.__DL||[];
/* main.js — 启动与主循环 */
(function(){
const E=window.ENG,D=window.GD;
window.addEventListener("DOMContentLoaded",async()=>{
  E.save.load();
  const __q0=new URLSearchParams(location.search); const __fast=__q0.get("fastload")==="1"; const __noassets=__q0.get("noassets")==="1";
  const canvas=document.getElementById("game");
  const renderer=new window.RENDER.Renderer(canvas);
  const game=new window.GAME(renderer);
  window.game=game;
  E.initInput(canvas);
  window.UI.init();
  const __bgPre=[];

  // 预加载英雄素材
  if(window.WZ&&window.WZ.heroes&&!__noassets){
    const list=[];
    for(const k in window.WZ.heroes){
      const h=window.WZ.heroes[k];
      if(!h.anims)continue;
      for(const a in h.anims) for(const f of h.anims[a]) for(const part of f.parts) list.push(part.s);
    }
    const uniq=[...new Set(list)];
    await E.preloadChunked(uniq, 32, 0, p=>{});
    window._previewCache={};
    // v9：启动只预合成已解锁角色（全量 18 个约 198 个 canvas / 68MB），其余在选人界面按需生成
    const _unlockedNow=(window.ENG&&ENG.save&&ENG.save.data&&ENG.save.data.unlockedChars)||["ray","elin","luna"];
    for(const k in window.WZ.heroes){
      if(_unlockedNow.indexOf(k)>=0) window._previewCache[k]=window.buildHeroArt(k);
    }
  }
  // 预加载怪物素材
  const mobList=[];
  if(window.WZ&&window.WZ.mob){
    for(const id in window.WZ.mob){
      const m=window.WZ.mob[id];
      if(!m.a)continue;
      for(const a in m.a) for(const f of m.a[a]) mobList.push(f.s);
    }
  }
  if(!__fast) __bgPre.push(()=>E.preloadChunked([...new Set(mobList)], 16, 45, null, {background:true}));
  // 预加载技能特效
  const fxList=[];
  if(window.WZ&&window.WZ.fx){
    for(const k in window.WZ.fx){
      const f=window.WZ.fx[k];
      for(const fr of (f.frames||[])) for(const q of fr) fxList.push(q.s);
    }
  }
  if(window.WZ&&window.WZ.sfx){
    for(const k in window.WZ.sfx){
      for(const role in window.WZ.sfx[k]){
        for(const fr of (window.WZ.sfx[k][role].frames||[])) for(const q of fr) fxList.push(q.s);
      }
    }
  }
  if(!__fast) __bgPre.push(()=>E.preloadChunked([...new Set(fxList)], 16, 45, null, {background:true}));
  // 预加载武器/弹幕/命中特效
  const atkList=[];
  if(window.WZ&&window.WZ.atk){
    for(const k in window.WZ.atk) for(const role in window.WZ.atk[k]) for(const fr of (window.WZ.atk[k][role].frames||[])) for(const q of fr) atkList.push(q.s);
  }
  if(window.WZ&&window.WZ.mobfx){
    for(const k in window.WZ.mobfx) for(const fr of (window.WZ.mobfx[k].frames||[])) for(const q of fr) atkList.push(q.s);
  }
  if(atkList.length&&!__fast) __bgPre.push(()=>E.preloadChunked([...new Set(atkList)], 16, 45, null, {background:true}));
  // 预加载伤害皮肤（v7：只加载当前装备的那一款，641 款皮肤按需加载）
  const skinList=[];
  {
    const sv=(window.E&&E.save&&E.save.data)||{}; const sid=sv.skin||"1";
    const pk=(window.WZ&&window.WZ.dmgSkins)?window.WZ.dmgSkins[sid]:null;
    if(pk) for(const role of ["normal","crit"]) for(const f of (pk[role]||[])) skinList.push(f.s);
  }
  if(skinList.length&&!__noassets) await E.preloadAll([...new Set(skinList)], p=>{});
  // 预加载 NPC 立绘（杂货商人 米娜 · 1001100）
  const npcList=[];
  if(window.WZ&&window.WZ.npc){
    for(const k in window.WZ.npc){ const n=window.WZ.npc[k]; for(const a in (n.anims||{})) for(const f of n.anims[a]) npcList.push(f.s); }
  }
  if(npcList.length&&!__noassets) await E.preloadAll([...new Set(npcList)], p=>{});
  // 预加载场景背景
  const bgList=[];
  for(const mp of (window.GD?window.GD.MAPS:[])) for(const b of (mp.bg||[])) bgList.push(b.s);
  if(bgList.length) await E.preloadAll([...new Set(bgList)], p=>{});
  // 大型素材（怪物/特效/弹幕）延后到首屏之后分批加载，避免拖慢开局
  if(__bgPre.length) setTimeout(()=>{ for(const f of __bgPre) try{ f(); }catch(e){} }, 2500);

  // ---- 调试入口：?screen=char|map|codex / ?play=ray&map=forest
  try{
    const q=new URLSearchParams(location.search); if(q.get("plainfx")==="1")window.__plainFx=1;
    const sc=q.get("screen"), pl=q.get("play");
    if(pl){ window.UI.selChar=pl; window.UI.selMap=q.get("map")||"forest";
      if(q.get("orient")){ window.UI.opts.orient=q.get("orient"); window.UI.saveOpts(); }
      if(q.get("view")){ window.UI.opts.view=parseFloat(q.get("view"))||0.82; window.UI.saveOpts(); }
      if(q.get("daily")==="1"){ const d=D.dailyToday(); window.UI._daily=d; window.UI.selChar=d.char; window.UI.selMap=d.map; }
      if(q.get("endless")==="1"){ const be=document.getElementById("opt-endless"); if(be) be.checked=true; }
      window.UI.startRun();
      if(q.get("god")==="1") game.player.takeDamage=()=>0;
      if(q.get("gold")==="1") game.player.gold=1200;
      if(q.get("startwave")){ const w=parseInt(q.get("startwave")); if(w>1){ game.beginWave(w); game.totalKills=game.totalKills||0; } }
      const __cheat=q.get("cheat");
      if(__cheat==="skins"){ E.save.data.skins={}; for(const sk of (D.DMG_SKINS||[])) E.save.data.skins[sk.id]=1; E.save.data.skin=q.get("skin")||"1459"; E.save.write(); window.UI.loadOpts&&window.UI.loadOpts(); /* v7.1：调试换肤也要先预载数字帧，否则伤害数字会退回纯文本 */ if(window.UI&&UI.applySkin) UI.applySkin(E.save.data.skin); }
      if(__cheat==="relic"){ for(let i=0;i<3;i++) game.grantRelic(); game.grantCard(); game.spawnFx("bigburst",game.player.x,game.player.y,1.2); }
      if(__cheat==="cards"){ for(let i=0;i<12;i++) game.grantCard(); }
      if(__cheat==="skills"){ ["whirl","arrowrain","meteor","shield"].forEach(id=>game.player.addSkill(id)); game.player.recompute(); window.UI.updateHUD(true); }
      if(__cheat==="win"){ game.wave=30; game.victory(); }
      if(__cheat==="talents"){ E.save.data.bank=5000; E.save.write(); }
      if(__cheat==="tal"){ game.player.applyTalents({talents:{t_hp:3,t_dmg:2,t_spd:2}}); game.player.recompute(); game.player.hp=game.player.maxHp; }
      if(__cheat==="npc"){ const o=(game.objects||[]).find(o=>o.kind==="npc"); if(o){ o.x=game.player.x+40; o.y=game.player.y; window.UI.openNpcShop(game); } }
      if(__cheat==="fx"){ ["whirl","arrowrain","meteor","shadow","shield","heal","slow","summon","shockwave","nova","explosion","bigburst","holy"].forEach((n,i)=>game.spawnFx(n,game.player.x+Math.cos(i)*120,game.player.y+Math.sin(i)*120,1)); }
      if(q.get("tapcast")==="1"){
        setTimeout(()=>{
          try{
            const el=document.querySelector("#skill-slots .slot:not(.empty)");
            const sk=game.player.skills[0];
            if(el){
              const rc=el.getBoundingClientRect();
              el.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true,clientX:rc.x+rc.width/2,clientY:rc.y+rc.height/2,pointerType:"touch"}));
            }
            const pre=document.createElement("pre"); pre.id="__tap";
            pre.textContent=JSON.stringify({found:!!el,cls:el?el.className:null,cool:sk?+sk.cool.toFixed(2):null,skills:game.player.skills.map(x=>x.id)});
            document.body.appendChild(pre);
          }catch(e){ const p=document.createElement("pre");p.id="__tap";p.textContent="ERR "+e.message;document.body.appendChild(p); }
        },900);
      }
      if(q.get("cast")){ const cid=q.get("cast"); E.mouse.x=game.r.cv.width/(game.r.dpr||1)/2; E.mouse.y=game.r.cv.height/(game.r.dpr||1)/2; const idx=game.player.skills.findIndex(s=>s.id===cid); window.__CASTX={cid,idx,skills:game.player.skills.map(s=>s.id)}; if(idx>=0) game.castSkill(idx); window.__CASTX.after=game.player.skills.map(s=>s.id+":"+s.cool); }
      if(q.get("speartest")==="1"){
        game.enemies=[]; game.player.weapons=[]; game.spawnOne(); const e=game.enemies[game.enemies.length-1];
        if(e){ e.x=game.player.x+70; e.y=game.player.y; e.hp=e.maxHp=99999; const old=e.takeDamage.bind(e); const log=[]; e.takeDamage=(d,...a)=>{ log.push(+d.toFixed(2)); return old(d,...a); }; window.__SPEARLOG=log; game.spearCombo(0,130,26,50,2); for(let i=0;i<70;i++) game.update(1/60); window.__SPEARTEST={hits:log.length,log,fx:game.fx.length}; }
        const pre=document.createElement("pre"); pre.id="__spear"; pre.textContent=JSON.stringify(window.__SPEARTEST||null); document.body.appendChild(pre);
      }
      if(q.get("boomtest")==="1"){
        const p=game.player; game.enemies=[]; game.spawnOne(); const e=game.enemies[game.enemies.length-1];
        if(e){ e.x=p.x+150; e.y=p.y; e.hp=e.maxHp=99999; }
        const pr=game.spawnProjectile({x:p.x,y:p.y,vx:560,vy:0,kind:"boomerang",life:300/560*2.2+0.6,pierce:99,radius:10,fx:"shuriken",maxDist:300});
        game.projectiles=[pr]; let min=1e9,ret=false,hits=0,near=0,retX=0,retT=0; if(e){const old=e.takeDamage.bind(e);e.takeDamage=(d,...a)=>{hits++;return old(d,...a);};}
        for(let i=0;i<240;i++){ game.updateProjectiles(1/60); if(e&&Math.hypot(pr.x-e.x,pr.y-(e.y-e.r*0.5))<e.r+pr.radius)near++; if(pr.returning){ret=true; if(!retX)retX=Math.round(pr.x); retT=i/60;} min=Math.min(min,Math.hypot(pr.x-p.x,pr.y-p.y)); if(pr.life<=0)break; }
        const pre=document.createElement("pre"); pre.id="__boom"; pre.textContent=JSON.stringify({ret,min:+min.toFixed(1),hits,near,life:+pr.life.toFixed(2),x:Math.round(pr.x),y:Math.round(pr.y),enemyHp:e?Math.round(e.hp):0,kind:pr.kind,hit:pr.hit.size,hitBack:pr.hitBack.size,retFlag:pr.returning,px:Math.round(p.x),py:Math.round(p.y),ex:Math.round(e.x),ey:Math.round(e.y),retX,retT:+retT.toFixed(2),vx:+pr.vx.toFixed(1),vy:+pr.vy.toFixed(1),s0:+pr.speed0.toFixed(1),md:pr.maxDist}); document.body.appendChild(pre);
      }
      const __sim=parseFloat(q.get("sim")||"0");
      if(__sim>0){
        const steps=Math.round(__sim*60), __ap=q.get("autopick")!=="0", __bot=q.get("bot")==="1";
        for(let i=0;i<steps;i++){
          if(__bot){
            const p=game.player; let best=null,bd=1e9;
            for(const e of game.enemies){ if(e.dead)continue; const d=Math.hypot(p.x-e.x,p.y-e.y); if(d<bd){bd=d;best=e;} }
            let ax=(game.world.w/2-p.x)*0.12, ay=(game.world.h/2-p.y)*0.12;
            if(best){
              const fx=(p.x-best.x)/(bd||1), fy=(p.y-best.y)/(bd||1);
              const t=Math.sin(i*0.01)*0.9;
              ax+=fx*1.8 - fy*t; ay+=fy*1.8 + fx*t;
            }
            if(bd<70&&i%40===0){ game.player.aim=Math.atan2(p.y-(best?best.y:0),p.x-(best?best.x:0)); game.castSkill(99); }
            window.__B={ax:+ax.toFixed(1),ay:+ay.toFixed(1),bd:Math.round(bd),hp:Math.round(p.hp),paused:game.paused,kA:E.keys.KeyA};
            E.keys.KeyA=ax<-0.05; E.keys.KeyD=ax>0.05; E.keys.KeyW=ay<-0.05; E.keys.KeyS=ay>0.05;
            if(i%30===0){ for(let s=0;s<4;s++) game.castSkill(s); }
          }
          if(__ap&&game.pendingLevels>0){ game.pickCard(window.UI.drawCards(1)[0]); }
          if(__ap&&game.paused)game.paused=false;
          if(__bot&&game.state==="shop"&&__ap){ for(let k=0;k<4;k++) window.UI.buyOffer(k); game.nextWave(); }
          if(game.state!=="playing")break;
          game.update(1/60);
        }
        E.keys.KeyA=E.keys.KeyD=E.keys.KeyW=E.keys.KeyS=false;
        if(q.get("fxshot")==="1"){ const names=["whirl","arrowrain","meteor","shadow","shield","heal","slow","summon","shockwave","nova","explosion","bigburst","holy"];
          names.forEach((n,i)=>game.spawnFx(n,game.player.x+Math.cos(i/names.length*6.28)*150,game.player.y+Math.sin(i/names.length*6.28)*150,0.9));
          game.updateFx(0.001); }
        if(q.get("skillonly")){ const n=q.get("skillonly"); game.spawnSkillFx(n,game.player.x+120,game.player.y,110,{hit:true}); { const fr=window.WZ.sfx[n].main.frames; const d=(fr[0][0]&&fr[0][0].d)||55; game.updateFx((fr.length*0.45*d)/1000); } }
        if(q.get("skillshot")==="1"){ const ids=["whirl","arrowrain","meteor","shadow","shield","heal","timeslow","summon","shockwave"];
          ids.forEach((n,i)=>{ game.spawnSkillFx(n,game.player.x+Math.cos(i/ids.length*6.28)*170,game.player.y+Math.sin(i/ids.length*6.28)*170,110,{hit:true}); });
          { let t=0; for(const n of ids){ const fr=window.WZ.sfx[n].main.frames; const d=(fr[0][0]&&fr[0][0].d)||55; t=Math.max(t,(fr.length*0.45*d)/1000); } game.updateFx(t); } }
        if(q.get("atkonly")){ const k=q.get("atkonly"), role=q.get("atkrole")||"effect";
          const layer=window.WZ.atk[k]&&window.WZ.atk[k][role];
          if(layer){ game.spawnAtkFx(k,role,game.player.x+130,game.player.y-10,90,1,false,0);
            const fr=layer.frames, d=(fr[0][0]&&fr[0][0].d)||55; game.updateFx((fr.length*0.45*d)/1000); } }
        if(q.get("mobonly")){ const k=q.get("mobonly"); game.spawnMobFx(k,game.player.x+140,game.player.y,100); game.updateFx(0.3); }
        if(q.get("facecheck")==="1"){ const p=game.player, arr=(game.enemies||[]).filter(e=>!e.dead).slice(0,2);
          if(arr[0]){ arr[0].x=p.x+150; arr[0].y=p.y; arr[0].face=-1; }
          if(arr[1]){ arr[1].x=p.x-150; arr[1].y=p.y; arr[1].face=1; } }
        if(q.get("atkshot")==="1"){ const ids=Object.keys(window.WZ.atk||{});
          ids.forEach((n,i)=>{ const role=(window.WZ.atk[n].effect?"effect":(window.WZ.atk[n].ball?"ball":"hit"));
            game.spawnAtkFx(n,role,game.player.x+Math.cos(i/ids.length*6.28)*185,game.player.y+Math.sin(i/ids.length*6.28)*185,70,1,false,0); });
          { let t=0; for(const n of ids){ const role=(window.WZ.atk[n].effect?"effect":(window.WZ.atk[n].ball?"ball":"hit")); const fr=window.WZ.atk[n][role].frames; const d=(fr[0][0]&&fr[0][0].d)||55; t=Math.max(t,(fr.length*0.4*d)/1000); } game.updateFx(t); } }
        if(q.get("hitshot")==="1"){ const ids=Object.keys(window.WZ.atk||{}).filter(n=>window.WZ.atk[n].hit);
          ids.forEach((n,i)=>{ game.spawnHitFx(n,game.player.x+Math.cos(i/ids.length*6.28)*185,game.player.y+Math.sin(i/ids.length*6.28)*185,1.2); });
          game.updateFx(0.12); }
        if(q.get("bossfx")==="1"){ const ids=Object.keys(window.WZ.mobfx||{});
          ids.forEach((n,i)=>{ game.spawnMobFx(n,game.player.x+Math.cos(i/ids.length*6.28)*170,game.player.y+Math.sin(i/ids.length*6.28)*170,90); });
          game.updateFx(0.3); }
        if(q.get("skinshot")==="1"){ const p=game.player; game.texts=[]; game.popup(p.x-30,p.y-95,"1289","#ffffff",false); game.popup(p.x+55,p.y-140,"34567","#ffd76a",true); game.render(); }
        game.render(); window.UI.updateHUD(true); }
      if(q.get("force")==="levelup"){ game.pendingLevels=Math.max(1,game.pendingLevels); window.UI.showLevelUp(game); }
      if(q.get("force")==="shop"){ game.state="shop"; window.UI.showShop(game); }
      if(q.get("force")==="levelup"){ game.pendingLevels=Math.max(1,game.pendingLevels); window.UI.showLevelUp(game); }
      if(q.get("force")==="shop"){ game.state="shop"; window.UI.showShop(game); }
      if(q.get("wave")){ const w=parseInt(q.get("wave")); if(w&&w>1) game.wave=w; }
    } else if(sc){ window.UI.showScreen(sc); if(sc==="char")window.UI.renderChars(); if(sc==="codex"&&q.get("tab")) window.UI.renderCodex(q.get("tab")); if(sc==="talent") window.UI.renderTalents(); }
    else { window.UI.showScreen("login"); }
    if(q.get("bounds")){ setTimeout(()=>{
      const out={};
      for(const k in (window._previewCache||{})){
        const art=window._previewCache[k]; const c=art&&art.frames&&art.frames.idle&&art.frames.idle[0];
        if(!c){out[k]="none";continue;}
        const g=c.getContext("2d"); const d=g.getImageData(0,0,c.width,c.height).data;
        let x0=1e9,y0=1e9,x1=-1,y1=-1;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3]; if(a>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
        out[k]=[x0,y0,x1,y1];
      }
      const pre=document.createElement("pre"); pre.id="__bounds"; pre.textContent=JSON.stringify(out); document.body.appendChild(pre);
    },800); }
    if(q.get("measure")){ setTimeout(()=>{
      const sels=q.get("measure").split(","); const out=[["viewport",innerWidth,innerHeight,visualViewport?Math.round(visualViewport.width):0,visualViewport?Math.round(visualViewport.height):0,devicePixelRatio]];
      for(const sel of sels){ const el=document.querySelector(sel); if(!el){out.push([sel,"none"]);continue;} const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); out.push([sel,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height),cs.display,cs.gridTemplateColumns.slice(0,60),hit?(hit.className||hit.tagName):""]); }
      const pre=document.createElement("pre"); pre.id="__measure"; pre.textContent=JSON.stringify(out); document.body.appendChild(pre);
    },600); }
  }catch(e){ console.log("NAV_ERR",e&&e.message,e&&e.stack); window.UI.showScreen("title"); }


  let __dbg=(new URLSearchParams(location.search)).get("debug");
  if(__dbg){ const d=document.createElement("pre"); d.id="__dbg"; d.style.cssText="position:fixed;left:0;bottom:0;color:#0f0;font:11px monospace;z-index:9999;background:#000a;padding:2px"; document.body.appendChild(d); }
  const __freeze=(new URLSearchParams(location.search)).get("freeze")==="1";
  let last=performance.now();
  function loop(now){
    const dt=Math.min(0.05,(now-last)/1000);
    last=now;
    if(!__freeze&&game.state==="playing"&&!game.paused&&!game.over){
      game.update(dt);
      game.render();
      window.UI.updateHUD();
    } else if(game.player){
      game.render();
    }
    if(__dbg&&game.player){ document.getElementById("__dbg").textContent=JSON.stringify({st:game.state,paused:game.paused,or:(window.UI&&window.UI.opts||{}).orient,aa:!!game.player.autoAim,hp:Math.round(game.player.hp),mhp:Math.round(game.player.stats.maxHp),wave:game.wave,left:+game.waveLeft.toFixed(1),en:game.enemies.length,sp:game.spawned,bud:game.budget,kills:game.totalKills,p:[Math.round(game.player.x),Math.round(game.player.y)],cam:[Math.round(game.r.cam.x),Math.round(game.r.cam.y),game.r.cam.w,game.r.cam.h],z:game.r.zoom,dpr:game.r.dpr,dl:window.__DL.slice(-3),bs:(window.__BS||[]).slice(-6),B:window.__B,rel:(game.player.relics||[]).map(r=>r.id),crd:(function(){const c=game.player.cards||{};return Object.keys(c).length+"|"+Object.values(c).map(v=>v.card.id+"x"+v.n).join(",");})(),bnd:Object.keys(game.player.bonds||{}).map(k=>k+":"+game.player.bonds[k].n).join(","),obj:(game.objects||[]).length,fx:(game.fx||[]).length,pj:game.projectiles.length,pb:game.projectiles.filter(p=>p.ball).length,p0:game.projectiles[0]?game.projectiles[0].kind+":"+(game.projectiles[0].ball?"ball":"noball"):"",bank:E.save.data.bank||0,spd:Math.round(Math.hypot(game.player.vx,game.player.vy)),nd:(function(){let b=1e9;for(const e of game.enemies){if(e.dead)continue;b=Math.min(b,Math.hypot(game.player.x-e.x,game.player.y-e.y));}return Math.round(b);})(),sk:game.player.skills.map(s=>s.id+":"+s.cool.toFixed(1)).join(","),cn:window.__CASTN||0,ce:(window.__CASTERR||"").slice(0,120),spn:window.__SPAWN||0,cx:window.__CASTX||null,qs:location.search,spl:window.__SPAWNLAST||null,pjn:window.__PJ||0,pjl:window.__PJLAST||null,frame:game.heroFrames&&game.heroFrames.frames?Object.keys(game.heroFrames.frames).map(k=>k+":"+game.heroFrames.frames[k].length).join(","):"none",tx:game.texts.length,txl:game.texts.slice(-2).map(x=>x.text),dmgopt:!!(window.UI&&window.UI.opts.damage),dsk:(E.getDmgSkin&&E.getDmgSkin())?E.getDmgSkin().id:null}); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
});
})();
