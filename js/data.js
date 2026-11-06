/* ============================================================
 * data.js — 游戏配置：角色 / 武器 / 技能 / 卡牌 / 怪物 / 波次 / 地图
 * 由 kimi-k3.1-pro 的规划设计落地，deepseek-v4.1-flash 参与数值表生成
 * ============================================================ */
(function(){
const D = {};

/* ---------- 玩家基础属性 ---------- */
D.BASE = {
  maxHp: 100, hpRegen: 0.4, speed: 215, armor: 0, dodge: 0,
  damagePct: 0, meleePct: 0, rangedPct: 0, elementalPct: 0,
  attackSpeedPct: 0, critChance: 5, critDamage: 60, range: 0,
  pickupRange: 90, luck: 0, harvest: 3, lifesteal: 0, thorns: 0,
  xpGainPct: 0, projectiles: 0, cooldownPct: 0, goldGainPct: 0, damageReduction: 0
};

D.PLAYER_SCALE = 0.60;   // v6 官方血量口径：玩家生命/伤害整体削减 40%
D.PLAYER_DMG_MUL = 0.60;
D.MOB_SCALE = 1.00;      // v7 官方血量：怪物 HP/伤害严格按 WZ 官方数值，不再额外放大
/* v8.3 经济 / 难度基准：官方数值为 1.00，下面是普通难度对官方数值的玩法倍率 */
D.MOB_HP_MUL = 1.80;     // 普通小怪生命 ×1.8
D.MOB_DMG_MUL = 1.15;    // 普通小怪伤害 ×1.15
D.ELITE_HP_MUL = 2.20;   // 精英额外生命倍率
D.BOSS_HP_MUL = 2.50;    // BOSS 额外生命倍率
D.SHOP = {
  weapon: 55, weaponAura: 75, skill: 65,
  card: { common: 50, rare: 75, epic: 110, legend: 150 },
  relic: 140,
  healBase: 25, healPerWave: 6, healMin: 15,
  waveRate: 0.08, waveCap: 2.6,
  buyRate: 0.10, buyCap: 3.0,
  rerollBase: 15, rerollStep: 10
};
/* v9 平衡：扎昆本体血量下调，配合 ZAKUM_DMG_MUL 让有效血量≈14,000，
   30 波满配玩家 40 秒内可击杀；原 1.1 亿血有效值 19.8 万，实际需 466 秒 */
D.ZAKUM = { id:"8800002", hp:35000000, arms:["8800003","8800004","8800005","8800006","8800007","8800008","8800009","8800010"], dmgMul:900 };
D.ZAKUM_DMG_MUL = 2500;

D.STAT_LABEL = {
  maxHp:"最大生命", hpRegen:"生命回复/s", speed:"移动速度", armor:"护甲",
  dodge:"闪避%", damagePct:"伤害%", meleePct:"近战伤害%", rangedPct:"远程伤害%",
  elementalPct:"元素伤害%", attackSpeedPct:"攻击速度%", critChance:"暴击率%",
  critDamage:"暴击伤害%", range:"攻击范围%", pickupRange:"拾取范围",
  luck:"幸运", harvest:"收获(金币/波)", lifesteal:"吸血%", thorns:"荆棘反伤",
  xpGainPct:"经验获取%", projectiles:"额外弹幕", cooldownPct:"冷却缩减%",
  goldGainPct:"金币获取%", damageReduction:"减伤%"
};

/* ---------- 6 个角色 ---------- */
/* look: body/head/hair/face/coat/pants/shoes/weapon 对应 WZ 资源 id */
D.CHARACTERS = [
  { id:"ray", name:"剑士·雷恩", title:"钢铁前线", role:"近战 / 高生存",
    look:{ body:"00002000", head:"00012000", hair:"00030000", face:"00020000", coat:"01040000", weapon:"01302000",pants:"01060000",shoes:"01070000" },
    stats:{ maxHp:40, armor:12, speed:-10, meleePct:20 },
    startWeapon:"sword", startSkill:"ironwill",
    desc:"以剑为盾的旧骑士。生命与护甲成长更高，近战伤害 +20%，但移速较慢。",
    unlock:null },
  { id:"elin", name:"弓手·艾琳", title:"疾风游侠", role:"远程 / 高机动",
    look:{ body:"00002003", head:"00012003", hair:"00030005", face:"00020002", coat:"01040005", weapon:"01452000",pants:"01060010",shoes:"01070001" },
    stats:{ speed:25, rangedPct:25, attackSpeedPct:10, maxHp:-15 },
    startWeapon:"bow", startSkill:"piercingrain",
    desc:"森林的耳目。移速与攻速更快，远程伤害 +25%，但体质偏弱。",
    unlock:null },
  { id:"luna", name:"法师·露娜", title:"元素之心", role:"元素 / 爆发",
    look:{ body:"00002005", head:"00012005", hair:"00030010", face:"00020005", coat:"01040010", weapon:"01382000",pants:"01060020",shoes:"01070002" },
    stats:{ elementalPct:35, maxHp:-25, cooldownPct:8 },
    startWeapon:"wand", startSkill:"tristar",
    desc:"塔中走出的元素使。元素伤害 +35%，冷却 -8%，生命较低，靠范围法术清场。",
    unlock:null },
  { id:"shade", name:"盗贼·影", title:"暗巷之刃", role:"暴击 / 闪避",
    look:{ body:"00002002", head:"00012002", hair:"00030002", face:"00020003", coat:"01040015", weapon:"01332000",pants:"01060030",shoes:"01070003" },
    stats:{ critChance:15, critDamage:40, dodge:12, speed:15, maxHp:-20 },
    startWeapon:"shuriken", startSkill:"backstab",
    desc:"从不正面接战。暴击率 +15%、暴击伤害 +40%、闪避 12%，输出极不稳定但上限最高。",
    unlock:{ type:"wave", value:6, text:"任意角色抵达第 6 波" } },
  { id:"orlan", name:"圣骑·奥兰", title:"晨曦壁垒", role:"坦克 / 回复",
    look:{ body:"00002004", head:"00012004", hair:"00030020", face:"00020007", coat:"01040020", weapon:"01312000",pants:"01060040",shoes:"01070004" },
    stats:{ maxHp:80, armor:25, hpRegen:0.8, speed:-15, damagePct:-10 },
    startWeapon:"hammer", startSkill:"sanctuary",
    desc:"把痛苦当作祈祷。最大生命 +80、护甲 +25、每秒回血，但伤害与移速下降。",
    unlock:{ type:"wave", value:10, text:"任意角色抵达第 10 波" } },
  { id:"mo", name:"死灵·墨", title:"骸骨低语", role:"召唤 / 吸血",
    look:{ body:"00002000", head:"00012000", hair:"00030025", face:"00020009", coat:"01040025", weapon:"01372000",pants:"01060050",shoes:"01070005" },
    stats:{ lifesteal:4, damagePct:10, maxHp:-30, harvest:2 },
    startWeapon:"staff", startSkill:"bonearmy",
    desc:"与死者交易的术士。吸血 4%、伤害 +10%，可召唤骷髅作战，但生命上限较低。",
    unlock:{ type:"wave", value:14, text:"任意角色抵达第 14 波" } },
  { id:"kai", name:"龙骑·凯", title:"破阵长枪", role:"穿刺 / 冲阵",
    look:{ body:"00002010", head:"00012010", hair:"00030030", face:"00020010", coat:"01040030", weapon:"01432000",pants:"01060060",shoes:"01070006" },
    stats:{ maxHp:25, armor:8, meleePct:18, range:15, speed:5 },
    startWeapon:"spear", startSkill:"dragoncharge",
    desc:"把长枪当成第二条脊梁。近战与范围更大，冲锋陷阵的前排。",
    unlock:{ type:"wave", value:18, text:"任意角色抵达第 18 波" } },
  { id:"nia", name:"拳师·妮娅", title:"风之呼吸", role:"连击 / 控场",
    look:{ body:"00002011", head:"00012011", hair:"00030035", face:"00020011", coat:"01040035", weapon:"01472000",pants:"01060070",shoes:"01070007" },
    stats:{ attackSpeedPct:22, speed:18, dodge:8, maxHp:-10 },
    startWeapon:"shuriken", startSkill:"hundredfist",
    desc:"呼吸与脚步同频。攻速 +22%、移速 +18%，用密集的小伤害磨平一切。",
    unlock:{ type:"wave", value:22, text:"任意角色抵达第 22 波" } },
  { id:"gale", name:"大剑·盖尔", title:"断罪之刃", role:"爆发 / 吸血",
    look:{ body:"00002001", head:"00012001", hair:"00030040", face:"00020001", coat:"01040040", weapon:"01402000",pants:"01060080",shoes:"01070009" },
    stats:{ damagePct:22, critDamage:30, maxHp:10, speed:-8 },
    startWeapon:"sword", startSkill:"earthsplit",
    desc:"一击定胜负。伤害 +22%、暴击伤害 +30%，但出手慢、脚步沉。",
    unlock:{ type:"wave", value:26, text:"任意角色抵达第 26 波" } },
  { id:"bora", name:"枪手·波拉", title:"硝烟玫瑰", role:"火炮 / 清场",
    look:{ body:"00002005", head:"00012005", hair:"00030045", face:"00020012", coat:"01040045", weapon:"01492000",pants:"01060090",shoes:"01070014" },
    stats:{ rangedPct:20, projectiles:1, maxHp:-20, attackSpeedPct:-5 },
    startWeapon:"cannon", startSkill:"barrage",
    desc:"把整片战场当作靶场。额外弹幕 +1、远程伤害 +20%，近身则非常脆弱。",
    unlock:{ type:"wave", value:30, text:"任意角色抵达第 30 波" } }
];
/* ---------- v6 追加 8 名女性角色（共 18 名） ---------- */
D.CHARACTERS.push(
  { id:"selene", name:"月巫·塞勒涅", title:"银月星辉", role:"法术 / 范围", gender:"female",
    look:{ body:"00002003", head:"00012003", hair:"00030100", face:"00020020", coat:"01040050", weapon:"01382000", pants:"01060100", shoes:"01070001" },
    stats:{ maxHp:10, damagePct:8, cooldownPct:6, elementalPct:12 }, startWeapon:"wand", startSkill:"moonfall",
    desc:"以月光为引的星术师。专属技能「月陨」在敌群中心降下银月爆裂。",
    unlock:{ type:"wave", value:12, text:"任意角色抵达第 12 波" } },
  { id:"aria", name:"歌姬·阿莉娅", title:"星芒咏叹", role:"远程 / 弹幕", gender:"female",
    look:{ body:"00002000", head:"00012000", hair:"00030110", face:"00020021", coat:"01040055", weapon:"01302000", pants:"01060101", shoes:"01070002" },
    stats:{ maxHp:5, rangedPct:18, attackSpeedPct:10, projectiles:1 }, startWeapon:"bow", startSkill:"starlight",
    desc:"把歌声化作星芒。专属技能「星芒」向四周射出八道星光。",
    unlock:{ type:"wave", value:16, text:"任意角色抵达第 16 波" } },
  { id:"yuki", name:"雪女·雪姬", title:"霜华凝露", role:"冰霜 / 控场", gender:"female",
    look:{ body:"00002010", head:"00012010", hair:"00030120", face:"00020022", coat:"01040060", weapon:"01452000", pants:"01060102", shoes:"01070003" },
    stats:{ maxHp:15, elementalPct:20, speed:-5, cooldownPct:4 }, startWeapon:"wand", startSkill:"frostnova",
    desc:"呼吸间凝结霜华。专属技能「冰封新星」冻结周围敌人并造成元素伤害。",
    unlock:{ type:"wave", value:20, text:"任意角色抵达第 20 波" } },
  { id:"rin", name:"剑姬·凛", title:"绯刃樱吹", role:"近战 / 连斩", gender:"female",
    look:{ body:"00002011", head:"00012011", hair:"00030130", face:"00020023", coat:"01040065", weapon:"01332000", pants:"01060103", shoes:"01070004" },
    stats:{ maxHp:-5, meleePct:24, critChance:8, speed:6 }, startWeapon:"sword", startSkill:"bladedance",
    desc:"刀锋掠过如樱吹雪。专属技能「绯刃乱舞」连续斩击周围敌人。",
    unlock:{ type:"wave", value:24, text:"任意角色抵达第 24 波" } },
  { id:"mira", name:"机娘·米拉", title:"苍穹轰炸", role:"科技 / 爆发", gender:"female",
    look:{ body:"00002001", head:"00012001", hair:"00030140", face:"00020024", coat:"01040070", weapon:"01492000", pants:"01060104", shoes:"01070006" },
    stats:{ maxHp:-10, attackSpeedPct:12, projectiles:1, rangedPct:10 }, startWeapon:"cannon", startSkill:"drone",
    desc:"把整片天空当作发射架。专属技能「无人机轰炸」标记并轰炸敌群。",
    unlock:{ type:"wave", value:28, text:"任意角色抵达第 28 波" } },
  { id:"nami", name:"海巫·娜美", title:"潮汐回响", role:"水元素 / 位移", gender:"female",
    look:{ body:"00002003", head:"00012003", hair:"00030150", face:"00020025", coat:"01040075", weapon:"01472000", pants:"01060105", shoes:"01070009" },
    stats:{ maxHp:8, dodge:10, speed:10, elementalPct:10 }, startWeapon:"shuriken", startSkill:"tide",
    desc:"听见潮汐的低语。专属技能「海潮」推开身边所有敌人。",
    unlock:{ type:"wave", value:30, text:"任意角色抵达第 30 波" } },
  { id:"rona", name:"守誓·罗娜", title:"湛蓝壁垒", role:"坦克 / 护盾", gender:"female",
    look:{ body:"00002004", head:"00012004", hair:"00030160", face:"00020026", coat:"01040080", weapon:"01312000", pants:"01060106", shoes:"01070014" },
    stats:{ maxHp:35, armor:18, damagePct:-5, hpRegen:0.5 }, startWeapon:"hammer", startSkill:"bulwark",
    desc:"以誓言为盾。专属技能「守护壁垒」获得护盾并回复生命。",
    unlock:{ type:"wins", value:1, text:"通关任意地图 1 次" } },
  { id:"zoe", name:"影舞·佐伊", title:"夜幕刃影", role:"刺客 / 暴击", gender:"female",
    look:{ body:"00002002", head:"00012002", hair:"00030170", face:"00020027", coat:"01040085", weapon:"01432000", pants:"01060107", shoes:"01070015" },
    stats:{ maxHp:-10, critChance:10, critDamage:35, dodge:6 }, startWeapon:"shuriken", startSkill:"shadowstep",
    desc:"在敌人的影子里起舞。专属技能「影袭」瞬步并斩击路径上的敌人。",
    unlock:{ type:"kills", value:1500, text:"累计击杀 1500 个敌人" } }
);

/* ---------- 武器 ---------- */
/* kind: arc(扇形近战) / thrust(穿刺) / shot(直线弹) / homing(追踪弹) / boomerang(回旋) / aura(光环) / chain(连锁) */
D.WEAPONS = [
  { id:"sword", name:"骑士短剑", kind:"arc", icon:"sword", fx:"sword",
    dmg:14, cd:0.62, range:78, arc:1.5, knock:60, desc:"挥出扇形斩击，命中范围内全部敌人。" },
  { id:"spear", name:"长枪", kind:"thrust", icon:"spear", fx:"spear",
    dmg:19, cd:0.85, range:130, width:26, pierce:3, desc:"向前突刺，可穿透 3 个敌人。" },
  { id:"bow", name:"猎弓", kind:"shot", icon:"bow", fx:"bow",
    dmg:12, cd:0.55, range:420, speed:640, pierce:0, desc:"射出高速箭矢，射程极远。" },
  { id:"wand", name:"元素法杖", kind:"homing", icon:"wand", fx:"wand",
    dmg:15, cd:0.78, range:360, speed:330, splash:38, desc:"释放追踪元素弹，命中后小范围爆炸。" },
  { id:"shuriken", name:"飞镖", kind:"boomerang", icon:"shuriken", fx:"shuriken",
    dmg:10, cd:0.5, range:300, speed:560, pierce:99, desc:"回旋飞镖，去程与回程都会造成伤害。" },
  { id:"hammer", name:"战锤", kind:"arc", icon:"hammer", fx:"hammer",
    dmg:24, cd:1.05, range:92, arc:1.9, knock:180, desc:"重击前方大范围，强力击退并眩晕。" },
  { id:"staff", name:"骨杖", kind:"shot", icon:"staff", fx:"staff",
    dmg:13, cd:0.72, range:340, speed:460, pierce:2, desc:"射出穿透骨矢，可穿透 2 个目标。" },
  { id:"aura", name:"圣光领域", kind:"aura", icon:"aura", fx:"aura",
    dmg:6, cd:0.45, range:120, desc:"持续灼烧身边所有敌人，范围随等级扩大。" },
  { id:"chain", name:"雷霆之杖", kind:"chain", icon:"chain", fx:"chain",
    dmg:10, cd:1.1, range:280, chains:3, desc:"闪电在敌人之间跳跃，最多连锁 3 次。" },
  { id:"cannon", name:"火炮", kind:"shot", icon:"cannon", fx:"cannon",
    dmg:20, cd:1.25, range:380, speed:380, splash:60, desc:"发射爆炸炮弹，范围伤害。" }
];
D.WEAPON_BY_ID = Object.fromEntries(D.WEAPONS.map(w=>[w.id,w]));

/* ---------- 技能（主动，1~4 键） ---------- */
D.SKILLS = [
  { id:"whirl", name:"旋风斩", cd:6, icon:"whirl", desc:"原地旋转，对周围造成 3 段伤害并击退。",
    cast(g,p){ for(let i=0;i<3;i++) setTimeout(()=>{ if(g.raf) g.areaDamage(p.x,p.y,110,p.power*1.2,"melee",{knock:120,color:"#ffd27a",fx:"sk:whirl"}); }, i*120); } },
  { id:"arrowrain", name:"箭雨", cd:7, icon:"arrowrain", desc:"在最近敌人周围落下 12 支箭，范围持续伤害。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,520)||{x:p.x+80,y:p.y}; for(let i=0;i<12;i++){ const a=Math.random()*Math.PI*2,r=Math.random()*120; g.spawnProjectile({x:t.x+Math.cos(a)*r,y:t.y+Math.sin(a)*r,from:"skill",dmg:p.power*0.85,life:0.5,kind:"rain",fx:"bow"}); } } },
  { id:"meteor", name:"陨石术", cd:12, icon:"meteor", desc:"召唤陨石砸向鼠标位置，造成巨额范围伤害。",
    cast(g,p){ const m=g.mouseWorld(); g.spawnSkillProjectile("meteor",m.x,m.y-340,0,600,p.power*3.2,170,0.62,24); } },
  { id:"shadow", name:"影分身", cd:14, icon:"shadow", desc:"召唤 2 个分身，自动攻击 8 秒。",
    cast(g,p){ g.summonClone(p,1.0); g.summonClone(p,1.0); } },
  { id:"shield", name:"圣盾", cd:11, icon:"shield", desc:"获得 4 秒伤害免疫与护盾。",
    cast(g,p){ p.shieldTime=4; p.invuln=Math.max(p.invuln,0.35); g.popup(p.x,p.y-60,"圣盾","#ffe08a"); } },
  { id:"heal", name:"治愈之光", cd:16, icon:"heal", desc:"立即恢复 35% 最大生命，并清除减速。",
    cast(g,p){ p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.35); p.slowT=0; g.popup(p.x,p.y-60,"+治疗","#7cf0a0"); } },
  { id:"timeslow", name:"时间迟缓", cd:15, icon:"timeslow", desc:"3 秒内全场敌人移速与攻速降低 60%。",
    cast(g,p){ g.timeSlow=3; g.popup(p.x,p.y-60,"时间迟缓","#8bd4ff"); } },
  { id:"summon", name:"召唤骷髅", cd:13, icon:"summon", desc:"召唤 2 只骷髅战士为你作战 12 秒。",
    cast(g,p){ g.summonSkeleton(p); g.summonSkeleton(p); } },
  { id:"shockwave", name:"震荡波", cd:9, icon:"shockwave", desc:"向四周释放冲击波，造成伤害并击退。",
    cast(g,p){ let a=p.aim||0; const e=g.nearestEnemy(p.x,p.y,560); if(e) a=Math.atan2(e.y-p.y,e.x-p.x); g.spawnSkillProjectile("shockwave",p.x,p.y,Math.cos(a)*560,Math.sin(a)*560,p.power*2,190,1.1,24); } }
];

/* ---------- v6 角色专属技能 ---------- */
D.SKILLS.push(
  { id:"moonfall", name:"月陨", cd:9, icon:"meteor", exclusive:"selene", fx:"meteor", desc:"在最近敌群降下银月爆裂，造成范围伤害。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,560)||{x:p.x+120,y:p.y}; g.timers.push({t:0.45,fn:()=>{ g.spawnSkillFx("meteor",t.x,t.y,190,{hit:true}); g.areaDamage(t.x,t.y,190,p.power*2.4,"elemental",{fx:"sk:meteor"}); }}); } },
  { id:"starlight", name:"星芒", cd:8, icon:"arrowrain", exclusive:"aria", fx:"arrowrain", desc:"向四周射出八道星光，每道造成远程伤害。",
    cast(g,p){ for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; g.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,from:"skill",dmg:p.power*0.9,life:0.9,kind:"skill",fx:"bow"}); } } },
  { id:"frostnova", name:"冰封新星", cd:10, icon:"timeslow", exclusive:"yuki", fx:"timeslow", desc:"冻结周围敌人并造成元素伤害。",
    cast(g,p){ g.spawnSkillFx("timeslow",p.x,p.y,190,{hit:true}); g.areaDamage(p.x,p.y,190,p.power*1.5,"elemental",{fx:"sk:timeslow"}); for(const e of g.enemies) if(!e.dead&&Math.hypot(p.x-e.x,p.y-e.y)<210) e.slowT=Math.max(e.slowT||0,3); } },
  { id:"bladedance", name:"绯刃乱舞", cd:7, icon:"whirl", exclusive:"rin", fx:"whirl", desc:"连续五次斩击周围敌人。",
    cast(g,p){ for(let i=0;i<5;i++){ g.timers.push({t:i*0.1,fn:()=>{ g.spawnSkillFx("whirl",p.x,p.y,120,{hit:true}); g.areaDamage(p.x,p.y,125,p.power*0.75,"melee",{knock:80,fx:"sk:whirl"}); }}); } } },
  { id:"drone", name:"无人机轰炸", cd:11, icon:"meteor", exclusive:"mira", fx:"bigburst", desc:"呼叫无人机轰炸最近敌群三次。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,620)||{x:p.x+160,y:p.y}; for(let i=0;i<3;i++){ const x=t.x+(Math.random()*140-70),y=t.y+(Math.random()*140-70); g.timers.push({t:0.3+i*0.22,fn:()=>{ g.spawnSkillFx("bigburst",x,y,120,{hit:true}); g.explosion(x,y,120,p.power*1.4,"#ffd166",true); }}); } } },
  { id:"tide", name:"海潮", cd:8, icon:"shockwave", exclusive:"nami", fx:"shockwave", desc:"掀起海潮，击退并伤害周围敌人。",
    cast(g,p){ g.spawnSkillFx("shockwave",p.x,p.y,220,{hit:true}); g.areaDamage(p.x,p.y,220,p.power*1.3,"elemental",{knock:260,fx:"sk:shockwave"}); } },
  { id:"bulwark", name:"守护壁垒", cd:12, icon:"shield", exclusive:"rona", fx:"shield", desc:"获得 5 秒护盾并回复 25% 生命。",
    cast(g,p){ p.shieldTime=Math.max(p.shieldTime,5); p.heal(p.maxHp*0.25); g.spawnSkillFx("shield",p.x,p.y,130,{hit:false}); } },
  { id:"shadowstep", name:"影袭", cd:9, icon:"shadow", exclusive:"zoe", fx:"shadow", desc:"瞬步到瞄准方向并斩击路径上的敌人。",
    cast(g,p){ const a=p.aim||0, x=p.x+Math.cos(a)*150, y=p.y+Math.sin(a)*150; g.spawnSkillFx("shadow",p.x,p.y,150,{hit:false}); p.x=Math.max(20,Math.min(g.world.w-20,x)); p.y=Math.max(20,Math.min(g.world.h-20,y)); p.invuln=0.35; g.areaDamage(p.x,p.y,110,p.power*1.8,"melee",{fx:"sk:shadow"}); } }
);

/* ---------- v7：补齐 10 位角色的专属技能（每人 1 个，不进商店） ---------- */
D.SKILLS.push(
  { id:"ironwill", name:"钢铁回响", cd:10, icon:"whirl", exclusive:"ray", fx:"whirl", desc:"重剑三连砸地，范围击退，并在 1.5 秒内获得护盾。",
    cast(g,p){ for(let i=0;i<3;i++) g.timers.push({t:i*0.15,fn:()=>{ g.spawnSkillFx("whirl",p.x,p.y,150,{hit:true}); g.areaDamage(p.x,p.y,150,p.power*0.95,"melee",{knock:110,fx:"sk:whirl"}); }}); p.shieldTime=Math.max(p.shieldTime||0,1.5); } },
  { id:"piercingrain", name:"穿云箭", cd:8, icon:"arrowrain", exclusive:"elin", fx:"arrowrain", desc:"向最近敌群射出九道穿刺箭，并在落点爆裂。",
    cast(g,p){ const t2=g.nearestEnemy(p.x,p.y,620); const x=t2?t2.x:p.x+(p.face||1)*180, y=t2?t2.y:p.y;
      g.spawnSkillFx("arrowrain",x,y,130,{hit:true});
      for(let i=0;i<9;i++){ const a=i/9*Math.PI*2, r=96; g.spawnProjectile({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,vx:Math.cos(a)*40,vy:Math.sin(a)*40,from:"skill",dmg:p.power*0.7,life:0.4,kind:"skill",fx:"bow",pierce:2}); }
      g.areaDamage(x,y,140,p.power*1.1,"ranged",{fx:"sk:arrowrain"}); } },
  { id:"tristar", name:"三重陨星", cd:12, icon:"meteor", exclusive:"luna", fx:"meteor", selfFx:1, desc:"连续召唤三颗陨星，覆盖大片区域。",
    cast(g,p){ const m=g.mouseWorld(); for(let i=0;i<3;i++){ const x=m.x+(i-1)*70, y=m.y+(i%2?60:-40);
      g.timers.push({t:0.25+i*0.18,fn:()=>{ g.spawnSkillFx("meteor",x,y,150,{hit:true}); g.areaDamage(x,y,150,p.power*1.25,"elemental",{fx:"sk:meteor"}); }}); } } },
  { id:"backstab", name:"背刺影袭", cd:7, icon:"shadow", exclusive:"shade", fx:"shadow", desc:"瞬步到最近敌人身后，造成高额暴击伤害。",
    cast(g,p){ const t2=g.nearestEnemy(p.x,p.y,560); g.spawnSkillFx("shadow",p.x,p.y,120,{});
      if(t2){ const a=Math.atan2(t2.y-p.y,t2.x-p.x)||0; p.x=Math.max(20,Math.min(g.world.w-20,t2.x-Math.cos(a)*44)); p.y=Math.max(20,Math.min(g.world.h-20,t2.y-Math.sin(a)*44)); p.invuln=Math.max(p.invuln||0,0.25);
        g.spawnSkillFx("shadow",t2.x,t2.y,120,{hit:true}); g.areaDamage(t2.x,t2.y,120,p.power*2.2,"melee",{fx:"sk:shadow"}); } } },
  { id:"sanctuary", name:"圣域祝福", cd:14, icon:"heal", exclusive:"orlan", fx:"heal", desc:"回复 20% 生命并获得 3 秒护盾，同时净化周围敌人。",
    cast(g,p){ g.spawnSkillFx("heal",p.x,p.y,150,{hit:true}); p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.2); p.shieldTime=Math.max(p.shieldTime||0,3); p.slowT=0;
      g.areaDamage(p.x,p.y,170,p.power*0.9,"holy",{fx:"sk:heal"}); } },
  { id:"bonearmy", name:"亡者大军", cd:15, icon:"summon", exclusive:"mo", fx:"summon", desc:"一次召唤 3 只骷髅战士，并回复少量生命。",
    cast(g,p){ g.spawnSkillFx("summon",p.x,p.y,140,{}); for(let i=0;i<3;i++) g.summonSkeleton(p); p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.08); } },
  { id:"dragoncharge", name:"龙枪冲锋", cd:9, icon:"shockwave", exclusive:"kai", fx:"shockwave", desc:"向前冲锋，撞飞路径上的所有敌人。",
    cast(g,p){ const a=p.aim||0; let cx=p.x, cy=p.y;
      for(let i=0;i<6;i++){ cx+=Math.cos(a)*34; cy+=Math.sin(a)*34; g.effectDash(cx,cy,a,38); g.areaDamage(cx,cy,66,p.power*0.8,"melee",{knock:90,fx:"sk:shockwave"}); }
      p.x=Math.max(20,Math.min(g.world.w-20,cx)); p.y=Math.max(20,Math.min(g.world.h-20,cy)); p.invuln=Math.max(p.invuln||0,0.35); p.shieldTime=Math.max(p.shieldTime||0,0.8); } },
  { id:"hundredfist", name:"百裂连拳", cd:9, icon:"whirl", exclusive:"nia", fx:"whirl", desc:"连续八次快速出拳，逐次提高伤害。",
    cast(g,p){ const t2=g.nearestEnemy(p.x,p.y,240)||{x:p.x+60,y:p.y};
      for(let i=0;i<8;i++) g.timers.push({t:i*0.07,fn:()=>{ const a=Math.random()*Math.PI*2, r=20+Math.random()*30;
        g.spawnSkillFx("whirl",p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,70,{hit:true}); g.areaDamage(t2.x,t2.y,96,p.power*0.45*(1+i*0.08),"melee",{fx:"sk:whirl",silent:true}); }}); } },
  { id:"earthsplit", name:"裂地斩", cd:11, icon:"shockwave", exclusive:"gale", fx:"shockwave", desc:"巨剑劈开大地，向前方释放三道冲击波并吸血。",
    cast(g,p){ const a=p.aim||0; for(let i=0;i<3;i++) g.timers.push({t:i*0.16,fn:()=>{
        const x=p.x+Math.cos(a)*(120+i*60), y=p.y+Math.sin(a)*(120+i*60);
        g.spawnSkillFx("shockwave",x,y,140,{hit:true}); g.areaDamage(x,y,150,p.power*1.05,"melee",{knock:80,fx:"sk:shockwave"}); }});
      p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.05); } },
  { id:"barrage", name:"爆裂弹幕", cd:10, icon:"meteor", exclusive:"bora", fx:"shockwave", desc:"向四周倾泻 10 发爆裂炮弹。",
    cast(g,p){ g.spawnSkillFx("shockwave",p.x,p.y,120,{hit:true});
      for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; g.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,from:"skill",dmg:p.power*0.75,life:0.9,kind:"skill",fx:"cannon",splash:56,radius:12}); } } }
);

