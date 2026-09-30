# zachkana.uz

Zachkana qishlogʻining raqamli xotirasi: **shajara**, **qishloq tarixi**, **xronologiya**, **faxriylar** va qishloqdoshlar **suhbati**.

- **Backend:** Laravel 13 + MySQL, admin panel — Filament 5 (`/admin`)
- **Frontend:** PWA, `public/` papkasida (build shart emas), dizayn tizimi — **Zachkana UI** (`public/ui/`)
- Telefon (wap) va kompyuter (web) uchun avtomatik moslashadi, oflayn ishlaydi

Frontend haqida batafsil: [README.frontend.md](README.frontend.md)

## Nima ishlaydi (1-bosqich)

| Qism | Tavsif |
| --- | --- |
| Kirish | Telefon raqam + parol (sessiya, CSRF himoyasi). **SMS tasdiqlash — keyingi bosqichda** (`users.phone_verified_at` tayyor) |
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
php artisan zachkana:admin 901234567 --name="Ism Familiya"   # administrator
php artisan serve                   # http://localhost:8000  ·  admin: /admin
```

Faqat administrator (namuna maʼlumotsiz): `php artisan migrate && php artisan db:seed --class=AdminSeeder` (`.env` dagi `ADMIN_PHONE`, `ADMIN_PASSWORD`).

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

### SSH boʻlsa (VPS)

`composer install --no-dev -o`, `.env` sozlang, `php artisan key:generate`, `php artisan migrate --force`,
`php artisan storage:link`, `php artisan zachkana:admin <telefon>`. Nginx namunasi: [deploy/nginx.conf](deploy/nginx.conf).

Talablar: PHP 8.3+, MySQL 8 / MariaDB 10.6+, kengaytmalar: `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `dom`.

## API

Barcha manzillar `/api/` bilan boshlanadi, javoblar JSON. Oʻzgartiruvchi soʻrovlar `X-XSRF-TOKEN` sarlavhasini talab qiladi (cookie’dan).

| Usul | Manzil | Kirish |
| --- | --- | --- |
| GET | `bootstrap` — qishloq, eʼlonlar, urugʻlar, kanallar, joriy foydalanuvchi | — |
| GET | `clans/{slug}/tree` | — |
| GET | `history`, `timeline`, `veterans`, `veterans/{id}` | — |
| POST | `register`, `login`, `logout`; GET `me` | — |
| POST | `people/suggestions` | ✔ |
| POST | `veterans/{id}/memories`, `submissions` | ✔ |
| GET/POST | `channels/{slug}/messages` (`?after=<id>` — faqat yangilari) | ✔ |

## Testlar

```bash
php artisan test
```

## Keyingi bosqichlar

- SMS orqali kirish (Eskiz.uz / Play Mobile) — `AuthController` ga kod yuborish va tekshirish
- Real vaqtli chat uchun WebSocket (Laravel Reverb) — VPS’da; hozirgi soʻrash (polling) shared hostingda ishlaydi
- Push-bildirishnomalar, suratlar galereyasi, shajarani PDF’ga chiqarish
