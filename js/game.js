/* game.js — 核心循环：波次 / 战斗 / 掉落 / 升级 / 商店 */
(function(){
const D=window.GD,E=window.ENG,{Player,Enemy,Projectile,Pickup,Particle}=window.ENT;

const ROLE_BASE={
  chaser:  {hp:14, spd:76,  dmg:7,  xp:1, gold:1},
  runner:  {hp:9,  spd:122, dmg:5,  xp:1, gold:1},
  tank:    {hp:34, spd:50,  dmg:12, xp:3, gold:3},
  shooter: {hp:12, spd:64,  dmg:6,  xp:2, gold:2},
  exploder:{hp:11, spd:100, dmg:14, xp:2, gold:2},
  summoner:{hp:26, spd:58,  dmg:7,  xp:3, gold:3}
};

class Game{
  constructor(renderer){
    this.r=renderer; this.raf=false; this.state="idle";
    this.world={w:2200,h:1600,map:D.MAPS[0]};
    this.enemies=[]; this.projectiles=[]; this.pickups=[]; this.particles=[]; this.texts=[]; this.meteors=[]; this.allies=[];
    this.fx=[]; this.objects=[]; this.timers=[]; this.hazards=[]; this.endless=false; this.daily=null; this.bankEarned=0;
    this.time=0; this.timeSlow=0; this.wave=1; this.waveLeft=0; this.waveTime=0; this.spawned=0; this.budget=0;
    this.spawnTimer=0; this.pendingLevels=0; this.paused=false; this.over=false;
    this.toast=null;
  }

  /* ---------- 开始 ---------- */
  start(charId,mapId,opts){
    opts=opts||{};
    this.charId=charId; this.mapId=mapId;
    const ch=D.CHARACTERS.find(c=>c.id===charId), baseMap=D.MAP_BY_ID[mapId];
    this.ch=ch;
    const map=Object.assign({},baseMap,{mods:Object.assign({},baseMap.mods)});
    this.daily=opts.daily||null; this.endless=!!opts.endless;
    const _diff=(D.DIFFICULTY_BY_ID&&D.DIFFICULTY_BY_ID[opts.difficulty])||
      ((D.DIFFICULTIES||[]).find(x=>x.key==="normal"))||{key:"normal",name:"标准",hp:1,dmg:1,spawn:1,reward:1,elite:1};
    this.difficulty=_diff;
    if(this.daily){ for(const m of this.daily.mods){ try{ m.apply(map.mods); }catch(e){} } }
    this.map=map;
    this.world={w:2200,h:1600,map};
    this.r.setWorld(this.world.w,this.world.h,map);
    this.player=new Player(this,ch);
    this.player.autoAim=!!opts.autoAim;
    if(D.TALENTS){ this.player.applyTalents(E.save.data); this.player.recompute(); this.player.hp=this.player.maxHp; }
    if(this.daily){
      if(map.mods.playerHpMul) this.player.stats.maxHp=Math.round(this.player.stats.maxHp*map.mods.playerHpMul);
      if(map.mods.playerSpeed) this.player.stats.speed+=map.mods.playerSpeed;
      if(map.mods.luck) this.player.stats.luck+=map.mods.luck;
      this.player.recompute(); this.player.hp=this.player.maxHp;
    }
    this.player.x=this.world.w/2; this.player.y=this.world.h/2;
    const _sv=E.save.data||{};
    const _charSkin=_sv.charSkins&&_sv.charSkins[charId];
    this.charSkinId=_charSkin||null;
    this.heroFrames=window.buildHeroArt(charId);
    if(_charSkin) this.setCharSkin(_charSkin);
    this.enemies=[];this.projectiles=[];this.pickups=[];this.particles=[];this.texts=[];this.meteors=[];this.allies=[];this.fx=[];this.objects=[];
    this.timers=[]; this.hazards=[]; this._hitCd={}; this._hitCdN=0; this.fxCount=0; this.npcPos=null;
    this.time=0;this.timeSlow=0;this.wave=1;this.over=false;this.paused=false;this.pendingLevels=0;this.bankEarned=0;
    this.shopBuys=0; this.shopRerolls=0;
    this.totalKills=0;this.startTime=Date.now();
    this.buildEnemyDefs();
    this.beginWave(1);
    this.raf=true; this.state="playing";
  }

  /* 切换角色全身皮肤：等帧加载完再重建合成图，避免加载中闪现空帧 */
  setCharSkin(skinId, done){
    const sid=skinId||null;
    if(!sid){ this.charSkinId=null; this.heroFrames=window.buildHeroArt(this.charId); if(done) done(); return; }
    const sk=window.WZ&&window.WZ.charSkins&&window.WZ.charSkins[sid];
    if(!sk){ this.charSkinId=null; this.heroFrames=window.buildHeroArt(this.charId); if(done) done(); return; }
    const build=()=>{ if(this.charSkinId!==sid) return;
      const first=(sk.anims&&sk.anims.stand&&sk.anims.stand[0])||null;
      const rec=first&&E.images&&E.images[first.s];
      if(!rec||!rec.ready||rec.error){ this.heroFrames=window.buildHeroArt(this.charId); return; }
      this.heroFrames=(window.buildCharSkinArt&&window.buildCharSkinArt(sid))||window.buildHeroArt(this.charId); };
    const list=[];
    for(const role of ["stand","walk","hit"]) for(const f of (sk.anims&&sk.anims[role]||[])) if(f&&f.s) list.push(f.s);
    const uniq=[...new Set(list)];
    const missing=uniq.filter(s=>{ const r=E.images[s]; return !r||(!r.ready&&!r.error); });
    this.charSkinId=sid;
    if(!missing.length){ build(); if(done) done(); return; }
    const seq=(this._charSkinSeq=(this._charSkinSeq||0)+1);
    let held=false,released=false;
    const release=()=>{ if(released||!held) return; released=true; try{ E.releasePreload&&E.releasePreload(); }catch(e){} };
    const commit=()=>{ release(); if(seq!==this._charSkinSeq||this.charSkinId!==sid) return; build(); if(done) done(); };
    if(E.holdPreload){ try{ E.holdPreload(); held=true; }catch(e){} }
    Promise.race([E.preloadAll(uniq,null,{priority:"high"}),new Promise(r=>setTimeout(r,9000))]).then(commit).catch(commit);
  }

  buildEnemyDefs(){
    const map=this.map, mobData=window.WZ.mob||{};
    const DF=this.difficulty||{}, DFHP=DF.hp||1, DFDMG=DF.dmg||1, DFREW=DF.reward||1;
    const A=frames=>frames?frames.map(f=>({img:E.loadImage(f.s),w:f.w,h:f.h,d:f.d})):[];
    const roles=["chaser","chaser","runner","tank","shooter","exploder","summoner"];
    this.defs={};
    map.pool.forEach((mobId,i)=>{
      const role=roles[i%roles.length];
      const rb=ROLE_BASE[role];
      const md=mobData[mobId];
      const anims=md?md.a:{};
      const standF=anims.stand&&anims.stand[0];
      const baseH=standF?standF.h:48;
      const targetH={chaser:52,runner:44,tank:84,shooter:52,exploder:48,summoner:64}[role];
      let scale=E.clamp(targetH/baseH,0.35,1.8);
      this.defs[mobId]={ mobId, role, name:(md&&md.name)||mobId,
        hp:rb.hp*(map.mods.enemyHp||1)*(D.MOB_SCALE||1)*(D.MOB_HP_MUL||1)*DFHP, speed:rb.spd, dmg:rb.dmg*(map.mods.enemyDamage||1)*(D.MOB_SCALE||1)*(D.MOB_DMG_MUL||1)*DFDMG,
        xp:Math.max(1,Math.round(rb.xp*DFREW)), gold:Math.max(1,Math.round(rb.gold*DFREW)), size:scale, ai:(D.ROLES[role]||{}).ai||"chase",
        range:(D.ROLES[role]||{}).range||280, summon:role==="summoner"?1:0,
        explode:role==="exploder"?1:0, skillKind:role==="summoner"?"summon":role==="shooter"?"volley":role==="exploder"?"blast":role==="tank"?"slam":"ring", animSet:{stand:A(anims.stand),move:A(anims.move),hit1:A(anims.hit1),die1:A(anims.die1),attack:A(anims.attack1||anims.attack2),skill:A(anims.skill1)}, hpMul:1 };
    });
    // 精英 & Boss
    const em=map.elite, emd=mobData[em];
    if(em&&emd){
      const f=emd.a.stand&&emd.a.stand[0], h=f?f.h:60;
      this.defs[em]={ mobId:em, role:"tank", name:emd.name, hp:ROLE_BASE.tank.hp*5*(D.ELITE_HP_MUL||1)*(map.mods.enemyHp||1)*(D.MOB_SCALE||1)*(D.MOB_HP_MUL||1)*DFHP,
        speed:64, dmg:ROLE_BASE.tank.dmg*1.1*(D.MOB_DMG_MUL||1)*DFDMG, xp:Math.max(1,Math.round(12*DFREW)), gold:Math.max(1,Math.round(10*DFREW)), size:E.clamp(96/h,0.4,2.2),
        ai:"chase", animSet:{stand:A(emd.a.stand),move:A(emd.a.move),hit1:A(emd.a.hit1),die1:A(emd.a.die1),attack:A(emd.a.attack1||emd.a.attack2),skill:A(emd.a.skill1)}, elite:true, skillKind:"slam", hpMul:1 };
    }
    const bm=map.boss, bmd=mobData[bm];
    const BOSS_SETS={snow:["slam","nova","charge"],desert:["charge","slam","summon"],tower:["nova","charge","summon","slam"],void:["poison","nova","charge","summon"],corrupt:["poison","slam","summon"]};
    if(bm&&bmd){
      const f=bmd.a.stand&&bmd.a.stand[0], h=f?f.h:120;
      // v10 平衡：天赋恢复多级后，满天赋玩家相对无天赋约 +48% 输出，Boss 血量同步上浮 17%。
      // 目标区间：无天赋 30 秒上下勉强压线，满天赋 20 秒左右从容。
      this.bossDef={ mobId:bm, role:"tank", name:bmd.name, hp:(950+this.wave*390)*(map.mods.enemyHp||1)*DFHP,
        // v9 平衡：BOSS 单击伤害按波次线性增长，不低于同波小怪、又不会一击秒杀玩家
        speed:56, dmg:(10+this.wave*2.6)*(D.MOB_DMG_MUL||1)*(map.mods.enemyDamage||1)*DFDMG, xp:Math.max(1,Math.round(60*DFREW)), gold:Math.max(1,Math.round(60*DFREW)),
        size:(map.bossScale||0.6)*E.clamp(180/h,0.3,1.6), ai:"chase", animSet:{stand:A(bmd.a.stand),move:A(bmd.a.move),hit1:A(bmd.a.hit1),die1:A(bmd.a.die1),attack:A(bmd.a.attack1||bmd.a.attack2),skill:A(bmd.a.skill1||bmd.a.attack1)}, boss:true, hpMul:1, rawHp:true,
        skillSet:BOSS_SETS[map.id]||["nova","summon","slam"] };
    }
    // 扎昆 8 臂（最终 BOSS）
    this.armDefs=[];
    if(D.ZAKUM&&D.ZAKUM.arms){
      for(const armId of D.ZAKUM.arms){
        const ad=mobData[armId]; if(!ad) continue;
        const f=ad.a.stand&&ad.a.stand[0], h=f?f.h:80;
        this.armDefs.push({ mobId:armId, role:"tank", name:(ad.name||"扎昆手臂"), hp:(2200+this.wave*120)*DFHP,
          speed:0, dmg:(25+this.wave*1.5)*DFDMG, xp:Math.max(1,Math.round(20*DFREW)), gold:Math.max(1,Math.round(8*DFREW)), size:E.clamp(130/h,0.4,2.2), ai:"keep",
          range:120, arm:true, elite:true, hpMul:1, rawHp:true,
          skillKind:"slam", animSet:{stand:A(ad.a.stand),move:A(ad.a.move),hit1:A(ad.a.hit1),die1:A(ad.a.die1),attack:A(ad.a.attack1||ad.a.attack2),skill:A(ad.a.skill1)} });
      }
    }
  }

  /* ---------- 波次 ---------- */
  beginWave(w){
    this.wave=w; this.waveData=D.waveDef(w);
    this.hazards=[]; this.timers=[];
    this.waveTime=this.waveData.t; this.waveLeft=this.waveTime;
    const _dsp=(this.difficulty&&this.difficulty.spawn)||1;
    this.budget=Math.round(this.waveData.n*(this.map.mods.spawnRate||1)*_dsp);
    this.spawned=0; this.spawnTimer=0; this.bossSpawned=false; this.eliteSpawned=0;
    this.state="playing"; this.paused=false;
    this.grantExclusiveUnlocks(w);
    this.spawnObjects();
    E.sfx.wave();
    this.toastText("第 "+w+" 波 开始"+(this.waveData.boss?" · BOSS":""));
    if(this.waveData.final && D.ZAKUM && this.map.boss===D.ZAKUM.id) this.spawnZakum();
    else if(this.waveData.boss&&this.bossDef) this.spawnBoss();
    else if(this.waveData.eliteBoss) this.spawnElite();
  }

  /* v8.3：第 5 波自动觉醒第二专属技能（预留一个技能槽） */
  grantExclusiveUnlocks(w){
    const p=this.player; if(!p)return;
    const ex=(D.SKILLS||[]).find(s=>s.exclusive===this.charId&&s.unlockWave&&w>=s.unlockWave);
    if(!ex||p.skills.some(x=>x.id===ex.id))return;
    if(p.skills.length>=4){
      const idx=p.skills.findIndex(x=>{const d=D.SKILL_BY_ID[x.id];return d&&!d.exclusive;});
      if(idx>=0)p.skills.splice(idx,1);
    }
    if(p.addSkill(ex.id)){ this.toastText("专属技能觉醒 · "+ex.name); this.effectRing(p.x,p.y,130,"#ffd27a",0.6); }
  }

  spawnBoss(){
    if(!this.bossDef||this.bossSpawned)return;
    this.bossSpawned=true;
    const a=E.rand(Math.PI*2), d=520;
    const b=new Enemy(this,Object.assign({},this.bossDef,{hp:this.bossDef.hp}),
      E.clamp(this.player.x+Math.cos(a)*d,80,this.world.w-80),
      E.clamp(this.player.y+Math.sin(a)*d,80,this.world.h-80), this.wave, 1);
    b.isBoss=true; b.name=this.bossDef.name; b.bossHpMax=b.maxHp;
    this.enemies.push(b); this.boss=b;
    if(E.bgm&&window.WZ&&WZ.bgm&&WZ.bgm.boss) E.bgm.play("boss");
    E.sfx.skill(); this.r.shakeAdd(10);
  }

  spawnZakum(){
    const Z=D.ZAKUM, p=this.player;
    if(!this.bossDef){ this.spawnBoss(); return; }
    this.bossSpawned=true;
    // v9 平衡：扎昆血量不再叠乘 MOB/BOSS 倍率（原公式 ×1.8×2.5 后有效血量仍远超 40 秒可打范围）
    const base=Object.assign({},this.bossDef,{hp:Math.round(Z.hp*((this.difficulty&&this.difficulty.hp)||1)),rawHp:true,zakum:true,name:"扎昆",boss:true,skillSet:["nova","slam","summon","poison"]});
    const b=new Enemy(this,base,this.world.w/2,this.world.h/2,this.wave,1);
    b.isBoss=true; b.zakum=true; b.name="扎昆"; b.bossHpMax=b.maxHp; b.bossCd=2.2;
    this.enemies.push(b); this.boss=b; this.zakum=b;
    this.armDefs=this.armDefs||[];
    this.armDefs.forEach((ad,i)=>{
      const a=i/this.armDefs.length*Math.PI*2;
      const e=new Enemy(this,ad,this.world.w/2+Math.cos(a)*170,this.world.h/2+Math.sin(a)*150,this.wave,1);
      e.isElite=true; e.isZakumArm=true; e.armOf=b; e.name="扎昆手臂";
      this.enemies.push(e);
    });
    if(E.bgm&&window.WZ&&WZ.bgm&&WZ.bgm.boss) E.bgm.play("boss");
    this.toastText("最终 BOSS：扎昆降临！"); E.sfx.skill(); this.r.shakeAdd(18);
  }

  spawnOne(roleOverride){
    if(this.enemies.length>=185) return;
    const pool=this.map.pool;
    const role=roleOverride||this.waveData.mix[Math.floor(Math.random()*this.waveData.mix.length)];
    const cands=Object.values(this.defs).filter(d=>d.role===role&&!d.elite&&!d.boss);
    let def=cands.length?E.pick(cands):Object.values(this.defs).find(d=>!d.elite&&!d.boss);
    if(!def)return;
    const p=this.player;
    let x,y,tries=0;
    do{
      const a=E.rand(Math.PI*2), d=E.rand(620,900);
      x=E.clamp(p.x+Math.cos(a)*d,40,this.world.w-40);
      y=E.clamp(p.y+Math.sin(a)*d,40,this.world.h-40);
      tries++;
    }while(E.dist(x,y,p.x,p.y)<430&&tries<12);
    // v9：12 次都拿不到安全点（玩家贴角），改为朝地图中心方向定点生成，避免怪直接刷在脸上
    if(E.dist(x,y,p.x,p.y)<430){
      const cx=this.world.w/2, cy=this.world.h/2;
      const a=E.ang(p.x,p.y,cx,cy)+E.rand(1.1,-1.1);
      const d=E.clamp(Math.min(this.world.w,this.world.h)*0.30,430,780);
      x=E.clamp(p.x+Math.cos(a)*d,40,this.world.w-40);
      y=E.clamp(p.y+Math.sin(a)*d,40,this.world.h-40);
    }
    const e=new Enemy(this,def,x,y,this.wave,1);
    this.enemies.push(e);
  }

  spawnElite(){
    const el=Object.values(this.defs).find(d=>d.elite);
    if(!el)return;
    const p=this.player, a=E.rand(Math.PI*2), d=560;
    const e=new Enemy(this,el,E.clamp(p.x+Math.cos(a)*d,60,this.world.w-60),E.clamp(p.y+Math.sin(a)*d,60,this.world.h-60),this.wave,1);
    e.isElite=true; this.enemies.push(e);
    this.toastText("精英出现："+el.name);
  }

  summonMinions(src){
    const def=Object.values(this.defs).find(d=>d.role==="chaser"&&!d.elite&&!d.boss);
    if(!def)return;
    for(let i=0;i<2;i++){
      const a=E.rand(Math.PI*2);
      const e=new Enemy(this,def,src.x+Math.cos(a)*40,src.y+Math.sin(a)*40,this.wave,0.8);
      e.maxHp=Math.round(e.maxHp*0.6); e.hp=e.maxHp; e.xp=1; e.gold=1;
      this.enemies.push(e);
    }
    this.effectRing(src.x,src.y,60,"#b89bff");
  }

  /* ---------- 场景物件：宝箱 / 木箱 / 陷阱 / 商店 NPC ---------- */
  spawnObjects(){
    this.objects=[];
    const W=this.world, p=this.player;
    const rndPos=(minD)=>{
      for(let i=0;i<40;i++){
        const x=E.rand(140,W.w-140), y=E.rand(140,W.h-140);
        if(E.dist(x,y,p.x,p.y)>minD) return {x,y};
      }
      return {x:E.rand(140,W.w-140),y:E.rand(140,W.h-140)};
    };
    const chests=1+(Math.random()<0.5?1:0);
    for(let i=0;i<chests;i++){ const q=rndPos(360); this.objects.push({kind:"chest",x:q.x,y:q.y,r:26,hp:1,open:false,t:0}); }
    for(let i=0;i<7;i++){ const q=rndPos(220); this.objects.push({kind:"crate",x:q.x,y:q.y,r:14,hp:18+this.wave*4,maxHp:18+this.wave*4,t:0}); }
    const traps=this.map.theme==="forest"?2:4;
    for(let i=0;i<traps;i++){ const q=rndPos(260); this.objects.push({kind:"trap",x:q.x,y:q.y,r:34,cd:E.rand(1.5,0),t:0}); }
    // v9：NPC 位置一局内固定，避免每波重随机让玩家找不到商店
    if(!this.npcPos){ const nq=rndPos(420); this.npcPos={x:nq.x,y:nq.y}; }
    this.objects.push({kind:"npc",x:this.npcPos.x,y:this.npcPos.y,r:26,t:0});
  }
  updateObjects(dt){
    const p=this.player;
    for(const o of this.objects){
      o.t=(o.t||0)+dt;
      if(o.kind==="trap"){
        o.cd-=dt;
        if(o.cd<=0){
          o.cd=1.6; o.flash=0.25;
          // v9 平衡：陷阱是环境辅助伤害。普通怪按最大生命比例，精英/Boss/手臂改为固定值，
          // 否则 6% 最大生命一击就能打掉 1500 万血 Boss 的 90 万，直接架空 Boss 战
          const trapFlat=40+this.wave*12;
          for(const e of this.enemies){
            if(e.dead||E.dist(o.x,o.y,e.x,e.y)>=o.r+e.r) continue;
            const td=(e.isBoss||e.isElite||e.isZakumArm)?trapFlat:Math.max(6,e.maxHp*0.06);
            this.damageEnemy(e,td,"elemental");
          }
          if(E.dist(o.x,o.y,p.x,p.y)<o.r+10) p.takeDamage(8+this.wave,o,this);
        }
        if(o.flash>0) o.flash-=dt;
      } else if(o.kind==="chest"&&!o.open){
        if(E.dist(o.x,o.y,p.x,p.y)<46) this.openChest(o);
      } else if(o.kind==="npc"){
        o.near=E.dist(o.x,o.y,p.x,p.y)<96;
        if(o.near&&E.key("KeyE")&&!E.keys["E_latch"]){ E.keys["E_latch"]=true; window.UI&&UI.openNpcShop(this); }
        if(!E.key("KeyE")) E.keys["E_latch"]=false;
        if(window.UI&&UI.setInteract) UI.setInteract(!!o.near,o);
      }
    }
  }
  damageObjects(x,y,r,dmg){
    for(const o of this.objects){
      if(o.kind!=="crate"||o.hp<=0) continue;
      if(E.dist(x,y,o.x,o.y)<r+o.r){ o.hp-=dmg; this.hitSpark(o.x,o.y-10,false);
        if(o.hp<=0) this.breakCrate(o); }
    }
  }
  breakCrate(o){
    o.hp=0; o.broken=true;
    this.particles.push(new Particle({x:o.x,y:o.y-10,life:0.45,size:16,color:"#c8a06a",type:"puff"}));
    const n=1+Math.floor(Math.random()*3);
    for(let i=0;i<n;i++) this.pickups.push(new Pickup("gold",o.x,o.y,E.rand(6,3)*(1+this.wave*0.12)));
    if(Math.random()<0.12) this.pickups.push(new Pickup("heart",o.x,o.y,14));
    if(Math.random()<0.10) this.pickups.push(new Pickup("card",o.x,o.y,1));
    E.sfx.kill();
  }
  openChest(o){
    o.open=true;
    this.spawnFx("holy",o.x,o.y,0.5);
    const roll=Math.random();
    if(roll<0.12){ this.pickups.push(new Pickup("relic",o.x,o.y-10,1)); }
    else if(roll<0.55){ this.pickups.push(new Pickup("card",o.x,o.y-10,1)); }
    for(let i=0;i<5;i++) this.pickups.push(new Pickup("gold",o.x,o.y,E.rand(20,8)));
    E.sfx.gold(); this.toastText("宝箱开启");
  }
  grantCard(){
    const w=D.RARITY_WEIGHT, pool=D.CARDS;
    const card=E.weighted(pool,pool.map(c=>w[c.rarity]||10));
    this.player.addCard(card);
    this.toastText("获得卡牌："+card.name);
    this.popup(this.player.x,this.player.y-70,card.name,"#ffe08a");
    this.spawnFx("bigburst",this.player.x,this.player.y,0.5);
  }
  grantRelic(){
    const owned=this.player.relics.map(r=>r.id);
    const pool=D.RELICS.filter(r=>!owned.includes(r.id));
    if(!pool.length){ this.grantCard(); return; }
    const r=E.pick(pool);
    if(this.player.addRelic(r)){ E.save.data.relicSeen=E.save.data.relicSeen||{}; E.save.data.relicSeen[r.id]=1; this.toastText("获得遗物："+r.name); E.sfx.level(); this.spawnFx("meteor",this.player.x,this.player.y,0.6); }
    else this.grantCard();
  }
  fxColor(name){
    const COL={whirl:"#ffe9b0",arrowrain:"#bfe8ff",meteor:"#ff8a4d",shadow:"#b07bff",shield:"#ffe08a",heal:"#7cf0a0",
      slow:"#8bd4ff",summon:"#d8c8ff",shockwave:"#cfe8ff",nova:"#ff9ad5",explosion:"#ffb04d",bigburst:"#ffd76a",holy:"#fff3c4"};
    return COL[name]||"#9fd8ff";
  }
  spawnFx(name,x,y,scale,flip){
    const f=window.WZ&&window.WZ.fx&&window.WZ.fx[name];
    if(!f) return;
    if(this.fx.length>=24) this.fx.shift();
    const col=this.fxColor(name);
    const d=(f.frames&&f.frames[0]&&f.frames[0][0]&&f.frames[0][0].d)||55;
    this.fx.push({f:{frames:f.frames,d},x,y,scale:(scale||1)*1.4,flip:!!flip,t:0,i:0,acc:0,color:col});
    this.particles.push(new Particle({x,y,life:0.5,size:92*(scale||1),color:col,type:"burst"}));
    this.particles.push(new Particle({x,y,life:0.34,size:70*(scale||1),color:"#ffffff",type:"ring"}));
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; this.particles.push(new Particle({x,y,vx:Math.cos(a)*220*Math.min(1.5,scale||1),vy:Math.sin(a)*220*Math.min(1.5,scale||1),life:0.4,size:4,color:col,type:"dot"})); }
  }
  /* SKILL 目录导出的技能特效：按作用范围等比缩放，最多 20 层同屏 */
  pushSkillLayer(skill,role,x,y,radius,alpha,color){
    const set=window.WZ&&window.WZ.sfx&&window.WZ.sfx[skill];
    const layer=set&&set[role];
    if(!layer||!layer.frames.length)return false;
    if((this.fxCount||0)>=20) return false;
    let mx=1;
    for(const f of layer.frames) for(const p of f) mx=Math.max(mx,p.w||0,p.h||0);
    const sc=E.clamp((radius*2)/mx,0.22,2.6);
    const d=(layer.frames[0][0]&&layer.frames[0][0].d)||110;
    this.fx.push({f:{frames:layer.frames,d},x,y,scale:sc,flip:false,t:0,i:0,acc:0,color:color||this.fxColor(skill),alpha:alpha==null?1:alpha});
    this.fxCount=(this.fxCount||0)+1;
    return true;
  }
  spawnSkillFx(skill,x,y,radius,opts){
    const o=opts||{};
    this.pushSkillLayer(skill,"main",x,y,radius,1,o.color);
    if(o.hit) this.pushSkillLayer(skill,"hit",x,y,Math.max(50,radius*0.55),0.95,o.color);
    const col=o.color||this.fxColor(skill);
    this.particles.push(new Particle({x,y,life:0.4,size:Math.max(40,radius*0.75),color:col,type:"ring"}));
    for(let i=0;i<6;i++){ const a=i/8*Math.PI*2; this.particles.push(new Particle({x,y,vx:Math.cos(a)*radius*2.2,vy:Math.sin(a)*radius*2.2,life:0.34,size:3,color:col,type:"dot"})); }
  }

  /* ---------- 武器/弹幕/命中素材特效 ---------- */
  spawnAtkFx(key,role,x,y,radius,alpha,flip,angle){
    const set=window.WZ&&window.WZ.atk&&window.WZ.atk[key];
    const layer=set&&set[role];
    if(!layer||!layer.frames.length)return false;
    if((this.fxCount||0)>=20||this.fx.length>=24)return false;
    let mx=1;
    for(const f of layer.frames) for(const p of f) mx=Math.max(mx,p.w||0,p.h||0);
    const sc=E.clamp((radius*2)/mx,0.12,2.4);
    const d=(layer.frames[0][0]&&layer.frames[0][0].d)||100;
    this.fx.push({f:{frames:layer.frames,d},x,y,scale:sc,flip:!!flip,angle:angle||0,t:0,i:0,acc:0,color:role==="hit"?"#ffffff":this.fxColor(key),alpha:alpha==null?1:alpha});
    this.fxCount=(this.fxCount||0)+1;
    return true;
  }
  spawnWeaponFx(key,x,y,radius,angle){
    const a=angle||0;
    const off=(key==="aura"||key==="chain")?0:16;
    return this.spawnAtkFx(key,"effect",x+Math.cos(a)*off,y+Math.sin(a)*off,radius,0.72,false,a);
  }
  spawnHitFx(key,x,y,scale){
    if(!key)return;
    const now=this.time||0;
    this._hitCd=this._hitCd||{};
    this._hitCdN=(this._hitCdN||0)+1;
    if(this._hitCdN>4000){ this._hitCd={}; this._hitCdN=0; }
    const id=key+"|"+Math.round(x/32)+"|"+Math.round(y/32);
    if(now-(this._hitCd[id]||-99)<0.12)return;
    this._hitCd[id]=now;
    if(key.indexOf("sk:")===0){ this.pushSkillLayer(key.slice(3),"hit",x,y,Math.max(42,38*(scale||1)),0.95); return; }
    this.spawnAtkFx(key,"hit",x,y,Math.max(34,36*(scale||1)),0.82,false,0);
  }
  spawnMobFx(key,x,y,radius){
    const set=window.WZ&&window.WZ.mobfx&&window.WZ.mobfx[key];
    if(!set||!set.frames||!set.frames.length)return false;
    if((this.fxCount||0)>=20||this.fx.length>=24)return false;
    let mx=1; for(const f of set.frames) for(const p of f) mx=Math.max(mx,p.w||0,p.h||0);
    const sc=E.clamp((radius*2)/mx,0.14,1.8);
    this.fx.push({f:{frames:set.frames,d:100},x,y,scale:sc,flip:false,angle:0,t:0,i:0,acc:0,color:"#ff8a4d",alpha:0.85});
    this.fxCount=(this.fxCount||0)+1;
    return true;
  }
  updateFx(dt){
    for(const q of this.fx){
      q.t+=dt; q.acc+=dt;
      const d=(q.f.d||55)/1000;
      while(q.acc>=d && q.i<q.f.frames.length-1){ q.acc-=d; q.i++; }
    }
    this.fx=this.fx.filter(q=>q.i<q.f.frames.length-1 || q.t<q.f.frames.length*(q.f.d||55)/1000);
    this.fxCount=this.fx.length;
  }

  /* ---------- 更新 ---------- */
  update(dt){
    if(!this.raf||this.paused||this.over)return;
    this.time+=dt;
    if(this.timeSlow>0)this.timeSlow-=dt;
    const p=this.player;
    p.update(dt,this);
    this.r.follow(p.x,p.y,dt,this.world);

    // 生成
    if(this.spawned<this.budget){
      this.spawnTimer-=dt;
      const interval=this.waveTime/Math.max(1,this.budget);
      if(this.spawnTimer<=0){
        this.spawnTimer=interval;
        const batch=Math.min(this.budget-this.spawned, 1+(this.wave>8?1:0)+(this.wave>15?1:0));
        for(let i=0;i<batch;i++){ this.spawnOne(); this.spawned++; }
      }
    }
    // 精英
    const eliteTarget=Math.max(0,Math.round((this.waveData.elite||0)*((this.difficulty&&this.difficulty.elite)||1)));
    if(this.eliteSpawned<eliteTarget && this.waveLeft<this.waveTime*0.55){ this.eliteSpawned++; this.spawnElite(); }

    this.updateWeapons(dt);
    this.updateSkills(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateAllies(dt);
    this.updatePickups(dt);
    this.updateMeteors(dt);
    this.updateObjects(dt);
    for(const tm of this.timers) tm.t-=dt;
    this.timers=this.timers.filter(tm=>{ if(tm.t<=0){ tm.fn(); return false; } return true; });
    for(const hz of this.hazards){
      hz.t-=dt; hz.cd-=dt;
      if(hz.cd<=0 && E.dist(p.x,p.y,hz.x,hz.y)<hz.r){ hz.cd=0.8; p.takeDamage(hz.dmg,null,this); }
    }
    this.hazards=this.hazards.filter(hz=>hz.t>0);
    this.updateFx(dt);
    // 粒子与文字
    for(const pa of this.particles)pa.update(dt);
    this.particles=this.particles.filter(x=>!x.dead);
    for(const t of this.texts){ t.t+=dt; t.y-=42*dt; }
    this.texts=this.texts.filter(t=>t.t<0.9);
    // 摄像机震动
    this.r.update(dt);
    // 波次计时
    this.waveLeft-=dt;
    if(this.waveLeft<=0) this.endWave();
    if(this.player.hp<=0) this.gameOver();
  }

  updateWeapons(dt){
    const p=this.player, s=p.stats;
    const asMul=1+s.attackSpeedPct/100;
    const rangeMul=1+(s.range||0)/100;
    for(const w of p.weapons){
      const def=D.WEAPON_BY_ID[w.id]; if(!def)continue;
      w.timer-=dt;
      if(w.timer>0)continue;
      const lvlMul=1+(w.lvl-1)*0.22;
      const target=this.nearestEnemy(p.x,p.y,(def.range||200)*rangeMul+(def.kind==="aura"?0:60));
      if(!target&&def.kind!=="aura")continue;
      const cd=Math.max(0.12,(def.cd||0.6)/asMul);
      w.timer=cd;
      const isMelee=(def.kind==="arc"||def.kind==="thrust");
      const typeMul=1+(isMelee?(s.meleePct||0):(s.rangedPct||0))/100;
      let dmg=(def.dmg||10)*lvlMul*(1+(s.damagePct||0)/100)*typeMul*(D.PLAYER_DMG_MUL||1);
      const extra=(s.projectiles||0);
      switch(def.kind){
        case "arc": {
          const ang=target?E.ang(p.x,p.y,target.x,target.y):p.aim;
          const range=(def.range||80)*rangeMul;
          this.arcDamage(p.x,p.y,ang,range,def.arc||1.6,dmg,"melee",{knock:def.knock||60,fx:def.fx});
          this.spawnWeaponFx(def.fx,p.x,p.y,range,ang);
          break;
        }
        case "thrust": {
          const ang=target?E.ang(p.x,p.y,target.x,target.y):p.aim;
          const range=(def.range||120)*rangeMul;
          if(def.fx==="spear") this.spearCombo(ang,range,def.width||24,dmg,def.pierce||2);
          else { this.lineDamage(p.x,p.y,ang,range,def.width||24,dmg,def.pierce||2,{fx:def.fx}); this.spawnWeaponFx(def.fx,p.x,p.y,range,ang); }
          break;
        }
        case "shot": {
          const ang=target?E.ang(p.x,p.y,target.x,target.y):p.aim;
          const n=1+extra;
          for(let i=0;i<n;i++){
            const a=ang+(i-(n-1)/2)*0.14;
            this.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*(def.speed||600),vy:Math.sin(a)*(def.speed||600),
              dmg,life:(def.range||400)/(def.speed||600),pierce:def.pierce||0,color:"#ffe08a",kind:"shot",splash:def.splash||0,fx:def.fx});
          }
          E.sfx.hit();
          break;
        }
        case "homing": {
          const n=1+extra;
          for(let i=0;i<n;i++){
            const a=E.ang(p.x,p.y,target.x,target.y)+(i-(n-1)/2)*0.3;
            this.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*(def.speed||330),vy:Math.sin(a)*(def.speed||330),
              dmg,life:1.8,color:"#b79cff",kind:"orb",homing:true,target,radius:9,splash:def.splash||36,fx:def.fx});
          }
          E.sfx.skill();
          break;
        }
        case "boomerang": {
          const ang=target?E.ang(p.x,p.y,target.x,target.y):p.aim;
          const maxDist=def.range||300;
          const n=Math.min(5,1+extra);
          const spread=20*Math.PI/180;
          const step=n>1?spread/(n-1):0;
          for(let i=0;i<n;i++){
            const a=ang+(i-(n-1)/2)*step;
            this.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*(def.speed||520),vy:Math.sin(a)*(def.speed||520),
              dmg,life:maxDist/(def.speed||560)*2.2+0.6,kind:"boomerang",pierce:99,radius:10,color:"#9fe8ff",fx:def.fx,maxDist,side:i%2?1:-1});
          }
          this.spawnAtkFx(def.fx,"effect",p.x,p.y,42,0.55,false,ang);
          break;
        }
        case "aura": {
          const r=(def.range||110)*rangeMul;
          this.areaDamage(p.x,p.y,r,dmg*0.55,"elemental",{color:"#ffe9a8",silent:true,fx:def.fx});
          this.spawnWeaponFx(def.fx,p.x,p.y,r*0.9,0);
          break;
        }
        case "chain": {
          let cur=target, hit=[], d=dmg;
          const max=def.chains||3;
          for(let i=0;i<max&&cur;i++){
            hit.push(cur);
            this.effectLightning(i?hit[i-1]:{x:p.x,y:p.y},cur);
            this.spawnWeaponFx("chain",cur.x,cur.y,70,0);
            this.damageEnemy(cur,d,"elemental",{fx:"chain"});
            d*=0.82;
            cur=this.nearestEnemy(cur.x,cur.y,240,hit);
          }
          E.sfx.skill();
          break;
        }
      }
    }
  }

  updateSkills(dt){
    const p=this.player;
    for(const s of p.skills){
      s.cool=Math.max(0,s.cool-dt);
    }
    for(let i=0;i<p.skills.length;i++){
      const key="Digit"+(i+1);
      if(E.key(key)&&!E.keys[key+"_latch"]){
        E.keys[key+"_latch"]=true;
        this.castSkill(i);
      }
      if(!E.key(key)) E.keys[key+"_latch"]=false;
    }
    // 空格冲刺
    if(E.key("Space")&&!E.keys["Space_latch"]){ E.keys["Space_latch"]=true; this.castSkill(99); }
    if(!E.key("Space")) E.keys["Space_latch"]=false;
  }

  castSkill(idx){
    const p=this.player, s=p.stats;
    if(idx===99){
      if(this.dashCd>0)return;
      this.dashCd=2.4;
      let a=p.aim;
      if(p.autoAim&&Math.hypot(p.vx,p.vy)>20) a=p.moveAng;
      p.x+=Math.cos(a)*150; p.y+=Math.sin(a)*150;
      p.x=E.clamp(p.x,20,this.world.w-20); p.y=E.clamp(p.y,20,this.world.h-20);
      p.invuln=0.3; this.effectRing(p.x,p.y,46,"#9fe8ff");
      E.sfx.skill();
      return;
    }
    const sk=p.skills[idx]; if(!sk)return;
    if(sk.cool>0)return;
    const def=D.SKILL_BY_ID[sk.id]; if(!def)return;
    sk.cool=(def.cd||8)*(1-(s.cooldownPct||0)/100);
    const FXPOS={meteor:1,arrowrain:1};
    let fx={x:p.x,y:p.y,r:120,hit:false};
    if(sk.id==="meteor"){ const m=this.mouseWorld(); fx={x:m.x,y:m.y,r:170,hit:true}; }
    else if(sk.id==="arrowrain"){ const t=this.nearestEnemy(p.x,p.y,520); if(t) fx={x:t.x,y:t.y,r:130,hit:true}; }
    else if(sk.id==="shockwave"){ fx={x:p.x,y:p.y,r:200,hit:true}; }
    else if(sk.id==="whirl"){ fx={x:p.x,y:p.y,r:120,hit:true}; }
    else if(sk.id==="heal"){ fx={x:p.x,y:p.y,r:90,hit:true}; }
    else if(sk.id==="shield"){ fx={x:p.x,y:p.y,r:110,hit:false}; }
    else if(sk.id==="timeslow"){ fx={x:p.x,y:p.y,r:150,hit:false}; }
    else if(sk.id==="summon"){ fx={x:p.x,y:p.y,r:110,hit:false}; }
    else if(sk.id==="shadow"){ fx={x:p.x,y:p.y,r:130,hit:false}; }
    const BALLSK={meteor:1,moonfall:1};
    if(!BALLSK[sk.id]&&!def.selfFx) this.spawnSkillFx(def.fx||sk.id,fx.x,fx.y,fx.r,{hit:fx.hit});
    if(sk.id==="meteor") this.timers.push({t:0.68,fn:()=>this.spawnSkillFx("meteor",fx.x,fx.y,fx.r,{hit:false})});
    window.__CASTN=(window.__CASTN||0)+1;
    try{ def.cast(this,p); }catch(err){ window.__CASTERR=String((err&&err.stack)||err); console.warn("skill",err); }
    E.sfx.skill();
  }

  updateEnemies(dt){
    const p=this.player;
    for(const e of this.enemies) e.update(dt,this);
    // 分离
    const n=this.enemies.length;
    if(n<220){
      for(let i=0;i<n;i++){
        const a=this.enemies[i]; if(a.dead)continue;
        for(let j=i+1;j<n;j++){
          const b=this.enemies[j]; if(b.dead)continue;
          const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
          const rr=a.r+b.r;
          if(d2<rr*rr&&d2>0.01){
            const d=Math.sqrt(d2), push=(rr-d)*0.5;
            const nx=dx/d,ny=dy/d;
            a.x-=nx*push; a.y-=ny*push; b.x+=nx*push; b.y+=ny*push;
          }
        }
      }
    }
    this.enemies=this.enemies.filter(e=>!(e.dead&&e.deathT>0.55));
  }

  updateProjectiles(dt){
    for(const pr of this.projectiles){
      pr.update(dt,this);
      if(pr.life<=0 && pr.kind==="skill" && pr.splash && !pr.exploded){
        pr.exploded=true; this.explosion(pr.x,pr.y,pr.splash,pr.dmg*0.6,"#ffb86b",true);
      }
      if(pr.life<=0)continue;
      for(const e of this.enemies){
        const hs=(pr.kind==="boomerang"&&pr.returning)?pr.hitBack:pr.hit;
        if(e.dead||hs.has(e))continue;
        if(E.dist(pr.x,pr.y,e.x,e.y-e.r*0.5)<e.r+pr.radius){
          hs.add(e);
          const crit=this.rollCrit();
          const dmg=crit?pr.dmg*(1+this.player.stats.critDamage/100):pr.dmg;
          this.damageEnemy(e,dmg,pr.kind==="orb"?"elemental":null,{crit,fx:pr.fx});
          if(pr.splash){ pr.exploded=true; this.explosion(pr.x,pr.y,pr.splash,pr.dmg*0.6,"#ffb86b",true); }
          if(pr.pierce>0)pr.pierce--; else pr.life=0;
          if(pr.life<=0)break;
        }
      }
    }
    this.projectiles=this.projectiles.filter(pr=>pr.life>0);
  }

  updateAllies(dt){
    for(const a of this.allies){
      a.t-=dt;
      const target=this.nearestEnemy(a.x,a.y,320);
      if(target){
        const d=E.dist(a.x,a.y,target.x,target.y);
        if(d>90){ const ang=E.ang(a.x,a.y,target.x,target.y); a.x+=Math.cos(ang)*180*dt; a.y+=Math.sin(ang)*180*dt; }
        a.atkCd-=dt;
        if(a.atkCd<=0&&d<340){
          a.atkCd=0.7;
          this.spawnProjectile({x:a.x,y:a.y,vx:Math.cos(E.ang(a.x,a.y,target.x,target.y))*520,vy:Math.sin(E.ang(a.x,a.y,target.x,target.y))*520,
            dmg:a.dmg,life:0.9,color:a.kind==="skeleton"?"#d8c8ff":"#8bd4ff",radius:6,kind:"shot",fx:"staff"});
        }
      }
    }
    this.allies=this.allies.filter(a=>a.t>0);
  }

  updatePickups(dt){
    for(const pk of this.pickups)pk.update(dt,this);
    this.pickups=this.pickups.filter(p=>!p.dead);
  }
  updateMeteors(dt){
    for(const m of this.meteors){
      m.t+=dt;
      if(!m.hit&&m.t>=m.delay){
        m.hit=true;
        this.explosion(m.x,m.y,m.r,m.dmg,"#ff8a4d");
        this.r.shakeAdd(10);
      }
    }
    this.meteors=this.meteors.filter(m=>m.t<m.delay+0.45);
  }

  /* ---------- 伤害 ---------- */
  rollCrit(){ return Math.random()*100 < (this.player.stats.critChance||0); }
  damageEnemy(e,dmg,type,opts){
    if(e.dead)return;
    const s=this.player.stats;
    let mul=1;
    if(type==="melee")mul*=1+(s.meleePct||0)/100;
    else if(type==="ranged")mul*=1+(s.rangedPct||0)/100;
    else if(type==="elemental")mul*=1+(s.elementalPct||0)/100;
    if(s.damagePct)mul*=1+(s.damagePct||0)/100;
    if(this.player.flags.hunter&&(e.isElite||e.isBoss))mul*=1.3;
    if(this.player.flags.rage&&this.player.hp<this.player.maxHp*0.35)mul*=1.45;
    if(e.zakum&&D.ZAKUM_DMG_MUL)mul*=D.ZAKUM_DMG_MUL;
    dmg*=mul;
    const crit=opts&&opts.crit!==undefined?opts.crit:this.rollCrit();
    if(crit)dmg*=1+(s.critDamage||0)/100;
    this.player.dmgDealt+=dmg;
    if(s.lifesteal>0)this.player.heal(dmg*s.lifesteal/100);
    if(this.player.flags.frost)e.slow=2;
    e.takeDamage(dmg,this,{crit});
    if(crit)E.sfx.crit();
    this.hitSpark(e.x,e.y-e.r*0.5,crit);
    if(opts&&opts.fx) this.spawnHitFx(opts.fx,e.x,e.y-e.r*0.35,e.isBoss?1.25:1);
    if(s.thorns>0)e.takeDamage(0,this,{});
  }
  areaDamage(x,y,r,dmg,type,opts){
    this.damageObjects(x,y,r,dmg);
    opts=opts||{};
    for(const e of this.enemies){
      if(e.dead)continue;
      if(E.dist(x,y,e.x,e.y)<r+e.r){
        this.damageEnemy(e,dmg,type,{fx:opts&&opts.fx});
        if(opts.knock){ const a=E.ang(x,y,e.x,e.y); e.kb.x+=Math.cos(a)*opts.knock; e.kb.y+=Math.sin(a)*opts.knock; }
      }
    }
    if(!opts.silent)this.effectRing(x,y,r,opts.color||"#ffd27a");
  }
  arcDamage(x,y,ang,range,arc,dmg,type,opts){
    for(const e of this.enemies){
      if(e.dead)continue;
      const d=E.dist(x,y,e.x,e.y);
      if(d>range+e.r)continue;
      const a=E.ang(x,y,e.x,e.y);
      if(Math.abs(E.angDiff(ang,a))>arc/2)continue;
      this.damageEnemy(e,dmg,type,{fx:opts&&opts.fx});
      if(opts&&opts.knock){ e.kb.x+=Math.cos(a)*opts.knock; e.kb.y+=Math.sin(a)*opts.knock; }
    }
  }
  spearCombo(ang,range,width,dmg,pierce){
    const p=this.player;
    const steps=[
      {t:0.00,fx:"effect",mul:0.40},
      {t:0.14,fx:"effect1",mul:0.30},
      {t:0.28,fx:"effect2",mul:0.30},
      {t:0.42,fx:"effect3",mul:0.00}
    ];
    for(const st of steps){
      const fire=()=>{
        if(this.over||p.hp<=0)return;
        if(st.mul>0) this.lineDamage(p.x,p.y,ang,range,width,dmg*st.mul,pierce,{fx:"spear"});
        if(st.fx) this.spawnAtkFx("spear",st.fx,p.x+Math.cos(ang)*18,p.y+Math.sin(ang)*18,range*0.95,0.7,false,ang);
        if(st.t===0){
          const ix=p.x+Math.cos(ang)*Math.min(range*0.85,110), iy=p.y+Math.sin(ang)*Math.min(range*0.85,110);
          this.spawnAtkFx("spear","effect0",ix,iy,55,0.8,false,ang);
        }
      };
      if(st.t<=0) fire(); else this.timers.push({t:st.t,fn:fire});
    }
  }
  lineDamage(x,y,ang,range,width,dmg,pierce,opts){
    let hits=0;
    for(const e of this.enemies){
      if(e.dead)continue;
      const dx=e.x-x,dy=e.y-y;
      const proj=dx*Math.cos(ang)+dy*Math.sin(ang);
      if(proj<0||proj>range)continue;
      const perp=Math.abs(-dx*Math.sin(ang)+dy*Math.cos(ang));
      if(perp>width+e.r)continue;
      this.damageEnemy(e,dmg,"melee",{fx:opts&&opts.fx});
      hits++; if(hits>=pierce+1)break;
    }
  }
  explosion(x,y,r,dmg,color,noFx){
    this.areaDamage(x,y,r,dmg,"elemental",{color:color||"#ff9a4d",silent:noFx});
    if(!noFx){ this.effectRing(x,y,r,color||"#ff9a4d"); this.r.shakeAdd(4); this.particles.push(new Particle({x,y,life:0.3,size:Math.max(1,r),color,type:"ring"})); }
  }
  startBossSkill(b){
    if(!b||b.dead)return;
    const set=b.skillSet||["nova","slam","summon"];
    const sk=set[(b.bossPhase=(b.bossPhase||0)+1)%set.length];
    b.pendingSkill=sk; b.castT=0.72; b.state="skill";
    b.setAnim(b.def.animSet.skill||b.def.animSet.attack||b.def.animSet.stand,false,100);
    b.flash=0.12;
    this.effectRing(b.x,b.y,52,"#ffd166");
  }
