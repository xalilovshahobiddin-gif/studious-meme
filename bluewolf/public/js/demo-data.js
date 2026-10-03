/* Blue Wolf — demo maʼlumotlar (v0.0.9).
   Server topilmaganda (GitHub Pages, oddiy brauzer) ilova shu bilan ochiladi.
   Raqamlar GDD dagi 5-darajali oʻyinchiga mos namuna.
   v0.0.2: resurslar qurilmada vaqt boʻyicha hisoblanadi (localStorage "bw.demo.econ"). */
window.BW_DEMO = {
  player: { id: 0, name: "Alfa", username: "demo", lang: "uz", level: 5, xp: 412, tutorial_step: 99, free_speedups: 5 },
  resources: { meat: 52, water: 41, herb: 12, moonlight: 0, stone: 820, wood: 610, hide: 240, bone: 305, moonstone: 0 },
  buildings: [
    { type: "den", level: 5 }, { type: "food_cave", level: 3 }, { type: "workshop", level: 4 },
    { type: "hunt_path", level: 2 }, { type: "battle_ground", level: 2 }, { type: "scout_rock", level: 1 },
    { type: "defense_wall", level: 1 }, { type: "hospital", level: 0 }, { type: "market", level: 0 }
  ],
  // rol → tier boʻyicha sogʻlom askarlar soni
  army: { scout: [2, 0, 0, 0, 0, 0], attacker: [4, 0, 0, 0, 0, 0], defender: [2, 0, 0, 0, 0, 0], hunter: [2, 0, 0, 0, 0, 0] },
  army_away: { scout: [0, 0, 0, 0, 0, 0], attacker: [0, 0, 0, 0, 0, 0], defender: [0, 0, 0, 0, 0, 0], hunter: [0, 0, 0, 0, 0, 0] },
  army_injured: { scout: [0, 0, 0, 0, 0, 0], attacker: [0, 0, 0, 0, 0, 0], defender: [0, 0, 0, 0, 0, 0], hunter: [0, 0, 0, 0, 0, 0] },
  marches: [],
  queues: [],
  targets: [
    { slot: 1, bot: true, name: "Tunggi toʻda", level: 4, band: "weak", km: 6 },
    { slot: 2, bot: true, name: "Qoya boʻrilari", level: 4, band: "even", km: 12 },
    { slot: 3, bot: true, name: "Sargʻish izlar", level: 5, band: "weak", km: 9 },
    { slot: 4, bot: true, name: "Dasht daydilari", level: 5, band: "even", km: 15 },
    { slot: 5, bot: true, name: "Qorli jarlik", level: 5, band: "strong", km: 22 },
    { slot: 6, bot: true, name: "Qora tikan", level: 5, band: "even", km: 18 },
    { slot: 7, bot: true, name: "Shamol toʻdasi", level: 6, band: "strong", km: 30 },
    { slot: 8, bot: true, name: "Kumush tuyoq", level: 6, band: "even", km: 26 },
    { slot: 9, bot: true, name: "Oydin soy", level: 6, band: "weak", km: 34 }
  ],
  battles: []
};

/* Yangi oʻyinchi (tanishtiruv bilan): 1-daraja, hech narsa yoʻq — server yangi oʻyinchiga beradigan holat. */
window.BW_DEMO_NEW = (function () {
  var d = JSON.parse(JSON.stringify(window.BW_DEMO));
  var zero = function () { return { scout: [0, 0, 0, 0, 0, 0], attacker: [0, 0, 0, 0, 0, 0], defender: [0, 0, 0, 0, 0, 0], hunter: [0, 0, 0, 0, 0, 0] }; };
  d.player = { id: 0, name: "Alfa", username: "demo", lang: "uz", level: 1, xp: 0, tutorial_step: 0, free_speedups: 5 };
  d.resources = { meat: 0, water: 0, herb: 0, moonlight: 0, stone: 0, wood: 0, hide: 0, bone: 0, moonstone: 0 };
  d.buildings.forEach(function (b) { b.level = b.type === "den" ? 1 : 0; });
  d.army = zero(); d.army_away = zero(); d.army_injured = zero();
  return d;
})();
