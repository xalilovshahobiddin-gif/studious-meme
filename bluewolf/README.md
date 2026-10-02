# 🐺 Blue Wolf — Telegram Mini App (MVP)

Strategiya / omon qolish oʻyini: yolgʻiz boʻri ov qiladi, in quradi, toʻda yigʻadi va boshqa boʻrilar bilan jang qiladi.
GDD, API spetsifikatsiyasi, DB sxemasi, texnik spetsifikatsiya va `blue_wolf_darajalar.xlsx` asosida qurilgan.

**Stack:** PHP 8 + MySQL 8 (MariaDB 10.11 da ham sinalgan) + Telegram WebApp. Tashqi kutubxona yoʻq.

## MVP da nima bor

| Boʻlim | Holat |
|---|---|
| 1–10 daraja, 25 boʻri turi (Excel jadvalidan) | ✅ |
| Timestamp asosidagi iqtisod: ustaxona, passiv suv, goʻsht sarfi, oflayn 70% / ombor ×2 | ✅ |
| Ochlik rejimi (CP −30%, ishlab chiqarish −50%, 7 kundan keyin 1%/kun ketish) | ✅ |
| Binolar: In (avtomatik), Oziq gʻori, Ustaxona, 4 rol binosi, Shifo gʻori | ✅ (Bozor — v2) |
| Ov — asosiy sikl, oʻlja zinapoyasi, 4-darajadan toʻda bilan ov | ✅ |
| Askarlar: 4 rol × tier, mashq (toʻlganlik va bino jazosi bilan), tierga almashtirish, davolash | ✅ |
| PvP: 9 raqib, ±1 hujum oynasi, razvedka (4 bosqich), 5 raundli jang, oʻlja, qalqonlar, kunlik 3 hujum | ✅ |
| NPC "yovvoyi toʻdalar" — kichik serverda raqib havzasini toʻldiradi | ✅ |
| Tanishtiruv: 20 qadam, server tekshiruvi, bepul tezlashtirishlar, bot bilan mashq jangi | ✅ |
| Kundalik vazifalar (4 + kirish bonusi) | ✅ |
| Tezlashtirish (oy toshi, progressiv narx, kunlik 25% chegara) | ✅ |
| initData HMAC auth, `X-Request-Id` idempotentlik, chastota cheklovi | ✅ |
| Cron, Telegram bildirishnomalari (kunlik byudjet, tungi sokinlik), bot `/start` | ✅ |
| 25 ta boʻri avatari — har bir tur oʻz rangi, shakli va yashash muhiti bilan; daraja oshganda tabrik | ✅ |
| Klan, toʻda urushi, lager, oazis, mavsum, doʻkon (Stars), taʼtil, ru/en | ⏳ v2 (`501 NOT_IN_MVP`) |

## Tuzilma

```
bluewolf/
├── public/                 ← veb-server hujjat ildizi (document root)
│   ├── index.html          Mini App
│   ├── assets/app.js       klient (vanilla JS, build yoʻq)
│   ├── assets/demo-engine.js  serversiz demo dvigateli
│   ├── demo.html           yigʻilgan serversiz demo (tools/build_demo.php)
│   ├── assets/style.css
│   ├── api/index.php       API kirish nuqtasi: /api/v1/*
│   ├── bot/webhook.php     Telegram bot webhook
│   ├── .htaccess           Apache rewrite
│   └── router.php          faqat lokal `php -S` uchun
├── src/                    oʻyin mantiqi (namespace BlueWolf)
│   ├── F.php               sof formulalar (GDD) — Excel bilan test qilingan
│   ├── Battle.php          jang hisobi
│   ├── Economy.php         timestamp accrual
│   ├── Game.php            oʻyinchi holati, voqealar tartibi, snapshot
│   ├── Buildings / Army / Hunt / Pvp / Queues / Quests / Tutorial / Bots / Notify
│   └── Api.php, Auth.php, Db.php, Config.php
├── data/                   jadval maʼlumotlari (daraja, oʻlja, tanishtiruv, vazifa, locales/uz.php)
├── sql/                    001 — berilgan sxema, 002 — MVP qoʻshimchalari, 003 — game_config
├── cron/cron.php           har daqiqa
├── bin/install.php         migratsiya + lokalizatsiya + NPC
├── tools/xlsx_to_levels.py Excel → data/levels.php
├── tools/gen_wolf_avatars.py 25 ta boʻri avatari → public/assets/wolves/*.svg (+ wolves.js demo uchun)
└── tests/                  php tests/run.php
```

