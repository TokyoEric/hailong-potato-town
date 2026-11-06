/* ============================================================
 * data2.js — v2 扩展：卡牌羁绊 / 遗物 / 天赋树 / 每日挑战 / 卡牌升华
 * ============================================================ */
(function(){
const D = window.GD;

/* ---------- 卡牌标签 ---------- */
D.CARD_TAGS = {
  dmg1:["blade"], dmg2:["blade"], blade_mastery:["blade"], berserker:["blade"], glass_cannon:["blade"],
  crit1:["blade"], crit2:["blade"], crit_focus:["blade"], glass:["blade"], rage1:["blade"],
  as1:["wind"], as2:["wind"], spd1:["wind"], spd2:["wind"], dodge1:["wind"], swift_boots:["wind"],
  blood_frenzy:["wind","blade"], steady_aim:["wind"],
  hp1:["stone"], hp2:["stone"], arm1:["stone"], arm2:["stone"], regen1:["stone"], regeneration:["stone"],
  titan:["stone"], vitality_training:["stone"], thorns1:["stone"],
  range1:["arcane"], proj1:["arcane"], cdr1:["arcane"], orbit1:["arcane"], chain1:["arcane"],
  boom1:["arcane"], frost1:["arcane"], holy:["arcane"],
  harv1:["fortune"], greed1:["fortune"], magnet_glove:["fortune"], pick1:["fortune"], xp1:["fortune"],
  luck1:["fortune"], life1:["fortune"], vamp1:["fortune"]
};
D.BONDS = [
  { id:"blade", name:"锋刃", color:"#ff9b7a", desc:"近战与暴击流派",
    tiers:[ {n:2,text:"伤害 +10%",apply(p){p.stats.damagePct+=10;}},
            {n:4,text:"攻击速度 +10%",apply(p){p.stats.attackSpeedPct+=10;}},
            {n:6,text:"暴击伤害 +40%，吸血 +3%",apply(p){p.stats.critDamage+=40;p.stats.lifesteal+=3;}} ] },
  { id:"wind", name:"疾风", color:"#8fe3ff", desc:"速度与闪避流派",
    tiers:[ {n:2,text:"移速 +15",apply(p){p.stats.speed+=15;}},
            {n:4,text:"闪避 +8%",apply(p){p.stats.dodge+=8;}},
            {n:6,text:"攻击速度 +25%",apply(p){p.stats.attackSpeedPct+=25;}} ] },
  { id:"stone", name:"磐石", color:"#d9c48a", desc:"生命与护甲流派",
    tiers:[ {n:2,text:"护甲 +10",apply(p){p.stats.armor+=10;}},
            {n:4,text:"最大生命 +40",apply(p){p.stats.maxHp+=40;p.hp+=40;}},
            {n:6,text:"减伤 +12%",apply(p){p.stats.damageReduction+=12;}} ] },
  { id:"arcane", name:"秘法", color:"#c8a8ff", desc:"技能与范围流派",
    tiers:[ {n:2,text:"冷却缩减 +8%",apply(p){p.stats.cooldownPct+=8;}},
            {n:4,text:"攻击范围 +20%",apply(p){p.stats.range+=20;}},
            {n:6,text:"额外弹幕 +1",apply(p){p.stats.projectiles+=1;}} ] },
  { id:"fortune", name:"财富", color:"#ffe08a", desc:"金币与拾取流派",
    tiers:[ {n:2,text:"金币获取 +25%",apply(p){p.stats.goldGainPct+=25;}},
            {n:4,text:"拾取范围 +60",apply(p){p.stats.pickupRange+=60;}},
            {n:6,text:"幸运 +25",apply(p){p.stats.luck+=25;}} ] }
];
D.BOND_BY_ID = Object.fromEntries(D.BONDS.map(b=>[b.id,b]));
D.cardTags = c => D.CARD_TAGS[c.id] || [];

/* ---------- 卡牌升华（同名卡每 3 张升 1 级，额外叠加一次效果） ---------- */
D.CARD_MERGE = 3;
D.CARD_MAX_LV = 4;

/* ---------- 遗物（BOSS / 宝箱掉落，最多 3 个） ---------- */
D.RELICS = [
  { id:"r_blood", name:"血之圣杯", rarity:"epic", desc:"击杀回复 1 点生命，吸血 +3%", apply(p){ p.flags.vamp=(p.flags.vamp||0)+1; p.stats.lifesteal+=3; } },
  { id:"r_storm", name:"风暴之眼", rarity:"epic", desc:"攻击速度 +20%，移速 +10", apply(p){ p.stats.attackSpeedPct+=20; p.stats.speed+=10; } },
  { id:"r_bulwark", name:"不破壁垒", rarity:"epic", desc:"护甲 +20，减伤 +8%", apply(p){ p.stats.armor+=20; p.stats.damageReduction+=8; } },
  { id:"r_greed", name:"贪婪王冠", rarity:"rare", desc:"金币 +50%，幸运 +10", apply(p){ p.stats.goldGainPct+=50; p.stats.luck+=10; } },
  { id:"r_orbit", name:"刃之环", rarity:"legend", desc:"获得 2 把环绕飞刃", apply(p){ p.flags.orbit=(p.flags.orbit||0)+2; } },
  { id:"r_meteor", name:"陨星核", rarity:"legend", desc:"击杀时 20% 概率引发小陨石", apply(p){ p.flags.meteorKill=1; } },
  { id:"r_frost", name:"永冻之心", rarity:"epic", desc:"命中减速 45%，减速敌人受到伤害 +15%", apply(p){ p.flags.frost=2; } },
  { id:"r_chain", name:"雷霆之心", rarity:"epic", desc:"击杀时 35% 概率连锁闪电", apply(p){ p.flags.chain=1; p.flags.chainBoost=1; } },
  { id:"r_phoenix", name:"不死鸟羽", rarity:"legend", desc:"每波首次致死伤害免疫，并回复 30% 生命", apply(p){ p.flags.phoenix=(p.flags.phoenix||0)+1; } },
  { id:"r_mirror", name:"镜像护符", rarity:"rare", desc:"闪避 +10%，闪避成功后回复 2 生命", apply(p){ p.stats.dodge+=10; p.flags.mirror=1; } },
  { id:"r_hunter", name:"猎手徽记", rarity:"rare", desc:"对精英与 BOSS 伤害 +25%", apply(p){ p.flags.hunter=1; } },
  { id:"r_time", name:"时之沙漏", rarity:"epic", desc:"冷却缩减 +15%，技能伤害 +10%", apply(p){ p.stats.cooldownPct+=15; p.stats.skillPct=(p.stats.skillPct||0)+10; } }
];
D.RELIC_BY_ID = Object.fromEntries(D.RELICS.map(r=>[r.id,r]));

/* ---------- 永久天赋树（用继承金币购买，永久生效） ---------- */
D.TALENTS = [
  { id:"t_hp",   branch:"生存", name:"坚韧体魄", max:5, cost:120, desc:"每级最大生命 +8" },
  { id:"t_arm",  branch:"生存", name:"铁皮", max:5, cost:140, desc:"每级护甲 +3" },
  { id:"t_regen",branch:"生存", name:"自愈", max:4, cost:180, desc:"每级每秒回复 +0.3" },
  { id:"t_dodge",branch:"生存", name:"身法", max:3, cost:220, desc:"每级闪避 +3%" },
  { id:"t_dmg",  branch:"力量", name:"蛮力", max:6, cost:130, desc:"每级伤害 +3%" },
  { id:"t_as",   branch:"力量", name:"迅捷", max:5, cost:150, desc:"每级攻击速度 +4%" },
  { id:"t_crit", branch:"力量", name:"致命", max:4, cost:200, desc:"每级暴击率 +3%" },
  { id:"t_cdmg", branch:"力量", name:"重击", max:4, cost:200, desc:"每级暴击伤害 +10%" },
  { id:"t_spd",  branch:"技艺", name:"轻装", max:5, cost:110, desc:"每级移速 +5" },
  { id:"t_pick", branch:"技艺", name:"磁力", max:4, cost:120, desc:"每级拾取范围 +20" },
  { id:"t_cdr",  branch:"技艺", name:"冥想", max:4, cost:230, desc:"每级冷却缩减 +3%" },
  { id:"t_range",branch:"技艺", name:"远视", max:3, cost:170, desc:"每级攻击范围 +8%" },
  { id:"t_gold", branch:"财富", name:"贪婪", max:5, cost:150, desc:"每级金币获取 +8%" },
  { id:"t_luck", branch:"财富", name:"幸运星", max:5, cost:180, desc:"每级幸运 +4" },
  { id:"t_xp",   branch:"财富", name:"学识", max:4, cost:160, desc:"每级经验获取 +6%" },
  { id:"t_harv", branch:"财富", name:"收获", max:3, cost:200, desc:"每级每波收获 +2" }
];
/* v10：原来这里有一行 `D.TALENTS.forEach(t=>{ t.max=1; t.desc=t.desc.replace(/^每级/,'单级'); })`，
   把 16 个天赋全部压成单级，导致唯一的长期成长线上限只有约 +21%，玩家永远追不上高波次的敌人成长。
   该限制为调试遗留，已移除，恢复原多级设计。 */
D.TALENT_BY_ID = Object.fromEntries(D.TALENTS.map(t=>[t.id,t]));
D.TALENT_APPLY = {
  t_hp:(p,l)=>{p.stats.maxHp+=8*l;p.hp+=8*l;}, t_arm:(p,l)=>{p.stats.armor+=3*l;},
  t_regen:(p,l)=>{p.stats.hpRegen+=0.3*l;}, t_dodge:(p,l)=>{p.stats.dodge+=3*l;},
  t_dmg:(p,l)=>{p.stats.damagePct+=3*l;}, t_as:(p,l)=>{p.stats.attackSpeedPct+=4*l;},
  t_crit:(p,l)=>{p.stats.critChance+=3*l;}, t_cdmg:(p,l)=>{p.stats.critDamage+=10*l;},
  t_spd:(p,l)=>{p.stats.speed+=5*l;}, t_pick:(p,l)=>{p.stats.pickupRange+=20*l;},
  t_cdr:(p,l)=>{p.stats.cooldownPct+=3*l;}, t_range:(p,l)=>{p.stats.range+=8*l;},
  t_gold:(p,l)=>{p.stats.goldGainPct+=8*l;}, t_luck:(p,l)=>{p.stats.luck+=4*l;},
  t_xp:(p,l)=>{p.stats.xpGainPct+=6*l;}, t_harv:(p,l)=>{p.stats.harvest+=2*l;}
};
D.talentCost = (t,lv) => Math.round(t.cost);

/* ---------- 每日挑战 ---------- */
D.DAILY_MODS = [
  { id:"d_horde", name:"兽潮", desc:"敌人数量 +40%", apply(m){ m.spawnRate*=1.4; } },
  { id:"d_tough", name:"铁皮", desc:"敌人生命 +50%", apply(m){ m.enemyHp*=1.5; } },
  { id:"d_fast",  name:"疾走", desc:"敌人移速 +20%", apply(m){ m.enemySpeed=1.2; } },
  { id:"d_gold",  name:"金雨", desc:"金币 +80%", apply(m){ m.gold*=1.8; } },
  { id:"d_luck",  name:"幸运日", desc:"幸运 +30", apply(m){ m.luck=(m.luck||0)+30; } },
  { id:"d_dmg",   name:"暴戾", desc:"敌人伤害 +30%", apply(m){ m.enemyDamage=(m.enemyDamage||1)*1.3; } },
  { id:"d_fragile",name:"纸糊", desc:"玩家最大生命 -25%", apply(m){ m.playerHpMul=(m.playerHpMul||1)*0.75; } },
  { id:"d_swift", name:"飞奔", desc:"玩家移速 +15%", apply(m){ m.playerSpeed=(m.playerSpeed||0)+15; } }
];
D.DAILY_SEED = (dateStr) => { let h=2166136261; for(let i=0;i<dateStr.length;i++){ h^=dateStr.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; };
D.dailyToday = () => {
  const d=new Date(); const s=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const seed=D.DAILY_SEED(s); const rnd=(n)=>{ let x=seed+n*2654435761; x^=x>>>15; x=Math.imul(x,2246822507); x^=x>>>13; return (x>>>0)/4294967296; };
  const chars=D.CHARACTERS.map(c=>c.id), maps=D.MAPS.map(m=>m.id);
  const char=chars[Math.floor(rnd(1)*chars.length)], map=maps[Math.floor(rnd(2)*maps.length)];
  const mods=[]; const used=new Set();
  for(let i=0;i<3;i++){ let k=Math.floor(rnd(10+i)*D.DAILY_MODS.length); while(used.has(k)) k=(k+1)%D.DAILY_MODS.length; used.add(k); mods.push(D.DAILY_MODS[k]); }
  return { date:s, char, map, mods, seed };
};
/* ---------- 角色专属卡（v3） ---------- */
D.CHAR_CARDS = [
  {id:"cc_ray",char:"ray",name:"剑士的执念",rarity:"epic",type:"stat",desc:"近战伤害 +30%，攻击速度 +12%",apply(p){p.stats.meleePct+=30;p.stats.attackSpeedPct+=12;}},
  {id:"cc_elin",char:"elin",name:"猎风箭袋",rarity:"epic",type:"stat",desc:"远程伤害 +26%，射程 +15%",apply(p){p.stats.rangedPct+=26;p.stats.range+=15;}},
  {id:"cc_luna",char:"luna",name:"元素共鸣",rarity:"epic",type:"stat",desc:"元素伤害 +32%，冷却 -8%",apply(p){p.stats.elementalPct+=32;p.stats.cooldownPct+=8;}},
  {id:"cc_shade",char:"shade",name:"暗影步伐",rarity:"epic",type:"stat",desc:"闪避 +12%，移速 +12%",apply(p){p.stats.dodge+=12;p.stats.speed+=26;}},
  {id:"cc_orlan",char:"orlan",name:"圣盾誓约",rarity:"epic",type:"stat",desc:"护甲 +8，伤害减免 +6%，生命 +25",apply(p){p.stats.armor+=8;p.stats.damageReduction+=6;p.stats.maxHp+=25;}},
  {id:"cc_mo",char:"mo",name:"亡者契约",rarity:"epic",type:"stat",desc:"吸血 +6%，生命回复 +1.2/秒",apply(p){p.stats.lifesteal+=6;p.stats.hpRegen+=1.2;}},
  {id:"cc_kai",char:"kai",name:"巨力挥击",rarity:"epic",type:"stat",desc:"近战伤害 +22%，暴击伤害 +40%",apply(p){p.stats.meleePct+=22;p.stats.critDamage+=40;}},
  {id:"cc_nia",char:"nia",name:"幸运星尘",rarity:"epic",type:"stat",desc:"幸运 +18，拾取范围 +30%",apply(p){p.stats.luck+=18;p.stats.pickupRange+=30;}},
  {id:"cc_gale",char:"gale",name:"疾风连射",rarity:"epic",type:"stat",desc:"攻击速度 +20%，远程伤害 +12%",apply(p){p.stats.attackSpeedPct+=20;p.stats.rangedPct+=12;}},
  {id:"cc_bora",char:"bora",name:"虚空馈赠",rarity:"epic",type:"stat",desc:"金币获取 +25%，经验获取 +15%",apply(p){p.stats.goldGainPct+=25;p.stats.xpGainPct+=15;}}
];
D.CARD_TAGS.cc_ray=["blade"]; D.CARD_TAGS.cc_elin=["wind"]; D.CARD_TAGS.cc_luna=["arcane"]; D.CARD_TAGS.cc_shade=["wind"];
D.CARD_TAGS.cc_orlan=["stone"]; D.CARD_TAGS.cc_mo=["arcane"]; D.CARD_TAGS.cc_kai=["blade"]; D.CARD_TAGS.cc_nia=["fortune"];
D.CARD_TAGS.cc_gale=["wind"]; D.CARD_TAGS.cc_bora=["fortune"];
for(const c of D.CHAR_CARDS) if(!D.CARDS.some(x=>x.id===c.id)) D.CARDS.push(c);

/* ---------- 伤害皮肤（BasicEff/damageSkin 导出） ---------- */
D.DMG_SKINS=[
 {id:"1",name:"原初之刻",rarity:"common",unlock:{type:"default",n:0,label:"初始拥有"},desc:"冒险者最初的伤害数字"},
 {id:"1453",name:"银辉",rarity:"common",unlock:{type:"wave",n:3,label:"最佳波次达到 3"},desc:"冷冽银白，像月光锻出的数字"},
 {id:"88",name:"铁灰",rarity:"common",unlock:{type:"kills",n:100,label:"累计击杀 100"},desc:"枪械金属般的哑光灰"},
 {id:"1001",name:"古铜",rarity:"common",unlock:{type:"gold",n:500,label:"累计金币 500"},desc:"旧金币与黄铜的光泽"},
 {id:"1444",name:"琥珀",rarity:"rare",unlock:{type:"wave",n:5,label:"最佳波次达到 5"},desc:"暖橙琥珀，包裹着微光"},
 {id:"167",name:"黄金",rarity:"rare",unlock:{type:"kills",n:300,label:"累计击杀 300"},desc:"沉甸甸的黄金浮雕"},
 {id:"76",name:"熔岩",rarity:"rare",unlock:{type:"wave",n:10,label:"最佳波次达到 10"},desc:"熔岩裂纹里透出的赤橙"},
 {id:"150",name:"天青",rarity:"rare",unlock:{type:"kills",n:600,label:"累计击杀 600"},desc:"晴空与海面交界的青蓝"},
 {id:"184",name:"青碧",rarity:"rare",unlock:{type:"boss",n:2,label:"击败 BOSS 2 次"},desc:"青绿流光，像深海磷火"},
 {id:"249",name:"蓝宝石",rarity:"rare",unlock:{type:"endless",n:10,label:"无尽模式达到第 10 波"},desc:"深蓝宝石切面"},
 {id:"1368",name:"冰蓝",rarity:"epic",unlock:{type:"daily",n:3,label:"完成每日挑战 3 次"},desc:"薄冰般的浅蓝与白霜"},
 {id:"190",name:"赤红",rarity:"epic",unlock:{type:"wave",n:20,label:"最佳波次达到 20"},desc:"鲜血与烈焰凝成的赤红"},
 {id:"282",name:"紫电",rarity:"epic",unlock:{type:"kills",n:1500,label:"累计击杀 1500"},desc:"紫色电弧缠绕的数字"},
 {id:"1140",name:"幻紫",rarity:"epic",unlock:{type:"ach",n:6,label:"达成 6 项成就"},desc:"梦幻紫晶，边缘泛着霓虹"},
 {id:"80",name:"樱粉",rarity:"epic",unlock:{type:"relic",n:8,label:"收集 8 种遗物"},desc:"柔软樱粉，像花瓣落在数字上"},
 {id:"229",name:"霓虹玫红",rarity:"epic",unlock:{type:"boss",n:5,label:"击败 BOSS 5 次"},desc:"高饱和玫红霓虹"},
 {id:"1380",name:"薄荷",rarity:"epic",unlock:{type:"wave",n:25,label:"最佳波次达到 25"},desc:"清凉薄荷绿"},
 {id:"1428",name:"紫藤",rarity:"epic",unlock:{type:"endless",n:20,label:"无尽模式达到第 20 波"},desc:"淡紫藤萝与暮色"},
 {id:"283",name:"翡翠",rarity:"epic",unlock:{type:"wave",n:15,label:"最佳波次达到 15"},desc:"通透翡翠绿"},
 {id:"216",name:"曜石",rarity:"legend",unlock:{type:"wave",n:30,label:"通关 30 波"},desc:"黑曜石般的深色晶体"},
 {id:"125",name:"暗夜紫",rarity:"legend",unlock:{type:"kills",n:5000,label:"累计击杀 5000"},desc:"深渊紫黑，低调而危险"},
 {id:"106",name:"荧绿",rarity:"legend",unlock:{type:"ach",n:10,label:"达成全部 10 项成就"},desc:"荧光绿，像毒液在发光"},
 {id:"97",name:"雷光",rarity:"legend",unlock:{type:"daily",n:10,label:"完成每日挑战 10 次"},desc:"高压电光般的亮黄"},
 {id:"1459",name:"纯白",rarity:"legend",unlock:{type:"wins",n:3,label:"通关 3 次"},desc:"无瑕的纯白光辉"}
];
D.DMG_SKIN_BY_ID={}; for(const s of D.DMG_SKINS) D.DMG_SKIN_BY_ID[s.id]=s;

/* ---------- 成就（长线目标） ---------- */
D.ACHIEVEMENTS=[
 {id:"a_first",name:"初出茅庐",desc:"完成第 1 局游戏",reward:20,test:s=>(s.runs||0)>=1},
 {id:"a_k100",name:"百人斩",desc:"累计击杀 100 个敌人",reward:30,test:s=>(s.kills||0)>=100},
 {id:"a_k1000",name:"千军破",desc:"累计击杀 1000 个敌人",reward:80,test:s=>(s.kills||0)>=1000},
 {id:"a_w10",name:"十波生存",desc:"在任意地图抵达第 10 波",reward:50,test:s=>Math.max(0,...Object.values(s.bestWave||{}))>=10},
 {id:"a_w20",name:"二十波",desc:"在任意地图抵达第 20 波",reward:100,test:s=>Math.max(0,...Object.values(s.bestWave||{}))>=20},
 {id:"a_clear",name:"通关者",desc:"通关 30 波",reward:150,test:s=>(s.wins||0)>=1},
 {id:"a_end40",name:"无尽旅人",desc:"无尽模式抵达第 40 波",reward:200,test:s=>(s.endlessBest||0)>=40},
 {id:"a_relic6",name:"收藏家",desc:"见过 6 件不同遗物",reward:60,test:s=>Object.keys(s.relicSeen||{}).length>=6},
 {id:"a_talent",name:"天赋投资者",desc:"累计在永久天赋上花费 300 币",reward:80,test:s=>(s.talentSpent||0)>=300},
 {id:"a_daily",name:"每日常客",desc:"完成 5 次每日挑战",reward:70,test:s=>(s.dailyRuns||0)>=5}
];

window.GD2 = { ok:true };
})();
