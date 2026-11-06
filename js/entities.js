/* entities.js — 玩家 / 敌人 / 弹幕 / 掉落 / 粒子 */
(function(){
const D=window.GD, E=window.ENG;

/* ================= 玩家 ================= */
class Player{
  constructor(game,ch){
    this.g=game; this.ch=ch;
    this.x=0; this.y=0; this.vx=0; this.vy=0; this.r=15;
    this.stats=Object.assign({},D.BASE);
    for(const k in (ch.stats||{})){ this.stats[k]=(D.BASE[k]||0)+(ch.stats[k]||0); }
    this.flags={};
    this.maxHp=this.stats.maxHp; this.hp=this.maxHp;
    this.weapons=[]; this.skills=[];
    this.invuln=0; this.shieldTime=0; this.slowT=0; this.retributionT=0; this.hitFlash=0;
    this.face=1; this.aim=0; this.moveAng=0; this.autoAim=false; this.moveT=0; this.anim="idle"; this.frame=0;
    this.level=1; this.xp=0; this.nextXp=D.xpNeed(1);
    this.kills=0; this.gold=0; this.dmgDealt=0;
    this.cards={}; this.relics=[]; this.bonds={};
    this.power=10;
    this.addWeapon(ch.startWeapon,1);
    this.addSkill(ch.startSkill);
    // v7：角色专属技能永久自带（不进商店）
    const _ex=(D.SKILLS||[]).find(s=>s.exclusive===ch.id&&!s.unlockWave);
    if(_ex) this.addSkill(_ex.id);
    this.recompute();
  }
  get pickupR(){ return this.stats.pickupRange; }
  recompute(){
    const s=this.stats;
    this.maxHp=Math.max(10,Math.round(s.maxHp*(D.PLAYER_SCALE||1)));
    if(this.hp>this.maxHp)this.hp=this.maxHp;
    this.power=10*(1+s.damagePct/100)*(D.PLAYER_DMG_MUL||1);
    this.speed=Math.max(60,s.speed);
  }
  addWeapon(id,lvl){
    if(this.weapons.find(w=>w.id===id)){ const w=this.weapons.find(w=>w.id===id); w.lvl=Math.min(5,w.lvl+1); return w; }
    if(this.weapons.length>=6) return null;
    const w={id,lvl:lvl||1,timer:0,angle:0};
    this.weapons.push(w); return w;
  }
  addSkill(id){
    if(this.skills.find(s=>s.id===id)) return false;
    if(this.skills.length>=4) return false;
    this.skills.push({id,cool:0}); return true;
  }
  addCard(card){
    const c=this.cards[card.id]||(this.cards[card.id]={card,lv:1,n:0});
    c.n++;
    try{ card.apply(this); }catch(e){ console.warn("card apply",e); }
    if(c.n % D.CARD_MERGE===0 && c.lv < D.CARD_MAX_LV){
      c.lv++;
      try{ card.apply(this); }catch(e){}
      if(this.g&&this.g.toastText) this.g.toastText("卡牌升华 · "+card.name+" Lv."+c.lv);
      if(this.g&&this.g.popup) this.g.popup(this.x,this.y-64,"升华 Lv."+c.lv,"#ffe08a");
    }
    this.refreshBonds();
    this.recompute();
  }
  refreshBonds(){
    if(!D.BONDS) return;
    const cnt={};
    for(const id in this.cards){ for(const t of D.cardTags(this.cards[id].card)) cnt[t]=(cnt[t]||0)+1; }
    for(const b of D.BONDS){
      const n=cnt[b.id]||0;
      const prev=this.bonds[b.id]?this.bonds[b.id].lv:0;
      let reached=0; for(const tier of b.tiers) if(n>=tier.n) reached++;
      if(reached>prev){
        for(let i=prev;i<reached;i++){ try{ b.tiers[i].apply(this); }catch(e){} }
        if(this.g&&this.g.popup) this.g.popup(this.x,this.y-78,b.name+" 羁绊 "+reached,"#ffe08a");
      }
      this.bonds[b.id]={lv:reached,n};
    }
  }
  addRelic(r){
    if(!r) return false;
    if(this.relics.length>=3 || this.relics.find(x=>x.id===r.id)) return false;
    this.relics.push(r);
    if(window.ENG&&ENG.save){ ENG.save.data.relicSeen=ENG.save.data.relicSeen||{}; ENG.save.data.relicSeen[r.id]=1; }
    try{ r.apply(this); }catch(e){ console.warn("relic apply",e); }
    this.recompute();
    return true;
  }
  applyTalents(save){
    if(!save||!save.talents) return;
    for(const id in save.talents){
      const lv=save.talents[id]|0; if(lv>0 && D.TALENT_APPLY[id]) D.TALENT_APPLY[id](this,lv);
    }
  }
  update(dt,g){
    const s=this.stats;
    let mx=0,my=0;
    if(E.key("KeyW")||E.key("ArrowUp"))my-=1;
    if(E.key("KeyS")||E.key("ArrowDown"))my+=1;
    if(E.key("KeyA")||E.key("ArrowLeft"))mx-=1;
    if(E.key("KeyD")||E.key("ArrowRight"))mx+=1;
    const len=Math.hypot(mx,my)||1;
    const spd=this.speed*(this.slowT>0?0.55:1);
    this.vx=E.lerp(this.vx,mx/len*spd,1-Math.pow(0.0001,dt));
    this.vy=E.lerp(this.vy,my/len*spd,1-Math.pow(0.0001,dt));
    if(!mx&&!my){ this.vx*=Math.pow(0.001,dt); this.vy*=Math.pow(0.001,dt); }
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.x=E.clamp(this.x,20,g.world.w-20); this.y=E.clamp(this.y,20,g.world.h-20);
    if(mx||my) this.moveAng=Math.atan2(my,mx);
    const mw=g.mouseWorld();
    const padOn=window.ENG&&ENG.padAim&&ENG.padAim.active;
    if(padOn) this.aim=Math.atan2(ENG.padAim.y,ENG.padAim.x);
    else if(this.autoAim){ const t=g.nearestEnemy(this.x,this.y,900); this.aim=t?E.ang(this.x,this.y,t.x,t.y):E.ang(this.x,this.y,mw.x,mw.y); }
    else this.aim=E.ang(this.x,this.y,mw.x,mw.y);
    if(Math.abs(this.vx)>20) this.face=this.vx>0?1:-1;
    else if(padOn&&Math.abs(ENG.padAim.x)>0.1) this.face=ENG.padAim.x>0?1:-1;
    else if(this.autoAim) this.face=Math.cos(this.aim)>=0?1:-1;
    else if(Math.abs(mw.x-this.x)>6) this.face=mw.x>this.x?1:-1;
    this.invuln=Math.max(0,this.invuln-dt); this.shieldTime=Math.max(0,this.shieldTime-dt); this.retributionT=Math.max(0,(this.retributionT||0)-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);
    if(this.slowT>0)this.slowT-=dt;
    if(s.hpRegen>0) this.hp=Math.min(this.maxHp,this.hp+s.hpRegen*dt);
    // 动画
    this.moveT+=dt;
    const moving=Math.hypot(this.vx,this.vy)>25;
    const setAnim=(n,fps)=>{ if(this.anim!==n){this.anim=n;this.frame=0;} this.frame=(this.frame+dt*fps)%1000; };
    if(this.hitFlash>0.08) setAnim("hit",7);
    else if(moving) setAnim("walk",9);
    else setAnim("idle",4);
    if(g.heroFrames){
      const arr=g.heroFrames.frames[this.anim]||g.heroFrames.frames.idle||[];
      this.curFrame=arr.length?arr[Math.floor(this.frame)%arr.length]:null;
    }
  }
  takeDamage(raw,src,g){
    if(this.invuln>0||this.shieldTime>0) return 0;
    const s=this.stats;
    if(Math.random()*100 < (s.dodge||0)){ g.popup(this.x,this.y-40,"闪避","#9fe8ff"); if(this.flags.mirror) this.heal(2); return 0; }
    let dmg=raw*(1-Math.min(0.75,(s.armor||0)/100))*(1-(s.damageReduction||0)/100)*(1+(s.takenPct||0)/100);
    dmg=Math.max(1,dmg);
    this.hp-=dmg; this.hitFlash=0.25; this.invuln=0.45;
    // v9：清理无意义的自赋值（原为 (window.__DL=window.__DL).push(...)）
    if(window.__DL){ window.__DL.push({t:+g.time.toFixed(1),s:(src&&(src.role||src.kind))||"?",a:Math.round(dmg)}); if(window.__DL.length>14)window.__DL.shift(); }
    g.shake(6); E.sfx.hurt();
    g.popup(this.x,this.y-46,"-"+Math.round(dmg),"#ff7b6b");
    if(s.thorns>0&&src&&src.takeDamage) src.takeDamage(s.thorns,g,{noCrit:true});
    if((this.retributionT||0)>0&&src&&src.takeDamage){ src.takeDamage(18+g.player.power*1.6,g,{noCrit:true}); g.popup(this.x,this.y-58,"反伤","#ffe08a"); }
    if(this.hp<=0){
      if(this.flags.phoenix>0){ this.flags.phoenix--; this.hp=Math.round(this.maxHp*0.3); this.invuln=2; g.popup(this.x,this.y-60,"不死鸟","#ffd27a"); return dmg; }
      this.hp=0; g.gameOver();
    }
    return dmg;
  }
  heal(v){ this.hp=Math.min(this.maxHp,this.hp+v); }
}

/* ================= 敌人 ================= */
class Enemy{
  constructor(g,def,x,y,wave,scaleExtra){
    this.g=g; this.def=def; this.id=def.mobId; this.role=def.role; this.skillSet=def.skillSet||null;
    this.x=x; this.y=y; this.r=18*def.size*1.1; this.scale=def.size*(scaleExtra||1)*1.15;
    // v9：rawHp 的敌人（Boss/扎昆手臂）在 game.js 里已经算好了最终血量与伤害，
    // 这里不能再叠乘 enemyHpMul/enemyDmgMul，否则 Boss 血量会被放大两次
    const hpMul=def.rawHp?1:D.enemyHpMul(wave)*def.hpMul;
    this.maxHp=Math.round(def.hp*hpMul); this.hp=this.maxHp;
    this.speed=def.speed; this.dmg=def.rawHp?def.dmg:def.dmg*D.enemyDmgMul(wave);
    this.aiType=def.ai; this.range=def.range||300;
    this.xp=def.xp; this.gold=def.gold;
    this.anim=new E.SpriteAnim([],150); this.state="move"; this.dead=false; this.deathT=0;
    this.kb={x:0,y:0}; this.flash=0; this.slow=0; this.atkCd=E.rand(1.6,0.6);
    this.face=1; this.isElite=!!def.elite; this.isBoss=!!def.boss; this.exploding=false; this.isZakumArm=!!def.arm; this.zakum=!!def.zakum;
    this.attackAnim=def.animSet.attack||null; this.skillAnim=def.animSet.skill||null;
    this.skillCd=this.skillAnim?E.rand(4.5,2.8):0; this.skillKind=def.skillKind||null;
    this.setAnim(def.animSet.move||def.animSet.stand, true);
    this.shootCd=E.rand(2.4,1.2);
    this.summonCd=4;
    this.bossCd=3.2; this.bossPhase=0; this.charging=0; this.chargeDir={x:0,y:0};
    this.actionT=0; this.castT=0; this.pendingSkill=null;
    this.hitFlash=0;
  }
  setAnim(frames,loop,delay){ this.anim.set(frames||[],frames&&frames.length?frames:null,loop); this.anim.defaultDelay=delay||150; }
  playAction(name,dur){
    const frames=this.def.animSet&&this.def.animSet[name];
    if(!frames||!frames.length) return false;
    this.actionT=dur||0.25; this.state=name; this.setAnim(frames,false,100); return true;
  }
  update(dt,g){
    if(this.dead){ this.deathT+=dt; return; }
    if(this.flash>0)this.flash-=dt;
    const p=g.player;
    const slowFactor=(this.slow>0?0.45:1)*(g.timeSlow>0?0.4:1);
    if(this.slow>0)this.slow-=dt;
    const dx=p.x-this.x, dy=p.y-this.y, dist=Math.hypot(dx,dy)||1;
    this.face=dx>0?1:-1;
    // 技能施法：先播放怪物技能动作，动作结束再结算效果
    if(this.castT>0){
      this.castT-=dt;
      if(this.castT<=0){
        const kind=this.pendingSkill; this.pendingSkill=null;
        if(kind==="mob"){ if(g.castMobSkill) g.castMobSkill(this); } else if(g.castBossSkillNow) g.castBossSkillNow(this,kind);
        this.state="move"; this.setAnim(this.def.animSet.move||this.def.animSet.stand,true,150);
      }
      this.anim.update(dt); return;
    }
    if(this.actionT>0){
      this.actionT-=dt;
      if(this.actionT<=0){ this.state="move"; this.setAnim(this.def.animSet.move||this.def.animSet.stand,true,150); }
      this.anim.update(dt); return;
    }
    let mx=0,my=0;
    if(this.aiType==="keep"){
      const want=this.range*0.72;
      if(dist>want+20){ mx=dx/dist; my=dy/dist; }
      else if(dist<want-40){ mx=-dx/dist; my=-dy/dist; }
      if(this.def.summon){ this.summonCd-=dt; if(this.summonCd<=0){ this.summonCd=6.5; g.summonMinions(this); } }
    } else {
      mx=dx/dist; my=dy/dist;
      if(this.hp<this.maxHp*0.3 && this.aiType==="chase"){
        // 绕行
        const s=Math.sin(g.time*2+this.x*0.01)*0.35; mx+= -my*s; my+= mx*s;
      }
    }
    if(this.isBoss){ this.bossCd-=dt; if(this.bossCd<=0){ this.bossCd=E.rand(3.8,2.8); g.startBossSkill(this); this.anim.update(dt); return; } }
    if(!this.isBoss && this.skillAnim){ this.skillCd-=dt; if(this.skillCd<=0 && dist<460){ this.skillCd=E.rand(7.5,5); this.pendingSkill="mob"; this.castT=0.5; this.state="skill"; this.setAnim(this.skillAnim,false,120); this.anim.update(dt); return; } }
    if(this.charging>0){ this.charging-=dt; mx=this.chargeDir.x; my=this.chargeDir.y; }
    const spd=this.speed*(this.charging>0?3.6:1)*slowFactor;
    this.x+=mx*spd*dt + this.kb.x*dt;
    this.y+=my*spd*dt + this.kb.y*dt;
    this.kb.x*=Math.pow(0.001,dt); this.kb.y*=Math.pow(0.001,dt);
    this.x=E.clamp(this.x,10,g.world.w-10); this.y=E.clamp(this.y,10,g.world.h-10);
    // 远程攻击
    if(this.aiType==="keep"){
      this.shootCd-=dt;
      if(this.shootCd<=0 && dist<this.range*1.3 && !this.def.summon){
        this.shootCd=this.isElite?1.3:2.2;
        this.playAction("attack",0.3);
        g.enemyShoot(this,p);
      }
    }
    // 近战 / 自爆
    if(this.aiType==="chase"){
      this.atkCd-=dt;
      if(dist<this.r+p.r+8 && this.atkCd<=0){
        this.atkCd=0.9; this.playAction("attack",0.22);
        p.takeDamage(this.dmg,this,g);
        if(this.def.explode){ this.explode(g); }
      }
    }
    // 动画状态
    if(this.hitFlash>0.1){ if(this.state!=="hit"){ this.state="hit"; this.setAnim(this.def.animSet.hit1||this.def.animSet.stand,false,100); } }
    else if(this.state!=="move"){ this.state="move"; this.setAnim(this.def.animSet.move||this.def.animSet.stand,true,150); }
    this.anim.update(dt);
  }
  explode(g){
    if(this.exploding)return; this.exploding=true;
    g.explosion(this.x,this.y,86,this.dmg*1.4,"#ff9a4d");
    this.hp=0; this.die(g);
  }
  takeDamage(dmg,g,opts){
    if(this.dead)return;
    this.hp-=dmg; this.flash=0.1; this.hitFlash=0.18;
    g.popup(this.x+E.rand(12,-12),this.y-this.r-12,Math.round(dmg),opts&&opts.crit?"#ffd24d":"#fff",opts&&opts.crit);
    if(this.hp<=0) this.die(g);
  }
  die(g){
    if(this.dead)return;
    this.dead=true; this.deathT=0; this.state="dead";
    this.setAnim(this.def.animSet.die1||this.def.animSet.stand,false,110);
    g.onEnemyDeath(this);
  }
}

/* ================= 弹幕 ================= */
class Projectile{
  constructor(o){
    Object.assign(this,{x:0,y:0,vx:0,vy:0,dmg:1,life:1.6,kind:"shot",pierce:0,radius:7,color:"#ffe08a",from:"player",splash:0,homing:false,target:null,hit:new Set(),spin:0,exploded:false},o);
    this.startX=this.x; this.startY=this.y; this.t=0; this.animT=0; this.speed0=Math.hypot(this.vx,this.vy)||1;
    this.returning=!!this.returning; this.hitBack=new Set(); this.trail=[]; this._trailT=0; window.__PJ=(window.__PJ||0)+1; window.__PJLAST={kind:this.kind,life:this.life,fx:this.fx};
    this.fx=this.fx||null; this.ball=null;
    const set=window.WZ&&window.WZ.atk&&window.WZ.atk[this.fx];
    const mobset=window.WZ&&window.WZ.mobfx&&window.WZ.mobfx[this.fx];
    const skey=this.fx&&this.fx.indexOf("sk:")===0?this.fx.slice(3):this.fx;
    const sfxset=window.WZ&&window.WZ.sfx&&window.WZ.sfx[skey];
    if(set&&set.ball) this.ball=set.ball;
    else if(mobset&&mobset.frames) this.ball=mobset;
    else if(sfxset&&sfxset.ball) this.ball=sfxset.ball;
  }
  update(dt,g){
    this.t+=dt; this.animT+=dt; this.life-=dt;
    if(this.homing&&this.target&&!this.target.dead){
      const a=E.ang(this.x,this.y,this.target.x,this.target.y);
      const spd=Math.hypot(this.vx,this.vy);
      const ca=Math.atan2(this.vy,this.vx);
      const na=ca+E.clamp(E.angDiff(ca,a),-3.2*dt,3.2*dt);
      this.vx=Math.cos(na)*spd; this.vy=Math.sin(na)*spd;
    }
    if(this.kind==="boomerang"){
      if(!this.returning && E.dist(this.startX,this.startY,this.x,this.y)>=(this.maxDist||300)){
        this.returning=true; this.hitBack=new Set();
        const p0=g&&g.player; if(p0){ const ra=E.ang(this.x,this.y,p0.x,p0.y); this.vx=Math.cos(ra)*this.speed0; this.vy=Math.sin(ra)*this.speed0; }
        if(g&&g.spawnAtkFx) g.spawnAtkFx(this.fx,"effect",this.x,this.y,42,0.6,this.vx<0,Math.atan2(this.vy,this.vx));
      }
      if(this.returning){
        const p=g.player; const d0=E.dist(this.x,this.y,p.x,p.y);
        // v8.3：回程左右交替弧线（去程扇形，回程分左右两束），接近玩家时收束
        const sideOff=d0>70?(this.side||1)*0.40*Math.min(1,(d0-70)/120):0;
        const a=E.ang(this.x,this.y,p.x,p.y)+sideOff;
        const spd=this.speed0||Math.hypot(this.vx,this.vy)||1;
        const ca=Math.atan2(this.vy,this.vx);
        const na=ca+E.clamp(E.angDiff(ca,a),-10*dt,10*dt);
        this.vx=Math.cos(na)*spd; this.vy=Math.sin(na)*spd;
        if(E.dist(this.x,this.y,p.x,p.y)<32) this.life=0;
      }
    }
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.spin+=dt*(this.kind==="boomerang"?16:12);
    if(this.kind==="boomerang"){
      this._trailT+=dt;
      if(this._trailT>0.025){ this._trailT=0; this.trail.push({x:this.x,y:this.y}); if(this.trail.length>14)this.trail.shift(); }
    }
    if(this.x<0||this.y<0||this.x>g.world.w||this.y>g.world.h) this.life=0;
  }
  get ballFrame(){
    if(!this.ball||!this.ball.frames||!this.ball.frames.length) return null;
    const fs=this.ball.frames, d=(fs[0][0]&&fs[0][0].d)||100;
    return fs[Math.floor(this.animT*1000/d)%fs.length];
  }
}

/* ================= 掉落物 ================= */
class Pickup{
  constructor(type,x,y,value){
    this.type=type; this.x=x; this.y=y; this.value=value||1;
    this.vx=E.rand(70,-70); this.vy=E.rand(70,-70); this.t=0; this.dead=false;
  }
  update(dt,g){
    this.t+=dt;
    const p=g.player;
    const d=E.dist(this.x,this.y,p.x,p.y);
    const R=p.stats.pickupRange;
    if(d<R){ const a=E.ang(this.x,this.y,p.x,p.y); const spd=200+Math.max(0,(R-d))*6;
      this.vx=E.lerp(this.vx,Math.cos(a)*spd,1-Math.pow(0.0001,dt));
      this.vy=E.lerp(this.vy,Math.sin(a)*spd,1-Math.pow(0.0001,dt)); }
    else { this.vx*=Math.pow(0.05,dt); this.vy*=Math.pow(0.05,dt); }
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    if(d<20){
      this.dead=true;
      if(this.type==="xp") g.gainXp(this.value);
      else if(this.type==="gold") { const v=Math.round(this.value*(1+p.stats.goldGainPct/100)); p.gold+=v; E.sfx.gold(); }
      else if(this.type==="heart") { p.heal(this.value); g.popup(p.x,p.y-50,"+"+this.value,"#7cf0a0"); }
      else if(this.type==="card") { g.grantCard(); }
      else if(this.type==="relic") { g.grantRelic(); }
    }
  }
}

/* ================= 粒子 / 伤害数字 ================= */
class Particle{
  constructor(o){ Object.assign(this,{x:0,y:0,vx:0,vy:0,life:0.5,t:0,size:4,color:"#fff",grav:0,type:"dot"},o); }
  update(dt){
    this.t+=dt; this.x+=this.vx*dt; this.y+=this.vy*dt; this.vy+=this.grav*dt;
    this.vx*=Math.pow(0.2,dt); this.vy*=Math.pow(0.2,dt);
  }
  get dead(){ return this.t>=this.life; }
}

window.ENT={Player,Enemy,Projectile,Pickup,Particle};

/* ---------- 英雄立绘合成 ---------- */
window.buildHeroArt=function(heroKey){
  const h=window.WZ.heroes&&window.WZ.heroes[heroKey];
  const AX=150,AY=240,CW=300,CH=300,S=2.2;
  if(!h||!h.anims) return null;

  // 所有锚点都在“部件自身 origin”坐标系里；body 的 origin 即角色原点(脚底)
  function place(parts){
    const body=parts.find(p=>p.zn==="body")||parts.find(p=>p.z===10)||parts[0];
    if(!body) return [];
    const bm=body.m||{};
    const bodyNavel=bm.navel||{x:0,y:-10};
    const bodyNeck=bm.neck||{x:0,y:-31};
    const arm=parts.find(p=>p.zn==="arm");
    let armOrigin=null, bodyHand=null;
    if(arm&&arm.m&&arm.m.navel){ armOrigin={x:bodyNavel.x-arm.m.navel.x,y:bodyNavel.y-arm.m.navel.y}; }
    if(arm&&arm.m&&arm.m.hand&&armOrigin){ bodyHand={x:armOrigin.x+arm.m.hand.x,y:armOrigin.y+arm.m.hand.y}; }
    const head=parts.find(p=>p.zn==="head");
    let headOrigin=null, headBrow=null;
    if(head&&head.m&&head.m.neck){
      headOrigin={x:bodyNeck.x-head.m.neck.x,y:bodyNeck.y-head.m.neck.y};
      if(head.m.brow) headBrow={x:headOrigin.x+head.m.brow.x,y:headOrigin.y+head.m.brow.y};
    }
    const res=[];
    for(const p of parts){
      let o=null;
      if(p===body) o={x:0,y:0};
      else if(p===head) o=headOrigin;
      else{
        const m=p.m||{};
        if(p.zn==="weapon"&&m.hand&&(m.hand.x||m.hand.y)&&bodyHand) o={x:bodyHand.x-m.hand.x,y:bodyHand.y-m.hand.y};
        else if(m.navel) o={x:bodyNavel.x-m.navel.x,y:bodyNavel.y-m.navel.y};
        else if(m.brow&&headBrow) o={x:headBrow.x-m.brow.x,y:headBrow.y-m.brow.y};
        else if(m.neck) o={x:bodyNeck.x-m.neck.x,y:bodyNeck.y-m.neck.y};
        else if(m.hand&&bodyHand) o={x:bodyHand.x-m.hand.x,y:bodyHand.y-m.hand.y};
      }
      if(!o) o={x:0,y:0};
      res.push({p,o});
    }
    return res;
  }

  const out={};
  for(const name in h.anims){
    out[name]=h.anims[name].map(f=>{
      const c=document.createElement("canvas"); c.width=CW;c.height=CH;
      const g=c.getContext("2d");
      g.imageSmoothingEnabled=false;
      const placed=place(f.parts).sort((a,b)=>a.p.z-b.p.z);
      for(const it of placed){
        const rec=E.loadImage(it.p.s);
        if(!rec||!rec.ready) continue;
        const x=AX+(it.o.x-it.p.ox)*S, y=AY+(it.o.y-it.p.oy)*S;
        g.drawImage(rec.img,x,y,rec.img.width*S,rec.img.height*S);
      }
      return c;
    });
  }
  return {frames:out,ax:AX,ay:AY,scale:S};
};

/* ---------- 阿尔泰动漫皮肤：把 Character/Cap 全身皮肤合成为玩家帧 ---------- */
window.buildCharSkinArt=function(skinId){
  const sk=window.WZ&&window.WZ.charSkins&&window.WZ.charSkins[skinId];
  if(!sk||!sk.anims) return null;
  const CW=340,CH=340,AX=170,AY=272;
  const stand=sk.anims.stand||[];
  const f0=stand[0];
  if(!f0) return null;
  const bh=Math.max(1,f0.bh||f0.h||100);
  const S=Math.max(0.72,Math.min(2.35,145/bh));
  // 用第一帧的可见包围盒把身体居中，并让脚底落在 AY；其余帧以同一 origin 对齐
  const dx0=AX-(f0.bx+(f0.bw||f0.w||1)/2)*S;
  const originX=dx0+(f0.ox||0)*S;
  const dy0=AY-(f0.by+(f0.bh||f0.h||bh))*S;
  const originY=dy0+(f0.oy||0)*S;
  const out={};
  const roles=[["stand","idle"],["walk","walk"],["hit","hit"]];
  for(const pair of roles){
    const frames=sk.anims[pair[0]]||[];
    out[pair[1]]=frames.map(f=>{
      const c=document.createElement("canvas"); c.width=CW; c.height=CH;
      const g=c.getContext("2d"); g.imageSmoothingEnabled=false;
      const rec=E.loadImage(f.s);
      if(rec&&rec.ready){
        const dx=originX-(f.ox||0)*S, dy=originY-(f.oy||0)*S;
        g.drawImage(rec.img,0,0,rec.img.width,rec.img.height,dx,dy,rec.img.width*S,rec.img.height*S);
      }
      return c;
    });
  }
  return {frames:out,ax:AX,ay:AY,scale:1,skinId};
};
})();
