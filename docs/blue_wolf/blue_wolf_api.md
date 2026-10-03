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

**Idempotentlik:** holat oʻzgartiruvchi barcha `POST` larda `X-Request-Id` (UUID) talab qilinadi. Bir xil id bilan takroriy soʻrov saqlangan javobni qaytaradi, amal ikki marta bajarilmaydi. Javoblar `request_log` jadvalida 24 soat saqlanadi; bir xil id boshqa tana bilan kelsa → `409 IDEMPOTENCY_CONFLICT`.

**Telegram webhook** (`POST /bot/webhook`) bu qoidadan mustasno: u `initData` emas, `X-Telegram-Bot-Api-Secret-Token` sarlavhasi bilan tekshiriladi (13-boʻlim).

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
| `PAIR_LIMIT` | 400 | Bir raqibga 24 soatda 3 hujum chegarasi |
| `ON_VACATION` | 400 | Taʼtil rejimida |
| `SPEEDUP_CAP` | 400 | Kunlik tezlashtirish chegarasi (25%) |
| `WAR_ACTIVE` | 409 | Urush davomida ruxsat yoʻq |
| `DEN_AUTO_LEVEL` | 400 | In navbat orqali qurilmaydi |
| `INCOMING_ATTACK` | 400 | Iningizga hujum kelmoqda (qaytish tezlashtirishi, taʼtil) |
| `OASIS_PROTECTED` | 400 | Oazis `hold_until` gacha daxlsiz |
| `TUTORIAL_LOCKED` | 400 | Tanishtiruvning 1–12-qadamida faqat koʻrsatilgan amal ruxsat |
| `IDEMPOTENCY_CONFLICT` | 409 | Bir xil `X-Request-Id`, boshqa tana |
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

### `POST /profile/settings`
`{ "lang": "ru", "tz": "Asia/Tashkent", "allows_pm": true }` — barcha maydonlar ixtiyoriy. `tz` klient `Intl.DateTimeFormat().resolvedOptions().timeZone` dan yuboradi (tungi bildirishnoma qoidasi uchun); `allows_pm` — `WebApp.requestWriteAccess()` natijasi.

### `POST /profile/allocation`
Ustaxona taqsimoti. `{ "stone": 40, "wood": 30, "hide": 15, "bone": 15 }` — yigʻindisi 100.

---

## 4. In va binolar

### `GET /buildings`
Har bino: joriy daraja, keyingi daraja narxi va vaqti, samara farqi.

