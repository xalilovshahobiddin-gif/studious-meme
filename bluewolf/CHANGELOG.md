# Blue Wolf — oʻzgarishlar tarixi

## v0.0.5 — slayderlar
- **Son tanlash endi “− slayder +”**: ov oynasida (har rol), askar tayyorlashda va Ustaxona taqsimotida. Slayderni surish yoki
  tugmalarni bosish — ikkalasi ham ishlaydi; natija (goʻsht, narx, vaqt) surish paytida darhol yangilanadi.
- Tayyorlash tugmasida son koʻrinadi (“Tayyorlash · 5”).
- BlueWolf UI: yangi `bw-slider` komponenti (koʻrgazmada ham).

## v0.0.4 — askarlar va ov
- **Askar tayyorlash:** rol binosi oynasida tier (T1–T6, ochilganlari), son, narx (goʻsht + suyak) va vaqt; qoʻshin sigʻimi va
  toʻlganlik koeffitsienti (GDD bo'lim 6). Mashq navbati In ekranida, tezlashtirish va bekor qilish bilan.
- **Ov:** 1–3 darajada yolgʻiz ov (2 daqiqa kutish); ovchilar bilan 1 soatlik toʻda ovi — askarlarni tanlash, kutilgan goʻsht/oʻt/XP,
  kichik toʻda jazosi (×0.3) va gʻor sigʻimi ogohlantirishi; ov kartasida taymer.
- **Oziqlanish:** askarlar goʻsht va suv yeydi (endi Telegram rejimida ham), ochlik ishlab chiqarishni kamaytiradi.
- **XP va daraja:** ov, qurilish va mashq XP beradi; yangi daraja oynasi (boʻri turi, qoʻshin sigʻimi, ochilgan imkoniyatlar),
  yangi binolar avtomatik paydo boʻladi.
- Server: `army`, `marches` jadvallari, `ArmyService`, `HuntService`, `ProgressService`, `Formula`; `POST /army/train`, `/hunt/solo`, `/hunt`.
  `EconomyService::sync` qurilish, mashq va ovdan qaytishni vaqt tartibida yopadi.
- Testlar: PHP 37 ta, JS 11 ta; askar va ov formulalari uchun umumiy `tests/fixtures/army_cases.json`.

## v0.0.3 — qurilish
- **Binolarni kuchaytirish:** bino oynasida narx, vaqt va keyingi daraja nima berishi (ishlab chiqarish, sigʻim, askar sigʻimi, tier);
  yetmagan resurs yoki band navbat sababi koʻrsatiladi. Kuchaytirish mumkin boʻlgan binolarda yashil “+” belgisi.
- **Qurilish navbati:** In ekranida slotlar (1; 10-darajadan 2), har soniyada yuruvchi taymer va progress, bino kartasida ham taymer.
  Tugaganda “… N-darajaga koʻtarildi!” xabari.
- **Bekor qilish** (80% resurs qaytadi) va **bepul tezlashtirish** (−60 daqiqa; yangi oʻyinchiga 5 ta).
- Server: `queues` jadvali, `BuildService`, `POST /buildings/upgrade`, `/queue/cancel`, `/queue/speedup`; navbatlar keyingi soʻrovda
  dangasa yopiladi va resurs hisobi tugash paytida yangi bino darajasi bilan davom etadi.
- Demo rejimda qurilish ham qurilmada simulyatsiya qilinadi va saqlanadi.
- Testlar: PHP 32 ta (qurilish qoidalari, tugash vaqti, bekor qilish, tezlashtirish, narx formulalari klient bilan bir xil).

## v0.0.2 — tirik iqtisodiyot
- **Resurs hisobi (timestamp accrual, texnik spec 4.1):** serverda `EconomyService`, klientda `BWGame.advance()` — bir xil formula.
  Onlayn/oflayn oraliqlari (oflaynda ishlab chiqarish ×0.7, bufer va gʻor sigʻimi ×2), Oziq gʻorining passiv suvi,
  suv/goʻsht/oy nuri sarfi va ochlik (ishlab chiqarish −50%) hisobga olinadi. Ekrandagi raqamlar har soniyada oʻsadi.
- **Ustaxona buferi:** In ekranida 4 resurs boʻyicha bufer, toʻlish vaqti, “Yigʻish” tugmasi; resurs va Ustaxona oynalarida ham.
  Bufer deyarli toʻlsa resurs katagida chiroq yonadi.
- **Taqsimot serverda saqlanadi** (`POST /profile/allocation`); yangi ulush oʻzgartirilgan paytdan amal qiladi.
- **“Siz yoʻqligingizda” oynasi** — qaytganda nima yigʻilganini koʻrsatadi.
- Demo rejim ham tirik: holat qurilmada saqlanadi, Profil → “Demoni qaytadan boshlash”.
- API: `POST /buildings/collect`, `POST /profile/allocation`; `/state` javobida `economy` va `away`.
- Testlar: PHP va JS uchun umumiy `tests/fixtures/economy_cases.json` (8 holat), API testlari; MySQL 8 da ham tekshirildi.

## v0.0.1
- **Ixcham resurs paneli:** 2 qator — oziq (goʻsht, suv, oʻt; 20+ darajada oy nuri) va qurilish (tosh, shox-shabba, teri, suyak).
  Katta raqamlar qisqa koʻrinishda (12,4K, 1,2M); oziq resurslarida ombor toʻlganligi chizigʻi, toʻla yoki tugayotgan holat rangi.
- **Oy toshi** premium valyuta sifatida yuqori qatorga, ism yoniga koʻchdi.
- **Resurs maʼlumot oynasi:** resurs ustiga bosilganda — miqdor va sigʻim, ishlab chiqarish yoki sarf, zaxira necha kunga yetishi,
  bufer, qayerdan keladi va nimaga kerak (GDD bo'lim 3–5), tegishli amalga tugma (ov, Ustaxona taqsimoti, Oziq gʻori, doʻkon).
- Ustaxona taqsimoti oʻzgarganda panel darhol yangilanadi.
- BlueWolf UI: yangi `bw-resgrid`, `bw-rescell`, `bw-gem`, `bw-resinfo` komponentlari (koʻrgazmada ham).
- `game.js`: `caveCap`, `waterPerHour`, `waterNeed`, `workshopPerHour`, `fmtShort` va resurslar maʼlumotnomasi; JS testlari 8 ta.

## v0.0.0
- Skelet: Laravel 12 backend (Telegram `initData` tekshiruvi, `/ping`, `/config`, `/state`), PWA frontend (5 tab, demo rejim),
  BlueWolf UI dizayn tizimi.
