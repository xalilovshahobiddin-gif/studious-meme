/* Blue Wolf — brauzer ichidagi demo server.
 * src/*.php dagi oʻyin mantiqining JavaScript nusxasi: API soʻrovlarini (method, path, body)
 * qabul qilib, xuddi PHP server kabi { ok, data, state } javob qaytaradi. Holat localStorage da.
 * Balans raqamlari va jadvallar demo-data.js dan (sql/ va data/ fayllaridan eksport qilingan).
 * Faqat bitta oʻyinchi + NPC toʻdalar. Server mantiqi oʻzgarsa, shu fayl ham yangilanadi.
 */
(function () {
  "use strict";

  var D = window.BW_DEMO_DATA;
  var STORE = "bw_demo_v1";
  var ROLES = ["scout", "attacker", "defender", "hunter"];
  var TIERS = 6;
  var BUILDINGS = ["den", "food_cave", "workshop", "scout_rock", "battle_ground", "defense_wall", "hunt_path", "hospital", "market"];
  var ROLE_BUILDING = { scout: "scout_rock", attacker: "battle_ground", defender: "defense_wall", hunter: "hunt_path" };
  var BEATS = { defender: "attacker", attacker: "scout", scout: "defender" };
  var WS = ["stone", "wood", "hide", "bone"];
  var RES = ["meat", "water", "herb", "stone", "wood", "hide", "bone"];
  var LOOT_RES = ["meat", "stone", "wood", "hide", "bone"];
  var V2_BUILDINGS = ["market"];
  var HTTP = { UNAUTHORIZED: 401, NOT_FOUND: 404, QUEUE_BUSY: 409, PAIR_LIMIT: 429, SPEEDUP_CAP: 429, COOLDOWN: 429, NOT_IN_MVP: 501 };
  var TUTORIAL_NAME = "Mashq boʻrisi";
  var ADJ = ["Kulrang", "Qora", "Oq", "Choʻl", "Togʻ", "Tun", "Qoya", "Dasht", "Yovvoyi", "Sovuq", "Qizil", "Kumush"];
  var NOUN = ["Toʻda", "Panja", "Tish", "Soya", "Shamol", "Izquvar", "Yirtqich", "Uvlovchi", "Qoʻriqchi", "Daydi"];

  var db = null;

  function ApiError(code, message, details) { this.code = code; this.message = message || code; this.details = details || {}; }

  // ================================================================ konfig va vaqt

  function C(k) { if (!(k in D.config)) throw new Error("game_config kaliti topilmadi: " + k); return D.config[k]; }
  function CI(k) { return Math.round(C(k)); }
  function levelRow(l) { var n = Object.keys(D.levels).length; return D.levels[Math.max(1, Math.min(n, l))]; }
  function nowS() { return Math.floor(Date.now() / 1000) + (db ? db.offset : 0); }
  function iso(s) { return s == null ? null : new Date(s * 1000).toISOString().replace(".000Z", "Z"); }
  function rnd() { return Math.random(); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function randInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function round2(x) { return Math.round(x * 100) / 100; }

  // ================================================================ formulalar (src/F.php)

  var F = {
    stage: function (l) {
      if (l <= CI("pack_unlock_level")) return C("stage_early");
      if (l <= CI("stage_mid_level")) return C("stage_mid");
      if (l <= CI("stage_late_level")) return 1.0;
      return C("stage_late");
    },
    baseCost: function (type) {
      switch (type) {
        case "food_cave": return { stone: C("bld_food_cave_stone"), wood: C("bld_food_cave_wood") };
        case "workshop": return { stone: C("bld_workshop_stone"), wood: C("bld_workshop_wood"), bone: C("bld_workshop_bone") };
        case "scout_rock": case "battle_ground": case "defense_wall": case "hunt_path":
          var k = C("bld_" + type + "_coef");
          return { stone: C("bld_field_stone") * k, bone: C("bld_field_bone") * k, meat: C("bld_field_meat") * k };
        case "hospital": return { wood: C("bld_hospital_wood"), meat: C("bld_hospital_meat"), stone: C("bld_hospital_stone") };
        case "market": return { stone: C("bld_market_stone"), wood: C("bld_market_wood") };
      }
      throw new ApiError("BAD_REQUEST", "Nomaʼlum bino");
    },
    buildingCost: function (type, to) {
      var m = Math.pow(C("cost_growth"), to - 2) * F.stage(to), base = F.baseCost(type), out = {};
      Object.keys(base).forEach(function (k) { out[k] = Math.round(base[k] * m); });
      return out;
    },
    buildingTime: function (type, to) {
      return Math.round(C("build_time_base_min") * C("time_" + type) * Math.pow(C("time_growth"), to - 2) * F.stage(to) * 60);
    },
    foodCap: function (l) { return C("store_base") * Math.pow(C("store_growth"), l - 1); },
    protection: function (l) { return Math.min(C("protect_max"), C("protect_base") + C("protect_growth") * (l - 1)); },
    waterRate: function (l) { return C("water_base") * Math.pow(C("water_growth"), l - 1); },
    workshopRate: function (l) { return C("prod_base") * Math.pow(C("prod_growth"), l - 1); },
    workshopCap: function (l) { return F.workshopRate(l) * C("workshop_store_hours"); },
    workshopSlots: function (l) { return CI("workshop_slot_base") + Math.floor(l / 3); },
    roleCap: function (l) { return C("role_cap_base") * Math.pow(C("role_cap_growth"), l - 1); },
    trainSpeed: function (l) { return 1 + C("train_speed_bonus") * (l - 1); },
    denCoef: function (l) { return 1 + C("den_speed_coef") * (l - 1); },
    healCap: function (l) { return Math.floor(C("heal_cap_base") + C("heal_cap_growth") * (l - 1)); },
    healTime: function (l) { return Math.round(C("heal_time_min") * 60 / (1 + C("heal_speed_growth") * (l - 1))); },
    armyCap: function (l) { return levelRow(l).army; },
    meatNeed: function (l) { return C("need_base") + C("need_growth") * (l - 1); },
    xpTotal: function (l) { return levelRow(l).xp_total; },
    roleUnlock: function (role) { return role === "hunter" ? CI("role_hunter_unlock") : CI("pack_unlock_level"); },
    maxTier: function (role, level, bl) {
      if (level < F.roleUnlock(role)) return 0;
      var t = Math.min(TIERS, Math.floor(level / CI("tier_step_level")), Math.floor(bl / CI("tier_step_building")));
      return Math.max(1, t);
    },
    tierCp: function (role, tier, alpha) {
      var base = C("role_" + role + "_power") * C("cp_w_power") + C("role_" + role + "_speed") * C("cp_w_speed") + C("role_" + role + "_hp") * C("cp_w_hp");
      return base * Math.pow(C("tier_coef"), tier - 1) * (1 + C("alpha_bonus") * alpha);
    },
    trainCost: function (tier) {
      var m = Math.pow(C("tier_coef"), 2 * (tier - 1));
      return { meat: Math.round(C("train_meat_base") * m), bone: Math.round(C("train_bone_base") * m) };
    },
    trainTime: function (tier) { return C("train_time_min") * 60 * Math.pow(C("tier_coef"), tier - 1); },
    occupancyCoef: function (occ) {
      var k = Math.pow(occ / C("occupancy_normal"), C("occupancy_exp"));
      return Math.max(C("occupancy_min"), Math.min(C("occupancy_max"), k));
    },
    buildingPenalty: function (n, cap) {
      var k = Math.pow(n / Math.max(1, cap), C("role_penalty_exp"));
      return Math.max(1, Math.min(C("role_penalty_max"), k));
    },
    promoteNeed: function (from, to) { return Math.pow(C("tier_coef"), to - from) * (1 + C("promote_loss")); },
    carry: function (tier) { return C("carry_base") * (1 + C("carry_tier_bonus") * tier); },
    counter: function (mine, theirs) {
      if (BEATS[mine] === theirs) return C("counter_bonus");
      if (BEATS[theirs] === mine) return C("counter_weak");
      return 1;
    },
    lootDiffCoef: function (d) {
      d = Math.max(-3, Math.min(3, d));
      return C(d === 0 ? "loot_diff_0" : (d < 0 ? "loot_diff_m" + (-d) : "loot_diff_p" + d));
    },
    repeatCoef: function (nth) { return C("loot_repeat_" + Math.max(1, Math.min(4, nth))); },
    marchSeconds: function (km, scout) { return Math.max(1, Math.round(km / C(scout ? "scout_speed" : "march_speed") * 3600)); },
    huntSeconds: function (kg) { return Math.round(C("hunt_base_sec") + C("hunt_sec_per_kg") * kg); },
    speedupPrice: function (used, sec) {
      var block = Math.round(C("speedup_block_h") * 3600), price = 0, pos = used, end = used + sec;
      while (pos < end) {
        var i = Math.floor(pos / block), chunk = Math.min(end, (i + 1) * block) - pos;
        price += Math.round(C("speedup_base_price") * Math.pow(C("speedup_price_growth"), i)) * chunk / block;
        pos += chunk;
      }
      return Math.ceil(price - 1e-9);
    },
    speedupDailyCap: function () { return Math.round(86400 * C("speedup_daily_cap")); },
    dailyProduction: function (l) { return F.workshopRate(l) * 24; }
  };

  // ================================================================ jang (src/Battle.php)

  var Battle = {
    resolve: function (att, def, trap) {
      var v = C("battle_variance");
      var attEp = Battle.ep(att.groups, att.level, def.groups, def.level, att.hungry);
      var defEp = Math.max(1, Battle.ep(def.groups, def.level, att.groups, att.level, def.hungry) +
        (def.alpha_cp || 0) * (def.hungry ? 1 - C("hunger_cp_penalty") : 1));
      var r = attEp / defEp, max = C("battle_max_loss"), base = C("battle_base_loss");
      var attLoss = Math.min(max, base / Math.max(r, 1e-9)) * (1 + v * (2 * rnd() - 1));
      if (trap) attLoss *= 1 + C("trap_damage");
      var defLoss = Math.min(max, base * r) * (1 + v * (2 * rnd() - 1));
      attLoss = Math.max(0, Math.min(max, attLoss));
      defLoss = Math.max(0, Math.min(max, defLoss));
      var win = C("battle_win_ratio");
      var result = r >= win ? "attacker_win" : (r <= 1 / win ? "defender_win" : "draw");
      var attLost = Battle.split(att.groups, attLoss, C("att_death_share"));
      var defLost = Battle.split(def.groups, defLoss, C("def_death_share"));
      return {
        ep_attacker: Math.round(attEp), ep_defender: Math.round(defEp), ratio: Math.round(r * 1000) / 1000, result: result,
        full_win: result === "attacker_win" && r >= C("battle_full_win_ratio"), att_loss_pct: attLoss, def_loss_pct: defLoss,
        att_losses: attLost, def_losses: defLost, att_damage: Math.round(Battle.lostEp(defLost, def.level)),
        def_damage: Math.round(Battle.lostEp(attLost, att.level)), trap: trap, log: Battle.log(attLoss, defLoss, result, trap)
      };
    },
    ep: function (groups, level, enemy, enemyLevel, hungry) {
      var share = {}, total = 0, sum = 0;
      enemy.forEach(function (g) { var e = g.qty * F.tierCp(g.role, g.tier, enemyLevel); share[g.role] = (share[g.role] || 0) + e; total += e; });
      groups.forEach(function (g) {
        var k = 1;
        if (total > 0) { k = 0; Object.keys(share).forEach(function (role) { k += F.counter(g.role, role) * share[role] / total; }); }
        sum += g.qty * F.tierCp(g.role, g.tier, level) * k;
      });
      return hungry ? sum * (1 - C("hunger_cp_penalty")) : sum;
    },
    split: function (groups, pct, deathShare) {
      var total = 0; groups.forEach(function (g) { total += g.qty; });
      var target = Math.round(total * pct), assigned = 0;
      var rows = groups.map(function (g, i) { var ex = g.qty * pct; assigned += Math.floor(ex); return { i: i, g: g, n: Math.floor(ex), frac: ex - Math.floor(ex) }; });
      rows.slice().sort(function (a, b) { return b.frac - a.frac; }).forEach(function (r) {
        if (assigned < target && r.n < r.g.qty) { r.n++; assigned++; }
      });
      var dead = [], injured = [];
      rows.forEach(function (r) {
        if (r.n <= 0) return;
        var d = Math.round(r.n * deathShare);
        if (d > 0) dead.push({ role: r.g.role, tier: r.g.tier, qty: d });
        if (r.n - d > 0) injured.push({ role: r.g.role, tier: r.g.tier, qty: r.n - d });
      });
      return { dead: dead, injured: injured };
    },
    lostEp: function (l, level) {
      var s = 0; l.dead.concat(l.injured).forEach(function (g) { s += g.qty * F.tierCp(g.role, g.tier, level); }); return s;
    },
    log: function (attLoss, defLoss, result, trap) {
      var rounds = CI("battle_rounds"), retreat = C("battle_retreat"), shares = { 1: 0.2, 2: 0.35, 3: 0.35, 4: 0.1 };
      var log = [{ round: 0, event: trap ? "trap" : "approach", att: 100, def: 100 }], a = 1, d = 1;
      for (var i = 1; i < rounds; i++) {
        a -= attLoss * (shares[i] || 0); d -= defLoss * (shares[i] || 0);
        var ev = i === 1 ? "clash" : (i === rounds - 1 ? "decisive" : "melee");
        if (i === rounds - 1 && Math.min(a, d) < retreat) ev = a < d ? "att_retreat" : "def_retreat";
        log.push({ round: i, event: ev, att: Math.round(a * 100), def: Math.round(d * 100) });
      }
      log.push({ round: rounds, event: result, att: Math.round(a * 100), def: Math.round(d * 100) });
      return log;
    }
  };

  // ================================================================ baza (localStorage)

  function emptyDb() {
    return { v: 1, seq: 1, offset: 0, me: null, players: {}, res: {}, bld: {}, army: {}, queues: [], hunts: [], marches: [],
      battles: [], reports: [], offers: {}, quests: {}, speedup: {} };
  }
  function load() {
    try { var s = localStorage.getItem(STORE); if (s) { db = JSON.parse(s); return; } } catch (e) {}
    db = emptyDb();
  }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch (e) {} }
  function nextId() { return db.seq++; }

  function ctx(pid) {
    var p = db.players[pid];
    if (!p) throw new ApiError("NOT_FOUND", "Oʻyinchi topilmadi");
    return { p: p, r: db.res[pid], b: db.bld[pid], army: db.army[pid] };
  }

  // ================================================================ oʻyinchi (src/Game.php)

  function randomSpot() { var s = CI("map_size_km"); return [randInt(0, s), randInt(0, s)]; }

  function initEconomy(pid, now, res, bl) {
    var r = { meat: 0, water: 0, herb: 0, stone: 0, wood: 0, hide: 0, bone: 0, moonstone: 0,
      alloc_stone: 40, alloc_wood: 30, alloc_hide: 15, alloc_bone: 15, ws_stone: 0, ws_wood: 0, ws_hide: 0, ws_bone: 0, last_tick: now };
    Object.keys(res).forEach(function (k) { r[k] = res[k]; });
    db.res[pid] = r;
    db.bld[pid] = {};
    BUILDINGS.forEach(function (t) { db.bld[pid][t] = bl || 1; });
    db.army[pid] = {};
  }

  function newPlayer(pid, name, level, now, bot) {
    var xy = randomSpot();
    db.players[pid] = { id: pid, display_name: name, lang: "uz", level: level, xp: F.xpTotal(level), x: xy[0], y: xy[1],
      tutorial_step: bot ? CI("tutorial_steps") : 0, shield_until: null, hunger_since: null, hunger_lost_pct: 0,
      free_speedups: bot ? 0 : CI("tutorial_free_speedups"), second_queue: 0, auto_collect: 0, is_bot: bot ? 1 : 0,
      def_loss_streak: 0, offers_attacks: 0, stat_hunts: 0, stat_battles: 0, stat_wins: 0, created_at: now, last_seen_at: now };
  }

  function createMe(now) {
    var pid = nextId();
    newPlayer(pid, "Siz", 1, now, false);
    initEconomy(pid, now, { meat: C("start_meat"), stone: C("start_stone"), wood: C("start_wood"), hide: C("start_hide"),
      bone: C("start_bone"), moonstone: CI("start_moonstone") });
    db.me = pid;
    return pid;
  }

  function unit(c, role, tier) {
    var k = role + ":" + tier;
    if (!c.army[k]) c.army[k] = { role: role, tier: tier, alive: 0, on_march: 0, injured: 0 };
    return c.army[k];
  }
  function soldiers(c, withInjured) {
    var n = 0;
    Object.keys(c.army).forEach(function (k) { var a = c.army[k]; n += a.alive + a.on_march + (withInjured === false ? 0 : a.injured); });
    return n;
  }
  function roleCount(c, role) {
    var n = 0;
    Object.keys(c.army).forEach(function (k) { var a = c.army[k]; if (a.role === role) n += a.alive + a.on_march + a.injured; });
    return n;
  }
  function homeGroups(c) {
    var g = [];
    Object.keys(c.army).forEach(function (k) { var a = c.army[k]; if (a.alive > 0) g.push({ role: a.role, tier: a.tier, qty: a.alive }); });
    return g;
  }
  function hasRes(c, cost) { return Object.keys(cost).every(function (k) { return (c.r[k] || 0) + 1e-6 >= cost[k]; }); }
  function spend(c, cost) {
    if (!hasRes(c, cost)) {
      var missing = {};
      Object.keys(cost).forEach(function (k) { if ((c.r[k] || 0) + 1e-6 < cost[k]) missing[k] = Math.ceil(cost[k] - c.r[k]); });
      throw new ApiError("NOT_ENOUGH_RESOURCES", "Resurs yetarli emas", { missing: missing });
    }
    Object.keys(cost).forEach(function (k) { c.r[k] -= cost[k]; });
  }
  function give(c, res) {
    Object.keys(res).forEach(function (k) { if (k === "moonstone" || RES.indexOf(k) >= 0) c.r[k] += res[k]; });
    if ((res.meat || 0) > 0) fed(c);
  }
  function addXp(c, xp) {
    if (xp <= 0) return;
    c.p.xp += Math.round(xp);
    var max = CI("max_level");
    while (c.p.level < max && c.p.xp >= F.xpTotal(c.p.level + 1)) c.p.level++;
    c.b.den = c.p.level;
  }
  function setLevelAtLeast(c, l) {
    l = Math.min(l, CI("max_level"));
    if (c.p.level < l) addXp(c, F.xpTotal(l) - c.p.xp);
  }
  function isShielded(p, now) {
    if (p.is_bot) return false;
    if (p.level <= CI("shield_newbie_level")) return true;
    if (p.shield_until != null && p.shield_until > now) return true;
    return now - p.last_seen_at >= C("sleep_shield_h") * 3600;
  }
  function cp(c) {
    var l = c.p.level, ep = levelRow(l).cp;
    Object.keys(c.army).forEach(function (k) { var a = c.army[k]; ep += (a.alive + a.on_march) * F.tierCp(a.role, a.tier, l); });
    if (c.p.hunger_since != null) ep *= 1 - C("hunger_cp_penalty");
    return Math.round(ep);
  }

  // ---------------------------------------------------------------- iqtisod (src/Economy.php)

  function consumption(c) { return F.meatNeed(c.p.level) * Math.max(1, soldiers(c)) / 86400; }
  function fed(c) { if (c.r.meat > 0) { c.p.hunger_since = null; c.p.hunger_lost_pct = 0; } }

  function accrue(c, to) {
    var from = c.r.last_tick;
    if (to <= from) return;
    var onlineEnd = c.p.last_seen_at + Math.round(C("offline_after_min") * 60), cuts = [from];
    if (onlineEnd > from && onlineEnd < to) cuts.push(onlineEnd);
    cuts.push(to);
    for (var i = 0; i < cuts.length - 1; i++) segment(c, cuts[i], cuts[i + 1], cuts[i] >= onlineEnd);
    desertion(c, to);
    c.r.last_tick = to;
  }
  function segment(c, a, b, offline) {
    var cons = consumption(c);
    if (c.p.hunger_since == null && cons > 0) {
      var tZero = a + Math.floor(c.r.meat / cons);
      if (tZero < b) {
        applySeg(c, tZero - a, offline, false, cons);
        c.r.meat = 0; c.p.hunger_since = tZero;
        applySeg(c, b - tZero, offline, true, cons);
        return;
      }
    }
    applySeg(c, b - a, offline, c.p.hunger_since != null, cons);
  }
  function applySeg(c, dt, offline, hungry, cons) {
    if (dt <= 0) return;
    var r = c.r, b = c.b;
    r.meat = Math.max(0, r.meat - cons * dt);
    var prodK = (offline ? C("offline_prod_rate") : 1) * (hungry ? 1 - C("hunger_prod_penalty") : 1);
    var storeK = offline ? C("offline_store_mult") : 1;
    var waterCap = F.foodCap(b.food_cave) * storeK;
    if (r.water < waterCap) r.water = Math.min(waterCap, r.water + F.waterRate(b.food_cave) / 3600 * dt * prodK);
    var add = F.workshopRate(b.workshop) / 3600 * dt * prodK, auto = c.p.auto_collect === 1;
    if (!auto) {
      var have = 0; WS.forEach(function (k) { have += r["ws_" + k]; });
      add = Math.min(add, Math.max(0, F.workshopCap(b.workshop) * storeK - have));
    }
    WS.forEach(function (k) { var part = add * r["alloc_" + k] / 100; if (auto) r[k] += part; else r["ws_" + k] += part; });
  }
  function desertion(c, to) {
    if (c.p.hunger_since == null) return;
    var days = (to - c.p.hunger_since) / 86400 - C("hunger_leave_after_d");
    if (days <= 0) return;
    var target = Math.min(C("hunger_leave_max"), C("hunger_leave_daily") * Math.floor(days)), lost = c.p.hunger_lost_pct;
    if (target <= lost) return;
    var k = (target - lost) / (1 - lost);
    Object.keys(c.army).forEach(function (key) { var a = c.army[key]; a.alive -= Math.floor(a.alive * k); });
    c.p.hunger_lost_pct = target;
  }

  // ---------------------------------------------------------------- voqealar

  function processEvents(c, to) {
    var pid = c.p.id;
    for (var guard = 0; guard < 500; guard++) {
      var cands = [];
      db.queues.forEach(function (q) { if (q.player_id === pid && q.state === "running" && q.ends_at <= to) cands.push({ ev: "queue", at: q.ends_at, o: q }); });
      db.hunts.forEach(function (h) { if (h.player_id === pid && h.state === "running" && h.ends_at <= to) cands.push({ ev: "hunt", at: h.ends_at, o: h }); });
      db.marches.forEach(function (m) {
        if (m.player_id === pid && (m.state === "returning" || m.state === "recalled") && m.returns_at <= to) cands.push({ ev: "return", at: m.returns_at, o: m });
      });
      if (!cands.length) break;
      cands.sort(function (a, b) { return a.at - b.at || a.o.id - b.o.id; });
      var e = cands[0];
      accrue(c, e.at);
      if (e.ev === "queue") completeQueue(c, e.o, e.at);
      else if (e.ev === "hunt") completeHunt(c, e.o, e.at);
      else completeReturn(c, e.o);
    }
    accrue(c, to);
  }

  function sync(pid, now) {
    resolveDue(pid, now);
    processEvents(ctx(pid), now);
  }

  // ---------------------------------------------------------------- navbatlar (src/Queues.php)

  function xpFor(cost) { var s = 0; WS.forEach(function (k) { s += cost[k] || 0; }); return s * C("xp_build_coef"); }

  function completeQueue(c, q, at) {
    q.state = "done";
    var u;
    if (q.kind === "build") {
      c.b[q.building_type] = Math.max(c.b[q.building_type], q.target_level);
      addXp(c, xpFor(F.buildingCost(q.building_type, q.target_level)));
      questBump(c.p.id, "build", 1, at);
    } else if (q.kind === "train") {
      u = unit(c, q.role, q.tier); u.alive += q.qty;
      addXp(c, xpFor({ bone: F.trainCost(q.tier).bone * q.qty }));
      questBump(c.p.id, "train", q.qty, at);
    } else {
      u = unit(c, q.role, q.tier); u.alive += q.qty;
    }
  }
  function costOf(q) {
    if (q.kind === "build") return F.buildingCost(q.building_type, q.target_level);
    var c = F.trainCost(q.tier);
    if (q.kind === "train") return { meat: c.meat * q.qty, bone: c.bone * q.qty };
    if (q.kind === "promote") return { meat: c.meat * q.qty * C("promote_cost_share"), bone: c.bone * q.qty * C("promote_cost_share") };
    return { meat: c.meat * C("heal_meat_share") * q.qty };
  }
  function myQueue(pid, qid) {
    var q = db.queues.filter(function (x) { return x.id === qid && x.player_id === pid && x.state === "running"; })[0];
    if (!q) throw new ApiError("NOT_FOUND", "Navbat topilmadi");
    return q;
  }
  function queueCancel(pid, qid) {
    var c = ctx(pid), q = myQueue(pid, qid), refund = {}, cost = costOf(q);
    Object.keys(cost).forEach(function (k) { refund[k] = Math.floor(cost[k] * C("queue_cancel_refund")); });
    give(c, refund);
    if (q.kind === "promote") unit(c, q.role, q.from_tier).alive += Math.ceil(q.qty * F.promoteNeed(q.from_tier, q.tier));
    else if (q.kind === "heal") unit(c, q.role, q.tier).injured += q.qty;
    q.state = "cancelled";
    return { refund: refund };
  }
  function queueSpeedup(pid, qid, seconds, free, now) {
    var c = ctx(pid), q = myQueue(pid, qid), left = Math.max(0, q.ends_at - now);
    if (free) {
      if (c.p.free_speedups <= 0) throw new ApiError("NOT_ENOUGH_RESOURCES", "Bepul tezlashtirish qolmagan");
      c.p.free_speedups--; q.ends_at = now;
      sync(pid, now);
      return { speeded: left, price: 0 };
    }
    seconds = Math.min(seconds, left);
    if (seconds <= 0) throw new ApiError("BAD_REQUEST", "Tezlashtirish soniyasi notoʻgʻri");
    var day = iso(now).slice(0, 10), cap = F.speedupDailyCap(), used = db.speedup[day] || 0;
    if (used + seconds > cap) throw new ApiError("SPEEDUP_CAP", "Kunlik tezlashtirish chegarasi", { left_seconds: Math.max(0, cap - used) });
    var price = F.speedupPrice(used, seconds);
    if (c.r.moonstone < price) throw new ApiError("NOT_ENOUGH_RESOURCES", "Oy toshi yetarli emas", { missing: { moonstone: price - c.r.moonstone } });
    c.r.moonstone -= price; db.speedup[day] = used + seconds; q.ends_at -= seconds;
    sync(pid, now);
    return { speeded: seconds, price: price };
  }
  function speedupQuote(seconds, now) {
    var used = db.speedup[iso(now).slice(0, 10)] || 0;
    return { price: F.speedupPrice(used, seconds), used_seconds: used, cap_seconds: F.speedupDailyCap() };
  }
  function running(pid, fn) { return db.queues.filter(function (q) { return q.player_id === pid && q.state === "running" && fn(q); }); }

  // ---------------------------------------------------------------- binolar (src/Buildings.php)

  function effect(type, l, pl) {
    var role = Object.keys(ROLE_BUILDING).filter(function (r) { return ROLE_BUILDING[r] === type; })[0];
    if (role) return { max_tier: F.maxTier(role, pl, l), soldier_cap: Math.floor(F.roleCap(l)), train_speed: round2(F.trainSpeed(l)), role: role };
    switch (type) {
      case "den": return { train_speed: round2(F.denCoef(l)) };
      case "food_cave": return { capacity: Math.floor(F.foodCap(l)), protection: round2(F.protection(l)), water_per_h: Math.round(F.waterRate(l) * 10) / 10 };
      case "workshop": return { per_hour: Math.round(F.workshopRate(l) * 10) / 10, capacity: Math.floor(F.workshopCap(l)), slots: F.workshopSlots(l) };
      case "hospital": return { heal_cap: F.healCap(l), heal_minutes: Math.round(F.healTime(l) / 6) / 10 };
    }
    return {};
  }
  function describeBuildings(c) {
    var lvl = c.p.level, busy = {};
    running(c.p.id, function (q) { return q.kind === "build"; }).forEach(function (q) { busy[q.building_type] = { queue_id: q.id, ends_at: iso(q.ends_at) }; });
    return BUILDINGS.map(function (type) {
      var l = c.b[type], row = { type: type, level: l, max_level: lvl, auto: type === "den", mvp: V2_BUILDINGS.indexOf(type) < 0,
        effect: effect(type, l, lvl), busy: busy[type] || null, next: null };
      if (type !== "den" && l < lvl && l < CI("max_level")) {
        row.next = { level: l + 1, cost: F.buildingCost(type, l + 1), seconds: F.buildingTime(type, l + 1), effect: effect(type, l + 1, lvl) };
      }
      return row;
    });
  }
  function upgrade(pid, type, now) {
    if (type === "den") throw new ApiError("DEN_AUTO_LEVEL", "In darajasi oʻyinchi darajasi bilan avtomatik oʻsadi");
    if (BUILDINGS.indexOf(type) < 0) throw new ApiError("BAD_REQUEST", "Nomaʼlum bino");
    if (V2_BUILDINGS.indexOf(type) >= 0) throw new ApiError("NOT_IN_MVP", "Bu bino keyingi versiyada ochiladi");
    var c = ctx(pid), to = c.b[type] + 1;
    if (to > c.p.level || to > CI("max_level")) throw new ApiError("LEVEL_TOO_LOW", "Bino oʻyinchi darajasidan oshmaydi", { need_level: to });
    var run = running(pid, function (q) { return q.kind === "build"; });
    if (run.some(function (q) { return q.building_type === type; })) throw new ApiError("QUEUE_BUSY", "Bu bino allaqachon qurilmoqda");
    if (run.length >= 1 + c.p.second_queue) throw new ApiError("QUEUE_BUSY", "Qurilish navbati band");
    spend(c, F.buildingCost(type, to));
    var sec = F.buildingTime(type, to), id = nextId();
    db.queues.push({ id: id, player_id: pid, kind: "build", slot: run.length + 1, building_type: type, target_level: to,
      role: null, tier: null, from_tier: null, qty: null, started_at: now, ends_at: now + sec, state: "running" });
    return { queue_id: id, ends_at: iso(now + sec), seconds: sec };
  }
  function collect(pid) {
    var c = ctx(pid), got = {};
    WS.forEach(function (k) { var n = Math.floor(c.r["ws_" + k]); got[k] = n; c.r[k] += n; c.r["ws_" + k] -= n; });
    return { collected: got };
  }
  function setAllocation(pid, a) {
    var sum = 0, c = ctx(pid);
    WS.forEach(function (k) {
      var v = a[k];
      if (typeof v !== "number" || v % 1 || v < 0 || v > 100) throw new ApiError("BAD_REQUEST", "Taqsimot 0..100 butun son boʻlishi kerak");
      sum += v;
    });
    if (sum !== 100) throw new ApiError("BAD_REQUEST", "Taqsimot yigʻindisi 100 boʻlishi kerak");
    WS.forEach(function (k) { c.r["alloc_" + k] = a[k]; });
    return { allocation: a };
  }

  // ---------------------------------------------------------------- qoʻshin (src/Army.php)

  function describeArmy(c) {
    var lvl = c.p.level, cap = F.armyCap(lvl), occ = soldiers(c, false) / Math.max(1, cap);
    var roles = ROLES.map(function (role) {
      var bl = c.b[ROLE_BUILDING[role]], max = F.maxTier(role, lvl, bl), tiers = [];
      for (var t = 1; t <= TIERS; t++) {
        var u = c.army[role + ":" + t] || { alive: 0, on_march: 0, injured: 0 };
        tiers.push({ tier: t, alive: u.alive, on_march: u.on_march, injured: u.injured, cp: Math.round(F.tierCp(role, t, lvl) * 10) / 10,
          unlocked: t <= max, cost: F.trainCost(t) });
      }
      return { role: role, unlock_level: F.roleUnlock(role), unlocked: max > 0, building: ROLE_BUILDING[role], building_level: bl,
        max_tier: max, count: roleCount(c, role), building_cap: Math.floor(F.roleCap(bl)), tiers: tiers };
    });
    return { roles: roles, count: soldiers(c), cap: cap, occupancy: Math.round(occ * 1000) / 1000, time_coef: round2(F.occupancyCoef(occ)),
      hospital: { cap: F.healCap(c.b.hospital), minutes: Math.round(F.healTime(c.b.hospital) / 6) / 10 } };
  }
  function checkRole(c, role, tier) {
    if (ROLES.indexOf(role) < 0) throw new ApiError("BAD_REQUEST", "Nomaʼlum rol");
    if (c.p.level < F.roleUnlock(role)) throw new ApiError("LEVEL_TOO_LOW", "Rol hali ochilmagan", { need_level: F.roleUnlock(role) });
    var max = F.maxTier(role, c.p.level, c.b[ROLE_BUILDING[role]]);
    if (tier < 1 || tier > max) throw new ApiError("TIER_LOCKED", "Tier hali ochilmagan", { max_tier: max });
  }
  function roleQueueBusy(pid, role) {
    if (running(pid, function (q) { return q.role === role && (q.kind === "train" || q.kind === "promote"); }).length)
      throw new ApiError("QUEUE_BUSY", "Bu rol binosida mashq davom etmoqda");
  }
  function trainPlan(c, role, tier, qty) {
    var lvl = c.p.level, bl = c.b[ROLE_BUILDING[role]], occ = soldiers(c, false) / Math.max(1, F.armyCap(lvl));
    var coef = Math.min(C("final_time_coef_max"), F.buildingPenalty(roleCount(c, role) + qty, F.roleCap(bl)) * F.occupancyCoef(occ));
    var sec = Math.ceil(F.trainTime(tier) * qty * coef / (F.trainSpeed(bl) * F.denCoef(lvl))), cc = F.trainCost(tier);
    return { cost: { meat: cc.meat * qty, bone: cc.bone * qty }, seconds: sec };
  }
  function train(pid, role, tier, qty, now) {
    if (qty < 1) throw new ApiError("BAD_REQUEST", "Miqdor notoʻgʻri");
    var c = ctx(pid);
    checkRole(c, role, tier);
    roleQueueBusy(pid, role);
    var pending = 0; running(pid, function (q) { return q.kind === "train"; }).forEach(function (q) { pending += q.qty; });
    var cap = F.armyCap(c.p.level);
    if (soldiers(c) + pending + qty > cap) throw new ApiError("CAPACITY_FULL", "Qoʻshin sigʻimi toʻlgan", { free: Math.max(0, cap - soldiers(c) - pending) });
    var plan = trainPlan(c, role, tier, qty), id = nextId();
    spend(c, plan.cost);
    db.queues.push({ id: id, player_id: pid, kind: "train", slot: 1, building_type: null, target_level: null, role: role, tier: tier,
      from_tier: null, qty: qty, started_at: now, ends_at: now + plan.seconds, state: "running" });
    return { queue_id: id, seconds: plan.seconds, ends_at: iso(now + plan.seconds) };
  }
  function promotePlan(c, role, from, to, qty) {
    if (from < 1 || to <= from) throw new ApiError("BAD_REQUEST", "Tierlar notoʻgʻri");
    checkRole(c, role, to);
    var need = Math.ceil(qty * F.promoteNeed(from, to)), cc = F.trainCost(to), share = C("promote_cost_share");
    var bl = c.b[ROLE_BUILDING[role]], have = (c.army[role + ":" + from] || { alive: 0 }).alive;
    return { consumes: need, produces: qty, available: have,
      cost: { meat: Math.ceil(cc.meat * share * qty), bone: Math.ceil(cc.bone * share * qty) },
      seconds: Math.ceil(F.trainTime(to) * C("promote_time_share") * qty / (F.trainSpeed(bl) * F.denCoef(c.p.level))),
      cp_before: Math.round(need * F.tierCp(role, from, c.p.level)), cp_after: Math.round(qty * F.tierCp(role, to, c.p.level)) };
  }
  function promote(pid, role, from, to, qty, now) {
    if (qty < 1) throw new ApiError("BAD_REQUEST", "Miqdor notoʻgʻri");
    var c = ctx(pid), plan = promotePlan(c, role, from, to, qty);
    roleQueueBusy(pid, role);
    if (plan.available < plan.consumes) throw new ApiError("NOT_ENOUGH_ARMY", "Past tier askar yetarli emas", { need: plan.consumes });
    spend(c, plan.cost);
    unit(c, role, from).alive -= plan.consumes;
    var id = nextId();
    db.queues.push({ id: id, player_id: pid, kind: "promote", slot: 1, building_type: null, target_level: null, role: role, tier: to,
      from_tier: from, qty: qty, started_at: now, ends_at: now + plan.seconds, state: "running" });
    plan.queue_id = id;
    return plan;
  }
  function heal(pid, role, tier, qty, now) {
    var c = ctx(pid), u = unit(c, role, tier), cap = F.healCap(c.b.hospital);
    if (qty < 1 || qty > u.injured) throw new ApiError("NOT_ENOUGH_ARMY", "Jarohatlangan boʻri yetarli emas");
    if (qty > cap) throw new ApiError("CAPACITY_FULL", "Shifo gʻori sigʻimi", { cap: cap });
    if (running(pid, function (q) { return q.kind === "heal"; }).length) throw new ApiError("QUEUE_BUSY", "Shifo gʻori band");
    var cost = { meat: Math.ceil(F.trainCost(tier).meat * C("heal_meat_share") * qty) };
    spend(c, cost);
    u.injured -= qty;
    var sec = F.healTime(c.b.hospital), id = nextId();
    db.queues.push({ id: id, player_id: pid, kind: "heal", slot: 1, building_type: null, target_level: null, role: role, tier: tier,
      from_tier: null, qty: qty, started_at: now, ends_at: now + sec, state: "running" });
    return { queue_id: id, seconds: sec, cost: cost };
  }
  function normalizePayload(c, payload, only) {
    if (!Array.isArray(payload) || !payload.length) throw new ApiError("BAD_REQUEST", "Qoʻshin tanlanmagan");
    var sum = {};
    payload.forEach(function (g) {
      var role = g.role, tier = +g.tier || 0, qty = +g.qty || 0;
      if (ROLES.indexOf(role) < 0 || tier < 1 || tier > TIERS || qty < 0) throw new ApiError("BAD_REQUEST", "Qoʻshin tarkibi notoʻgʻri");
      if (only && only.indexOf(role) < 0) throw new ApiError("BAD_REQUEST", "Bu vazifaga bu rol yuborilmaydi");
      if (qty > 0) sum[role + ":" + tier] = (sum[role + ":" + tier] || 0) + qty;
    });
    var out = Object.keys(sum).map(function (k) {
      var p = k.split(":");
      if ((c.army[k] ? c.army[k].alive : 0) < sum[k]) throw new ApiError("NOT_ENOUGH_ARMY", "Inda yetarli askar yoʻq", { role: p[0], tier: +p[1] });
      return { role: p[0], tier: +p[1], qty: sum[k] };
    });
    if (!out.length) throw new ApiError("BAD_REQUEST", "Qoʻshin tanlanmagan");
    return out;
  }
  function move(c, groups, from, to) {
    (groups || []).forEach(function (g) { var u = unit(c, g.role, g.tier); u[from] -= g.qty; u[to] += g.qty; });
  }

  // ---------------------------------------------------------------- ov (src/Hunt.php)

  function huntSec(c, kg) { return c.p.tutorial_step < CI("tutorial_steps") ? CI("tutorial_hunt_sec") : F.huntSeconds(kg); }
  function preyList(c) {
    return Object.keys(D.prey).filter(function (k) { return D.prey[k].level <= CI("max_level"); }).map(function (k) {
      var p = D.prey[k];
      return { key: k, kg: p.kg, level: p.level, pack: p.pack, unlocked: c.p.level >= p.level, seconds: huntSec(c, p.kg),
        xp: Math.round(p.kg * C("xp_hunt_coef")) };
    });
  }
  function huntStart(pid, key, payload, now) {
    var prey = D.prey[key];
    if (!prey) throw new ApiError("BAD_REQUEST", "Nomaʼlum oʻlja");
    var c = ctx(pid);
    if (c.p.level < prey.level) throw new ApiError("LEVEL_TOO_LOW", "Bu oʻlja hali ochilmagan", { need_level: prey.level });
    if (db.hunts.some(function (h) { return h.player_id === pid && h.state === "running"; })) throw new ApiError("QUEUE_BUSY", "Alfa hozir ovda");
    var groups = Array.isArray(payload) && payload.length ? normalizePayload(c, payload, ["hunter"]) : [];
    var pack = 1, bonus = 0;
    groups.forEach(function (g) { pack += g.qty; bonus += g.qty * g.tier; });
    if (pack < prey.pack) throw new ApiError("NOT_ENOUGH_ARMY", "Bu oʻljani yolgʻiz ovlab boʻlmaydi — toʻda kerak", { need_pack: prey.pack });
    var extra = Math.max(0, bonus - (prey.pack - 1));
    var meat = round2(prey.kg * (1 + C("hunt_hunter_bonus") * extra)), xp = Math.max(1, Math.round(prey.kg * C("xp_hunt_coef")));
    var sec = huntSec(c, prey.kg), id = nextId();
    move(c, groups, "alive", "on_march");
    db.hunts.push({ id: id, player_id: pid, prey_key: key, payload: groups, meat: meat, xp: xp, started_at: now, ends_at: now + sec, state: "running" });
    return { hunt_id: id, seconds: sec, ends_at: iso(now + sec), meat: meat };
  }
  function completeHunt(c, h, at) {
    h.state = "done";
    move(c, h.payload, "on_march", "alive");
    c.r.meat += Math.max(0, Math.min(h.meat, F.foodCap(c.b.food_cave) - c.r.meat));
    fed(c);
    addXp(c, h.xp);
    c.p.stat_hunts++;
    questBump(c.p.id, "hunt", 1, at);
  }

  // ---------------------------------------------------------------- NPC toʻdalar (src/Bots.php)

  function composition(level) {
    var cap = Math.max(1, Math.round(F.armyCap(level) * C("bot_army_share")));
    if (level < CI("pack_unlock_level")) return [{ role: "hunter", tier: 1, qty: cap }];
    var tier = F.maxTier("attacker", level, level);
    var scout = Math.round(cap * C("share_scout")), def = Math.round(cap * C("share_defender"));
    var hunter = Math.max(1, Math.round(cap * C("share_hunter"))), att = Math.max(0, cap - scout - def - hunter);
    return [["scout", scout], ["attacker", att], ["defender", def], ["hunter", hunter]]
      .filter(function (x) { return x[1] > 0; }).map(function (x) { return { role: x[0], tier: tier, qty: x[1] }; });
  }
  function stock(level) {
    var ws = F.workshopRate(Math.max(1, level - 1)) * 8 / 4;
    return { meat: round2(F.meatNeed(level) * F.armyCap(level) * C("reserve_days") + 5), stone: ws, wood: ws, hide: ws, bone: ws };
  }
  function createBot(level, name, now, tutorial) {
    var pid = nextId();
    newPlayer(pid, name, level, now, true);
    initEconomy(pid, now, stock(level), Math.max(1, level - 1));
    db.bld[pid].den = level;
    var c = ctx(pid);
    (tutorial ? [{ role: "hunter", tier: 1, qty: 1 }] : composition(level)).forEach(function (g) { unit(c, g.role, g.tier).alive = g.qty; });
    return pid;
  }
  function ensureBots(now) {
    for (var l = 1; l <= CI("max_level"); l++) {
      var have = Object.keys(db.players).filter(function (id) { var p = db.players[id]; return p.is_bot && p.level === l && p.display_name !== TUTORIAL_NAME; }).length;
      for (var i = have; i < CI("bots_per_level"); i++) createBot(l, pick(ADJ) + " " + pick(NOUN), now, false);
    }
    if (tutorialBot() == null) createBot(CI("pack_unlock_level"), TUTORIAL_NAME, now, true);
  }
  function tutorialBot() {
    var ids = Object.keys(db.players).filter(function (id) { return db.players[id].is_bot && db.players[id].display_name === TUTORIAL_NAME; });
    return ids.length ? +ids[0] : null;
  }
  function botRefresh(c, at) {
    var from = c.r.last_tick, k = Math.min(1, Math.max(0, (at - from) / C("bot_regen_sec"))), full = stock(c.p.level);
    Object.keys(full).forEach(function (res) { if (c.r[res] < full[res]) c.r[res] += (full[res] - c.r[res]) * k; });
    c.r.last_tick = Math.max(at, from);
    c.p.hunger_since = null;
    var last = null;
    db.battles.forEach(function (b) { if (b.defender_id === c.p.id && (last == null || b.created_at > last)) last = b.created_at; });
    if ((last == null || at - last >= C("bot_regen_sec")) && c.p.display_name !== TUTORIAL_NAME) {
      Object.keys(c.army).forEach(function (key) { c.army[key].alive = 0; c.army[key].injured = 0; });
      composition(c.p.level).forEach(function (g) { unit(c, g.role, g.tier).alive = g.qty; });
    }
  }

  // ---------------------------------------------------------------- PvP (src/Pvp.php)

  function requireUnlocked(c) {
    if (c.p.level < CI("pack_unlock_level")) throw new ApiError("LEVEL_TOO_LOW", "PvP 4-darajada ochiladi", { need_level: CI("pack_unlock_level") });
  }
  function band(v, mine) {
    var r = v / mine, w = C("war_power_window");
    return r < 1 - w ? "weak" : (r > 1 + w ? "strong" : "even");
  }
  function pairCount(att, def, now) {
    return db.battles.filter(function (b) { return b.attacker_id === att && b.defender_id === def && b.created_at > now - 86400; }).length +
      db.marches.filter(function (m) { return m.player_id === att && m.target_player === def && m.kind === "attack" && m.state === "outbound"; }).length;
  }
  function generateOffers(c, now) {
    var lvl = c.p.level, lo = lvl - CI("window_low"), hi = lvl + CI("window_high");
    var pool = Object.keys(db.players).map(Number).filter(function (id) {
      var p = db.players[id]; return p.is_bot && p.level >= Math.max(1, lo) && p.level <= hi && p.display_name !== TUTORIAL_NAME;
    }).sort(function () { return rnd() - 0.5; }).slice(0, CI("match_offers"));
    var exp = now + Math.round(C("match_refresh_min") * 60);
    db.offers[c.p.id] = pool.map(function (id, i) {
      var t = db.players[id];
      return { slot: i + 1, target_id: id, distance_km: Math.max(1, round2(Math.hypot(t.x - c.p.x, t.y - c.p.y))), expires_at: exp };
    });
    c.p.offers_attacks = 0;
    return db.offers[c.p.id];
  }
  function targets(pid, now, force) {
    var c = ctx(pid);
    requireUnlocked(c);
    var offers = db.offers[pid] || [];
    if (force || !offers.length || offers[0].expires_at <= now || c.p.offers_attacks >= CI("match_refresh_attacks")) offers = generateOffers(c, now);
    var mine = Math.max(1, cp(c));
    return { targets: offers.map(function (o) {
      var t = ctx(o.target_id), rep = db.reports.filter(function (r) { return r.player_id === pid && r.target_id === o.target_id && r.expires_at > now; }).pop();
      return { id: o.target_id, name: t.p.display_name, level: t.p.level, wolf: levelRow(t.p.level).name, distance_km: o.distance_km,
        power_band: band(cp(t), mine), shielded: isShielded(t.p, now), is_bot: t.p.is_bot === 1, last_seen: iso(t.p.last_seen_at),
        scouted: rep ? rep.grade : null, march_minutes: Math.round(F.marchSeconds(o.distance_km) / 60),
        attacks_today: pairCount(pid, o.target_id, now) };
    }), expires_at: iso(offers[0] ? offers[0].expires_at : null), pair_limit: CI("pair_limit") };
  }
  function offerOf(pid, tid) {
    var o = (db.offers[pid] || []).filter(function (x) { return x.target_id === tid; })[0];
    if (!o) throw new ApiError("OUT_OF_WINDOW", "Raqib taklif roʻyxatida yoʻq");
    return o;
  }
  function attack(pid, tid, payload, now) {
    var o = offerOf(pid, tid), c = ctx(pid);
    requireUnlocked(c);
    var t = db.players[tid], diff = t.level - c.p.level;
    if (diff < -CI("window_low") || diff > CI("window_high")) throw new ApiError("OUT_OF_WINDOW", "Raqib hujum oynasidan tashqarida");
    if (isShielded(t, now)) throw new ApiError("TARGET_SHIELDED", "Raqib qalqon ostida");
    if (pairCount(pid, tid, now) >= CI("pair_limit")) throw new ApiError("PAIR_LIMIT", "Bu raqibga bugungi hujumlar tugadi");
    var groups = normalizePayload(c, payload);
    move(c, groups, "alive", "on_march");
    var sec = F.marchSeconds(o.distance_km), id = nextId();
    db.marches.push({ id: id, player_id: pid, target_player: tid, kind: "attack", payload: groups, distance_km: o.distance_km,
      departs_at: now, arrives_at: now + sec, returns_at: now + 2 * sec, loot: null, state: "outbound" });
    c.p.shield_until = null;
    c.p.offers_attacks++;
    return { march_id: id, arrives_at: iso(now + sec), returns_at: iso(now + 2 * sec) };
  }
  function scout(pid, tid, payload, now) {
    var o = offerOf(pid, tid), c = ctx(pid);
    requireUnlocked(c);
    if (isShielded(db.players[tid], now)) throw new ApiError("TARGET_SHIELDED", "Raqib qalqon ostida");
    var recent = null;
    db.reports.forEach(function (r) { if (r.player_id === pid && r.target_id === tid && (recent == null || r.created_at > recent)) recent = r.created_at; });
    var pending = db.marches.some(function (m) { return m.player_id === pid && m.target_player === tid && m.kind === "scout" && m.state === "outbound"; });
    var cool = Math.round(C("scout_cooldown_min") * 60);
    if (pending || (recent != null && recent > now - cool)) throw new ApiError("COOLDOWN", "Razvedka kutish vaqti");
    var groups = normalizePayload(c, payload, ["scout"]);
    move(c, groups, "alive", "on_march");
    var sec = F.marchSeconds(o.distance_km, true), id = nextId();
    db.marches.push({ id: id, player_id: pid, target_player: tid, kind: "scout", payload: groups, distance_km: o.distance_km,
      departs_at: now, arrives_at: now + sec, returns_at: now + 2 * sec, loot: null, state: "outbound" });
    return { march_id: id, arrives_at: iso(now + sec) };
  }
  function recall(pid, mid, now) {
    var m = db.marches.filter(function (x) { return x.id === mid && x.player_id === pid; })[0];
    if (!m || m.state !== "outbound") throw new ApiError("BAD_REQUEST", "Faqat yoʻldagi yurishni qaytarish mumkin");
    m.state = "recalled"; m.returns_at = now + (now - m.departs_at);
    return { returns_at: iso(m.returns_at) };
  }
  function resolveDue(pid, now) {
    db.marches.filter(function (m) { return m.state === "outbound" && m.arrives_at <= now && (m.player_id === pid || m.target_player === pid); })
      .sort(function (a, b) { return a.arrives_at - b.arrives_at || a.id - b.id; }).forEach(resolveMarch);
  }
  function resolveMarch(m) {
    if (m.state !== "outbound") return;
    var at = m.arrives_at, att = ctx(m.player_id), def = ctx(m.target_player);
    processEvents(att, at);
    if (def.p.is_bot) botRefresh(def, at); else processEvents(def, at);
    if (m.kind === "attack") fight(att, def, m, at); else scoutArrive(att, def, m, at);
  }
  function subtract(groups, minus) {
    return groups.map(function (g) {
      var q = g.qty;
      minus.forEach(function (x) { if (x.role === g.role && x.tier === g.tier) q -= x.qty; });
      return { role: g.role, tier: g.tier, qty: q };
    }).filter(function (g) { return g.qty > 0; });
  }
  function fight(att, def, m, at) {
    var aid = att.p.id, did = def.p.id, groups = m.payload;
    var scouted = db.reports.some(function (r) { return r.player_id === aid && r.target_id === did && r.grade !== "fail" && r.expires_at > at; });
    var trap = !scouted && rnd() < C("trap_chance");
    var b = Battle.resolve({ groups: groups, level: att.p.level, hungry: att.p.hunger_since != null },
      { groups: homeGroups(def), level: def.p.level, hungry: def.p.hunger_since != null, alpha_cp: levelRow(def.p.level).cp }, trap);
    var survivors = subtract(groups, b.att_losses.dead.concat(b.att_losses.injured));
    b.att_losses.dead.forEach(function (g) { unit(att, g.role, g.tier).on_march -= g.qty; });
    b.def_losses.dead.forEach(function (g) { unit(def, g.role, g.tier).alive -= g.qty; });
    b.def_losses.injured.forEach(function (g) { var u = unit(def, g.role, g.tier); u.alive -= g.qty; u.injured += g.qty; });
    var loot = b.result === "attacker_win" ? lootOf(att, def, survivors, b.full_win, at) : {};
    Object.keys(loot).forEach(function (k) { def.r[k] -= loot[k]; });
    def.p.def_loss_streak = b.result === "attacker_win" ? def.p.def_loss_streak + 1 : 0;
    var shieldH = b.def_loss_pct >= C("shield_loss_threshold") ? C("shield_after_raid_h") : 0;
    if (def.p.def_loss_streak >= 2) shieldH = Math.max(shieldH, C("shield_streak_h"));
    if (shieldH > 0 && !def.p.is_bot) def.p.shield_until = at + Math.round(shieldH * 3600);
    var attRes = b.result === "attacker_win" ? "win" : (b.result === "draw" ? "draw" : "loss");
    var defRes = attRes === "win" ? "loss" : (attRes === "loss" ? "win" : "draw");
    addXp(att, b.att_damage * C("xp_pvp_coef") * C("xp_result_" + attRes));
    addXp(def, b.def_damage * C("xp_pvp_coef") * C("xp_result_" + defRes));
    att.p.stat_battles++; def.p.stat_battles++;
    if (attRes === "win") att.p.stat_wins++; else if (defRes === "win") def.p.stat_wins++;
    var bid = nextId();
    db.battles.push({ id: bid, kind: def.p.is_bot ? "bot" : "pvp", trap: trap, attacker_id: aid, defender_id: did,
      ep_attacker: b.ep_attacker, ep_defender: b.ep_defender, ratio: b.ratio, result: b.result, att_losses: b.att_losses,
      def_losses: b.def_losses, loot: loot, log: b.log, created_at: at });
    m.state = "returning"; m.returns_at = at + (at - m.departs_at); m.payload = survivors;
    m.loot = { res: loot, injured: b.att_losses.injured, battle_id: bid };
    questBump(aid, "pvp", 1, at);
  }
  function lootOf(att, def, survivors, full, at) {
    var aid = att.p.id, did = def.p.id;
    var nth = 1 + db.battles.filter(function (b) { return b.attacker_id === aid && b.defender_id === did && b.created_at > at - 86400; }).length;
    var revenge = db.battles.some(function (b) { return b.attacker_id === did && b.defender_id === aid && b.created_at > at - 86400; });
    var k = C("raid_coef") * C(full ? "loot_win_full" : "loot_win_partial") * F.lootDiffCoef(def.p.level - att.p.level) *
      F.repeatCoef(nth) * (revenge ? C("loot_revenge") : 1) * (!def.p.is_bot && at - def.p.last_seen_at >= 86400 ? C("loot_offline_coef") : 1);
    var unprot = 1 - F.protection(def.b.food_cave), want = {}, total = 0, carry = 0;
    LOOT_RES.forEach(function (res) { want[res] = Math.max(0, def.r[res]) * unprot * k; total += want[res]; });
    survivors.forEach(function (g) { carry += g.qty * F.carry(g.tier); });
    var scale = total > carry && total > 0 ? carry / total : 1, out = {};
    LOOT_RES.forEach(function (res) { var n = Math.floor(want[res] * scale); if (n > 0) out[res] = n; });
    return out;
  }
  function scoutPower(groups, level) {
    var s = 0;
    groups.forEach(function (g) { if (g.role === "scout") s += g.qty * Math.pow(C("tier_coef"), g.tier - 1); });
    return s * (1 + C("alpha_bonus") * level);
  }
  function grade(ratio) {
    if (Math.abs(ratio - C("scout_partial")) < 0.05) return rnd() < 0.5 ? "partial" : "fail";
    if (ratio <= C("scout_partial")) return "fail";
    if (ratio <= C("scout_full")) return "partial";
    return ratio <= C("scout_exact") ? "full" : "exact";
  }
  function scoutArrive(att, def, m, at) {
    var groups = m.payload, mine = scoutPower(groups, att.p.level), theirs = scoutPower(homeGroups(def), def.p.level);
    var ratio = theirs > 0 ? mine / theirs : 99, g = grade(ratio), injured = [];
    if (g === "fail") {
      injured = Battle.split(groups, C("scout_fail_injury"), 0).injured;
      if (!injured.length) injured = [{ role: groups[0].role, tier: groups[0].tier, qty: 1 }];
      groups = subtract(groups, injured);
    }
    writeReport(att, def, g, ratio, at);
    m.state = "returning"; m.returns_at = at + (at - m.departs_at); m.payload = groups; m.loot = { res: {}, injured: injured };
  }
  function writeReport(att, def, g, ratio, at) {
    var data = null, home = homeGroups(def);
    if (g !== "fail") {
      var total = 0; home.forEach(function (x) { total += x.qty; });
      data = { army_total: total };
      if (g === "full" || g === "exact") {
        var byRole = {}; home.forEach(function (x) { byRole[x.role] = (byRole[x.role] || 0) + x.qty; });
        data.by_role = byRole;
        var unprot = 1 - F.protection(def.b.food_cave), noise = g === "exact" ? 0 : C("scout_noise"), est = {};
        LOOT_RES.forEach(function (k) { est[k] = Math.round(Math.max(0, def.r[k]) * unprot * C("raid_coef") * (1 + noise * (2 * rnd() - 1))); });
        data.loot_estimate = est;
      }
      if (g === "exact") {
        data.groups = home; data.cp = cp(def); data.food_cave = def.b.food_cave;
        data.protection = round2(F.protection(def.b.food_cave)); data.shield_until = iso(def.p.shield_until);
      }
    }
    var id = nextId();
    db.reports.push({ id: id, player_id: att.p.id, target_id: def.p.id, ratio: Math.min(999, Math.round(ratio * 1000) / 1000), grade: g,
      payload: data, created_at: at, expires_at: at + Math.round(C("scout_report_min") * 60) });
    return id;
  }
  function report(pid, tid, now) {
    var r = db.reports.filter(function (x) { return x.player_id === pid && x.target_id === tid; }).pop();
    if (!r) return null;
    return { target_id: tid, name: db.players[tid].display_name, grade: r.grade, ratio: r.ratio, data: r.payload,
      created_at: iso(r.created_at), expires_at: iso(r.expires_at), valid: r.expires_at > now };
  }
  function completeReturn(c, m) {
    m.state = "done";
    move(c, m.payload, "on_march", "alive");
    var loot = m.loot || {};
    move(c, loot.injured || [], "on_march", "injured");
    var res = Object.assign({}, loot.res || {});
    if (res.meat != null) res.meat = Math.max(0, Math.min(res.meat, F.foodCap(c.b.food_cave) - c.r.meat));
    give(c, res);
  }
  function battleOut(b, pid, full) {
    var isAtt = b.attacker_id === pid, a = db.players[b.attacker_id], d = db.players[b.defender_id];
    var won = (b.result === "attacker_win" && isAtt) || (b.result === "defender_win" && !isAtt);
    var out = { id: b.id, kind: b.kind, side: isAtt ? "attacker" : "defender", opponent: isAtt ? d.display_name : a.display_name,
      opponent_level: isAtt ? d.level : a.level, result: b.result, outcome: b.result === "draw" ? "draw" : (won ? "win" : "loss"),
      ratio: b.ratio, ep_attacker: b.ep_attacker, ep_defender: b.ep_defender, loot: b.loot || {}, trap: !!b.trap,
      created_at: iso(b.created_at), att_losses: b.att_losses, def_losses: b.def_losses };
    if (full) { out.log = b.log; out.attacker = a.display_name; out.defender = d.display_name; }
    return out;
  }
  function battleById(pid, id) {
    var b = db.battles.filter(function (x) { return x.id === id && (x.attacker_id === pid || x.defender_id === pid); })[0];
    if (!b) throw new ApiError("NOT_FOUND", "Jang topilmadi");
    return battleOut(b, pid, true);
  }
  function marchOut(m) {
    return { id: m.id, kind: m.kind, state: m.state, target_id: m.target_player, target_name: db.players[m.target_player].display_name,
      payload: m.payload, departs_at: iso(m.departs_at), arrives_at: iso(m.arrives_at), returns_at: iso(m.returns_at),
      loot: m.loot ? (m.loot.res || {}) : null };
  }

  // ---------------------------------------------------------------- vazifalar (src/Quests.php)

  function nextMidnight(now) { return (Math.floor(now / 86400) + 1) * 86400; }
  function questsEnsure(pid, now) {
    var qs = db.quests[pid] = db.quests[pid] || {};
    Object.keys(D.quests.daily).forEach(function (key) {
      var def = D.quests.daily[key], q = qs[key];
      if (!q) qs[key] = { id: nextId(), key: key, progress: 0, target: def.target, claimed_at: null, resets_at: nextMidnight(now) };
      else if (q.resets_at <= now) { q.progress = 0; q.claimed_at = null; q.target = def.target; q.resets_at = nextMidnight(now); }
    });
    return qs;
  }
  function questBump(pid, key, n, now) {
    if (!D.quests.daily[key] || db.players[pid].is_bot) return;
    var q = questsEnsure(pid, now)[key];
    if (q.claimed_at == null) q.progress = Math.min(q.target, q.progress + n);
  }
  function questReward(c, key) {
    var def = D.quests.daily[key], budget = F.dailyProduction(c.b.workshop) * C("quest_daily_cap") / C("quest_daily_count"), out = {};
    Object.keys(def.reward).forEach(function (r) { out[r] = Math.round(budget * def.reward[r]); });
    return out;
  }
  function questsList(pid, now) {
    var qs = questsEnsure(pid, now), c = ctx(pid);
    return { daily: Object.keys(D.quests.daily).map(function (key) {
      var q = qs[key], def = D.quests.daily[key];
      return { id: q.id, key: key, kind: "daily", progress: q.progress, target: q.target, claimed: q.claimed_at != null,
        locked: c.p.level < (def.level || 1), reward: questReward(c, key), resets_at: iso(q.resets_at) };
    }), weekly: [], milestone: [] };
  }
  function questClaim(pid, qid, now) {
    var c = ctx(pid), qs = questsEnsure(pid, now);
    var q = Object.keys(qs).map(function (k) { return qs[k]; }).filter(function (x) { return x.id === qid; })[0];
    if (!q) throw new ApiError("NOT_FOUND", "Vazifa topilmadi");
    if (q.claimed_at != null || q.progress < q.target || q.resets_at <= now) throw new ApiError("BAD_REQUEST", "Vazifa hali bajarilmagan");
    var reward = questReward(c, q.key), sum = 0;
    give(c, reward);
    Object.keys(reward).forEach(function (k) { sum += reward[k]; });
    addXp(c, sum * C("xp_quest_share"));
    q.claimed_at = now;
    return { reward: reward };
  }

  // ---------------------------------------------------------------- tanishtiruv (src/Tutorial.php)

  function grant(c, reward) {
    Object.keys(reward).forEach(function (k) {
      if (k === "free_speedups") c.p.free_speedups += reward[k];
      else if (k === "army") unit(c, reward[k][0], 1).alive += reward[k][1];
      else { var r = {}; r[k] = reward[k]; give(c, r); }
    });
  }
  function tutorialStep(pid, step, now) {
    var c = ctx(pid), steps = D.tutorial, cur = c.p.tutorial_step;
    if (step !== cur + 1 || !steps[step]) throw new ApiError("TUTORIAL_ORDER", "Qadam tartibi notoʻgʻri", { current: cur });
    var def = steps[step], extra = tutorialCheck(c, def.check, now);
    grant(c, def.reward);
    c.p.tutorial_step = step;
    setLevelAtLeast(c, steps[step + 1] ? steps[step + 1].level : def.level);
    var out = { step: step, reward: def.reward };
    Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }
  function tutorialSkip(pid) {
    var c = ctx(pid), last = Math.max.apply(null, Object.keys(D.tutorial).map(Number));
    if (c.p.tutorial_step < CI("tutorial_skip_step")) throw new ApiError("TUTORIAL_ORDER", "Oʻtkazib yuborish 12-qadamdan keyin");
    if (c.p.tutorial_step < last) { grant(c, D.tutorial[last].reward); c.p.tutorial_step = last; setLevelAtLeast(c, D.tutorial[last].level); }
    return { step: last };
  }
  function tutorialCheck(c, check, now) {
    if (!check) return {};
    var pid = c.p.id;
    if (check.hunts != null && c.p.stat_hunts < check.hunts) throw new ApiError("TUTORIAL_CHECK", "Avval ov qiling", { need_hunts: check.hunts });
    if (check.building && c.b[check.building[0]] < check.building[1])
      throw new ApiError("TUTORIAL_CHECK", "Avval binoni quring", { building: check.building[0], level: check.building[1] });
    if (check.army) {
      var queued = 0;
      running(pid, function (q) { return q.kind === "train" && q.role === check.army[0]; }).forEach(function (q) { queued += q.qty; });
      if (roleCount(c, check.army[0]) + queued < check.army[1]) throw new ApiError("TUTORIAL_CHECK", "Avval askar tayyorlang", { role: check.army[0] });
    }
    if (check.tutorial_battle) return { battle: tutorialBattle(c, now) };
    if (check.tutorial_scout) {
      var bot = ctx(tutorialBot());
      writeReport(c, bot, "exact", 99, now);
      return { report: report(pid, bot.p.id, now) };
    }
    return {};
  }
  function tutorialBattle(c, now) {
    var bot = ctx(tutorialBot());
    var groups = homeGroups(c).filter(function (g) { return g.role !== "scout"; });
    if (!groups.length) groups = [{ role: "hunter", tier: 1, qty: 1 }];
    var b = Battle.resolve({ groups: groups, level: c.p.level }, { groups: homeGroups(bot), level: 1, alpha_cp: 0 }, false);
    b.log[b.log.length - 1].event = "attacker_win";
    var id = nextId();
    db.battles.push({ id: id, kind: "tutorial", trap: false, attacker_id: c.p.id, defender_id: bot.p.id, ep_attacker: b.ep_attacker,
      ep_defender: b.ep_defender, ratio: Math.min(99999, b.ratio), result: "attacker_win", att_losses: { dead: [], injured: [] },
      def_losses: b.def_losses, loot: { stone: 50 }, log: b.log, created_at: now });
    return battleById(c.p.id, id);
  }

  // ================================================================ snapshot

  function snapshot(pid, now, full) {
    var c = ctx(pid), p = c.p, r = c.r, b = c.b, lvl = p.level, lv = levelRow(lvl);
    var next = Math.min(Object.keys(D.levels).length, lvl + 1), res = {}, ws = {};
    RES.forEach(function (k) { res[k] = Math.floor(r[k]); });
    res.moonstone = r.moonstone;
    WS.forEach(function (k) { ws[k] = Math.floor(r["ws_" + k]); });
    res.workshop = ws;
    res.alloc = { stone: r.alloc_stone, wood: r.alloc_wood, hide: r.alloc_hide, bone: r.alloc_bone };
    res.caps = { food: Math.floor(F.foodCap(b.food_cave)), workshop: Math.floor(F.workshopCap(b.workshop)) };
    res.rates = { meat_per_h: -round2(F.meatNeed(lvl) * Math.max(1, soldiers(c)) / 24), water_per_h: Math.round(F.waterRate(b.food_cave) * 10) / 10,
      workshop_per_h: Math.round(F.workshopRate(b.workshop) * 10) / 10 };
    var st = {
      player: { id: p.id, name: p.display_name, level: lvl, xp: p.xp, xp_level: F.xpTotal(lvl),
        xp_next: lvl >= CI("max_level") ? null : F.xpTotal(next), max_level: CI("max_level"),
        wolf: { name: lv.name, sci: lv.sci, class: lv.class, weight: lv.weight, power: lv.power, speed: lv.speed, hp: lv.hp, cp: lv.cp },
        cp: cp(c), tutorial_step: p.tutorial_step, free_speedups: p.free_speedups, second_queue: p.second_queue,
        shield_until: iso(p.shield_until), shielded: isShielded(p, now), hunger: p.hunger_since != null,
        army: { count: soldiers(c), cap: F.armyCap(lvl) }, lang: "uz" },
      resources: res,
      queues: running(pid, function () { return true; }).sort(function (a, b2) { return a.ends_at - b2.ends_at; }).map(function (q) {
        return { id: q.id, kind: q.kind, slot: q.slot, building_type: q.building_type, target_level: q.target_level, role: q.role,
          tier: q.tier, from_tier: q.from_tier, qty: q.qty, started_at: iso(q.started_at), ends_at: iso(q.ends_at) };
      }),
      hunts: db.hunts.filter(function (h) { return h.player_id === pid && h.state === "running"; }).map(function (h) {
        return { id: h.id, prey: h.prey_key, meat: h.meat, xp: h.xp, started_at: iso(h.started_at), ends_at: iso(h.ends_at), payload: h.payload };
      }),
      marches: db.marches.filter(function (m) { return m.player_id === pid && ["outbound", "returning", "recalled"].indexOf(m.state) >= 0; }).map(marchOut),
      incoming: [],
      server_time: iso(now)
    };
    if (full) { st.buildings = describeBuildings(c); st.army = describeArmy(c); }
    return st;
  }

  // ================================================================ marshrutlash (src/Api.php)

  function route(method, path, q, b, pid, now, prevSeen) {
    var key = method + " " + path, m;
    var int = function (v) { return parseInt(v, 10) || 0; };
    switch (key) {
      case "GET /state":
        questBump(pid, "login", 1, now);
        var out = snapshot(pid, now, true), away = now - prevSeen;
        if (away >= C("offline_report_min") * 60) {
          out.offline_report = { away_seconds: away, attacks: [] };
        }
        return out;
      case "GET /profile":
        var c = ctx(pid);
        return { name: c.p.display_name, level: c.p.level, cp: cp(c), army: describeArmy(c),
          stats: { hunts: c.p.stat_hunts, battles: c.p.stat_battles, wins: c.p.stat_wins }, league: null, season_rank: null, created_at: iso(c.p.created_at) };
      case "POST /profile/allocation": return setAllocation(pid, b);
      case "GET /buildings": return { buildings: describeBuildings(ctx(pid)) };
      case "POST /buildings/upgrade": return upgrade(pid, String(b.type || ""), now);
      case "POST /buildings/collect": return collect(pid);
      case "POST /hospital/heal": return heal(pid, b.role, int(b.tier), int(b.qty), now);
      case "GET /army": return describeArmy(ctx(pid));
      case "POST /army/train": return train(pid, b.role, int(b.tier), int(b.qty), now);
      case "POST /army/promote": return promote(pid, b.role, int(b.from_tier), int(b.to_tier), int(b.qty), now);
      case "GET /army/promote/preview": return promotePlan(ctx(pid), q.role, int(q.from_tier), int(q.to_tier), Math.max(1, int(q.qty)));
      case "POST /queue/cancel": return queueCancel(pid, int(b.queue_id));
      case "POST /queue/speedup": return queueSpeedup(pid, int(b.queue_id), int(b.seconds), !!b.free, now);
      case "GET /queue/speedup/quote": return speedupQuote(Math.max(1, int(q.seconds || 3600)), now);
      case "GET /hunt": return { prey: preyList(ctx(pid)) };
      case "POST /hunt": return huntStart(pid, String(b.prey || ""), b.payload || [], now);
      case "GET /pvp/targets": return targets(pid, now, false);
      case "POST /pvp/targets/refresh": return targets(pid, now, true);
      case "POST /pvp/scout": return scout(pid, int(b.target_id), b.payload, now);
      case "POST /pvp/attack": return attack(pid, int(b.target_id), b.payload, now);
      case "GET /battles":
        var list = db.battles.filter(function (x) { return x.attacker_id === pid || x.defender_id === pid; })
          .sort(function (x, y) { return y.id - x.id; }).slice(0, Math.max(1, Math.min(50, int(q.limit || 20))));
        return { battles: list.map(function (x) { return battleOut(x, pid, false); }), cursor: null };
      case "GET /quests": return questsList(pid, now);
      case "POST /tutorial/step": return tutorialStep(pid, int(b.step), now);
      case "POST /tutorial/skip": return tutorialSkip(pid);
      case "POST /events": return { logged: 0 };
    }
    if (method === "GET" && (m = path.match(/^\/pvp\/scout\/(\d+)$/))) return { report: report(pid, +m[1], now) };
    if (method === "POST" && (m = path.match(/^\/march\/(\d+)\/recall$/))) return recall(pid, +m[1], now);
    if (method === "GET" && (m = path.match(/^\/battles\/(\d+)$/))) return battleById(pid, +m[1]);
    if (method === "POST" && (m = path.match(/^\/quests\/(\d+)\/claim$/))) return questClaim(pid, +m[1], now);
    throw new ApiError("NOT_FOUND", "Endpoint topilmadi");
  }

  function publicConfig() {
    var levels = {};
    Object.keys(D.levels).forEach(function (l) { var r = D.levels[l]; levels[l] = { name: r.name, xp_total: r.xp_total, cp: r.cp, army: r.army }; });
    return { max_level: CI("max_level"), levels: levels, prey: D.prey, tutorial_skip_step: CI("tutorial_skip_step"), roles: ROLES, tiers: TIERS,
      role_building: ROLE_BUILDING, beats: BEATS, march_speed: C("march_speed"), scout_speed: C("scout_speed"),
      pack_unlock_level: CI("pack_unlock_level"), speedup: { daily_cap_seconds: F.speedupDailyCap() } };
  }

  /** Soʻrov: xuddi fetch javobi kabi { ok, data, state } yoki { ok:false, error }. */
  function request(method, url, body) {
    if (!db) load();
    var parts = url.split("?"), path = "/" + parts[0].replace(/^\/+|\/+$/g, ""), query = {};
    new URLSearchParams(parts[1] || "").forEach(function (v, k) { query[k] = v; });
    if (method === "GET" && path === "/config") return { ok: true, data: publicConfig() };
    if (method === "GET" && path === "/locales/uz") return { ok: true, data: D.locales };
    var now = nowS();
    if (db.me == null) { ensureBots(now); createMe(now); }
    var pid = db.me, backup = JSON.stringify(db);
    try {
      if (/^\/(clans|wars|camp|oases|season|shop|vacation|market|notifications)/.test(path)) throw new ApiError("NOT_IN_MVP", "Bu boʻlim keyingi versiyada ochiladi");
      var prevSeen = db.players[pid].last_seen_at;
      sync(pid, now);
      db.players[pid].last_seen_at = now;
      var data = route(method, path, query, body || {}, pid, now, prevSeen);
      persist();
      return { ok: true, data: data, state: snapshot(pid, now, false) };
    } catch (e) {
      db = JSON.parse(backup); // tranzaksiya bekor
      if (!(e instanceof ApiError)) { console.error(e); e = new ApiError("SERVER_ERROR", String(e && e.message || e)); }
      return { ok: false, error: { code: e.code, message: e.message, details: e.details }, state: snapshot(pid, now, false) };
    }
  }

  window.BW_DEMO = {
    request: request,
    /** Demo vaqtini oldinga surish (soniya) — kutmasdan qurilish/mashq/yurish tugashini koʻrish uchun */
    skip: function (sec) { if (!db) load(); db.offset += sec; persist(); },
    reset: function () { db = emptyDb(); persist(); },
    offset: function () { if (!db) load(); return db.offset; }
  };
})();
