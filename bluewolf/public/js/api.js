/* Blue Wolf — API qatlami.
   Rejimlar:
     live — Telegram ichida, server javob beradi: X-Init-Data bilan /api/v1/*
     demo — server yoʻq (GitHub Pages) yoki Telegramdan tashqarida: BW_DEMO + data/game_config.json */
(function () {
  "use strict";

  var VERSION = "0.0.14";
  var tg = window.Telegram && window.Telegram.WebApp;
  var initData = tg && tg.initData ? tg.initData : "";

  function timeout(ms) {
    return new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, ms); });
  }

  /** API soʻrovi: konvertni ochadi, xatoda {code, message} bilan reject qiladi. */
  function request(path, options) {
    options = options || {};
    var headers = { "Accept": "application/json", "X-Client-Version": VERSION };
    if (initData) headers["X-Init-Data"] = initData;
    if (options.body) headers["Content-Type"] = "application/json";
    if (options.method && options.method !== "GET") headers["X-Request-Id"] = uuid();

    return Promise.race([
      fetch("api/v1/" + path, { method: options.method || "GET", headers: headers, body: options.body ? JSON.stringify(options.body) : undefined }),
      timeout(options.timeout || 8000)
    ]).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) {
        if (!body || typeof body.ok !== "boolean") throw { code: "BAD_RESPONSE", message: "Server javobi notoʻgʻri", status: res.status };
        if (!body.ok) throw Object.assign({ status: res.status }, body.error);
        return body;
      });
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  /** Demo turi: "new" — yangi oʻyinchi (tanishtiruv bilan), "rich" — tayyor 5-daraja. */
  function demoMode() {
    var mode = null;
    try {
      mode = localStorage.getItem("bw.demo.mode");
      if (!mode) {
        mode = localStorage.getItem("bw.demo.econ") ? "rich" : "new"; // eski demo saqlanmasi — tayyor demo
        localStorage.setItem("bw.demo.mode", mode);
      }
    } catch (e) { mode = "new"; }
    return mode === "rich" ? "rich" : "new";
  }

  function demoState(config, reason) {
    var mode = demoMode();
    var d = JSON.parse(JSON.stringify(mode === "new" ? window.BW_DEMO_NEW : window.BW_DEMO));
    return { mode: "demo", demoMode: mode, reason: reason, config: config, state: d };
  }

  function loadLocalConfig() {
    return fetch("data/game_config.json").then(function (r) { return r.json(); });
  }

  /** Tanishtiruv qadamlari (server ham shu faylni oʻqiydi). */
  function loadTutorial() {
    return fetch("data/tutorial.json").then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  /** Ilovani yuklash: server bormi, Telegram initData bormi — shunga qarab rejim tanlanadi. */
  function boot() {
    return Promise.all([bootState(), loadTutorial()]).then(function (r) { r[0].tutorial = r[1]; return r[0]; });
  }

  function bootState() {
    return request("ping", { timeout: 2500 }).then(function () {
      if (!initData) {
        return loadLocalConfig().then(function (cfg) { return demoState(cfg, "no-telegram"); });
      }
      return Promise.all([request("state"), request("config")]).then(function (res) {
        var st = res[0].data;
        return { mode: "live", config: res[1].data.params, serverTime: res[0].state.server_time,
          state: Object.assign({ targets: [], battles: [] }, st) };
      });
    }, function () {
      return loadLocalConfig().then(function (cfg) { return demoState(cfg, "no-server"); });
    });
  }

  window.BWApi = { VERSION: VERSION, boot: boot, request: request, hasTelegram: !!initData };
})();
