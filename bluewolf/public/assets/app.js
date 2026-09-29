/* Blue Wolf — Telegram Mini App klienti.
 * Server hamma narsani hisoblaydi; klient faqat holatni chizadi va taymerlarni
 * server vaqti (state.server_time) bilan sinxron yuritadi. Matnlar — locales dan: t('kalit').
 */
(function () {
  "use strict";

  var CLIENT_VERSION = "1.0.0";
  var tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp : null;
  var params = new URLSearchParams(location.search);
  var API = params.get("api") || window.BW_API || "api/v1";

  var S = {
    state: null, L: {}, cfg: null, tab: "den", skew: 0,
    buildings: null, army: null, prey: null, targets: null, battles: null, quests: null, profile: null,
    busy: false, lastLoad: 0
  };

  var ROLE_ICON = { scout: "🔍", attacker: "⚔️", defender: "🛡", hunter: "🏹" };
  var BLD_ICON = { den: "🏔", food_cave: "🍖", workshop: "🪨", scout_rock: "🔭", battle_ground: "⚔️",
    defense_wall: "🛡", hunt_path: "🐾", hospital: "🏥", market: "🛒" };
  var RES_ICON = { meat: "🥩", water: "💧", stone: "🪨", wood: "🌲", hide: "🐾", bone: "🦴", moonstone: "🌕" };
  var PREY_ICON = { rodent: "🐁", bird: "🐦", rabbit: "🐇", marmot: "🦫", gazelle: "🦌", boar: "🐗", deer: "🦌",
    reindeer: "🦌", argali: "🐏", horse: "🐎", moose: "🫎", bison: "🦬", mammoth_calf: "🦣", mammoth: "🦣", spirit: "👻" };

  // ------------------------------------------------------------------ yordamchilar

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var nf = new Intl.NumberFormat("uz-UZ");
  function n(x) { return nf.format(Math.floor(x || 0)); }

  function t(key, p) {
    var s = S.L[key];
    if (s == null) return key;
    if (p) Object.keys(p).forEach(function (k) { s = s.split("{" + k + "}").join(p[k]); });
    return s;
  }

  function now() { return Date.now() + S.skew; }
  function ts(iso) { return iso ? Date.parse(iso) : 0; }
  function left(iso) { return Math.max(0, Math.ceil((ts(iso) - now()) / 1000)); }
  function dur(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h > 0) return h + " " + t("time.h") + " " + m + " " + t("time.m");
    if (m > 0) return m + " " + t("time.m") + " " + s + " " + t("time.s");
    return s + " " + t("time.s");
  }
  function costHtml(cost, have) {
    return Object.keys(cost || {}).map(function (k) {
      var lack = have && (have[k] || 0) < cost[k];
      return '<span class="cost' + (lack ? " lack" : "") + '">' + RES_ICON[k] + " " + n(cost[k]) + "</span>";
    }).join(" ");
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
  }
  function haptic(kind) {
    try { if (tg && tg.HapticFeedback) kind === "ok" ? tg.HapticFeedback.notificationOccurred("success")
      : kind === "err" ? tg.HapticFeedback.notificationOccurred("error") : tg.HapticFeedback.impactOccurred("light"); } catch (e) {}
  }

  function devUser() {
    var id = null;
    try { id = localStorage.getItem("bw_dev_user"); } catch (e) {}
    if (params.get("dev")) id = params.get("dev");
    if (!id || id === "1") id = String(100000 + Math.floor(Math.random() * 800000));
    try { localStorage.setItem("bw_dev_user", id); } catch (e) {}
    return id;
  }
  var DEMO = window.BW_DEMO || null;
  var DEV_USER = tg || DEMO ? null : devUser();

  // ------------------------------------------------------------------ API

  function api(method, path, body) {
    var h = { "Content-Type": "application/json", "X-Client-Version": CLIENT_VERSION };
    if (tg) h["X-Init-Data"] = tg.initData; else h["X-Dev-User"] = DEV_USER;
    if (method === "POST") h["X-Request-Id"] = uuid();
    // Demo rejim: server oʻrniga brauzer ichidagi dvigatel (assets/demo-engine.js)
    var call = DEMO ? Promise.resolve(DEMO.request(method, path, body))
      : fetch(API.replace(/\/$/, "") + path, { method: method, headers: h, body: method === "POST" ? JSON.stringify(body || {}) : undefined })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: { code: "NETWORK", message: "HTTP " + r.status } }; }); });
    return call.then(function (res) {
        if (res.state) applyState(res.state);
        if (!res.ok) { var e = new Error(res.error.message); e.code = res.error.code; e.details = res.error.details || {}; throw e; }
        return res.data;
      });
  }

  function errText(e) {
    var k = "error." + (e.code || "NETWORK");
    var msg = S.L[k] ? t(k, e.details || {}) : (e.message || e.code);
    if (e.code === "NOT_ENOUGH_RESOURCES" && e.details && e.details.missing) {
      msg += ": " + Object.keys(e.details.missing).map(function (r) { return RES_ICON[r] + " " + n(e.details.missing[r]); }).join(" ");
    }
    return msg;
  }

  function act(promise, okMsg) {
    haptic();
    return promise.then(function (d) {
      if (okMsg) toast(okMsg, "ok");
      haptic("ok");
      return reload().then(function () { return d; });
    }).catch(function (e) { toast(errText(e), "err"); haptic("err"); throw e; });
  }

  function applyState(st) {
    S.state = st;
    S.skew = ts(st.server_time) - Date.now();
    if (st.buildings) S.buildings = st.buildings;
    if (st.army) S.army = st.army;
  }

  function reload() {
    S.lastLoad = Date.now();
    return api("GET", "/state").then(function (d) {
      S.buildings = d.buildings; S.army = d.army;
      var jobs = [];
      if (S.tab === "den") jobs.push(api("GET", "/hunt").then(function (d) { S.prey = d.prey; }));
      if (S.tab === "battle" && S.state.player.level >= S.cfg.pack_unlock_level) {
        jobs.push(api("GET", "/pvp/targets").then(function (d) { S.targets = d; }).catch(function () {}));
        jobs.push(api("GET", "/battles?limit=15").then(function (d) { S.battles = d.battles; }));
      }
      if (S.tab === "quests" || !S.quests) jobs.push(api("GET", "/quests").then(function (d) { S.quests = d; }));
      if (S.tab === "profile") jobs.push(api("GET", "/profile").then(function (d) { S.profile = d; }));
      return Promise.all(jobs);
    }).then(render);
  }

  // ------------------------------------------------------------------ umumiy UI

  var toastTimer = null;
  function toast(msg, kind) {
    var el = $("toast");
    el.textContent = msg;
    el.className = "toast " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = "toast hidden"; }, 2800);
  }

  function openSheet(html) {
    $("sheet").innerHTML = '<div class="sheet-grip"></div>' + html;
    $("sheet").classList.remove("hidden");
    $("sheetBackdrop").classList.remove("hidden");
  }
  function closeSheet() {
    $("sheet").classList.add("hidden");
    $("sheetBackdrop").classList.add("hidden");
    S.sheet = null;
  }

  function render() {
    if (!S.state) return;
    renderTop();
    var fn = { den: renderDen, battle: renderBattle, pack: renderPack, quests: renderQuests, profile: renderProfile }[S.tab];
    fn($("screen-" + S.tab));
    renderCoach();
    var dot = S.quests && S.quests.daily.some(function (q) { return !q.claimed && !q.locked && q.progress >= q.target; });
    $("questDot").style.display = dot ? "block" : "none";
    if (S.sheet && S.sheet.refresh) S.sheet.refresh();
  }

  function renderTop() {
    var p = S.state.player, r = S.state.resources;
    $("lvl").textContent = p.level;
    $("wolfName").textContent = p.wolf.name;
    var pct = p.xp_next ? (p.xp - p.xp_level) / (p.xp_next - p.xp_level) * 100 : 100;
    $("xpFill").style.width = Math.max(2, Math.min(100, pct)) + "%";
    var flags = "";
    if (p.hunger) flags += '<span class="flag bad">' + t("flag.hunger") + "</span>";
    if (p.shielded) flags += '<span class="flag">' + t("flag.shield") + "</span>";
    if (S.state.incoming.length) flags += '<span class="flag bad pulse">' + t("flag.incoming") + "</span>";
    if (DEMO) flags += '<button class="flag demo" data-action="demo-sheet">⏩ ' + t("demo.badge") + "</button>";
    $("topFlags").innerHTML = flags;
    var food = r.caps.food;
    var cells = [
      ["meat", n(r.meat) + '<small>/' + n(food) + "</small>", r.meat >= food ? "full" : (r.meat < food * 0.3 ? "low" : "")],
      ["water", n(r.water), ""], ["stone", n(r.stone), ""], ["wood", n(r.wood), ""],
      ["hide", n(r.hide), ""], ["bone", n(r.bone), ""], ["moonstone", n(r.moonstone), "gem"]
    ];
    $("resbar").innerHTML = cells.map(function (c) {
      return '<div class="res ' + c[2] + '" title="' + esc(t("res." + c[0])) + '"><i>' + RES_ICON[c[0]] + "</i><span>" + c[1] + "</span></div>";
    }).join("");
  }

  function timerHtml(startIso, endIso, id) {
    var total = Math.max(1, ts(endIso) - ts(startIso));
    var pct = Math.min(100, (now() - ts(startIso)) / total * 100);
    return '<div class="timer" data-start="' + startIso + '" data-end="' + endIso + '"><div class="tfill" style="width:' + pct +
      '%"></div><span>' + dur(left(endIso)) + "</span></div>";
  }

  // Taymerlar: har soniya yangilanadi, tugaganda holat qayta yuklanadi
  setInterval(function () {
    var due = false;
    document.querySelectorAll(".timer").forEach(function (el) {
      var s = ts(el.dataset.start), e = ts(el.dataset.end);
      var l = Math.max(0, Math.ceil((e - now()) / 1000));
      el.querySelector("span").textContent = l > 0 ? dur(l) : t("common.done");
      el.querySelector(".tfill").style.width = Math.min(100, (now() - s) / Math.max(1, e - s) * 100) + "%";
      if (l === 0 && !el.dataset.fired) { el.dataset.fired = "1"; due = true; }
    });
    if (due && !S.busy) setTimeout(reload, 600);
    else if (Date.now() - S.lastLoad > 30000 && document.visibilityState === "visible" && !S.busy) reload();
  }, 1000);

  // ------------------------------------------------------------------ 🏔 IN

  function renderDen(el) {
    var st = S.state, p = st.player, r = st.resources;
    var hunt = st.hunts[0];
    var html = '<div class="card alpha">' +
      '<div class="alpha-row"><div class="alpha-pic">🐺</div><div class="alpha-info"><div class="alpha-name">' + esc(p.wolf.name) +
      '</div><div class="muted small">' + esc(p.wolf.sci) + " · " + t("wolf.class." + p.wolf.class) + (p.wolf.weight ? " · " + p.wolf.weight + " kg" : "") +
      '</div><div class="stats"><span>💪 ' + p.wolf.power + '</span><span>💨 ' + p.wolf.speed + '</span><span>❤️ ' + p.wolf.hp +
      '</span><span class="cp">⚡ ' + n(p.cp) + ' CP</span></div></div></div>';
    if (hunt) {
      html += '<div class="hunt-live"><span>' + (PREY_ICON[hunt.prey] || "🐾") + " " + t("hunt.on", { prey: t("prey." + hunt.prey) }) +
        "</span>" + timerHtml(hunt.started_at, hunt.ends_at) + "</div>";
    } else {
      html += '<button class="btn big" data-action="hunt-sheet">🐾 ' + t("hunt.go") + "</button>";
    }
    html += '<div class="muted small center">' + t("den.meat_rate", { v: Math.abs(r.rates.meat_per_h).toFixed(2) }) + "</div></div>";

    // Navbatlar
    var queues = st.queues;
    html += '<h3>' + t("den.queues") + ' <small class="muted">' + t("den.free_speedups", { n: p.free_speedups }) + "</small></h3>";
    if (!queues.length) html += '<div class="card muted">' + t("den.queue_empty") + "</div>";
    queues.forEach(function (q) {
      html += '<div class="card queue"><div class="q-title">' + queueTitle(q) + "</div>" + timerHtml(q.started_at, q.ends_at) +
        '<div class="q-actions">' +
        (p.free_speedups > 0 ? '<button class="btn sm gold" data-action="free" data-id="' + q.id + '">⚡ ' + t("queue.free") + "</button>" : "") +
        '<button class="btn sm" data-action="speedup-sheet" data-id="' + q.id + '">🌕 ' + t("queue.speedup") + "</button>" +
        '<button class="btn sm ghost" data-action="cancel" data-id="' + q.id + '">✕</button></div></div>';
    });

    // Ustaxona
    var ws = r.workshop, wsSum = ws.stone + ws.wood + ws.hide + ws.bone;
    html += '<h3>🪨 ' + t("bld.workshop") + "</h3>" +
      '<div class="card workshop"><div class="ws-row">' + ["stone", "wood", "hide", "bone"].map(function (k) {
        return '<div class="ws-cell"><i>' + RES_ICON[k] + "</i><b>" + n(ws[k]) + '</b><small>' + r.alloc[k] + "%</small></div>";
      }).join("") + '</div><div class="bar"><div style="width:' + Math.min(100, wsSum / r.caps.workshop * 100) + '%"></div></div>' +
      '<div class="muted small">' + t("ws.rate", { v: r.rates.workshop_per_h, cap: n(r.caps.workshop) }) + "</div>" +
      '<div class="row2"><button class="btn" data-action="collect"' + (wsSum < 1 ? " disabled" : "") + ">📥 " + t("ws.collect") +
      '</button><button class="btn ghost" data-action="alloc-sheet">⚖️ ' + t("ws.alloc") + "</button></div></div>";

    // Binolar
    html += "<h3>" + t("den.buildings") + '</h3><div class="grid">';
    (S.buildings || []).forEach(function (b) {
      var lock = !b.mvp;
      html += '<div class="bld' + (b.busy ? " busy" : "") + (lock ? " locked" : "") + '" data-action="bld-sheet" data-type="' + b.type + '">' +
        '<div class="bld-icon">' + BLD_ICON[b.type] + '</div><div class="bld-lvl">' + b.level + "</div>" +
        '<div class="bld-name">' + t("bld." + b.type) + "</div>" +
        '<div class="bld-sub">' + (b.busy ? "⏳ " + dur(left(b.busy.ends_at)) : lock ? t("common.soon") : bldShort(b)) + "</div></div>";
    });
    html += "</div>";
    el.innerHTML = html;
  }

  function queueTitle(q) {
    if (q.kind === "build") return BLD_ICON[q.building_type] + " " + t("bld." + q.building_type) + " → " + q.target_level;
    if (q.kind === "train") return ROLE_ICON[q.role] + " " + t("queue.train", { n: q.qty, role: t("role." + q.role), tier: t("tier." + q.tier) });
    if (q.kind === "promote") return "⬆️ " + t("queue.promote", { n: q.qty, role: t("role." + q.role), tier: t("tier." + q.tier) });
    return "🏥 " + t("queue.heal", { n: q.qty, role: t("role." + q.role) });
  }

  function bldShort(b) {
    var e = b.effect;
    if (b.type === "den") return "⚡ ×" + e.train_speed;
    if (b.type === "food_cave") return "🥩 " + n(e.capacity) + " · 🛡" + Math.round(e.protection * 100) + "%";
    if (b.type === "workshop") return n(e.per_hour) + "/" + t("time.h");
    if (b.type === "hospital") return "🏥 " + e.heal_cap;
    if (e.role) return ROLE_ICON[e.role] + " T" + e.max_tier;
    return "";
  }

  function bldSheet(type) {
    var b = (S.buildings || []).filter(function (x) { return x.type === type; })[0];
    if (!b) return;
    S.sheet = { refresh: function () { bldSheet(type); } };
    var html = '<div class="sheet-head"><span class="big-icon">' + BLD_ICON[type] + "</span><div><h2>" + t("bld." + type) +
      "</h2><div class=\"muted\">" + t("common.level") + " " + b.level + " / " + b.max_level + "</div></div></div>" +
      '<p class="muted">' + t("bld." + type + ".desc") + "</p>" + effectTable(b);
    if (b.auto) html += '<div class="note">' + t("bld.den.auto") + "</div>";
    else if (!b.mvp) html += '<div class="note">' + t("common.soon_long") + "</div>";
    else if (b.busy) html += timerHtml(new Date(now()).toISOString(), b.busy.ends_at);
    else if (b.next) {
      html += '<div class="next"><div>' + t("bld.next", { l: b.next.level }) + " · ⏱ " + dur(b.next.seconds) + "</div><div>" +
        costHtml(b.next.cost, S.state.resources) + '</div></div><button class="btn big" data-action="upgrade" data-type="' + type + '">⬆️ ' +
        t("bld.upgrade") + "</button>";
    } else html += '<div class="note">' + t("bld.max_by_level") + "</div>";
    if (type === "hospital") html += hospitalHtml();
    openSheet(html);
  }

  function effectTable(b) {
    var keys = Object.keys(b.effect).filter(function (k) { return k !== "role"; });
    if (!keys.length) return "";
    return '<table class="fx"><tr><th></th><th>' + t("common.now") + "</th>" + (b.next ? "<th>" + t("common.next") + "</th>" : "") + "</tr>" +
      keys.map(function (k) {
        var fmt = function (v) { return k === "protection" ? Math.round(v * 100) + "%" : (k === "max_tier" ? "T" + v : n(v) === "0" && v ? v : (v % 1 ? v : n(v))); };
        return "<tr><td>" + t("fx." + k) + "</td><td>" + fmt(b.effect[k]) + "</td>" + (b.next ? "<td class=\"up\">" + fmt(b.next.effect[k]) + "</td>" : "") + "</tr>";
      }).join("") + "</table>";
  }

  function hospitalHtml() {
    var a = S.army; if (!a) return "";
    var rows = "";
    a.roles.forEach(function (r) { r.tiers.forEach(function (x) {
      if (x.injured > 0) rows += '<div class="heal-row">' + ROLE_ICON[r.role] + " " + t("role." + r.role) + " " + t("tier." + x.tier) +
        ": <b>" + x.injured + '</b> <button class="btn sm" data-action="heal" data-role="' + r.role + '" data-tier="' + x.tier +
        '" data-qty="' + Math.min(x.injured, a.hospital.cap) + '">🏥 ' + Math.min(x.injured, a.hospital.cap) + "</button></div>";
    }); });
    return "<h3>" + t("hospital.injured") + "</h3>" + (rows || '<div class="muted">' + t("hospital.none") + "</div>");
  }

  function huntSheet() {
    var p = S.state.player;
    var hunters = 0, hunterRows = [];
    (S.army ? S.army.roles : []).forEach(function (r) {
      if (r.role !== "hunter") return;
      r.tiers.forEach(function (x) { if (x.alive > 0) { hunters += x.alive; hunterRows.push({ tier: x.tier, qty: x.alive }); } });
    });
    var html = "<h2>🐾 " + t("hunt.title") + '</h2><p class="muted">' + t("hunt.desc", { n: hunters }) + '</p><div class="prey-list">';
    (S.prey || []).forEach(function (pr) {
      var canPack = 1 + hunters >= pr.pack;
      var dis = !pr.unlocked || !canPack;
      html += '<button class="prey' + (dis ? " dis" : "") + '" data-action="hunt" data-prey="' + pr.key + '" data-pack="' + pr.pack + '"' + (dis ? " disabled" : "") + ">" +
        '<span class="pi">' + (PREY_ICON[pr.key] || "🐾") + '</span><span class="pn">' + t("prey." + pr.key) + "<small>" +
        (pr.unlocked ? pr.kg + " kg · ⏱ " + dur(pr.seconds) + " · +" + pr.xp + " XP" : t("common.level") + " " + pr.level) + "</small></span>" +
        '<span class="pp">' + (pr.pack > 1 ? "🐺×" + pr.pack : t("hunt.solo")) + "</span></button>";
    });
    html += "</div>";
    S.sheet = { hunterRows: hunterRows };
    openSheet(html);
  }

  function doHunt(prey, pack) {
    // Kerakli toʻda: alfa + (pack-1) ovchi; qolgan ovchilar ham qoʻshiladi (oʻlja bonusi)
    var rows = (S.sheet && S.sheet.hunterRows) || [];
    var payload = pack > 1 ? rows.map(function (r) { return { role: "hunter", tier: r.tier, qty: r.qty }; }) : [];
    closeSheet();
    return act(api("POST", "/hunt", { prey: prey, payload: payload }), t("hunt.started"));
  }

  function allocSheet() {
    var a = Object.assign({}, S.state.resources.alloc);
    var html = "<h2>⚖️ " + t("ws.alloc") + '</h2><p class="muted">' + t("ws.alloc_desc") + "</p>" +
      ["stone", "wood", "hide", "bone"].map(function (k) {
        return '<label class="slider">' + RES_ICON[k] + " " + t("res." + k) + ' <b id="al-' + k + '">' + a[k] + '%</b><input type="range" min="0" max="100" step="5" value="' +
          a[k] + '" data-alloc="' + k + '"></label>';
      }).join("") + '<div class="muted small" id="alSum"></div><button class="btn big" data-action="alloc-save">' + t("common.save") + "</button>";
    openSheet(html);
    S.sheet = { alloc: a };
    var sum = function () { var s = a.stone + a.wood + a.hide + a.bone; $("alSum").textContent = t("ws.alloc_sum", { s: s }); return s; };
    sum();
    document.querySelectorAll("[data-alloc]").forEach(function (inp) {
      inp.addEventListener("input", function () { a[inp.dataset.alloc] = +inp.value; $("al-" + inp.dataset.alloc).textContent = inp.value + "%"; sum(); });
    });
  }

  function speedupSheet(qid) {
    var q = S.state.queues.filter(function (x) { return x.id === qid; })[0];
    if (!q) return;
    var l = left(q.ends_at);
    var opts = [3600, 2 * 3600, l].filter(function (v, i, arr) { return v > 0 && v <= l && arr.indexOf(v) === i; });
    Promise.all(opts.map(function (s) { return api("GET", "/queue/speedup/quote?seconds=" + s); })).then(function (quotes) {
      var cap = quotes[0] ? quotes[0].cap_seconds - quotes[0].used_seconds : 0;
      var html = "<h2>🌕 " + t("queue.speedup") + '</h2><p class="muted">' + t("speedup.desc", { left: dur(cap) }) + "</p>" +
        opts.map(function (s, i) {
          return '<button class="btn big" data-action="speedup" data-id="' + qid + '" data-sec="' + s + '"' + (s > cap ? " disabled" : "") + ">⏩ " +
            dur(s) + " — 🌕 " + quotes[i].price + "</button>";
        }).join("") + '<p class="muted small">' + t("speedup.rule") + "</p>";
      openSheet(html);
    }).catch(function (e) { toast(errText(e), "err"); });
  }

  // ------------------------------------------------------------------ ⚔️ JANG

  function renderBattle(el) {
    var p = S.state.player;
    if (p.level < S.cfg.pack_unlock_level) {
      el.innerHTML = '<div class="card locked-card"><div class="big-icon">🔒</div><h2>' + t("pvp.locked_title") + "</h2><p>" +
        t("pvp.locked", { l: S.cfg.pack_unlock_level }) + "</p></div>";
      return;
    }
    var html = "";
    if (S.state.incoming.length) {
      html += '<div class="card danger">' + S.state.incoming.map(function (m) {
        return "⚠️ " + t("pvp.incoming", { name: esc(m.from) }) + " " + timerHtml(new Date(now()).toISOString(), m.arrives_at);
      }).join("") + "</div>";
    }
    if (S.state.marches.length) {
      html += "<h3>" + t("pvp.marches") + "</h3>";
      S.state.marches.forEach(function (m) {
        var out = m.state === "outbound";
        html += '<div class="card march"><div>' + (m.kind === "scout" ? "🔍" : "⚔️") + " " + esc(m.target_name || "") + " · " +
          t("march." + m.state) + "</div>" + timerHtml(out ? m.departs_at : m.arrives_at, out ? m.arrives_at : m.returns_at) +
          (m.loot && Object.keys(m.loot).length ? '<div class="small">' + t("pvp.loot") + ": " + costHtml(m.loot) + "</div>" : "") +
          (out ? '<button class="btn sm ghost" data-action="recall" data-id="' + m.id + '">↩️ ' + t("march.recall") + "</button>" : "") + "</div>";
      });
    }
    var tg_ = S.targets;
    html += '<h3>' + t("pvp.targets") + ' <button class="btn sm ghost" data-action="refresh-targets">🔄</button></h3>';
    if (p.shielded && p.level <= 6) html += '<div class="note">' + t("pvp.newbie_note") + "</div>";
    if (!tg_) html += '<div class="card muted">…</div>';
    else {
      tg_.targets.forEach(function (x) {
        var dis = x.shielded || x.attacks_today >= tg_.pair_limit;
        html += '<div class="card target ' + x.power_band + '"><div class="t-main"><div class="t-name">' + esc(x.name) +
          (x.is_bot ? ' <span class="tag">' + t("pvp.wild") + "</span>" : "") + (x.shielded ? " 🛡" : "") + '</div><div class="muted small">' +
          t("common.level") + " " + x.level + " · " + esc(x.wolf) + " · " + x.distance_km + " km (" + x.march_minutes + " " + t("time.m") + ")</div></div>" +
          '<div class="band ' + x.power_band + '">' + t("band." + x.power_band) + "</div>" +
          '<div class="t-actions"><button class="btn sm" data-action="scout-sheet" data-id="' + x.id + '"' + (x.shielded ? " disabled" : "") + ">🔍" +
          (x.scouted ? " " + t("grade." + x.scouted) : "") + '</button><button class="btn sm red" data-action="attack-sheet" data-id="' + x.id + '"' +
          (dis ? " disabled" : "") + ">⚔️ " + t("pvp.attack") + "</button></div></div>";
      });
    }
    html += "<h3>" + t("pvp.log") + "</h3>";
    if (!S.battles || !S.battles.length) html += '<div class="card muted">' + t("pvp.log_empty") + "</div>";
    (S.battles || []).forEach(function (b) {
      html += '<div class="card blog ' + b.outcome + '" data-action="battle" data-id="' + b.id + '"><span class="res-' + b.outcome + '">' +
        t("outcome." + b.outcome) + "</span> " + (b.side === "attacker" ? "⚔️ → " : "🛡 ← ") + esc(b.opponent) +
        ' <span class="muted small">R ' + b.ratio + "</span>" + (Object.keys(b.loot).length ? '<div class="small">' + costHtml(b.loot) + "</div>" : "") + "</div>";
    });
    el.innerHTML = html;
  }

  function armyPicker(roles, title, action, target) {
    var rows = [];
    (S.army ? S.army.roles : []).forEach(function (r) {
      if (roles.indexOf(r.role) < 0) return;
      r.tiers.forEach(function (x) { if (x.alive > 0) rows.push({ role: r.role, tier: x.tier, max: x.alive, qty: roles.length === 1 ? x.alive : (r.role === "attacker" ? x.alive : 0) }); });
    });
    S.sheet = { rows: rows, target: target };
    var html = "<h2>" + title + "</h2>" + (target ? '<div class="muted">' + esc(target.name) + " · " + target.distance_km + " km</div>" : "");
    if (!rows.length) html += '<div class="note">' + t("pick.none") + "</div>";
    rows.forEach(function (r, i) {
      html += '<div class="pick"><span>' + ROLE_ICON[r.role] + " " + t("role." + r.role) + " " + t("tier." + r.tier) + ' <small class="muted">/ ' + r.max +
        '</small></span><div class="stepper"><button data-action="step" data-i="' + i + '" data-d="-1">−</button><b id="pk' + i + '">' + r.qty +
        '</b><button data-action="step" data-i="' + i + '" data-d="1">+</button><button data-action="step" data-i="' + i + '" data-d="max">⤒</button></div></div>';
    });
    if (target) {
      var sec = target.distance_km / (action === "scout" ? S.cfg.scout_speed : S.cfg.march_speed) * 3600;
      html += '<div class="muted small">⏱ ' + t("pick.time", { one: dur(sec), both: dur(sec * 2) }) + "</div>";
      if (action === "attack") html += '<div class="muted small">' + (target.scouted ? t("pick.scouted") : t("pick.trap")) + "</div>";
    }
    html += '<button class="btn big ' + (action === "attack" ? "red" : "") + '" data-action="send" data-kind="' + action + '"' + (rows.length ? "" : " disabled") + ">" +
      (action === "attack" ? "⚔️ " + t("pvp.attack") : "🔍 " + t("pvp.scout")) + "</button>";
    openSheet(html);
  }

  function battleSheet(b) {
    var log = b.log || [];
    var html = '<h2 class="res-' + b.outcome + '">' + t("outcome." + b.outcome) + "</h2><div class=\"muted\">" + esc(b.attacker) + " ⚔️ " + esc(b.defender) +
      "</div>" + '<div class="ep"><span>⚔️ ' + n(b.ep_attacker) + "</span><b>R " + b.ratio + "</b><span>🛡 " + n(b.ep_defender) + "</span></div>" +
      '<div class="rounds" id="rounds">' + log.map(function (r, i) {
        return '<div class="round" style="animation-delay:' + (i * 0.45) + 's"><span class="rn">' + r.round + '</span><span class="re">' + t("round." + r.event) +
          '</span><div class="hp"><div class="hpa" style="width:' + r.att + '%"></div></div><div class="hp"><div class="hpd" style="width:' + r.def + '%"></div></div></div>';
      }).join("") + "</div>" +
      (b.trap ? '<div class="note">' + t("battle.trap") + "</div>" : "") +
      "<h3>" + t("battle.losses") + "</h3>" + lossHtml(t("battle.attacker"), b.att_losses) + lossHtml(t("battle.defender"), b.def_losses) +
      (Object.keys(b.loot || {}).length ? "<h3>" + t("pvp.loot") + "</h3>" + costHtml(b.loot) : "");
    openSheet(html);
  }

  function lossHtml(title, l) {
    var d = (l.dead || []).map(function (g) { return ROLE_ICON[g.role] + g.qty; }).join(" ") || "—";
    var i = (l.injured || []).map(function (g) { return ROLE_ICON[g.role] + g.qty; }).join(" ") || "—";
    return '<div class="loss"><b>' + title + "</b> 💀 " + d + " · 🩹 " + i + "</div>";
  }

  function reportSheet(r) {
    if (!r) return;
    var d = r.data || {};
    var html = "<h2>🔍 " + esc(r.name) + '</h2><div class="grade g-' + r.grade + '">' + t("grade." + r.grade) + "</div>";
    if (r.grade === "fail") html += "<p>" + t("scout.fail") + "</p>";
    if (d.army_total != null) html += "<p>🐺 " + t("scout.total", { n: d.army_total }) + "</p>";
    if (d.by_role) html += "<p>" + Object.keys(d.by_role).map(function (k) { return ROLE_ICON[k] + " " + d.by_role[k]; }).join(" · ") + "</p>";
    if (d.loot_estimate) html += "<p>" + t("scout.loot") + ": " + costHtml(d.loot_estimate) + "</p>";
    if (d.cp) html += "<p>⚡ " + n(d.cp) + " CP · 🍖 L" + d.food_cave + " · 🛡 " + Math.round(d.protection * 100) + "%</p>";
    html += '<div class="muted small">' + t("scout.valid") + " " + (r.valid ? dur(left(r.expires_at)) : t("scout.expired")) + "</div>";
    openSheet(html);
  }

  // ------------------------------------------------------------------ 🐺 TOʻDA

  function renderPack(el) {
    var a = S.army; if (!a) { el.innerHTML = ""; return; }
    var html = '<div class="card"><div class="row-between"><b>🐺 ' + t("pack.size") + '</b><span>' + a.count + " / " + a.cap + "</span></div>" +
      '<div class="bar"><div style="width:' + Math.min(100, a.count / Math.max(1, a.cap) * 100) + '%"></div></div>' +
      '<div class="muted small">' + t("pack.occupancy", { p: Math.round(a.occupancy * 100), k: a.time_coef }) + "</div></div>";
    a.roles.forEach(function (r) {
      html += '<div class="card role role-' + r.role + (r.unlocked ? "" : " locked") + '"><div class="row-between"><b>' + ROLE_ICON[r.role] + " " + t("role." + r.role) +
        "</b><span class=\"muted small\">" + BLD_ICON[r.building] + " L" + r.building_level + " · T" + r.max_tier + "</span></div>" +
        '<div class="muted small">' + t("role." + r.role + ".desc") + "</div>";
      if (!r.unlocked) { html += '<div class="note">' + t("role.unlock", { l: r.unlock_level }) + "</div></div>"; return; }
      html += '<div class="tiers">' + r.tiers.filter(function (x) { return x.unlocked || x.alive || x.injured || x.on_march; }).map(function (x) {
        return '<div class="tier tf' + x.tier + '"><b>' + t("tier." + x.tier) + "</b><span>🐺 " + x.alive + (x.on_march ? " · 🏃" + x.on_march : "") +
          (x.injured ? " · 🩹" + x.injured : "") + '</span><small>⚡ ' + x.cp + "</small></div>";
      }).join("") + "</div>" +
        '<div class="row2"><button class="btn" data-action="train-sheet" data-role="' + r.role + '">➕ ' + t("pack.train") + "</button>" +
        (r.max_tier > 1 ? '<button class="btn ghost" data-action="promote-sheet" data-role="' + r.role + '">⬆️ ' + t("pack.promote") + "</button>" : "") + "</div></div>";
    });
    html += '<div class="card soon"><b>🏳️ ' + t("clan.title") + "</b><p class=\"muted\">" + t("clan.soon") + "</p></div>";
    el.innerHTML = html;
  }

  function trainSheet(role, tier, qty) {
    var r = S.army.roles.filter(function (x) { return x.role === role; })[0];
    tier = tier || r.max_tier; qty = qty || 1;
    var free = Math.max(0, S.army.cap - S.army.count);
    var c = r.tiers[tier - 1].cost;
    S.sheet = { role: role, tier: tier, qty: qty, refresh: null };
    var html = "<h2>" + ROLE_ICON[role] + " " + t("pack.train") + ": " + t("role." + role) + '</h2><div class="tabs">' +
      r.tiers.filter(function (x) { return x.unlocked; }).map(function (x) {
        return '<button class="' + (x.tier === tier ? "on" : "") + '" data-action="train-tier" data-role="' + role + '" data-tier="' + x.tier + '">' + t("tier." + x.tier) + "</button>";
      }).join("") + "</div>" +
      '<div class="pick"><span>' + t("pick.qty") + ' <small class="muted">' + t("pack.free", { n: free }) + '</small></span><div class="stepper">' +
      '<button data-action="train-qty" data-d="-1">−</button><b>' + qty + '</b><button data-action="train-qty" data-d="1">+</button><button data-action="train-qty" data-d="max">⤒</button></div></div>' +
      '<div class="next">' + costHtml({ meat: c.meat * qty, bone: c.bone * qty }, S.state.resources) + "</div>" +
      '<button class="btn big" data-action="train"' + (free < 1 ? " disabled" : "") + ">➕ " + t("pack.train") + "</button>" +
      '<p class="muted small">' + t("pack.train_note") + "</p>";
    S.sheet.free = free;
    openSheet(html);
  }

  function promoteSheet(role) {
    var r = S.army.roles.filter(function (x) { return x.role === role; })[0];
    var from = 1, to = 2, qty = 1;
    for (var i = 0; i < r.tiers.length; i++) if (r.tiers[i].alive > 1 && r.tiers[i].tier < r.max_tier) { from = r.tiers[i].tier; to = from + 1; break; }
    api("GET", "/army/promote/preview?role=" + role + "&from_tier=" + from + "&to_tier=" + to + "&qty=" + qty).then(function (pv) {
      var maxQty = Math.floor(pv.available / (pv.consumes / qty));
      S.sheet = { role: role, from: from, to: to };
      openSheet("<h2>⬆️ " + t("pack.promote") + '</h2><p class="muted">' + t("promote.desc") + "</p>" +
        "<p>" + t("tier." + from) + " → " + t("tier." + to) + "</p><p>" + t("promote.rate", { need: (pv.consumes / qty).toFixed(2) }) + "</p>" +
        '<p class="muted">' + t("promote.have", { n: pv.available, m: maxQty }) + "</p>" +
        '<div class="next">' + costHtml(pv.cost) + " · ⏱ " + dur(pv.seconds) + " / 1</div>" +
        '<button class="btn big" data-action="promote" data-qty="' + Math.max(1, maxQty) + '"' + (maxQty < 1 ? " disabled" : "") + ">⬆️ " + Math.max(1, maxQty) + "</button>");
    }).catch(function (e) { toast(errText(e), "err"); });
  }

  // ------------------------------------------------------------------ 📋 VAZIFALAR

  function renderQuests(el) {
    var q = S.quests; if (!q) { el.innerHTML = ""; return; }
    var html = "<h3>" + t("quests.daily") + "</h3>";
    q.daily.forEach(function (x) {
      var done = x.progress >= x.target;
      html += '<div class="card quest' + (x.claimed ? " claimed" : "") + (x.locked ? " locked" : "") + '"><div class="row-between"><b>' + t("quest." + x.key) +
        "</b><span>" + x.progress + "/" + x.target + '</span></div><div class="bar"><div style="width:' + (x.progress / x.target * 100) + '%"></div></div>' +
        '<div class="row-between"><span class="small">' + costHtml(x.reward) + "</span>" +
        (x.claimed ? "<span>✅</span>" : x.locked ? '<span class="muted small">🔒 L4</span>' :
          '<button class="btn sm' + (done ? " gold" : "") + '" data-action="claim" data-id="' + x.id + '"' + (done ? "" : " disabled") + ">🎁 " + t("quests.claim") + "</button>") +
        "</div></div>";
    });
    html += '<div class="muted small center">' + t("quests.reset", { t: dur(q.daily[0] ? left(q.daily[0].resets_at) : 0) }) + "</div>" +
      '<div class="card soon"><b>' + t("quests.weekly") + " · " + t("quests.season") + '</b><p class="muted">' + t("common.soon_long") + "</p></div>" +
      '<div class="card rule">💡 ' + t("quests.rule") + "</div>";
    el.innerHTML = html;
  }

  // ------------------------------------------------------------------ 👤 PROFIL

  function renderProfile(el) {
    var p = S.state.player, pr = S.profile;
    var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    var html = '<div class="card profile"><div class="alpha-pic big">🐺</div><h2>' + esc(p.name) + '</h2><div class="muted">' +
      (user && user.username ? "@" + esc(user.username) : "") + '</div><div class="stats3"><div><b>' + p.level + "</b><small>" + t("common.level") +
      "</small></div><div><b>" + n(p.cp) + "</b><small>CP</small></div><div><b>" + (pr ? pr.stats.wins + "/" + pr.stats.battles : "…") + "</b><small>" +
      t("profile.wins") + "</small></div></div>" + '<div class="stats3"><div><b>' + (pr ? n(pr.stats.hunts) : "…") + "</b><small>" + t("profile.hunts") +
      "</small></div><div><b>" + n(p.xp) + "</b><small>XP</small></div><div><b>" + p.army.count + "</b><small>" + t("pack.size") + "</small></div></div></div>";
    html += "<h3>" + t("profile.ladder") + '</h3><div class="ladder">';
    Object.keys(S.cfg.levels).forEach(function (l) {
      var row = S.cfg.levels[l], cur = +l === p.level, past = +l < p.level;
      html += '<div class="rung' + (cur ? " cur" : past ? " past" : "") + (+l > S.cfg.max_level ? " v2" : "") + '"><span class="rl">' + l + '</span><span class="rn">' + esc(row.name) +
        '</span><span class="rx">' + (past ? "✓" : n(row.xp_total) + " XP") + "</span></div>";
    });
    html += "</div>" + '<div class="card"><div class="row-between"><span>🌐 ' + t("profile.lang") + "</span><b>Oʻzbekcha</b></div>" +
      '<div class="muted small">' + t("profile.lang_soon") + "</div></div>" +
      '<div class="card soon"><b>🛒 ' + t("shop.title") + '</b><p class="muted">' + t("shop.soon") + "</p></div>" +
      (p.tutorial_step < 20 && p.tutorial_step >= S.cfg.tutorial_skip_step ? '<button class="btn ghost" data-action="skip-tutorial">' + t("tutorial.skip") + "</button>" : "") +
      '<p class="muted small center">Blue Wolf v' + CLIENT_VERSION + (DEMO ? " · demo" : tg ? "" : " · dev #" + DEV_USER) + "</p>";
    el.innerHTML = html;
  }

  // ------------------------------------------------------------------ TANISHTIRUV

  // Har qadam uchun avtomatik harakat (oʻyinchi tugmani bosadi — server shartni tekshiradi)
  var TUT = {
    2: function () { return api("POST", "/hunt", { prey: "rodent" }).then(waitHunt); },
    4: function () { return build("food_cave"); },
    6: function () { return build("workshop"); },
    7: function () { return api("POST", "/profile/allocation", S.state.resources.alloc); },
    8: function () { return build("hunt_path"); },
    9: function () { return trainNow("hunter"); },
    10: function () { return build("food_cave"); },
    12: function () { return huntUntil(3); },
    13: function () { return build("battle_ground"); },
    14: function () { return trainNow("attacker"); },
    17: function () { return build("scout_rock"); },
    19: function () { return build("defense_wall"); }
  };
  var TUT_TAB = { 4: "den", 6: "den", 8: "den", 9: "pack", 10: "den", 11: "pack", 13: "den", 14: "pack", 16: "battle", 17: "den", 18: "battle", 19: "den" };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function waitHunt() {
    var h = S.state.hunts[0];
    return h ? sleep(left(h.ends_at) * 1000 + 400).then(function () { return api("GET", "/state"); }) : Promise.resolve();
  }
  function finishQueue(kind) {
    var q = S.state.queues.filter(function (x) { return x.kind === kind; }).slice(-1)[0];
    if (!q) return Promise.resolve();
    if (S.state.player.free_speedups > 0) return api("POST", "/queue/speedup", { queue_id: q.id, free: true });
    toast(t("tutorial.wait", { t: dur(left(q.ends_at)) }));
    return sleep(left(q.ends_at) * 1000 + 500).then(function () { return api("GET", "/state"); });
  }
  function build(type) {
    var b = (S.buildings || []).filter(function (x) { return x.type === type; })[0];
    var need = { 4: 2, 6: 2, 8: 2, 10: 3, 13: 2, 17: 2, 19: 2 }[S.state.player.tutorial_step + 1] || 2;
    if (b && b.level >= need) return Promise.resolve();
    if (b && b.busy) return finishQueue("build");
    return api("POST", "/buildings/upgrade", { type: type }).then(function () { return finishQueue("build"); });
  }
  function trainNow(role) {
    return api("POST", "/army/train", { role: role, tier: 1, qty: 1 }).then(function () { return finishQueue("train"); });
  }
  function huntUntil(k) {
    return api("GET", "/profile").then(function (pr) {
      if (pr.stats.hunts >= k) return;
      var hunters = [];
      S.army.roles.forEach(function (r) { if (r.role === "hunter") r.tiers.forEach(function (x) { if (x.alive) hunters.push({ role: "hunter", tier: x.tier, qty: x.alive }); }); });
      return api("POST", "/hunt", { prey: hunters.length ? "marmot" : "rabbit", payload: hunters }).then(waitHunt).then(function () { return huntUntil(k); });
    });
  }

  function autoHunt() {
    return api("GET", "/hunt").then(function (d) {
      var hunters = [], n = 0;
      S.army.roles.forEach(function (r) { if (r.role === "hunter") r.tiers.forEach(function (x) { if (x.alive) { n += x.alive; hunters.push({ role: "hunter", tier: x.tier, qty: x.alive }); } }); });
      var best = d.prey.filter(function (p) { return p.unlocked && p.pack <= n + 1; }).pop();
      return api("POST", "/hunt", { prey: best.key, payload: best.pack > 1 ? hunters : [] }).then(waitHunt);
    });
  }

  function renderCoach() {
    var p = S.state.player, el = $("coach");
    var step = p.tutorial_step + 1;
    if (step > 20) { el.classList.add("hidden"); el.innerHTML = ""; return; }
    el.classList.remove("hidden");
    el.className = "coach" + (step === 11 ? " epic" : "");
    el.innerHTML = '<div class="coach-wolf">🐺</div><div class="coach-body"><div class="coach-step">' + t("tutorial.step", { n: step }) + "</div><div>" +
      t("tutorial.step." + step + ".text") + '</div><div class="coach-actions"><button class="btn sm gold" data-action="tut-go"' + (S.busy ? " disabled" : "") + ">" +
      (S.busy ? "…" : t("tutorial.step." + step + ".action")) + "</button>" +
      (p.tutorial_step >= S.cfg.tutorial_skip_step ? '<button class="btn sm ghost" data-action="skip-tutorial">' + t("tutorial.skip") + "</button>" : "") + "</div></div>";
  }

  function tutGo() {
    if (S.busy) return;
    var step = S.state.player.tutorial_step + 1;
    S.busy = true; renderCoach();
    if (TUT_TAB[step]) switchTab(TUT_TAB[step], true);
    var run = function () { return TUT[step] ? TUT[step]() : Promise.resolve(); };
    run().catch(function (e) {
      // Goʻsht yetmasa — alfa avtomatik ovga chiqadi va qayta urinadi (tanishtiruvda ov 5 soniya)
      var miss = e.code === "NOT_ENOUGH_RESOURCES" && e.details && e.details.missing;
      if (miss && Object.keys(miss).length === 1 && miss.meat) {
        toast(t("tutorial.hunt_hint"));
        return autoHunt().then(run);
      }
      throw e;
    }).then(function () {
      return api("POST", "/tutorial/step", { step: step });
    }).then(function (d) {
      haptic("ok");
      if (d.reward && Object.keys(d.reward).length) toast(t("tutorial.reward") + " " + rewardText(d.reward), "ok");
      S.busy = false;
      return reload().then(function () {
        if (d.battle) battleSheet(d.battle);
        if (d.report) reportSheet(d.report);
        if (step === 20) openSheet('<div class="center"><div class="big-icon">🏆</div><h2>' + t("tutorial.done_title") + "</h2><p>" + t("tutorial.done") + "</p></div>");
      });
    }).catch(function (e) {
      S.busy = false;
      toast(errText(e), "err");
      if (e.code === "NOT_ENOUGH_RESOURCES") toast(errText(e) + " — " + t("tutorial.hunt_hint"), "err");
      reload();
    });
  }

  function rewardText(r) {
    return Object.keys(r).map(function (k) {
      if (k === "free_speedups") return "⚡×" + r[k];
      if (k === "army") return ROLE_ICON[r[k][0]] + "×" + r[k][1];
      return (RES_ICON[k] || k) + " " + r[k];
    }).join(" ");
  }

  // ------------------------------------------------------------------ hodisalar

  function switchTab(tab, silent) {
    S.tab = tab;
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + tab); });
    document.querySelectorAll(".nav-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    if (!silent) { render(); reload(); }
  }

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-action]");
    if (!el || el.disabled) return;
    var a = el.dataset.action, id = +el.dataset.id || 0, sh = S.sheet || {};
    switch (a) {
      case "tab": switchTab(el.dataset.tab); break;
      case "close-sheet": closeSheet(); break;
      case "hunt-sheet": huntSheet(); break;
      case "hunt": doHunt(el.dataset.prey, +el.dataset.pack); break;
      case "bld-sheet": bldSheet(el.dataset.type); break;
      case "upgrade": act(api("POST", "/buildings/upgrade", { type: el.dataset.type }), t("bld.started")).then(function () { bldSheet(el.dataset.type); }); break;
      case "free": act(api("POST", "/queue/speedup", { queue_id: id, free: true }), t("queue.done")); break;
      case "cancel":
        // confirm() hamma joyda ishlamaydi (masalan, oʻrnatilgan oynada) — ikki marta bosish
        if (el.dataset.armed) { act(api("POST", "/queue/cancel", { queue_id: id }), t("queue.cancelled")); break; }
        el.dataset.armed = "1"; el.textContent = t("queue.cancel_tap");
        setTimeout(function () { delete el.dataset.armed; el.textContent = "✕"; }, 3000);
        toast(t("queue.cancel_confirm")); break;
      case "demo-sheet": demoSheet(); break;
      case "demo-skip": DEMO.skip(+el.dataset.sec); closeSheet(); toast(t("demo.skipped", { t: dur(+el.dataset.sec) }), "ok"); reload(); break;
      case "demo-reset":
        if (!el.dataset.armed) { el.dataset.armed = "1"; el.textContent = t("demo.reset_confirm"); break; }
        DEMO.reset(); closeSheet(); S.targets = S.battles = S.quests = S.profile = null; reload(); break;
      case "speedup-sheet": speedupSheet(id); break;
      case "speedup": closeSheet(); act(api("POST", "/queue/speedup", { queue_id: id, seconds: +el.dataset.sec })); break;
      case "collect": act(api("POST", "/buildings/collect"), t("ws.collected")); break;
      case "alloc-sheet": allocSheet(); break;
      case "alloc-save":
        if (sh.alloc.stone + sh.alloc.wood + sh.alloc.hide + sh.alloc.bone !== 100) { toast(t("ws.alloc_sum", { s: sh.alloc.stone + sh.alloc.wood + sh.alloc.hide + sh.alloc.bone }), "err"); break; }
        act(api("POST", "/profile/allocation", sh.alloc), t("common.saved")).then(closeSheet); break;
      case "heal": act(api("POST", "/hospital/heal", { role: el.dataset.role, tier: +el.dataset.tier, qty: +el.dataset.qty }), t("hospital.started")).then(closeSheet); break;
      case "train-sheet": trainSheet(el.dataset.role); break;
      case "train-tier": trainSheet(el.dataset.role, +el.dataset.tier, 1); break;
      case "train-qty":
        var q = el.dataset.d === "max" ? sh.free : Math.max(1, Math.min(sh.free || 1, sh.qty + +el.dataset.d));
        trainSheet(sh.role, sh.tier, q); break;
      case "train": act(api("POST", "/army/train", { role: sh.role, tier: sh.tier, qty: sh.qty }), t("pack.training")).then(closeSheet); break;
      case "promote-sheet": promoteSheet(el.dataset.role); break;
      case "promote": act(api("POST", "/army/promote", { role: sh.role, from_tier: sh.from, to_tier: sh.to, qty: +el.dataset.qty }), t("pack.promoting")).then(closeSheet); break;
      case "refresh-targets": act(api("POST", "/pvp/targets/refresh").then(function (d) { S.targets = d; })); break;
      case "attack-sheet": armyPicker(["attacker", "defender", "hunter", "scout"], "⚔️ " + t("pvp.attack"), "attack", targetById(id)); break;
      case "scout-sheet":
        api("GET", "/pvp/scout/" + id).then(function (d) {
          if (d.report && d.report.valid) reportSheet(d.report); else armyPicker(["scout"], "🔍 " + t("pvp.scout"), "scout", targetById(id));
        }); break;
      case "step":
        var r = sh.rows[+el.dataset.i];
        r.qty = el.dataset.d === "max" ? r.max : Math.max(0, Math.min(r.max, r.qty + +el.dataset.d));
        $("pk" + el.dataset.i).textContent = r.qty; break;
      case "send":
        var payload = sh.rows.filter(function (r) { return r.qty > 0; }).map(function (r) { return { role: r.role, tier: r.tier, qty: r.qty }; });
        var path = el.dataset.kind === "attack" ? "/pvp/attack" : "/pvp/scout";
        closeSheet();
        act(api("POST", path, { target_id: sh.target.id, payload: payload }), t(el.dataset.kind === "attack" ? "pvp.sent" : "pvp.scout_sent")); break;
      case "recall": act(api("POST", "/march/" + id + "/recall"), t("march.recalled")); break;
      case "battle": api("GET", "/battles/" + id).then(battleSheet); break;
      case "claim": act(api("POST", "/quests/" + id + "/claim").then(function (d) { toast(t("quests.got") + " " + rewardText(d.reward), "ok"); })); break;
      case "tut-go": tutGo(); break;
      case "skip-tutorial": act(api("POST", "/tutorial/skip")); break;
    }
  });

  function demoSheet() {
    openSheet("<h2>⏩ " + t("demo.title") + '</h2><p class="muted">' + t("demo.desc") + '</p><div class="row2">' +
      [[60, "+1 " + t("time.m")], [600, "+10 " + t("time.m")], [3600, "+1 " + t("time.h")], [8 * 3600, "+8 " + t("time.h")]].map(function (x) {
        return '<button class="btn" data-action="demo-skip" data-sec="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + '</div><p class="muted small">' + t("demo.offset", { t: dur(DEMO.offset()) }) + "</p>" +
      '<button class="btn big ghost" data-action="demo-reset">↺ ' + t("demo.reset") + "</button>");
  }

  function targetById(id) { return S.targets ? S.targets.targets.filter(function (x) { return x.id === id; })[0] : null; }

  // ------------------------------------------------------------------ ishga tushirish

  function boot() {
    if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor("#0f1626"); tg.setBackgroundColor("#0f1626"); } catch (e) {} }
    $("bootMsg").textContent = "…";
    Promise.all([api("GET", "/locales/uz"), api("GET", "/config")]).then(function (res) {
      S.L = res[0]; S.cfg = res[1];
      document.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = t(e.dataset.t); });
      return api("GET", "/state");
    }).then(function (st) {
      S.buildings = st.buildings; S.army = st.army;
      $("boot").classList.add("hidden");
      if (st.offline_report && st.offline_report.away_seconds > 1800) {
        openSheet('<div class="center"><div class="big-icon">🌄</div><h2>' + t("return.title") + "</h2><p>" +
          t("return.away", { t: dur(st.offline_report.away_seconds) }) + "</p>" +
          (st.offline_report.attacks.length ? "<p>" + t("return.attacks", { n: st.offline_report.attacks.length }) + "</p>" : "") +
          '<button class="btn big" data-action="close-sheet">🐺 ' + t("return.go") + "</button></div>");
      }
      return reload();
    }).catch(function (e) {
      $("bootMsg").textContent = (e.code === "UNAUTHORIZED" ? "Telegram orqali oching" : "Server bilan aloqa yoʻq") + " (" + (e.code || e.message) + ")";
      if (DEMO) console.error(e);
    });
  }

  boot();
})();
