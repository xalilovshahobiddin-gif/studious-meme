/* Blue Wolf — oʻyin maʼlumotnomasi va formulalar (GDD: docs/blue_wolf/blue_wolf_GDD.md).
   Barcha raqamlar game_config dan keladi (cfg = {kalit: qiymat}). Server ham xuddi shu
   formulalarni hisoblaydi — klient faqat koʻrsatish uchun. */
(function (root) {
  "use strict";

  var RESOURCES = [
    { key: "meat", name: "Goʻsht", icon: "meat" },
    { key: "water", name: "Suv", icon: "water" },
    { key: "herb", name: "Shifobaxsh oʻt", icon: "herb" },
    { key: "stone", name: "Tosh", icon: "stone" },
    { key: "wood", name: "Shox-shabba", icon: "wood" },
    { key: "hide", name: "Teri", icon: "hide" },
    { key: "bone", name: "Suyak", icon: "bone" },
    { key: "moonlight", name: "Oy nuri", icon: "moonlight", fromLevel: 20 },
    { key: "moonstone", name: "Oy toshi", icon: "moonstone" }
  ];

  // GDD bo'lim 5. cost: bazaviy narx kalitlari (1→2 daraja), coef: rol binosi koeffitsienti
  var BUILDINGS = {
    den:           { name: "In", icon: "den", unlock: 1, auto: true, about: "Asosiy makon. Darajasi oʻyinchi darajasiga teng, mashqni har darajada 1% tezlashtiradi." },
    food_cave:     { name: "Oziq gʻori", icon: "cave", unlock: 2, time: "time_coef_food_cave", cost: { stone: "cost_food_cave_stone", wood: "cost_food_cave_wood" }, about: "Goʻsht, suv, shifobaxsh oʻt va oy nurini saqlaydi; passiv suv beradi; reyddan himoya." },
    workshop:      { name: "Ustaxona qoyasi", icon: "workshop", unlock: 2, time: "time_coef_workshop", cost: { stone: "cost_workshop_stone", wood: "cost_workshop_wood", bone: "cost_workshop_bone" }, about: "Tosh, shox-shabba, teri va suyak ishlab chiqaradi. Ishlab chiqarish buferga tushadi — yigʻib olish kerak." },
    hunt_path:     { name: "Ov soʻqmogʻi", icon: "track", unlock: 3, time: "time_coef_hunt_path", role: "hunt_path", about: "Ovchilarni tayyorlaydi va ularning tierini ochadi." },
    battle_ground: { name: "Jang maydoni", icon: "swords", unlock: 4, time: "time_coef_battle_ground", role: "battle_ground", about: "Hujumchilarni tayyorlaydi va ularning tierini ochadi." },
    scout_rock:    { name: "Razvedka qoyasi", icon: "eye", unlock: 4, time: "time_coef_scout_rock", role: "scout_rock", about: "Razvedkachilarni tayyorlaydi va ularning tierini ochadi." },
    defense_wall:  { name: "Himoya devori", icon: "wall", unlock: 4, time: "time_coef_defense_wall", role: "defense_wall", about: "Himoyachilarni tayyorlaydi; inda himoya EP siga bonus beradi." },
    hospital:      { name: "Shifo gʻori", icon: "hospital", unlock: 6, time: "time_coef_hospital", cost: { wood: "cost_hospital_wood", hide: "cost_hospital_hide", stone: "cost_hospital_stone" }, about: "Jarohatlangan boʻrilarni davolaydi (shifobaxsh oʻt evaziga)." },
    market:        { name: "Bozor", icon: "market", unlock: 9, time: "time_coef_market", cost: { stone: "cost_market_stone", wood: "cost_market_wood" }, about: "Resurslarni almashtirish; kurs va soliq darajaga qarab yaxshilanadi." }
  };
  var BUILDING_ORDER = ["den", "food_cave", "workshop", "hunt_path", "battle_ground", "scout_rock", "defense_wall", "hospital", "market"];

  var ROLES = [
    { key: "scout", name: "Razvedkachi", icon: "eye", building: "scout_rock" },
    { key: "attacker", name: "Hujumchi", icon: "sword", building: "battle_ground" },
    { key: "defender", name: "Himoyachi", icon: "shield", building: "defense_wall" },
    { key: "hunter", name: "Ovchi", icon: "paw", building: "hunt_path" }
  ];
  var TIERS = ["Yosh", "Tajribali", "Urushchi", "Veteran", "Elita", "Afsonaviy"];

  function stage(cfg, L) {
    if (L <= 4) return cfg.stage_early;
    if (L <= cfg.stage_mid_level) return cfg.stage_mid;
    if (L <= cfg.stage_late_level) return cfg.stage_normal;
    return cfg.stage_late;
  }

  /** L darajaga koʻtarilish narxi (XP), 10 ga yaxlitlangan — Darajalar varagʻi bilan bir xil. */
  function levelCost(cfg, L) {
    if (L <= 1) return 0;
    return Math.round(cfg.xp_base * Math.pow(cfg.xp_growth, L - 2) * stage(cfg, L) / 10) * 10;
  }

  /** L darajaga yetish uchun jami XP. */
  function totalXp(cfg, L) {
    var sum = 0;
    for (var i = 2; i <= L; i++) sum += levelCost(cfg, i);
    return sum;
  }

  /** XP boʻyicha joriy daraja ichidagi progress. */
  function xpProgress(cfg, level, xp) {
    var from = totalXp(cfg, level);
    if (level >= 25) return { into: xp - from, need: 0, ratio: 1 };
    var to = totalXp(cfg, level + 1);
    return { into: xp - from, need: to - from, ratio: Math.max(0, Math.min(1, (xp - from) / (to - from))) };
  }

  /** Binoning L darajasi narxi: {stone, wood, hide, bone}. 1-daraja bepul. */
  function buildingCost(cfg, type, L) {
    var b = BUILDINGS[type];
    if (!b || b.auto || L <= 1) return {};
    var mult = Math.pow(cfg.cost_growth, L - 2) * stage(cfg, L);
    var base = {};
    if (b.role) {
      var coef = cfg["cost_coef_" + b.role];
      base = { stone: cfg.cost_role_stone * coef, bone: cfg.cost_role_bone * coef, hide: cfg.cost_role_hide * coef };
    } else {
      Object.keys(b.cost).forEach(function (res) { base[res] = cfg[b.cost[res]]; });
    }
    var out = {};
    Object.keys(base).forEach(function (res) { out[res] = Math.round(base[res] * mult); });
    return out;
  }

  /** Qurilish vaqti, daqiqa. */
  function buildingTime(cfg, type, L) {
    var b = BUILDINGS[type];
    if (!b || b.auto || L <= 1) return 0;
    return cfg.build_time_base_min * cfg[b.time] * Math.pow(cfg.time_growth, L - 2) * stage(cfg, L);
  }

  function maxTier(cfg, level, buildingLevel) {
    var byLevel = Math.floor(level / cfg.tier_step_level);
    var byBuilding = buildingLevel == null ? byLevel : Math.floor(buildingLevel / cfg.tier_step_building);
    return Math.max(1, Math.min(6, byLevel, byBuilding));
  }

  function armyCap(cfg, L) {
    if (L < cfg.pack_unlock_level) return cfg.pack_solo_size;
    return Math.round(cfg.pack_base * Math.pow(cfg.pack_growth, L - cfg.pack_unlock_level));
  }

  /** Bir askarning kunlik goʻsht ehtiyoji, kg. */
  function need(cfg, L) { return cfg.need_base + cfg.need_growth * (L - 1); }

  /** Bitta ovchining unumi, kg/soat. */
  function hunterYield(cfg, L, tier) { return cfg.hunter_yield_mult * need(cfg, L) * (1 + cfg.hunter_tier_bonus * ((tier || 1) - 1)); }

  function fmt(n) {
    if (n == null || isNaN(n)) return "—";
    var v = Math.floor(n);
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") + " mln";
    return v.toLocaleString("uz-UZ").replace(/,/g, " ");
  }

  function fmtMinutes(min) {
    if (min <= 0) return "darhol";
    if (min < 1) return Math.round(min * 60) + " soniya";
    if (min < 60) return Math.round(min) + " daqiqa";
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + " soat" + (m ? " " + m + " daq" : "");
  }

  var api = {
    RESOURCES: RESOURCES, BUILDINGS: BUILDINGS, BUILDING_ORDER: BUILDING_ORDER, ROLES: ROLES, TIERS: TIERS,
    stage: stage, levelCost: levelCost, totalXp: totalXp, xpProgress: xpProgress,
    buildingCost: buildingCost, buildingTime: buildingTime, maxTier: maxTier, armyCap: armyCap,
    need: need, hunterYield: hunterYield, fmt: fmt, fmtMinutes: fmtMinutes
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BWGame = api;
})(this);
