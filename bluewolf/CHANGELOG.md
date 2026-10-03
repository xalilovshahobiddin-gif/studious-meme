# Blue Wolf — oʻzgarishlar tarixi

## v0.0.13 — Profil: qoʻshin koʻrinishlari
- Qoʻshin jadvali oʻrniga uchta koʻrinish (subtablar): **Kartalar** (2×2 rol kartalari, tierlar boʻyicha sonlar),
  **Medallar** (har rolda 6 ta tier medali, ramka rangi — tier), **Radar** (muvozanat diagrammasi va maslahat).
- Sonlar endi ovdagi va yarador boʻrilarni ham oʻz ichiga oladi; pastda Inda · Ovda · Yarador holat belgilari.
- GDD bo'lim 18 yangilandi.

## v0.0.12 — ov taymeri, In soddalashdi, ov slayderlari
- **Ov taymeri** taymerlar panelida: yashil, panja ikonkasi, qaytishgacha vaqt va halqa; bosilsa Ov tabi ochiladi.
  Panel uchala turni (qurilish, mashq, ov) tugash vaqti boʻyicha tartiblaydi.
- **In sahifasidan “Qurilish navbati” va “Mashq” boʻlimlari olib tashlandi** — ular taymerlar panelida koʻrinadi;
  tezlashtirish va bekor qilish bino oynasida qoldi.
- **Ov kartasida slayder faqat inda bor rollar uchun** chiqadi; ovchi yoʻq boʻlsa — “kamida 1 ovchi kerak” eslatmasi.
- GDD bo'lim 18, texnik spec yangilandi.

## v0.0.11 — menyu tutqichi va ixcham taymerlar
- **Menyu tutqichi:** yuqoridagi ☰ oʻrniga ekran oʻrtasida chap chetda yarmi koʻrinadigan tugma. Bosilganda menyu chiqadi,
  tutqich menyu ramkasiga ulangan holda u bilan birga suriladi (› → ‹); qayta bosilsa birga yopiladi.
- **Taymerlar** resurs kataklariga oʻxshash: faqat ikonka + vaqt, kichik shrift; ikonka atrofida toʻlib boradigan halqa,
  yumaloq uzuq chiziqli ramka; qurilish — qahrabo, mashq — binafsha. Kelajakdagi taymerlar shu qatorga qoʻshiladi.
- GDD bo'lim 18, texnik spec yangilandi.

## v0.0.10 — interfeys: taymerlar, menyu, resurs animatsiyasi
- **Yangi ikonkalar:** Toʻda tabi — ikki boʻri boshi (toʻda), Profil — doira ichidagi boʻri boshi (oʻyinchi nishoni).
- **Taymerlar paneli** resurslar ostida — faqat taymer bor paytda chiqadi. Qurilish (qahrabo, bolgʻa, “QURILISH”) va mashq
  (binafsha, rol ikonkasi, “MASHQ”) bir-biridan rangi, ikonkasi va yozuvi bilan ajraladi; qolgan vaqt va progress chizigʻi;
  bosilsa bino oynasi ochiladi.
- **Chap menyu:** ☰ tugmasi bilan chap yondan suzib chiqadi (ekranning ~78%, koʻpi bilan 320 px), hamma narsa ustida;
  ✕, fonga bosish, chapga surish, Telegram “Orqaga” yoki Esc bilan chapga qaytib kiradi. Bandlari keyin qoʻshiladi.
- **Resurs olish animatsiyasi:** vazifa, sandiq, kirish sovgʻasi, bufer yigʻish, ov (yolgʻiz va xaritadan) va tanishtiruv
  mukofotlarida har resurs “+N” belgisi oʻz katagiga uchib boradi, katak yonadi.
- GDD bo'lim 18 (6 tab, yuqori panel, taymerlar, animatsiya), texnik spec 1-boʻlim yangilandi.

## v0.0.9 — tanishtiruv
- **23 qadamlik tanishtiruv** (yangi oʻyinchi, 1 → 5 daraja, ~14 daqiqa): resurslar paneli, goʻsht, suv / oʻt / oy nuri, XP va darajalar,
  In, Oziq gʻori, Ustaxona, taqsimot, yigʻish, qurilish navbati va tezlashtirish, rol binolari, 4 rol va kuch uchburchagi, askar narxi va
  mashq, tier va qoʻshin sigʻimi, toʻda, ov xaritasi, xavf va yaradorlar, oziqlanish va ochlik, vazifalar, kelajakdagi binolar.
- **Yoʻriqchi kartasi** (pastda; oyna ochiq boʻlsa — tepada): qadam, progress, tushuntirish, mukofot; “Davom” yoki
  “Belgilangan joyni bosing” — kerakli tugma sariq ramka bilan belgilanadi va koʻrinadigan joyga suriladi; boshqa tabda — “Oʻtish”;
  kartani yigʻish mumkin; 12-qadamdan keyin “Oʻtkazib yuborish” (qolgan XP beriladi).
- **Qoidalar:** tanishtiruvda qurilish va mashq darhol tugaydi, XP faqat qadamlardan (jami 330: 5 → 2-daraja, 12 → 3, 16 → 4, 22 → 5).
- Server: `TutorialService`, `POST /tutorial/step`, `/tutorial/skip`; v0.0.9 dan oldingi 2+ darajali oʻyinchilar tanishtiruvni oʻtgan hisoblanadi.
- Demo: Profil → “Yangi oʻyin (tanishtiruv bilan)” va “Tayyor 5-daraja demo”; yangi tashrif buyuruvchi tanishtiruvdan boshlaydi.
- GDD bo'lim 15, Excel “Tanishtiruv” varagʻi (balans skripti `tutorial.json` bilan solishtiradi), API yangilandi.
- Testlar: PHP 48 ta (toʻliq oʻtish, ketma-ketlik, oʻtkazib yuborish, XP va navbat qoidalari).

