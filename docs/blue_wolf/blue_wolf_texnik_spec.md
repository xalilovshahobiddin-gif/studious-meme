# Blue Wolf — Texnik spetsifikatsiya

Stack: PHP 8 + MySQL 8 + Telegram Bot webhook + Mini App (WebApp)
Hosting: ISPmanager, domen `bluewolf.uz`
Barcha vaqtlar UTC. Balans raqamlari `game_config` jadvalidan oʻqiladi — kodda qattiq raqam yoʻq.
Oʻyin dizayni (formulalar, jadvallar, MVP doirasi) — `blue_wolf_GDD.md`; bu hujjat faqat texnik qismni yozadi va formulalarni takrorlamaydi.

---

## 1. Ekran xaritasi

Pastda **6 ta asosiy tab** (In · Ov · Jang · Toʻda · Vazifalar · Profil). Qolgan hamma narsa shularning ichida.

### Yuqori panel (hamma tabda)
- **Menyu tutqichi** (`#menu-btn`, ekran oʻrtasida chap chetda yarmi koʻrinadi) → chap yondan suzib chiqadigan panel (`#drawer`, kengligi `min(78vw, 320px)`); tutqich ramkaga ulangan holda birga chiqadi va kiradi; yopish: tutqich, ✕, fon, chapga surish, Telegram BackButton, Esc. Bandlari keyin qoʻshiladi
- Resurs paneli ostida **taymerlar paneli** (`#timer-bar`): faqat navbat bor paytda; har taymer — ikonka (progress halqasi) + vaqt; qurilish — qahrabo + bolgʻa, mashq — binafsha + rol ikonkasi, ov — yashil + panja; bosilsa bino oynasi (ov — Ov tabi)
- Mukofot olinganda “+N” belgilari resurs kataklariga uchadi (`flyGain`); `prefers-reduced-motion` da oʻchadi

### 🏔 In (asosiy ekran)
- 9 ta bino kartasi: In (avtomatik), Oziq gʻori, Ustaxona, Razvedka qoyasi, Jang maydoni, Himoya devori, Ov soʻqmogʻi, Shifo gʻori, Bozor (ochilmaganlari qulf belgisi bilan)
- Yuqorida resurs paneli: goʻsht, suv, shifobaxsh oʻt, tosh, shox-shabba, teri, suyak, oy toshi; 20+ darajada oy nuri
- Qurilish navbati (1 slot; 10-darajadan yoki erta xarid bilan 2 slot) — alohida boʻlim yoʻq: holati yuqoridagi taymerlar panelida, tezlashtirish va bekor qilish bino oynasida
- Ustaxona: taqsimot slayderi (4 resurs) va bufer + “Yigʻib olish” tugmasi
- **Ov (alohida tab):** ov xaritasi — 9 karta (masofa, vaqt, oʻlja, xavf), kartada askar tanlash (slayderlar — faqat inda bor rollar uchun), yurishdagi ovlar, yaradorlar; 1–3 darajada “Yolgʻiz ov”
- Bozor: almashinuv oynasi
- Shifo gʻori: davolash navbati

### ⚔️ Jang
- **Raqiblar**: 9 ta karta (nomi, daraja, masofa, kuch bandi, qalqon belgisi; botlar “Yovvoyi toʻda” belgisi bilan) → har kartada `Razvedka` va `Hujum` tugmasi. 4–6 darajada faqat botlar
- **Qoʻshin yuborish oynasi**: rol × tier boʻyicha miqdor tanlash, yurish vaqti koʻrsatiladi
- **Lager**: yuborish, yigʻilayotgan miqdor, erta chaqirish
- **Oazis**: xaritadagi 20 nuqta, egasi, egallash tugmasi
- **Jang jurnali**: kelgan va ketgan hujumlar, raund-raund hisobot
- **Razvedka hisobotlari**: 30 daqiqa amal qiladi

### 🐺 Toʻda (klan)
- Klan profili: daraja, XP, xazina, aʼzolar, bonus
- Aʼzolar roʻyxati va lavozimlar
- **Toʻda urushi**: taklif etilgan 6 klan, eʼlon qilish, 12 soatlik hisob, jonli ball
- Urush ichida: askar yuborish, hissa jadvali, qolgan vaqt
- Klan chati (Telegram guruhiga havola yoki ichki)
- Oazislar: klan egallagan nuqtalar

