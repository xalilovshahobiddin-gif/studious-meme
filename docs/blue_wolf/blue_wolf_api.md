# Blue Wolf — API spetsifikatsiyasi

Baza URL: `https://bluewolf.uz/api/v1`
Format: JSON, UTF-8. Barcha vaqtlar ISO 8601 UTC (`2026-09-20T14:30:00Z`).

---

## 1. Autentifikatsiya

Har soʻrovda sarlavha:

```
X-Init-Data: <Telegram WebApp initData satri>
X-Client-Version: 1.0.0
```

Server `initData` ni HMAC-SHA256 bilan tekshiradi (kalit = `HMAC-SHA256("WebAppData", BOT_TOKEN)`). Imzo notoʻgʻri yoki `auth_date` 24 soatdan eski boʻlsa → `401`.

Sessiya saqlanmaydi — har soʻrov mustaqil tekshiriladi.

**Idempotentlik:** holat oʻzgartiruvchi barcha `POST` larda `X-Request-Id` (UUID) talab qilinadi. Bir xil id bilan takroriy soʻrov oʻsha javobni qaytaradi, amal ikki marta bajarilmaydi.

---

## 2. Javob konverti

Muvaffaqiyat:
```json
{
  "ok": true,
  "data": { },
  "state": { "resources": {}, "queues": [], "server_time": "..." }
}
```

`state` — har javobga qoʻshiladigan qisqa snapshot. Klient shu bilan yangilanadi, alohida soʻrov kerak emas.

Xato:
```json
{ "ok": false, "error": { "code": "NOT_ENOUGH_RESOURCES", "message": "...", "details": {} } }
```

### Xato kodlari

| Kod | HTTP | Maʼnosi |
|---|---|---|
| `UNAUTHORIZED` | 401 | initData notoʻgʻri yoki eski |
| `BANNED` | 403 | Akkaunt bloklangan |
| `NOT_ENOUGH_RESOURCES` | 400 | Resurs yetarli emas |
| `LEVEL_TOO_LOW` | 400 | Daraja yetarli emas |
| `BUILDING_TOO_LOW` | 400 | Bino darajasi yetarli emas |
| `QUEUE_BUSY` | 409 | Navbat band |
| `CAPACITY_FULL` | 400 | Qoʻshin yoki bino sigʻimi toʻlgan |
| `TIER_LOCKED` | 400 | Tier hali ochilmagan |
| `OUT_OF_WINDOW` | 400 | Hujum oynasidan tashqarida |
| `TARGET_SHIELDED` | 400 | Raqib qalqon ostida |
| `PAIR_LIMIT` | 429 | Bir raqibga kunlik limit |
| `ON_VACATION` | 400 | Taʼtil rejimida |
| `SPEEDUP_CAP` | 429 | Kunlik tezlashtirish chegarasi |
| `WAR_ACTIVE` | 409 | Urush davomida ruxsat yoʻq |
| `RATE_LIMITED` | 429 | Soʻrov chastotasi |
| `VERSION_OUTDATED` | 426 | Klientni yangilash kerak |

---

## 3. Holat va profil

### `GET /state`
Toʻliq oʻyin holati. Kirishda bir marta chaqiriladi; resurslar shu yerda timestamp boʻyicha hisoblanadi.

```json
{ "player": {...}, "resources": {...}, "buildings": [...], "army": [...],
  "queues": [...], "marches": [...], "shield_until": null, "hunger": false,
  "offline_report": { "away_seconds": 259200, "gained": {...}, "attacks": [...] } }
```

`offline_report` faqat 30 daqiqadan koʻp yoʻqlikdan keyin qaytadi — qaytish ekrani shundan chiziladi.

### `GET /profile`
Qoʻshin tarkibi (rol × tier), CP, statistika, liga, mavsum reytingi.

### `POST /profile/language`  `{ "lang": "ru" }`

### `POST /profile/allocation`
Ustaxona taqsimoti. `{ "stone": 40, "wood": 30, "hide": 15, "bone": 15 }` — yigʻindisi 100.

---

## 4. In va binolar

### `GET /buildings`
Har bino: joriy daraja, keyingi daraja narxi va vaqti, samara farqi.

