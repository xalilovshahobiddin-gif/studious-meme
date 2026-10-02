/* Blue Wolf Mini App — v0.0.0 (skelet / demo koʻrinish)
   5 ta tab (In · Jang · Toʻda · Vazifalar · Profil), hash-router, Telegram WebApp integratsiyasi.
   Amallar (qurish, ov, hujum…) hali ishlamaydi — keyingi bosqichlarda ulanadi. */
(function () {
  "use strict";

  var G = window.BWGame;
  var tg = window.Telegram && window.Telegram.WebApp;
  var icon = function (name, cls) { return window.BWIcons.svg(name, cls); };
  var $ = function (sel) { return document.querySelector(sel); };

  var app = { mode: "demo", config: {}, state: null, tab: "in", seg: { jang: "targets" } };

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

  function openSheet(html) {
    $("#sheet-body").innerHTML = html;
    $("#sheet").classList.add("is-open");
    $("#sheet").setAttribute("aria-hidden", "false");
    $("#sheet-backdrop").classList.add("is-open");
    if (tg && tg.BackButton) tg.BackButton.show();
    haptic("light");
  }
  function closeSheet() {
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
    var tier = G.maxTier(cfg, p.level);
    var av = $("#top-avatar");
    av.className = "bw-avatar bw-avatar--sm bw-tier-" + tier;
    av.innerHTML = icon("wolf");
    var xp = G.xpProgress(cfg, p.level, p.xp);
    $("#top-xp-bar").style.width = Math.round(xp.ratio * 100) + "%";
    $("#top-xp").textContent = p.level >= 25 ? "MAKS" : G.fmt(xp.into) + " / " + G.fmt(xp.need) + " XP";

    var res = app.state.resources;
    $("#res-bar").innerHTML = G.RESOURCES.filter(function (r) {
      return !r.fromLevel || p.level >= r.fromLevel;
    }).map(function (r) {
      return '<span class="bw-res bw-res--' + r.key + '" title="' + esc(r.name) + '">' +
        '<span class="bw-res__dot">' + icon(r.icon) + '</span><span class="bw-num">' + G.fmt(res[r.key] || 0) + "</span></span>";
    }).join("");

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

  /* ---------------------------------------------------------------- Yordamchilar */
  function buildingList() {
    var p = app.state.player;
    var byType = {};
    (app.state.buildings || []).forEach(function (b) { byType[b.type] = b; });
    return G.BUILDING_ORDER.map(function (type) {
      var meta = G.BUILDINGS[type];
      var b = byType[type] || {};
      var level = type === "den" ? p.level : (b.level || 0);
      return { type: type, meta: meta, level: level, locked: p.level < meta.unlock };
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

  function armyCount(role) {
    var a = (app.state.army || {})[role] || [];
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
    var hunters = armyCount("hunter") || (p.level < cfg.pack_unlock_level ? 0 : 1);
    var perHunt = hunters * G.hunterYield(cfg, p.level, 1) * (cfg.hunt_duration_min / 60);
    var army = 0;
    G.ROLES.forEach(function (r) { army += armyCount(r.key); });
    var dailyNeed = G.need(cfg, p.level) * Math.max(army, 1);

    var html = "";
    html += '<section class="den-hero"><div class="den-hero__stars"></div>' +
      '<div class="den-hero__text"><div class="bw-eyebrow" style="color:#9fd3ff">In · ' + p.level + '-daraja</div>' +
      '<h1 class="bw-h2" style="margin-top:6px">Toʻdang uxlamaydi</h1>' +
      '<p style="margin:8px 0 0;color:#c3cde4;font-size:13px">Qoʻshin: <b class="bw-num">' + army + " / " + G.armyCap(cfg, p.level) +
      "</b> · kunlik goʻsht: <b class=\"bw-num\">" + G.fmt(dailyNeed) + " kg</b></p></div>" +
      '<svg class="den-hero__wolf"><use href="#bw-i-wolf"/></svg></section>';

    html += '<div class="bw-card hunt-card"><span class="hunt-card__icon">' + icon("paw", "bw-icon--lg") + "</span>" +
      '<div class="bw-grow"><div class="bw-h3">Ov</div><div class="bw-muted" style="font-size:13px">' +
      (hunters ? hunters + " ovchi · 1 soat · ~" + G.fmt(perHunt) + " kg goʻsht" : "Yolgʻiz ov: alfa oʻzi ovlaydi") + "</div></div>" +
      '<button class="bw-btn bw-btn--accent bw-btn--sm" data-action="hunt">' + icon("paw", "bw-icon--sm") + " Ovga</button></div>";

    html += sectionTitle("Qurilish navbati", '<span class="bw-chip">' + (p.level >= cfg.second_queue_free_level ? "2" : "1") + " slot</span>");
    html += '<div class="bw-card bw-card--flat queue-slot"><span class="queue-slot__icon">' + icon("clock") +
      '</span><div class="bw-grow"><div class="bw-row__title">Navbat boʻsh</div><div class="bw-row__sub">Binoni tanlang va kuchaytiring</div></div></div>';

    html += sectionTitle("Binolar", '<span class="bw-faint" style="font-size:12px">' + buildingList().filter(function (b) { return !b.locked; }).length + " / 9</span>");
    html += '<div class="bw-grid-3 bw-grid-3--wide">' + buildingList().map(function (b) {
      return '<button class="bw-card bw-card--tap bw-building' + (b.locked ? " bw-building--locked" : "") + '" data-building="' + b.type + '" type="button">' +
        (b.locked ? '<span class="bw-building__lock">' + icon("lock", "bw-icon--sm") + "</span>" : "") +
        '<span class="bw-building__icon">' + icon(b.meta.icon, "bw-icon--lg") + '</span>' +
        '<span class="bw-building__name">' + esc(b.meta.name) + "</span>" +
        '<span class="bw-building__lvl">' + (b.locked
          ? '<span class="bw-faint" style="font-size:11px">' + b.meta.unlock + "-darajada</span>"
          : '<span class="bw-chip bw-chip--primary">' + b.level + "-daraja</span>") + "</span></button>";
    }).join("") + "</div>";

    var alloc = prefs().alloc || { stone: 40, wood: 30, hide: 15, bone: 15 };
    var ws = buildingList().filter(function (b) { return b.type === "workshop"; })[0];
    var prodHour = ws.level ? cfg.prod_base * Math.pow(cfg.prod_growth, ws.level - 1) : 0;
    html += sectionTitle("Ustaxona taqsimoti", '<span class="bw-chip">' + G.fmt(prodHour) + "/soat</span>");
    html += '<div class="bw-card bw-stack" id="alloc">' + ["stone", "wood", "hide", "bone"].map(function (k) {
      var r = G.RESOURCES.filter(function (x) { return x.key === k; })[0];
      return '<label class="bw-stack" style="gap:4px"><span class="bw-between"><span class="bw-res bw-res--' + k + '" style="height:26px">' +
        '<span class="bw-res__dot">' + icon(r.icon) + "</span>" + esc(r.name) + '</span><span class="bw-num" data-alloc-out="' + k + '">' +
        alloc[k] + "% · " + G.fmt(prodHour * alloc[k] / 100) + "/soat</span></span>" +
        '<input class="bw-range" type="range" min="0" max="100" step="5" value="' + alloc[k] + '" data-alloc="' + k + '" ' + (ws.level ? "" : "disabled") + "></label>";
    }).join("") + '<p class="bw-faint" style="margin:0;font-size:12px">Yigʻindi 100% boʻlishi shart. v0.0.0 da faqat qurilmada saqlanadi.</p></div>';

    return html;
  }

  function bindAlloc() {
    var box = $("#alloc");
    if (!box) return;
    box.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-alloc");
      if (!k) return;
      var p = prefs();
      var alloc = p.alloc || { stone: 40, wood: 30, hide: 15, bone: 15 };
      alloc[k] = +e.target.value;
      // Qolganlarini mutanosib moslab, yigʻindini 100 ga keltirish
      var others = Object.keys(alloc).filter(function (x) { return x !== k; });
      var rest = 100 - alloc[k];
      var sum = others.reduce(function (s, x) { return s + alloc[x]; }, 0) || 1;
      var acc = 0;
      others.forEach(function (x, i) {
        alloc[x] = i === others.length - 1 ? rest - acc : Math.round(alloc[x] / sum * rest / 5) * 5;
        if (i < others.length - 1) acc += alloc[x];
      });
      p.alloc = alloc;
      savePrefs(p);
      var ws = buildingList().filter(function (b) { return b.type === "workshop"; })[0];
      var prodHour = ws.level ? app.config.prod_base * Math.pow(app.config.prod_growth, ws.level - 1) : 0;
      Object.keys(alloc).forEach(function (x) {
        box.querySelector('[data-alloc="' + x + '"]').value = alloc[x];
        box.querySelector('[data-alloc-out="' + x + '"]').textContent = alloc[x] + "% · " + G.fmt(prodHour * alloc[x] / 100) + "/soat";
      });
    });
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
      var next = b.level + 1;
      if (next > p.level) {
        html += '<div class="bw-banner">' + icon("info", "bw-icon--sm") + "<span>Bino oʻyinchi darajasidan oshmaydi. Keyingi daraja — " + next + "-darajada.</span></div>";
      } else {
        html += '<div class="bw-eyebrow" style="margin-bottom:8px">' + next + "-darajaga koʻtarish</div>";
        html += '<div class="cost-row">' + costChips(G.buildingCost(cfg, type, next)) +
          '<span class="bw-chip">' + icon("clock", "bw-icon--sm") + " " + G.fmtMinutes(G.buildingTime(cfg, type, next)) + "</span></div>";
      }
      var role = G.ROLES.filter(function (r) { return r.building === type; })[0];
      if (role) {
        html += '<div class="bw-grid-2" style="margin-top:14px">' +
          '<div class="bw-stat"><span class="bw-stat__value">' + G.maxTier(cfg, p.level, b.level) + '</span><span class="bw-stat__label">Maks tier</span></div>' +
          '<div class="bw-stat"><span class="bw-stat__value">' + G.fmt(cfg.role_cap_base * Math.pow(cfg.role_cap_growth, b.level - 1)) + '</span><span class="bw-stat__label">Askar sigʻimi</span></div></div>';
      }
      html += '<button class="bw-btn bw-btn--block" style="margin-top:18px" data-action="upgrade"' + (next > p.level ? " disabled" : "") + ">" +
        icon("plus", "bw-icon--sm") + " Kuchaytirish</button>";
    }
    openSheet(html);
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
      return html + lockedCard("pack", cfg.pack_unlock_level + "-darajada ochiladi", "Yolgʻiz boʻri omon qolmaydi. 4-darajada toʻdang va ov guruhlari ochiladi.");
    }
    html += '<div class="bw-card"><div class="bw-card__head"><div><div class="bw-h3">Ov guruhlari</div>' +
      '<div class="bw-muted" style="font-size:13px">2–' + cfg.hunt_party_max + " oʻyinchi bitta ovga · har qoʻshimcha oʻyinchi +" +
      Math.round(cfg.hunt_party_bonus * 100) + '%</div></div><button class="bw-btn bw-btn--sm" data-action="party-create">' + icon("plus", "bw-icon--sm") + " Yaratish</button></div>";
    var parties = app.state.parties || [];
    html += parties.length ? '<div class="bw-list">' + parties.map(function (g) {
      return '<div class="bw-row"><span class="bw-avatar bw-avatar--sm bw-tier-1">' + icon("pack") + '</span><div class="bw-row__main">' +
        '<div class="bw-row__title">' + esc(g.leader) + " · " + esc(g.prey) + '</div><div class="bw-row__sub">' + g.members + "/" + g.max +
        " oʻyinchi · " + g.departs_min + ' daqiqada joʻnaydi</div></div><button class="bw-btn bw-btn--soft bw-btn--sm" data-action="party-join">Qoʻshilish</button></div>';
    }).join("") + "</div>" : '<p class="bw-muted">Hozir ochiq guruh yoʻq.</p>';
    html += "</div>";

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
      (installPrompt ? '<div class="bw-row bw-row--tap" data-action="install">' + icon("download") + '<div class="bw-row__main"><div class="bw-row__title">Ilovani oʻrnatish</div><div class="bw-row__sub">Bosh ekranga qoʻshish (PWA)</div></div></div>' : "") +
      "</div>";
    return html;
  }

  /* ---------------------------------------------------------------- Router */
  var SCREENS = { "in": screenIn, jang: screenJang, toda: screenToda, vazifalar: screenVazifalar, profil: screenProfil };

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
  }

  /* ---------------------------------------------------------------- Amallar */
  var ACTIONS = {
    hunt: function () { toast("Ov — " + ROADMAP, "paw"); },
    upgrade: function () { toast("Qurilish navbati — " + ROADMAP, "clock"); },
    scout: function () { toast("Razvedka — " + ROADMAP, "eye"); },
    attack: function () { toast("Hujum — " + ROADMAP, "sword"); },
    "party-create": function () { toast("Ov guruhi — " + ROADMAP, "pack"); },
    "party-join": function () { toast("Ov guruhi — " + ROADMAP, "pack"); },
    claim: function () { toast("Mukofot olish — " + ROADMAP, "gift"); },
    vacation: function () { toast("Taʼtil rejimi — " + ROADMAP, "moon"); },
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
      setProgress(100);
      $("#app").hidden = false;
      route();
      setTimeout(function () { $("#splash").classList.add("is-hidden"); }, 250);
    }).catch(function (err) {
      $("#splash .splash__sub").textContent = "Yuklab boʻlmadi: " + (err && err.message ? err.message : "nomaʼlum xato");
    });
  }

  start();
})();
