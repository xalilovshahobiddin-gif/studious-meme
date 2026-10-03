/* Blue Wolf — service worker (v0.0.5).
   Ilova qobigʻi keshlanadi (oflayn ochiladi); API soʻrovlari hech qachon keshlanmaydi. */
var CACHE = "bluewolf-v0.0.5";
var SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "ui/bluewolf-ui.css?v=0.0.5", "ui/bluewolf-icons.js?v=0.0.5", "css/app.css?v=0.0.5",
  "js/demo-data.js?v=0.0.5", "js/game.js?v=0.0.5", "js/api.js?v=0.0.5", "js/app.js?v=0.0.5",
  "data/game_config.json", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf("/api/") !== -1) return;
  // Tarmoq birinchi, boʻlmasa — kesh (yangi versiya darhol koʻrinadi)
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    if (res.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return res;
  }).catch(function () {
    return caches.match(e.request).then(function (hit) { return hit || caches.match("index.html"); });
  }));
});
