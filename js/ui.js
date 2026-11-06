/* ui.js — 界面：选人 / 选图 / HUD / 升级卡 / 商店 / 结算 / 图鉴 */
(function(){
const D=window.GD,E=window.ENG;
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

const UI={
  opts:{ volume:0.6, bgm:0.45, shake:true, damage:true, quality:"mid", view:0.82, orient:"portrait" },
  game:null,
  screen:"login",
  selChar:"ray", selMap:"forest", selDifficulty:"normal",

  init(){
    this.game=window.game;
    try{ const sd=E.save.data.lastDifficulty; if(D.DIFFICULTY_BY_ID&&D.DIFFICULTY_BY_ID[sd]) this.selDifficulty=sd; }catch(e){}
    this.loadOpts();
    this.initOrientation();
    $$("[data-action]").forEach(b=>b.addEventListener("click",()=>this.action(b.dataset.action)));
    $("#btn-to-map").addEventListener("click",()=>this.showScreen("map"));
    $("#btn-start-run").addEventListener("click",()=>this.startRun());
    $("#btn-pause").addEventListener("click",()=>this.pause());
    const bps=$("#btn-pause-settings"); if(bps) bps.addEventListener("click",()=>this.openSettings("pause"));
    const bcs=$("#btn-char-settings"); if(bcs) bcs.addEventListener("click",()=>this.openSettings("char"));
    const bsb=$("#btn-settings-back"); if(bsb) bsb.addEventListener("click",()=>this.closeSettings());
    const bcb=$("#btn-codex-back"); if(bcb) bcb.addEventListener("click",()=>{
      if(this._codexFrom==="settings"){ this._codexFrom=null; this.showScreen("settings"); }
      else { this._codexFrom=null; this.showScreen("title"); this.renderSaveLine(); }
    });
    const bd2=$("#btn-dash"); if(bd2) bd2.addEventListener("pointerdown",ev=>{
      ev.preventDefault();
      if(this.game&&this.game.state==="playing") this.game.castSkill(99);
    });
    const ss0=$("#skill-slots");
    if(ss0) ss0.addEventListener("pointerdown",ev=>{
      const slot=ev.target.closest(".slot"); if(!slot||!this.game)return;
      ev.preventDefault();
      const idx=Array.prototype.indexOf.call(ss0.children,slot);
      if(idx>=0) this.game.castSkill(idx);
    });

    /* ---------- 手机端：交易键（替代 E 键） ---------- */
    const bInt=$("#btn-interact");
    if(bInt) bInt.addEventListener("pointerdown",ev=>{
      ev.preventDefault(); ev.stopPropagation();
      const g=this.game;
      if(g&&this._npcNear&&g.state==="playing"&&!g.paused) this.openNpcShop(g);
    });
    /* 右侧轻点 NPC 也能交易（触屏） */
    E.onTapRight=(sx,sy)=>{
      const g=this.game;
      if(!g||!g.r||!g.state||g.state!=="playing"||g.paused||!this._npcObj) return;
      let w=null; try{ w=g.r.toWorld(sx,sy); }catch(e){ return; }
      if(!w) return;
      const d=Math.hypot(w.x-this._npcObj.x, w.y-this._npcObj.y);
      if(d<92) this.openNpcShop(g);
    };
    /* 设置里的皮肤图鉴 */
    const bSkin=$("#btn-open-skins");
    if(bSkin) bSkin.addEventListener("click",()=>this.openCodexTab("skin"));
    const bChars=$("#btn-open-charskins");
    if(bChars) bChars.addEventListener("click",()=>this.openCodexTab("charskin"));
    /* 动漫皮肤插件的皮肤默认解锁 */
    try{
      const sv=E.save.data; sv.skins=sv.skins||{};
      let ch=false;
      for(const sk of (D.DMG_SKINS||[])) if(sk.unlock&&sk.unlock.type==="free"&&!sv.skins[sk.id]){ sv.skins[sk.id]=1; ch=true; }
      if(ch){ E.save.write(); try{ this.loadOpts(); }catch(e){} }
    }catch(e){}
    /* 角色皮肤缩略图后台预载（不阻塞开局） */
    try{
      const _cs=[];
      for(const id of (window.WZ&&WZ.charSkinList||[])){ const sk=WZ.charSkins&&WZ.charSkins[id]; const f=sk&&sk.anims&&sk.anims.stand&&sk.anims.stand[0]; if(f&&f.s) _cs.push(f.s); }
      if(_cs.length&&E.preloadChunked) setTimeout(()=>{ E.preloadChunked([...new Set(_cs)],24,20,null,{background:true}).then(()=>{ if(this.screen==="char") this.renderChars(); if(this.screen==="codex"&&this._codexTab==="charskin") this.renderCodex("charskin"); }).catch(()=>{}); },2600);
    }catch(e){}
    const rf=$("#btn-rotate-full"); if(rf) rf.addEventListener("click",()=>this.ensureLandscape(true));
    document.body.addEventListener("click",()=>{ if(E.bgm&&!E.bgm.cur&&!this.game.over){ const bk=this.screen==="login"?"login":this.screen==="title"?"title":this.screen==="game"?this.mapBgmKey(this.selMap):"menu"; E.bgm.play(bk); } },{once:true});
    $("#btn-resume").addEventListener("click",()=>this.resume());
    $("#btn-quit").addEventListener("click",()=>{ $("#overlay-pause").classList.add("hidden"); location.reload(); });
    $("#btn-again").addEventListener("click",()=>{ $("#overlay-result").classList.add("hidden"); this.showScreen("char"); this.renderChars(); });
    $("#btn-home").addEventListener("click",()=>{ $("#overlay-result").classList.add("hidden"); this.showScreen("title"); this.renderSaveLine(); });
    $("#btn-reroll-levelup").addEventListener("click",()=>this.rerollLevelUp());
    $("#btn-reroll-shop").addEventListener("click",()=>this.rerollShop());
    $("#btn-next-wave").addEventListener("click",()=>{
      const nb=$("#btn-next-wave");
      if(this._npcShop){ this.hideShop(); nb.textContent="下一波 →"; this.game.paused=false; this.updateInteractBtn(); }
      else this.game.nextWave();
    });
    $("#btn-reset-save").addEventListener("click",()=>{ if(confirm("清除所有存档？")){ E.save.reset(); this.renderSaveLine(); alert("已清除"); } });
    $$("#codex-tabs .tab").forEach(t=>t.addEventListener("click",()=>{
      $$("#codex-tabs .tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active"); this.renderCodex(t.dataset.tab);
    }));
    $("#opt-volume").addEventListener("input",e=>{ this.opts.volume=e.target.value/100; E.audio.setVolume(this.opts.volume); this.saveOpts(); });
    $("#opt-shake").addEventListener("change",e=>{ this.opts.shake=e.target.checked; this.saveOpts(); });
    $("#opt-damage").addEventListener("change",e=>{ this.opts.damage=e.target.checked; this.saveOpts(); });
    $("#opt-quality").addEventListener("change",e=>{ this.opts.quality=e.target.value; this.saveOpts(); });
    const ov=$("#opt-view"); if(ov) ov.addEventListener("change",e=>{ this.opts.view=parseFloat(e.target.value)||0.82; this.saveOpts(); if(this.game&&this.game.r){ this.game.r.viewZoom=this.opts.view; this.game.r.resize(); } });
    const oo=$("#opt-orient"); if(oo) oo.addEventListener("change",e=>{ this.opts.orient=e.target.value; this.saveOpts(); if(this._applyOrient)this._applyOrient(); if(this.opts.orient==="landscape") this.ensureLandscape(true); });
    const ds=$("#opt-dmgskin"); if(ds) ds.addEventListener("change",e=>{ if(e.target.value) this.applySkin(e.target.value); });
    const ro=$("#btn-reset-opts"); if(ro) ro.addEventListener("click",()=>{ Object.assign(this.opts,{volume:0.6,bgm:0.45,shake:true,damage:true,quality:"mid",view:0.82,orient:"portrait"}); this.saveOpts(); this.loadOpts(); if(this._applyOrient)this._applyOrient(); this.toast&&this.toast("已恢复默认设置"); });
    const bg=$("#opt-bgm"); if(bg) bg.addEventListener("input",e=>{ this.opts.bgm=e.target.value/100; E.bgm.setVolume(this.opts.bgm); this.saveOpts(); });
    const be=$("#btn-endless"); if(be) be.addEventListener("click",()=>{ $("#overlay-result").classList.add("hidden"); this.game.continueEndless(); this.updateHUD(true); if(E.bgm) E.bgm.play(this.mapBgmKey(this.selMap)); });
    window.addEventListener("keydown",e=>{
      if(e.code==="Escape"){ if(this.game&&!this.game.over){ this.game.paused?this.resume():this.pause(); } }
    });
  },

  /* ---------- 触屏 / 强制横屏 ---------- */
  initOrientation(){
    this.isTouch=/[?&]touch=1/.test(location.search)||(window.matchMedia&&matchMedia("(pointer:coarse)").matches)||navigator.maxTouchPoints>0;
    const apply=()=>{
      const portrait=window.innerHeight>window.innerWidth;
      document.body.classList.toggle("touch",!!this.isTouch);
      document.body.classList.toggle("portrait",portrait);
      document.body.classList.toggle("landscape",!portrait);
      const mode=this.opts.orient||"portrait";
      document.body.classList.toggle("want-landscape",!!this.isTouch&&mode==="landscape");
      this.portrait=portrait;
      const hint=document.querySelector("#screen-title .hint");
      if(hint) hint.textContent=this.isTouch?"左侧拖动移动 · 自动瞄准 · 右下技能键 · 冲刺键在技能上方":"WASD 移动 · 鼠标瞄准 · 空格冲刺 · 1~4 技能 · ESC 暂停";
      if(this.game&&this.game.state==="playing"){
        const needLandscape=!!this.isTouch&&mode==="landscape"&&portrait;
        if(needLandscape&&!this.game.paused){ this._pausedForLandscape=true; this.game.paused=true; }
        else if(!needLandscape&&this._pausedForLandscape){ this._pausedForLandscape=false; this.game.paused=false; }
      }
      if(this.game&&this.game.r){
        this.game.r.viewZoom=parseFloat(this.opts.view)||0.82;
        this.game.r.resize();
      }
    };
    this._applyOrient=apply; apply();
    window.addEventListener("resize",apply);
    window.addEventListener("orientationchange",()=>setTimeout(apply,180));
    document.addEventListener("fullscreenchange",()=>setTimeout(apply,100));
    try{ if(screen.orientation&&screen.orientation.addEventListener) screen.orientation.addEventListener("change",()=>setTimeout(apply,100)); }catch(e){}
  },
  ensureLandscape(showHint){
    if(!this.isTouch) return;
    const lock=()=>{ try{ const o=screen.orientation; if(o&&o.lock){ const q=o.lock("landscape"); if(q&&q.catch) q.catch(()=>{}); } }catch(e){} };
    try{
      const el=document.documentElement;
      if(!document.fullscreenElement&&el.requestFullscreen){
        const q=el.requestFullscreen({navigationUI:"hide"});
        if(q&&q.then) q.then(()=>{lock();setTimeout(()=>this._applyOrient&&this._applyOrient(),180);}).catch(lock);
        else lock();
      }else lock();
    }catch(e){ lock(); }
    if(showHint) setTimeout(()=>{ if(this._applyOrient)this._applyOrient(); if(window.innerHeight>window.innerWidth&&this.toast) this.toast("请把手机横过来"); },420);
  },

  loadOpts(){
    try{ const s=JSON.parse(localStorage.getItem("seadragon_opts")||"{}"); Object.assign(this.opts,s); }catch(e){}
    $("#opt-volume").value=Math.round(this.opts.volume*100);
    $("#opt-shake").checked=this.opts.shake; $("#opt-damage").checked=this.opts.damage;
    $("#opt-quality").value=this.opts.quality;
    const bg=$("#opt-bgm"); if(bg){ bg.value=Math.round((this.opts.bgm||0.45)*100); }
    const ov=$("#opt-view"); if(ov) ov.value=String(this.opts.view||0.82);
    const oo=$("#opt-orient"); if(oo) oo.value=this.opts.orient||"portrait";
    const bs=$("#btn-open-skins"); if(bs) bs.textContent="伤害皮肤图鉴 · "+((D.DMG_SKINS||[]).length)+" 款";
    const bc=$("#btn-open-charskins"); if(bc) bc.textContent="角色皮肤图鉴 · "+((window.WZ&&WZ.charSkins)?Object.keys(WZ.charSkins).length:111)+" 款";
    E.audio.setVolume(this.opts.volume);
    if(E.bgm) E.bgm.setVolume(this.opts.bgm||0.45);
    if(this.game&&this.game.r){ this.game.r.viewZoom=parseFloat(this.opts.view)||0.82; this.game.r.resize(); }
  },
  saveOpts(){ try{ localStorage.setItem("seadragon_opts",JSON.stringify(this.opts)); }catch(e){} },
  /* v7.1：装备伤害皮肤前先把该款 20 张数字贴图加载完，避免队列未就绪时回退成纯文本 */
  applySkin(id, done){
    const sv=E.save.data||{};
    const sk=(D.DMG_SKIN_BY_ID||{})[id];
    if(!sk){ this.toast&&this.toast("皮肤不存在"); return; }
    if(!sv.skins||!sv.skins[id]){ this.toast&&this.toast("该皮肤尚未解锁"); return; }
    const seq=(this._skinSeq=(this._skinSeq||0)+1);
    const art=(window.WZ&&WZ.dmgSkins&&WZ.dmgSkins[id])||sk;
    const list=[];
    for(const role of ["normal","crit"]) for(const f of (art[role]||[])) if(f&&f.s) list.push(f.s);
    let held=false, released=false;
    const release=()=>{ if(released||!held) return; released=true; try{ E.releasePreload&&E.releasePreload(); }catch(e){} };
    const commit=()=>{
      release();
      if(seq!==this._skinSeq) return;
      sv.skin=id; E.save.write();
      try{ this.loadOpts(); }catch(e){}
      this.toast&&this.toast("已应用："+sk.name);
      if(done) done();
    };
    const uniq=[...new Set(list)];
    const missing=uniq.filter(s=>{ const r=E.images[s]; return !r||(!r.ready&&!r.error); });
    if(!missing.length){ commit(); return; }
    /* v7.1：换皮肤时暂停后台 mob/fx/atk 大批量预载，优先保证 20 张数字帧 */
    if(E.holdPreload){ try{ E.holdPreload(); held=true; }catch(e){} }
    this.toast&&this.toast("皮肤加载中…");
    Promise.race([E.preloadAll(uniq, null, {priority:"high"}), new Promise(r=>setTimeout(r,9000))]).then(commit).catch(commit);
  },

  /* ---------- 角色全身皮肤（阿尔泰动漫皮肤） ---------- */
  charSkinId(charId){ const m=E.save.data&&E.save.data.charSkins; return (m&&m[charId])||null; },
  charSkin(charId){ const id=this.charSkinId(charId); return id&&window.WZ&&WZ.charSkins&&WZ.charSkins[id]||null; },
  applyCharSkin(id,charId,done){
    const sk=window.WZ&&WZ.charSkins&&WZ.charSkins[id];
    if(!sk){ this.toast&&this.toast("角色皮肤不存在"); return; }
    const cid=charId||this._charSkinChar||this.selChar;
    const sv=E.save.data||{};
    const list=[];
    for(const role of ["stand","walk","hit"]) for(const f of (sk.anims&&sk.anims[role]||[])) if(f&&f.s) list.push(f.s);
    const uniq=[...new Set(list)];
    const missing=uniq.filter(s=>{ const r=E.images[s]; return !r||(!r.ready&&!r.error); });
    const seq=(this._charSkinSeq=(this._charSkinSeq||0)+1);
    let held=false,released=false;
    const release=()=>{ if(released||!held) return; released=true; try{ E.releasePreload&&E.releasePreload(); }catch(e){} };
    const commit=()=>{
      release(); if(seq!==this._charSkinSeq) return;
      sv.charSkins=sv.charSkins||{}; sv.charSkins[cid]=id; E.save.write();
      const g=this.game;
      if(g&&g.state==="playing"&&g.charId===cid){ try{ g.setCharSkin(id); }catch(e){} }
      this.toast&&this.toast("已应用角色皮肤："+sk.name);
      if(this.screen==="codex"&&this._codexTab==="charskin") this.renderCodex("charskin");
      else if(this.screen==="char") this.renderChars();
      if(done) done();
    };
    if(!missing.length){ commit(); return; }
    if(E.holdPreload){ try{ E.holdPreload(); held=true; }catch(e){} }
    this.toast&&this.toast("角色皮肤加载中…");
    Promise.race([E.preloadAll(uniq,null,{priority:"high"}),new Promise(r=>setTimeout(r,9000))]).then(commit).catch(commit);
  },
  clearCharSkin(charId){
    const cid=charId||this._charSkinChar||this.selChar;
    const sv=E.save.data||{};
    if(sv.charSkins&&sv.charSkins[cid]){ delete sv.charSkins[cid]; E.save.write(); }
    const g=this.game;
    if(g&&g.state==="playing"&&g.charId===cid){ try{ g.setCharSkin(null); }catch(e){} }
    this.toast&&this.toast("已恢复默认外观");
    if(this.screen==="codex"&&this._codexTab==="charskin") this.renderCodex("charskin");
    else if(this.screen==="char") this.renderChars();
  },
  openCodexTab(tab){
    this._codexFrom="settings";
    this._skinPage=0; this._charSkinPage=0;
    this.renderCodex(tab);
    this.showScreen("codex");
  },

  action(a){
    if(a==="start"){ this._daily=null; this.showScreen("char"); this.renderChars(); }
    else if(a==="online"){ location.href="online.html"; }
    else if(a==="login"){ this.showScreen("title"); this.renderSaveLine(); }
    else if(a==="daily"){ this.startDaily(); }
    else if(a==="talent"){ this.showScreen("talent"); this.renderTalents(); }
    else if(a==="codex"){ this._codexFrom=this.screen; this.showScreen("codex"); this.renderCodex("howto"); }
    else if(a==="settings"){ this.openSettings(this.screen==="game"?"pause":this.screen); }
    else if(a==="back-title"){ this.showScreen("title"); this.renderSaveLine(); }
    else if(a==="back-char"){ this.showScreen("char"); this.renderChars(); }
  },

  showScreen(id){
    this.screen=id;
    $$(".screen").forEach(s=>s.classList.remove("active"));
    $("#screen-"+id).classList.add("active");
    if(id==="title") this.renderSaveLine();
    if(id==="map") this.renderMaps();
    if(id==="codex") this.renderCodex((this._codexTab||"howto"));
    if(id==="settings") this.loadOpts();
    if(id==="talent") this.renderTalents();
    if(id!=="game") this._shopOpen=false;
    this.updateInteractBtn();
    if(E.bgm && id!=="game"){ if(id==="login") E.bgm.play("login"); else if(id==="title") E.bgm.play("title"); else E.bgm.play("menu"); }
  },

  renderSaveLine(){
    const s=E.save.data; let best=0,bestMap="";
    for(const k in s.bestWave){ if(s.bestWave[k]>best){best=s.bestWave[k];bestMap=(D.MAP_BY_ID[k]||{}).name||k;} }
    const parts=[];
    if(best) parts.push("最佳记录：第 "+best+" 波 · "+bestMap);
    if(s.endlessBest) parts.push("无尽最佳：第 "+s.endlessBest+" 波");
    if(s.wins) parts.push("通关 "+s.wins+" 次");
    parts.push("总局数 "+s.runs);
    if(s.kills) parts.push("累计击杀 "+s.kills);
    if(s.bank) parts.push("天赋银行 "+s.bank+" 币");
    $("#save-line").textContent = parts.join("　|　");
  },

  /* ---------- 选人 ---------- */
  renderChars(){
    const s=E.save.data;
    const list=$("#char-list"); list.innerHTML="";
    for(const ch of D.CHARACTERS){
      const locked=ch.unlock&&!this.unlocked(ch);
      const card=document.createElement("div");
      card.className="char-card"+(ch.id===this.selChar?" selected":"")+(locked?" locked":"");
      card.innerHTML='<div class="cname">'+ch.name+'</div><div class="ctitle">'+ch.title+'</div>';
      // 立绘预览
      const cv=document.createElement("canvas"); cv.width=96; cv.height=96;
      this.drawCharPreview(cv,ch);
      card.appendChild(cv);
      if(locked){
        const m=document.createElement("div"); m.className="locked";
        m.innerHTML="🔒<span>"+(ch.unlock.text||"未解锁")+"</span>";
        card.appendChild(m);
      } else {
        card.addEventListener("click",()=>{ this.selChar=ch.id; this.renderChars(); });
      }
      list.appendChild(card);
    }
    this.renderCharDetail();
    $("#char-gold").textContent="";
  },
  unlocked(ch){
    if(!ch.unlock) return true;
    const save=E.save.data;
    if(ch.unlock.type==="wave"){
      const best=Math.max(0,...Object.values(save.bestWave||{}));
      return best>=ch.unlock.value;
    }
    if(ch.unlock.type==="kills") return (save.kills||0)>=ch.unlock.value;
    if(ch.unlock.type==="wins") return (save.wins||0)>=ch.unlock.value;
    return save.unlockedChars.includes(ch.id);
  },
  drawCharPreview(cv,ch){
    const ctx=cv.getContext("2d");
    // 优先显示该角色当前装备的阿尔泰全身皮肤站立帧
    const sk=this.charSkin(ch.id);
    if(sk&&sk.anims&&sk.anims.stand&&sk.anims.stand[0]){
      const f=sk.anims.stand[0], rec=E.loadImage(f.s);
      if(rec&&rec.ready){
        ctx.clearRect(0,0,96,96);
        const bw=Math.max(1,f.bw||f.w||1), bh=Math.max(1,f.bh||f.h||1);
        const sc=Math.min(88/bw,88/bh);
        ctx.drawImage(rec.img,f.bx||0,f.by||0,bw,bh,(96-bw*sc)/2,96-bh*sc-2,bw*sc,bh*sc);
        return;
      }
    }
    // v9：按需合成 + 缓存。原实现启动时把 18 个角色全部合成（198 个 340×340 canvas ≈ 68MB），
    // 移动端容易吃紧；现改为选中角色时才合成，其余保持首次访问生成。
    if(window._previewCache&&!window._previewCache[ch.id]&&window.buildHeroArt){
      window._previewCache[ch.id]=window.buildHeroArt(ch.id);
    }
    const hf=window._previewCache&&window._previewCache[ch.id];
    if(hf&&hf.frames.idle&&hf.frames.idle[0]){
      const f=hf.frames.idle[0];
      ctx.clearRect(0,0,96,96);
      const sx=78,sy=88,sw=116,sh=156, sc=Math.min(96/sw,96/sh);
      ctx.drawImage(f,sx,sy,sw,sh,(96-sw*sc)/2,(96-sh*sc)/2,sw*sc,sh*sc);
    } else {
      ctx.fillStyle="#2a3550"; ctx.fillRect(20,30,56,50);
      ctx.fillStyle="#f2c14e"; ctx.font="11px sans-serif"; ctx.textAlign="center";
      ctx.fillText(ch.name.slice(0,2),48,60);
    }
  },
  renderCharDetail(){
    const ch=D.CHARACTERS.find(c=>c.id===this.selChar);
    const box=$("#char-detail");
    const stats=ch.stats||{};
    let rows="";
    for(const k in stats){
      const label=D.STAT_LABEL[k]||k; const v=stats[k];
      rows+='<div class="k">'+label+'</div><div class="v">'+(v>0?"+":"")+v+'</div>';
    }
    const w=D.WEAPON_BY_ID[ch.startWeapon], sk=D.SKILL_BY_ID[ch.startSkill];
    box.innerHTML='<h3>'+ch.name+'</h3><div class="role">'+ch.title+' · '+ch.role+'</div>'+
      '<div class="stat-grid">'+rows+
      '<div class="k">初始武器</div><div class="v">'+w.name+'</div>'+
      '<div class="k">初始技能</div><div class="v">'+sk.name+'</div>'+
      '<div class="k">角色皮肤</div><div class="v">'+((this.charSkin(ch.id)||{}).name||"默认外观")+'</div></div>'+
      '<div class="desc">'+ch.desc+'</div>';
  },

  /* ---------- 选图 ---------- */
  /* ---------- 难度选择（与联机模式一致） ---------- */
  renderDifficulties(){
    const box=$("#difficulty-list"); if(!box)return;
    const list=D.DIFFICULTIES||[];
    if(!D.DIFFICULTY_BY_ID[this.selDifficulty]) this.selDifficulty="normal";
    const cur=D.DIFFICULTY_BY_ID[this.selDifficulty]||list[0];
    box.innerHTML="";
    for(const d of list){
      const card=document.createElement("button");
      card.type="button";
      card.className="diff-card"+(d.key===this.selDifficulty?" selected":"");
      card.setAttribute("aria-pressed",d.key===this.selDifficulty?"true":"false");
      card.style.setProperty("--dc",d.color||"#6fb7ff");
      const fmt=n=>(Math.round((n||1)*100)/100).toFixed(2);
      card.innerHTML='<span class="dname">'+d.name+'</span>'+
        '<span class="ddesc">'+d.desc+'</span>'+
        '<span class="dmul">HP ×'+fmt(d.hp)+' · 伤害 ×'+fmt(d.dmg)+' · 刷怪 ×'+fmt(d.spawn)+' · 奖励 ×'+fmt(d.reward)+'</span>';
      card.addEventListener("click",()=>{
        this.selDifficulty=d.key;
        try{ E.save.data.lastDifficulty=d.key; E.save.write(); }catch(e){}
        this.renderMaps();
      });
      box.appendChild(card);
    }
    const sum=$("#diff-summary");
    if(sum&&cur) sum.textContent=cur.name+" · "+cur.desc;
  },
  renderMaps(){
    this.renderDifficulties();
    const list=$("#map-list"); list.innerHTML="";
    for(const m of D.MAPS){
      const locked=m.unlock&&!this.mapUnlocked(m);
      const card=document.createElement("div");
      card.className="map-card"+(m.id===this.selMap?" selected":"")+(locked?" locked":"");
      card.innerHTML='<div class="thumb" style="background:linear-gradient(160deg,'+m.palette.top+','+m.palette.bottom+')"></div>'+
        '<div class="mname">'+m.name+'</div>'+
        '<div class="mbody"><div class="tagline">'+m.tag+(m.levelText?' · '+m.levelText:'')+'</div><div style="margin:6px 0">'+m.desc+'</div>'+
        '<div class="mod">▲ '+m.modText+'</div></div>';
      if(locked){
        const msk=document.createElement("div"); msk.className="lockmask";
        msk.innerHTML="🔒<span>"+m.unlock.text+"</span>";
        card.appendChild(msk);
      } else card.addEventListener("click",()=>{ this.selMap=m.id; this.renderMaps(); });
      list.appendChild(card);
    }
    $("#map-gold").textContent="";
  },
  mapUnlocked(m){
    if(!m.unlock)return true;
    const best=Math.max(0,...Object.values(E.save.data.bestWave||{}));
    return best>=m.unlock.value;
  },

  /* ---------- 开局 ---------- */
  startDaily(){
    const d=D.dailyToday();
    this._daily=d; this.selChar=d.char; this.selMap=d.map;
    E.save.data.unlockedChars.includes(d.char)||E.save.data.unlockedChars.push(d.char);
    const m=D.MAP_BY_ID[d.map];
    if(m&&m.unlock) m.unlock=null;
    this.toast&&this.toast("每日挑战："+d.mods.map(x=>x.name).join(" · "));
    this.showScreen("char"); this.renderChars();
    setTimeout(()=>{ this.startRun(); },60);
  },
  mapBgmKey(id){ return id; },
  startRun(){
    if(this.opts.orient==="landscape") this.ensureLandscape(false);
    E.audio.init(); E.audio.setVolume(this.opts.volume);
    this.showScreen("game");
    const g=this.game;
    const endless=$("#opt-endless")&&$("#opt-endless").checked;
    const diff=(D.DIFFICULTY_BY_ID&&D.DIFFICULTY_BY_ID[this.selDifficulty])||{key:"normal",name:"标准"};
    this.selDifficulty=diff.key;
    this.resetShop(); this._npcShop=false; this._shopOpen=false;
    g.start(this.selChar,this.selMap,{daily:this._daily||null,endless:!!endless,autoAim:!!this.isTouch,difficulty:diff.key});
    if(E.bgm) E.bgm.play(this.mapBgmKey(this.selMap));
    $("#overlay-result").classList.add("hidden");
    $("#overlay-shop").classList.add("hidden");
    $("#overlay-levelup").classList.add("hidden");
    $("#overlay-pause").classList.add("hidden");
    this.toast((this._daily?"每日挑战 · "+this._daily.date:"目标：活过 30 波")+" · "+diff.name);
    this.updateHUD(true);
    if(this._applyOrient) this._applyOrient();
  },
  /* ---------- HUD ---------- */
  updateHUD(force){
    const g=this.game; if(!g||!g.player)return;
    const p=g.player;
    $("#hp-fill").style.width=(p.hp/p.maxHp*100)+"%";
    $("#hp-text").textContent=Math.ceil(p.hp)+" / "+Math.round(p.maxHp);
    $("#xp-fill").style.width=(p.xp/p.nextXp*100)+"%";
    $("#xp-text").textContent="Lv."+p.level+"  "+Math.floor(p.xp)+"/"+p.nextXp;
    $("#wave-label").textContent="第 "+g.wave+" 波"+(g.difficulty?" · "+g.difficulty.name:"")+(g.waveData&&g.waveData.boss?" · BOSS":"");
    $("#wave-timer").textContent=Math.max(0,Math.ceil(g.waveLeft));
    $("#wave-progress-fill").style.width=Math.max(0,(g.waveLeft/g.waveTime)*100)+"%";
    $("#gold-text").textContent=p.gold;
    $("#kill-text").textContent=g.totalKills||0;
    // 武器槽
    const ws=$("#weapon-slots");
    if(force||ws.children.length!==6){
      ws.innerHTML="";
      for(let i=0;i<6;i++){ const d=document.createElement("div"); d.className="slot empty"; ws.appendChild(d); }
    }
    for(let i=0;i<6;i++){
      const el=ws.children[i], w=p.weapons[i];
      if(w){ const def=D.WEAPON_BY_ID[w.id]; el.className="slot"; el.innerHTML='<span class="lvl">'+w.lvl+'</span><span class="wlabel" title="'+def.name+'">'+def.name.slice(0,2)+'</span>'; }
      else { el.className="slot empty"; el.innerHTML=""; }
    }
    // 技能槽
    const ss=$("#skill-slots");
    if(force||ss.children.length<4){
      ss.innerHTML="";
      for(let i=0;i<4;i++){ const d=document.createElement("div"); d.className="slot empty"; ss.appendChild(d); }
    }
    for(let i=0;i<4;i++){
      const el=ss.children[i], sk=p.skills[i];
      if(sk){
        const def=D.SKILL_BY_ID[sk.id];
        el.className="slot"; el.innerHTML='<span class="key">'+(i+1)+'</span><span class="sname">'+def.name.slice(0,2)+'</span>';
        const total=(def.cd||8)*(1-(p.stats.cooldownPct||0)/100);
        const ratio=Math.max(0,sk.cool/total);
        const cd=el.querySelector(".cd")||document.createElement("div");
        cd.className="cd"; cd.style.transform="scaleY("+ratio+")"; el.appendChild(cd);
      } else { el.className="slot empty"; el.innerHTML='<span class="key">'+(i+1)+'</span>'; }
    }
    // 遗物槽
    const rs=$("#relic-slots");
    if(rs){
      const n=Math.max(3,(p.relics||[]).length);
      if(force||rs.children.length!==n){
        rs.innerHTML="";
        for(let i=0;i<n;i++){ const d=document.createElement("div"); d.className="rslot"; rs.appendChild(d); }
      }
      for(let i=0;i<n;i++){
        const el=rs.children[i], rl=(p.relics||[])[i];
        if(rl){ el.className="rslot filled "+rl.rarity; el.textContent=rl.name.slice(0,1); el.title=rl.name+"："+rl.desc; }
        else { el.className="rslot"; el.textContent=""; el.title=""; }
      }
    }
    // 羁绊
    const bd=$("#bond-bar");
    if(bd){
      const list=Object.entries(p.bonds||{}).filter(([k,v])=>v.lv>0);
      bd.innerHTML=list.map(([k,v])=>'<span class="bond">'+D.BOND_BY_ID[k].name+' '+v.n+'</span>').join("");
    }
    // Boss 血条
    const bb=$("#boss-bar");
    if(g.boss&&!g.boss.dead){
      bb.classList.remove("hidden");
      $("#boss-name").textContent=g.boss.name||"BOSS";
      $("#boss-hp-fill").style.width=(g.boss.hp/g.boss.maxHp*100)+"%";
    } else bb.classList.add("hidden");
  },

  toast(text){
    const w=$("#toast-wrap"); const d=document.createElement("div");
    d.className="toast"; d.textContent=text; w.appendChild(d);
    setTimeout(()=>d.remove(),2300);
  },

  /* ---------- 升级选卡 ---------- */
  cardPool(level){
    const p=this.game.player;
    const luck=(p.stats.luck||0);
    const out=[];
    const cid=p.ch&&p.ch.id;
    for(const c of D.CARDS){
      if(c.char&&c.char!==cid)continue;
      let wgt=D.RARITY_WEIGHT[c.rarity];
      if(c.rarity==="legend") wgt*=1+luck/40;
      if(c.rarity==="epic") wgt*=1+luck/80;
      if(c.id==="glass"&&p.maxHp<90) wgt*=0.25;
      out.push({c,wgt});
    }
    return out;
  },
  drawCards(n){
    const pool=this.cardPool();
    const picked=[];
    const used=new Set();
    let guard=0;
    while(picked.length<n&&guard++<400){
      const items=pool.filter(x=>!used.has(x.c.id));
      const c=E.weighted(items.map(x=>x.c),items.map(x=>x.wgt));
      used.add(c.id); picked.push(c);
    }
    return picked;
  },
  showLevelUp(g){
    this.game=g;
    const cards=this.drawCards(3);
    const box=$("#levelup-cards"); box.innerHTML="";
    const own=g.player.cards||{};
    for(const c of cards){
      const el=document.createElement("div");
      el.className="card "+c.rarity;
      const o=own[c.id];
      const tags=D.cardTags(c).map(t=>D.BOND_BY_ID[t]?D.BOND_BY_ID[t].name:"").filter(Boolean);
      const lvLine=o?('　<span class="lvtag">Lv.'+o.lv+' · '+o.n%3+'/3</span>'):"";
      el.innerHTML='<div class="rarity">'+(c.type==="unique"?"★ 独特":"▲ 属性")+' · '+D.RARITY_NAME[c.rarity]+(tags.length?' · '+tags.join("/"):"")+'</div>'+
        '<div class="cname">'+c.name+lvLine+'</div><div class="cdesc">'+c.desc+'</div>'+
        '<div class="pick"><span class="key">'+(box.children.length+1)+'</span>点击选择</div>';
      el.addEventListener("click",()=>{ this.pickLevelCard(c); });
      box.appendChild(el);
    }
    $("#overlay-levelup").classList.remove("hidden");
    $("#btn-reroll-levelup").disabled=g.player.gold<10;
    this._lu=cards;
    if(!this._luKey){
      this._luKey=true;
      window.addEventListener("keydown",ev=>{
        if($("#overlay-levelup").classList.contains("hidden"))return;
        const n=parseInt(ev.key);
        if(n>=1&&n<=3&&this._lu&&this._lu[n-1]) this.pickLevelCard(this._lu[n-1]);
      });
    }
  },
  pickLevelCard(c){
    const g=this.game; if(!g)return;
    // v9：连续升级的弹窗由 game.pickCard 内部负责（pendingLevels>0 时自会重开），
    // 这里再判一次会同一帧重复渲染两遍
    g.pickCard(c);
    if(g.pendingLevels<=0){ $("#overlay-levelup").classList.add("hidden"); this._lu=null; }
  },
  rerollLevelUp(){
    const g=this.game;
    if(g.player.gold<10)return;
    g.player.gold-=10; this.showLevelUp(g);
  },
  hideLevelUp(){ $("#overlay-levelup").classList.add("hidden"); },

  /* ---------- 商店 ---------- */
  makeOffers(g){
    const p=g.player;
    const offers=[];
    // 1) 武器
    const wcands=D.WEAPONS.filter(w=>p.weapons.find(x=>x.id===w.id)?p.weapons.find(x=>x.id===w.id).lvl<5:true);
    if(wcands.length) offers.push({kind:"weapon",w:E.pick(wcands)});
    // 2) 通用技能（角色专属技能不进商店；第 5 波前预留一个技能槽给二专）
    const skillCap=(g.wave>=5?4:3);
    const scand=D.SKILLS.filter(s=>!s.exclusive&&!p.skills.find(x=>x.id===s.id));
    if(scand.length&&p.skills.length<skillCap) offers.push({kind:"skill",s:E.pick(scand)});
    // 3) 卡牌
    offers.push({kind:"card",c:this.drawCards(1)[0]});
    // 4) 遗物（45% 概率，最多 3 件）
    if((p.relics||[]).length<3&&Math.random()<0.45){
      const owned=(p.relics||[]).map(r=>r.id);
      const rp=D.RELICS.filter(r=>!owned.includes(r.id));
      if(rp.length) offers.push({kind:"relic",r:E.pick(rp)});
    }
    // 5) 治疗
    offers.push({kind:"heal"});
    return offers;
  },
  resetShop(){ this._shopOffers=null; this._shopWave=0; this._shopCtx=""; },
  showShop(g){
    this.game=g;
    if(!this._shopOffers||this._shopCtx!=="wave"||this._shopWave!==g.wave){
      this._shopOffers=this.makeOffers(g); this._shopCtx="wave"; this._shopWave=g.wave;
    }
    this._npcShop=false; this._shopOpen=true;
    this.renderShop();
    $("#overlay-shop").classList.remove("hidden");
    $("#shop-sub").textContent="　米娜 · 杂货商人 · 金币 "+g.player.gold;
    const nb=$("#btn-next-wave"); if(nb) nb.textContent="下一波 →";
    this.updateInteractBtn();
  },
  /* 推荐价格算法（v8.3，D.SHOP）：
     售价 = round5( 基础价 × 波次系数 × 购买系数 )
       波次系数 = min(2.60, 1 + 0.08 × (波数-1))
       购买系数 = min(3.00, 1 + 0.10 × 本局已购件数)
       基础价   = 武器(光环75/其他55) 技能65 卡牌(普通50/稀有75/史诗110/传说150) 遗物140
       治疗药水 = 25 + 6 × (波数-1)，取到 5 的倍数，最低 15（不随购买涨价）
       商店刷新 = 15 + 10 × 本局已刷新次数 */
  priceOf(o){
    const S=D.SHOP||{}, g=this.game, wave=g?g.wave:1, buys=g?(g.shopBuys||0):0;
    const r5=v=>Math.max(5,Math.round(v/5)*5);
    if(o.kind==="heal"){ const raw=(S.healBase||25)+(S.healPerWave||6)*(wave-1); return Math.max(S.healMin||15,r5(raw)); }
    let base=S.weapon||55;
    if(o.kind==="weapon")base=o.w.id==="aura"?(S.weaponAura||75):(S.weapon||55);
    else if(o.kind==="skill")base=S.skill||65;
    else if(o.kind==="card")base=(S.card&&S.card[o.c.rarity])||50;
    else if(o.kind==="relic")base=S.relic||140;
    const waveMul=Math.min(S.waveCap||2.6,1+(S.waveRate||0.08)*(wave-1));
    const buyMul=Math.min(S.buyCap||3.0,1+(S.buyRate||0.10)*buys);
    return r5(base*waveMul*buyMul);
  },
  buyOffer(i){
    const g=this.game,p=g&&g.player,o=this._shopOffers&&this._shopOffers[i];
    if(!g||!p||!o||o.sold)return false;
    // v9 修复：所有"能否买到"的校验必须前置到扣款之前。
    // 原实现武器/遗物先扣钱再调 add*()，槽满时白扣金币且商品标记售出、无法退款。
    if(o.kind==="skill"){
      const cap=(g.wave>=5?4:3);
      if(p.skills.length>=cap){ this.toast("技能槽已满"); return false; }
      if(p.skills.find(s=>s.id===o.s.id)){ this.toast("已拥有该技能"); return false; }
    }
    if(o.kind==="weapon"){
      const own=p.weapons.find(w=>w.id===o.w.id);
      if(own&&own.lvl>=5){ this.toast("该武器已满级"); return false; }
      if(!own&&p.weapons.length>=6){ this.toast("武器槽已满"); return false; }
    }
    if(o.kind==="relic"){
      if((p.relics||[]).length>=3){ this.toast("遗物已满"); return false; }
      if((p.relics||[]).find(r=>r.id===o.r.id)){ this.toast("已拥有该遗物"); return false; }
    }
    const pr=this.priceOf(o);
    if(p.gold<pr){ this.toast("金币不足"); return false; }
    p.gold-=pr; o.sold=true; if(o.kind!=='heal'){ g.shopBuys=(g.shopBuys||0)+1; }
    if(o.kind==="weapon"){ p.addWeapon(o.w.id); }
    else if(o.kind==="skill"){ p.addSkill(o.s.id); }
    else if(o.kind==="card"){ p.addCard(o.c); }
    else if(o.kind==="relic"){ p.addRelic(o.r); }
    // v9：治疗量随最大生命增长，原实现固定 40 点，第 20 波花 145 金币只回 40 血
    else { p.heal(Math.max(40,Math.round(p.maxHp*0.35))); }
    E.sfx.gold();
    if(this._shopOffers) this.renderShop();
    const sub=$("#shop-sub"); if(sub) sub.textContent="　米娜 · 杂货商人 · 金币 "+p.gold;
    return true;
  },
  renderShop(){
    const g=this.game, p=g.player, box=$("#shop-items"); box.innerHTML="";
    const price=o=>this.priceOf(o);
    this._shopOffers.forEach((o,i)=>{
      const el=document.createElement("div"); el.className="card "+(o.c?o.c.rarity:(o.r?o.r.rarity:"common"));
      let title="",desc="",rar="商店 · 补给";
      if(o.kind==="weapon"){ rar="商店 · 武器"; title=o.w.name; desc=o.w.desc+"（"+(p.weapons.find(x=>x.id===o.w.id)?"升级到 Lv."+(p.weapons.find(x=>x.id===o.w.id).lvl+1):"新武器")+"）"; }
      else if(o.kind==="skill"){ rar="商店 · 技能"; title=o.s.name; desc=o.s.desc; }
      else if(o.kind==="card"){ rar="商店 · 卡牌"; title=o.c.name; desc=o.c.desc; rar="商店 · 卡牌 · "+D.RARITY_NAME[o.c.rarity]; }
      else if(o.kind==="relic"){ rar="商店 · 遗物"; title=o.r.name; desc=o.r.desc; }
      else { title="治疗药水"; desc="恢复 40 点生命"; }
      const pr=price(o);
      el.innerHTML='<div class="rarity">'+rar+'</div><div class="cname">'+title+'</div><div class="cdesc">'+desc+'</div>'+
        '<div class="price">'+(o.sold?"已售出":(p.gold<pr?"金币不足 · "+pr:(pr+" 金币 · 点击购买")))+'</div>';
      if(o.sold) el.classList.add("sold");
      else if(p.gold<pr) el.classList.add("cant");
      el.addEventListener("click",()=>{ this.buyOffer(i); });
      box.appendChild(el);
    });
    const rb=$("#btn-reroll-shop"); if(rb){ const rc=(D.SHOP&&D.SHOP.rerollBase||15)+(D.SHOP&&D.SHOP.rerollStep||10)*(g.shopRerolls||0); rb.textContent="刷新 ("+rc+" 金币)"; rb.disabled=g.player.gold<rc; }
  },
  rerollShop(){
    const g=this.game;
    const rc=(D.SHOP&&D.SHOP.rerollBase||15)+(D.SHOP&&D.SHOP.rerollStep||10)*(g.shopRerolls||0);
    if(g.player.gold<rc){ this.toast("金币不足"); return; }
    g.player.gold-=rc; g.shopRerolls=(g.shopRerolls||0)+1;
    this._shopOffers=this.makeOffers(g);
    this.renderShop();
    $("#shop-sub").textContent="　米娜 · 杂货商人 · 金币 "+g.player.gold;
  },
  hideShop(){ $("#overlay-shop").classList.add("hidden"); this._shopOpen=false; this._npcShop=false; this.updateInteractBtn(); },
  /* 玩家靠近 NPC 时由 game.js 每帧调用，控制手机端交易键显示 */
  setInteract(on,o){
    this._npcNear=!!on; if(o) this._npcObj=o;
    this.updateInteractBtn();
  },
  updateInteractBtn(){
    const b=$("#btn-interact"); if(!b) return;
    const g=this.game;
    const show=!!this._npcNear && !this._shopOpen && this.screen==="game" && g && g.state==="playing" && !g.paused && !g.over;
    if(show!==this._interactShown){ this._interactShown=show; b.classList.toggle("show",show); }
  },
  openNpcShop(g){
    this.game=g;
    if(this._npcShop) return;
    g.paused=true; this._npcShop=true; this._shopOpen=true;
    if(!this._shopOffers||this._shopCtx!=="npc"||this._shopWave!==g.wave){
      this._shopOffers=this.makeOffers(g); this._shopCtx="npc"; this._shopWave=g.wave;
    }
    this.renderShop();
    $("#overlay-shop").classList.remove("hidden");
    $("#shop-sub").textContent="　米娜 · 杂货商人 · 金币 "+g.player.gold;
    const nb=$("#btn-next-wave"); if(nb) nb.textContent="离开商店";
    this.updateInteractBtn();
  },

  /* ---------- 设置入口（标题 / 选角 / 暂停通用） ---------- */
  openSettings(from){
    this._settingsFrom=from||this.screen||"title";
    if(this._settingsFrom==="pause"){
      const g=this.game; if(g){ g.paused=true; }
      const ov=$("#overlay-pause"); if(ov) ov.classList.add("hidden");
    }
    this.showScreen("settings");
  },
  closeSettings(){
    const from=this._settingsFrom||"title"; this._settingsFrom=null;
    if(from==="pause"){
      this.showScreen("game");
      const g=this.game; if(g){ g.paused=true; }
      const ov=$("#overlay-pause"); if(ov) ov.classList.remove("hidden");
      if(E.bgm) E.bgm.play(this.mapBgmKey(this.selMap));
    } else if(from==="char"){
      this.showScreen("char"); this.renderChars();
    } else if(from==="map"){
      this.showScreen("map"); this.renderMaps();
    } else {
      this.showScreen("title"); this.renderSaveLine();
    }
  },

  /* ---------- 暂停 / 结算 ---------- */
  pause(){
    const g=this.game; if(!g||g.over)return;
    g.paused=true; $("#overlay-pause").classList.remove("hidden");
    const p=g.player, s=p.stats;
    let rows="";
    const add=(k,v)=>rows+='<div><span class="k">'+k+'</span>'+v+'</div>';
    add("角色",p.ch.name+"　Lv."+p.level);
    add("难度",(g.difficulty&&g.difficulty.name)||"标准");
    add("生命",Math.ceil(p.hp)+" / "+Math.round(p.maxHp));
    add("伤害加成",(s.damagePct||0)+"%");
    add("攻速加成",(s.attackSpeedPct||0)+"%");
    add("暴击",(s.critChance||0)+"% / +"+(s.critDamage||0)+"%");
    add("护甲",(s.armor||0)+"　闪避 "+(s.dodge||0)+"%");
    add("移速",Math.round(p.speed));
    add("武器",p.weapons.map(w=>D.WEAPON_BY_ID[w.id].name+" Lv."+w.lvl).join("、")||"无");
    add("技能",p.skills.map(x=>D.SKILL_BY_ID[x.id].name).join("、")||"无");
    $("#pause-stats").innerHTML=rows;
  },
  resume(){ const g=this.game; if(!g)return; g.paused=false; $("#overlay-pause").classList.add("hidden"); },
  showResult(g,win){
    if(E.bgm) E.bgm.stop();
    const p=g.player;
    $("#result-title").textContent=win?(g.endless?"无尽挑战结束":"胜利！30 波全部通过"):"阵亡";
    const eb=$("#btn-endless");
    if(eb) eb.style.display=(win&&!g.endless?"":"none");
    const tt=Math.round(g.time||0), mins=Math.floor(tt/60), secs=tt%60;
    const fmt=n=>Math.round(n||0).toLocaleString("en-US");
    const row=(k,v)=>'<div class="sr"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
    $("#result-stats").innerHTML='<div class="stat-grid">'+
      row("角色",p.ch.name)+row("难度",(g.difficulty&&g.difficulty.name)||"标准")+row("场景",g.map.name)+
      row("抵达波次","第 "+g.wave+" 波"+(win?"（通关）":""))+row("等级","Lv."+p.level)+
      row("击杀",fmt(g.totalKills))+row("造成伤害",fmt(p.dmgDealt))+
      row("金币",fmt(p.gold))+row("用时",mins+" 分 "+secs+" 秒")+
      row("存入天赋银行","+"+fmt(g.bankEarned||0))+row("遗物",(p.relics||[]).map(r=>r.name).join("、")||"无")+
      '</div>'+((g.newAch&&g.newAch.length)?'<div class="best">新成就：'+g.newAch.map(a=>a.name).join("、")+'（+'+g.newAch.reduce((n,a)=>n+(a.reward||0),0)+' 币）</div>':'')+((g.newSkins&&g.newSkins.length)?'<div class="best">解锁伤害皮肤：'+g.newSkins.map(x=>x.name).join("、")+'</div>':'')+'<div class="best">最佳记录：第 '+(E.save.data.bestWave[g.mapId]||0)+' 波　|　天赋银行余额 '+(E.save.data.bank||0)+'</div>';
    $("#overlay-result").classList.remove("hidden");
  },

  /* ---------- 永久天赋 ---------- */
  talentCost(t,lv){ return D.talentCost(t,lv); },
  renderTalents(){
    const body=$("#talent-body"); if(!body)return;
    const save=E.save.data; save.talents=save.talents||{};
    $("#talent-bank").textContent="天赋银行："+(save.bank||0);
    const branches={};
    for(const t of D.TALENTS){ (branches[t.branch]=branches[t.branch]||[]).push(t); }
    let html="";
    for(const b in branches){
      html+='<div class="talent-branch"><h3>'+b+'</h3><div class="talent-grid">';
      for(const t of branches[b]){
        const lv=save.talents[t.id]||0, max=t.max, cost=D.talentCost(t,lv);
        const can=lv<max&&(save.bank||0)>=cost;
        html+='<div class="talent-item'+(lv>=max?" max":"")+'"><div class="tname">'+t.name+' <span class="tlv">'+lv+'/'+max+'</span></div>'+
          '<div class="tdesc">'+t.desc+'</div>'+
          '<button class="btn small '+(can?"primary":"")+'" data-tid="'+t.id+'" '+(can?"":"disabled")+'>'+(lv>=max?"已满级":("升级 · "+cost+" 金币"))+'</button></div>';
      }
      html+='</div></div>';
    }
    body.innerHTML=html;
    body.querySelectorAll("button[data-tid]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const id=btn.dataset.tid, t=D.TALENT_BY_ID[id];
        const lv=save.talents[id]||0, cost=D.talentCost(t,lv);
        if(lv>=t.max||(save.bank||0)<cost)return;
        save.bank-=cost; save.talentSpent=(save.talentSpent||0)+cost; save.talents[id]=lv+1; E.save.write(); E.sfx.level();
        this.renderTalents(); this.renderSaveLine();
      });
    });
  },

  /* ---------- 图鉴 ---------- */
  renderCodex(tab){
    const body=$("#codex-body"); this._codexTab=tab;
    $$("#codex-tabs .tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
    if(tab==="howto"){
      body.innerHTML='<h3>核心玩法</h3><div>本作是「类土豆兄弟」的俯视角肉鸽割草：在 30 波敌人中活下来（可选无尽模式继续挑战），用升级卡与商店不断变强。</div>'+
        '<h3>操作</h3><div>WASD 移动 · 鼠标瞄准（武器自动攻击最近敌人）· 空格冲刺（2.4s 冷却）· 1~4 释放技能 · ESC 暂停</div>'+
        '<h3>流程</h3><div>每波限时 30~70 秒，敌人从四周涌入；倒计时结束进入商店，可购买武器 / 技能 / 卡牌 / 遗物 / 药水。每 5 波出现 BOSS。地图中还会刷出宝箱、木箱、尖刺陷阱与行商 NPC（靠近按 E 交易）。</div>'+
        '<h3>成长</h3><div>击杀敌人掉落经验与金币，升级时三选一卡牌（可花 10 金币重掷）。同名卡集满 3 张升 1 级（最多 Lv.4，额外生效一次）。卡牌带标签，凑齐 2/4/6 张触发羁绊。</div>'+
        '<h3>解锁</h3><div>抵达指定波次解锁新角色与场景（盗贼 6 波、圣骑 10 波、死灵 14 波；沙漠 4 波、高塔 8 波）。</div>';
    } else if(tab==="weapons"){
      body.innerHTML='<h3>武器（最多 6 把）</h3><div class="codex-grid">'+D.WEAPONS.map(w=>
        '<div class="codex-item"><b>'+w.name+'</b><div class="muted">'+w.kind+' · 伤害 '+w.dmg+' · 冷却 '+w.cd+'s</div><div>'+w.desc+'</div></div>').join("")+'</div>';
    } else if(tab==="skills"){
      const cn=id=>{ const c=(D.CHARACTERS||[]).find(x=>x.id===id); return c?c.name:id; };
      const card=s=>'<div class="codex-item'+(s.exclusive?" exclusive":"")+'"><div class="codex-head"><img class="codex-icon" loading="lazy" src="assets/icons/skill/'+s.id+'.png" alt=""><b>'+s.name+'</b>'+
        (s.exclusive?' <span class="muted">专属 · '+cn(s.exclusive)+'</span>':'')+'</div>'+
        '<div class="muted">冷却 '+s.cd+'s · 按键 1~4</div><div>'+s.desc+'</div></div>';
      const gen=D.SKILLS.filter(s=>!s.exclusive), ex=D.SKILLS.filter(s=>s.exclusive);
      body.innerHTML='<h3>通用技能（'+gen.length+'）· 商店可购买</h3><div class="codex-grid">'+gen.map(card).join("")+'</div>'+
        '<h3>角色专属技能（'+ex.length+'）· 开局自带，商店不出售</h3><div class="codex-grid">'+ex.map(card).join("")+'</div>';
    } else if(tab==="cards"){
      const byR={common:[],rare:[],epic:[],legend:[]};
      for(const c of D.CARDS) (byR[c.rarity]=byR[c.rarity]||[]).push(c);
      let html="";
      for(const r of ["legend","epic","rare","common"]){
        if(!byR[r].length)continue;
        html+='<h3>'+D.RARITY_NAME[r]+'（'+byR[r].length+'）</h3><div class="codex-grid">';
        for(const c of byR[r]){
          const tags=D.cardTags(c).map(t=>D.BOND_BY_ID[t]?D.BOND_BY_ID[t].name:"").filter(Boolean);
          html+='<div class="codex-item '+r+'"><b>'+c.name+'</b><div class="muted">'+tags.join(" · ")+'</div><div>'+c.desc+'</div></div>';
        }
        html+='</div>';
      }
      body.innerHTML=html;
    } else if(tab==="relics"){
      let html='<h3>遗物（每局最多 3 件）</h3><div class="codex-grid">'+
        D.RELICS.map(r=>'<div class="codex-item '+r.rarity+'"><div class="codex-head"><img class="codex-icon" loading="lazy" src="assets/icons/relic/'+r.id+'.png" alt=""><b>'+r.name+'</b></div><div class="muted">'+D.RARITY_NAME[r.rarity]+'</div><div>'+r.desc+'</div></div>').join("")+'</div>';
      html+='<h3>羁绊（同名标签累计 2 / 4 / 6 张）</h3>';
      for(const b of D.BONDS){
        html+='<div class="bond-block"><b>'+b.name+'</b><div class="muted">'+b.desc+'</div>'+
          b.tiers.map(t=>'<div class="bond-tier"><span class="n">'+t.n+' 张</span>'+t.text+'</div>').join("")+'</div>';
      }
      body.innerHTML=html;
    } else if(tab==="talents"){
      let html='<h3>永久天赋</h3><div>每局结束会把 25% 金币存入天赋银行，用来永久强化所有角色。</div><div class="codex-grid">'+
        D.TALENTS.map(t=>'<div class="codex-item"><b>'+t.name+'</b><div class="muted">'+t.branch+' · 上限 '+t.max+' 级</div><div>'+t.desc+'</div></div>').join("")+'</div>';
      body.innerHTML=html;
    } else if(tab==="ach"){
      const s=E.save.data, got=s.ach||{};
      body.innerHTML='<h3>成就（长线目标）</h3><div class="codex-grid">'+D.ACHIEVEMENTS.map(a=>{
        const done=!!got[a.id];
        return '<div class="codex-item '+(done?"legend":"")+'"><b>'+(done?"★ ":"")+a.name+'</b><div class="muted">奖励 '+a.reward+' 币 · '+(done?"已达成":"未达成")+'</div><div>'+a.desc+'</div></div>';
      }).join("")+'</div>';
    } else if(tab==="skin"){
      const sv=E.save.data, owned=sv.skins||{};
      const all=(D.DMG_SKINS||[]).slice().sort((a,b)=>((b.unlock&&b.unlock.type==="free")?1:0)-((a.unlock&&a.unlock.type==="free")?1:0));
      const rar=this._skinRarity||"all";
      const animeN=all.filter(s=>s.unlock&&s.unlock.type==="free").length;
      const list=rar==="all"?all:rar==="anime"?all.filter(s=>s.unlock&&s.unlock.type==="free"):all.filter(s=>s.rarity===rar);
      const per=24, pages=Math.max(1,Math.ceil(list.length/per));
      const page=Math.max(0,Math.min(this._skinPage||0,pages-1)); this._skinPage=page;
      const cnt={}; for(const s of all) cnt[s.rarity]=(cnt[s.rarity]||0)+1;
      const ownN=all.filter(s=>owned[s.id]).length;
      let html='<h3>伤害皮肤库 · 共 '+all.length+' 款（已解锁 '+ownN+'）</h3>';
      html+='<div class="skin-filter">'+["anime","all","common","rare","epic","legend"].map(r=>'<button class="tab'+(rar===r?" active":"")+'" data-skinrar="'+r+'">'+(r==="anime"?"动漫 "+animeN:r==="all"?"全部 "+all.length:D.RARITY_NAME[r]+" "+(cnt[r]||0))+'</button>').join("")+'</div>';
      html+='<div class="skin-grid">';
      for(const sk of list.slice(page*per,page*per+per)){
        const own=!!owned[sk.id], cur=sv.skin===sk.id;
        const art=window.WZ&&WZ.dmgSkins&&WZ.dmgSkins[sk.id];
        const digits=art?[1,2,3].map(d=>'<img loading="lazy" src="'+art.normal[d].s+'">').join(""):"";
        html+='<div class="skin-card '+sk.rarity+(own?"":" locked")+(cur?" selected":"")+'" data-skin="'+sk.id+'">'+
          '<div class="skin-preview">'+digits+'</div>'+
          '<div class="skin-name">'+sk.name+' <span class="muted">'+D.RARITY_NAME[sk.rarity]+'</span></div>'+
          '<div class="skin-desc">'+(sk.desc||"")+'</div>'+
          '<div class="skin-lock">'+(own?(cur?"✓ 使用中":"点击使用"):"🔒 "+((sk.unlock&&sk.unlock.label)||"未解锁"))+'</div></div>';
      }
      html+='</div>';
      html+='<div class="skin-pager"><button class="btn ghost" data-skinpage="'+(page-1)+'"'+(page<=0?" disabled":"")+'>← 上一页</button>'+
            '<span>第 '+(page+1)+' / '+pages+' 页</span>'+
            '<button class="btn ghost" data-skinpage="'+(page+1)+'"'+(page>=pages-1?" disabled":"")+'>下一页 →</button></div>';
      html+='<p class="muted" style="margin:6px 0 18px">皮肤资源来自《动漫皮肤插件》WZ 提取 · 共 '+all.length+' 款伤害数字特效（动漫皮肤 '+animeN+' 款默认解锁），点击卡片即时装备并写入存档</p>';
      body.innerHTML=html;
      body.querySelectorAll(".skin-card").forEach(el=>el.addEventListener("click",()=>{
        const id=el.dataset.skin;
        this.applySkin(id,()=>{ if(this.screen==="codex") this.renderCodex("skin"); });
      }));
      body.querySelectorAll("[data-skinrar]").forEach(el=>el.addEventListener("click",()=>{ this._skinRarity=el.dataset.skinrar; this._skinPage=0; this.renderCodex("skin"); }));
      body.querySelectorAll("[data-skinpage]").forEach(el=>el.addEventListener("click",()=>{ const n=parseInt(el.dataset.skinpage); if(isNaN(n))return; this._skinPage=Math.max(0,n); this.renderCodex("skin"); }));
    } else if(tab==="charskin"){
      const all=((window.WZ&&WZ.charSkinList)||[]).map(id=>WZ.charSkins&&WZ.charSkins[id]).filter(Boolean);
      const sv=E.save.data, map=sv.charSkins||{};
      let targetId=this._charSkinChar;
      if(!targetId||!D.CHARACTERS.some(c=>c.id===targetId)) targetId=(this.game&&this.game.player&&this.game.player.ch&&this.game.player.ch.id)||this.selChar||D.CHARACTERS[0].id;
      this._charSkinChar=targetId;
      const target=D.CHARACTERS.find(c=>c.id===targetId)||D.CHARACTERS[0];
      const per=24, pages=Math.max(1,Math.ceil(all.length/per));
      const page=Math.max(0,Math.min(this._charSkinPage||0,pages-1)); this._charSkinPage=page;
      const cur=map[targetId]||null;
      const curName=cur&&WZ.charSkins[cur]?WZ.charSkins[cur].name:"默认外观";
      let html='<h3>角色皮肤库 · 共 '+all.length+' 款（当前角色：'+target.name+'）</h3>';
      html+='<div class="char-skin-target"><label>给哪个角色换皮肤：<select id="char-skin-target">'+D.CHARACTERS.map(c=>'<option value="'+c.id+'"'+(c.id===targetId?" selected":"")+'>'+c.name+'</option>').join("")+'</select></label><span class="muted">当前：'+curName+' · 111 款全部免费</span><button class="btn ghost small" id="btn-char-skin-default"'+(cur?"":" disabled")+'>恢复默认外观</button></div>';
      html+='<div class="skin-grid">';
      for(const sk of all.slice(page*per,page*per+per)){
        const f=sk.anims&&sk.anims.stand&&sk.anims.stand[0];
        const eq=String(cur)===String(sk.id);
        html+='<div class="skin-card char-skin-card '+(eq?"selected":"")+'" data-charskin="'+sk.id+'">'+
          '<div class="skin-preview char">'+(f?'<img loading="lazy" src="'+f.s+'" alt="">':'')+'</div>'+
          '<div class="skin-name">'+sk.name+' <span class="muted">#'+sk.id+'</span></div>'+
          '<div class="skin-desc">全身皮肤 · 站立 / 行走 / 受击动作</div>'+
          '<div class="skin-lock">'+(eq?"✓ 已装备":"点击装备")+'</div></div>';
      }
      html+='</div>';
      html+='<div class="skin-pager"><button class="btn ghost" data-charskinpage="'+(page-1)+'"'+(page<=0?" disabled":"")+'>← 上一页</button>'+
            '<span>第 '+(page+1)+' / '+pages+' 页</span>'+
            '<button class="btn ghost" data-charskinpage="'+(page+1)+'"'+(page>=pages-1?" disabled":"")+'>下一页 →</button></div>';
      html+='<p class="muted" style="margin:6px 0 18px">皮肤资源来自《阿尔泰动漫皮肤》插件 · 全身替换外观，保留原角色名字 / 属性 / 专属技能</p>';
      body.innerHTML=html;
      const sel=body.querySelector("#char-skin-target");
      if(sel) sel.addEventListener("change",()=>{ this._charSkinChar=sel.value; this._charSkinPage=0; this.renderCodex("charskin"); });
      const bdef=body.querySelector("#btn-char-skin-default");
      if(bdef) bdef.addEventListener("click",()=>this.clearCharSkin(targetId));
      body.querySelectorAll("[data-charskin]").forEach(el=>el.addEventListener("click",()=>{
        this.applyCharSkin(el.dataset.charskin,targetId,()=>{ if(this.screen==="codex") this.renderCodex("charskin"); });
      }));
      body.querySelectorAll("[data-charskinpage]").forEach(el=>el.addEventListener("click",()=>{ const n=parseInt(el.dataset.charskinpage); if(isNaN(n))return; this._charSkinPage=Math.max(0,n); this.renderCodex("charskin"); }));
    } else if(tab==="mobs"){
      const mobs=window.WZ.mob||{};
      const mobIds=Object.keys(mobs);
      let html='<h3>怪物图鉴 · 共 '+mobIds.length+' 种</h3>';
      for(const m of D.MAPS){
        const ids=[...m.pool,m.elite,m.boss].filter(Boolean);
        const seen=new Set();
        html+='<div class="mob-map"><h4>'+m.name+' <span class="muted">'+m.modText+'</span></h4><div class="mob-grid">';
        for(const id of ids){
          if(seen.has(id)) continue; seen.add(id);
          const md=mobs[id];
          const fr=md&&md.a&&((md.a.stand&&md.a.stand[0])||(md.a.move&&md.a.move[0]));
          const tag=id===m.boss?"BOSS":id===m.elite?"精英":"小怪";
          html+='<div class="mob-card"><div class="mob-thumb">'+(fr?'<img loading="lazy" src="'+fr.s+'" alt="">':'<span>?</span>')+'</div><div class="mob-name">'+(md?md.name:id)+'</div><div class="mob-tag '+(tag==="BOSS"?"boss":tag==="精英"?"elite":"")+'">'+tag+'</div></div>';
        }
        html+='</div></div>';
      }
      body.innerHTML=html;
    }
  }
};

window.UI=UI;
})();
