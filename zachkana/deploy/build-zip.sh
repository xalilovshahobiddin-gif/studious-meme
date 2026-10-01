#!/usr/bin/env bash
# Hostingga yuklash uchun tayyor arxiv: kutubxonalar (dev'siz), admin panel fayllari va oʻrnatuvchi.
#   bash deploy/build-zip.sh [chiqish.zip]
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(date +%Y.%m.%d)"
OUT="$(realpath -m "${1:-$SRC/../zachkana-$VERSION.zip}")"
TMP="$(mktemp -d)"
APP="$TMP/zachkana"
trap 'rm -rf "$TMP"' EXIT

echo "→ Fayllar nusxalanmoqda"
rsync -a "$SRC/" "$APP/" \
  --exclude '.env' --exclude '.env.backup' --exclude 'vendor/' --exclude 'node_modules/' \
  --exclude 'tests/' --exclude 'phpunit.xml' --exclude '.phpunit.*' --exclude 'deploy/build-zip.sh' \
  --exclude 'database/*.sqlite*' --exclude 'bootstrap/cache/*.php' --exclude 'public/storage' \
  --exclude 'public/css/filament/' --exclude 'public/js/filament/' --exclude 'public/fonts/filament/' \
  --exclude 'storage/installed' --exclude 'storage/framework/schema.*' --exclude 'storage/logs/*.log' \
  --exclude 'storage/framework/cache/data/*/' --exclude 'storage/framework/sessions/*' \
  --exclude 'storage/framework/views/*.php' --exclude 'storage/app/public/*/' --exclude 'storage/app/private/*/' --exclude 'storage/app/backups'

# Har bir arxivda fayllar versiyasi yangilanadi (index.html dagi ?v= va service worker keshi):
# brauzer, service worker va hosting (nginx) eski JS/CSS ni keshdan bermasligi uchun
BASE_V="$(grep -o "const VERSION = 'zk-v[0-9]*'" "$APP/public/sw.js" | grep -o 'zk-v[0-9]*')"
HASH="$(cat "$APP"/public/index.html "$APP"/public/js/*.js "$APP"/public/css/app.css "$APP"/public/ui/*.css "$APP"/public/ui/*.js | sha1sum | cut -c1-7)"
STAMP="$BASE_V-$(date +%m%d)-$HASH"
sed -i "s/$BASE_V/$STAMP/g" "$APP/public/index.html" "$APP/public/sw.js"
echo "→ Fayllar versiyasi: $STAMP"

echo "→ Kutubxonalar oʻrnatilmoqda (composer install --no-dev)"
(cd "$APP" && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-progress --quiet)
# Paketlarning testlari, hujjatlari va git tarixi saytga kerak emas
find "$APP/vendor" -mindepth 3 -maxdepth 3 -type d \( -name .git -o -name tests -o -name test_files -o -name docs -o -name .github \) -prune -exec rm -rf {} +
# Source map fayllar va oʻzbek/rus/ingliz tilidan boshqa tarjimalar (arxiv hajmi uchun)
find "$APP/vendor" -type f -name '*.map' -delete
# Kutubxonalar reklamasi uchun rasmlar va Laravel ishlab chiquvchilarining yordamchi dasturi (7 MB)
find "$APP/vendor" -mindepth 3 -maxdepth 3 -type d -name art -prune -exec rm -rf {} +
rm -rf "$APP/vendor/laravel/framework/bin"
find "$APP/vendor" -mindepth 3 -maxdepth 3 -type f \( -iname 'README*' -o -iname 'CHANGELOG*' -o -iname 'UPGRADE*' -o -iname 'CONTRIBUTING*' \) -delete
find "$APP/vendor/filament" -path '*/resources/lang/*' -mindepth 4 -maxdepth 5 -type d \
  ! -name lang ! -name uz ! -name en ! -name ru -prune -exec rm -rf {} +
find "$APP/vendor/nesbot/carbon/src/Carbon/Lang" -type f ! -name 'uz*' ! -name 'en*' ! -name 'ru*' -delete

# Yozilishi kerak boʻlgan papkalar
chmod -R u+rwX,g+rwX "$APP/storage" "$APP/bootstrap/cache"

cat > "$TMP/OʻRNATISH.txt" <<'TXT'
ZACHKANA — oʻrnatish yoʻriqnomasi
=================================

Talablar: PHP 8.3+ (pdo_mysql, mbstring, intl, fileinfo, openssl), MySQL 8 yoki MariaDB 10.6+.

1. Hosting panelida (cPanel → MySQL Databases) boʻsh baza va foydalanuvchi yarating.
2. "zachkana" papkasi ichidagi BARCHA fayllarni (yashirin .htaccess bilan birga)
   saytingiz papkasiga yuklang, masalan public_html/.
   · Imkon boʻlsa, domen document root'ini "public" papkaga qarating (eng xavfsiz).
   · Imkon boʻlmasa ham ishlaydi: ildizdagi .htaccess hamma soʻrovni public/ ga yoʻnaltiradi.
3. Brauzerda saytni oching: https://sizning-domen.uz/install.php
4. Baza maʼlumotlari, administrator ismi, logini va parolini kiriting → "Oʻrnatish".
5. Tayyor! Admin panel: https://sizning-domen.uz/admin (login va parol bilan)
6. Oʻrnatgandan keyin public/install.php faylini oʻchiring (oʻrnatuvchi oʻzi ham oʻchirishga harakat qiladi).

HTTPS (SSL) ni yoqing — ilovani telefonga oʻrnatish (PWA) faqat HTTPS'da ishlaydi.

ISPmanager: "Режим PHP" — "FastCGI (Apache)", "Версия PHP" — 8.3+, intl yoqilgan boʻlsin.
"Корневая директория" oxiriga /public qoʻshsangiz, manzillar /public siz ishlaydi.

YANGILASH
---------
Yangi arxivdagi fayllarni eskilari ustidan yuklang. FAQAT .env fayli va storage/
papkasiga tegmang. Saytni ochganingizda baza avtomatik yangilanadi.
Eski versiyada telefon bilan kirgan administratorning logini: admin (parol oʻsha).

GOOGLE VA TELEGRAM ORQALI KIRISH
--------------------------------
Admin panel → Tizim → "Kirish sozlamalari":
· Google: console.cloud.google.com → Credentials → OAuth client ID (Web application),
  "Authorized redirect URI" = https://sizning-domen.uz/auth/google/callback
· Telegram: @BotFather → /newbot, keyin /setdomain → sizning-domen.uz
Nginx (VPS) uchun namuna sozlama: deploy/nginx.conf
TXT

echo "→ Arxivlanmoqda: $OUT"
rm -f "$OUT"
(cd "$TMP" && zip -9 -qr -X "$OUT" "zachkana" "OʻRNATISH.txt")
du -h "$OUT" | cut -f1 | xargs echo "Tayyor:"
