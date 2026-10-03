/* Blue Wolf — demo maʼlumotlar (v0.0.3).
   Server topilmaganda (GitHub Pages, oddiy brauzer) ilova shu bilan ochiladi.
   Raqamlar GDD dagi 5-darajali oʻyinchiga mos namuna.
   v0.0.2: resurslar qurilmada vaqt boʻyicha hisoblanadi (localStorage "bw.demo.econ"). */
window.BW_DEMO = {
  player: { id: 0, name: "Alfa", username: "demo", lang: "uz", level: 5, xp: 412, tutorial_step: 20, free_speedups: 5 },
  resources: { meat: 52, water: 41, herb: 12, moonlight: 0, stone: 820, wood: 610, hide: 240, bone: 305, moonstone: 0 },
  buildings: [
    { type: "den", level: 5 }, { type: "food_cave", level: 3 }, { type: "workshop", level: 4 },
    { type: "hunt_path", level: 2 }, { type: "battle_ground", level: 2 }, { type: "scout_rock", level: 1 },
    { type: "defense_wall", level: 1 }, { type: "hospital", level: 0 }, { type: "market", level: 0 }
  ],
  // rol → tier boʻyicha sogʻlom askarlar soni
  army: { scout: [2, 0, 0, 0, 0, 0], attacker: [6, 0, 0, 0, 0, 0], defender: [2, 0, 0, 0, 0, 0], hunter: [2, 0, 0, 0, 0, 0] },
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
  parties: [
    { id: 1, leader: "Bahodir", prey: "Jayron", members: 2, max: 4, departs_min: 6 },
    { id: 2, leader: "Nigora", prey: "Jayron", members: 3, max: 4, departs_min: 2 }
  ],
  quests: {
    daily: [
      { key: "hunter", title: "Ovchi", desc: "3 marta ov qil", progress: 2, target: 3, reward: "40 kg goʻsht" },
      { key: "builder", title: "Quruvchi", desc: "1 ta binoni kuchaytir", progress: 1, target: 1, reward: "Tosh + shox-shabba", done: true },
      { key: "trainer", title: "Murabbiy", desc: "1 ta askar tayyorla", progress: 0, target: 1, reward: "Suyak" },
      { key: "fighter", title: "Jangchi", desc: "1 ta hujum (botlar ham)", progress: 0, target: 1, reward: "10 daqiqa tezlashtirish" },
      { key: "login", title: "Kirish bonusi", desc: "Oʻyinga kir", progress: 1, target: 1, reward: "Kichik goʻsht paketi", done: true }
    ],
    weekly: [
      { key: "big_hunt", title: "Katta ov", desc: "20 marta ov qil", progress: 7, target: 20, reward: "Haftalik byudjetning 40%" },
      { key: "traveler", title: "Sayohatchi", desc: "3 ta razvedka (MVP)", progress: 1, target: 3, reward: "Aralash resurs paketi" },
      { key: "raider", title: "Tajovuzkor", desc: "10 ta hujum", progress: 2, target: 10, reward: "30 daqiqa tezlashtirish" },
      { key: "pack", title: "Toʻda aʼzosi", desc: "3 ta guruh ovi", progress: 0, target: 3, reward: "Goʻsht paketi" }
    ]
  },
  battles: []
};