Balans raqamlari kodda yoʻq — hammasi `game_config` jadvalida (222 kalit). Qiymatni bazada oʻzgartirsangiz, oʻyin darhol shunga oʻtadi.

## Oʻrnatish (ISPmanager / bluewolf.uz)

1. MySQL baza va foydalanuvchi yarating.
2. Fayllarni serverga yuklang; domen hujjat ildizini `bluewolf/public` ga yoʻnaltiring (Apache `mod_rewrite` yoqilgan boʻlsin).
3. `cp config/config.example.php config/config.php` — baza, `bot_token`, `webhook_secret` ni toʻldiring.
4. `php bin/install.php`
5. Cron: `* * * * * php /path/bluewolf/cron/cron.php >> /path/logs/cron.log 2>&1`
6. Webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://bluewolf.uz/bot/webhook.php&secret_token=<webhook_secret>`
7. @BotFather → *Bot Settings → Menu Button / Configure Mini App* → `https://bluewolf.uz/`

## Lokal ishga tushirish

```bash
export BW_DB_USER=... BW_DB_PASS=... BW_DEV=1
php bin/install.php            # yoki --fresh (hamma jadvallarni oʻchiradi!)
php -S 127.0.0.1:8080 -t public public/router.php
# brauzer: http://127.0.0.1:8080/?dev=1   (dev rejimda Telegramsiz, X-Dev-User bilan)
```

## Serversiz demo

`public/demo.html` — butun oʻyin bitta faylda: Mini App + brauzer ichidagi demo dvigatel (`assets/demo-engine.js`,
`src/*.php` mantiqining JS nusxasi). Server, baza va Telegram kerak emas — faylni brauzerda oching.
Holat shu brauzerning localStorage'ida saqlanadi; yuqoridagi **⏩ Demo** tugmasi vaqtni oldinga suradi.

```bash
php tools/build_demo.php   # data/, sql/ va assets/ oʻzgargach demo.html ni qayta yigʻish
```

Demo cheklovlari: bitta oʻyinchi + NPC toʻdalar, bildirishnoma va chastota cheklovi yoʻq.
Server mantiqini oʻzgartirsangiz, `demo-engine.js` ni ham moslang.

## Testlar

```bash
BW_DB_USER=... BW_DB_PASS=... php tests/run.php
```

`bluewolf_test` bazasini noldan yaratadi va quyidagilarni tekshiradi (194 ta tekshiruv):
- formulalar Excel jadvallariga mos (bino narxi/vaqti, sigʻim, CP, mashq narxi, almashtirish 300→188, toʻlganlik, tezlashtirish 10·26·…·264, jang yoʻqotishlari R=1/2/3);
- API orqali toʻliq oʻyin: 20 qadamli tanishtiruv, ov, qurilish, mashq, bekor qilish (80%), ustaxona onlayn/oflayn accrual, ochlik, PvP va qaytish, kunlik 3 hujum chegarasi, vazifalar, idempotentlik, initData imzosi;
- ikki real oʻyinchi orasidagi jang (oflayn himoyachi, cron orqali): oʻlja, jarohat, qalqon.

## Hujjatlardagi nomuvofiqliklar va qabul qilingan qarorlar

Hujjatlar bir-biriga toʻliq mos emas. Quyidagi joylarda qaror qabul qilindi (hammasi `game_config` orqali oʻzgartiriladi):

