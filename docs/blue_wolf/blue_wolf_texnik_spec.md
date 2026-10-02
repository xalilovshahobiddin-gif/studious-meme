# Blue Wolf — Texnik spetsifikatsiya

Stack: PHP 8 + MySQL 8 + Telegram Bot webhook + Mini App (WebApp)
Hosting: ISPmanager, domen `bluewolf.uz`
Barcha vaqtlar UTC. Balans raqamlari `game_config` jadvalidan oʻqiladi — kodda qattiq raqam yoʻq.

---

## 1. Ekran xaritasi

Pastda **5 ta asosiy tab**. Qolgan hamma narsa shu beshtasining ichida.

### 🏔 In (asosiy ekran)
- Bino kartalari: Bosh in, Oziq gʻori, Ustaxona, Razvedka qoyasi, Jang maydoni, Himoya devori, Ov soʻqmogʻi, Shifo gʻori, Bozor
- Yuqorida resurs paneli (goʻsht, suv, tosh, shox-shabba, teri, suyak, oy toshi)
- Qurilish navbati (1 yoki 2 slot)
- Ustaxona taqsimoti (4 resurs orasida slayder)
- Bozor: almashinuv oynasi
- Shifo gʻori: davolash navbati

### ⚔️ Jang
- **PvP**: 9 ta raqib kartasi (nomi, daraja, masofa, kuch bandi, qalqon belgisi) → har kartada `Razvedka` va `Hujum` tugmasi
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
- Qoʻshin: 4 rol × 6 tier jadvali, sonlar bilan
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
| `storage_full` | Ombor toʻlganda | 2 |
| `hunger_warning` | Goʻsht 12 soatga qolganda | 2 |
| `season_ending` | Mavsum tugashiga 6 soat | 3 |
| `daily_quests` | Har kuni bir marta, oʻyinchi odatda kiradigan vaqtda | 3 |
| `comeback_2d` | 2 kun kirmasa — bir marta | 3 |
| `comeback_7d` | 7 kun kirmasa — bir marta, keyin toʻxtaydi | 3 |

**Qoidalar:**
- Taʼtil rejimida faqat `war_*` va `season_*` yuboriladi
- 1-ustuvorlik byudjetdan tashqarida
- Har bildirishnomada Mini App'ga chuqur havola (deep link)
- Tunda (oʻyinchi vaqti boʻyicha 23:00–08:00) faqat 1-ustuvorlik
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

Tick yoʻq. Har soʻrovda:

```
dt = now - last_tick_at   (soniya)
rate = prod_base * prod_growth^(workshop_level-1) / 3600
if (offline) rate *= offline_prod_rate      // 0.70
if (hunger)  rate *= (1 - hunger_prod_penalty)
if (vacation) rate = 0
if (oasis bonus) rate *= (1 + bonus)

qoʻshildi = rate * dt * taqsimot_ulushi
resurs = MIN(resurs + qoʻshildi, sigʻim)     // sigʻim = ombor darajasidan
last_tick_at = now
```

Goʻsht sarfi xuddi shu tarzda ayiriladi. Goʻsht 0 ga tushsa → `hunger_since = now`.

### 4.2 Navbatlar

`queues` jadvalida `ends_at` bilan. Ikki yoʻl bilan yopiladi:
1. Oʻyinchi kirganda — barcha `ends_at <= now` boʻlganlar bajariladi
2. Cron (har daqiqa) — bildirishnoma yuborish uchun

### 4.3 Yurishlar va janglar

Cron har daqiqa:
- `arrives_at <= now` → jang hisoblanadi, natija `battles` ga yoziladi, `returns_at` qoʻyiladi
- `returns_at <= now` → askarlar `on_march` dan `alive`/`injured` ga qaytadi

### 4.4 Jang formulasi

```
EP = Σ(qty × tier_cp × role_coef × counter_coef)
tier_cp = (kuch×2 + tezlik×1.5 + chidam×0.5) × tier_coef^(tier-1) × (1 + alpha_bonus × level)
R = EP_attacker / EP_defender
att_loss% = MIN(0.90, 0.40 / R) × (1 ± 0.10)
def_loss% = MIN(0.90, 0.40 × R) × (1 ± 0.10)
oʻlim = loss% × death_share   (hujumchi 0.40, himoyachi 0.25)
kasalxona = loss% × (1 - death_share)
```

