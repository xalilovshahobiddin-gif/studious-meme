/* Blue Wolf — chizilgan ikonkalar: 9 ta bino (48×48) va pastki menyu (24×24, currentColor).
 * Resurs ikonkalari va boʻri avatarlari bilan bir uslubda: tekis ranglar, yumshoq soya, ingichka kontur.
 */
window.BW_ICONS = {
  bld: {
    // In — tepalikdagi gʻor ogʻzi, ichida olov
    den: '<ellipse cx="24" cy="41" rx="20" ry="4" fill="#000" opacity=".25"/>' +
      '<path d="M3 40c2-13 9-23 21-25 12 2 19 12 21 25z" fill="#7d6a58"/><path d="M8 40c3-9 8-16 16-18 8 2 13 9 16 18z" fill="#968069"/>' +
      '<path d="M15 40c0-8 4-13 9-13s9 5 9 13z" fill="#1d1712"/>' +
      '<path d="M24 32c-2 3-4 4-4 6.5a4 4 0 0 0 8 0c0-2.5-2-3.5-4-6.5z" fill="#ff9a3d"/><path d="M24 35.5c-1 1.5-2 2-2 3.2a2 2 0 0 0 4 0c0-1.2-1-1.7-2-3.2z" fill="#ffe08a"/>' +
      '<path d="M14 18l3-3 3 2 4-3 4 3 3-2 3 3" stroke="#b39d84" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    // Oziq gʻori — qoya ichida goʻsht zaxirasi
    food_cave: '<ellipse cx="24" cy="41" rx="19" ry="4" fill="#000" opacity=".25"/>' +
      '<path d="M5 40 8 22 17 12h14l9 10 3 18z" fill="#8c9bb3"/><path d="M8 22 17 12h14l9 10-8 4H16z" fill="#b8c4d8"/>' +
      '<path d="M14 40c0-9 4-14 10-14s10 5 10 14z" fill="#2a2420"/>' +
      '<path d="M26.5 29.5c2.4-.6 4.5 1.5 3.9 3.9-.4 1.7-2.1 3-3.9 2.9l-2.5 2.5.4.9a1.4 1.4 0 1 1-2.3 1.2 1.4 1.4 0 1 1-1.2-2.3l.9.4 2.5-2.5c-.1-1.8 1.2-3.5 2.9-3.9z" fill="#e8584f"/>' +
      '<path d="M20.6 37.8l-.9-.4a1.4 1.4 0 1 0 1.2 2.3 1.4 1.4 0 1 0 2.3-1.2l-.4-.9z" fill="#f3e6cf"/>',
    // Ustaxona qoyasi — tosh, shox-shabba va suyak uyumi
    workshop: '<ellipse cx="24" cy="41" rx="20" ry="4" fill="#000" opacity=".25"/>' +
      '<path d="M4 40 9 28l8-4 7 3 3 13z" fill="#7d8ca5"/><path d="M9 28l8-4 7 3-8 3z" fill="#b8c4d8"/>' +
      '<rect x="22" y="31" width="20" height="8" rx="4" fill="#9a6a3c"/><ellipse cx="42" cy="35" rx="3" ry="4" fill="#e3b77e"/>' +
      '<path d="M25 33.5h9M27 36h6" stroke="#7a5230" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M27 22a2 2 0 0 0-3.3 2.2 2 2 0 0 0 1.6 3.3l6.6 6.6a2 2 0 0 0 3.3 1.6 2 2 0 0 0 2.2-3.3 2 2 0 0 0-3.3-1.6l-6.6-6.6a2 2 0 0 0-.5-2.2z" fill="#efe4cc" stroke="#c9b48d" stroke-width=".7" transform="rotate(-20 31 28)"/>',
    // Razvedka qoyasi — baland qoya choʻqqisi, tepasida koʻz
    scout_rock: '<ellipse cx="24" cy="42" rx="14" ry="3.5" fill="#000" opacity=".25"/>' +
      '<path d="M12 41 18 14l6-8 6 8 6 27z" fill="#6b7a93"/><path d="M24 6l6 8 6 27H24z" fill="#55627a"/>' +
      '<path d="M18 14l6-8 6 8-6 3z" fill="#b8c4d8"/>' +
      '<path d="M15 25q9-7 18 0-9 7-18 0z" fill="#e8f2ff" stroke="#1d2a44" stroke-width="1.2"/><circle cx="24" cy="25" r="3" fill="#3b7dff"/><circle cx="24" cy="25" r="1.3" fill="#0b1020"/>',
    // Jang maydoni — aylana maydon va kesishgan tirnoqlar
    battle_ground: '<ellipse cx="24" cy="38" rx="20" ry="7" fill="#000" opacity=".2"/>' +
      '<ellipse cx="24" cy="36" rx="19" ry="6.5" fill="#b98d5a"/><ellipse cx="24" cy="36" rx="14.5" ry="4.5" fill="#cfa36c"/>' +
      // ikki kesishgan qilich-tish
      '<path d="M11 6 34 31" stroke="#dfe7f3" stroke-width="3.4" stroke-linecap="round"/><path d="M37 6 14 31" stroke="#dfe7f3" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M11 6 34 31M37 6 14 31" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M29 29l6-6M19 29l-6-6" stroke="#7a5230" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="24" cy="18.5" r="2.4" fill="#ff5a6a"/>',
    // Himoya devori — qoziqli devor va qalqon
    defense_wall: '<ellipse cx="24" cy="42" rx="20" ry="3.5" fill="#000" opacity=".25"/>' +
      '<path d="M5 41V20l3-4 3 4v21zM13 41V18l3-4 3 4v23zM29 41V18l3-4 3 4v23zM37 41V20l3-4 3 4v21z" fill="#9a6a3c"/>' +
      '<path d="M5 30h38" stroke="#6e4a28" stroke-width="2"/>' +
      '<path d="M24 14l10 3.5v8c0 7-4.6 11.5-10 14-5.4-2.5-10-7-10-14v-8z" fill="#45d483" stroke="#1d6b42" stroke-width="1.4"/>' +
      '<path d="M24 18v18M18 24h12" stroke="#d9ffe9" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>',
    // Ov soʻqmogʻi — oʻt orasidan oʻtgan soʻqmoq va panja izlari
    hunt_path: '<ellipse cx="24" cy="42" rx="20" ry="3.5" fill="#000" opacity=".2"/>' +
      '<path d="M8 42c8-6 4-14 14-20s10-10 8-16h6c2 7-1 12-9 17s-6 13-13 19z" fill="#c9a26c"/>' +
      '<path d="M4 41q2-6 4-8M9 41q1-5-1-8M40 30q2-5 4-6M43 31q0-4-2-7" stroke="#6fae58" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<g fill="#5a3d22"><circle cx="17" cy="34" r="2"/><circle cx="14.5" cy="31" r=".9"/><circle cx="17" cy="30" r=".9"/><circle cx="19.5" cy="31" r=".9"/>' +
      '<circle cx="28" cy="17" r="2"/><circle cx="25.5" cy="14" r=".9"/><circle cx="28" cy="13" r=".9"/><circle cx="30.5" cy="14" r=".9"/></g>',
    // Shifo gʻori — gʻor va shifobaxsh barg
    hospital: '<ellipse cx="24" cy="41" rx="19" ry="4" fill="#000" opacity=".25"/>' +
      '<path d="M5 40c2-12 9-22 19-24 10 2 17 12 19 24z" fill="#7d8ca5"/><path d="M13 40c0-8 5-13 11-13s11 5 11 13z" fill="#1f2a3a"/>' +
      '<path d="M24 6c6 2 8 8 4 14-3 4-8 4-8 4s-2-6 0-11c1-3 2-5 4-7z" fill="#45d483"/><path d="M24 8c0 6-1 11-4 16" stroke="#1d6b42" stroke-width="1.1" fill="none"/>' +
      '<path d="M24 31v7M20.5 34.5h7" stroke="#ff8a93" stroke-width="2.4" stroke-linecap="round"/>',
    // Bozor — yoʻl-yoʻl soyabonli chodir
    market: '<ellipse cx="24" cy="42" rx="19" ry="3.5" fill="#000" opacity=".25"/>' +
      '<path d="M8 22h32v19H8z" fill="#9a6a3c"/><path d="M12 28h24v13H12z" fill="#3a2a1c"/>' +
      '<path d="M5 22 10 10h28l5 12z" fill="#f5c04a"/><path d="M10 10l-2 12h6l2-12zm12 0-1 12h6l-1-12zm11 0 1 12h6l-3-12z" fill="#e0574f"/>' +
      '<circle cx="18" cy="35" r="2.6" fill="#e8584f"/><circle cx="24" cy="35" r="2.6" fill="#efe4cc"/><circle cx="30" cy="35" r="2.6" fill="#8c9bb3"/>'
  },
  nav: {
    // currentColor — faol tab rangini oladi
    den: '<path d="M2 20 8.5 9l3 4 3.5-6L22 20z" fill="currentColor" opacity=".35"/><path d="M2 20 8.5 9l3 4 3.5-6L22 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20c0-3 1-5 2.5-5s2.5 2 2.5 5" fill="currentColor"/>',
    battle: '<path d="M4 4c4 3 8 8 10 14M20 4c-4 3-8 8-10 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M7 17l-3 3M17 17l3 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    pack: '<path d="M5 2.5 9 8h6l4-5.5.8 9.5L15 17l-3 4.5L9 17l-4.8-5z" fill="currentColor" opacity=".3"/>' +
      '<path d="M5 2.5 9 8h6l4-5.5.8 9.5L15 17l-3 4.5L9 17l-4.8-5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M7.5 11.5l2.3.8M16.5 11.5l-2.3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10.6 18.2h2.8L12 20z" fill="currentColor"/>',
    quests: '<rect x="5" y="3" width="14" height="18" rx="2.5" fill="currentColor" opacity=".3"/><rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 9l1.5 1.5L13 7.5M8.5 15l1.5 1.5 3-3M15 9.5h1.5M15 15.5h1.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    profile: '<circle cx="12" cy="14" r="4.2" fill="currentColor"/><circle cx="6" cy="9" r="2" fill="currentColor"/><circle cx="10" cy="5.5" r="2" fill="currentColor"/><circle cx="14" cy="5.5" r="2" fill="currentColor"/><circle cx="18" cy="9" r="2" fill="currentColor"/>'
  },
  /* Har bir boʻri darajasining yashash muhiti — avatar fonlari bilan bir xil (tools/gen_wolf_avatars.py) */
  habitat: {
    1: "forest", 2: "mountain", 3: "desert", 4: "steppe", 5: "swamp", 6: "mountain", 7: "desert", 8: "autumn", 9: "steppe",
    10: "steppe", 11: "snow", 12: "forest", 13: "mountain", 14: "snow", 15: "steppe", 16: "forest", 17: "snow", 18: "forest",
    19: "mountain", 20: "ice", 21: "tar", 22: "aurora", 23: "mountain", 24: "fire", 25: "sky"
  }
};
