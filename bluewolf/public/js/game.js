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

  // Excel “Oziqlanish”: daraja → asosiy oʻlja [nomi, kg] (server: App\Support\Formula::PREY)
  var PREY = [null, ["Kemiruvchi", 0.5], ["Qush", 1], ["Quyon", 2], ["Sugʻur", 8], ["Jayron", 25], ["Jayron", 25],
    ["Yovvoyi choʻchqa", 50], ["Yovvoyi choʻchqa", 50], ["Kiyik", 60], ["Kiyik", 60], ["Bugʻu", 100], ["Bugʻu", 100],
    ["Arxar", 120], ["Arxar", 120], ["Yovvoyi ot", 250], ["Yovvoyi ot", 250], ["Los", 300], ["Los", 300], ["Bizon", 500],
    ["Mamont bolasi", 800], ["Mamont", 1200], ["Ruh oʻljasi", 400], ["Ruh oʻljasi", 400], ["Ruh oʻljasi", 400], ["Ruh oʻljasi", 400]];

  // GDD bo'lim 1: boʻri turlari
  var WOLVES = [null, "Honsyu boʻrisi", "Efiopiya boʻrisi", "Arab boʻrisi", "Hind boʻrisi", "Qizil boʻri", "Italyan boʻrisi",
    "Meksika boʻrisi", "Sharqiy boʻri", "Iberiya boʻrisi", "Dasht boʻrisi", "Himolay boʻrisi", "Ezo boʻrisi", "Tibet boʻrisi",
    "Arktika boʻrisi", "Buyuk tekislik boʻrisi", "Yevroosiyo kulrang boʻrisi", "Tundra boʻrisi", "Alyaska ichki boʻrisi",
    "Makkenzi vodiysi boʻrisi", "Beringiya boʻrisi", "Dahshatli boʻri", "Amarok", "Geri va Freki", "Fenrir", "Koʻk Boʻri"];

  // GDD bo'lim 2: ochilish jadvali (MVP qismi)
  var UNLOCKS = {
    2: ["Oziq gʻori", "Ustaxona qoyasi"], 3: ["Ov soʻqmogʻi", "Birinchi ovchi", "Quyon ovi"],
    4: ["Toʻda — qoʻshin 10 askar", "Jang maydoni, Razvedka qoyasi, Himoya devori", "Yolgʻiz ov yopiladi — endi toʻda bilan ov"],
    5: ["Yirik oʻlja — jayron (kamida 2 boʻri)"], 6: ["Shifo gʻori"], 7: ["Haqiqiy oʻyinchilarga hujum"], 8: ["2-tier askarlar"],
    9: ["Bozor"], 10: ["Ikkinchi qurilish navbati"], 12: ["3-tier askarlar"], 16: ["4-tier askarlar"], 20: ["5-tier askarlar", "Oy nuri"], 24: ["6-tier askarlar"]
  };

  /** Rol binosining askar sigʻimi. */
  function roleCap(cfg, L) { return cfg.role_cap_base * Math.pow(cfg.role_cap_growth, L - 1); }

  /** Bitta yangi askar narxi {meat, bone}: har tierda × tier_coef². */
  function trainCost(cfg, tier) {
    var m = Math.pow(cfg.tier_coef, 2 * (tier - 1));
    return { meat: Math.round(cfg.train_meat_base * m), bone: Math.round(cfg.train_bone_base * m) };
  }

  /** Bitta askar mashqi, soniya: tier vaqti × MIN(5, bino jazosi × toʻlganlik) ÷ (mashq tezligi × In koeff.) */
  function trainSeconds(cfg, tier, L, bLevel, armyTotal, roleTotal) {
    var cap = armyCap(cfg, L), fill = cap > 0 ? armyTotal / cap : 1;
    var occupancy = Math.max(0.5, Math.pow(fill / 0.6, cfg.occupancy_exp));
    var penalty = Math.min(cfg.role_cap_penalty_max, Math.max(1, Math.pow(roleTotal / roleCap(cfg, bLevel), cfg.role_cap_penalty_exp)));
    var speed = (1 + cfg.train_speed_per_level * (bLevel - 1)) * (1 + cfg.den_speed_coef * (L - 1));
    return cfg.train_time_min * Math.pow(cfg.tier_coef, tier - 1) * Math.min(cfg.train_coef_max, penalty * occupancy) / speed * 60;
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  /* ---- Ov xaritasi (GDD bo'lim 4 “Ov xaritasi”). Server: App\Support\Formula — natija bir xil. ---- */

  /** 32-bit butun koʻpaytma (Math.imul) — PHP bilan bir xil. */
  var imul = Math.imul;

  /** mulberry32: tez, deterministik tasodifiy sonlar [0, 1). */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = imul(a ^ (a >>> 15), 1 | a) >>> 0;
      t = ((t + imul(t ^ (t >>> 7), 61 | t)) ^ t) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Ov xaritasi davri: har hunt_board_refresh_h soatda yangisi. */
  function huntWindow(cfg, nowMs) { return Math.floor(nowMs / (cfg.hunt_board_refresh_h * 3600000)); }

  /** Oʻyinchi + davr → urugʻ (har oʻyinchida har xil kartalar). */
  function huntSeed(playerId, window) { return (imul(playerId + 1, 2654435761 | 0) ^ imul(window + 7, 40503)) >>> 0; }

  /** Tavsiya etilgan ovchilar soni (GDD bo'lim 6: qoʻshinning 15%, kamida 1). */
  function huntersRec(cfg, L) { return Math.max(1, Math.round(armyCap(cfg, L) * cfg.share_hunter)); }

  function round1(x) { return Math.round(x * 10) / 10; }

  /**
   * 9 ta ov kartasi: 3 yaqin (xavfsiz), 3 oʻrta, 3 uzoq (xavfli, oʻlja koʻproq).
   * Vaqt boʻyicha (keyin poda hajmi boʻyicha) oʻsish tartibida; slot = tartib raqami.
   */
  function huntBoard(cfg, playerId, L, window) {
    var r = rng(huntSeed(playerId, window)), cards = [];
    var bands = [[cfg.hunt_km_min, cfg.hunt_km_near_max], [cfg.hunt_km_near_max, cfg.hunt_km_mid_max], [cfg.hunt_km_mid_max, cfg.hunt_km_far_max]];
    var bonus = [0, cfg.hunt_mid_bonus, cfg.hunt_far_bonus];
    var injury = [0, cfg.hunt_mid_injury, cfg.hunt_far_injury];
    var death = [0, cfg.hunt_mid_death, cfg.hunt_far_death];
    for (var i = 0; i < 9; i++) {
      var band = Math.floor(i / 3), km = round1(bands[band][0] + r() * (bands[band][1] - bands[band][0]));
      var minutes = Math.round(cfg.hunt_base_min + 2 * km / cfg.hunt_speed_kmh * 60);
      var preyLevel = Math.max(1, Math.min(25, L - 1 + band)), prey = PREY[preyLevel];
      var base = huntersRec(cfg, L) * hunterYield(cfg, L, 1) * minutes / 60 * (1 + bonus[band]);
      var count = Math.max(1, Math.round(base * (cfg.hunt_herd_min + r() * cfg.hunt_herd_spread) / prey[1]));
      cards.push({ band: band, prey: prey[0], prey_kg: prey[1], count: count, herd_kg: round2(count * prey[1]), km: km, minutes: minutes,
        bonus: bonus[band], injury: injury[band], death: death[band], min_pack: Math.max(1, Math.ceil(prey[1] / cfg.prey_kg_per_wolf)) });
    }
    cards.sort(function (a, b) { return a.minutes - b.minutes || a.herd_kg - b.herd_kg || a.km - b.km; });
    cards.forEach(function (c, i) {
      c.slot = i;
      // Kam → koʻp: keyingi kartadagi poda oldingisidan kichik boʻlmaydi
      var prev = cards[i - 1];
      if (prev && c.herd_kg < prev.herd_kg) { c.count = Math.ceil(prev.herd_kg / c.prey_kg - 1e-9); c.herd_kg = round2(c.count * c.prey_kg); }
    });
    return cards;
  }

  /** Kartadagi ov natijasi. payload: {rol: {tier: soni}}. Goʻsht podadan oshmaydi. */
  function huntResult(cfg, L, card, payload) {
    var kg = 0, sent = 0;
    Object.keys(payload).forEach(function (role) {
      Object.keys(payload[role]).forEach(function (tier) {
        var q = payload[role][tier];
        sent += q;
        if (role === "hunter") kg += q * hunterYield(cfg, L, +tier) * card.minutes / 60 * (1 + card.bonus);
      });
    });
    var penalty = sent < card.min_pack;
    if (penalty) kg *= cfg.hunt_small_party_penalty;
    kg = Math.min(kg, card.herd_kg);
    return { meat: round2(kg), herb: round2(kg * cfg.hunt_herb_share), xp: round2(kg * cfg.xp_hunt_coef), min_pack: card.min_pack, sent: sent, penalty: penalty };
  }

  /* ---- Vazifalar (GDD bo'lim 14). Server: App\Support\QuestFormula — natija bir xil. ---- */

  // metric — qaysi harakat sanaladi; t — davr boʻyicha maqsad (d kundalik, w haftalik, m oylik)
  var QUESTS = [
    { key: "hunt", metric: "hunt", minL: 1, title: "Ovchi", desc: "{n} marta ovga chiq", t: function () { return { d: 3, w: 20, m: 70 }; } },
    { key: "meat", metric: "meat", minL: 1, title: "Goʻsht zaxirasi", desc: "Ovdan {n} kg goʻsht keltir",
      t: function (cfg, L) { var D = dailyMeat(cfg, L); return { d: Math.ceil(D * 0.5), w: Math.ceil(D * 3), m: Math.ceil(D * 12) }; } },
    { key: "build", metric: "build", minL: 2, title: "Quruvchi", desc: "{n} marta binoni kuchaytir", t: function () { return { d: 1, w: 4, m: 12 }; } },
    { key: "collect", metric: "collect", minL: 2, title: "Yigʻuvchi", desc: "Ustaxona buferini {n} marta yigʻ", t: function () { return { d: 2, w: 10, m: 35 }; } },
    { key: "far", metric: "hunt_far", minL: 3, title: "Uzoq yoʻl", desc: "Oʻrta yoki uzoq kartada {n} marta ovla", t: function () { return { d: 1, w: 5, m: 15 }; } },
    { key: "train", metric: "train", minL: 4, title: "Murabbiy", desc: "{n} ta askar tayyorla",
      t: function (cfg, L) { var c = armyCap(cfg, L); return { d: Math.max(1, Math.round(c * 0.1)), w: Math.max(2, Math.round(c * 0.5)), m: Math.max(5, Math.round(c * 1.5)) }; } },
    { key: "login", metric: "login", minL: 1, title: "Sodiq boʻri", desc: "{n} kun oʻyinga kir", t: function () { return { w: 5, m: 20 }; } }
  ];
  var PERIOD_SALT = { d: 1, w: 2, m: 3 };

  /** Toʻdaning kunlik goʻsht ehtiyoji (toʻliq qoʻshin bilan). */
  function dailyMeat(cfg, L) { return need(cfg, L) * armyCap(cfg, L); }

  /** Kunlik ishlab chiqarish (Ustaxona = oʻyinchi darajasi) — mukofot byudjeti asosi. */
  function dailyProd(cfg, L) { return workshopPerHour(cfg, L) * 24; }

  /** Davr kalitlari va tugash vaqti (UTC + quest_tz_offset_h). d — kun, w — hafta (dushanbadan), m — oy. */
  function questPeriod(cfg, period, nowMs) {
    var off = cfg.quest_tz_offset_h * 3600000, day = Math.floor((nowMs + off) / 86400000);
    if (period === "d") return { key: day, ends_at: (day + 1) * 86400000 - off };
    if (period === "w") { var w = Math.floor((day + 3) / 7); return { key: w, ends_at: ((w + 1) * 7 - 3) * 86400000 - off }; }
    var d = new Date(nowMs + off), y = d.getUTCFullYear(), mo = d.getUTCMonth();
    return { key: y * 12 + mo, ends_at: Date.UTC(y, mo + 1, 1) - off };
  }

  /** Mukofot: ulush × kunlik ishlab chiqarish (qurilish resurslari 40/30/15/15) + goʻsht. Faqat resurs. */
  function questReward(cfg, L, share) {
    var P = dailyProd(cfg, L) * share, out = {};
    var parts = { stone: 0.4, wood: 0.3, hide: 0.15, bone: 0.15 };
    Object.keys(parts).forEach(function (k) { var v = Math.round(P * parts[k]); if (v > 0) out[k] = v; });
    var meat = Math.round(share * cfg.quest_meat_ratio * dailyMeat(cfg, L));
    if (meat > 0) out.meat = meat;
    return out;
  }

  /** Davr vazifalari: daraja boʻyicha ochiqlaridan oʻyinchi + davr urugʻi bilan tanlanadi. */
  function questsFor(cfg, playerId, L, period, key) {
    var count = { d: cfg.quest_daily_count, w: cfg.quest_weekly_count, m: cfg.quest_monthly_count }[period];
    var cap = { d: cfg.quest_daily_cap, w: cfg.quest_weekly_cap, m: cfg.quest_monthly_cap }[period];
    var pool = QUESTS.filter(function (q) { return L >= q.minL && q.t(cfg, L)[period] != null; });
    var r = rng((imul(playerId + 1, 2246822519 | 0) ^ imul(key * 4 + PERIOD_SALT[period], 3266489917 | 0)) >>> 0);
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    return pool.slice(0, count).sort(function (a, b) { return QUESTS.indexOf(a) - QUESTS.indexOf(b); }).map(function (q) {
      var n = q.t(cfg, L)[period];
      return { key: q.key, metric: q.metric, title: q.title, desc: q.desc.replace("{n}", n), target: n, reward: questReward(cfg, L, cap / count) };
    });
  }

  /** Kun kombosi koeffitsienti: ketma-ket n-kun → 1 + qadam × (min(n, maks) − 1). */
  function comboMult(cfg, streak) { return 1 + cfg.quest_combo_step * (Math.min(Math.max(streak, 1), cfg.quest_combo_max_days) - 1); }

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
    workshopPerHour: workshopPerHour, PREY: PREY, WOLVES: WOLVES, UNLOCKS: UNLOCKS, roleCap: roleCap,
    trainCost: trainCost, trainSeconds: trainSeconds, huntResult: huntResult, huntBoard: huntBoard, huntWindow: huntWindow,
    huntSeed: huntSeed, huntersRec: huntersRec, rng: rng, QUESTS: QUESTS, questsFor: questsFor, questReward: questReward,
    questPeriod: questPeriod, comboMult: comboMult, dailyProd: dailyProd, dailyMeat: dailyMeat, bufferCap: bufferCap, advance: advance, collect: collect, validAlloc: validAlloc,
    BUILD: BUILD, fmt: fmt, fmtShort: fmtShort, fmtMinutes: fmtMinutes
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BWGame = api;
})(this);
