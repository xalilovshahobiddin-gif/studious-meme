# zachkana.uz

Zachkana qishlogʻining raqamli xotirasi: **shajara**, **qishloq tarixi**, **xronologiya**, **faxriylar** va qishloqdoshlar **suhbati**.

- **Backend:** Laravel 13 + MySQL, admin panel — Filament 5 (`/admin`)
- **Frontend:** PWA, `public/` papkasida (build shart emas), dizayn tizimi — **Zachkana UI** (`public/ui/`)
- Telefon (wap) va kompyuter (web) uchun avtomatik moslashadi, oflayn ishlaydi

Frontend haqida batafsil: [README.frontend.md](README.frontend.md)

## Nima ishlaydi (1-bosqich)

| Qism | Tavsif |
| --- | --- |
| Kirish | **Login + parol**, **Google** (OAuth), **Telegram** (Login Widget). Usullar admin panel → “Kirish sozlamalari”da yoqiladi, Google/Telegram kalitlari ham shu yerda. **Telefon (SMS) — vaqtincha oʻchirilgan**: kod va maydonlar saqlangan, shu sahifadan yoqiladi |
| Shajara | Urugʻlar va odamlar bazada; daraxt bitta soʻrovda quriladi. Foydalanuvchi qoʻshish/tuzatish **taklif** qiladi, moderator admin panelda tasdiqlaydi |
| Suhbat | Kanallar, xabarlar. Yangi xabarlar har 4 soniyada olinadi — oddiy (shared) hostingda ham ishlaydi. “Eʼlonlar” kanaliga faqat moderatorlar yozadi |
| Tarix, xronologiya, faxriylar, eʼlonlar | Admin paneldan tahrirlanadi. Faxriylar haqidagi xotiralar moderatsiyadan keyin chiqadi |
| Materiallar | Qishloqdoshlar surat/hujjat (JPG, PNG, WEBP, PDF, 10 MB gacha) yuboradi |
| Admin panel | Rollar: `user`, `moderator`, `admin`. Moderatorlar tarkibni va takliflarni boshqaradi, foydalanuvchilarni faqat admin boshqaradi |

Server topilmasa (masalan GitHub Pages’da), sayt avtomatik **demo rejimda** namuna maʼlumotlar bilan ochiladi (`public/js/data.js`).

## Oʻrnatish (lokal)

```bash
composer install
cp .env.example .env
php artisan key:generate
# .env da MySQL maʼlumotlarini kiriting (yoki sinov uchun DB_CONNECTION=sqlite)
php artisan migrate --seed          # jadvallar + namuna maʼlumotlar
php artisan storage:link            # yuklangan fayllar uchun
php artisan zachkana:admin admin --name="Ism Familiya"   # administrator (login: admin)
php artisan serve                   # http://localhost:8000  ·  admin: /admin
```

Faqat administrator (namuna maʼlumotsiz): `php artisan migrate && php artisan db:seed --class=AdminSeeder` (`.env` dagi `ADMIN_LOGIN`, `ADMIN_PASSWORD`).

## Hostingga joylash

### Tayyor arxiv + brauzerdagi oʻrnatuvchi (oddiy hosting, SSH shart emas)

1. Arxivni yigʻing: `bash deploy/build-zip.sh` → `zachkana-YYYY.MM.DD.zip` (kutubxonalar ichida, ~35 MB).
   Arxiv ichida `OʻRNATISH.txt` yoʻriqnomasi bor.
2. Hosting panelida boʻsh MySQL baza va foydalanuvchi yarating.
3. `zachkana/` ichidagi hamma fayllarni (yashirin `.htaccess` bilan) saytingiz papkasiga yuklang.
   Domen document root'ini `public/` ga qaratish mumkin boʻlsa — shunday qiling; boʻlmasa ham ishlaydi:
   ildizdagi `.htaccess` hamma soʻrovni `public/` ga yoʻnaltiradi, `.env` va kod tashqaridan ochilmaydi.