castMobSkill(e){
    const p=this.player, kind=e.skillKind||"ring";
    const col="#ffb46b";
    if(kind==="summon"){
      this.summonMinions(e); this.spawnMobFx("bossSummon",e.x,e.y,70); this.effectRing(e.x,e.y,80,"#b89bff");
    } else if(kind==="volley"){
      const base=E.ang(e.x,e.y,p.x,p.y);
      for(let i=-1;i<=1;i++){
        const a=base+i*0.14;
        this.projectiles.push(new Projectile({x:e.x,y:e.y-10,vx:Math.cos(a)*260,vy:Math.sin(a)*260,dmg:e.dmg*0.8,life:2.4,from:"enemy",color:col,radius:7,kind:"enemy",fx:"enemyOrb"}));
      }
      this.spawnAtkFx("enemyOrb","hit",e.x,e.y-e.r*0.4,55,0.75);
    } else if(kind==="blast"){
      e.explode(this);
    } else if(kind==="slam"){
      this.timers.push({t:0.42,fn:()=>{
        this.areaDamage(e.x,e.y,150,e.dmg*1.1);
        this.effectRing(e.x,e.y,150,col); this.spawnMobFx("bossBurst",e.x,e.y,120); this.r.shakeAdd(6);
      }});
      this.effectRing(e.x,e.y,110,col);
    } else {
      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2;
        this.projectiles.push(new Projectile({x:e.x,y:e.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,dmg:e.dmg*0.6,life:2.0,from:"enemy",color:col,radius:6,kind:"enemy",fx:"enemyOrb"}));
      }
      this.spawnAtkFx("enemyOrb","hit",e.x,e.y-e.r*0.4,70,0.7); this.effectRing(e.x,e.y,75,col);
    }
  }

  castBossSkillNow(b,force){
    const p=this.player;
    const set=b.skillSet||["nova","slam","summon"];
    const sk=force||set[(b.bossPhase=(b.bossPhase||0)+1)%set.length];
    (window.__BS=window.__BS||[]).push(sk); if(window.__BS.length>20)window.__BS.shift();
    const col="#ff8a4d";
    if(sk==="nova"){
      const n=14, base=E.ang(b.x,b.y,p.x,p.y);
      for(let i=0;i<n;i++){
        const a=base+i/n*Math.PI*2;
        this.projectiles.push(new Projectile({x:b.x,y:b.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,dmg:b.dmg*0.55,life:2.2,from:"enemy",color:col,radius:8,kind:"enemy",fx:"bossOrb"}));
      }
      this.spawnMobFx("bossBurst",b.x,b.y,70); this.effectRing(b.x,b.y,90,col); this.r.shakeAdd(4);
    } else if(sk==="summon"){
      this.summonMinions(b); this.timers.push({t:0.45,fn:()=>this.summonMinions(b)});
      this.spawnMobFx("bossSummon",b.x,b.y,90); this.effectRing(b.x,b.y,110,"#b89bff");
    } else if(sk==="charge"){
      const a=E.ang(b.x,b.y,p.x,p.y); b.chargeDir={x:Math.cos(a),y:Math.sin(a)}; b.charging=0.5;
      this.spawnMobFx("bossBurst",b.x,b.y,45); this.effectRing(b.x,b.y,70,"#ffd166"); this.r.shakeAdd(5);
    } else if(sk==="slam"){
      const x=p.x,y=p.y;
      this.timers.push({t:0.75,fn:()=>{
        this.spawnMobFx("bossBurst",x,y,150); this.effectRing(x,y,150,col); this.r.shakeAdd(9);
        if(E.dist(p.x,p.y,x,y)<150) p.takeDamage(b.dmg*1.35,b,this);
        this.areaDamage(x,y,150,0);
      }});
      this.effectRing(x,y,150,col);
    } else if(sk==="poison"){
      for(let i=0;i<2;i++){
        const a=E.rand(Math.PI*2), d=E.rand(40,120);
        this.hazards.push({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:74,t:6,cd:0.4,dmg:b.dmg*0.35});
        this.spawnMobFx("bossPoison",p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,70);
      }
    }
  }

  enemyShoot(e,p){
    if(e.playAction) e.playAction("attack",0.3);
    const a=E.ang(e.x,e.y,p.x,p.y);
    this.projectiles.push(new Projectile({x:e.x,y:e.y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,dmg:e.dmg*0.85,life:2.4,
      from:"enemy",color:"#ff6b6b",radius:8,kind:"enemy",fx:"enemyOrb"}));
  }
  nearestEnemy(x,y,range,exclude){
    let best=null,bd=range||1e9;
    for(const e of this.enemies){
      if(e.dead)continue;
      if(exclude&&exclude.includes(e))continue;
      const d=E.dist(x,y,e.x,e.y);
      if(d<bd){bd=d;best=e;}
    }
    return best;
  }
  onEnemyDeath(e){
    const p=this.player, s=p.stats;
    this.totalKills++; p.kills++;
    const gold=Math.round((e.gold||1)*(D.goldDropMul?D.goldDropMul(this.wave):1)*(0.85+Math.random()*0.4));
    this.pickups.push(new Pickup("gold",e.x,e.y,gold));
    const xp=Math.max(1,Math.round((e.xp||1)*(1+(s.xpGainPct||0)/100)));
    // v9 修复：最多 3 颗经验球，但总量必须完整——按总量均分，余数补到最后一颗
    // 原实现每颗固定 1 点且数量封顶 3，精英丢 75%、Boss 丢 95% 经验
    const balls=Math.min(3,xp), per=Math.floor(xp/balls), rem=xp-per*balls;
    for(let i=0;i<balls;i++){
      const v=per+(i===balls-1?rem:0);
      this.pickups.push(new Pickup("xp",e.x+E.rand(14,-14),e.y+E.rand(14,-14),v));
    }
    if(Math.random()<0.05*(1+(s.luck||0)/100)) this.pickups.push(new Pickup("heart",e.x,e.y,12));
    if(p.flags.boom) this.explosion(e.x,e.y,70,18+e.xp*3,"#ffb04d",true);
    if(p.flags.chain&&Math.random()<0.25){
      let t=this.nearestEnemy(e.x,e.y,240);
      for(let i=0;i<3&&t;i++){ this.damageEnemy(t,12+i*4,"elemental"); t=this.nearestEnemy(t.x,t.y,200); }
    }
    if(p.flags.vamp) p.heal(2);
    this.particles.push(new Particle({x:e.x,y:e.y-e.r*0.5,vx:0,vy:-20,life:0.35,size:14,color:"#ffffff",type:"puff"}));
    if(e.isBoss){ E.save.data.bossKills=(E.save.data.bossKills||0)+1; this.r.shakeAdd(16); this.toastText("BOSS 被击败！"); const bk=this.mapId==="void"?"tower":this.mapId==="corrupt"?"forest":this.mapId; if(E.bgm&&window.WZ&&WZ.bgm) E.bgm.play(bk); }
  }

  /* ---------- 经验/等级 ---------- */
  gainXp(v){
    const p=this.player;
    p.xp+=v;
    while(p.xp>=p.nextXp){
      p.xp-=p.nextXp; p.level++;
      p.nextXp=D.xpNeed(p.level);
      this.pendingLevels++;
      E.sfx.level();
      this.effectRing(p.x,p.y,90,"#8bd4ff");
    }
    if(this.pendingLevels>0&&!this.paused) this.openLevelUp();
  }
  openLevelUp(){
    this.paused=true;
    if(window.UI) UI.showLevelUp(this);
  }
  pickCard(card){
    this.player.addCard(card);
    this.pendingLevels--;
    if(this.pendingLevels>0){ window.UI.showLevelUp(this); }
    else { this.paused=false; window.UI.hideLevelUp(); }
  }

  /* ---------- 波次结束 ---------- */
  endWave(){
    if(this.state!=="playing")return;
    this.state="shop";
    this.raf=false;
    const p=this.player;
    const harvest=Math.round(p.stats.harvest||0);
    p.gold+=Math.round((harvest + (D.goldWaveBonus?D.goldWaveBonus(this.wave):(6+this.wave*4)))*((this.difficulty&&this.difficulty.reward)||1));
    p.heal(p.maxHp*0.08);
    // v9 修复：清场掉落按类型全部结算（原先只结经验，金币/卡牌/遗物/回血直接蒸发）
    // 经验走内联升级，暂不弹窗，留到下一波开头统一处理（见 nextWave）
    for(const pk of this.pickups){
      if(pk.type==="xp"){
        p.xp+=pk.value;
        while(p.xp>=p.nextXp){ p.xp-=p.nextXp; p.level++; p.nextXp=D.xpNeed(p.level); this.pendingLevels++; }
      }
      else if(pk.type==="gold"){ p.gold+=Math.round(pk.value*(1+(p.stats.goldGainPct||0)/100)); }
      else if(pk.type==="heart"){ p.heal(pk.value); }
      else if(pk.type==="card"){ this.grantCard(); }
      else if(pk.type==="relic"){ this.grantRelic(); }
    }
    this.pickups=[];
    for(const e of this.enemies){ if(!e.dead){ e.dead=true; } }
    this.enemies=[];
    this.projectiles=[];
    if(this.wave>=D.WAVE_MAX&&!this.endless){ this.victory(); return; }
    if(this.wave>=D.WAVE_MAX_ENDLESS){ this.victory(); return; }
    if(window.UI) UI.showShop(this);
  }

  continueEndless(){
    this.over=false; this.endless=true; this.state="playing"; this.raf=true;
    if(window.UI) UI.hideResult&&UI.hideResult();
    this.beginWave(this.wave+1);
  }
  nextWave(){
    window.UI.hideShop();
    this.beginWave(this.wave+1);
    this.raf=true;
    // v9：波次结束结算出的升级次数，在下一波开头补弹（原实现直接丢失升级机会）
    if(this.pendingLevels>0) this.openLevelUp();
  }

  skinUnlocked(sk){
    const s=E.save.data, u=sk.unlock||{};
    if(u.type==="default")return true;
    if(u.type==="free")return true;
    if(u.type==="wave")return Math.max(0,...Object.values(s.bestWave||{}))>=u.n;
    if(u.type==="kills")return (s.kills||0)>=u.n;
    if(u.type==="gold")return (s.totalGold||0)>=u.n;
    if(u.type==="boss")return (s.bossKills||0)>=u.n;
    if(u.type==="endless")return (s.endlessBest||0)>=u.n;
    if(u.type==="daily")return (s.dailyRuns||0)>=u.n;
    if(u.type==="ach")return Object.keys(s.ach||{}).length>=u.n;
    if(u.type==="relic")return Object.keys(s.relicSeen||{}).length>=u.n;
    if(u.type==="wins")return (s.wins||0)>=u.n;
    return false;
  }
  checkSkins(){
    const s=E.save.data; s.skins=s.skins||{}; s.skins["1"]=1;
    const got=[];
    for(const sk of (D.DMG_SKINS||[])){
      if(s.skins[sk.id])continue;
      if(this.skinUnlocked(sk)){ s.skins[sk.id]=1; got.push(sk); }
    }
    this.newSkins=got; return got;
  }
  checkAch(){
    const s=E.save.data, got=[];
    for(const a of (D.ACHIEVEMENTS||[])){
      if(s.ach&&s.ach[a.id]) continue;
      let ok=false; try{ ok=!!a.test(s,this); }catch(e){}
      if(ok){ (s.ach=s.ach||{})[a.id]=1; s.bank=(s.bank||0)+(a.reward||0); got.push(a); }
    }
    this.newAch=got;
    return got;
  }
  gameOver(){
    if(this.over)return;
    this.over=true; this.raf=false; this.state="over";
    E.sfx.die();
    const p=this.player;
    const save=E.save.data;
    const best=save.bestWave[this.mapId]||0;
    if(this.wave>best) save.bestWave[this.mapId]=this.wave;
    save.runs=(save.runs||0)+1;
    save.kills=(save.kills||0)+this.totalKills;
    this.bankEarned=Math.floor(this.player.gold*0.25);
    save.bank=(save.bank||0)+this.bankEarned;
    if(this.endless) save.endlessBest=Math.max(save.endlessBest||0,this.wave);
    if(this.daily){ const k=this.daily.date+"|"+this.mapId; save.dailyBest[k]=Math.max(save.dailyBest[k]||0,this.wave); save.dailyRuns=(save.dailyRuns||0)+1; }
    save.totalGold=(save.totalGold||0)+Math.floor(p.gold||0);
    this.checkAch(); this.checkSkins();
    E.save.write();
    if(window.UI) UI.showResult(this,false);
  }
  victory(){
    if(this.over)return;
    this.over=true; this.raf=false; this.state="over";
    const save=E.save.data;
    save.bestWave[this.mapId]=Math.max(save.bestWave[this.mapId]||0,this.wave);
    if(this.endless) save.endlessBest=Math.max(save.endlessBest||0,this.wave);
    // v9：无尽模式不计入 wins（成就与角色解锁按正式通关统计）
    if(!this.endless) save.wins=(save.wins||0)+1;
    save.runs=(save.runs||0)+1;
    save.kills=(save.kills||0)+this.totalKills;
    this.bankEarned=Math.floor(this.player.gold*0.35);
    save.bank=(save.bank||0)+this.bankEarned;
    if(this.daily){ const k=this.daily.date+"|"+this.mapId; save.dailyBest[k]=Math.max(save.dailyBest[k]||0,this.wave); save.dailyRuns=(save.dailyRuns||0)+1; }
    save.totalGold=(save.totalGold||0)+Math.floor(this.player.gold||0);
    this.checkAch(); this.checkSkins();
    E.save.write();
    if(window.UI) UI.showResult(this,true);
  }

  /* ---------- 特效辅助 ---------- */
  popup(x,y,text,color,crit){
    if(window.UI&&!UI.opts.damage&&/(\d|-)/.test(String(text))) return;
    this.texts.push({x,y,text:String(text),color:color||"#fff",t:0,crit:!!crit});
    if(this.texts.length>240) this.texts.splice(0,this.texts.length-240);
  }
  shake(v){ this.r.shakeAdd(v); }
  spawnProjectile(o){ const pr=new Projectile(o); this.projectiles.push(pr); return pr; }
  spawnSkillProjectile(skill,x,y,vx,vy,dmg,splash,life,radius){
    window.__SPAWN=(window.__SPAWN||0)+1; window.__SPAWNLAST={skill,life,splash};
    return this.spawnProjectile({x,y,vx,vy,dmg,life:life||1.1,kind:"skill",fx:"sk:"+skill,splash:splash||0,radius:radius||24,color:"#ffb86b"});
  }
  spawnMeteor(x,y,dmg,r){ this.meteors.push({x,y,dmg,r,t:0,delay:0.85,hit:false}); this.effectRing(x,y,r*0.8,"#ff8a4d",1.2); }
  summonClone(p,mul){
    this.allies.push({kind:"clone",x:p.x+E.rand(40,-40),y:p.y+E.rand(40,-40),t:12,atkCd:0,dmg:p.power*1.2*mul});
  }
  summonSkeleton(p){
    this.allies.push({kind:"skeleton",x:p.x+E.rand(50,-50),y:p.y+E.rand(50,-50),t:14,atkCd:0,dmg:p.power*0.9});
  }
  effectRing(x,y,r,color,life){ this.particles.push(new Particle({x,y,life:life||0.35,size:Math.max(1,r),color,type:"ring"})); }
  effectSlash(x,y,ang,range,arc,color){ this.particles.push(new Particle({x,y,life:0.22,size:range,color,ang,arc,type:"slash"})); }
  effectDash(x,y,ang,range){ this.particles.push(new Particle({x,y,life:0.2,size:range,color:"#cfe8ff",ang,type:"thrust"})); }
  effectLightning(a,b){ this.particles.push(new Particle({x:a.x,y:a.y,life:0.18,x2:b.x,y2:b.y,color:"#bfe8ff",type:"bolt"})); }
  hitSpark(x,y,crit){ for(let i=0;i<(crit?5:2);i++) this.particles.push(new Particle({x,y,vx:E.rand(120,-120),vy:E.rand(120,-120),life:0.25,size:crit?5:3,color:crit?"#ffd24d":"#ffffff",type:"dot"})); }
  mouseWorld(){ const p=this.player; if(p&&p.autoAim){ const t=this.nearestEnemy(p.x,p.y,850); if(t) return {x:t.x,y:t.y}; } return this.r.toWorld(E.mouse.x,E.mouse.y); }
  toastText(t){ if(window.UI) UI.toast(t); }

  /* ---------- 渲染 ---------- */
  render(){
    const r=this.r, ctx=r.ctx;
    r.begin();
    r.drawGround();
    // 掉落物
    for(const pk of this.pickups) this.drawPickup(pk);
    // 陨石预警
    for(const m of this.meteors){
      const k=Math.min(1,m.t/m.delay);
      ctx.save(); ctx.globalAlpha=0.35+0.35*k; ctx.strokeStyle="#ff8a4d"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(m.x,m.y,m.r*(0.4+0.6*k),0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=0.12; ctx.fillStyle="#ff8a4d"; ctx.fill(); ctx.restore();
    }
    // 毒池 / 地面危害
    for(const hz of this.hazards){
      const k=Math.min(1,hz.t/1.2);
      ctx.save(); ctx.globalAlpha=0.28*k+0.12;
      const grd=ctx.createRadialGradient(hz.x,hz.y,4,hz.x,hz.y,hz.r);
      grd.addColorStop(0,"#8bff9b"); grd.addColorStop(1,"rgba(80,180,90,0)");
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(hz.x,hz.y,hz.r,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    // 场景物件
    for(const o of this.objects) this.drawObject(o);
    // 实体排序
    const drawList=[];
    for(const e of this.enemies) drawList.push({y:e.y,kind:"enemy",e});
    for(const a of this.allies) drawList.push({y:a.y,kind:"ally",a});
    drawList.push({y:this.player.y,kind:"player"});
    drawList.sort((a,b)=>a.y-b.y);
    for(const d of drawList){
      if(d.kind==="enemy") this.drawEnemy(d.e);
      else if(d.kind==="ally") this.drawAlly(d.a);
      else this.drawPlayer();
    }
    // 弹幕
    for(const pr of this.projectiles) this.drawProjectile(pr);
    // 粒子
    for(const pa of this.particles) this.drawParticle(pa);
    // 技能特效
    for(const q of this.fx){ const fr=q.f.frames[Math.min(q.i,q.f.frames.length-1)]; if(fr) r.drawFx(fr,q.x,q.y,q.scale||1,q.flip,1,q.color); }
    // 伤害数字（优先使用玩家选择的伤害皮肤，仅数字）
    const dskin=E.getDmgSkin?E.getDmgSkin():null;
    for(const t of this.texts){
      const a=1-Math.max(0,(t.t-0.45)/0.45);
      if(dskin&&/^\d+$/.test(t.text)&&r.drawDamageSkin(dskin,t.text,t.x,t.y,t.crit,a)) continue;
      r.drawText(t.x,t.y,t.text,t.color,t.crit?20:15,a);
    }
    r.end();
    // 暗角
    ctx.save();
    const g=ctx.createRadialGradient(ctx.canvas.width/2/r.dpr,ctx.canvas.height/2/r.dpr,Math.min(r.cam.w,r.cam.h)*0.35,
      ctx.canvas.width/2/r.dpr,ctx.canvas.height/2/r.dpr,Math.min(r.cam.w,r.cam.h)*0.78);
    g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,.55)");
    ctx.fillStyle=g; ctx.fillRect(0,0,r.cam.w,r.cam.h); ctx.restore();
  }

  drawObject(o){
    const r=this.r, ctx=r.ctx;
    if(o.kind==="crate"){
      if(o.hp<=0) return;
      r.drawShadow(o.x,o.y+2,34,14,0.28);
      const w=26,h=26, x=o.x-w/2, y=o.y-h;
      ctx.save();
      ctx.fillStyle="#a9753f"; ctx.fillRect(x,y,w,h);
      ctx.fillStyle="#c9954f"; ctx.fillRect(x+2,y+2,w-4,h-4);
      ctx.strokeStyle="#6d4623"; ctx.lineWidth=2; ctx.strokeRect(x+1,y+1,w-2,h-2);
      ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke();
      ctx.restore();
      if(o.hp<o.maxHp) r.drawBar(o.x,o.y-h-8,28,o.hp/o.maxHp,"#e8b562");
    } else if(o.kind==="chest"){
      r.drawShadow(o.x,o.y+2,40,16,0.3);
      const bob=Math.sin(o.t*3)*2, w=34,h=26,x=o.x-w/2,y=o.y-h+bob;
      ctx.save();
      if(!o.open){ ctx.shadowColor="#ffd76a"; ctx.shadowBlur=14; }
      ctx.fillStyle=o.open?"#6b5636":"#b8862f"; ctx.fillRect(x,y+8,w,h-8);
      ctx.fillStyle=o.open?"#8a7047":"#e5b44a"; ctx.beginPath(); ctx.moveTo(x,y+9); ctx.quadraticCurveTo(x+w/2,y-4,x+w,y+9); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#5a3f1c"; ctx.fillRect(x+w/2-3,y+9,6,h-9);
      ctx.strokeStyle="#402a10"; ctx.lineWidth=2; ctx.strokeRect(x,y+8,w,h-8);
      ctx.restore();
      if(!o.open) r.drawText(o.x,o.y-h-6,"宝箱","#ffe08a",11,0.9);
    } else if(o.kind==="trap"){
      ctx.save();
      ctx.globalAlpha=0.85;
      ctx.fillStyle=o.flash>0?"#ff8a6b":"#4a3a4e"; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=o.flash>0?"#ffd6c6":"#7a5f80"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#c9d4e8";
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+o.t*0.2; const px=o.x+Math.cos(a)*o.r*0.55, py=o.y+Math.sin(a)*o.r*0.55;
        ctx.beginPath(); ctx.moveTo(px,py-4); ctx.lineTo(px+3,py+3); ctx.lineTo(px-3,py+3); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    } else if(o.kind==="npc"){
      const art=window.WZ&&window.WZ.npc&&window.WZ.npc.merchant;
      const bob=Math.sin(o.t*1.7)*1.8;
      r.drawShadow(o.x,o.y+2,66,26,0.36);
      // 摊位遮阳篷（商店感）
      ctx.save();
      ctx.globalAlpha=0.95;
      for(let i=0;i<5;i++){ ctx.fillStyle=(i%2)?"#e05c7a":"#f6f2e2"; ctx.fillRect(o.x-48+i*19,o.y-118,19,14); }
      ctx.fillStyle="#7a5a3a"; ctx.fillRect(o.x-52,o.y-104,104,4);
      ctx.fillStyle="rgba(58,38,24,.55)"; ctx.fillRect(o.x-48,o.y-100,4,9); ctx.fillRect(o.x+44,o.y-100,4,9);
      ctx.globalAlpha=1; ctx.restore();
      const frames=art&&art.anims&&((o.near&&art.anims.smile&&art.anims.smile.length)?art.anims.smile:art.anims.stand);
      if(frames&&frames.length){
        let total=0; for(const f of frames) total+=(f.d||300);
        let tt=(o.t*1000)%Math.max(1,total), acc=0, cur=frames[0];
        for(const f of frames){ acc+=(f.d||300); if(tt<acc){ cur=f; break; } }
        const rec=E.loadImage(cur.s), sc=1.22;
        if(rec&&rec.ready) ctx.drawImage(rec.img, o.x-cur.ox*sc, o.y-cur.oy*sc+bob, cur.w*sc, cur.h*sc);
        else { ctx.save(); ctx.fillStyle="#2f3b57"; ctx.fillRect(o.x-13,o.y-32,26,32); ctx.fillStyle="#f0c98a"; ctx.beginPath(); ctx.arc(o.x,o.y-42,10,0,Math.PI*2); ctx.fill(); ctx.restore(); }
      }
      r.drawText(o.x,o.y-130,"米娜 · 杂货商人","#ffe9b0",11,0.9);
      if(o.near){
        const pulse=0.72+Math.sin(o.t*5)*0.28;
        const label=(navigator.maxTouchPoints>0)?"点我 / 交易键":"按 E 交易";
        ctx.save(); ctx.globalAlpha=pulse;
        ctx.fillStyle="#171f2f"; E.roundRect(ctx,o.x-52,o.y-160,104,24,12); ctx.fill();
        ctx.strokeStyle="#ffd76a"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.globalAlpha=1; ctx.restore();
        r.drawText(o.x,o.y-144,label,"#ffe08a",12,1);
      }
    }
  }
  drawPlayer(){
    const p=this.player, r=this.r;
    r.drawShadow(p.x,p.y+2,56,26,0.42);
    if(this.heroFrames&&p.curFrame){
      r.drawComposite(p.curFrame,p.x,p.y+6,this.heroFrames.ax,this.heroFrames.ay,1,p.face<0,p.invuln>0?0.65:1);
    } else {
      const ctx=r.ctx; ctx.save(); ctx.fillStyle="#7fc4f5"; ctx.beginPath(); ctx.arc(p.x,p.y-18,16,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    if(p.shieldTime>0){
      r.drawCircle(p.x,p.y-24,34,"#ffe08a",0.85);
      r.drawCircle(p.x,p.y-24,34,"rgba(255,224,138,.18)",1,true);
    }
    // v9：此处原有一句 `const w=p.weapons[0]; if(w){}` 的空语句，已删除
  }
  drawEnemy(e){
    const r=this.r, f=e.anim.frame;
    const dy=e.dead?e.deathT*10:0;
    r.drawShadow(e.x,e.y+2,e.r*2.4,e.r*1.1,e.dead?0.15:0.3);
    const alpha=e.dead?Math.max(0,1-(e.deathT/0.55)):1;
    if(f){
      r.drawMobFrame(f,e.x,e.y+dy,e.scale,e.face>0,e.flash>0?"brightness(1.8) sepia(1) saturate(3)":"",alpha);
    }
    if(e.isElite||e.isBoss){
      const w=e.isBoss?90:52;
      r.drawBar(e.x,e.y-e.r*1.5-e.scale*20,w,e.hp/e.maxHp,e.isBoss?"#ff5f52":"#ffd24d");
      if(e.isBoss) r.drawText(e.x,e.y-e.r*1.5-e.scale*20-8,(e.name||"BOSS"),"#ffb3ae",13,1);
    } else if(e.hp<e.maxHp){
      r.drawBar(e.x,e.y-e.r*1.4-6,30,e.hp/e.maxHp,"#ff7b6b");
    }
    if(e.slow>0){ r.drawCircle(e.x,e.y-e.r*0.6,e.r*0.9,"#8bd4ff",0.35); }
  }
  drawAlly(a){
    const r=this.r;
    r.drawShadow(a.x,a.y+2,34,16,0.25);
    const ctx=r.ctx;
    ctx.save(); ctx.globalAlpha=0.8;
    ctx.fillStyle=a.kind==="skeleton"?"#e6dcff":"#8bd4ff";
    ctx.beginPath(); ctx.arc(a.x,a.y-22,13,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#0a1018"; ctx.beginPath(); ctx.arc(a.x-4,a.y-24,2.5,0,Math.PI*2); ctx.arc(a.x+4,a.y-24,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  drawProjectile(pr){
    const r=this.r, ctx=r.ctx;
    if(pr.kind==="boomerang"&&pr.trail&&pr.trail.length>1){
      ctx.save();
      for(let i=1;i<pr.trail.length;i++){
        const a=i/pr.trail.length;
        ctx.strokeStyle="rgba(159,232,255,"+(a*0.42).toFixed(3)+")";
        ctx.lineWidth=1+a*3;
        ctx.beginPath(); ctx.moveTo(pr.trail[i-1].x,pr.trail[i-1].y); ctx.lineTo(pr.trail[i].x,pr.trail[i].y); ctx.stroke();
      }
      ctx.restore();
    }
    const bf=pr.ballFrame;
    if(bf&&!window.__plainFx){
      let mx=1; for(const p of bf) mx=Math.max(mx,p.w||0,p.h||0);
      const sc=E.clamp((pr.radius*7.0)/mx,0.18,2.6);
      const ang=pr.kind==="skill"?0:(pr.kind==="boomerang"?pr.spin:Math.atan2(pr.vy,pr.vx));
      r.drawFx(bf,pr.x,pr.y,sc,pr.vx<0,1,null,ang);
      return;
    }
    ctx.save();
    if(pr.kind==="boomerang"){
      ctx.translate(pr.x,pr.y); ctx.rotate(pr.spin); ctx.fillStyle=pr.color;
      ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(0,-6); ctx.lineTo(10,0); ctx.lineTo(0,6); ctx.closePath(); ctx.fill();
    } else {
      const ang=Math.atan2(pr.vy,pr.vx);
      ctx.translate(pr.x,pr.y); ctx.rotate(ang);
      const g=ctx.createLinearGradient(-12,0,12,0);
      g.addColorStop(0,"rgba(255,255,255,0)"); g.addColorStop(1,pr.color);
      ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,12,pr.radius*0.7,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,0,pr.radius*0.45,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  drawPickup(pk){
    const ctx=this.r.ctx;
    const bob=Math.sin(pk.t*6)*3;
    ctx.save();
    if(pk.type==="xp"){
      ctx.fillStyle="#8be1ff"; ctx.shadowColor="#4fa8e8"; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(pk.x,pk.y+bob,5,0,Math.PI*2); ctx.fill();
    } else if(pk.type==="gold"){
      ctx.fillStyle="#f2c14e"; ctx.shadowColor="#f2c14e"; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(pk.x,pk.y+bob,5.5,0,Math.PI*2); ctx.fill();
    } else if(pk.type==="card"){
      ctx.translate(pk.x,pk.y+bob); ctx.rotate(0.2);
      ctx.fillStyle="#ffe08a"; ctx.shadowColor="#ffd24d"; ctx.shadowBlur=12;
      ctx.fillRect(-7,-10,14,20); ctx.fillStyle="#8a6a1e"; ctx.fillRect(-7,-2,14,2);
    } else if(pk.type==="relic"){
      ctx.fillStyle="#c39bff"; ctx.shadowColor="#b07bff"; ctx.shadowBlur=14;
      ctx.beginPath(); for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; const rr=11; ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr+bob); }
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle="#ff6b8b"; ctx.shadowColor="#ff6b8b"; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(pk.x,pk.y+bob,6,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  drawParticle(p){
    const ctx=this.r.ctx, k=1-p.t/p.life;
    ctx.save();
    if(p.type==="burst"){
      const rr=p.size*(0.55+0.6*(1-k));
      const g2=ctx.createRadialGradient(p.x,p.y,rr*0.1,p.x,p.y,rr);
      g2.addColorStop(0,p.color); g2.addColorStop(0.5,p.color); g2.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=k*0.75; ctx.fillStyle=g2;
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.2,rr),0,Math.PI*2); ctx.fill();
    } else if(p.type==="ring"){
      ctx.globalAlpha=k*0.7; ctx.strokeStyle=p.color; ctx.lineWidth=3+6*k;
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.2,p.size*(1.15-k*0.5)),0,Math.PI*2); ctx.stroke();
    } else if(p.type==="slash"){
      ctx.globalAlpha=k*0.85; ctx.strokeStyle=p.color; ctx.lineWidth=7; ctx.lineCap="round";
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.2,p.size),p.ang-p.arc/2,p.ang+p.arc/2); ctx.stroke();
    } else if(p.type==="thrust"){
      ctx.globalAlpha=k*0.7; ctx.strokeStyle=p.color; ctx.lineWidth=8; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+Math.cos(p.ang)*p.size,p.y+Math.sin(p.ang)*p.size); ctx.stroke();
    } else if(p.type==="bolt"){
      ctx.globalAlpha=k; ctx.strokeStyle=p.color; ctx.lineWidth=3; ctx.shadowColor=p.color; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.moveTo(p.x,p.y);
      const seg=5;
      for(let i=1;i<=seg;i++){
        const t=i/seg, nx=E.lerp(p.x,p.x2,t)+E.rand(10,-10), ny=E.lerp(p.y,p.y2,t)+E.rand(10,-10);
        ctx.lineTo(nx,ny);
      }
      ctx.stroke();
    } else if(p.type==="puff"){
      ctx.globalAlpha=k*0.6; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.2,p.size*(1.4-k*0.6)),0,Math.PI*2); ctx.fill();
    } else {
      ctx.globalAlpha=k; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.2,p.size*k),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

window.GAME=Game;
window.GameClass=Game;
})();