## v0.0.8 — vazifalar
- **Vazifalar tabi** subtablar bilan: **‹ Orqaga** (oldingi tabga) · **Kundalik** · **Haftalik** · **Oylik**; har birida yangilanishgacha taymer,
  vazifalar (progress, mukofot, “Olish”), **sandiq** va “Hammasini olish”. Tabda — olish mumkin boʻlganlar soni.
- **Kundalik** 4 · **haftalik** 4 · **oylik** 3 vazifa: Ovchi, Goʻsht zaxirasi, Quruvchi, Yigʻuvchi, Uzoq yoʻl, Murabbiy, Sodiq boʻri —
  daraja boʻyicha ochiladi, har oʻyinchiga oʻz urugʻi bilan tanlanadi. Davr chegarasi — Toshkent vaqti.
- **Kun kombosi:** kundalikning hammasi bajarilgan har ketma-ket kun kun sandigʻi +10% (7 kunda ×1.6); kun oʻtkazilsa — 1 dan.
- **Kirish taqvimi:** 7 kunlik sovgʻa (1%…7% kunlik ishlab chiqarish); kun oʻtkazilsa 1-kundan.
- **Balans:** mukofot faqat resurs (qurilish resurslari + goʻsht, gʻor sigʻimigacha) — askar, XP, tezlashtirish berilmaydi. Jami kuniga ≤ 37% kunlik
  ishlab chiqarish (xavfsiz chegara 60%), goʻsht toʻdani toʻliq boqmaydi — `tools/blue_wolf_config.py` tekshiradi.
- Server: `player_quests` jadvali, `QuestService`, `QuestFormula`; `GET /quests`, `POST /quests/claim`, `/quests/login`; harakatlar
  (ov, goʻsht, qurilish, mashq, yigʻish, kirish) avtomatik sanaladi.
- GDD bo'lim 14, Excel `Sozlamalar` (+10 parametr), API (68 endpoint), sxema (`player_quests`) yangilandi.
- Testlar: PHP 44 ta, JS 13 ta; umumiy `tests/fixtures/quest_cases.json` (PHP = JS).

## v0.0.7 — ov xaritasi
- **Ov xaritasi:** Ov tabida 3 × 3 = 9 ta ov kartasi. Yuqori chapdan pastki oʻngga — eng qisqa va eng kam oʻljadan eng uzoq va
  eng koʻp oʻljaga. Kartada: oʻlja, taxminiy goʻsht (boʻsh ovchilaringiz bilan), masofa, vaqt, xavf darajasi.
- Kartaga bosilganda: oʻlja va poda, masofa, ov vaqti, xavf ehtimollari, askar tanlash (slayderlar), kutilgan natija, “Ovga chiqish”.
- Kartalar **har 4 soatda yangilanadi** va **har oʻyinchida har xil** (oʻyinchi ID + davr urugʻi; server va klient bir xil hisoblaydi).
  Har karta davr ichida bir marta ovlanadi; bir vaqtda bir nechta kartaga borish mumkin.
- **Ov vaqti qisqa:** 16–85 daqiqa (10 daqiqa + borib-kelish yoʻli).
- **Xavf:** oʻrta masofada 8% yarador / 1% halok, uzoqda 15% / 4% (har bir boʻri uchun); evaziga oʻlja +20% / +50%.
  Yaradorlar 3 soatda tuzaladi (Ov tabida “Yaradorlar tuzalmoqda”), halok boʻlganlar qoʻshindan ketadi.
- **Ov guruhlari olib tashlandi** (UI, demo, GDD, API, sxema).
- GDD bo'lim 4 ga “Ov xaritasi” qoʻshildi; Excel `Sozlamalar` → “Ov xaritasi” (15 parametr, `hunt_party_*` oʻrniga); API: `GET /hunt/board`,
  `POST /hunt { slot, payload }`; sxema: `marches.board_window/board_slot`, `hunt_parties` jadvallari olib tashlandi (30 jadval).
- Testlar: PHP 38 ta, JS 12 ta; ov xaritasi uchun umumiy `tests/fixtures/hunt_board_cases.json` (PHP = JS).

## v0.0.6 — Ov tabi
- Pastki menyuga **Ov** tabi qoʻshildi (In bilan Jang orasida). Ovga oid hamma narsa shu yerda:
  yurishdagi ov (taymer), yolgʻiz ov, toʻda ovi — rollar boʻyicha slayderlar va kutilgan natija bilan (alohida oyna emas),
  ovchilar soni va mashqi, goʻsht zaxirasi (sigʻim, kunlik sarf, necha kunga yetadi), ov guruhlari (Toʻda tabidan koʻchdi),
  oʻlja zinapoyasi (har darajadagi oʻlja va kerakli boʻri soni).
- Ovga chiqish mumkin boʻlsa (boʻsh ovchilar yoki yolgʻiz ov tayyor) Ov tabida sariq nuqta yonadi.
- **Ov soʻqmogʻi** binosi In’da qoldi; Ov tabidan ham bir bosishda ochiladi.
- In ekranidan ov kartasi olib tashlandi; goʻsht maʼlumot oynasidagi “Ovga chiqish” Ov tabiga olib boradi.
- BlueWolf UI: tab panel ixtiyoriy sondagi tablarga moslashadi, `bw-badge--dot`.

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