1. **Tier ochilishi.** `Maks tier = MIN(6, alfa÷4, bino÷4)` boʻyicha 1–3 darajada tier 0 chiqadi, lekin tanishtiruv 9-qadamda ovchi, 14-qadamda hujumchi tayyorlatadi. **Qaror:** rol ochilgach 1-tier doim mavjud, 2+ tier formula boʻyicha. Natijada 10-darajagacha maks tier 2 (texnik spec "MVP: 3 tier" deydi, lekin formula 3-tierni 12-darajada ochadi).
2. **MVP rollari/binolari.** Texnik spec "3 bino, 2 rol" deydi, lekin tanishtiruv Ov soʻqmogʻi, Razvedka qoyasi, Himoya devorini qurdiradi va razvedka razvedkachisiz ishlamaydi. **Qaror:** 4 rol va 7 bino yoqilgan, Bozor — v2.
3. **Ov endpointi.** Ov asosiy sikl, lekin API da yoʻq. **Qoʻshildi:** `GET /hunt`, `POST /hunt` (davomiylik `60s + 6s/kg`, tanishtiruvda 5s).
4. **Tanishtiruv XP.** Qurilish XP si (resurs × 0.02) 15 daqiqada 5-darajaga olib chiqmaydi. **Qaror:** qadam tugagach oʻyinchi keyingi qadam darajasiga koʻtariladi (jadvaldagi "Daraja" ustuni).
5. **Tanishtiruv iqtisodi.** Brauzerda sinalganda 17-qadamda suyak yetmadi (ustaxona ~4 suyak/soat). Boshlangʻich resurslar: goʻsht 40, suyak 150; 11-qadamga +30 goʻsht. Goʻsht yetmasa yoʻriqchi avtomatik ovga chiqadi.
6. **1–6 daraja qalqoni.** PvP 4-darajada ochiladi, lekin 1–6 darajali real oʻyinchilarga hujum qilib boʻlmaydi. **Qaror:** NPC toʻdalar (qalqonsiz, 1 soatda tiklanadi, mavsum hissasiga kirmaydi).
7. **15-qadam (klanga qoʻshilish)** — klan v2 da, qadam maʼlumot qadamiga aylantirildi.
8. **Yengil toʻda ovi** (bir necha oʻyinchi) — MVP da oʻz ovchilaringiz bilan toʻda ovi; koʻp oʻyinchili ov guruhi keyingi bosqich.
9. **Oʻlja/gʻalaba chegaralari** hujjatda aniq emas: `R ≥ 1.1` gʻalaba, `R ≥ 1.5` toʻliq gʻalaba, `R ≤ 1/1.1` magʻlubiyat.
10. **Mashq narxi 4+ tier:** Excel 187 (yaxlitlangan CP nisbati²), formula `20 × 1.45^(2(t−1))` = 186. MVP da ahamiyatsiz (maks tier 2).
11. `blue_wolf_darajalar.xlsx` haqiqiy Excel fayl ekan (GDD oxiridagi "matn fayl" ogohlantirishi eskirgan).
12. **Teri, shifobaxsh oʻt va suv olib tashlandi** (`sql/004_simplify_resources.sql`). Excel binolar varagʻida teri hech qayerda sarflanmaydi (ustaxona ishlab chiqarishining 15% i bekorga ketardi), oʻtning manbasi ham, davolashdagi narxi ham belgilanmagan, suv esa faqat yigʻilib, hech narsaga sarflanmas edi. Endi 4 ta resurs qoldi: goʻsht, tosh, shox-shabba, suyak (+ premium oy toshi). Ustaxona standart taqsimoti binolar talabiga moslandi: tosh 57% · shox-shabba 26% · suyak 17% (1→10 daraja binolari: 18 352 · 8 274 · 5 144).
13. **Toʻda ×20** (`sql/005_army_scale.sql`, `army_scale = 20`). Qoʻshin sigʻimi Excel jadvalidan 20 marta katta: 4-darajada 200, 10-darajada 600, 25-darajada 9 200 (1–3 daraja yolgʻiz bosqich — 1 ta). Bitta askarning narxi, kuchi va yuki oʻzgarmagan, shuning uchun toʻda kuchi ham ×20. Oʻyin buzilmasligi uchun shu sozlama bilan birga oshadi: Oziq gʻori, rol binolari va Shifo gʻori sigʻimi (×20), toʻda ovi goʻshti (×20, yolgʻiz ov oʻzgarmaydi), ovdan suyak (goʻshtning 40%, GDD: "suyak — ustaxona / ov"); bitta askar mashqi vaqti ÷20, shunda toʻdani toʻldirish vaqti Excel'dagidek qoladi. Formulalar testlari Excel qiymatlarini shu masshtabga koʻpaytirib tekshiradi.

## API

Baza: `/api/v1`, sarlavhalar: `X-Init-Data`, `X-Client-Version`, POST da `X-Request-Id`. Javob: `{ ok, data, state }`.
MVP endpointlari: `/state`, `/profile`, `/profile/allocation`, `/profile/language`, `/buildings`, `/buildings/upgrade`,
`/buildings/collect`, `/hospital/heal`, `/army`, `/army/train`, `/army/promote`, `/army/promote/preview`, `/queue/cancel`,
`/queue/speedup` (+ `free: true`), `/queue/speedup/quote`, `/hunt`, `/pvp/targets`, `/pvp/targets/refresh`, `/pvp/scout`,
`/pvp/scout/:id`, `/pvp/attack`, `/march/:id/recall`, `/battles`, `/battles/:id`, `/quests`, `/quests/:id/claim`,
`/tutorial/step`, `/tutorial/skip`, `/events`, `/config`, `/locales/:lang`.