### 📋 Vazifalar
- Kundalik (4+1), Haftalik (4), Bosqichli (10 yoʻnalish)
- Mavsum yoʻli (battle pass) progressi
- Mukofot olish tugmalari

### 👤 Profil
- Qoʻshin: 4 rol × 6 tier jadvali (sogʻlom / yurishda / jarohatlangan)
- Askar yigʻish va tierga almashtirish oynasi
- Statistika: jami CP, gʻalabalar, mavsum reytingi, liga
- Sozlamalar: til (uz/ru/en), bildirishnomalar, taʼtil rejimi
- Doʻkon: oy toshi paketlari, tezlashtirish, doimiy xaridlar

---

## 2. Bildirishnomalar

Telegram bot orqali. **Kuniga eng koʻpi 6 ta** (`notification_budget`), aks holda bloklanadi.

| Tur | Qachon | Ustuvorlik |
|---|---|---|
| `attack_incoming` | Hujum yoʻlga chiqqanda (kelish vaqti bilan) | 1 — har doim |
| `attack_result` | Jang tugagach (ikkala tomonga) | 1 — har doim |
| `war_declared` | Klan urushi eʼlon qilinganda | 1 — har doim |
| `war_start` / `war_end` | Urush boshlanishi va yakuni | 1 |
| `camp_raided` | Lager bosib olinganda | 1 |
| `build_done` | Qurilish tugaganda (faqat >1 soat boʻlsa) | 2 |
| `train_done` | Katta mashq partiyasi tugaganda | 2 |
| `storage_full` | Ustaxona buferi yoki Oziq gʻori toʻlganda | 2 |
| `hunger_warning` | Goʻsht 12 soatga qolganda | 2 |
| `season_ending` | Mavsum tugashiga 6 soat | 3 |
| `daily_quests` | Har kuni bir marta, oʻyinchi odatda kiradigan vaqtda | 3 |
| `comeback_2d` | 2 kun kirmasa — bir marta | 3 |
| `comeback_7d` | 7 kun kirmasa — bir marta, keyin toʻxtaydi | 3 |

**Qoidalar:**
- Bot faqat ruxsat bergan oʻyinchiga yoza oladi: Mini App birinchi ochilganda `WebApp.requestWriteAccess()` soʻraladi, natija `player_settings.allows_pm` ga yoziladi (`initData.user.allows_write_to_pm` ham hisobga olinadi). Ruxsat boʻlmasa bildirishnoma `inapp` kanaliga tushadi
- Taʼtil rejimida faqat `war_*` va `season_*` yuboriladi
- 1-ustuvorlik byudjetdan tashqarida
- Har bildirishnomada Mini App'ga chuqur havola (deep link)
- Tunda (oʻyinchi vaqti boʻyicha 23:00–08:00) faqat 1-ustuvorlik. Telegram vaqt zonasini bermaydi — klient uni `Intl` dan oladi va `POST /profile/settings` bilan yuboradi (`player_settings.tz`, standart `Asia/Tashkent`)
- Oʻyinchi sozlamalardan har turni alohida oʻchira oladi

---

## 3. Lokalizatsiya

Uch til: **uz** (asosiy), **ru**, **en**.

- Barcha matn `locales` jadvalida: `locale_key`, `uz`, `ru`, `en`
- Kodda matn yozilmaydi — faqat kalit: `t('battle.result.win')`
- Til aniqlash: Telegram `language_code` → mos til, topilmasa `uz`
- Oʻyinchi profilda qoʻlda oʻzgartira oladi
- Kalit tuzilishi: `bolim.element.holat` (masalan `quest.daily.hunter.title`)
- Boʻri va tier nomlari ham lokalizatsiya qilinadi, lekin **klan nomi va oʻyinchi nomi** — yoʻq
- Raqamlar va sanalar `Intl` formatida (mingliklar ajratkichi tilga qarab)
- Bildirishnomalar oʻyinchining tilida yuboriladi

**Boshlangʻich hajm:** ~600 kalit. Avval uz toʻliq, keyin ru, en.

---

## 4. Server mantiqi

### 4.1 Resurs hisobi (timestamp accrual)

Tick yoʻq. Har soʻrovda, tranzaksiya ichida `player_resources` qatori `SELECT … FOR UPDATE` bilan qulflanadi:

```
t0 = last_tick_at, t1 = now                          (DATETIME(3), millisekund)
oraliqlarga boʻlish — har bir chegara nuqtasida stavka oʻzgaradi:
  · onlayn / oflayn chegarasi: last_seen_at + 5 daqiqa (offline_after_min)
  · taʼtil boshlanishi / tugashi
  · goʻsht 0 ga tushadigan aniq vaqt (ochlik boshlanishi)
  · tugagan navbatlar (masalan Oziq gʻori yoki Ustaxona darajasi oshgan vaqt)
har bir oraliq uchun (dt soniya):
  prod = prod_base × prod_growth^(Ustaxona L−1) / 3600
  if oflayn:  prod × offline_prod_rate
  if ochlik:  prod × (1 − hunger_prod_penalty)
  if taʼtil:  prod = 0, sarf = 0
  prod × (1 + klan bonusi + oazis bonusi)
  buf_x += prod × dt × alloc_x / 100, bufer sigʻimi bilan cheklanadi
           (bufer = soatlik × 10 × taqsimot ulushi; oflaynda × 2.0, xarid bilan × 2.5)
  water += (passiv suv − suv sarfi) × dt, [0, gʻor sigʻimi]
  moonlight (20+) shu tarzda
  meat −= goʻsht sarfi × dt; 0 ga yetsa — hunger_since = aynan shu vaqt
  auto_collect boʻlsa: buf_* → ombor
last_tick_at = t1, last_seen_at = t1
```

- Ustunlar `DECIMAL(20,4)` — soniyalik kasr qismlar yoʻqolmaydi; klientga butun son koʻrsatiladi.
- Goʻsht faqat ov, oʻlja va mukofotdan qoʻshiladi (passiv ishlab chiqarilmaydi); gʻor sigʻimidan ortigʻi tashlanadi.
- Goʻsht qoʻshilganda `hunger_since = NULL` — jazolar darhol oʻchadi.

### 4.2 Navbatlar

`queues` jadvalida `ends_at` bilan, yechilgan resurs `cost` da. Ikki yoʻl bilan yopiladi:
1. Oʻyinchi kirganda — barcha `ends_at <= now` boʻlganlar bajariladi
2. Cron (har daqiqa) — bildirishnoma yuborish uchun

Ikki marta bajarilmasligi uchun: `UPDATE queues SET state='done' WHERE id=? AND state='running'` — `affected_rows = 1` boʻlgandagina natija qoʻllanadi.
Taʼtilda qolgan vaqt `frozen_sec` ga yoziladi va chiqishda `ends_at = now + frozen_sec`.
Tanishtiruv davomida (`tutorial_step < 20`) navbatlar darhol tugaydi.

### 4.3 Yurishlar, ov va janglar

Cron har daqiqa **va** dangasa (lazy) hisob — hujumchi yoki himoyachi soʻrov yuborganda ham:
- `kind = hunt`, `returns_at <= now` → goʻsht/oʻt omborga (gʻor sigʻimigacha), yaradorlar `injured` + tuzalish navbati (`queues.kind = 'heal'`), halok boʻlganlar oʻchiriladi
- `kind = attack`, `arrives_at <= now` → jang hisoblanadi (himoyachining resurslari avval 4.1 boʻyicha `arrives_at` vaqtiga keltiriladi), natija `battles` ga, `returns_at` qoʻyiladi
- `returns_at <= now` → askarlar `on_march` dan `alive`/`injured` ga, oʻlja omborga
- Bot raqib (`target_bot`) uchun himoyachi tomoni yangilanmaydi — faqat hujumchi natijasi

Holat oʻtishlari ham shartli `UPDATE … WHERE state = …` bilan.

### 4.4 Jang formulasi

Toʻliq formula (EP, aralash qoʻshinda qarshi-kuch, holat koeffitsientlari, yoʻqotish, natija chegaralari, tuzoq, raund jurnali) — **GDD, bo'lim 7 “Jang hisobi”**. Kodda bitta `BattleResolver` sinfi shu formulani amalga oshiradi va barcha koeffitsientlarni `game_config` dan oladi; birlik testlari GDD dagi jadval (R = 0.5 … 3.0) qiymatlarini tekshiradi.

### 4.5 Server tekshiruvlari (klientga ishonilmaydi)