/* ---------- v8.3：第二专属技能（5 波觉醒，每人 1 个，不进商店） ---------- */
D.SKILLS.push(
  { id:"steelstorm", name:"钢铁风暴", cd:12, icon:"whirl", exclusive:"ray", unlockWave:5, fx:"whirl", desc:"化身钢铁旋风持续 1 秒，连续五次斩击并短暂获得护盾。",
    cast(g,p){ for(let i=0;i<5;i++) g.timers.push({t:i*0.16,fn:()=>{ if(p.dead)return; g.spawnSkillFx("whirl",p.x,p.y,155,{hit:true}); g.areaDamage(p.x,p.y,155,p.power*0.82,"melee",{knock:70,fx:"sk:whirl"}); }}); p.shieldTime=Math.max(p.shieldTime||0,1.2); } },
  { id:"windpath", name:"疾风箭径", cd:8, icon:"arrowrain", exclusive:"elin", unlockWave:5, fx:"bow", desc:"向瞄准方向射出贯穿整条路径的疾风箭，路径上的敌人全部受创。",
    cast(g,p){ const a=p.aim||0; g.lineDamage(p.x,p.y,a,560,74,p.power*1.65,99,{fx:"bow"}); g.effectSlash(p.x,p.y,a,260,0.28,"#b7f0ff"); g.spawnSkillFx("arrowrain",p.x+Math.cos(a)*180,p.y+Math.sin(a)*180,120,{hit:true}); } },
  { id:"lunartide", name:"月蚀潮汐", cd:13, icon:"meteor", exclusive:"luna", unlockWave:5, fx:"meteor", selfFx:1, desc:"在敌群中掀起三轮月蚀潮汐，每轮范围逐渐扩大。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,620)||{x:p.x+150,y:p.y}; for(let i=0;i<3;i++){ const r=110+i*55; g.timers.push({t:0.35+i*0.25,fn:()=>{ g.spawnSkillFx("meteor",t.x,t.y,r,{hit:true}); g.areaDamage(t.x,t.y,r,p.power*0.95,"elemental",{fx:"sk:meteor"}); }}); } } },
  { id:"shadowmark", name:"影袭印记", cd:9, icon:"shadow", exclusive:"shade", unlockWave:5, fx:"shadow", desc:"给最多五名敌人种下影印，短暂延迟后同时引爆。",
    cast(g,p){ const arr=g.enemies.filter(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<620).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,5); for(let i=0;i<arr.length;i++){ const x=arr[i].x,y=arr[i].y; g.timers.push({t:0.5+i*0.06,fn:()=>{ g.spawnSkillFx("shadow",x,y,105,{hit:true}); g.areaDamage(x,y,105,p.power*1.15,"melee",{fx:"sk:shadow"}); }}); } if(!arr.length){ g.spawnSkillFx("shadow",p.x,p.y,130,{hit:true}); g.areaDamage(p.x,p.y,130,p.power*1.1,"melee",{fx:"sk:shadow"}); } } },
  { id:"judgment", name:"圣光审判", cd:13, icon:"heal", exclusive:"orlan", unlockWave:5, fx:"heal", desc:"降下纵向圣光柱，回复自身生命并净化路径上的敌人。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,640)||{x:p.x,y:p.y-180}; g.lineDamage(t.x,t.y-220,Math.PI/2,440,95,p.power*1.55,99,{fx:"heal"}); g.spawnSkillFx("heal",t.x,t.y,150,{hit:true}); p.heal(p.maxHp*0.12); p.shieldTime=Math.max(p.shieldTime||0,2); } },
  { id:"bonewall", name:"白骨壁垒", cd:14, icon:"summon", exclusive:"mo", unlockWave:5, fx:"summon", desc:"召唤两只骷髅，并在四周竖起八根白骨尖刺刺穿敌人。",
    cast(g,p){ g.summonSkeleton(p); g.summonSkeleton(p); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2, x=p.x+Math.cos(a)*105, y=p.y+Math.sin(a)*105; g.spawnSkillFx("summon",x,y,55,{hit:true}); g.areaDamage(x,y,58,p.power*0.72,"elemental",{fx:"sk:summon"}); } } },
  { id:"dragonbreath", name:"龙息", cd:11, icon:"shockwave", exclusive:"kai", unlockWave:5, fx:"shockwave", desc:"朝瞄准方向持续喷吐龙息，六段锥形火焰伤害。",
    cast(g,p){ const a=p.aim||0; for(let i=0;i<6;i++) g.timers.push({t:i*0.12,fn:()=>{ if(p.dead)return; g.spawnSkillFx("shockwave",p.x+Math.cos(a)*150,p.y+Math.sin(a)*150,140,{hit:true}); g.arcDamage(p.x,p.y,a,300,1.05,p.power*0.58,"elemental",{knock:35,fx:"sk:shockwave"}); }}); } },
  { id:"meteorfist", name:"陨星寸拳", cd:10, icon:"whirl", exclusive:"nia", unlockWave:5, fx:"whirl", desc:"瞬身贴近最近敌人，一拳轰出陨星级爆发。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,620); if(t){ p.x=Math.max(20,Math.min(g.world.w-20,t.x-42)); p.y=Math.max(20,Math.min(g.world.h-20,t.y)); p.invuln=Math.max(p.invuln||0,0.3); g.spawnSkillFx("whirl",t.x,t.y,190,{hit:true}); g.areaDamage(t.x,t.y,125,p.power*2.6,"melee",{knock:220,fx:"sk:whirl"}); g.effectRing(t.x,t.y,150,"#ffd27a",0.5); } else { const a=p.aim||0; g.areaDamage(p.x+Math.cos(a)*90,p.y+Math.sin(a)*90,110,p.power*1.6,"melee",{fx:"sk:whirl"}); } } },
  { id:"windwheel", name:"风刃轮舞", cd:12, icon:"whirl", exclusive:"gale", unlockWave:5, fx:"shockwave", selfFx:1, desc:"向四个方向掷出旋转风刃，风刃会折返并再次切割敌人。",
    cast(g,p){ for(let i=0;i<4;i++){ const a=i/4*Math.PI*2+0.4; g.spawnProjectile({x:p.x,y:p.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,from:"skill",dmg:p.power*0.85,life:2.1,kind:"boomerang",pierce:99,radius:12,color:"#9fe8ff",fx:"shockwave",maxDist:260}); } } },
  { id:"orbital", name:"轨道轰炸", cd:13, icon:"meteor", exclusive:"bora", unlockWave:5, fx:"bigburst", desc:"标记敌群，六发轨道炮从天空连续轰击。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,680)||{x:p.x+180,y:p.y}; for(let i=0;i<6;i++){ const x=t.x+(Math.random()*180-90), y=t.y+(Math.random()*180-90); g.timers.push({t:0.25+i*0.14,fn:()=>{ g.spawnSkillFx("bigburst",x,y,115,{hit:true}); g.explosion(x,y,110,p.power*1.05,"#ffcf66",false); }}); } } },
  { id:"lunarfield", name:"月华领域", cd:14, icon:"meteor", exclusive:"selene", unlockWave:5, fx:"timeslow", selfFx:1, desc:"在脚下展开月华领域，五轮月光灼烧敌人并持续回复自身。",
    cast(g,p){ g.spawnSkillFx("timeslow",p.x,p.y,210,{hit:true}); for(let i=0;i<5;i++) g.timers.push({t:i*0.32,fn:()=>{ if(p.dead)return; g.areaDamage(p.x,p.y,210,p.power*0.5,"elemental",{fx:"sk:timeslow"}); p.heal(p.maxHp*0.018); }}); } },
  { id:"resonance", name:"共鸣音波", cd:11, icon:"arrowrain", exclusive:"aria", unlockWave:5, fx:"shockwave", desc:"释放三道扩散音波，命中敌人并使其减速。",
    cast(g,p){ for(let i=0;i<3;i++){ const r=125+i*75; g.timers.push({t:i*0.22,fn:()=>{ g.spawnSkillFx("shockwave",p.x,p.y,r,{hit:true}); g.areaDamage(p.x,p.y,r,p.power*0.72,"elemental",{fx:"sk:shockwave"}); for(const e of g.enemies) if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<r) e.slow=Math.max(e.slow||0,2.2); }}); } } },
  { id:"icepath", name:"极寒冰径", cd:10, icon:"timeslow", exclusive:"yuki", unlockWave:5, fx:"timeslow", desc:"沿瞄准方向铺设六段冰爆，冻结并击碎路径上的敌人。",
    cast(g,p){ const a=p.aim||0; for(let i=0;i<6;i++){ const x=p.x+Math.cos(a)*(80+i*72), y=p.y+Math.sin(a)*(80+i*72); g.timers.push({t:i*0.09,fn:()=>{ g.spawnSkillFx("timeslow",x,y,88,{hit:true}); g.areaDamage(x,y,88,p.power*0.78,"elemental",{fx:"sk:timeslow"}); for(const e of g.enemies) if(!e.dead&&Math.hypot(e.x-x,e.y-y)<92) e.slow=Math.max(e.slow||0,2.5); }}); } } },
  { id:"sakura", name:"樱花瞬杀", cd:12, icon:"shadow", exclusive:"rin", unlockWave:5, fx:"shadow", desc:"连续瞬身斩杀三名敌人，每次落点都会绽放樱花斩。",
    cast(g,p){ for(let i=0;i<3;i++) g.timers.push({t:i*0.16,fn:()=>{ if(p.dead)return; const t=g.nearestEnemy(p.x,p.y,620); if(!t)return; p.x=Math.max(20,Math.min(g.world.w-20,t.x-36)); p.y=Math.max(20,Math.min(g.world.h-20,t.y)); p.invuln=Math.max(p.invuln||0,0.18); g.spawnSkillFx("shadow",t.x,t.y,120,{hit:true}); g.effectSlash(t.x,t.y,Math.random()*Math.PI*2,130,0.3,"#ffb6d5"); g.areaDamage(t.x,t.y,115,p.power*1.25,"melee",{fx:"sk:shadow"}); }}); } },
  { id:"laser", name:"轨道激光", cd:12, icon:"meteor", exclusive:"mira", unlockWave:5, fx:"bigburst", selfFx:1, desc:"锁定敌人发射两道交叉轨道激光，贯穿全场。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,720)||{x:p.x+200,y:p.y}; const a=Math.atan2(t.y-p.y,t.x-p.x); g.lineDamage(t.x,t.y,a,680,70,p.power*2.0,99,{fx:"bigburst"}); g.lineDamage(t.x,t.y,a+Math.PI/2,320,55,p.power*0.8,99,{fx:"bigburst"}); g.spawnSkillFx("bigburst",t.x,t.y,170,{hit:true}); g.effectRing(t.x,t.y,120,"#8bd4ff",0.6); } },
  { id:"whirlpool", name:"深海漩涡", cd:13, icon:"shockwave", exclusive:"nami", unlockWave:5, fx:"shockwave", desc:"制造深海漩涡，把敌人拖向中心后引爆。",
    cast(g,p){ const t=g.nearestEnemy(p.x,p.y,620)||{x:p.x+160,y:p.y}; for(let i=0;i<5;i++) g.timers.push({t:i*0.18,fn:()=>{ for(const e of g.enemies) if(!e.dead&&Math.hypot(e.x-t.x,e.y-t.y)<200){ e.x+=(t.x-e.x)*0.22; e.y+=(t.y-e.y)*0.22; e.slow=Math.max(e.slow||0,1.2); } g.spawnSkillFx("shockwave",t.x,t.y,180,{}); g.areaDamage(t.x,t.y,180,p.power*0.42,"elemental",{fx:"sk:shockwave"}); }}); g.timers.push({t:1.0,fn:()=>{ g.spawnSkillFx("shockwave",t.x,t.y,220,{hit:true}); g.areaDamage(t.x,t.y,220,p.power*1.25,"elemental",{knock:180,fx:"sk:shockwave"}); }}); } },
  { id:"retribution", name:"反伤圣盾", cd:14, icon:"shield", exclusive:"rona", unlockWave:5, fx:"shield", desc:"获得四秒圣盾，期间受到攻击会以圣光反击周围敌人。",
    cast(g,p){ p.shieldTime=Math.max(p.shieldTime||0,4); p.retributionT=4; g.spawnSkillFx("shield",p.x,p.y,160,{hit:true}); g.areaDamage(p.x,p.y,140,p.power*0.65,"holy",{fx:"sk:shield"}); } },
  { id:"shadowburst", name:"影爆", cd:10, icon:"shadow", exclusive:"zoe", unlockWave:5, fx:"shadow", desc:"向前瞬身并留下四段影爆，撕裂路径上的敌人。",
    cast(g,p){ const a=p.aim||0; for(let i=0;i<4;i++){ const x=p.x+Math.cos(a)*(90+i*62), y=p.y+Math.sin(a)*(90+i*62); g.timers.push({t:i*0.07,fn:()=>{ g.spawnSkillFx("shadow",x,y,95,{hit:true}); g.areaDamage(x,y,95,p.power*0.85,"melee",{fx:"sk:shadow"}); }}); } p.x=Math.max(20,Math.min(g.world.w-20,p.x+Math.cos(a)*250)); p.y=Math.max(20,Math.min(g.world.h-20,p.y+Math.sin(a)*250)); p.invuln=Math.max(p.invuln||0,0.35); } }
);

D.SKILL_BY_ID=Object.fromEntries(D.SKILLS.map(s=>[s.id,s]));

/* ---------- 卡牌 ---------- */
/* type: stat / unique / weapon / skill ; rarity: common/rare/epic/legend */
D.CARDS = [
  { id:"dmg1", name:"锋锐石", rarity:"common", type:"stat", desc:"伤害 +8%", apply(p){ p.stats.damagePct+=8; } },
  { id:"dmg2", name:"狂战纹章", rarity:"rare", type:"stat", desc:"伤害 +15%，但受到伤害 +5%", apply(p){ p.stats.damagePct+=15; p.stats.takenPct=(p.stats.takenPct||0)+5; } },
  { id:"as1", name:"轻羽手套", rarity:"common", type:"stat", desc:"攻击速度 +10%", apply(p){ p.stats.attackSpeedPct+=10; } },
  { id:"as2", name:"疾风之息", rarity:"rare", type:"stat", desc:"攻击速度 +18%", apply(p){ p.stats.attackSpeedPct+=18; } },
  { id:"hp1", name:"生命宝石", rarity:"common", type:"stat", desc:"最大生命 +20", apply(p){ p.stats.maxHp+=20; p.hp+=20; } },
  { id:"hp2", name:"巨人心脏", rarity:"epic", type:"stat", desc:"最大生命 +45", apply(p){ p.stats.maxHp+=45; p.hp+=45; } },
  { id:"spd1", name:"旅行靴", rarity:"common", type:"stat", desc:"移动速度 +10", apply(p){ p.stats.speed+=10; } },
  { id:"spd2", name:"疾行护符", rarity:"rare", type:"stat", desc:"移动速度 +18", apply(p){ p.stats.speed+=18; } },
  { id:"arm1", name:"铁片", rarity:"common", type:"stat", desc:"护甲 +8", apply(p){ p.stats.armor+=8; } },
  { id:"arm2", name:"钢板护甲", rarity:"rare", type:"stat", desc:"护甲 +18，移速 -5", apply(p){ p.stats.armor+=18; p.stats.speed-=5; } },
  { id:"crit1", name:"鹰眼", rarity:"rare", type:"stat", desc:"暴击率 +8%", apply(p){ p.stats.critChance+=8; } },
  { id:"crit2", name:"处刑者", rarity:"epic", type:"stat", desc:"暴击伤害 +40%", apply(p){ p.stats.critDamage+=40; } },
  { id:"range1", name:"瞄准镜", rarity:"common", type:"stat", desc:"攻击范围 +12%", apply(p){ p.stats.range+=12; } },
  { id:"pick1", name:"磁石", rarity:"common", type:"stat", desc:"拾取范围 +40", apply(p){ p.stats.pickupRange+=40; } },
  { id:"harv1", name:"钱袋", rarity:"common", type:"stat", desc:"每波收获 +3 金币", apply(p){ p.stats.harvest+=3; } },
  { id:"luck1", name:"四叶草", rarity:"rare", type:"stat", desc:"幸运 +10（提高稀有卡与掉落）", apply(p){ p.stats.luck+=10; } },
  { id:"regen1", name:"再生藤蔓", rarity:"rare", type:"stat", desc:"每秒回复 0.6 生命", apply(p){ p.stats.hpRegen+=0.6; } },
  { id:"xp1", name:"学识卷轴", rarity:"common", type:"stat", desc:"经验获取 +15%", apply(p){ p.stats.xpGainPct+=15; } },
  { id:"dodge1", name:"轻身术", rarity:"rare", type:"stat", desc:"闪避 +8%", apply(p){ p.stats.dodge+=8; } },
  { id:"proj1", name:"多重弹幕", rarity:"epic", type:"unique", desc:"额外弹幕 +1，伤害 -8%", apply(p){ p.stats.projectiles+=1; p.stats.damagePct-=8; } },
  { id:"life1", name:"吸血鬼之牙", rarity:"epic", type:"unique", desc:"吸血 +6%", apply(p){ p.stats.lifesteal+=6; } },
  { id:"boom1", name:"爆裂符文", rarity:"epic", type:"unique", desc:"敌人死亡时爆炸，造成范围伤害", apply(p){ p.flags.boom=1; } },
  { id:"frost1", name:"霜冻之心", rarity:"rare", type:"unique", desc:"命中使敌人减速 35%（2 秒）", apply(p){ p.flags.frost=1; } },
  { id:"thorns1", name:"荆棘之甲", rarity:"rare", type:"unique", desc:"受击反弹 15 点伤害", apply(p){ p.stats.thorns+=15; } },
  { id:"greed1", name:"贪婪之杯", rarity:"rare", type:"unique", desc:"金币获取 +35%", apply(p){ p.stats.goldGainPct+=35; } },
  { id:"rage1", name:"狂怒之血", rarity:"epic", type:"unique", desc:"生命低于 35% 时伤害 +45%", apply(p){ p.flags.rage=1; } },
  { id:"cdr1", name:"时之沙", rarity:"epic", type:"unique", desc:"技能冷却 -20%", apply(p){ p.stats.cooldownPct+=20; } },
  { id:"chain1", name:"导电符文", rarity:"epic", type:"unique", desc:"击杀时有 25% 概率释放连锁闪电", apply(p){ p.flags.chain=1; } },
  { id:"orbit1", name:"环绕飞刃", rarity:"legend", type:"unique", desc:"获得 2 把环绕飞刃，持续伤害附近敌人", apply(p){ p.flags.orbit=(p.flags.orbit||0)+2; } },
  { id:"vamp1", name:"嗜血狂潮", rarity:"legend", type:"unique", desc:"击杀回复 2 点生命，攻速 +10%", apply(p){ p.flags.vamp=1; p.stats.attackSpeedPct+=10; } },
  { id:"glass", name:"玻璃大炮", rarity:"legend", type:"unique", desc:"伤害 +45%，最大生命 -25%", apply(p){ p.stats.damagePct+=45; p.stats.maxHp=Math.round(p.stats.maxHp*0.75); } },
  { id:"titan", name:"泰坦之躯", rarity:"legend", type:"unique", desc:"最大生命 +80，护甲 +20，移速 -12", apply(p){ p.stats.maxHp+=80; p.hp+=80; p.stats.armor+=20; p.stats.speed-=12; } },
  { id:"vitality_training", name:"生命训练", rarity:"common", type:"stat", desc:"最大生命+25，当前生命+25。", apply(p){ p.stats.maxHp += 25; p.hp += 25; } },
  { id:"swift_boots", name:"疾行靴", rarity:"common", type:"stat", desc:"移动速度+8。", apply(p){ p.stats.speed += 8; } },
  { id:"magnet_glove", name:"磁力手套", rarity:"common", type:"stat", desc:"拾取范围+30。", apply(p){ p.stats.pickupRange += 30; } },
  { id:"blade_mastery", name:"利刃精通", rarity:"rare", type:"stat", desc:"近战伤害+18%。", apply(p){ p.stats.meleePct += 18; } },
  { id:"steady_aim", name:"稳定瞄准", rarity:"rare", type:"stat", desc:"远程伤害+18%。", apply(p){ p.stats.rangedPct += 18; } },
  { id:"regeneration", name:"生命回复", rarity:"rare", type:"stat", desc:"每秒生命回复+2。", apply(p){ p.stats.hpRegen += 2; } },
  { id:"berserker", name:"狂战士", rarity:"epic", type:"stat", desc:"伤害+30%，护甲-2。", apply(p){ p.stats.damagePct += 30; p.stats.armor -= 2; } },
  { id:"crit_focus", name:"暴击专注", rarity:"epic", type:"stat", desc:"暴击率+15%，暴击伤害+35%，攻击速度-10%。", apply(p){ p.stats.critChance += 15; p.stats.critDamage += 35; p.stats.attackSpeedPct -= 10; } },
  { id:"glass_cannon", name:"破釜沉舟", rarity:"legend", type:"stat", desc:"伤害+60%，闪避-10%，护甲-5。", apply(p){ p.stats.damagePct += 60; p.stats.dodge -= 10; p.stats.armor -= 5; } },
  { id:"blood_frenzy", name:"血之狂热", rarity:"legend", type:"stat", desc:"吸血+10%，攻击速度+30%，最大生命-20（当前生命同步至上限）。", apply(p){ p.stats.lifesteal += 10; p.stats.attackSpeedPct += 30; p.stats.maxHp -= 20; p.hp = Math.min(p.hp, p.stats.maxHp); } },
];
D.CARD_BY_ID=Object.fromEntries(D.CARDS.map(c=>[c.id,c]));
D.RARITY_NAME={common:"普通",rare:"稀有",epic:"史诗",legend:"传说"};
D.RARITY_WEIGHT={common:64,rare:26,epic:9,legend:2};

/* ---------- 地图 ---------- */
D.MAPS = [
  { id:"forest", name:"蘑菇森林", tag:"新手 · 均衡",
    levelRange:[1,20], levelText:"Lv.1–20", theme:"forest",
    desc:"潮湿的林间小路，蘑菇与野兽成群结队。敌人数量多但单体孱弱。",
    mods:{ spawnRate:1.12, enemyHp:0.92, gold:1.0 },
    modText:"敌人数量 +12%，敌人生命 -8%",
    pool:["9400319","9303000","9303001","9303002","9400005","1210100","1210102","1110100","2220100","1210103","1120100","9500168","9500152"],
    elite:"9303001", boss:"2220000", bossScale:0.9,
    palette:{ top:"#3f7b46", bottom:"#25512f", grid:"#4f9457", accent:"#a7e6a0", leaf:"#6bbf6a" },
    bg:[{s:"assets/bg/forest_midForest_2.png",x:0.02,y:0.02,scale:1.15,a:0.5},{s:"assets/bg/forest_midForest_3.png",x:0.52,y:0.0,scale:1.25,a:0.42}],
    unlock:null },
  { id:"snow", name:"霜白雪原", tag:"进阶 · 减速",
    levelRange:[21,40], levelText:"Lv.21–40", theme:"snow",
    desc:"风雪掩盖了视线，脚下的冰面让人打滑。怪物行动缓慢，但皮糙肉厚。",
    mods:{ spawnRate:0.95, enemyHp:1.18, playerSpeed:-8, gold:1.12 },
    modText:"敌人生命 +18%，玩家移速 -8%，金币 +12%",
    pool:["9400517","3230305","9300011","9400531","3220001","3300008","3220000","3230300","6130104","9001012","3000001","9300285","9500179"],
    elite:"3300008", boss:"3300005", bossScale:0.42,
    palette:{ top:"#f4fbff", bottom:"#c6dcef", grid:"#dcecf8", accent:"#8ecdf5", leaf:"#ffffff" },
    bg:[{s:"assets/bg/snow_snowyLightrock_4.png",x:0.0,y:0.0,scale:1.7,a:0.55},{s:"assets/bg/snow_snowyDarkrock_3.png",tile:true,y:0.03,scale:1.3,a:0.35}],
    unlock:null },
  { id:"desert", name:"黄沙遗迹", tag:"进阶 · 远程",
    levelRange:[41,60], levelText:"Lv.41–60", theme:"desert",
    desc:"被遗忘的王朝在沙下喘息。射手与毒蝎擅长拉开距离，请保持移动。",
    mods:{ spawnRate:1.0, enemyHp:1.05, enemyDamage:1.1, gold:1.15 },
    modText:"敌人伤害 +10%，金币 +15%",
    pool:["6130202","9300191","9500150","9500175","9500176","5150000","5220003","5120505","5130102","5090000","5100004","9300047","5120506"],
    elite:"5220003", boss:"5220000", bossScale:0.85,
    palette:{ top:"#f0cf8d", bottom:"#c39a55", grid:"#e0b872", accent:"#fff0c2", leaf:"#e8c07a" },
    bg:[{s:"assets/bg/desert_desert_6.png",x:0.0,y:0.52,scale:1.7,a:0.5},{s:"assets/bg/desert_desert_6.png",x:0.55,y:0.62,scale:1.9,a:0.4}],
    unlock:{ type:"wave", value:4, text:"任意角色抵达第 4 波" } },
  { id:"tower", name:"暗黑高塔", tag:"高手 · 高压",
    levelRange:[61,90], levelText:"Lv.61–90", theme:"tower",
    desc:"塔内的钟声从未停下。亡灵与魔物拥有更高的生命与攻击，但财宝也更多。",
    mods:{ spawnRate:1.05, enemyHp:1.30, enemyDamage:1.18, gold:1.3 },
    modText:"敌人生命 +30%、伤害 +18%，金币 +30%",
    pool:["8140510","8140555","8140700","9300209","9300289","9420539","8120101","8140110","9300207","8120103","9300140","8220000","9420538"],
    elite:"8220000", boss:"8220002", bossScale:0.5,
    palette:{ top:"#54407a", bottom:"#2d2145", grid:"#6a529b", accent:"#c6adff", leaf:"#8f74c9" },
    bg:[{s:"assets/bg/tower_grayBrickTower_3.png",x:0.02,y:0.0,scale:2.2,a:0.42},{s:"assets/bg/tower_grayBrickTower_3.png",x:0.42,y:0.0,scale:2.2,a:0.38},{s:"assets/bg/tower_grayBrickTower_3.png",x:0.72,y:0.05,scale:2.0,a:0.32}],
    unlock:{ type:"wave", value:8, text:"任意角色抵达第 8 波" } },
  { id:"corrupt", name:"腐化森林", tag:"挑战 · 高强度",
    levelRange:[91,120], levelText:"Lv.91–120", theme:"forest",
    desc:"森林被黑魔法浸透。敌人更强、更密，但掉落也更好，适合刷传说卡。",
    mods:{ spawnRate:1.25, enemyHp:1.45, enemyDamage:1.25, gold:1.45, luck:15 },
    modText:"敌人数量 +25%、生命 +45%、伤害 +25%，金币 +45%，幸运 +15",
    pool:["9400582","9300163","9420519","8190004","9300077","8190003","9300075","9300076","9420517","9600036","8160000","8170000","9600034"],
    elite:"9400582", boss:"8220003", bossScale:1.1,
    palette:{ top:"#3d6b4a", bottom:"#22392b", grid:"#4f7a55", accent:"#c9f08a", leaf:"#7fbf74" },
    bg:[{s:"assets/bg/corrupt_poisonForest_7.png",x:0.03,y:0.0,scale:1.5,a:0.5},{s:"assets/bg/corrupt_poisonForest_7.png",x:0.35,y:0.02,scale:1.4,a:0.42},{s:"assets/bg/corrupt_poisonForest_7.png",x:0.7,y:0.05,scale:1.6,a:0.36}],
    unlock:{ type:"wave", value:16, text:"任意角色抵达第 16 波" } },
  { id:"void", name:"虚空回廊", tag:"无尽 · 极限",
    levelRange:[121,160], levelText:"Lv.121–160", theme:"tower",
    desc:"没有尽头的走廊。每一波都比上一波更疯狂，记录你能撑到第几波。",
    mods:{ spawnRate:1.15, enemyHp:1.6, enemyDamage:1.35, gold:1.6, luck:25 },
    modText:"敌人生命 +60%、伤害 +35%，金币 +60%，幸运 +25",
    pool:["8200009","8200010","8610018","9600022","9600024","9600019","9600021","8200011","8200012","9400267","9400268","9400269","9400253"],
    elite:"8200012", boss:"8800002", bossScale:0.5,
    palette:{ top:"#4a3b74", bottom:"#231a3c", grid:"#6b54a6", accent:"#d9c2ff", leaf:"#9c86d6" },
    bg:[{s:"assets/bg/void_darkWood_0.png",x:0.0,y:0.02,scale:1.3,a:0.32},{s:"assets/bg/void_darkWood_0.png",x:0.45,y:0.55,scale:1.5,a:0.25}],
    unlock:{ type:"wave", value:20, text:"任意角色抵达第 20 波" } }
];
D.MAP_BY_ID=Object.fromEntries(D.MAPS.map(m=>[m.id,m]));

/* ---------- 敌人角色模板 ---------- */
/* 由地图 pool 中的怪物按顺序分配 role */
D.ROLES = {
  chaser:  { hp:1.0, spd:1.0, dmg:1.0, size:1.0, xp:1, gold:1,  ai:"chase" },
  runner:  { hp:0.6, spd:1.65,dmg:0.8, size:0.85,xp:1, gold:1,  ai:"chase" },
  tank:    { hp:2.6, spd:0.62,dmg:1.5, size:1.35,xp:2, gold:2,  ai:"chase" },
  shooter: { hp:0.85,spd:0.85,dmg:1.0, size:1.0, xp:2, gold:2,  ai:"keep", range:300 },
  exploder:{ hp:0.9, spd:1.15,dmg:2.2, size:1.0, xp:2, gold:2,  ai:"chase", explode:1 },
  summoner:{ hp:1.6, spd:0.7, dmg:0.9, size:1.15,xp:3, gold:3,  ai:"keep", range:260, summon:1 }
};

/* ---------- 30 波节奏（30 波后可继续无尽） ---------- */
D.WAVES = (()=>{
  const out=[];
  for(let w=1;w<=30;w++){
    let n,mix,elite,t;
    if(w<=5){ n=Math.round(8+w*2.2); mix=["chaser","chaser","runner"]; t=26; elite=0; }
    else if(w<=10){ n=Math.round(19+(w-5)*3.6); mix=["chaser","runner","shooter"]; t=28; elite=w>=10?1:0; }
    else if(w<=15){ n=Math.round(46+(w-10)*5.4); mix=["chaser","runner","tank","exploder"]; t=32; elite=1+Math.floor((w-11)/2); }
    else if(w<=20){ n=Math.round(73+(w-15)*6.8); mix=["tank","shooter","summoner","exploder"]; t=34; elite=3; }
    else if(w<=25){ n=Math.round(107+(w-20)*9.0); mix=["chaser","tank","summoner","exploder","runner"]; t=37; elite=4; }
    else { n=Math.round(152+(w-25)*13.0); mix=["tank","summoner","exploder","runner","shooter"]; t=40; elite=5; }
    out.push({ t, n, mix, elite, boss: w%10===0, eliteBoss: w%5===0 && w%10!==0, final: w===30 });
  }
  return out;
})();
D.WAVE_MAX = 30;
D.WAVE_MAX_ENDLESS = 60;
D.waveDef = w => w<=30 ? D.WAVES[w-1] : { t: Math.min(70, 44+Math.floor((w-30)/3)*4), n: Math.round(228+(w-30)*14), mix:["tank","summoner","exploder","runner","shooter"], elite: Math.min(10, 6+Math.floor((w-30)/2)), boss: w%3===0, eliteBoss: w%6===0 };
/* v8.3 金币曲线：前期慷慨、后期收敛；金币获取%只在拾取时结算一次 */
D.goldDropMul = w => Math.max(1.8, 3.8 - 0.07 * Math.max(0, w - 1));
D.goldWaveBonus = w => 12 + 5 * w;

/* 难度曲线 */
D.enemyHpMul = w => 1 + 0.13*(w-1) + 0.020*(w-1)*(w-1); // 前 10 波平缓，后 10 波陡增
D.enemyDmgMul = w => 1 + 0.08*(w-1) + 0.006*(w-1)*(w-1);
D.xpNeed = lv => Math.round(4 + 3.4*lv + 0.42*lv*lv);
D.RARITY_ORDER = ["common","rare","epic","legend"];
D.MAP_ORDER = D.MAPS.map(m=>m.id);

/* ---------- 难度模式（与联机模式数值完全一致，单机场景选择使用） ---------- */
D.DIFFICULTIES = [
  { key:"easy",      name:"轻松", color:"#69d18b", desc:"敌人更弱、数量更少，奖励略低，适合熟悉玩法。",
    hp:0.65, dmg:0.65, spawn:0.82, reward:0.90, elite:0.8 },
  { key:"normal",    name:"标准", color:"#6fb7ff", desc:"官方推荐数值，标准生存挑战。",
    hp:1.00, dmg:1.00, spawn:1.00, reward:1.00, elite:1.0 },
  { key:"hard",      name:"困难", color:"#ffad5c", desc:"敌人更硬、伤害更高、数量更多，奖励提升。",
    hp:1.55, dmg:1.30, spawn:1.15, reward:1.25, elite:1.35 },
  { key:"nightmare", name:"噩梦", color:"#d98cff", desc:"极限生存，敌人成倍强化，奖励最高。",
    hp:2.40, dmg:1.75, spawn:1.30, reward:1.60, elite:1.8 }
];
D.DIFFICULTY_BY_ID = Object.fromEntries(D.DIFFICULTIES.map(x=>[x.key,x]));

window.GD = D;
})();
