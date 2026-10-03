/* Blue Wolf Mini App — v0.0.6 (iqtisodiyot, qurilish, askarlar va ov)
   6 ta tab (In · Ov · Jang · Toʻda · Vazifalar · Profil), hash-router, Telegram WebApp integratsiyasi.
   Resurslar vaqt boʻyicha hisoblanadi (BWGame.advance — server bilan bir xil formula), Ustaxona buferi
   va taqsimoti, qurilish, askar mashqi va ov ishlaydi. Qolgan amallar (hujum, razvedka…) keyingi bosqichlarda ulanadi. */
(function () {
  "use strict";

  var G = window.BWGame;
  var tg = window.Telegram && window.Telegram.WebApp;
  var icon = function (name, cls) { return window.BWIcons.svg(name, cls); };
  var $ = function (sel) { return document.querySelector(sel); };

  var app = { mode: "demo", config: {}, state: null, econ: null, offset: 0, tab: "in", seg: { jang: "targets" } };

  var ROADMAP = "Bu amal keyingi bosqichda ulanadi";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function haptic(kind) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (kind === "select") tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.impactOccurred(kind || "light");
    } catch (e) { /* eski klient */ }
  }

  /* ---------------------------------------------------------------- Mavzu */
  function prefs() {
    try { return JSON.parse(localStorage.getItem("bw.prefs") || "{}"); } catch (e) { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem("bw.prefs", JSON.stringify(p)); } catch (e) { /* xususiy rejim */ }
  }
  function applyTheme() {
    var mode = prefs().theme || "auto";
    var scheme = mode === "auto" ? (tg && tg.colorScheme ? tg.colorScheme : "dark") : mode;
    document.documentElement.setAttribute("data-bw-theme", scheme === "light" ? "light" : "dark");
    var color = scheme === "light" ? "#e3ebf8" : "#0a1222";
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast("6.1")) {
      try { tg.setHeaderColor(color); tg.setBackgroundColor(color); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------------------------------------------------------- Toast va sheet */
  function toast(text, iconName) {
    var host = $("#toasts");
    var el = document.createElement("div");
    el.className = "bw-toast";
    el.innerHTML = icon(iconName || "info", "bw-icon--sm") + "<span>" + esc(text) + "</span>";
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function openSheet(html, refresh) {
    var wasOpen = $("#sheet").classList.contains("is-open");
    app.sheetRefresh = refresh || null;
    $("#sheet-body").innerHTML = html;
    $("#sheet").classList.add("is-open");
    $("#sheet").setAttribute("aria-hidden", "false");
    $("#sheet-backdrop").classList.add("is-open");
    if (tg && tg.BackButton) tg.BackButton.show();
    if (!wasOpen) haptic("light");
  }
  function closeSheet() {
    app.sheetRefresh = null;
    $("#sheet").classList.remove("is-open");
    $("#sheet").setAttribute("aria-hidden", "true");
    $("#sheet-backdrop").classList.remove("is-open");
    if (tg && tg.BackButton) tg.BackButton.hide();
  }

  /* ---------------------------------------------------------------- Yuqori panel */
  function renderTop() {
    var p = app.state.player, cfg = app.config;
    $("#top-name").textContent = p.name;
    $("#top-level").textContent = p.level + "-daraja";
    $("#top-gem-val").textContent = G.fmtShort(app.state.resources.moonstone || 0);
    var tier = G.maxTier(cfg, p.level);
    var av = $("#top-avatar");
    av.className = "bw-avatar bw-avatar--sm bw-tier-" + tier;
    av.innerHTML = icon("wolf");
    var xp = G.xpProgress(cfg, p.level, p.xp);
    $("#top-xp-bar").style.width = Math.round(xp.ratio * 100) + "%";
    $("#top-xp").textContent = p.level >= 25 ? "MAKS" : G.fmt(xp.into) + " / " + G.fmt(xp.need) + " XP";

    renderResources();

    var banner = $("#demo-banner");
    if (app.mode === "demo") {
      banner.hidden = false;
      banner.innerHTML = icon("info", "bw-icon--sm") + "<span>Demo rejim · v" + window.BWApi.VERSION +
        (app.reason === "no-telegram" ? " — Telegram orqali oching" : " — namuna maʼlumotlar") + "</span>";
    } else {
      banner.hidden = true;
    }

    var daily = (app.state.quests && app.state.quests.daily) || [];
    var ready = daily.filter(function (q) { return q.progress >= q.target && !q.done; }).length;
    var badge = $("#quest-badge");
    badge.hidden = !ready;
    badge.textContent = ready;
  }

  /* ---------------------------------------------------------------- Resurslar */
  function resMeta(key) { return G.RESOURCES.filter(function (r) { return r.key === key; })[0]; }

  function buildingLevel(type) {
    var b = (app.state.buildings || []).filter(function (x) { return x.type === type; })[0];
    return b ? b.level || 0 : 0;
  }

  function allocation() {
    return app.econ.alloc;
  }

  /** Qoʻshin hajmi (inda + yurishda): oziqlanish va sigʻim shundan. */
  function totalArmy() {
    if (app.econ) return app.econ.army || 0;
    var n = 0;
    G.ROLES.forEach(function (r) { n += armyCount(r.key) + armyCount(r.key, true); });
    return n;
  }

  /** Bitta resurs boʻyicha hisoblangan koʻrsatkichlar (panel va maʼlumot oynasi uchun). */
  function resourceFacts(key) {
    var cfg = app.config, p = app.state.player, r = resMeta(key);
    var amount = (app.state.resources || {})[key] || 0;
    var f = { amount: amount, meta: r };
    if (r.group === "food") {
      var cave = buildingLevel("food_cave");
      f.cave = cave;
      f.cap = Math.round(G.caveCap(cfg, cave));
      f.fill = Math.min(1, amount / f.cap);
      var army = totalArmy();
      if (key === "meat") {
        f.perDay = G.need(cfg, p.level) * army;
        f.days = f.perDay > 0 ? amount / f.perDay : null;
        f.perHunt = Math.max(1, armyCount("hunter")) * G.hunterYield(cfg, p.level, 1) * cfg.hunt_duration_min / 60;
      } else if (key === "water") {
        f.perHour = G.waterPerHour(cfg, cave);
        f.perDay = G.waterNeed(cfg, p.level) * army;
      } else if (key === "moonlight") {
        f.perHour = p.level >= cfg.moonlight_need_level ? cfg.moonlight_passive_base * army : 0;
        f.perDay = p.level >= cfg.moonlight_need_level ? cfg.moonlight_need * army : 0;
      }
    } else if (r.group === "build") {
      var ws = buildingLevel("workshop");
      f.share = allocation()[key] || 0;
      f.perHour = G.workshopPerHour(cfg, ws) * f.share / 100;
      f.buf = app.econ.buf[key] || 0;
      f.bufCap = G.bufferCap(cfg, ws, f.share, false);
      f.bufFill = f.bufCap > 0 ? Math.min(1, f.buf / f.bufCap) : 0;
      f.workshop = ws;
    }
    return f;
  }

  function fmtRate(n) {
    if (!n) return "0";
    return n < 10 ? n.toFixed(1).replace(".", ",") : G.fmt(n);
  }

  function renderResources() {
    var p = app.state.player;
    var food = G.RESOURCES.filter(function (r) { return r.group === "food" && (!r.fromLevel || p.level >= r.fromLevel); });
    var build = G.RESOURCES.filter(function (r) { return r.group === "build"; });
    var cell = function (r, wide) {
      var f = resourceFacts(r.key);
      var cls = "bw-rescell bw-rescell--" + r.key + (wide ? " bw-rescell--wide" : "");
      if (f.fill != null && f.fill >= 1) cls += " is-full";
      if (r.key === "meat" && f.days != null && f.days < 1) cls += " is-low";
      if (f.bufFill >= 0.9) cls += " is-ready";
      return '<button class="' + cls + '" type="button" data-res="' + r.key + '" aria-label="' + esc(r.name) + ": " + G.fmt(f.amount) + '">' +
        icon(r.icon) + '<span class="bw-rescell__val">' + G.fmtShort(f.amount) + "</span>" +
        (f.fill != null ? '<i class="bw-rescell__fill" style="--fill:' + f.fill.toFixed(3) + '"></i>' : "") + "</button>";
    };
    $("#res-bar").innerHTML = food.map(function (r) { return cell(r, food.length === 3); }).join("") +
      build.map(function (r) { return cell(r, false); }).join("");
  }

  function stat(value, label) {
    return '<div class="bw-stat"><span class="bw-stat__value">' + value + '</span><span class="bw-stat__label">' + esc(label) + "</span></div>";
  }

  function resourceSheet(key) {
    var cfg = app.config, p = app.state.player;
    var f = resourceFacts(key), r = f.meta;
    var groupName = { food: "Oziq resursi", build: "Qurilish resursi", premium: "Premium valyuta" }[r.group];
    var unit = r.unit ? " " + r.unit : "";
    var html = '<div class="bw-resinfo" style="--bw-rc: var(--bw-res-' + key + ')">';
    html += '<div class="bw-resinfo__head"><span class="bw-resinfo__icon">' + icon(r.icon) + '</span><div class="bw-grow">' +
      '<div class="bw-eyebrow">' + esc(groupName) + '</div><div class="bw-h2">' + esc(r.name) + "</div></div>" +
      '<div style="text-align:right"><div class="bw-resinfo__amount">' + G.fmt(f.amount) + '</div><div class="bw-faint" style="font-size:12px">' +
      (r.group === "food" ? "/ " + G.fmt(f.cap) + unit : r.group === "build" ? "ombor cheklanmagan" : "oy toshi") + "</div></div></div>";

    var stats = [], note = "";
    if (key === "moonlight" && p.level < cfg.moonlight_need_level) {
      note = "Oy nuri " + cfg.moonlight_need_level + "-darajadan kerak boʻladi (mifologik boʻrilar).";
    }
    if (r.group === "food") {
      html += '<div class="bw-progress' + (f.fill >= 1 ? " bw-progress--accent" : "") + '" style="margin-top:14px"><div class="bw-progress__bar" style="width:' +
        Math.round(f.fill * 100) + '%;background:var(--bw-rc)"></div></div>' +
        '<div class="bw-between bw-faint" style="font-size:12px;margin-top:6px"><span>' + (f.cave ? "Oziq gʻori " + f.cave + "-daraja" : "Oziq gʻori hali yoʻq") +
        "</span><span>" + Math.round(f.fill * 100) + "% toʻla</span></div>";
      if (f.fill >= 1) note = "Ombor toʻla — sigʻimdan ortiq kelgan " + r.name.toLowerCase() + " saqlanmaydi. Oziq gʻorini kuchaytiring.";
    }
    if (key === "meat") {
      stats = [stat(G.fmt(f.perDay) + " kg", "Kunlik sarf"), stat(f.days == null ? "∞" : fmtRate(f.days) + " kun", "Zaxira yetadi"),
        stat("~" + G.fmt(f.perHunt) + " kg", "Bir ov (1 soat)"), stat(G.fmt(f.cap) + " kg", "Sigʻim")];
      if (f.days != null && f.days < 1) note = "Goʻsht bir kunga ham yetmaydi! Tugasa ochlik boshlanadi: CP −30%, ishlab chiqarish −50%.";
    } else if (key === "water") {
      var net = f.perHour * 24 - f.perDay;
      stats = [stat("+" + fmtRate(f.perHour) + "/soat", "Passiv yigʻim"), stat(G.fmt(f.perDay), "Kunlik sarf"),
        stat((net >= 0 ? "+" : "") + fmtRate(net), "Kunlik balans"), stat(G.fmt(f.cap), "Sigʻim")];
      if (net < 0) note = "Suv yetishmayapti — yurish tezligi −20%. Oziq gʻorini kuchaytiring.";
    } else if (key === "herb") {
      stats = [stat(Math.round(cfg.hunt_herb_share * 100) + "%", "Ovdan keladi"), stat(cfg.heal_herb_per_tier + " × tier", "Davolash (1 boʻri)")];
    } else if (key === "moonlight") {
      stats = [stat("+" + fmtRate(f.perHour) + "/soat", "Passiv"), stat(fmtRate(f.perDay), "Kunlik ehtiyoj")];
    } else if (r.group === "build") {
      stats = [stat('<span data-live="buf-' + key + '">' + G.fmt(f.buf) + "</span> / " + G.fmt(f.bufCap), "Buferda"),
        stat(f.share + "%", "Taqsimotdagi ulush"), stat(fmtRate(f.perHour) + "/soat", "Ishlab chiqarish"), stat(G.fmt(f.perHour * 24), "Kuniga")];
      if (!f.workshop) note = "Ustaxona qoyasi 2-darajada ochiladi.";
      else if (f.bufFill >= 1) note = "Bufer toʻla — " + r.name.toLowerCase() + " ishlab chiqarilmayapti. Yigʻib oling.";
    } else if (key === "moonstone") {
      stats = [stat(G.fmt(cfg.moonstone_per_usd) + " = $1", "Kurs"), stat("≤ " + Math.round(24 * cfg.speedup_daily_cap) + " soat", "Kunlik tezlashtirish")];
    }
    if (stats.length) html += '<div class="bw-grid-2" style="margin-top:14px">' + stats.join("") + "</div>";
    if (note) html += '<div class="bw-banner" style="margin-top:12px">' + icon("info", "bw-icon--sm") + "<span>" + esc(note) + "</span></div>";

    html += '<div class="bw-eyebrow" style="margin-top:18px">Qayerdan keladi</div><ul class="bw-resinfo__list">' +
      r.from.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    html += '<div class="bw-eyebrow" style="margin-top:14px">Nimaga kerak</div><ul class="bw-resinfo__list">' +
      r.use.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";

    if (r.group === "build" && f.workshop) {
      html += '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:18px" data-action="collect">' + icon("download", "bw-icon--sm") + " Yigʻib olish</button>";
    }
    var action = { meat: ["hunt", "paw", "Ovga chiqish"], herb: ["hunt", "paw", "Ovga chiqish"], moonstone: ["shop", "moonstone", "Doʻkon"] }[key] ||
      (r.group === "build" ? ["goto-alloc", "workshop", "Ustaxona taqsimoti"] : r.group === "food" ? ["goto-cave", "cave", "Oziq gʻori"] : null);
    if (action) html += '<button class="bw-btn bw-btn--soft bw-btn--block" style="margin-top:18px" data-action="' + action[0] + '">' + icon(action[1], "bw-icon--sm") + " " + action[2] + "</button>";
    html += "</div>";
    openSheet(html);
  }

  /* ---------------------------------------------------------------- Yordamchilar */
  function buildingList() {
    var p = app.state.player;
    var byType = {};
    (app.state.buildings || []).forEach(function (b) { byType[b.type] = b; });
    return G.BUILDING_ORDER.map(function (type) {
      var meta = G.BUILDINGS[type];
      var b = byType[type] || {};
      var level = type === "den" ? p.level : (b.level || 0);
      return { type: type, meta: meta, level: level, locked: p.level < meta.unlock, queue: queueFor(type) };
    });
  }

  function costChips(cost) {
    var keys = Object.keys(cost);
    if (!keys.length) return '<span class="bw-chip">Bepul</span>';
    var res = app.state.resources;
    return keys.map(function (k) {
      var r = G.RESOURCES.filter(function (x) { return x.key === k; })[0];
      var enough = (res[k] || 0) >= cost[k];
      return '<span class="bw-chip ' + (enough ? "" : "bw-chip--danger") + '">' + icon(r.icon, "bw-icon--sm") + " " + G.fmt(cost[k]) + "</span>";
    }).join("");
  }

  /** Rol boʻyicha askarlar: inda (yoki away = true — yurishda). */
  function armyCount(role, away) {
    var a = ((away ? app.state.army_away : app.state.army) || {})[role] || [];
    return a.reduce(function (s, n) { return s + n; }, 0);
  }

  function sectionTitle(text, right) {
    return '<div class="section-title"><span class="bw-eyebrow">' + esc(text) + "</span>" + (right || "") + "</div>";
  }

  function lockedCard(iconName, title, text) {
    return '<div class="bw-card bw-card--flat bw-empty">' + icon(iconName) +
      '<div class="bw-h3" style="color:var(--bw-text)">' + esc(title) + '</div><p class="bw-muted" style="margin:6px 0 0">' + esc(text) + "</p></div>";
  }

  /* ---------------------------------------------------------------- 🏔 In */
  function screenIn() {
    var p = app.state.player, cfg = app.config;
    var army = totalArmy();
    var dailyNeed = G.need(cfg, p.level) * army;

    var html = "";
    html += '<section class="den-hero"><div class="den-hero__stars"></div>' +
      '<div class="den-hero__text"><div class="bw-eyebrow" style="color:#9fd3ff">In · ' + p.level + '-daraja</div>' +
      '<h1 class="bw-h2" style="margin-top:6px">Toʻdang uxlamaydi</h1>' +
      '<p style="margin:8px 0 0;color:#c3cde4;font-size:13px">Qoʻshin: <b class="bw-num">' + army + " / " + G.armyCap(cfg, p.level) +
      "</b> · kunlik goʻsht: <b class=\"bw-num\">" + G.fmt(dailyNeed) + " kg</b></p></div>" +
      '<svg class="den-hero__wolf"><use href="#bw-i-wolf"/></svg></section>';


    html += queueSection();

    html += sectionTitle("Binolar", '<span class="bw-faint" style="font-size:12px">' + buildingList().filter(function (b) { return !b.locked; }).length + " / 9</span>");
    html += '<div class="bw-grid-3 bw-grid-3--wide">' + buildingList().map(function (b) {
      return '<button class="bw-card bw-card--tap bw-building' + (b.locked ? " bw-building--locked" : "") + '" data-building="' + b.type + '" type="button">' +
        (b.locked ? '<span class="bw-building__lock">' + icon("lock", "bw-icon--sm") + "</span>" : "") +
        '<span class="bw-building__icon">' + icon(b.meta.icon, "bw-icon--lg") + '</span>' +
        '<span class="bw-building__name">' + esc(b.meta.name) + "</span>" +
        (!b.locked && !b.queue && upgradeCheck(b).ok ? '<span class="bw-building__up" title="Kuchaytirish mumkin">' + icon("plus", "bw-icon--sm") + "</span>" : "") +
        '<span class="bw-building__lvl">' + (b.locked
          ? '<span class="bw-faint" style="font-size:11px">' + b.meta.unlock + "-darajada</span>"
          : b.queue
            ? '<span class="bw-chip bw-chip--accent">' + icon("clock", "bw-icon--sm") + ' <span data-live="q-' + b.queue.id + '">' + timeLeft(b.queue) + "</span></span>"
            : '<span class="bw-chip bw-chip--primary">' + b.level + "-daraja</span>") + "</span></button>";
    }).join("") + "</div>";

    html += workshopSection();
    return html;
  }

  /* ---------------------------------------------------------------- Ustaxona: bufer va taqsimot */
  function workshopSection() {
    var cfg = app.config, ws = buildingLevel("workshop");
    var prodHour = G.workshopPerHour(cfg, ws), alloc = allocation();
    var html = sectionTitle("Ustaxona qoyasi", '<span class="bw-chip">' + (ws ? G.fmt(prodHour) + "/soat" : "2-darajada") + "</span>");
    if (!ws) return html + lockedCard("workshop", "Ustaxona hali yoʻq", "2-darajada Ustaxona qoyasi ochiladi: tosh, shox-shabba, teri va suyak oʻzi yigʻiladi.");

    html += '<div class="bw-card workshop" id="workshop">';
    html += G.BUILD.map(function (k) {
      var f = resourceFacts(k), r = f.meta;
      return '<div class="buf-row" style="--bw-rc: var(--bw-res-' + k + ')"><span class="buf-row__icon">' + icon(r.icon) + "</span>" +
        '<div class="bw-grow"><div class="bw-between"><span class="buf-row__name">' + esc(r.name) + '</span><span class="bw-num buf-row__val"><b data-live="buf-' + k + '">' +
        G.fmt(f.buf) + '</b><span class="bw-faint"> / ' + G.fmt(f.bufCap) + '</span></span></div><div class="bw-progress bw-progress--sm"><div class="bw-progress__bar" data-live="bar-' + k +
        '" style="width:' + Math.round(f.bufFill * 100) + '%;background:var(--bw-rc)"></div></div></div></div>';
    }).join("");
    html += '<div class="workshop__foot"><span class="bw-faint" data-live="buf-status">' + esc(bufferStatus()) + "</span>" +
      '<button class="bw-btn bw-btn--accent bw-btn--sm" data-action="collect" data-live="collect">' + collectLabel() + "</button></div></div>";

    html += sectionTitle("Taqsimot", '<span class="bw-faint" style="font-size:12px">' + (app.mode === "live" ? "serverda saqlanadi" : "demo: qurilmada") + "</span>");
    html += '<div class="bw-card bw-stack" id="alloc">' + G.BUILD.map(function (k) {
      var r = resMeta(k);
      return '<div class="bw-stack" style="gap:4px"><span class="bw-between"><span class="bw-res bw-res--' + k + '" style="height:26px">' +
        '<span class="bw-res__dot">' + icon(r.icon) + "</span>" + esc(r.name) + '</span><span class="bw-num" data-alloc-out="' + k + '">' +
        alloc[k] + "% · " + G.fmt(prodHour * alloc[k] / 100) + "/soat</span></span>" +
        '<span class="bw-slider"><button class="bw-btn bw-btn--soft bw-btn--sm bw-btn--icon" type="button" data-alloc-step="-1" aria-label="Kamaytirish">−</button>' +
        '<input class="bw-range" type="range" min="0" max="100" step="5" value="' + alloc[k] + '" data-alloc="' + k + '">' +
        '<button class="bw-btn bw-btn--soft bw-btn--sm bw-btn--icon" type="button" data-alloc-step="1" aria-label="Koʻpaytirish">+</button></span></div>';
    }).join("") + '<p class="bw-faint" style="margin:0;font-size:12px">Yigʻindi har doim 100%. Bufer sigʻimi ulushga bogʻliq: ' + cfg.workshop_buffer_h +
      " soatlik ishlab chiqarish (oflaynda ×" + cfg.offline_store_mult + ").</p></div>";
    return html;
  }

  function bufferTotal() {
    return G.BUILD.reduce(function (sum, k) { return sum + Math.floor(app.econ.buf[k] || 0); }, 0);
  }

  function collectLabel() {
    var n = bufferTotal();
    return icon("download", "bw-icon--sm") + " Yigʻish" + (n ? " +" + G.fmtShort(n) : "");
  }

  /** Bufer holati: qaysi resurs toʻla yoki qachon toʻladi. */
  function bufferStatus() {
    var cfg = app.config, ws = buildingLevel("workshop"), prodHour = G.workshopPerHour(cfg, ws);
    var full = [], soonest = null;
    G.BUILD.forEach(function (k) {
      var share = app.econ.alloc[k] || 0;
      if (!share) return;
      var cap = G.bufferCap(cfg, ws, share, false), buf = app.econ.buf[k] || 0;
      if (buf >= cap - 1e-6) { full.push(resMeta(k).short); return; }
      var hours = (cap - buf) / (prodHour * share / 100);
      if (soonest == null || hours < soonest.h) soonest = { h: hours, name: resMeta(k).short };
    });
    if (full.length === G.BUILD.length || (full.length && !soonest)) return "Bufer toʻla — ishlab chiqarish toʻxtadi";
    if (full.length) return full.join(", ") + " toʻla — yigʻib oling";
    return soonest ? soonest.name + " toʻlishiga: " + G.fmtMinutes(soonest.h * 60) : "";
  }

  var allocTimer = null;
  function bindAlloc() {
    var box = $("#alloc");
    if (!box) return;
    box.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-alloc");
      if (!k) return;
      var alloc = Object.assign({}, allocation());
      alloc[k] = +e.target.value;
      // Qolganlarini mutanosib moslab, yigʻindini 100 ga keltirish
      var others = Object.keys(alloc).filter(function (x) { return x !== k; });
      var rest = 100 - alloc[k];
      var sum = others.reduce(function (s, x) { return s + alloc[x]; }, 0);
      var acc = 0;
      others.forEach(function (x, i) {
        var part = sum ? alloc[x] / sum * rest : rest / others.length;
        alloc[x] = i === others.length - 1 ? rest - acc : Math.round(part / 5) * 5;
        if (i < others.length - 1) acc += alloc[x];
      });
      if (!G.validAlloc(alloc)) return;
      setAllocation(alloc);
      var prodHour = G.workshopPerHour(app.config, buildingLevel("workshop"));
      Object.keys(alloc).forEach(function (x) {
        box.querySelector('[data-alloc="' + x + '"]').value = alloc[x];
        box.querySelector('[data-alloc-out="' + x + '"]').textContent = alloc[x] + "% · " + G.fmt(prodHour * alloc[x] / 100) + "/soat";
      });
    });
    box.addEventListener("change", function () {
      // Slayder qoʻyib yuborilganda: bufer sigʻimlari yangi ulushga moslanadi
      var w = $("#workshop");
      if (w && w.parentNode) render();
    });
  }

  /** Yangi taqsimot shu paytdan amal qiladi: avval eskisi boʻyicha hisob yopiladi. */
  function setAllocation(alloc) {
    app.econ = G.advance(app.config, app.econ, now());
    app.econ.alloc = alloc;
    if (app.mode === "demo") { saveDemo(); return; }
    clearTimeout(allocTimer);
    allocTimer = setTimeout(function () {
      window.BWApi.request("profile/allocation", { method: "POST", body: alloc }).then(applySnapshot, function (err) {
        toast("Taqsimot saqlanmadi: " + (err.message || "xato"), "info");
        resync();
      });
    }, 700);
  }

  function buildingSheet(type) {
    var b = buildingList().filter(function (x) { return x.type === type; })[0];
    var p = app.state.player, cfg = app.config;
    var html = '<div class="bw-inline" style="gap:14px;margin-bottom:12px"><span class="bw-building__icon" style="width:56px;height:56px">' +
      icon(b.meta.icon, "bw-icon--lg") + '</span><div><div class="bw-h2">' + esc(b.meta.name) + '</div><div class="bw-muted">' +
      (b.locked ? b.meta.unlock + "-darajada ochiladi" : b.level + "-daraja") + "</div></div></div>";
    html += '<p class="bw-muted" style="margin:0 0 14px">' + esc(b.meta.about) + "</p>";

    if (b.meta.auto) {
      html += '<div class="bw-banner">' + icon("info", "bw-icon--sm") + "<span>In darajasi oʻyinchi darajasi bilan avtomatik oshadi — navbat va narx yoʻq. Mashq tezligi: ×" +
        (1 + cfg.den_speed_coef * (p.level - 1)).toFixed(2) + "</span></div>";
    } else if (b.locked) {
      html += '<div class="bw-banner">' + icon("lock", "bw-icon--sm") + "<span>" + b.meta.unlock + "-darajaga yeting — bino 1-darajada bepul paydo boʻladi.</span></div>";
    } else {
      var next = b.level + 1, check = upgradeCheck(b);
      if (b.queue) {
        html += queueCard(b.queue, true);
      } else if (next > p.level) {
        html += '<div class="bw-banner">' + icon("info", "bw-icon--sm") + "<span>Bino oʻyinchi darajasidan oshmaydi. Keyingi daraja — " + next + "-darajada.</span></div>";
      } else {
        html += '<div class="bw-eyebrow" style="margin-bottom:8px">' + next + "-darajaga koʻtarish</div>";
        html += '<div class="cost-row">' + costChips(G.buildingCost(cfg, type, next)) +
          '<span class="bw-chip">' + icon("clock", "bw-icon--sm") + " " + G.fmtMinutes(G.buildingTime(cfg, type, next)) + "</span></div>";
        html += upgradeEffect(type, b.level, next);
      }
      if (type === "workshop") {
        html += '<div class="bw-grid-2" style="margin-top:14px">' + stat(G.fmt(G.workshopPerHour(cfg, b.level)) + "/soat", "Ishlab chiqarish") +
          stat('<span data-live="buf-total">' + G.fmt(bufferTotal()) + "</span>", "Buferda") + "</div>" +
          '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:12px" data-action="collect">' + icon("download", "bw-icon--sm") + " Yigʻib olish</button>";
      }
      var role = G.ROLES.filter(function (r) { return r.building === type; })[0];
      if (role) html += trainPanel(role, b);
      if (!b.queue) {
        html += '<button class="bw-btn bw-btn--block" style="margin-top:18px" data-action="upgrade" data-type="' + type + '"' + (check.ok ? "" : " disabled") + ">" +
          icon("plus", "bw-icon--sm") + " Kuchaytirish</button>";
        if (!check.ok && next <= p.level) html += '<p class="bw-faint" style="margin:8px 0 0;font-size:12px;text-align:center">' + esc(check.reason) + "</p>";
      }
    }
    openSheet(html, function () { buildingSheet(type); });
  }

  /* ---------------------------------------------------------------- ⚔️ Jang */
  function screenJang() {
    var p = app.state.player, cfg = app.config;
    var html = '<div class="screen-title"><h1 class="bw-h2">Jang</h1><span class="bw-chip">' + icon("shield", "bw-icon--sm") +
      (p.level <= cfg.shield_newbie_level ? " Qalqon: " + cfg.shield_newbie_level + "-darajagacha" : " Qalqon yoʻq") + "</span></div>";

    if (p.level < cfg.bot_unlock_level) {
      return html + lockedCard("swords", cfg.bot_unlock_level + "-darajada ochiladi", "Toʻda paydo boʻlgach yovvoyi toʻdalarga hujum qilasiz, " +
        (cfg.shield_newbie_level + 1) + "-darajadan — haqiqiy oʻyinchilarga.");
    }

    var seg = app.seg.jang;
    html += '<div class="bw-seg" role="tablist">' + [["targets", "Raqiblar"], ["log", "Jurnal"]].map(function (s) {
      return '<button class="bw-seg__btn" role="tab" data-seg="' + s[0] + '" aria-selected="' + (seg === s[0]) + '">' + s[1] + "</button>";
    }).join("") + "</div>";

    if (seg === "log") {
      return html + lockedCard("scroll", "Hali jang boʻlmagan", "Kelgan va ketgan hujumlar, raund-raund hisobot shu yerda chiqadi.");
    }

    var band = { weak: ["Kuchsiz", "bw-chip--success"], even: ["Teng", "bw-chip--primary"], strong: ["Kuchli", "bw-chip--danger"] };
    html += '<p class="bw-muted" style="margin:12px 0 0;font-size:13px">' + (p.level <= cfg.shield_newbie_level
      ? "Siz hali qalqon ostidasiz — roʻyxatda faqat yovvoyi toʻdalar (botlar). Ular mavsum reytingiga kirmaydi."
      : "Server taklif qilgan 9 ta raqib (−1, teng, +1 daraja). Roʻyxat 30 daqiqada yangilanadi.") + "</p>";
    html += '<div class="bw-stack" style="margin-top:12px">' + (app.state.targets || []).map(function (t) {
      var march = t.km / cfg.march_speed * 60;
      return '<div class="bw-card bw-card--flat target"><span class="bw-avatar bw-avatar--sm bw-tier-' + Math.min(6, Math.max(1, Math.floor(t.level / 4))) + '">' +
        icon(t.bot ? "paw" : "wolf") + '</span><div class="bw-grow"><div class="bw-row__title">' + esc(t.name) +
        (t.bot ? ' <span class="bw-faint" style="font-size:11px">· bot</span>' : "") + '</div><div class="bw-inline" style="gap:6px;margin-top:4px">' +
        '<span class="bw-chip">' + t.level + '-d.</span><span class="bw-chip ' + band[t.band][1] + '">' + band[t.band][0] + "</span>" +
        '<span class="bw-chip">' + t.km + " km · " + G.fmtMinutes(march) + '</span></div></div><div class="target__actions">' +
        '<button class="bw-btn bw-btn--soft bw-btn--sm bw-btn--icon" data-action="scout" aria-label="Razvedka">' + icon("eye", "bw-icon--sm") + "</button>" +
        '<button class="bw-btn bw-btn--sm bw-btn--icon" data-action="attack" aria-label="Hujum">' + icon("sword", "bw-icon--sm") + "</button></div></div>";
    }).join("") + "</div>";
    return html;
  }

  /* ---------------------------------------------------------------- 🐺 Toʻda */
  function screenToda() {
    var p = app.state.player, cfg = app.config;
    var html = '<div class="screen-title"><h1 class="bw-h2">Toʻda</h1><span class="bw-chip bw-chip--accent">Klan — v2</span></div>';
    if (p.level < cfg.pack_unlock_level) {
      return html + lockedCard("pack", cfg.pack_unlock_level + "-darajada ochiladi", "Yolgʻiz boʻri omon qolmaydi. 4-darajada toʻdang ochiladi.");
    }
    html += '<p class="bw-muted" style="margin:0">Ov guruhlari endi <a href="#/ov">Ov</a> boʻlimida.</p>';
    html += sectionTitle("Klan");
    html += lockedCard("lock", "Rasmiy klanlar — v2", "Aʼzolik, lavozimlar, xazina, toʻda urushi va oazislar MVP dan keyin qoʻshiladi.");
    return html;
  }

  /* ---------------------------------------------------------------- 📋 Vazifalar */
  function questCard(q) {
    var ratio = Math.min(1, q.progress / q.target);
    var ready = q.progress >= q.target && !q.done;
    return '<div class="bw-card bw-card--flat"><div class="bw-between"><div class="bw-grow"><div class="bw-row__title">' + esc(q.title) +
      (q.done ? ' <span class="bw-chip bw-chip--success" style="margin-left:4px">' + icon("check", "bw-icon--sm") + " olindi</span>" : "") +
      '</div><div class="bw-row__sub">' + esc(q.desc) + '</div></div><span class="bw-num bw-muted">' + Math.min(q.progress, q.target) + "/" + q.target + "</span></div>" +
      '<div class="bw-progress ' + (ratio >= 1 ? "bw-progress--success" : "") + '" style="margin:10px 0 8px"><div class="bw-progress__bar" style="width:' +
      Math.round(ratio * 100) + '%"></div></div><div class="bw-between"><span class="bw-chip bw-chip--accent">' + icon("gift", "bw-icon--sm") + " " +
      esc(q.reward) + "</span>" + (ready ? '<button class="bw-btn bw-btn--sm" data-action="claim">Olish</button>' : "") + "</div></div>";
  }

  function screenVazifalar() {
    var q = app.state.quests || { daily: [], weekly: [] };
    var html = '<div class="screen-title"><h1 class="bw-h2">Vazifalar</h1><span class="bw-faint" style="font-size:12px">Mukofot vaqt tejaydi, kuch bermaydi</span></div>';
    html += sectionTitle("Kundalik", '<span class="bw-chip">' + icon("clock", "bw-icon--sm") + " 00:00 da yangilanadi</span>");
    html += q.daily.length ? '<div class="bw-stack">' + q.daily.map(questCard).join("") + "</div>" : lockedCard("quest", "Vazifalar tez orada", "Kundalik va haftalik vazifalar keyingi bosqichda ulanadi.");
    if (q.weekly.length) {
      html += sectionTitle("Haftalik", '<span class="bw-chip">Dushanba</span>');
      html += '<div class="bw-stack">' + q.weekly.map(questCard).join("") + "</div>";
    }
    return html;
  }

  /* ---------------------------------------------------------------- 👤 Profil */
  function screenProfil() {
    var p = app.state.player, cfg = app.config;
    var army = 0;
    G.ROLES.forEach(function (r) { army += armyCount(r.key); });
    var tierMax = G.maxTier(cfg, p.level);
    var html = '<div class="bw-card bw-card--glow"><div class="bw-inline" style="gap:14px"><span class="bw-avatar bw-avatar--lg bw-tier-' + tierMax + '">' +
      icon("wolf", "bw-icon--xl") + '</span><div class="bw-grow"><div class="bw-h2">' + esc(p.name) + '</div><div class="bw-muted">' +
      (p.username ? "@" + esc(p.username) + " · " : "") + p.level + "-daraja</div></div></div>" +
      '<div class="bw-grid-3" style="margin-top:14px"><div class="bw-stat"><span class="bw-stat__value">' + G.fmt(p.xp) + '</span><span class="bw-stat__label">XP</span></div>' +
      '<div class="bw-stat"><span class="bw-stat__value">' + army + '</span><span class="bw-stat__label">Askar</span></div>' +
      '<div class="bw-stat"><span class="bw-stat__value">' + tierMax + '</span><span class="bw-stat__label">Maks tier</span></div></div></div>';

    html += sectionTitle("Qoʻshin", '<span class="bw-chip">' + army + " / " + G.armyCap(cfg, p.level) + "</span>");
    html += '<div class="bw-card" style="padding:10px 12px;overflow-x:auto"><table class="army-table"><thead><tr><th>Rol</th>' +
      G.TIERS.map(function (t, i) { return "<th title=\"" + t + "\">T" + (i + 1) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      G.ROLES.map(function (r) {
        var counts = (app.state.army || {})[r.key] || [];
        return '<tr><td><span class="bw-role bw-role--' + r.key + '"><span class="bw-role__dot"></span>' + esc(r.name) + "</span></td>" +
          G.TIERS.map(function (_, i) {
            return i + 1 > tierMax ? '<td class="is-locked">' + icon("lock", "bw-icon--sm") + "</td>" : '<td class="bw-num">' + (counts[i] || 0) + "</td>";
          }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";

    var pr = prefs();
    var themeName = { auto: "Telegram boʻyicha", dark: "Tungi", light: "Kunduzgi" }[pr.theme || "auto"];
    html += sectionTitle("Sozlamalar");
    html += '<div class="bw-card bw-list" style="padding:0 16px">' +
      '<div class="bw-row bw-row--tap" data-action="theme">' + icon("palette") + '<div class="bw-row__main"><div class="bw-row__title">Mavzu</div><div class="bw-row__sub">' + themeName + "</div></div>" + icon("chevron", "bw-icon--sm") + "</div>" +
      '<div class="bw-row">' + icon("globe") + '<div class="bw-row__main"><div class="bw-row__title">Til</div><div class="bw-row__sub">Oʻzbekcha · ru, en — keyinroq</div></div></div>' +
      '<label class="bw-row">' + icon("bell") + '<div class="bw-row__main"><div class="bw-row__title">Bildirishnomalar</div><div class="bw-row__sub">Telegram bot orqali, kuniga koʻpi bilan 6 ta</div></div>' +
      '<span class="bw-switch"><input type="checkbox" data-action="notify"' + (pr.notify !== false ? " checked" : "") + "><span></span></span></label>" +
      '<div class="bw-row bw-row--tap" data-action="vacation">' + icon("moon") + '<div class="bw-row__main"><div class="bw-row__title">Taʼtil rejimi</div><div class="bw-row__sub">Oyiga ' + cfg.vacation_free_h + " soat bepul</div></div>" + icon("chevron", "bw-icon--sm") + "</div></div>";

    html += sectionTitle("Ilova haqida");
    html += '<div class="bw-card bw-list" style="padding:0 16px">' +
      '<div class="bw-row">' + icon("info") + '<div class="bw-row__main"><div class="bw-row__title">Versiya</div><div class="bw-row__sub">v' + window.BWApi.VERSION + " · " +
      (app.mode === "live" ? "server bilan" : "demo rejim") + "</div></div></div>" +
      '<a class="bw-row" href="ui/" style="color:inherit;text-decoration:none">' + icon("palette") + '<div class="bw-row__main"><div class="bw-row__title">BlueWolf UI</div><div class="bw-row__sub">Dizayn tizimi koʻrgazmasi</div></div>' + icon("chevron", "bw-icon--sm") + "</a>" +
      (app.mode === "demo" ? '<div class="bw-row bw-row--tap" data-action="demo-reset">' + icon("clock") + '<div class="bw-row__main"><div class="bw-row__title">Demoni qaytadan boshlash</div><div class="bw-row__sub">Resurslar boshlangʻich holatga qaytadi</div></div></div>' : "") +
      (installPrompt ? '<div class="bw-row bw-row--tap" data-action="install">' + icon("download") + '<div class="bw-row__main"><div class="bw-row__title">Ilovani oʻrnatish</div><div class="bw-row__sub">Bosh ekranga qoʻshish (PWA)</div></div></div>' : "") +
      "</div>";
    return html;
  }

  /* ---------------------------------------------------------------- Askarlar va ov */
  function roleMeta(key) { return G.ROLES.filter(function (r) { return r.key === key; })[0]; }
  function trainQueues() { return (app.state.queues || []).filter(function (q) { return q.kind === "train"; }); }
  function huntMarch() { return (app.state.marches || []).filter(function (m) { return m.kind === "hunt"; })[0] || null; }
  function queuedTrain() { return trainQueues().reduce(function (s, q) { return s + q.qty; }, 0); }

  /** Rol boʻyicha jami (inda + yurishda) — bino jazosi uchun. */
  function roleTotal(role) { return armyCount(role) + armyCount(role, true); }

  function soloReadyAt() {
    var at = app.state.player.solo_hunt_at;
    return at ? at + app.config.solo_hunt_cooldown_min * 60000 : 0;
  }

  /* ---------------------------------------------------------------- 🐾 Ov */
  /** Ov tabi: yurishdagi ov, yolgʻiz ov, toʻda ovi (slayderlar bilan), ovchilar, zaxira, ov guruhlari, oʻlja zinapoyasi. */
  function screenOv() {
    var p = app.state.player, cfg = app.config, prey = G.PREY[p.level], m = huntMarch();
    var html = '<div class="screen-title"><h1 class="bw-h2">Ov</h1><span class="bw-chip">' + icon("paw", "bw-icon--sm") + " " + esc(prey[0]) + " · " + fmtRate(prey[1]) + " kg</span></div>";

    if (m) {
      html += '<div class="bw-card hunt-card"><span class="hunt-card__icon">' + icon("paw", "bw-icon--lg") + '</span><div class="bw-grow">' +
        '<div class="bw-between"><span class="bw-h3">Ovda · ' + esc(m.loot.prey || prey[0]) + '</span><b class="bw-num" data-live="m-' + m.id + '">' +
        timeLeft({ ends_at: m.returns_at }) + "</b></div>" +
        '<div class="bw-progress bw-progress--sm" style="margin:8px 0 6px"><div class="bw-progress__bar" data-live="mbar-' + m.id + '" style="width:' +
        Math.round(marchRatio(m) * 100) + '%"></div></div><div class="bw-muted" style="font-size:13px">Kutilmoqda: ~' + G.fmt(m.loot.meat) + " kg goʻsht · " +
        fmtRate(m.loot.herb) + " oʻt · +" + fmtRate(m.loot.xp) + " XP</div></div></div>";
    }

    if (p.level <= cfg.solo_hunt_max_level) {
      var wait = soloReadyAt() - now();
      html += '<div class="bw-card hunt-card"><span class="hunt-card__icon">' + icon("wolf", "bw-icon--lg") + '</span><div class="bw-grow">' +
        '<div class="bw-h3">Yolgʻiz ov · ' + esc(prey[0]) + '</div><div class="bw-muted" style="font-size:13px">Alfa oʻzi ovlaydi: ' + fmtRate(prey[1]) + " kg · +" +
        fmtRate(prey[1] * cfg.xp_hunt_coef) + " XP · " + cfg.solo_hunt_cooldown_min + " daqiqa dam</div></div>" +
        '<button class="bw-btn bw-btn--accent bw-btn--sm" data-action="solo-hunt" data-live="solo"' + (wait > 0 ? " disabled" : "") + ">" +
        (wait > 0 ? icon("clock", "bw-icon--sm") + " " + timeLeft({ ends_at: soloReadyAt() }) : icon("paw", "bw-icon--sm") + " Ovlash") + "</button></div>";
    }

    if (!m) html += packHuntPanel();

    html += sectionTitle("Ovchilar", '<button class="bw-btn bw-btn--soft bw-btn--sm" data-action="q-open" data-type="hunt_path"' + (p.level < cfg.hunter_unlock_level ? " disabled" : "") + ">" +
      icon("track", "bw-icon--sm") + " Ov soʻqmogʻi</button>");
    if (p.level < cfg.hunter_unlock_level) {
      html += lockedCard("track", cfg.hunter_unlock_level + "-darajada ochiladi", "Ov soʻqmogʻi qurilgach ovchilar tayyorlanadi va toʻda bilan ovga chiqasiz.");
    } else {
      var hq = trainQueues().filter(function (q) { return q.role === "hunter"; })[0];
      html += '<div class="bw-card">' + '<div class="bw-grid-3">' + stat(armyCount("hunter"), "Inda") + stat(armyCount("hunter", true), "Ovda") +
        stat("~" + fmtRate(G.hunterYield(cfg, p.level, 1)) + " kg", "1 ovchi / soat") + "</div>" +
        (hq ? '<div style="margin-top:12px">' + queueCard(hq, false) + "</div>" : "") + "</div>";
    }

    html += sectionTitle("Zaxira");
    var meat = resourceFacts("meat"), herb = resourceFacts("herb");
    html += '<div class="bw-card"><div class="bw-grid-3">' + stat(G.fmt(meat.amount) + " / " + G.fmt(meat.cap), "Goʻsht, kg") +
      stat(G.fmt(meat.perDay) + " kg", "Kunlik sarf") + stat(meat.days == null ? "∞" : fmtRate(meat.days) + " kun", "Yetadi") + "</div>" +
      '<div class="bw-progress' + (meat.fill >= 1 ? " bw-progress--accent" : "") + '" style="margin-top:12px"><div class="bw-progress__bar" style="width:' +
      Math.round(meat.fill * 100) + '%;background:var(--bw-res-meat)"></div></div>' +
      '<div class="bw-between bw-faint" style="font-size:12px;margin-top:6px"><span>Shifobaxsh oʻt: ' + G.fmt(herb.amount) + "</span><span>Oziq gʻori " + meat.cave + "-daraja</span></div></div>";

    html += sectionTitle("Ov guruhlari", '<span class="bw-chip">2–' + cfg.hunt_party_max + " oʻyinchi</span>");
    if (p.level < cfg.pack_unlock_level) {
      html += lockedCard("pack", cfg.pack_unlock_level + "-darajada ochiladi", "Bir necha oʻyinchi bitta ovga birlashadi — har qoʻshimcha oʻyinchi +" + Math.round(cfg.hunt_party_bonus * 100) + "%.");
    } else {
      html += '<div class="bw-card"><div class="bw-card__head"><div class="bw-muted" style="font-size:13px">Har qoʻshimcha oʻyinchi +' + Math.round(cfg.hunt_party_bonus * 100) +
        '%, oʻlja ovchi unumiga qarab boʻlinadi</div><button class="bw-btn bw-btn--sm" data-action="party-create">' + icon("plus", "bw-icon--sm") + " Yaratish</button></div>";
      var parties = app.state.parties || [];
      html += parties.length ? '<div class="bw-list">' + parties.map(function (g) {
        return '<div class="bw-row"><span class="bw-avatar bw-avatar--sm bw-tier-1">' + icon("pack") + '</span><div class="bw-row__main">' +
          '<div class="bw-row__title">' + esc(g.leader) + " · " + esc(g.prey) + '</div><div class="bw-row__sub">' + g.members + "/" + g.max +
          " oʻyinchi · " + g.departs_min + ' daqiqada joʻnaydi</div></div><button class="bw-btn bw-btn--soft bw-btn--sm" data-action="party-join">Qoʻshilish</button></div>';
      }).join("") + "</div>" : '<p class="bw-muted" style="margin:0">Hozir ochiq guruh yoʻq.</p>';
      html += "</div>";
    }

    html += sectionTitle("Oʻlja zinapoyasi");
    var seen = {}, ladder = [];
    for (var L = 1; L <= 25; L++) {
      var key = G.PREY[L][0];
      if (seen[key]) continue;
      seen[key] = true;
      ladder.push({ level: L, name: key, kg: G.PREY[L][1], pack: Math.max(1, Math.ceil(G.PREY[L][1] / cfg.prey_kg_per_wolf)) });
    }
    html += '<div class="bw-card bw-list" style="padding:0 16px">' + ladder.map(function (x, i) {
      var next = ladder[i + 1], current = p.level >= x.level && (!next || p.level < next.level);
      return '<div class="bw-row prey-row' + (current ? " is-current" : p.level < x.level ? " is-future" : "") + '"><span class="bw-chip' + (current ? " bw-chip--accent" : "") + '">' + x.level + "-d.</span>" +
        '<div class="bw-row__main"><div class="bw-row__title">' + esc(x.name) + '</div><div class="bw-row__sub">' + fmtRate(x.kg) + " kg · kamida " + x.pack + " boʻri</div></div>" +
        (current ? '<span class="bw-chip bw-chip--accent">hozir</span>' : "") + "</div>";
    }).join("") + "</div>";
    return html;
  }

  /** Toʻda ovi paneli: rollar boʻyicha slayderlar, kutilgan natija va “Ovga chiqish”. */
  function packHuntPanel() {
    var p = app.state.player, cfg = app.config;
    var html = sectionTitle("Toʻda ovi", '<span class="bw-chip">' + icon("clock", "bw-icon--sm") + " " + cfg.hunt_duration_min + " daqiqa</span>");
    if (p.level < cfg.hunter_unlock_level) return html + lockedCard("pack", cfg.hunter_unlock_level + "-darajada ochiladi", "Ovchilar bilan 1 soatlik ovga chiqasiz — goʻsht, shifobaxsh oʻt va XP.");
    if (!armyCount("hunter")) {
      return html + '<div class="bw-card bw-card--flat bw-empty">' + icon("track") + '<div class="bw-h3" style="color:var(--bw-text)">Ovchi yoʻq</div>' +
        '<p class="bw-muted" style="margin:6px 0 12px">' + (armyCount("hunter", true) ? "Ovchilar yoʻlda." : "Ov soʻqmogʻida ovchi tayyorlang.") + "</p>" +
        '<button class="bw-btn bw-btn--sm" data-action="q-open" data-type="hunt_path">' + icon("plus", "bw-icon--sm") + " Ovchi tayyorlash</button></div>";
    }
    if (!app.huntSel) app.huntSel = defaultHuntSel();
    var sel = app.huntSel;
    ["hunter", "attacker", "defender", "scout"].forEach(function (r) { sel[r] = Math.min(sel[r] || 0, armyCount(r)); });
    var r = G.huntResult(cfg, p.level, huntPayload(sel));
    html += '<div class="bw-card"><p class="bw-muted" style="margin:0 0 4px;font-size:13px">' + esc(G.PREY[p.level][0]) + " uchun kamida <b>" + r.min_pack +
      "</b> boʻri kerak. Goʻshtni faqat ovchilar keltiradi; boshqa askarlar toʻdani toʻldiradi, lekin shu vaqt inni qoʻriqlamaydi.</p>";
    html += ["hunter", "attacker", "defender", "scout"].map(function (role) {
      var meta = roleMeta(role), max = armyCount(role);
      return '<div class="slider-row"><div class="bw-between"><span class="bw-role bw-role--' + role + '"><span class="bw-role__dot"></span>' + esc(meta.name) +
        '</span><span class="bw-faint" style="font-size:12px">inda ' + max + "</span></div>" + slider("hunt", role, sel[role] || 0, max) + "</div>";
    }).join("");
    return html + '<div id="hunt-preview">' + huntPreview() + "</div></div>";
  }

  /** Ov tabi belgisi: ovga chiqish mumkin boʻlsa (yolgʻiz ov tayyor yoki boʻsh ovchilar bor). */
  function huntIdle() {
    var p = app.state.player, cfg = app.config;
    if (huntMarch()) return false;
    if (p.level <= cfg.solo_hunt_max_level && soloReadyAt() <= now()) return true;
    return armyCount("hunter") > 0;
  }

  function marchRatio(m) { return Math.max(0, Math.min(1, (now() - m.departs_at) / Math.max(1, m.returns_at - m.departs_at))); }

  /** Standart tanlov: hamma ovchilar + min toʻdagacha yordamchilar (hujumchi, keyin boshqalar). */
  function defaultHuntSel() {
    var p = app.state.player, sel = { hunter: armyCount("hunter"), attacker: 0, defender: 0, scout: 0 };
    var need = Math.max(1, Math.ceil(G.PREY[p.level][1] / app.config.prey_kg_per_wolf)) - sel.hunter;
    ["attacker", "defender", "scout"].forEach(function (r) {
      var add = Math.max(0, Math.min(need, armyCount(r)));
      sel[r] = add; need -= add;
    });
    return sel;
  }

  /** Tanlov {rol: soni} → payload {rol: {tier: soni}}: ovchilar yuqori tierdan, yordamchilar pastdan. */
  function huntPayload(sel) {
    var out = {};
    Object.keys(sel).forEach(function (role) {
      var left = sel[role], tiers = (app.state.army[role] || []).slice(), order = [0, 1, 2, 3, 4, 5];
      if (role === "hunter") order.reverse();
      order.forEach(function (i) {
        var take = Math.min(left, tiers[i] || 0);
        if (take > 0) { out[role] = out[role] || {}; out[role][i + 1] = take; left -= take; }
      });
    });
    return out;
  }

  /** Son tanlash: − [slayder] + — slayderni surish ham, tugmalar ham ishlaydi. */
  function slider(name, key, value, max) {
    var attrs = ' data-slider="' + name + '" data-key="' + key + '"';
    return '<div class="bw-slider">' +
      '<button class="bw-btn bw-btn--soft bw-btn--sm bw-btn--icon" type="button" data-slide-step="-1"' + attrs + (value <= 0 ? " disabled" : "") + ' aria-label="Kamaytirish">−</button>' +
      '<input class="bw-range" type="range" min="0" max="' + max + '" step="1" value="' + value + '"' + attrs + (max <= 0 ? " disabled" : "") + ">" +
      '<button class="bw-btn bw-btn--soft bw-btn--sm bw-btn--icon" type="button" data-slide-step="1"' + attrs + (value >= max ? " disabled" : "") + ' aria-label="Koʻpaytirish">+</button>' +
      '<b class="bw-num bw-slider__val">' + value + "</b></div>";
  }

  /** Slayderlar: qiymatni oʻqish/yozish va sheet ichidagi natija qismini yangilash. */
  var SLIDERS = {
    hunt: {
      get: function (key) { return app.huntSel[key] || 0; },
      max: function (key) { return armyCount(key); },
      set: function (key, v) { app.huntSel[key] = v; },
      preview: function () { var el = $("#hunt-preview"); if (el) el.innerHTML = huntPreview(); }
    },
    train: {
      get: function () { return app.trainSel.qty; },
      max: function () { return trainCtx().maxQty; },
      set: function (key, v) { app.trainSel.qty = v; },
      preview: function () { var el = $("#sheet-preview"); if (el) el.innerHTML = trainPreview(); }
    }
  };

  function slideTo(box, name, key, value) {
    var api = SLIDERS[name], max = api.max(key), v = Math.max(0, Math.min(max, Math.round(value)));
    api.set(key, v);
    box.querySelector("input").value = v;
    box.querySelector(".bw-slider__val").textContent = v;
    box.querySelector('[data-slide-step="-1"]').disabled = v <= 0;
    box.querySelector('[data-slide-step="1"]').disabled = v >= max;
    api.preview();
  }

  /** Toʻda ovi natijasi (slayder surilganda faqat shu yangilanadi). */
  function huntPreview() {
    var p = app.state.player, cfg = app.config, sel = app.huntSel, r = G.huntResult(cfg, p.level, huntPayload(sel));
    var html = '<div class="bw-grid-3" style="margin-top:12px">' + stat("~" + G.fmt(r.meat) + " kg", "Goʻsht") + stat(fmtRate(r.herb), "Shifobaxsh oʻt") + stat("+" + fmtRate(r.xp), "XP") + "</div>";
    if (r.penalty) html += '<div class="bw-banner" style="margin-top:12px">' + icon("info", "bw-icon--sm") + "<span>Toʻda kichik: " + r.sent + " / " + r.min_pack + " boʻri — natija ×" + cfg.hunt_small_party_penalty + ". Yordamchi qoʻshing.</span></div>";
    var cap = Math.round(G.caveCap(cfg, buildingLevel("food_cave"))), room = cap - (app.state.resources.meat || 0);
    if (r.meat > room) html += '<div class="bw-banner" style="margin-top:12px">' + icon("info", "bw-icon--sm") + "<span>Oziq gʻorida joy " + G.fmt(Math.max(0, room)) + " kg — ortigʻi chiriydi (oflaynda sigʻim ×" + cfg.offline_store_mult + ").</span></div>";
    html += '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:16px" data-action="hunt-go"' + ((sel.hunter || 0) < 1 ? " disabled" : "") + ">" +
      icon("paw", "bw-icon--sm") + " Ovga chiqish</button>";
    return html;
  }

  function startHunt() {
    var payload = huntPayload(app.huntSel || defaultHuntSel()), cfg = app.config, p = app.state.player;
    var started = function () { haptic("medium"); closeSheet(); app.huntSel = null; toast("Toʻda ovga chiqdi — 1 soatda qaytadi", "paw"); };
    if (app.mode === "live") { post("hunt", { payload: payload }, started); return; }
    var r = G.huntResult(cfg, p.level, payload), t = now();
    Object.keys(payload).forEach(function (role) {
      Object.keys(payload[role]).forEach(function (tier) {
        app.state.army[role][tier - 1] -= payload[role][tier];
        app.state.army_away[role][tier - 1] += payload[role][tier];
      });
    });
    r.prey = G.PREY[p.level][0];
    app.state.marches = (app.state.marches || []).concat([{ id: t, kind: "hunt", payload: payload, loot: r, departs_at: t, returns_at: t + cfg.hunt_duration_min * 60000 }]);
    saveDemo(); render(); started();
  }

  function soloHunt() {
    var cfg = app.config, p = app.state.player;
    if (soloReadyAt() > now()) return;
    var done = function (loot) {
      haptic("medium");
      toast("Alfa ovladi: +" + fmtRate(loot.meat) + " kg goʻsht, +" + fmtRate(loot.xp) + " XP" + (loot.lost > 0 ? " (gʻor toʻla — " + fmtRate(loot.lost) + " kg chiridi)" : ""), "paw");
    };
    if (app.mode === "live") { post("hunt/solo", {}, function (d) { done(d.loot); }); return; }
    var kg = G.PREY[p.level][1], t = now();
    app.econ = G.advance(cfg, app.econ, t);
    var lost = addFood("meat", kg, false) ; addFood("herb", kg * cfg.hunt_herb_share, false);
    p.solo_hunt_at = t;
    var levels = addXp(kg * cfg.xp_hunt_coef);
    saveDemo(); syncResources(); render();
    done({ meat: kg, xp: kg * cfg.xp_hunt_coef, lost: lost });
    announceFinished(levels.map(function (l) { return { kind: "level", level: l }; }));
  }

  /** Demo: oziqni gʻor sigʻimigacha qoʻshish; ortigʻini qaytaradi. */
  function addFood(key, amount, offline) {
    var cap = G.caveCap(app.config, app.econ.cave) * (offline ? app.config.offline_store_mult : 1);
    var put = Math.min(Math.max(0, cap - app.econ.res[key]), amount);
    app.econ.res[key] += put;
    return amount - put;
  }

  /** Demo: XP va daraja koʻtarilishi (server ProgressService bilan bir xil). */
  function addXp(xp) {
    var p = app.state.player, cfg = app.config, levels = [];
    p.xp = Math.round((p.xp + xp) * 100) / 100;
    while (p.level < 25 && p.xp >= G.totalXp(cfg, p.level + 1)) {
      p.level++;
      levels.push(p.level);
    }
    if (levels.length) {
      app.econ.level = p.level;
      app.state.buildings.forEach(function (b) {
        var unlock = G.BUILDINGS[b.type].unlock;
        if (b.type === "den") b.level = p.level;
        else if (!b.level && p.level >= unlock) b.level = 1;
      });
    }
    return levels;
  }

  /** Mashq hisoblari (panel va slayder uchun). */
  function trainCtx() {
    var p = app.state.player, cfg = app.config, sel = app.trainSel, role = roleMeta(sel.role);
    var b = buildingList().filter(function (x) { return x.type === role.building; })[0];
    var maxTier = G.maxTier(cfg, p.level, b.level);
    sel.tier = Math.min(sel.tier, maxTier);
    var free = G.armyCap(cfg, p.level) - totalArmy() - queuedTrain();
    var unit = G.trainCost(cfg, sel.tier), res = app.state.resources;
    var afford = Math.floor(Math.min((res.meat || 0) / unit.meat, (res.bone || 0) / unit.bone));
    return { p: p, cfg: cfg, sel: sel, role: role, b: b, maxTier: maxTier, free: free, unit: unit, maxQty: Math.max(0, Math.min(free, afford)) };
  }

  /** Rol binosi oynasidagi mashq paneli. */
  function trainPanel(role, b) {
    var p = app.state.player, cfg = app.config, maxTier = G.maxTier(cfg, p.level, b.level);
    var q = trainQueues().filter(function (x) { return x.role === role.key; })[0];
    var html = '<div class="bw-grid-3" style="margin-top:14px">' + stat(armyCount(role.key) + (armyCount(role.key, true) ? " +" + armyCount(role.key, true) : ""), "Inda" + (armyCount(role.key, true) ? " + yoʻlda" : "")) +
      stat(maxTier, "Maks tier") + stat(G.fmt(G.roleCap(cfg, b.level)), "Bino sigʻimi") + "</div>";
    html += '<div class="bw-eyebrow" style="margin:16px 0 8px">Askar tayyorlash</div>';
    if (q) return html + queueCard(q, true);
    var cap = G.armyCap(cfg, p.level);
    if (cap - totalArmy() - queuedTrain() <= 0) return html + '<div class="bw-banner">' + icon("info", "bw-icon--sm") + "<span>Qoʻshin toʻla (" + cap + " / " + cap + "). Sigʻim darajangiz bilan oʻsadi.</span></div>";
    if (!app.trainSel || app.trainSel.role !== role.key) app.trainSel = { role: role.key, tier: 1, qty: 1 };
    var c = trainCtx(), sel = c.sel;
    sel.qty = Math.max(c.maxQty ? 1 : 0, Math.min(sel.qty, c.maxQty));
    html += '<div class="bw-seg" role="tablist" style="margin-bottom:10px">' + G.TIERS.map(function (name, i) {
      var t = i + 1, locked = t > c.maxTier;
      return '<button class="bw-seg__btn" data-action="train-tier" data-key="' + t + '" aria-selected="' + (sel.tier === t) + '"' + (locked ? " disabled" : "") + ">T" + t + "</button>";
    }).join("") + "</div>";
    html += '<div class="bw-between"><b>' + esc(G.TIERS[sel.tier - 1]) + " " + esc(role.name.toLowerCase()) + '</b><span class="bw-faint" style="font-size:12px">boʻsh joy: ' + c.free + "</span></div>" +
      slider("train", "qty", sel.qty, c.maxQty);
    return html + '<div id="sheet-preview">' + trainPreview() + "</div>";
  }

  /** Mashq narxi, vaqti va tugmasi (slayder surilganda faqat shu yangilanadi). */
  function trainPreview() {
    var c = trainCtx(), sel = c.sel, n = Math.max(1, sel.qty);
    var secs = G.trainSeconds(c.cfg, sel.tier, c.p.level, c.b.level, totalArmy() + queuedTrain(), roleTotal(sel.role)) * n;
    var html = '<div class="cost-row" style="margin-top:10px">' + costChips({ meat: c.unit.meat * n, bone: c.unit.bone * n }) +
      '<span class="bw-chip">' + icon("clock", "bw-icon--sm") + " " + G.fmtMinutes(secs / 60) + "</span></div>";
    html += '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:12px" data-action="train-go"' + (sel.qty < 1 ? " disabled" : "") + ">" +
      icon("plus", "bw-icon--sm") + " Tayyorlash" + (sel.qty > 0 ? " · " + sel.qty : "") + "</button>";
    if (!c.maxQty) html += '<p class="bw-faint" style="margin:8px 0 0;font-size:12px;text-align:center">Goʻsht yoki suyak yetmaydi (1 askar: ' + c.unit.meat + " kg goʻsht, " + c.unit.bone + " suyak)</p>";
    return html;
  }

  function train() {
    var sel = app.trainSel, cfg = app.config, p = app.state.player;
    if (!sel || sel.qty < 1) return;
    var meta = roleMeta(sel.role);
    var started = function () { haptic("medium"); toast(sel.qty + " ta " + meta.name.toLowerCase() + " mashqqa kirdi", "clock"); };
    if (app.mode === "live") { post("army/train", { role: sel.role, tier: sel.tier, qty: sel.qty }, started); return; }
    var unit = G.trainCost(cfg, sel.tier), t = now();
    var b = buildingList().filter(function (x) { return x.type === meta.building; })[0];
    var secs = G.trainSeconds(cfg, sel.tier, p.level, b.level, totalArmy() + queuedTrain(), roleTotal(sel.role)) * sel.qty;
    var cost = { meat: unit.meat * sel.qty, bone: unit.bone * sel.qty };
    app.econ = G.advance(cfg, app.econ, t);
    app.econ.res.meat -= cost.meat; app.econ.res.bone -= cost.bone;
    app.state.queues = (app.state.queues || []).concat([{ id: t, kind: "train", role: sel.role, tier: sel.tier, qty: sel.qty, cost: cost,
      started_at: t, ends_at: t + Math.round(secs * 1000) }]);
    saveDemo(); syncResources(); render(); started();
  }

  /** “Yangi daraja!” oynasi. */
  function levelSheet(level) {
    var cfg = app.config, unlocks = G.UNLOCKS[level] || [];
    openSheet('<div class="level-up"><div class="bw-eyebrow">Yangi daraja</div><div class="level-up__num">' + level + "</div>" +
      '<div class="bw-h2">' + esc(G.WOLVES[level]) + "</div>" +
      '<p class="bw-muted" style="margin:6px 0 0">Qoʻshin sigʻimi: ' + G.armyCap(cfg, level) + " · kunlik ehtiyoj: " + fmtRate(G.need(cfg, level)) + " kg / askar</p>" +
      (unlocks.length ? '<div class="bw-eyebrow" style="margin-top:16px">Ochildi</div><ul class="bw-resinfo__list">' +
        unlocks.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("") + "</ul>" : "") +
      '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:18px" data-action="close-sheet">Davom etish</button></div>');
  }

  /* ---------------------------------------------------------------- Qurilish navbati */
  function queues() { return (app.state.queues || []).filter(function (q) { return q.kind === "build"; }); }
  function queueFor(type) { return queues().filter(function (q) { return q.building_type === type; })[0] || null; }

  /** Navbat slotlari: 1; 10-darajadan 2 (live — server aytadi). */
  function buildSlots() {
    var p = app.state.player;
    if (p.build_slots) return p.build_slots;
    return p.level >= app.config.second_queue_free_level ? 2 : 1;
  }

  /** Kuchaytirish mumkinmi — server bilan bir xil tekshiruvlar (BuildService::upgrade). */
  function upgradeCheck(b) {
    var p = app.state.player, next = b.level + 1;
    if (b.meta.auto || b.locked) return { ok: false, reason: "" };
    if (b.queue) return { ok: false, reason: "Bu bino qurilmoqda" };
    if (next > p.level) return { ok: false, reason: "Bino oʻyinchi darajasidan oshmaydi" };
    if (queues().length >= buildSlots()) return { ok: false, reason: "Qurilish navbati band" };
    var cost = G.buildingCost(app.config, b.type, next), res = app.state.resources;
    var missing = Object.keys(cost).filter(function (k) { return (res[k] || 0) < cost[k]; });
    if (missing.length) {
      return { ok: false, reason: "Yetmaydi: " + missing.map(function (k) { return G.fmt(cost[k] - (res[k] || 0)) + " " + resMeta(k).short.toLowerCase(); }).join(", ") };
    }
    return { ok: true, cost: cost };
  }

  /** Keyingi daraja nima beradi (qisqa). */
  function upgradeEffect(type, from, to) {
    var cfg = app.config, row = function (label, a, b) {
      return '<div class="bw-between upgrade-fx"><span class="bw-muted">' + esc(label) + '</span><span class="bw-num">' + a + ' <span class="bw-faint">→</span> <b>' + b + "</b></span></div>";
    };
    var html = "";
    if (type === "workshop") html = row("Ishlab chiqarish, /soat", G.fmt(G.workshopPerHour(cfg, from)), G.fmt(G.workshopPerHour(cfg, to)));
    else if (type === "food_cave") html = row("Sigʻim (har oziq)", G.fmt(Math.round(G.caveCap(cfg, from))), G.fmt(Math.round(G.caveCap(cfg, to)))) +
      row("Passiv suv, /soat", fmtRate(G.waterPerHour(cfg, from)), fmtRate(G.waterPerHour(cfg, to)));
    else if (G.ROLES.some(function (r) { return r.building === type; })) {
      var p = app.state.player;
      html = row("Askar sigʻimi", G.fmt(cfg.role_cap_base * Math.pow(cfg.role_cap_growth, from - 1)), G.fmt(cfg.role_cap_base * Math.pow(cfg.role_cap_growth, to - 1))) +
        row("Maks tier", G.maxTier(cfg, p.level, from), G.maxTier(cfg, p.level, to));
    }
    return html ? '<div class="bw-card bw-card--flat" style="margin-top:12px;padding:10px 14px">' + html + "</div>" : "";
  }

  function timeLeft(q) {
    var sec = Math.max(0, Math.ceil((q.ends_at - now()) / 1000));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), ss = sec % 60;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return (h ? h + ":" + pad(m) : m) + ":" + pad(ss);
  }

  function queueRatio(q) {
    return Math.max(0, Math.min(1, (now() - q.started_at) / Math.max(1, q.ends_at - q.started_at)));
  }

  /** Navbatdagi qurilish kartasi (In ekrani va bino oynasi uchun). */
  function queueCard(q, inSheet) {
    var free = app.state.player.free_speedups || 0, train = q.kind === "train";
    var type = train ? roleMeta(q.role).building : q.building_type, meta = G.BUILDINGS[type];
    var title = train ? q.qty + " × " + roleMeta(q.role).name.toLowerCase() + " · T" + q.tier : meta.name + " → " + q.target_level;
    return '<div class="bw-card bw-card--flat queue-slot queue-slot--busy"' + (inSheet ? "" : ' data-action="q-open" data-type="' + type + '"') + ">" +
      '<span class="queue-slot__icon">' + icon(train ? roleMeta(q.role).icon : meta.icon) + '</span><div class="bw-grow">' +
      '<div class="bw-between"><span class="bw-row__title">' + esc(title) + '</span><b class="bw-num" data-live="q-' + q.id + '">' + timeLeft(q) + "</b></div>" +
      '<div class="bw-progress bw-progress--sm" style="margin:8px 0"><div class="bw-progress__bar" data-live="qbar-' + q.id + '" style="width:' + Math.round(queueRatio(q) * 100) + '%"></div></div>' +
      '<div class="queue-slot__actions"><button class="bw-btn bw-btn--accent bw-btn--sm" data-action="q-speedup" data-q="' + q.id + '" title="Bepul tezlashtirish: −' + app.config.tutorial_speedup_min + ' daqiqa"' + (free ? "" : " disabled") + ">" +
      icon("bolt", "bw-icon--sm") + " Tezlash · " + free + '</button><button class="bw-btn bw-btn--ghost bw-btn--sm" data-action="q-cancel" data-q="' + q.id + '">' +
      icon("close", "bw-icon--sm") + " Bekor</button></div></div></div>";
  }

  function queueSection() {
    var cfg = app.config, list = queues(), slots = buildSlots();
    var html = sectionTitle("Qurilish navbati", '<span class="bw-chip">' + list.length + " / " + slots + " slot</span>");
    html += '<div class="bw-stack">' + list.map(function (q) { return queueCard(q, false); }).join("");
    for (var i = list.length; i < slots; i++) {
      html += '<div class="bw-card bw-card--flat queue-slot"><span class="queue-slot__icon">' + icon("clock") +
        '</span><div class="bw-grow"><div class="bw-row__title">Navbat boʻsh</div><div class="bw-row__sub">Binoni tanlang va kuchaytiring</div></div></div>';
    }
    if (slots < 2) {
      html += '<div class="queue-slot queue-slot--locked">' + icon("lock", "bw-icon--sm") + "<span>2-navbat " + cfg.second_queue_free_level + "-darajada bepul ochiladi</span></div>";
    }
    html += "</div>";
    var tq = trainQueues();
    if (tq.length) {
      html += sectionTitle("Mashq", '<span class="bw-chip">' + totalArmy() + " / " + G.armyCap(cfg, app.state.player.level) + " askar</span>");
      html += '<div class="bw-stack">' + tq.map(function (q) { return queueCard(q, false); }).join("") + "</div>";
    }
    return html;
  }

  /** So‘rash: Telegram oynasi yoki brauzer confirm. */
  function confirmAsk(text, cb) {
    if (tg && tg.showConfirm && tg.isVersionAtLeast && tg.isVersionAtLeast("6.2")) { tg.showConfirm(text, function (ok) { if (ok) cb(); }); return; }
    if (window.confirm(text)) cb();
  }

  var busy = false;
  /** Live: POST, javobni qoʻllash; xato boʻlsa toast va qayta sinxron. */
  function post(path, body, ok) {
    if (busy) return;
    busy = true;
    window.BWApi.request(path, { method: "POST", body: body }).then(function (res) {
      applySnapshot(res);
      ok(res.data);
      announceFinished(res.data.finished);
    }, function (err) {
      toast(err.message || "Xato", "info");
      resync();
    }).then(function () { busy = false; });
  }

  function upgrade(type) {
    var b = buildingList().filter(function (x) { return x.type === type; })[0];
    var check = upgradeCheck(b);
    if (!check.ok) { toast(check.reason, "info"); return; }
    var started = function () { haptic("medium"); toast(b.meta.name + " → " + (b.level + 1) + "-daraja: qurilish boshlandi", "clock"); };
    if (app.mode === "live") { post("buildings/upgrade", { type: type }, started); return; }

    app.econ = G.advance(app.config, app.econ, now());
    Object.keys(check.cost).forEach(function (k) { app.econ.res[k] -= check.cost[k]; });
    var t = now(), used = queues().map(function (q) { return q.slot; });
    app.state.queues = (app.state.queues || []).concat([{
      id: t, kind: "build", slot: used.indexOf(1) === -1 ? 1 : 2, building_type: type, target_level: b.level + 1, cost: check.cost,
      started_at: t, ends_at: t + Math.round(G.buildingTime(app.config, type, b.level + 1) * 60) * 1000
    }]);
    saveDemo(); syncResources(); render(); started();
  }

  function speedup(id) {
    var q = (app.state.queues || []).filter(function (x) { return x.id === id; })[0];
    if (!q || !(app.state.player.free_speedups > 0)) { toast("Bepul tezlashtirish qolmadi", "info"); return; }
    var done = function () { haptic("medium"); toast("Tezlashtirildi: −" + app.config.tutorial_speedup_min + " daqiqa", "bolt"); };
    if (app.mode === "live") { post("queue/speedup", { queue_id: id, use_free: true }, done); return; }
    q.ends_at = Math.max(now(), q.ends_at - app.config.tutorial_speedup_min * 60000);
    app.state.player.free_speedups--;
    done();
    tickQueues(now());
    saveDemo(); render();
  }

  function cancelQueue(id) {
    var q = (app.state.queues || []).filter(function (x) { return x.id === id; })[0];
    if (!q) return;
    var pct = Math.round(app.config.queue_cancel_refund * 100);
    var what = q.kind === "train" ? roleMeta(q.role).name + " mashqini" : G.BUILDINGS[q.building_type].name + " qurilishini";
    confirmAsk(what + " bekor qilasizmi? Resursning " + pct + "% i qaytadi.", function () {
      var done = function (refund) {
        toast("Bekor qilindi. Qaytdi: " + Object.keys(refund).map(function (k) { return "+" + G.fmt(refund[k]) + " " + resMeta(k).short.toLowerCase(); }).join(", "), "close");
      };
      if (app.mode === "live") { post("queue/cancel", { queue_id: id }, function (d) { done(d.refund || {}); }); return; }
      var refund = {};
      Object.keys(q.cost).forEach(function (k) { refund[k] = Math.floor(q.cost[k] * app.config.queue_cancel_refund); });
      app.econ = G.advance(app.config, app.econ, now());
      Object.keys(refund).forEach(function (k) {
        if (k === "meat" || k === "herb") addFood(k, refund[k], false); // server bilan bir xil: oziq gʻor sigʻimidan oshmaydi
        else app.econ.res[k] += refund[k];
      });
      app.state.queues = app.state.queues.filter(function (x) { return x.id !== id; });
      saveDemo(); syncResources(); render(); done(refund);
    });
  }

  function announceFinished(list) {
    var level = 0;
    (list || []).forEach(function (f) {
      haptic("heavy");
      if (f.kind === "level") { level = f.level; return; }
      if (f.kind === "train") { toast(f.qty + " ta " + roleMeta(f.role).name.toLowerCase() + " (T" + f.tier + ") tayyor!", "check"); return; }
      if (f.kind === "hunt") {
        toast("Ov qaytdi: +" + fmtRate(f.meat) + " kg goʻsht, +" + fmtRate(f.herb) + " oʻt, +" + fmtRate(f.xp) + " XP" +
          (f.lost > 0.05 ? " · gʻor toʻla, " + fmtRate(f.lost) + " kg chiridi" : ""), "paw");
        return;
      }
      toast(G.BUILDINGS[f.type].name + " " + f.level + "-darajaga koʻtarildi!", "check");
    });
    if (level) setTimeout(function () { levelSheet(level); }, 400);
  }

  var finishing = false;
  /** Har soniyada: taymerlar va muddati yetgan voqealar (demo — shu yerda, live — serverdan). */
  function tickQueues(t) {
    var due = (app.state.queues || []).filter(function (q) { return q.ends_at <= t; }).map(function (q) { return { t: q.ends_at, q: q }; })
      .concat((app.state.marches || []).filter(function (m) { return m.returns_at <= t; }).map(function (m) { return { t: m.returns_at, m: m }; }))
      .sort(function (a, b) { return a.t - b.t; });
    if (due.length) {
      if (app.mode === "live") {
        if (!finishing) { finishing = true; resync().then(function () { finishing = false; }); }
      } else {
        var finished = [];
        due.forEach(function (ev) { finished = finished.concat(demoEvent(ev)); });
        app.state.queues = app.state.queues.filter(function (q) { return q.ends_at > t; });
        app.state.marches = (app.state.marches || []).filter(function (m) { return m.returns_at > t; });
        app.econ = G.advance(app.config, app.econ, t);
        saveDemo(); syncResources(); render();
        announceFinished(finished);
        return;
      }
    }
    (app.state.queues || []).forEach(function (q) {
      document.querySelectorAll('[data-live="q-' + q.id + '"]').forEach(function (el) { el.textContent = timeLeft(q); });
      var bar = document.querySelector('[data-live="qbar-' + q.id + '"]');
      if (bar) bar.style.width = Math.round(queueRatio(q) * 100) + "%";
    });
    (app.state.marches || []).forEach(function (m) {
      var el = document.querySelector('[data-live="m-' + m.id + '"]');
      if (el) el.textContent = timeLeft({ ends_at: m.returns_at });
      var bar = document.querySelector('[data-live="mbar-' + m.id + '"]');
      if (bar) bar.style.width = Math.round(marchRatio(m) * 100) + "%";
    });
    var solo = document.querySelector('[data-live="solo"]');
    if (solo && solo.disabled) {
      if (soloReadyAt() <= t) render();
      else solo.innerHTML = icon("clock", "bw-icon--sm") + " " + timeLeft({ ends_at: soloReadyAt() });
    }
  }

  /** Demo: bitta voqeani qoʻllash (server EconomyService::sync bilan bir xil tartib). */
  function demoEvent(ev) {
    var cfg = app.config, out = [], xp = 0;
    app.econ = G.advance(cfg, app.econ, Math.max(app.econ.last_tick, ev.t));
    var buildSum = function (cost) { return G.BUILD.reduce(function (s, k) { return s + (cost[k] || 0); }, 0); };
    if (ev.m) {
      var m = ev.m, offline = ev.t >= app.econ.last_seen + cfg.offline_after_min * 60000;
      Object.keys(m.payload).forEach(function (role) {
        Object.keys(m.payload[role]).forEach(function (tier) {
          app.state.army[role][tier - 1] += m.payload[role][tier];
          app.state.army_away[role][tier - 1] -= m.payload[role][tier];
        });
      });
      var lost = addFood("meat", m.loot.meat, offline) + addFood("herb", m.loot.herb, offline);
      xp = m.loot.xp;
      out.push({ kind: "hunt", meat: m.loot.meat, herb: m.loot.herb, xp: xp, lost: lost });
    } else if (ev.q.kind === "train") {
      var q = ev.q;
      app.state.army[q.role][q.tier - 1] += q.qty;
      app.econ.army += q.qty;
      xp = buildSum(q.cost) * cfg.xp_build_coef;
      out.push({ kind: "train", role: q.role, tier: q.tier, qty: q.qty });
    } else {
      var b = ev.q;
      app.state.buildings.forEach(function (x) { if (x.type === b.building_type) x.level = b.target_level; });
      if (b.building_type === "food_cave") app.econ.cave = b.target_level;
      if (b.building_type === "workshop") app.econ.workshop = b.target_level;
      xp = buildSum(b.cost) * cfg.xp_build_coef;
      out.push({ kind: "build", type: b.building_type, level: b.target_level });
    }
    addXp(xp).forEach(function (l) { out.push({ kind: "level", level: l }); });
    return out;
  }

  /* ---------------------------------------------------------------- Tirik iqtisodiyot */
  var DEMO_KEY = "bw.demo.econ";
  var RES_KEYS = ["meat", "water", "herb", "moonlight", "stone", "wood", "hide", "bone"];

  /** Server vaqti (live) yoki qurilma vaqti (demo), ms. */
  function now() { return Date.now() + app.offset; }

  function saveDemo() {
    var levels = {};
    (app.state.buildings || []).forEach(function (b) { levels[b.type] = b.level; });
    try {
      var p = app.state.player;
      localStorage.setItem(DEMO_KEY, JSON.stringify({ v: 3, econ: app.econ, queues: app.state.queues || [], marches: app.state.marches || [],
        buildings: levels, army: app.state.army, army_away: app.state.army_away,
        player: { level: p.level, xp: p.xp, free_speedups: p.free_speedups, solo_hunt_at: p.solo_hunt_at } }));
    } catch (e) { /* xususiy rejim */ }
  }

  /** Demo: saqlangan holat yoki BW_DEMO dan yangi (2 soat oldin “chiqib ketgan” — bufer va qaytish oynasini koʻrsatish uchun). */
  function demoEconomy() {
    try {
      var saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null");
      if (saved && saved.v === 3 && saved.econ && saved.econ.res) {
        app.state.queues = saved.queues || [];
        app.state.marches = saved.marches || [];
        app.state.army = saved.army;
        app.state.army_away = saved.army_away;
        Object.assign(app.state.player, saved.player);
        (app.state.buildings || []).forEach(function (b) { if (saved.buildings[b.type] != null) b.level = saved.buildings[b.type]; });
        return saved.econ;
      }
    } catch (e) { /* buzilgan — yangisini yaratamiz */ }
    var t = Date.now() - 2 * 3600000, res = {};
    RES_KEYS.forEach(function (k) { res[k] = app.state.resources[k] || 0; });
    var alloc = prefs().alloc;
    return {
      res: res, buf: { stone: 0, wood: 0, hide: 0, bone: 0 },
      alloc: alloc && G.validAlloc(alloc) ? alloc : { stone: 40, wood: 30, hide: 15, bone: 15 },
      level: app.state.player.level, cave: buildingLevel("food_cave"), workshop: buildingLevel("workshop"),
      army: totalArmy(), last_tick: t, last_seen: t
    };
  }

  /** Hisoblangan qiymatlarni panel koʻrsatadigan app.state.resources ga koʻchirish. */
  function syncResources() {
    RES_KEYS.forEach(function (k) { app.state.resources[k] = Math.floor(app.econ.res[k] || 0); });
  }

  /** Server javobidagi state (snapshot) ni qabul qilish. */
  function applySnapshot(body) {
    var st = body && body.state;
    if (!st || !st.economy) return body;
    if (st.server_time) app.offset = Date.parse(st.server_time) - Date.now();
    app.econ = st.economy;
    app.state.resources = Object.assign(app.state.resources, st.resources);
    if (st.queues) app.state.queues = st.queues;
    if (st.marches) app.state.marches = st.marches;
    if (st.army) app.state.army = st.army;
    if (st.army_away) app.state.army_away = st.army_away;
    if (st.player) Object.assign(app.state.player, st.player);
    if (st.free_speedups != null) app.state.player.free_speedups = st.free_speedups;
    if (st.buildings) {
      (app.state.buildings || []).forEach(function (b) { if (st.buildings[b.type] != null) b.level = st.buildings[b.type]; });
    }
    syncResources();
    render();
    return body;
  }

  /** Live: serverdan qayta oʻqish (heartbeat ham — oʻyinchi onlayn hisoblanadi). */
  function resync() {
    if (app.mode !== "live") return Promise.resolve();
    return window.BWApi.request("state").then(function (body) {
      Object.assign(app.state, body.data);
      applySnapshot(body);
      announceFinished(body.data.finished);
      if (body.data.away) awaySheet(body.data.away);
    }, function () { /* tarmoq yoʻq — keyingi urinishda */ });
  }

  function gainChips(gained) {
    return Object.keys(gained).filter(function (k) { return gained[k] > 0; }).map(function (k) {
      var r = resMeta(k);
      return '<span class="bw-chip" style="--bw-rc: var(--bw-res-' + k + ')">' + icon(r.icon, "bw-icon--sm") + " +" + G.fmt(gained[k]) + " " + esc(r.short.toLowerCase()) + "</span>";
    }).join("");
  }

  /** “Siz yoʻqligingizda” oynasi. away: {seconds, gained} */
  function awaySheet(away) {
    var chips = gainChips(away.gained || {});
    if (!chips) return;
    var cfg = app.config;
    openSheet('<div class="bw-eyebrow">Xush kelibsiz</div><div class="bw-h2" style="margin-top:4px">Siz yoʻqligingizda</div>' +
      '<p class="bw-muted" style="margin:6px 0 14px">' + G.fmtMinutes(away.seconds / 60) + " ichida toʻda ishladi:</p>" +
      '<div class="cost-row gain-row">' + chips + "</div>" +
      '<div class="bw-banner" style="margin-top:14px">' + icon("info", "bw-icon--sm") + "<span>Oflaynda Ustaxona " + Math.round(cfg.offline_prod_rate * 100) +
      "% tezlikda ishlaydi, bufer va Oziq gʻori sigʻimi esa ×" + cfg.offline_store_mult + " kengayadi.</span></div>" +
      (bufferTotal() ? '<button class="bw-btn bw-btn--accent bw-btn--block" style="margin-top:16px" data-action="collect">' + icon("download", "bw-icon--sm") +
        " Buferni yigʻib olish +" + G.fmt(bufferTotal()) + "</button>" : ""));
  }

  var collecting = false;
  function collect() {
    if (collecting) return;
    if (!buildingLevel("workshop")) { toast("Ustaxona qoyasi 2-darajada ochiladi", "lock"); return; }
    if (!bufferTotal()) { toast("Bufer hali boʻsh", "info"); return; }
    var done = function (got) {
      haptic("medium");
      closeSheet();
      toast("Omborga olindi: " + G.BUILD.filter(function (k) { return got[k] > 0; }).map(function (k) {
        return "+" + G.fmt(got[k]) + " " + resMeta(k).short.toLowerCase();
      }).join(", "), "download");
      flash();
    };
    if (app.mode === "demo") {
      var r = G.collect(G.advance(app.config, app.econ, now()));
      app.econ = r.econ;
      saveDemo();
      syncResources();
      render();
      done(r.got);
      return;
    }
    collecting = true;
    window.BWApi.request("buildings/collect", { method: "POST" }).then(function (body) {
      applySnapshot(body);
      done(body.data.collected || {});
    }, function (err) {
      toast("Yigʻib boʻlmadi: " + (err.message || "xato"), "info");
    }).then(function () { collecting = false; });
  }

  /** Yigʻilgan resurs kataklari bir lahza yonadi. */
  function flash() {
    G.BUILD.forEach(function (k) {
      var el = document.querySelector('.bw-rescell[data-res="' + k + '"]');
      if (el) { el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash"); }
    });
  }

  var lastSig = "", lastSave = 0;
  /** Har soniyada: hisobni oldinga surish va faqat oʻzgargan raqamlarni yangilash. */
  function tick() {
    if (!app.econ) return;
    var t = now(), visible = document.visibilityState !== "hidden";
    app.econ = G.advance(app.config, app.econ, t);
    if (app.mode === "demo" && visible) {
      app.econ.last_seen = t; // ilova ochiq — onlayn
      if (t - lastSave > 5000) { saveDemo(); lastSave = t; }
    }
    syncResources();
    tickQueues(t);
    var hb = $("#hunt-badge");
    if (hb) hb.hidden = !huntIdle();
    var sig = RES_KEYS.map(function (k) { return app.state.resources[k]; }).join() + "|" + bufferTotal() + "|" + bufferStatus();
    if (sig === lastSig) return;
    lastSig = sig;
    renderResources();
    G.BUILD.forEach(function (k) {
      var f = resourceFacts(k);
      document.querySelectorAll('[data-live="buf-' + k + '"]').forEach(function (el) { el.textContent = G.fmt(f.buf); });
      var bar = document.querySelector('[data-live="bar-' + k + '"]');
      if (bar) bar.style.width = Math.round(f.bufFill * 100) + "%";
    });
    document.querySelectorAll('[data-live="buf-total"]').forEach(function (el) { el.textContent = G.fmt(bufferTotal()); });
    var st = document.querySelector('[data-live="buf-status"]');
    if (st) st.textContent = bufferStatus();
    var btn = document.querySelector('[data-live="collect"]');
    if (btn) btn.innerHTML = collectLabel();
  }

  /** Ishga tushganda: hisobni boshlash va kerak boʻlsa “siz yoʻqligingizda” oynasi. */
  function startEconomy(res) {
    var away = null;
    if (app.mode === "live") {
      app.offset = res.serverTime ? Date.parse(res.serverTime) - Date.now() : 0;
      app.econ = app.state.economy;
      away = app.state.away;
      setInterval(function () { if (document.visibilityState !== "hidden") resync(); }, 120000);
    } else {
      app.econ = demoEconomy();
      var before = app.econ, t = now();
      if (t - before.last_seen > app.config.offline_after_min * 60000) {
        var after = G.advance(app.config, before, t), gained = {};
        RES_KEYS.forEach(function (k) { gained[k] = Math.floor(after.res[k]) - Math.floor(before.res[k]); });
        G.BUILD.forEach(function (k) { gained[k] = (gained[k] || 0) + Math.floor(after.buf[k]) - Math.floor(before.buf[k]); });
        away = { seconds: (t - before.last_seen) / 1000, gained: gained };
      }
    }
    tick();
    setInterval(tick, 1000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      if (app.mode === "live") { resync(); return; }
      var t = now(), before = app.econ;
      tick();
      if (t - before.last_seen > app.config.offline_after_min * 60000) {
        var gained = {};
        G.BUILD.forEach(function (k) { gained[k] = Math.floor(app.econ.buf[k]) - Math.floor(before.buf[k]); });
        ["water", "moonlight"].forEach(function (k) { gained[k] = Math.floor(app.econ.res[k]) - Math.floor(before.res[k]); });
        awaySheet({ seconds: (t - before.last_seen) / 1000, gained: gained });
      }
    });
    return away;
  }

  /* ---------------------------------------------------------------- Router */
  var SCREENS = { "in": screenIn, ov: screenOv, jang: screenJang, toda: screenToda, vazifalar: screenVazifalar, profil: screenProfil };

  function route() {
    var tab = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "in";
    if (!SCREENS[tab]) tab = "in";
    if (tab !== app.tab) haptic("select");
    app.tab = tab;
    document.querySelectorAll(".bw-tab").forEach(function (a) {
      if (a.getAttribute("data-tab") === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderTop();
    $("#screen").innerHTML = SCREENS[app.tab]();
    if (app.tab === "in") bindAlloc();
    if (app.sheetRefresh) app.sheetRefresh();
  }

  /* ---------------------------------------------------------------- Amallar */
  var ACTIONS = {
    hunt: function () { closeSheet(); location.hash = "#/ov"; },
    "hunt-go": startHunt,
    "solo-hunt": soloHunt,
    "train-tier": function (el) { app.trainSel.tier = +el.getAttribute("data-key"); app.sheetRefresh(); },
    "train-go": train,
    "close-sheet": closeSheet,
    upgrade: function (el) { upgrade(el.getAttribute("data-type")); },
    "q-speedup": function (el) { speedup(+el.getAttribute("data-q")); },
    "q-cancel": function (el) { cancelQueue(+el.getAttribute("data-q")); },
    "q-open": function (el) { buildingSheet(el.getAttribute("data-type")); },
    scout: function () { toast("Razvedka — " + ROADMAP, "eye"); },
    attack: function () { toast("Hujum — " + ROADMAP, "sword"); },
    "party-create": function () { toast("Ov guruhi — " + ROADMAP, "pack"); },
    "party-join": function () { toast("Ov guruhi — " + ROADMAP, "pack"); },
    claim: function () { toast("Mukofot olish — " + ROADMAP, "gift"); },
    vacation: function () { toast("Taʼtil rejimi — " + ROADMAP, "moon"); },
    shop: function () { toast("Doʻkon — " + ROADMAP, "moonstone"); },
    collect: collect,
    "demo-reset": function () {
      try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* ignore */ }
      location.reload();
    },
    "goto-alloc": function () {
      closeSheet();
      if (app.tab !== "in") location.hash = "#/in";
      setTimeout(function () { var el = $("#alloc"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 120);
    },
    "goto-cave": function () {
      closeSheet();
      if (app.tab !== "in") location.hash = "#/in";
      setTimeout(function () { buildingSheet("food_cave"); }, 260);
    },
    theme: function () {
      var order = ["auto", "dark", "light"];
      var p = prefs();
      p.theme = order[(order.indexOf(p.theme || "auto") + 1) % order.length];
      savePrefs(p);
      applyTheme();
      render();
    },
    install: function () {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt = null;
    }
  };

  document.addEventListener("click", function (e) {
    var st = e.target.closest("[data-slide-step]");
    if (st) {
      var box = st.closest(".bw-slider"), name = st.getAttribute("data-slider"), key = st.getAttribute("data-key");
      slideTo(box, name, key, SLIDERS[name].get(key) + +st.getAttribute("data-slide-step"));
      haptic("select");
      return;
    }
    var as = e.target.closest("[data-alloc-step]");
    if (as) {
      var range = as.parentNode.querySelector("input[data-alloc]");
      range.value = +range.value + +as.getAttribute("data-alloc-step") * 5;
      range.dispatchEvent(new Event("input", { bubbles: true }));
      range.dispatchEvent(new Event("change", { bubbles: true }));
      haptic("select");
      return;
    }
    var rc = e.target.closest("[data-res]");
    if (rc) { resourceSheet(rc.getAttribute("data-res")); return; }
    var b = e.target.closest("[data-building]");
    if (b) { buildingSheet(b.getAttribute("data-building")); return; }
    var s = e.target.closest("[data-seg]");
    if (s) { app.seg[app.tab] = s.getAttribute("data-seg"); haptic("select"); render(); return; }
    var a = e.target.closest("[data-action]");
    if (a && a.tagName !== "INPUT" && ACTIONS[a.getAttribute("data-action")]) {
      haptic("light");
      ACTIONS[a.getAttribute("data-action")](a);
    }
    if (e.target.closest("#top-avatar")) location.hash = "#/profil";
  });
  document.addEventListener("input", function (e) {
    var name = e.target.getAttribute && e.target.getAttribute("data-slider");
    if (name && e.target.type === "range") slideTo(e.target.closest(".bw-slider"), name, e.target.getAttribute("data-key"), +e.target.value);
  });
  document.addEventListener("change", function (e) {
    if (e.target.getAttribute("data-action") === "notify") {
      var p = prefs(); p.notify = e.target.checked; savePrefs(p);
      toast(e.target.checked ? "Bildirishnomalar yoqildi" : "Bildirishnomalar oʻchirildi", "bell");
    }
  });
  $("#sheet-backdrop").addEventListener("click", closeSheet);
  window.addEventListener("hashchange", route);

  /* ---------------------------------------------------------------- PWA */
  var installPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installPrompt = e; });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* ixtiyoriy */ }); });
  }

  /* ---------------------------------------------------------------- Ishga tushirish */
  function setProgress(pct) { var bar = $("#splash-bar"); if (bar) bar.style.width = pct + "%"; }

  function start() {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes();
        tg.onEvent("themeChanged", function () { applyTheme(); });
        if (tg.BackButton) tg.BackButton.onClick(closeSheet);
      } catch (e) { /* Telegramdan tashqarida */ }
    }
    applyTheme();
    setProgress(45);

    window.BWApi.boot().then(function (res) {
      app.mode = res.mode;
      app.reason = res.reason;
      app.config = res.config;
      app.state = res.state;
      var away = startEconomy(res);
      setProgress(100);
      $("#app").hidden = false;
      route();
      if (away) setTimeout(function () { awaySheet(away); }, 450);
      setTimeout(function () { $("#splash").classList.add("is-hidden"); }, 250);
    }).catch(function (err) {
      $("#splash .splash__sub").textContent = "Yuklab boʻlmadi: " + (err && err.message ? err.message : "nomaʼlum xato");
    });
  }

  start();
})();