### `POST /buildings/upgrade`
`{ "type": "food_cave" }` → navbatga qoʻshiladi.
Tekshiruv: resurs, `level <= player.level`, navbat boʻsh (yoki 2-slot sotib olingan).
`type: "den"` — **har doim rad etiladi** (`400 DEN_AUTO_LEVEL`). In navbat orqali qurilmaydi, darajasi `player.level` bilan avtomatik sinxron (GDD bo'lim 5).

### `POST /buildings/collect`
Ustaxona yigʻimini omborga oʻtkazish (avtomatik yigʻish sotib olinmagan boʻlsa).

### `POST /market/exchange`
`{ "from": "stone", "to": "bone", "amount": 500 }`
Kurs va soliq `market` bino darajasidan. Kunlik limit tekshiriladi.

### `POST /hospital/heal`
`{ "role": "attacker", "tier": 3, "qty": 20 }` → davolash navbati.

---

## 5. Qoʻshin

### `GET /army`
Rol × tier jadvali, sigʻim, toʻlganlik, joriy vaqt koeffitsienti.

### `POST /army/train`
`{ "role": "attacker", "tier": 2, "qty": 50 }`
Vaqt = tier bazaviy vaqti × bino jazosi × toʻlganlik koeff. ÷ mashq tezligi.

### `POST /army/promote`
`{ "role": "attacker", "from_tier": 1, "to_tier": 2, "qty": 100 }`
Server kerakli past tier askar sonini kuch nisbati × (1 + yoʻqotish) boʻyicha hisoblaydi va tasdiqlaydi.

### `GET /army/promote/preview`
Almashtirishdan oldin: nechta askar ketadi, nechta chiqadi, qancha resurs va vaqt.

### `POST /queue/cancel`  `{ "queue_id": 123 }`
Resurs 80% qaytariladi.

### `POST /queue/speedup`
`{ "queue_id": 123, "seconds": 3600 }`
Tekshiruv: kunlik chegara (`speedup_usage`), urush davom etmayotgani, progressiv narx.

---

## 6. PvP

### `GET /pvp/targets`
9 ta raqib. Har biri: `id`, `name`, `level`, `distance_km`, `power_band` (`weak|even|strong`), `shielded`, `last_seen`, `scouted` (hisobot bormi).
Roʻyxat 30 daqiqa yoki 3 hujumdan keyin yangilanadi.

### `POST /pvp/targets/refresh`
Qoʻlda yangilash (kunlik limit bilan).

### `POST /pvp/scout`
`{ "target_id": 456, "payload": [{"role":"scout","tier":2,"qty":10}] }`
Yurish yaratiladi. Natija `scout_reports` ga tushadi, 30 daqiqa amal qiladi.

### `GET /pvp/scout/:target_id`
Oxirgi razvedka hisoboti. `grade`: `fail | partial | full | exact` — maʼlumot hajmi shunga qarab.

### `POST /pvp/attack`
```json
{ "target_id": 456, "payload": [{"role":"attacker","tier":3,"qty":80},
                                 {"role":"scout","tier":2,"qty":10}] }
```
Tekshiruv: hujum oynasi (±1 daraja), qalqon, juftlik chegarasi, taʼtil, askarlar inda turganmi.
Javob: `march_id`, `arrives_at`, `returns_at`.

### `POST /march/:id/recall`
Qaytarib chaqirish. Qaytish vaqti toʻliq hisoblanadi.

### `POST /march/:id/speedup_return`
Faqat `state = returning` boʻlganda. Iningizga hujum kelayotgan boʻlsa → `400`.

### `GET /battles?limit=20&cursor=...`
Jang jurnali. Har yozuv: raqib, natija, EP nisbati, yoʻqotishlar, oʻlja, raund jurnali.

### `GET /battles/:id`
Toʻliq raund-raund hisobot.

---

## 7. Lager va oazis

### `POST /camp/send`
`{ "payload": [...], "hours": 8 }` → yigʻish boshlanadi.

### `POST /camp/:id/recall`
Erta chaqirish, yigʻilgani saqlanadi.

### `GET /oases`
20 nuqta: turi, koordinatalar, egasi (klan), `hold_until`, bonus.

### `POST /oases/:id/attack`
Klan aʼzosi sifatida egallashga urinish. `hold_until` oʻtmagan boʻlsa → `400`.

---

## 8. Klan (toʻda)

### `GET /clans/search?q=...&lang=uz`
### `POST /clans` — yaratish `{ "name": "...", "tag": "...", "lang": "uz" }`
### `POST /clans/:id/join` / `POST /clans/leave`
### `GET /clans/:id` — profil, aʼzolar, oazislar, urush tarixi
### `POST /clans/:id/members/:player_id/role` — lavozim (faqat alfa)
### `POST /clans/:id/kick` — chiqarish
### `POST /clans/:id/treasury/deposit` — xazinaga hissa

---

## 9. Toʻda urushi

### `GET /wars/offers`
Server taklif qilgan 6 klan (±20% kuch oynasi). Har biri: kuch, aʼzo soni, oxirgi faollik.

### `POST /wars/declare`
`{ "target_clan_id": 77 }` — faqat alfa yoki beta. Xazinadan 5% garov ushlanadi.
Tekshiruv: 7 kunlik takror bloki, bir vaqtda faqat 1 urush (15-darajadan 2 ta).

### `POST /wars/:id/accept` — 30 daqiqa ichida
### `GET /wars/:id` — jonli holat: bosqich, ball, qolgan vaqt, hissa jadvali
### `POST /wars/:id/send`
`{ "payload": [{"role":"attacker","tier":4,"qty":60}] }`
Faqat `prep`, `wave1`, `pause`, `wave2` bosqichlarida.

### `GET /wars/:id/result`
Yakuniy hisob, yoʻqotishlar (oʻlim/kasalxona), aʼzo mukofotlari.

---

## 10. Vazifalar va mavsum

### `GET /quests` — kundalik, haftalik, bosqichli
### `POST /quests/:id/claim`
### `GET /season` — joriy mavsum, shaxsiy ball, reyting, liga, fond
### `GET /season/leaderboard?scope=global|clan&limit=100`
### `GET /season/:id/reward` — audit tugagach toʻlov holati

---

## 11. Doʻkon va monetizatsiya

### `GET /shop`
Paketlar, tezlashtirish narxlari (progressiv), doimiy xaridlar, kunlik chegara holati.

### `POST /shop/invoice`
`{ "item_key": "pack_medium" }` → Telegram Stars invoice havolasi.

### `POST /shop/webhook` *(faqat Telegram)*
Toʻlov tasdigʻi. `tg_payment_id` unikal — takror hisoblanmaydi.

### `POST /shop/purchase`
Oy toshi bilan ichki xarid: `{ "item_key": "second_queue" }`.

### `POST /vacation/start`  `{ "hours": 72 }`
12 soatdan keyin ishga tushadi. Urush davomida yoki kelayotgan hujum boʻlsa → `400`.

### `POST /vacation/cancel`

---

## 12. Tanishtiruv va xizmat

### `POST /tutorial/step`  `{ "step": 7 }` — progress saqlanadi, mukofot beriladi
### `POST /tutorial/skip` — faqat 12-qadamdan keyin
### `GET /notifications?unread=1`
### `POST /notifications/settings` — turlar boʻyicha yoqish/oʻchirish
### `POST /events` — analitika `{ "event": "...", "payload": {} }` (batch, 20 tagacha)
### `GET /config` — klient uchun ochiq parametrlar (narxlar, vaqtlar, matn versiyasi)
### `GET /locales/:lang?since=...` — lokalizatsiya paketi, keshlanadi

---

## 13. Chastota cheklovlari

| Guruh | Limit |
|---|---|
| `GET /state`, `/profile` | 60/daqiqa |
| Holat oʻzgartiruvchi `POST` | 30/daqiqa |
| `/pvp/attack`, `/pvp/scout` | 20/daqiqa |
| `/pvp/targets/refresh` | 10/soat |
| `/events` | 120/daqiqa |

Oshsa → `429` va `Retry-After` sarlavhasi.

---

## 14. Umumiy qoidalar

- **Klientga hech qachon ishonilmaydi.** Narx, vaqt, CP, oʻlja — hammasi serverda qayta hisoblanadi.
- Barcha raqamlar `game_config` dan oʻqiladi, koddan emas.
- Jang natijasi faqat serverda hisoblanadi; klient animatsiyani `log` maydonidan chizadi.
- Har holat oʻzgarishi bitta tranzaksiyada: resurs yechish + navbat yaratish atomar.
- Yurish va jang vaqtlari `arrives_at` / `returns_at` sifatida saqlanadi — klient taymerni shulardan chizadi, server vaqti bilan sinxronlaydi (`state.server_time`).
- Har javobda `state` snapshot boʻlgani uchun klient kamdan-kam `GET /state` chaqiradi.

---

**Jami: 60 endpoint** *(tuzatildi — avval "48" yozilgan edi; hujjatdagi barcha endpointlarni sanab chiqsak 60 ta chiqadi, shu jumladan bitta sarlavhada birga yozilgan `POST /clans/leave`).* MVP uchun kerakli ~23 tasi: `/state`, `/profile`, `/buildings*` (3), `/army*` (4), `/queue*` (2), `/pvp*` (6), `/quests*` (2), `/tutorial*` (2), `/config`, `/locales`.