Har amalda: resurs yetarlimi, bino darajasi yetarlimi, tier ochilganmi, qoʻshin sigʻimi, qalqon holati, juftlik chegarasi (24 soatda 3), hujum oynasi (±1 daraja; 1–6 daraja faqat botga), taʼtil holati, tezlashtirish kunlik chegarasi, tanishtiruv qulfi (1–12 qadam).

Mini App `initData` imzosi har soʻrovda tekshiriladi (HMAC-SHA256, bot tokeni bilan).

### 4.6 Cron jadvali

| Vaqt | Ish |
|---|---|
| Har daqiqa | Navbatlar, yurishlar (ov, hujum), janglar, bildirishnoma navbati |
| Har 5 daqiqa | Matchmaking roʻyxatini yangilash |
| Har soat | Klan `power_cache`, oazis bonuslari, 24 soatdan eski `request_log` ni oʻchirish |
| Har kun 00:00 | Kundalik vazifalar, tezlashtirish chegarasi va progressiv narx, login streak, `player_counters` (kunlik) |
| Har dushanba | Haftalik vazifalar, mavsum yopilishi, liga |
| Mavsum + 48 soat | Adolat auditi → mukofot toʻlovi |

---

## 5. MVP doirasi

Nima kiradi va nima v2 ga qoladi — **GDD, bo'lim 22** (yagona manba). Muddat: 10–12 hafta.
Texnik jihatdan MVP uchun:
- Barcha 30 jadval bir martada yaratiladi (v2 jadvallari boʻsh turadi — keyinroq migratsiya kerak boʻlmaydi)
- API dan 39 ta endpoint (`blue_wolf_api.md` oxiridagi roʻyxat)
- Botlar (yovvoyi toʻdalar) — `match_offers.bot` va `marches.target_bot` orqali, alohida jadvalsiz
- Monetizatsiya oʻchirilgan (faqat test oy toshi); `POST /bot/webhook` faqat buyruqlar uchun

### Oʻlchanadigan raqamlar
- D1 retention (maqsad >30%)
- D7 retention (maqsad >12%)
- Tanishtiruv tugatish foizi (maqsad >70%) va har qadamda tark etish
- 4-darajaga yetish vaqti (maqsad <15 daqiqa)
- Birinchi botga hujumgacha va 7-darajaga (birinchi PvP) yetish vaqti

---

## 6. Qolgan ishlar roʻyxati

| # | Ish | Holati |
|---|---|---|
| 1 | DB sxemasi | ✅ `blue_wolf_schema.sql` (30 jadval, MySQL 8.0 da tekshirilgan) |
| 2 | Balans modeli | ✅ `blue_wolf_darajalar.xlsx` (21 varaq, ~4 700 formula; kiritish — `Sozlamalar`, nomlangan kataklar) |
| 3 | `game_config` ni jadvaldan toʻldirish | ✅ `tools/blue_wolf_config.py` → `blue_wolf_game_config.sql` (273 parametr + balans tekshiruvlari) |
| 4 | Ekran xaritasi | ✅ Shu hujjatda |
| 5 | Bildirishnomalar | ✅ Shu hujjatda |
| 6 | Lokalizatsiya rejasi | ✅ Shu hujjatda |
| 7 | API endpointlari | ✅ `blue_wolf_api.md` (68 endpoint, MVP — 37) |
| 8 | Art yoʻnalishi | ⏳ Oddiy: bitta boʻri silueti + rol rangi + tier ramkasi |
| 9 | Locales kalitlari (~600) | ⏳ |
| 10 | Mini App frontend | ⏳ Repodagi hozirgi `index.html`/`js/game.js` — Phaser “Blue Wolf Run” yuguruvchi oʻyini; bu dizaynga mos emas. Undan faqat splash ekran va Telegram WebApp init qismi qayta ishlatiladi |
| 11 | Telegram bot webhook | ⏳ |
| 12 | Test rejasi | ⏳ `BattleResolver`, resurs accrual va navbatlar uchun birlik testlari birinchi navbatda |

---

## 7. Keyingi qadam

`blue_wolf_schema.sql` ni bazaga yuklash → `python3 tools/blue_wolf_config.py` → `blue_wolf_game_config.sql` ni yuklash → tanishtiruv oqimini birinchi boʻlib qurish.

Tanishtiruvdan boshlash sababi: u butun oʻyin zanjirini (resurs → bino → askar → jang) eng qisqa yoʻlda sinab koʻradi. Ishlasa, qolgani shu asos ustiga qoʻyiladi.