### `POST /buildings/upgrade`
`{ "type": "food_cave" }` → navbatga qoʻshiladi.
Tekshiruv: resurs, `level <= player.level`, navbat boʻsh (2-slot: 10-darajadan yoki erta sotib olingan boʻlsa).
Yechilgan resurslar `queues.cost` ga yoziladi (bekor qilishda 80% qaytarish shundan).
1-daraja binolar bo'lim ochilganda avtomatik paydo boʻladi — bu endpoint faqat 2+ daraja uchun.
`type: "den"` — **har doim rad etiladi** (`400 DEN_AUTO_LEVEL`). In darajasi `player.level` bilan avtomatik sinxron (GDD bo'lim 5).

### `POST /buildings/collect`
Ustaxona buferini (`buf_*`) omborga oʻtkazish. “Avtomatik yigʻish” sotib olingan boʻlsa har soʻrovda oʻzi bajariladi.

### `POST /market/exchange`
`{ "from": "stone", "to": "bone", "amount": 500 }`
Kurs va soliq `market` bino darajasidan. Kunlik limit tekshiriladi.

### `POST /hospital/heal`
`{ "role": "attacker", "tier": 3, "qty": 20 }` → davolash navbati. Narx: `2 × tier` shifobaxsh oʻt bir boʻri uchun; bir vaqtda Shifo gʻori sigʻimicha boʻri.

---

## 5. Qoʻshin

### `GET /army`
Rol × tier jadvali, sigʻim, toʻlganlik, joriy vaqt koeffitsienti.

### `POST /army/train`
`{ "role": "attacker", "tier": 2, "qty": 50 }`
Vaqt = tier vaqti × MIN(5, bino jazosi × toʻlganlik koeff.) ÷ (mashq tezligi × In koeff.). Tier: `MAX(1, MIN(6, daraja ÷ 4, bino ÷ 4))`.

### `POST /army/promote`
`{ "role": "attacker", "from_tier": 1, "to_tier": 2, "qty": 100 }`
Server kerakli past tier askar sonini kuch nisbati × (1 + yoʻqotish) boʻyicha hisoblaydi va tasdiqlaydi.

### `GET /army/promote/preview`
Almashtirishdan oldin: nechta askar ketadi, nechta chiqadi, qancha resurs va vaqt.

### `POST /queue/cancel`
`{ "queue_id": 123 }` — `queues.cost` ning 80% i qaytariladi.

### `POST /queue/speedup`
`{ "queue_id": 123, "blocks": 1, "use_free": false }` — 1 blok = 1 soat.
Tekshiruv: kunlik chegara (`speedup_usage`), urush davom etmayotgani, progressiv narx (kunlik, 00:00 UTC da nolga tushadi). `use_free: true` — tanishtiruvdan qolgan bepul tezlashtirish.

---

## 6. Ov

### `GET /hunt/board`
Joriy ov xaritasi (GDD bo'lim 4 “Ov xaritasi”): `{ window, refresh_at, cards: [...] }`. Karta: `slot` (0–8, vaqt boʻyicha tartibda), `band` (0 yaqin · 1 oʻrta · 2 uzoq), `prey`, `prey_kg`, `count`, `herd_kg`, `km`, `minutes`, `bonus`, `injury`, `death`, `min_pack`, `status` (`open` · `hunting` · `done`). Har `hunt_board_refresh_h` soatda yangilanadi, har oʻyinchida har xil. `/state` javobida ham bor.

### `POST /hunt/solo`
Yolgʻiz ov (alfa) — faqat 1–3 daraja. Oniy natija: shu darajaning asosiy oʻljasi; 2 daqiqa kutish (`COOLDOWN`).

### `POST /hunt`
`{ "slot": 4, "payload": { "hunter": { "1": 3 }, "attacker": { "1": 1 } } }`
Kartadagi ov (`marches.kind = 'hunt'`, `board_window`, `board_slot`). Natija = MIN(poda, Σ ovchi unumi × vaqt × (1 + bonus)); toʻda oʻljaning minimal hajmidan kichik boʻlsa ×0.30; +10% shifobaxsh oʻt. Yarador/halok shu paytda aniqlanadi, javobda koʻrsatilmaydi — qaytishda `finished` da.
Xatolar: `QUEUE_BUSY` (karta ovlangan yoki ovda), `VALIDATION` (ovchi yoʻq, askar yetmaydi, notoʻgʻri slot).
Javob: `march` (`returns_at`).

---

## 7. PvP

### `GET /pvp/targets`
9 ta slot. Har biri: `slot`, `is_bot`, `name`, `level`, `distance_km`, `power_band` (`weak|even|strong`), `shielded`, `last_seen`, `scouted` (hisobot bormi); oʻyinchi boʻlsa `player_id`.
4–6 darajada barcha slotlar — botlar (yovvoyi toʻdalar); 7+ darajada mos raqib yetmasa boʻsh joylar bot bilan toʻldiriladi.
Roʻyxat 30 daqiqa yoki 3 hujumdan keyin yangilanadi.

### `POST /pvp/targets/refresh`
Qoʻlda yangilash (kunlik limit bilan).

### `POST /pvp/scout`
`{ "slot": 3, "payload": [{"role":"scout","tier":2,"qty":10}] }` yoki `{ "target_id": 456, ... }` (erkin reyd/qasos uchun).
Yurish yaratiladi. Natija `scout_reports` ga tushadi, 30 daqiqa amal qiladi; 10 daqiqa kutish.

### `GET /pvp/scout/:slot`
Shu slotdagi raqib boʻyicha oxirgi razvedka hisoboti. `grade`: `fail | partial | full | exact` — maʼlumot hajmi shunga qarab.

### `POST /pvp/attack`
```json
{ "slot": 3, "payload": [{"role":"attacker","tier":2,"qty":80},
                          {"role":"scout","tier":1,"qty":10}] }
```
`slot` — server taklif qilgan raqib (mavsum jangi, `is_ranked = 1`). Oʻrniga `target_id` berilsa — erkin reyd yoki qasos (mavsumga hisoblanmaydi yoki 50%).
Tekshiruv: hujum oynasi (±1 daraja; 1–6 daraja faqat botga), qalqon, juftlik chegarasi (24 soatda 3), taʼtil, askarlar inda turganmi.
Javob: `march_id`, `arrives_at`, `returns_at`.

### `GET /march/:id`
Bitta yurish holati: `kind`, `state`, `arrives_at`, `returns_at`, `loot`.

### `POST /march/:id/recall`
Qaytarib chaqirish. Qaytish vaqti toʻliq hisoblanadi.

### `POST /march/:id/speedup_return`
Faqat `state = returning` boʻlganda, bir yurishga bir marta. Narx: `ceil(0.6 × Σ blok narxi)`, bloklar = `ceil(qolgan soat)`. Iningizga hujum kelayotgan boʻlsa → `400 INCOMING_ATTACK`.

### `GET /battles?limit=20&cursor=...`
Jang jurnali. Har yozuv: raqib, natija, EP nisbati, yoʻqotishlar, oʻlja, raund jurnali.

### `GET /battles/:id`
Toʻliq raund-raund hisobot.

---

## 8. Lager va oazis

### `POST /camp/send`
`{ "payload": [...], "hours": 8 }` → yigʻish boshlanadi.

### `POST /camp/:id/recall`
Erta chaqirish, yigʻilgani saqlanadi.

### `GET /oases`
20 nuqta: turi, koordinatalar, egasi (klan), `hold_until`, bonus.

### `POST /oases/:id/attack`
Klan aʼzosi sifatida egallashga urinish. `hold_until` oʻtmagan boʻlsa → `400 OASIS_PROTECTED`.

---

## 9. Klan (toʻda)

### `GET /clans/search?q=...&lang=uz`
### `POST /clans`
Yaratish `{ "name": "...", "tag": "...", "lang": "uz", "join_mode": "open" }` (4+ daraja).
### `POST /clans/:id/join`
`join_mode = open` — darhol aʼzo; `request` — soʻrov (`clan_members.state = requested`).
### `POST /clans/leave`
### `GET /clans/:id`
Profil, aʼzolar, soʻrovlar (alfa/beta uchun), oazislar, urush tarixi.
### `POST /clans/:id/requests/:player_id/approve`
### `POST /clans/:id/requests/:player_id/reject`
### `POST /clans/:id/members/:player_id/role`
Lavozim (faqat alfa).
### `POST /clans/:id/members/:player_id/kick`
Chiqarish (alfa yoki beta).
### `POST /clans/:id/treasury/deposit`
Xazinaga hissa.

---

## 10. Toʻda urushi

### `GET /wars/offers`
Server taklif qilgan 6 klan (±20% kuch oynasi). Har biri: kuch, aʼzo soni, oxirgi faollik.

### `POST /wars/declare`
`{ "target_clan_id": 77 }` — faqat alfa yoki beta. Xazinadan 5% garov ushlanadi.
Tekshiruv: 7 kunlik takror bloki, bir vaqtda faqat 1 urush (15-darajadan 2 ta).

### `POST /wars/:id/accept`
30 daqiqa ichida, faqat alfa yoki beta.

### `POST /wars/:id/decline`
Rad etish yoki 30 daqiqa javobsiz qolish: klan reytingi −50, eʼlon qilganning garovi qaytariladi.
### `GET /wars/:id` — jonli holat: bosqich, ball, qolgan vaqt, hissa jadvali
### `POST /wars/:id/send`
`{ "payload": [{"role":"attacker","tier":4,"qty":60}] }`
Faqat `prep`, `wave1`, `pause`, `wave2` bosqichlarida.

### `GET /wars/:id/result`
Yakuniy hisob, yoʻqotishlar (oʻlim/kasalxona), aʼzo mukofotlari (15% shiftdan ortgani — klan xazinasiga).

---

## 11. Vazifalar va mavsum

### `GET /quests`
`{ d, w, m, login, combo }` — har davr: `key`, `ends_at`, `quests: [{ id, key, title, desc, target, progress, reward, claimed }]`,
`chest: { id, target, progress, claimed, reward }`. `login: { day, claimed_today, gifts[7] }`, `combo: { streak, next, mult, max_days }`.
Vazifalar har oʻyinchiga oʻz urugʻi bilan tanlanadi (GDD bo'lim 14). `/state` va har javob `state` ida ham bor.
### `POST /quests/claim`
`{ "id": 123 }` — bajarilgan vazifa yoki davr sandigʻi (hamma vazifa mukofoti olingach). Kun sandigʻi kun kombosi koeffitsienti bilan.
Javob: `{ reward, lost }` (`lost` — Oziq gʻoriga sigʻmagan goʻsht). Xatolar: `VALIDATION` (bajarilmagan), `QUEUE_BUSY` (olingan), `NOT_FOUND` (davri oʻtgan).
### `POST /quests/login`
7 kunlik kirish sovgʻasi: kuniga bir marta; kun oʻtkazilsa 1-kundan. Javob: `{ day, reward, lost }`.
### `GET /season`
Joriy mavsum, shaxsiy ball, reyting, liga, fond.
### `GET /season/leaderboard?scope=global|clan&limit=100`
### `GET /season/:id/reward`
Audit tugagach toʻlov holati.

---

## 12. Doʻkon va monetizatsiya

### `GET /shop`
Paketlar, tezlashtirish narxlari (progressiv), doimiy xaridlar, kunlik chegara holati.

### `POST /shop/invoice`
`{ "item_key": "pack_medium" }` → Telegram Stars invoice havolasi (`createInvoiceLink`, valyuta `XTR`). Klient uni `WebApp.openInvoice()` bilan ochadi.
Toʻlov tasdigʻi alohida endpointga emas, **bot webhookiga** keladi (`POST /bot/webhook`, 13-boʻlim).

### `POST /shop/purchase`
Oy toshi bilan ichki xarid: `{ "item_key": "second_queue_early" }` (faqat 4–9 daraja; 10-darajadan bepul), `offline_store_plus`, `auto_collect`, `pass_season`, `skin_*`.

### `POST /vacation/start`
`{ "hours": 72 }` — 24–168 soat. 12 soatdan keyin ishga tushadi; avval oylik 48 bepul soat ishlatiladi (`player_counters.vacation_free_h`), keyin 250 oy toshi/kun. Urush davomida → `409 WAR_ACTIVE`, kelayotgan hujum boʻlsa → `400 INCOMING_ATTACK`.

### `POST /vacation/cancel`

---

## 13. Tanishtiruv va xizmat

### `POST /tutorial/step`
`{ "step": 7 }` — progress saqlanadi, qadam mukofoti va XP si beriladi (GDD bo'lim 15). Tanishtiruv davomida navbatlar darhol tugaydi.
### `POST /tutorial/skip`
Faqat 12-qadamdan keyin; qolgan qadamlarning XP si beriladi, resurs mukofotlari berilmaydi.
### `GET /notifications?unread=1`
### `POST /notifications/settings`
`{ "disabled": ["build_done", "daily_quests"] }` — turlar boʻyicha oʻchirish (`player_settings.notif_disabled`).
### `POST /events`
Analitika `{ "event": "...", "payload": {} }` (batch, 20 tagacha).
### `GET /config`
Klient uchun ochiq parametrlar (narxlar, vaqtlar, matn versiyasi) — `game_config` dan.
### `GET /locales/:lang?since=...`
Lokalizatsiya paketi, keshlanadi.
### `POST /bot/webhook` *(faqat Telegram)*
Telegram bot updatelari. `X-Telegram-Bot-Api-Secret-Token` (`setWebhook` dagi `secret_token`) tekshiriladi, `initData` emas.
- `pre_checkout_query` — mahsulot va narx tekshiriladi, **10 soniya ichida** `answerPreCheckoutQuery` bilan javob beriladi;
- `successful_payment` — oy toshi qoʻshiladi; `telegram_payment_charge_id` → `transactions.tg_payment_id` (unikal — takror hisoblanmaydi);
- `/start` va boshqa buyruqlar — Mini App ga havola.

---

## 14. Chastota cheklovlari

| Guruh | Limit |
|---|---|
| `GET /state`, `/profile` | 60/daqiqa |
| Holat oʻzgartiruvchi `POST` | 30/daqiqa |
| `/pvp/attack`, `/pvp/scout`, `/hunt*` | 20/daqiqa |
| `/pvp/targets/refresh` | 10/soat |
| `/events` | 120/daqiqa |

Oshsa → `429` va `Retry-After` sarlavhasi.

---

## 15. Umumiy qoidalar

- **Klientga hech qachon ishonilmaydi.** Narx, vaqt, CP, oʻlja — hammasi serverda qayta hisoblanadi.
- Barcha raqamlar `game_config` dan oʻqiladi, koddan emas.
- Jang natijasi faqat serverda hisoblanadi; klient animatsiyani `log` maydonidan chizadi.
- Har holat oʻzgarishi bitta tranzaksiyada: resurs yechish + navbat yaratish atomar.
- Yurish va jang vaqtlari `arrives_at` / `returns_at` sifatida saqlanadi — klient taymerni shulardan chizadi, server vaqti bilan sinxronlaydi (`state.server_time`).
- Har javobda `state` snapshot boʻlgani uchun klient kamdan-kam `GET /state` chaqiradi.
- Resurs hisobi va har qanday oʻzgarish oʻyinchining `player_resources` qatorini `SELECT … FOR UPDATE` bilan qulflab bajariladi — parallel soʻrovlar ikki marta yechmaydi.
- Muddati oʻtgan navbat va yurishlar faqat cron kutmaydi: oʻyinchi yoki uning raqibi soʻrov yuborganda ham “dangasa” (lazy) yopiladi; ikki marta bajarilmasligi uchun shartli `UPDATE … WHERE state = 'running'` ishlatiladi.

---

**Jami: 68 endpoint.**

**MVP uchun 37 tasi:** `/state`, `/profile`, `/profile/settings`, `/profile/allocation` · `/buildings`, `/buildings/upgrade`, `/buildings/collect`, `/hospital/heal` · `/army`, `/army/train`, `/army/promote`, `/army/promote/preview`, `/queue/cancel`, `/queue/speedup` (faqat bepul tezlashtirish) · `/hunt/board`, `/hunt/solo`, `/hunt` · `/pvp/targets`, `/pvp/targets/refresh`, `/pvp/scout`, `/pvp/scout/:slot`, `/pvp/attack`, `/march/:id`, `/march/:id/recall`, `/battles`, `/battles/:id` · `/quests`, `/quests/claim`, `/quests/login` · `/tutorial/step`, `/tutorial/skip` · `/notifications`, `/notifications/settings`, `/events`, `/config`, `/locales/:lang`, `/bot/webhook`.
