# Blue Wolf — Telegram Mini App · v0.0.1

Strategiya / omon qolish oʻyini: ov qil, in qur, toʻda yigʻ va Koʻk Boʻriga aylan.
Dizayn hujjatlari: [`docs/blue_wolf/`](../docs/blue_wolf/) (GDD, API, sxema, balans jadvali). Oʻzgarishlar: [CHANGELOG.md](CHANGELOG.md).

> **v0.0.x — skelet / demo koʻrinish.** Ekranlar, dizayn tizimi, Telegram integratsiyasi va backend asosi tayyor.
> Oʻyin amallari (qurish, ov, mashq, hujum…) hali ishlamaydi — tugmalar “keyingi bosqichda” xabarini koʻrsatadi.

- **Backend:** PHP 8.2+ · Laravel 12 · MySQL 8 (lokal sinov uchun SQLite)
- **Frontend:** PWA, `public/` papkasida, build talab qilinmaydi (oddiy JS + CSS)
- **Dizayn tizimi:** **BlueWolf UI** — `public/ui/` (koʻrgazma: `/ui/`)
- **Telegram:** Mini App SDK; har soʻrovda `initData` HMAC-SHA256 imzosi tekshiriladi

## Tuzilishi

```
bluewolf/
├── app/
│   ├── Http/Controllers/Api/   StateController (GET /state), MetaController (ping, config)
│   ├── Http/Middleware/        TelegramAuth — initData tekshiruvi (X-Init-Data)
│   ├── Models/                 Player, PlayerResource, Building, GameConfig
│   ├── Services/               PlayerService — oʻyinchini yaratish, holat snapshoti
│   └── Support/                TelegramInitData (imzo), ApiResponse (javob konverti)
├── config/bluewolf.php         versiya, bot tokeni, initData muddati, dev_auth
├── database/
│   ├── migrations/             players, player_resources, buildings, game_config
│   └── seeders/data/           game_config.json — 273 balans parametri (avtomatik yaratiladi)
├── public/
│   ├── index.html              ilova qobigʻi (5 tab: In · Jang · Toʻda · Vazifalar · Profil)
│   ├── ui/                     BlueWolf UI: bluewolf-ui.css, bluewolf-icons.js, index.html
│   ├── css/app.css             sahifa joylashuvi
│   ├── js/game.js              GDD formulalari (XP, bino narxi va vaqti, tier, ov)
│   ├── js/api.js               API qatlami + demo rejim
│   ├── js/app.js               ekranlar, router, Telegram integratsiyasi
│   ├── js/demo-data.js         demo namuna maʼlumotlar
│   ├── data/game_config.json   balans parametrlari (demo rejim uchun)
│   └── manifest.webmanifest, sw.js, icons/   PWA
└── tests/                      PHPUnit (Unit, Feature) va tests/js (formulalar)
```

## Rejimlar

| Rejim | Qachon | Maʼlumot |
|---|---|---|
| **Jonli** | Telegram ichida ochilgan va server javob bergan | `GET /api/v1/state`, `GET /api/v1/config` |
| **Demo** | Server topilmadi (masalan GitHub Pages) yoki Telegramdan tashqarida | `js/demo-data.js` + `data/game_config.json` |

Demo rejimda yuqorida sariq lenta chiqadi.

## Ishga tushirish (lokal)

```bash
cd bluewolf
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite        # yoki .env da MySQL
php artisan migrate --seed            # jadvallar + game_config
php artisan serve                     # http://localhost:8000
```

- Brauzerda oddiy ochilsa — demo rejim (Telegram `initData` yoʻq).
- Telegram’siz API ni sinash: `.env` da `BLUEWOLF_DEV_AUTH=true`, soʻrovga `X-Dev-User: 1` sarlavhasi. **Productionda har doim `false`.**
- Faqat frontend: `cd public && python3 -m http.server 8080` (demo rejim).

### Testlar

```bash
php artisan test              # PHP: initData imzosi, API
node tests/js/game.test.js    # JS: formulalar GDD/Excel bilan mos
vendor/bin/pint --test        # kod uslubi
```

## Telegram Mini App sifatida ulash

1. @BotFather → `/newbot` → tokenni `.env` dagi `TELEGRAM_BOT_TOKEN` ga yozing.
2. Saytni HTTPS bilan joylang (Mini App va PWA faqat HTTPS’da ishlaydi). Document root — `public/`.
3. @BotFather → `/newapp` (yoki bot sozlamalari → Menu Button) → URL: `https://domen/`.
4. Botni Telegram’da oching → menyu tugmasi → ilova jonli rejimda ochiladi.

## API (v0.0.x)

Javob konverti: `{ ok: true, data, state }` yoki `{ ok: false, error: { code, message, details } }`.

| Endpoint | Auth | Tavsif |
|---|---|---|
| `GET /api/v1/ping` | — | Server tirikmi, versiya |
| `GET /api/v1/config` | — | Balans parametrlari (`game_config`) |
| `GET /api/v1/state` | `X-Init-Data` | Oʻyinchi holati; birinchi kirishda oʻyinchi yaratiladi |

Toʻliq rejadagi API (70 endpoint): [`docs/blue_wolf/blue_wolf_api.md`](../docs/blue_wolf/blue_wolf_api.md).

## Balans parametrlari

Manba — `docs/blue_wolf/blue_wolf_darajalar.xlsx` (`Sozlamalar` varagʻi). Oʻzgartirgach:

```bash
cd docs/blue_wolf && python3 tools/blue_wolf_config.py
cd ../../bluewolf && php artisan db:seed --class=GameConfigSeeder
```

Skript `database/seeders/data/game_config.json` va `public/data/game_config.json` ni yangilaydi — qoʻlda tahrirlamang.

## Yoʻl xaritasi

| Versiya | Nima qoʻshiladi |
|---|---|
| v0.0.0 | Skelet: ekranlar, BlueWolf UI, PWA, Telegram auth, `/state` ✅ |
| **v0.0.1** | Ixcham resurs paneli, resurs maʼlumot oynasi ✅ |
| v0.1 | Resurs hisobi (timestamp accrual), Ustaxona buferi va yigʻib olish, taqsimot serverda |
| v0.2 | Qurilish navbati, bino kuchaytirish, bepul tezlashtirish |
| v0.3 | Askar mashqi, ov (yolgʻiz, toʻda), oziqlanish va ochlik |
| v0.4 | Tanishtiruv (20 qadam), kundalik vazifalar |
| v0.5 | Botlarga hujum, razvedka, jang hisoblagichi, jarohat va davolash |
| v0.6 | PvP (7–10 daraja), ov guruhlari, bildirishnomalar → **MVP** |
