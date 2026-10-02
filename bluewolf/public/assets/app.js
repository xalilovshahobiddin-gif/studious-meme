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
  var RES_ICON = { meat: "🥩", stone: "🪨", wood: "🌲", bone: "🦴", moonstone: "🌕" };
  var RES_KEYS = ["meat", "stone", "wood", "bone", "moonstone"];
  // Resurs ikonkalari (24×24) — panel va narxlarda bir xil koʻrinish uchun
  var RES_SVG = {
    meat: '<path d="M14.6 3.2c3.7-.9 6.9 2.3 6 6-.6 2.6-3.2 4.6-6 4.4l-3.8 3.8.6 1.3a2.1 2.1 0 1 1-3.5 1.9 2.1 2.1 0 1 1-1.9-3.5l1.3.6 3.8-3.8c-.2-2.8 1.8-5.4 4.4-6z" fill="#e8584f"/>' +
      '<path d="M15.8 5.4c1.8-.3 3.2 1.1 2.9 2.9" stroke="#ffb3a8" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M7.6 17.2l-1.3-.6a2.1 2.1 0 1 0 1.9 3.5 2.1 2.1 0 1 0 3.5-1.9l-.6-1.3z" fill="#f3e6cf"/>',
    stone: '<path d="M4 15.5 7 7.5l6-3 6.5 4 1.5 7-5 4.5H8.5z" fill="#8c9bb3"/><path d="M7 7.5l6-3 6.5 4-6 2.5z" fill="#b8c4d8"/>' +
      '<path d="M13.5 11 19.5 8.5 21 15.5l-5 4.5z" fill="#6b7a93"/><path d="M4 15.5 13.5 11l2.5 9H8.5z" fill="#7d8ca5"/>',
    wood: '<rect x="3" y="9" width="16" height="7" rx="3.5" fill="#9a6a3c"/><ellipse cx="19" cy="12.5" rx="2.6" ry="3.5" fill="#e3b77e"/>' +
      '<ellipse cx="19" cy="12.5" rx="1.2" ry="1.7" fill="none" stroke="#9a6a3c" stroke-width=".9"/><path d="M6 9 4.5 5.5M4.5 5.5l-2 .8M4.5 5.5l.6-2" stroke="#6fae58" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M7 12h7M8.5 14h4" stroke="#7a5230" stroke-width="1" stroke-linecap="round"/>',
    bone: '<path d="M7.2 5.2a2.4 2.4 0 0 0-3.9 2.7 2.4 2.4 0 0 0 1.9 3.9l7.8 7.8a2.4 2.4 0 0 0 3.9 1.9 2.4 2.4 0 0 0 2.7-3.9 2.4 2.4 0 0 0-3.9-1.9L8.9 7.9a2.4 2.4 0 0 0-1.7-2.7z" fill="#efe4cc" stroke="#c9b48d" stroke-width=".9"/>',
    moonstone: '<circle cx="12" cy="12" r="9.5" fill="#f5c04a" opacity=".2"/><path d="M15.5 3.8a8.6 8.6 0 1 0 4.7 12.7 6.8 6.8 0 0 1-4.7-12.7z" fill="#f7cd5c"/>' +
      '<path d="M15.5 3.8a8.6 8.6 0 0 0-3.6 15.9" stroke="#fff3c4" stroke-width="1.1" fill="none" opacity=".7"/>'
  };
  function bldIcon(type, cls) {
    var I = window.BW_ICONS && window.BW_ICONS.bld[type];
    return I ? '<svg class="bi ' + (cls || "") + '" viewBox="0 0 48 48" aria-hidden="true">' + I + "</svg>" : BLD_ICON[type];
  }
  function resIcon(k, cls) { return '<svg class="ri ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + RES_SVG[k] + "</svg>"; }
  // Ixcham son: 1 000 dan boshlab — 1K, 1.2K, 12.5K, 125K, 1.2M, 3.4B (yaxlitlash pastga: bor narsadan koʻp koʻrsatmaydi)
  function short(x) {
    x = x || 0;
    var sign = x < 0 ? "-" : "";
    x = Math.abs(x);
    if (x > 0 && x < 10 && x % 1) return sign + String(Math.round(x * 10) / 10); // 0.5 kg kabi kichik qiymatlar
    if (x < 1000) return sign + Math.floor(x);
    var units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (var i = 0; i < units.length; i++) {
      if (x >= units[i][0]) {
        var v = x / units[i][0];
        v = v < 100 ? Math.floor(v * 10) / 10 : Math.floor(v);
        return sign + v + units[i][1];
      }
    }
    return sign + Math.floor(x);
  }

  var PREY_ICON = { rodent: "🐁", bird: "🐦", rabbit: "🐇", marmot: "🦫", gazelle: "🦌", boar: "🐗", deer: "🦌",
    reindeer: "🦌", argali: "🐏", horse: "🐎", moose: "🫎", bison: "🦬", mammoth_calf: "🦣", mammoth: "🦣", spirit: "👻" };

  // ------------------------------------------------------------------ yordamchilar

  function $(id) { return document.getElementById(id); }
  // Boʻri avatari: demo yigʻmasida data URI (assets/wolves.js), serverda SVG fayl
  function wolfSrc(level) { return (window.BW_WOLVES && window.BW_WOLVES[level]) || "assets/wolves/" + level + ".svg"; }
  function wolfImg(level, cls, alt) {
    return '<img class="wolf-img ' + (cls || "") + '" src="' + wolfSrc(level) + '" alt="' + esc(alt || "") + '" loading="lazy">';
  }
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
      return '<span class="cost' + (lack ? " lack" : "") + '">' + resIcon(k) + short(cost[k]) + "</span>";
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
      msg += ": " + Object.keys(e.details.missing).map(function (r) { return RES_ICON[r] + " " + short(e.details.missing[r]); }).join(" ");
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
    if (S.avatarLevel !== p.level) {
      $("wolfAvatar").innerHTML = wolfImg(p.level, "", p.wolf.name);
      if (S.avatarLevel && p.level > S.avatarLevel) levelUp(p);
      S.avatarLevel = p.level;
    }
    $("wolfName").textContent = p.wolf.name;
    var pct = p.xp_next ? (p.xp - p.xp_level) / (p.xp_next - p.xp_level) * 100 : 100;
    $("xpFill").style.width = Math.max(2, Math.min(100, pct)) + "%";
    var flags = "";
    if (p.hunger) flags += '<span class="flag bad">' + t("flag.hunger") + "</span>";
    if (p.shielded) flags += '<span class="flag">' + t("flag.shield") + "</span>";
    if (S.state.incoming.length) flags += '<span class="flag bad pulse">' + t("flag.incoming") + "</span>";
    if (DEMO) flags += '<button class="flag demo" data-action="demo-sheet">⏩ ' + t("demo.badge") + "</button>";
    $("topFlags").innerHTML = flags;
    renderResbar(r);
  }

  // Resurslar paneli: goʻsht (ombor chizigʻi bilan) · tosh · shox-shabba · suyak · oy toshi
  function renderResbar(r) {
    var bar = $("resbar"), food = r.caps.food, fill = Math.min(100, r.meat / Math.max(1, food) * 100);
    var meatState = r.meat >= food * 0.99 ? "full" : (r.meat < food * 0.3 ? "low" : ""); // kasr qoldigʻi uchun 99%
    if (!bar.firstChild) {
      bar.innerHTML = RES_KEYS.map(function (k) {
        return '<button class="res res-' + k + '" data-action="res-info" data-res="' + k + '" aria-label="' + esc(t("res." + k)) + '">' +
          resIcon(k) + '<span class="rv" id="rv-' + k + '"></span>' +
          (k === "meat" ? '<span class="rcap"><span class="rfill" id="rfill"></span></span>' : "") + "</button>";
      }).join("");
    }
    var prev = S.resPrev || {};
    RES_KEYS.forEach(function (k) {
      var v = Math.floor(r[k] || 0), el = $("rv-" + k);
      el.textContent = k === "meat" ? short(v) + "/" + short(food) : short(v);
      if (prev[k] != null && v !== prev[k]) {
        var cell = el.parentNode, cls = v > prev[k] ? "up" : "down";
        cell.classList.remove("up", "down"); void cell.offsetWidth; cell.classList.add(cls);
      }
      prev[k] = v;
    });
    S.resPrev = prev;
    var meatCell = bar.querySelector(".res-meat");
    meatCell.classList.toggle("low", meatState === "low");
    meatCell.classList.toggle("full", meatState === "full");
    $("rfill").style.width = Math.max(3, fill) + "%";
  }

  function resInfo(k) {
    var r = S.state.resources;
    if (k === "meat") {
      toast(r.meat >= r.caps.food * 0.99 ? t("res.meat.full") :
        t("res.meat.info", { v: n(r.meat), cap: n(r.caps.food), rate: Math.abs(r.rates.meat_per_h).toFixed(2) }));
      return;
    }
    var share = r.alloc[k] != null ? r.rates.workshop_per_h * r.alloc[k] / 100 : 0;
    toast(t("res." + k + ".info", { v: n(r[k]), rate: share.toFixed(1) }));
  }

  // Daraja oshdi — yangi boʻri turi
  function levelUp(p) {
    haptic("ok");
    var el = $("levelup");
    el.innerHTML = wolfImg(p.level, "lu-img", p.wolf.name) + '<div><div class="lu-title">' + t("levelup.title", { l: p.level }) +
      '</div><div class="lu-name">' + esc(p.wolf.name) + '</div><div class="muted small">' + esc(p.wolf.sci) + "</div></div>";
    el.className = "levelup";
    clearTimeout(S.luTimer);
    S.luTimer = setTimeout(function () { el.className = "levelup hidden"; }, 4200);
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
    document.querySelectorAll("[data-countdown]").forEach(function (el) {
      var l = left(el.dataset.countdown);
      el.textContent = "⏳ " + (l > 0 ? dur(l) : t("common.done"));
    });
    if (due && !S.busy) setTimeout(reload, 600);
    else if (Date.now() - S.lastLoad > 30000 && document.visibilityState === "visible" && !S.busy) reload();
  }, 1000);

  // ------------------------------------------------------------------ 🏔 IN

  function renderDen(el) {
    var st = S.state, p = st.player, r = st.resources;
    var hunt = st.hunts[0];
    var html = sceneHtml(p.level);

    // Alfa paneli: boʻri, CP va ov
    html += '<div class="alpha-bar"><div class="alpha-pic sm">' + wolfImg(p.level, "", p.wolf.name) + '</div><div class="alpha-info">' +
      '<div class="alpha-name">' + esc(p.wolf.name) + '</div><div class="muted small">⚡ ' + short(p.cp) + " CP · " + resIcon("meat") +
      t("den.meat_rate_short", { v: Math.abs(r.rates.meat_per_h).toFixed(2) }) + "</div></div>" +
      (hunt ? '<div class="hunt-live">' + (PREY_ICON[hunt.prey] || "🐾") + " " + timerHtml(hunt.started_at, hunt.ends_at) + "</div>"
        : '<button class="btn hunt-btn" data-action="hunt-sheet">🐾 ' + t("hunt.go") + "</button>") + "</div>";

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
    var ws = r.workshop, wsSum = ws.stone + ws.wood + ws.bone;
    html += "<h3>" + bldIcon("workshop", "h3i") + " " + t("bld.workshop") + "</h3>" +
      '<div class="card workshop"><div class="ws-row">' + ["stone", "wood", "bone"].map(function (k) {
        return '<div class="ws-cell">' + resIcon(k, "lg") + "<b>" + short(ws[k]) + '</b><small>' + t("res." + k) + '</small><span class="ws-pct">' + r.alloc[k] + "%</span></div>";
      }).join("") + '</div><div class="bar"><div style="width:' + Math.min(100, wsSum / r.caps.workshop * 100) + '%"></div></div>' +
      '<div class="muted small">' + t("ws.rate", { v: short(r.rates.workshop_per_h), cap: short(r.caps.workshop) }) + "</div>" +
      '<div class="row2"><button class="btn" data-action="collect"' + (wsSum < 1 ? " disabled" : "") + ">📥 " + t("ws.collect") +
      '</button><button class="btn ghost" data-action="alloc-sheet">⚖️ ' + t("ws.alloc") + "</button></div></div>";
    el.innerHTML = html;
  }

  // ------------------------------------------------------------------ In sahnasi

  // Binolarning sahnadagi joyi (%): tepada qoyalar, oʻrtada In, pastda soʻqmoq va devor
  var PLOTS = {
    scout_rock: [14, 29], hospital: [38, 25], market: [62, 25], workshop: [86, 29],
    food_cave: [16, 59], den: [50, 54], battle_ground: [84, 59],
    hunt_path: [28, 86], defense_wall: [72, 86]
  };
  // Yashash muhiti ranglari (kunduz). far — uzoq togʻlar, near — tepaliklar
  var HAB = {
    forest:   { sky: ["#6fb0e8", "#cfe8ff"], far: "#6d8ea5", near: "#4c7a4d", ground: ["#5d8b4a", "#3b6634"], deco: "pines" },
    autumn:   { sky: ["#86b4de", "#f4e2c4"], far: "#8a7c6c", near: "#9a6a2e", ground: ["#a87a3e", "#6e4a22"], deco: "autumn" },
    mountain: { sky: ["#86b8e4", "#dbecfa"], far: "#7a8ca2", near: "#5d7055", ground: ["#7e915f", "#556843"], deco: "peaks" },
    desert:   { sky: ["#efbf7c", "#fde9c6"], far: "#d09a5f", near: "#c98a4b", ground: ["#e5b672", "#c08a48"], deco: "dunes" },
    steppe:   { sky: ["#8fc4f0", "#e8f4ff"], far: "#a99b6e", near: "#c2a14f", ground: ["#d0b15d", "#a2833a"], deco: "grass" },
    swamp:    { sky: ["#9bbaa9", "#e0eee6"], far: "#6e8a79", near: "#4a6944", ground: ["#557149", "#33492d"], deco: "reeds" },
    snow:     { sky: ["#b3d3ec", "#eef6fc"], far: "#a6bbd0", near: "#d6e4f0", ground: ["#f1f6fa", "#cbdbe9"], deco: "snow" },
    aurora:   { sky: ["#b3d3ec", "#eef6fc"], far: "#a6bbd0", near: "#d6e4f0", ground: ["#f1f6fa", "#cbdbe9"], deco: "snow", aurora: true },
    ice:      { sky: ["#9ad4ef", "#e6f7ff"], far: "#8bc1dc", near: "#c4e6f5", ground: ["#e2f4fb", "#b3daec"], deco: "ice" },
    tar:      { sky: ["#c69e78", "#f0dcc0"], far: "#89694a", near: "#6a4a2f", ground: ["#795533", "#49301f"], deco: "tar" },
    fire:     { sky: ["#6e2212", "#df6f39"], far: "#4a2018", near: "#3a1a14", ground: ["#4a2a22", "#2a1410"], deco: "embers" },
    sky:      { sky: ["#0b1e5a", "#2346a0"], far: "#1c3270", near: "#213b82", ground: ["#2b4a9a", "#1a2e6a"], deco: "cosmos", night: true }
  };

  // Kun vaqti — qurilma soati boʻyicha
  function dayPhase() {
    var h = new Date(now()).getHours();
    return h >= 20 || h < 5 ? "night" : h < 7 ? "dawn" : h < 18 ? "day" : "dusk";
  }

  function sceneHtml(level) {
    var habKey = (window.BW_ICONS && window.BW_ICONS.habitat[level]) || "forest", hab = HAB[habKey] || HAB.forest;
    var phase = hab.night ? "night" : dayPhase();
    var sky = phase === "night" ? ["#070d22", "#1c2a52"] : phase === "dawn" ? ["#f0a07a", "#ffe0b0"] : phase === "dusk" ? ["#5a4b8a", "#f29a6b"] : hab.sky;
    var svg = '<svg class="scene-bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset="1" stop-color="' + sky[1] + '"/></linearGradient>' +
      '<linearGradient id="sGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hab.ground[0] + '"/><stop offset="1" stop-color="' + hab.ground[1] + '"/></linearGradient>' +
      '<radialGradient id="sGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="400" height="300" fill="url(#sSky)"/>';
    // Quyosh / oy va yulduzlar
    if (phase === "night") {
      for (var i = 0; i < 40; i++) {
        var x = (i * 97 + 13) % 400, y = (i * 53 + 7) % 130, r = (i % 3) * 0.4 + 0.6;
        svg += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" opacity="' + (0.4 + (i % 5) * 0.12) + '"/>';
      }
      svg += '<circle cx="352" cy="26" r="12" fill="#f6efd2"/><circle cx="357" cy="22" r="10.5" fill="' + sky[0] + '"/>';
    } else {
      var sx = phase === "dawn" ? 40 : phase === "dusk" ? 360 : 352, sy = phase === "day" ? 26 : 70;
      svg += '<circle cx="' + sx + '" cy="' + sy + '" r="34" fill="url(#sGlow)" opacity=".7"/><circle cx="' + sx + '" cy="' + sy + '" r="15" fill="#fff1b8"/>';
    }
    if (hab.aurora || habKey === "sky") {
      svg += '<path d="M-10 70C60 20 120 90 200 40S330 60 410 20" stroke="' + (habKey === "sky" ? "#7fb0ff" : "#3dffb0") + '" stroke-width="16" fill="none" opacity="' + (phase === "night" ? .35 : .15) + '"/>' +
        '<path d="M-10 95C70 55 130 110 210 70S330 85 410 50" stroke="#5ae0ff" stroke-width="9" fill="none" opacity="' + (phase === "night" ? .3 : .12) + '"/>';
    }
    // Uzoq togʻlar va tepaliklar
    svg += '<path d="M0 150 45 98 85 128 135 72 185 122 235 84 285 118 335 66 400 112V300H0z" fill="' + hab.far + '"/>';
    if (hab.deco === "peaks" || hab.deco === "snow" || hab.deco === "ice") {
      svg += '<path d="M135 72 122 88 135 84 146 90zM335 66 322 82 335 78 347 85zM45 98 36 110 45 107 53 112z" fill="#fff" opacity=".8"/>';
    }
    svg += '<path d="M0 182Q100 140 200 170T400 160V300H0z" fill="' + hab.near + '"/>' +
      '<path d="M0 196Q120 176 220 192T400 186V300H0z" fill="url(#sGround)"/>';
    svg += sceneDeco(hab.deco);
    // Binolarni bogʻlovchi soʻqmoqlar
    svg += '<path d="M200 150C150 175 100 170 68 165M200 150C250 175 300 170 332 165M200 150C190 200 140 230 112 252M200 150C210 200 260 230 288 252M200 150V252" stroke="#fff3d6" stroke-width="7" stroke-linecap="round" fill="none" opacity=".16"/>';
    if (phase === "night") svg += '<rect width="400" height="300" fill="#050a1c" opacity=".42"/>';
    else if (phase !== "day") svg += '<rect width="400" height="300" fill="#ff9a5a" opacity=".1"/>';
    svg += "</svg>";

    var plots = (S.buildings || []).map(function (b) {
      var pos = PLOTS[b.type] || [50, 50], lock = !b.mvp;
      var canUp = !lock && !b.busy && b.next && Object.keys(b.next.cost).every(function (k) { return (S.state.resources[k] || 0) >= b.next.cost[k]; });
      return '<button class="plot' + (b.type === "den" ? " plot-den" : "") + (b.busy ? " busy" : "") + (lock ? " locked" : "") +
        '" style="left:' + pos[0] + "%;top:" + pos[1] + '%" data-action="bld-sheet" data-type="' + b.type + '">' +
        '<span class="plot-icon">' + bldIcon(b.type) + (b.type === "den" && phase === "night" ? '<i class="den-fire"></i>' : "") + "</span>" +
        '<span class="plot-lvl">' + (lock ? "🔒" : b.level) + "</span>" + (canUp ? '<span class="plot-up">▲</span>' : "") +
        (b.busy ? '<span class="plot-busy" data-countdown="' + b.busy.ends_at + '">⏳ ' + dur(left(b.busy.ends_at)) + "</span>" : "") +
        '<span class="plot-name">' + t("bld." + b.type) + "</span></button>";
    }).join("");
    var label = '<span class="scene-tag">' + t("phase." + phase) + " · " + t("habitat." + habKey) + "</span>";
    return '<div class="scene phase-' + phase + '">' + svg + label + plots + "</div>";
  }

  // Muhit bezaklari — sahna chetlarida, binolarni yopmaydi
  function sceneDeco(kind) {
    var g = "";
    var pine = function (x, y, s, c) {
      return '<path d="M' + x + " " + (y - 26 * s) + "l" + (-9 * s) + " " + 14 * s + "h" + 4 * s + "l" + (-7 * s) + " " + 12 * s + "h" + 24 * s + "l" + (-7 * s) + " " + (-12 * s) + "h" + 4 * s + 'z" fill="' + c + '"/>';
    };
    if (kind === "pines" || kind === "snow") {
      var c = kind === "snow" ? "#5f7f74" : "#2f5a3a";
      [[8, 190, 1.1], [26, 186, .9], [372, 186, 1], [392, 192, 1.2], [110, 172, .7], [300, 170, .7]].forEach(function (p) { g += pine(p[0], p[1], p[2], c); });
      if (kind === "snow") g += '<path d="M0 205Q100 196 200 206T400 200" stroke="#fff" stroke-width="6" fill="none" opacity=".7"/>';
    } else if (kind === "autumn") {
      [[12, 188], [34, 182], [370, 184], [390, 190]].forEach(function (p) {
        g += '<rect x="' + (p[0] - 1.5) + '" y="' + (p[1] - 8) + '" width="3" height="10" fill="#5a3a1c"/><circle cx="' + p[0] + '" cy="' + (p[1] - 14) + '" r="10" fill="#d0782a"/><circle cx="' + (p[0] + 5) + '" cy="' + (p[1] - 18) + '" r="6" fill="#e9a03a"/>';
      });
    } else if (kind === "dunes") {
      g += '<path d="M0 230Q60 205 130 228T260 222T400 226V300H0z" fill="#d9a35c" opacity=".55"/>';
      g += '<path d="M372 196v-22M372 184h-7v-6M372 180h6v-8" stroke="#6f8a3a" stroke-width="4" stroke-linecap="round" fill="none"/>';
    } else if (kind === "grass") {
      for (var i = 0; i < 26; i++) {
        var x = (i * 41) % 400, y = 206 + (i * 23) % 80;
        g += '<path d="M' + x + " " + y + "q2 -9 4 -12M" + (x + 3) + " " + y + 'q1 -7 -2 -10" stroke="#8a7330" stroke-width="1.5" fill="none" opacity=".7"/>';
      }
    } else if (kind === "reeds") {
      [6, 14, 22, 378, 388, 396].forEach(function (x) {
        g += '<path d="M' + x + ' 205v-30" stroke="#3d5a35" stroke-width="2.5"/><ellipse cx="' + (x + 1) + '" cy="176" rx="2.2" ry="6" fill="#6b4a2a"/>';
      });
      g += '<ellipse cx="200" cy="290" rx="90" ry="10" fill="#3a5a6a" opacity=".35"/>';
    } else if (kind === "ice") {
      [[14, 200, 22], [30, 198, 14], [372, 198, 18], [388, 202, 26]].forEach(function (p) {
        g += '<path d="M' + (p[0] - 6) + " " + p[1] + "L" + p[0] + " " + (p[1] - p[2]) + "L" + (p[0] + 6) + " " + p[1] + 'z" fill="#e8f8ff" opacity=".9"/>';
      });
    } else if (kind === "tar") {
      g += '<ellipse cx="60" cy="275" rx="38" ry="7" fill="#1a120c" opacity=".7"/><ellipse cx="350" cy="280" rx="30" ry="6" fill="#1a120c" opacity=".7"/>' +
        '<path d="M20 230l26-6M372 236l18 8" stroke="#e9dcc3" stroke-width="3" stroke-linecap="round" opacity=".5"/>';
    } else if (kind === "embers") {
      for (var j = 0; j < 18; j++) g += '<circle cx="' + ((j * 67) % 400) + '" cy="' + (60 + (j * 37) % 200) + '" r="' + (1 + j % 2) + '" fill="#ffb15a" opacity=".7"/>';
    } else if (kind === "peaks") {
      g += pine(10, 192, 1, "#3d5a45") + pine(390, 192, 1.1, "#3d5a45");
    }
    return g;
  }

  function queueTitle(q) {
    if (q.kind === "build") return bldIcon(q.building_type, "qi") + " " + t("bld." + q.building_type) + " → " + q.target_level;
    if (q.kind === "train") return ROLE_ICON[q.role] + " " + t("queue.train", { n: q.qty, role: t("role." + q.role), tier: t("tier." + q.tier) });
    if (q.kind === "promote") return "⬆️ " + t("queue.promote", { n: q.qty, role: t("role." + q.role), tier: t("tier." + q.tier) });
    return "🏥 " + t("queue.heal", { n: q.qty, role: t("role." + q.role) });
  }

  function bldShort(b) {
    var e = b.effect;
    if (b.type === "den") return "⚡ ×" + e.train_speed;
    if (b.type === "food_cave") return "🥩 " + short(e.capacity) + " · 🛡" + Math.round(e.protection * 100) + "%";
    if (b.type === "workshop") return short(e.per_hour) + "/" + t("time.h");
    if (b.type === "hospital") return "🏥 " + e.heal_cap;
    if (e.role) return ROLE_ICON[e.role] + " T" + e.max_tier;
    return "";
  }

  function bldSheet(type) {
    var b = (S.buildings || []).filter(function (x) { return x.type === type; })[0];
    if (!b) return;
    S.sheet = { refresh: function () { bldSheet(type); } };
    var html = '<div class="sheet-head"><span class="big-icon">' + bldIcon(type, "xl") + "</span><div><h2>" + t("bld." + type) +
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
        var fmt = function (v) { return k === "protection" ? Math.round(v * 100) + "%" : (k === "max_tier" ? "T" + v : short(v)); };
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
        (pr.unlocked ? resIcon("meat") + short(pr.meat) + " " + resIcon("bone") + short(pr.bone) + " · ⏱ " + dur(pr.seconds) + " · +" + Math.max(1, pr.xp) + " XP" : t("common.level") + " " + pr.level) + "</small></span>" +
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
      ["stone", "wood", "bone"].map(function (k) {
        return '<label class="slider">' + resIcon(k) + " " + t("res." + k) + ' <b id="al-' + k + '">' + a[k] + '%</b><input type="range" min="0" max="100" step="1" value="' +
          a[k] + '" data-alloc="' + k + '"></label>';
      }).join("") + '<div class="muted small" id="alSum"></div><button class="btn big" data-action="alloc-save">' + t("common.save") + "</button>";
    openSheet(html);
    S.sheet = { alloc: a };
    var sum = function () { var s = a.stone + a.wood + a.bone; $("alSum").textContent = t("ws.alloc_sum", { s: s }); return s; };
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
        html += '<div class="card target ' + x.power_band + '">' + wolfImg(x.level, "t-img", x.wolf) + '<div class="t-main"><div class="t-name">' + esc(x.name) +
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
      "</div>" + '<div class="ep"><span>⚔️ ' + short(b.ep_attacker) + "</span><b>R " + b.ratio + "</b><span>🛡 " + short(b.ep_defender) + "</span></div>" +
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
    if (d.cp) html += "<p>⚡ " + short(d.cp) + " CP · 🍖 L" + d.food_cave + " · 🛡 " + Math.round(d.protection * 100) + "%</p>";
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
        "</b><span class=\"muted small\">" + bldIcon(r.building, "qi") + " L" + r.building_level + " · T" + r.max_tier + "</span></div>" +
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
    var html = '<div class="card profile"><div class="alpha-pic big">' + wolfImg(p.level, "", p.wolf.name) + '</div><h2>' + esc(p.name) + '</h2><div class="muted">' +
      (user && user.username ? "@" + esc(user.username) : "") + '</div><div class="stats3"><div><b>' + p.level + "</b><small>" + t("common.level") +
      "</small></div><div><b>" + short(p.cp) + "</b><small>CP</small></div><div><b>" + (pr ? pr.stats.wins + "/" + pr.stats.battles : "…") + "</b><small>" +
      t("profile.wins") + "</small></div></div>" + '<div class="stats3"><div><b>' + (pr ? short(pr.stats.hunts) : "…") + "</b><small>" + t("profile.hunts") +
      "</small></div><div><b>" + short(p.xp) + "</b><small>XP</small></div><div><b>" + p.army.count + "</b><small>" + t("pack.size") + "</small></div></div></div>";
    html += "<h3>" + t("profile.ladder") + '</h3><div class="ladder">';
    Object.keys(S.cfg.levels).forEach(function (l) {
      var row = S.cfg.levels[l], cur = +l === p.level, past = +l < p.level;
      html += '<div class="rung' + (cur ? " cur" : past ? " past" : "") + (+l > S.cfg.max_level ? " v2" : "") + '"><span class="rl">' + l + "</span>" + wolfImg(+l, "rung-img" + (+l > p.level ? " dim" : ""), row.name) + '<span class="rn">' + esc(row.name) +
        '</span><span class="rx">' + (past ? "✓" : short(row.xp_total) + " XP") + "</span></div>";
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
    el.innerHTML = '<div class="coach-wolf">' + wolfImg(p.level, "", "") + '</div><div class="coach-body"><div class="coach-step">' + t("tutorial.step", { n: step }) + "</div><div>" +
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
      return (RES_ICON[k] || k) + " " + short(r[k]);
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
      case "res-info": resInfo(el.dataset.res); break;
      case "close-levelup": $("levelup").className = "levelup hidden"; break;
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
        if (sh.alloc.stone + sh.alloc.wood + sh.alloc.bone !== 100) { toast(t("ws.alloc_sum", { s: sh.alloc.stone + sh.alloc.wood + sh.alloc.bone }), "err"); break; }
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
      document.querySelectorAll("[data-nav-icon]").forEach(function (e) {
        var I = window.BW_ICONS && window.BW_ICONS.nav[e.dataset.navIcon];
        if (I) e.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + I + "</svg>";
      });
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
