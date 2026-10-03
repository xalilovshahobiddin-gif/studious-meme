# Blue Wolf — oʻzgarishlar tarixi

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
