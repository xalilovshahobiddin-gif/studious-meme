/* Blue Wolf — oʻyin maʼlumotnomasi va formulalar (GDD: docs/blue_wolf/blue_wolf_GDD.md).
   Barcha raqamlar game_config dan keladi (cfg = {kalit: qiymat}). Server ham xuddi shu
   formulalarni hisoblaydi — klient faqat koʻrsatish uchun. */
(function (root) {
  "use strict";

  // group: food — Oziq gʻorida (sigʻim bilan), build — Ustaxona (ombor cheklanmagan), premium — Telegram Stars
  // GDD bo'lim 3: manba (from), sarf (use)
  var RESOURCES = [
    { key: "meat", name: "Goʻsht", short: "Goʻsht", unit: "kg", icon: "meat", group: "food",
      from: ["Ov — ovchilar 1 soatlik ovga chiqadi", "Yovvoyi toʻdalar va PvP oʻljasi", "Vazifa mukofotlari"],
      use: ["Toʻdani boqish — har bir askar kuniga yeydi", "Yangi askar yollash"] },
    { key: "water", name: "Suv", short: "Suv", unit: "", icon: "water", group: "food",
      from: ["Oziq gʻori passiv yigʻadi (darajasi bilan oʻsadi)", "Suv oazisi (v2)"],
      use: ["Toʻdaning ichimligi — yetmasa yurish tezligi −20%"] },
    { key: "herb", name: "Shifobaxsh oʻt", short: "Oʻt", unit: "", icon: "herb", group: "food",
      from: ["Ov — natijaning 10% i oʻt boʻlib keladi", "Oʻt oazisi (v2)"],
      use: ["Shifo gʻorida jarohatlangan boʻrini davolash"] },
    { key: "moonlight", name: "Oy nuri", short: "Oy nuri", unit: "", icon: "moonlight", group: "food", fromLevel: 20,
      from: ["Oziq gʻori passiv ishlab chiqaradi (20+ daraja)", "Oy mehrobi oazisi +40% (v2)", "Bozor (×2 kurs)"],
      use: ["Mifologik boʻrilarni boqish (20+ daraja) — yetmasa jangda CP −15%"] },
    { key: "stone", name: "Tosh", short: "Tosh", unit: "", icon: "stone", group: "build",
      from: ["Ustaxona qoyasi (taqsimotdagi ulush boʻyicha)"],
      use: ["Barcha binolarni kuchaytirish"] },
    { key: "wood", name: "Shox-shabba", short: "Shox", unit: "", icon: "wood", group: "build",
      from: ["Ustaxona qoyasi (taqsimotdagi ulush boʻyicha)"],
      use: ["Oziq gʻori, Ustaxona, Shifo gʻori, Bozor"] },
    { key: "hide", name: "Teri", short: "Teri", unit: "", icon: "hide", group: "build",
      from: ["Ustaxona qoyasi (taqsimotdagi ulush boʻyicha)"],
      use: ["Rol binolari (Jang maydoni, Razvedka, Himoya, Ov soʻqmogʻi)", "Shifo gʻori"] },
    { key: "bone", name: "Suyak", short: "Suyak", unit: "", icon: "bone", group: "build",
      from: ["Ustaxona qoyasi (taqsimotdagi ulush boʻyicha)"],
      use: ["Yangi askar yollash", "Ustaxona va rol binolari"] },
    { key: "moonstone", name: "Oy toshi", short: "Oy toshi", unit: "", icon: "moonstone", group: "premium",
      from: ["Faqat Telegram Stars orqali sotib olinadi"],
      use: ["Tezlashtirish (kuniga koʻpi bilan 25%)", "Ikkinchi navbatni erta ochish, taʼtil, kosmetika"] }
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

  /** Oziq gʻori sigʻimi (har bir oziq resursi uchun alohida). */
  function caveCap(cfg, caveLevel) { return cfg.store_base * Math.pow(cfg.store_growth, Math.max(1, caveLevel) - 1); }

  /** Oziq gʻorining passiv suvi, birlik/soat (0 — gʻor qurilmagan). */
  function waterPerHour(cfg, caveLevel) { return caveLevel > 0 ? cfg.water_passive_base * Math.pow(cfg.water_passive_growth, caveLevel - 1) : 0; }

  /** Bir askarning kunlik suv ehtiyoji. */
  function waterNeed(cfg, L) { return cfg.water_need_base + cfg.water_need_growth * (L - 1); }

  /** Ustaxonaning jami ishlab chiqarishi, birlik/soat (0 — qurilmagan). */
  function workshopPerHour(cfg, wsLevel) { return wsLevel > 0 ? cfg.prod_base * Math.pow(cfg.prod_growth, wsLevel - 1) : 0; }

  var BUILD = ["stone", "wood", "hide", "bone"];

  /** Ustaxona buferi sigʻimi: soatlik × workshop_buffer_h × ulush (oflaynda × offline_store_mult). */
  function bufferCap(cfg, wsLevel, share, offline) {
    return workshopPerHour(cfg, wsLevel) * cfg.workshop_buffer_h * share / 100 * (offline ? cfg.offline_store_mult : 1);
  }

  // Oʻsish sigʻimgacha; sigʻimdan oshib qolgan qiymat (masalan oflayn 2× bufer) kesilmaydi
  function grow(v, d, cap) {
    if (d >= 0) return v >= cap ? v : Math.min(cap, v + d);
    return Math.max(0, v + d);
  }

  /**
   * Resurs hisobi (texnik spec 4.1, timestamp accrual) — server EconomyService bilan bir xil.
   * e: { res:{meat,water,moonlight,…}, buf:{stone,wood,hide,bone}, alloc:{…}, level, cave, workshop, army,
   *      last_tick, last_seen } (vaqtlar — ms). t1 gacha hisoblangan yangi nusxani qaytaradi.
   * Oraliqlar: onlayn → oflayn (last_seen + offline_after_min), goʻsht tugagan payt (ochlik).
   */
  function advance(cfg, e, t1) {
    var o = JSON.parse(JSON.stringify(e));
    var t = o.last_tick;
    if (!(t1 > t)) return o;
    var L = o.level, army = o.army || 0;
    var offAt = o.last_seen + cfg.offline_after_min * 60000;
    var meatH = need(cfg, L) * army / 24;
    var waterNetH = waterPerHour(cfg, o.cave) - waterNeed(cfg, L) * army / 24;
    var moonOn = L >= cfg.moonlight_need_level;
    var moonNetH = moonOn ? (o.cave > 0 ? cfg.moonlight_passive_base * army : 0) - cfg.moonlight_need * army / 24 : 0;
    var prodH = workshopPerHour(cfg, o.workshop);

    for (var guard = 0; t < t1 && guard < 8; guard++) {
      var offline = t >= offAt;
      var end = offline ? t1 : Math.min(t1, offAt);
      var starve = false;
      if (o.res.meat > 0 && meatH > 0) {
        var tz = t + o.res.meat / meatH * 3600000;
        if (tz <= end) { end = tz; starve = true; }
      }
      var h = (end - t) / 3600000;
      var hungry = army > 0 && o.res.meat <= 0;
      var rate = prodH * (offline ? cfg.offline_prod_rate : 1) * (hungry ? 1 - cfg.hunger_prod_penalty : 1);
      BUILD.forEach(function (k) {
        var share = o.alloc[k] || 0;
        o.buf[k] = grow(o.buf[k] || 0, rate * share / 100 * h, bufferCap(cfg, o.workshop, share, offline));
      });
      o.res.meat = starve ? 0 : Math.max(0, o.res.meat - meatH * h);
      var cap = caveCap(cfg, o.cave) * (offline ? cfg.offline_store_mult : 1);
      o.res.water = grow(o.res.water || 0, waterNetH * h, cap);
      if (moonOn) o.res.moonlight = grow(o.res.moonlight || 0, moonNetH * h, cap);
      t = end;
    }
    o.last_tick = t1;
    return o;
  }

  /** Ustaxona buferini omborga oʻtkazish. Qaytaradi: {econ, got:{stone,…}} */
  function collect(e) {
    var o = JSON.parse(JSON.stringify(e)), got = {};
    BUILD.forEach(function (k) {
      got[k] = Math.floor(o.buf[k] || 0);
      o.res[k] = (o.res[k] || 0) + got[k];
      o.buf[k] = (o.buf[k] || 0) - got[k];
    });
    return { econ: o, got: got };
  }

  /** Taqsimot toʻgʻrimi: 4 ta butun son 0..100, yigʻindisi 100. */
  function validAlloc(a) {
    var sum = 0;
    for (var i = 0; i < BUILD.length; i++) {
      var v = a[BUILD[i]];
      if (typeof v !== "number" || v % 1 !== 0 || v < 0 || v > 100) return false;
      sum += v;
    }
    return sum === 100;
  }

  /** Ixcham raqam: 950 · 12,4K · 1,2M */
  function fmtShort(n) {
    if (n == null || isNaN(n)) return "—";
    var v = Math.floor(n);
    if (v < 10000) return fmt(v);
    if (v < 1e6) return (v / 1000).toFixed(v < 1e5 ? 1 : 0).replace(".", ",").replace(",0", "") + "K";
    return (v / 1e6).toFixed(v < 1e7 ? 1 : 0).replace(".", ",").replace(",0", "") + "M";
  }

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
    need: need, hunterYield: hunterYield, caveCap: caveCap, waterPerHour: waterPerHour, waterNeed: waterNeed,
    workshopPerHour: workshopPerHour, bufferCap: bufferCap, advance: advance, collect: collect, validAlloc: validAlloc,
    BUILD: BUILD, fmt: fmt, fmtShort: fmtShort, fmtMinutes: fmtMinutes
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BWGame = api;
})(this);