4. Brauzerda `https://domen/install.php` ni oching: talablar tekshiriladi, baza va administrator maʼlumotlari
   kiritiladi → `.env` yoziladi, jadvallar yaratiladi, administrator qoʻshiladi. Oʻrnatuvchi `.env` boʻlmaguncha
   saytni oʻziga yoʻnaltiradi, tugagach `storage/installed` yaratib, oʻzini oʻchiradi.
5. HTTPS (Let’s Encrypt) yoqing — PWA faqat HTTPS’da oʻrnatiladi.

Symlink taqiqlangan hostingda oʻrnatuvchi yuklangan fayllarni toʻgʻridan-toʻgʻri `public/storage` ga saqlaydi (`PUBLIC_STORAGE_PATH`).
Sinovdan oʻtgan: Apache 2.4 + PHP 8.3 + MariaDB 10.11 (fayllar document root ichida), PHP 8.4 + MariaDB.

### Yangilash

Yangi arxivdagi fayllarni eskilari ustidan yuklang, faqat **`.env` va `storage/`** ga tegmang.
Saytni ochganingizda bazadagi oʻzgarishlar avtomatik bajariladi (`App\Support\SchemaUpdater`) — SSH shart emas.

### Google va Telegram orqali kirish

- **Google:** [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client ID (Web application).
  “Authorized redirect URI” ga `https://domen/auth/google/callback` ni kiriting. Client ID va Secret — admin panel → Kirish sozlamalari.
- **Telegram:** @BotFather → `/newbot`, keyin `/setdomain` → saytingiz domeni. Bot nomi va tokeni — admin panel → Kirish sozlamalari.
- Kirgan foydalanuvchi profilidan Google/Telegram akkauntini ulashi mumkin; Google akkaunti bir xil emaildagi profilga avtomatik ulanadi.
- Xodimlar Google/Telegram orqali saytga kirib, toʻgʻridan-toʻgʻri `/admin` ga oʻtishlari mumkin.

### SSH boʻlsa (VPS)

`composer install --no-dev -o`, `.env` sozlang, `php artisan key:generate`, `php artisan migrate --force`,
`php artisan storage:link`, `php artisan zachkana:admin <login>`. Nginx namunasi: [deploy/nginx.conf](deploy/nginx.conf).

Talablar: PHP 8.3+, MySQL 8 / MariaDB 10.6+, kengaytmalar: `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `dom`.

## API

Barcha manzillar `/api/` bilan boshlanadi, javoblar JSON. Oʻzgartiruvchi soʻrovlar `X-XSRF-TOKEN` sarlavhasini talab qiladi (cookie’dan).

| Usul | Manzil | Kirish |
| --- | --- | --- |
| GET | `bootstrap` — qishloq, eʼlonlar, urugʻlar, kanallar, joriy foydalanuvchi | — |
| GET | `clans/{slug}/tree` | — |
| GET | `history`, `timeline`, `veterans`, `veterans/{id}` | — |
| POST | `register` (name, username, password), `login` (login, password), `logout`; GET `me` | — |
| POST | `phone/register`, `phone/login` — faqat telefon usuli yoqilganda | — |
| GET | `/auth/google/redirect`, `/auth/google/callback`, `/auth/telegram/callback` (API emas, sahifa) | — |
| POST | `people/suggestions` | ✔ |
| POST | `veterans/{id}/memories`, `submissions` | ✔ |
| GET/POST | `channels/{slug}/messages` (`?after=<id>` — faqat yangilari) | ✔ |

## Testlar

```bash
php artisan test
```

## Keyingi bosqichlar

- SMS orqali kirish (Eskiz.uz / Play Mobile) — `AuthController::phoneLogin` ga kod yuborish va tekshirish, keyin “Kirish sozlamalari”da yoqish
- Real vaqtli chat uchun WebSocket (Laravel Reverb) — VPS’da; hozirgi soʻrash (polling) shared hostingda ishlaydi
- Push-bildirishnomalar, suratlar galereyasi, shajarani PDF’ga chiqarish