Yoʻqotish tierlar boʻyicha proporsional taqsimlanadi (yuqori tier ham yoʻqoladi).

### 4.5 Server tekshiruvlari (klientga ishonilmaydi)

Har amalda: resurs yetarlimi, bino darajasi yetarlimi, tier ochilganmi, qoʻshin sigʻimi, qalqon holati, juftlik chegarasi, hujum oynasi (±1 daraja), taʼtil holati, tezlashtirish kunlik chegarasi.

Mini App `initData` imzosi har soʻrovda tekshiriladi (HMAC-SHA256, bot tokeni bilan).

### 4.6 Cron jadvali

| Vaqt | Ish |
|---|---|
| Har daqiqa | Navbatlar, yurishlar, janglar, bildirishnoma navbati |
| Har 5 daqiqa | Matchmaking roʻyxatini yangilash |
| Har soat | Klan `power_cache`, oazis bonuslari |
| Har kun 00:00 | Kundalik vazifalar, tezlashtirish chegarasi, login streak |
| Har dushanba | Haftalik vazifalar, mavsum yopilishi, liga |
| Mavsum + 48 soat | Adolat auditi → mukofot toʻlovi |

---

## 5. MVP doirasi (8–10 hafta)

### Kiritiladi
- 1–10 daraja
- 3 bino: Oziq gʻori, Ustaxona, Jang maydoni
- 2 rol: ovchi, hujumchi — 3 tier
- PvP 1v1 + oʻlja + razvedka
- Yengil toʻda ovi (rasmiy klan tizimisiz vaqtinchalik ov guruhi — GDD bo'lim 22)
- Tanishtiruv (20 qadam)
- Kundalik vazifalar
- Oflayn hisob, ochlik rejimi
- uz tili

### v2 ga qoldiriladi
- 11–25 daraja, qolgan 5 bino, razvedkachi va himoyachi rollari, 4–6 tier
- Klan va toʻda urushi, lager, oazis
- Mavsum, reyting, liga
- Monetizatsiya (MVP'da test uchun faqat oy toshi)
- **Pul mukofoti — albatta keyinga**
- ru, en tillari

### Oʻlchanadigan raqamlar
- D1 retention (maqsad >30%)
- D7 retention (maqsad >12%)
- Tanishtiruv tugatish foizi (maqsad >70%)
- 4-darajaga yetish vaqti (maqsad <15 daqiqa)
- Birinchi PvP jangigacha vaqt

---

## 6. Qolgan ishlar roʻyxati

| # | Ish | Holati |
|---|---|---|
| 1 | DB sxemasi | ✅ Tayyor (`blue_wolf_schema.sql`) |
| 2 | Balans modeli | ✅ Tayyor (21 varaqli jadval) |
| 3 | Ekran xaritasi | ✅ Shu hujjatda |
| 4 | Bildirishnomalar | ✅ Shu hujjatda |
| 5 | Lokalizatsiya rejasi | ✅ Shu hujjatda |
| 6 | Art yoʻnalishi | ⏳ Oddiy: bitta boʻri silueti + rol rangi + tier ramkasi |
| 7 | `game_config` ni jadvaldan toʻldirish | ⏳ Asosiylari SQL da |
| 8 | Locales kalitlari (~600) | ⏳ |
| 9 | API endpointlari | ✅ Tayyor (`blue_wolf_api.md`, 60 endpoint) — *tuzatildi: bu qator eski, API spec yozilishidan oldingi holatni koʻrsatib turgan edi* |
| 10 | Mini App frontend | ⏳ |
| 11 | Telegram bot webhook | ⏳ |
| 12 | Test rejasi | ⏳ |

---

## 7. Keyingi qadam

`schema.sql` ni bazaga yuklash → `game_config` ni jadvaldagi qiymatlar bilan toʻldirish → *(API endpointlari roʻyxati allaqachon `blue_wolf_api.md` da tayyor — 60 ta)* → tanishtiruv oqimini birinchi boʻlib qurish.

Tanishtiruvdan boshlash sababi: u butun oʻyin zanjirini (resurs → bino → askar → jang) eng qisqa yoʻlda sinab koʻradi. Ishlasa, qolgani shu asos ustiga qoʻyiladi.
