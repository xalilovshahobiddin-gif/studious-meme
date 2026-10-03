# BLUE WOLF — Game Design Document

**Janr:** Strategiya / omon qolish · **Platforma:** Telegram Mini App
**Stack:** PHP 8 + MySQL 8 + Telegram Bot webhook · **Domen:** bluewolf.uz
**Tillar:** uz (asosiy), ru, en

---

## 0. Konsepsiya

Oʻyinchi toʻdasini yoʻqotgan yolgʻiz boʻri sifatida boshlaydi. Ov qiladi, in quradi, toʻda yigʻadi, boshqa boʻrilar bilan jang qiladi va afsonaviy Koʻk Boʻriga aylanishga intiladi.

**Asosiy sikl:** ov → resurs → bino → askar → jang → oʻlja → yana bino

**Uchta ustun:**
1. **Progressiya** — 25 daraja, haqiqiy boʻri turlaridan afsonaviy boʻrilargacha
2. **Iqtisod** — 8 resurs (+2 premium valyuta), 9 bino (8 tasi qurilib oʻstiriladi, 1 tasi — In — oʻyinchi darajasiga avtomatik ergashadi), oziqlanish va ombor cheklovlari
3. **Raqobat** — PvP reyd, razvedka, klan urushi, mavsum reytingi

**Asosiy trade-off:** bitta toʻda ham ov qiladi, ham resurs yigʻadi, ham jangga chiqadi. Oʻyinchi har kuni shu taqsimotni tanlaydi.

---

## 1. Oʻyinchi darajalari (1–25)

Har daraja — alohida boʻri turi. 1–19 haqiqiy boʻrilar (eng zaifdan eng kuchligacha), 20–21 qadimgi, 22–25 mifologik.

| # | Boʻri | Vazni | Bosqich koeff. | Daraja narxi (XP) | Jami XP | Kuch | Tezlik | Chidam | CP | Qoʻshin |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Honsyu boʻrisi | 15 kg | 0.40 | 0 | 0 | 11 | 11 | 60 | 69 | 1 |
| 2 | Efiopiya boʻrisi | 16 kg | 0.40 | 30 | 30 | 13 | 13 | 71 | 81 | 1 |
| 3 | Arab boʻrisi | 20 kg | 0.40 | 40 | 70 | 16 | 15 | 84 | 97 | 1 |
| 4 | Hind boʻrisi | 25 kg | 0.40 | 60 | 130 | 20 | 16 | 99 | 114 | 10 |
| 5 | Qizil boʻri | 30 kg | 0.70 | 150 | 280 | 25 | 18 | 116 | 135 | 12 |
| 6 | Italyan boʻrisi | 32 kg | 0.70 | 200 | 480 | 30 | 20 | 137 | 159 | 14 |
| 7 | Meksika boʻrisi | 33 kg | 0.70 | 280 | 760 | 37 | 22 | 162 | 188 | 17 |
| 8 | Sharqiy boʻri | 35 kg | 0.70 | 390 | 1,150 | 45 | 25 | 191 | 223 | 21 |
| 9 | Iberiya boʻrisi | 38 kg | 0.70 | 530 | 1,680 | 55 | 27 | 226 | 264 | 25 |
| 10 | Dasht boʻrisi | 40 kg | 0.70 | 740 | 2,420 | 66 | 33 | 266 | 315 | 30 |
| 11 | Himolay boʻrisi | 42 kg | 1.00 | 1,450 | 3,870 | 81 | 35 | 314 | 372 | 36 |
| 12 | Ezo boʻrisi | 44 kg | 1.00 | 2,000 | 5,870 | 98 | 39 | 371 | 440 | 43 |
| 13 | Tibet boʻrisi | 45 kg | 1.00 | 2,770 | 8,640 | 119 | 43 | 437 | 521 | 52 |
| 14 | Arktika boʻrisi | 46 kg | 1.00 | 3,820 | 12,460 | 144 | 48 | 516 | 618 | 62 |
| 15 | Buyuk tekislik boʻrisi | 48 kg | 1.00 | 5,270 | 17,730 | 176 | 55 | 609 | 739 | 74 |
| 16 | Yevroosiyo kulrang boʻrisi | 55 kg | 1.25 | 9,080 | 26,810 | 214 | 62 | 718 | 880 | 89 |
| 17 | Tundra boʻrisi | 57 kg | 1.25 | 12,540 | 39,350 | 262 | 69 | 848 | 1,052 | 107 |
| 18 | Alyaska ichki boʻrisi | 60 kg | 1.25 | 17,300 | 56,650 | 319 | 77 | 1,000 | 1,254 | 128 |
| 19 | Makkenzi vodiysi boʻrisi | 75 kg | 1.25 | 23,880 | 80,530 | 399 | 86 | 1,180 | 1,517 | 154 |
| 20 | Beringiya boʻrisi | 65 kg | 1.25 | 32,950 | 113,480 | 673 | 129 | 1,880 | 2,480 | 185 |
| 21 | Dahshatli boʻri | 70 kg | 1.25 | 45,470 | 158,950 | 869 | 140 | 2,219 | 3,058 | 222 |
| 22 | Amarok | — | 1.25 | 62,750 | 221,700 | 1,491 | 234 | 3,491 | 5,079 | 266 |
| 23 | Geri va Freki | — | 1.25 | 86,590 | 308,290 | 1,908 | 291 | 4,119 | 6,312 | 319 |
| 24 | Fenrir | — | 1.25 | 119,490 | 427,780 | 2,576 | 284 | 4,861 | 8,009 | 383 |
| 25 | Koʻk Boʻri | — | 1.25 | 164,900 | 592,680 | 3,434 | 355 | 5,736 | 10,269 | 460 |

### Formulalar

```
Daraja narxi = 80 × 1.38^(daraja-2) × bosqich koeffitsienti
Kuch    = 12 × 1.20^(daraja-1) × toifa koeff. × kuch modifikatori
Tezlik  = 10 × 1.13^(daraja-1) × toifa koeff. × tezlik modifikatori
Chidam  = 60 × 1.18^(daraja-1) × toifa koeff.
CP      = Kuch×2 + Tezlik×1.5 + Chidam×0.5
Qoʻshin sigʻimi = 1 (1–3 daraja) yoki 10 × 1.20^(daraja-4)
```

**Toifa koeffitsientlari:** haqiqiy ×1.00, qadimgi ×1.35, mifologik ×1.80

**Bosqich koeffitsientlari:** 1–4 daraja ×0.40 · 5–10 ×0.70 · 11–15 ×1.00 · 16–25 ×1.25
Bu XP, bino narxi va qurilish vaqtiga bir vaqtda qoʻllanadi — boshlanish tez, oxiri qiyin.

> **Eslatma:** har bir boʻri turining kuch/tezlik modifikatori individual va lore asosida tanlangan (masalan, Fenrir — ulkan, kuchli, lekin sekinroq boʻri). Shuning uchun **tezlik** darajama-daraja monoton oʻsmasligi mumkin (24-daraja Fenrir tezligi 23-daraja Geri va Frekidan past). Balans kafolati tezlikda emas — **CP** har doim monoton oʻsadi. Jadvaldagi tezlik pasayishini xato deb hisoblamang.

### Oʻyinchi XP manbalari

```
Ov XP        = oʻlja vazni (kg) × 0.50
Qurilish/mashq tugash XP = sarflangan asosiy resurs (tosh+yogʻoch+teri+suyak yigʻindisi) × 0.02
PvP XP       = yetkazilgan EP zarar × 0.03 × natija koeff. (gʻalaba 1.5 · durang 1.0 · magʻlubiyat 0.5)
Kundalik vazifa XP = vazifa mukofoti byudjetining (resurs birligida) 10% i, 1 birlik = 1 XP
Tanishtiruv XP = har qadamning qatʼiy XP mukofoti (bo'lim 15), jami 330 XP, 23 qadam
```

**Tanishtiruv davomida** (1–20 qadam) oddiy XP manbalari oʻchiriladi — XP faqat qadam mukofotidan keladi. Shunda daraja chegaralari qadamlarga aniq mos tushadi: 5-qadamdan keyin 2-daraja, 12-dan keyin 3-daraja, 16-dan keyin 4-daraja, 22-dan keyin 5-daraja.

Tanishtiruvdan keyin ov — asosiy va doimiy manba (kuniga ~4 ov × oʻlja kg × 0.5), PvP — eng tez, lekin xavfli manba. Har bir XP manbasi `game_config` da alohida koeffitsient (`xp_hunt_coef`, `xp_build_coef`, `xp_pvp_coef`, `xp_quest_share`).


---

## 2. Ochilish jadvali

| Daraja | Modul | Ochiladigan imkoniyat |
|---|---|---|
| 1 | Ov / Iqtisod | Yolgʻiz ov (alfa oʻzi: kemiruvchi, qush), In |
| 2 | Iqtisod | Oziq gʻori, Ustaxona qoyasi |
| 3 | Ov | Ov soʻqmogʻi, birinchi ovchi, quyon ovi |
| **4** | **Toʻda / Jang** | **🔓 Toʻda (qoʻshin 10 askar) · Jang maydoni, Razvedka qoyasi, Himoya devori · yovvoyi toʻdalarga (bot) hujum · 🏕 Lager (v2) · klan yaratish yoki qoʻshilish (v2)** |
| 5 | Ov | Yirik oʻlja — jayron (kamida 2 boʻri) |
| 6 | Iqtisod | 🏥 Shifo gʻori · 💧 Suv oazisi (v2) |
| **7** | **PvP** | **Haqiqiy oʻyinchilarga hujum (yangi oʻyinchi qalqoni tugaydi)** · reyting va liga (v2) |
| 8 | PvP / Klan | Toʻda urushi (v2) · 🌿 Oʻt oazisi (v2) |
| 9 | Iqtisod / Klan | 🛒 Bozor · toʻda lavozimlari (v2) |
| 10 | Iqtisod | Ikkinchi qurilish navbati — hammaga bepul |
| 11 | Toʻda | Co-op boss — togʻ ayigʻi (v3) |
| 12 | Klan | Toʻda xazinasi va ulush taqsimoti (v2) · 🪨 Tosh koni (v2) |
| 13 | PvP | Himoya urushi (v3) |
| 14 | PvP | Haftalik turnir (v3) |
| 15 | Toʻda | Taktika: qurshab olish, chekinish, tuzoq (v3) |
| 16 | PvP | 🦴 Suyak dalasi (v2) · katta toʻda urushi 20v20 (v3) |
| 17 | Klan | Toʻdalar ittifoqi (v3) |
| 18 | PvP | Elite reyd (v3) |
| 19 | Klan | Alfa unvoni, server reytingi (v2) |
| 20 | Iqtisod | 🌙 Oy nuri ehtiyoji va passiv ishlab chiqarishi · 🌕 Oy mehrobi (v2) · muz davri zonasi (v3) |
| 21 | PvP | Afsona bossi (v3) |
| 22 | PvP | Tungi reyd: 22:00–06:00 (server vaqti) yurish tezligi +25% |
| 23 | Toʻda | Juft hujum (v3) |
| 24 | PvP | Zanjirni uzish: urushdan keyin jarohatlangan boʻrilar 2× tez davolanadi |
| 25 | Klan | Koʻk Boʻri unvoni · klanga +10% ishlab chiqarish bonusi (kuch emas) |

**(v2)** — tizim shu hujjatda taʼriflangan, lekin MVP dan keyin quriladi. **(v3)** — faqat nomi bor; ishlab chiqishdan oldin alohida dizayn hujjati kerak.
**Qoida:** ochilish yangi imkoniyat, tezlik yoki ishlab chiqarish beradi, lekin **doimiy jangovar kuch (CP/EP koeffitsienti) bermaydi** (bo'lim 24, qoida 5).

---

## 3. Resurslar

### Oziq resurslari (Oziq gʻorida saqlanadi, sigʻim bilan cheklangan)
| Resurs | Vazifasi | Manba |
|---|---|---|
| 🥩 Goʻsht | Oziq, askar yollash | Ov (bo'lim 4), PvP oʻljasi |
| 💧 Suv | Ichimlik — yetmasa yurish tezligi −20% | Oziq gʻori passiv yigʻimi, Suv oazisi |
| 🌿 Shifobaxsh oʻt | Jarohatlangan boʻrini davolash | Ov (oʻlja vaznining 10% i), Oʻt oazisi |
| 🌙 Oy nuri | 20+ daraja oziqlanishi | Oziq gʻori passiv ishlab chiqarishi (20+), Oy mehrobi bonusi |

### Qurilish resurslari (ombori cheklanmagan, Ustaxona buferi orqali keladi)
| Resurs | Sarfi | Manba |
|---|---|---|
| 🪨 Tosh | Barcha binolar | Ustaxona qoyasi |
| 🌲 Shox-shabba | Oziq gʻori, Ustaxona, Shifo gʻori, Bozor | Ustaxona qoyasi |
| 🐾 Teri | Rol binolari, Shifo gʻori | Ustaxona qoyasi |
| 🦴 Suyak | Ustaxona, rol binolari, askar yollash | Ustaxona qoyasi |

Jami **8 resurs** + 2 premium valyuta.

### Premium
🌕 **Oy toshi** — faqat Telegram Stars orqali sotib olinadi (oʻyin ichida mukofot sifatida berilmaydi)
🪙 **Tanga** — mavsum mukofoti

---

## 4. Oziqlanish va ov

```
Bir askarning kunlik ehtiyoji = 0.6 + 0.1 × (daraja − 1)  kg
Toʻda kunlik sarfi = shu × qoʻshin soni
Suv = (0.4 + 0.04 × (daraja−1)) × qoʻshin
Oy nuri = 0.2 × qoʻshin (faqat 20+ daraja)
Zaxira talabi = 3 kunlik sarf
```

| Daraja | 1 askar | Qoʻshin | Kunlik goʻsht | Suv | Oy nuri | Asosiy oʻlja | Sarfga kerakli oʻlja/kun | 3 kunlik zaxira | Kerakli Oziq gʻori |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.6 | 1 | 1 | 0 | — | Kemiruvchi (0.5 kg) | 2 | 3 | 1 |
| 4 | 0.9 | 10 | 9 | 5 | — | Sugʻur (8 kg) | 2 | 27 | 1 |
| 10 | 1.5 | 30 | 45 | 23 | — | Kiyik (60 kg) | 1 | 135 | 8 |
| 15 | 2.0 | 74 | 148 | 71 | — | Yovvoyi ot (250 kg) | 1 | 444 | 14 |
| 20 | 2.5 | 185 | 463 | 215 | 37 | Mamont bolasi (800 kg) | 1 | 1,389 | 19 |
| 25 | 3.0 | 460 | 1,380 | 626 | 92 | Ruh oʻljasi (400 kg) | 4 | 4,140 | 25 |

### 🌙 Oy nuri — ikki qatlam

```
Passiv oy nuri (Oziq gʻori, 20+ daraja) = 0.006 × qoʻshin / soat   → kuniga 0.144 × qoʻshin (ehtiyojning 72%)
Oy mehrobi egasi (klan aʼzolari)        = passiv × 1.40              → kuniga 0.20 × qoʻshin (ehtiyojning 100%)
Yetishmovchilik                         = jangda CP −15% (goʻsht ochligidan alohida, ular qoʻshilmaydi)
```

Qolgan 28% ni Bozor orqali (oy nuri kursi ×2) yoki Oy mehrobini egallash orqali qoplash mumkin. Shu bilan oazis strategik qiymatini saqlaydi, lekin uni egallamagan oʻyinchi tiqilib qolmaydi.

### 💧 Suv

```
Passiv suv(L) = 0.25 × 1.25^(L−1) birlik/soat   (Oziq gʻori darajasi L)
```
Oziq gʻori oʻyinchi darajasida boʻlsa, suv ehtiyojning ~2× ini beradi; gʻor orqada qolsa yetishmaydi → **yurish tezligi −20%**.

### 🥩 Ov

Ov — faol harakat: oʻyinchi **ov xaritasidagi** kartalardan birini tanlab, ovchilarni (va xohlasa boshqa askarlarni) yuboradi (pastda “Ov xaritasi”).

```
Ovchi unumi(L, tier) = 5 × bir askarning kunlik ehtiyoji(L) × (1 + 0.10 × (tier−1))   kg/soat
Bir ov (kg)          = MIN(poda, Σ ovchi unumi × ov vaqti (soat) × (1 + masofa bonusi))
Kichik oʻlja jazosi  = yuborilgan boʻrilar soni oʻljaning minimal toʻdasidan kam boʻlsa → natija × 0.30
Shifobaxsh oʻt       = ov natijasining 10% i (birlik)
```

Quyidagi balans jadvali ovchilar kuniga **4 soat** ovda boʻlgani (masalan, 4 ta ~1 soatlik yoki 8 ta ~30 daqiqalik ov, masofa bonusisiz) bilan hisoblangan (`hunt_duration_min` = 60 — faqat balans hisobi uchun).

| Daraja | Qoʻshin | Ovchi (15%) | 1 soat ov | Kuniga 4 soat | Kunlik sarf | Nisbat |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 3 kg | 12 kg | 1 kg | 12× |
| 4 | 10 | 2 | 9 kg | 36 kg | 9 kg | 4.0× |
| 10 | 30 | 5 | 38 kg | 150 kg | 45 kg | 3.3× |
| 15 | 74 | 11 | 110 kg | 440 kg | 148 kg | 3.0× |
| 20 | 185 | 28 | 350 kg | 1,400 kg | 463 kg | 3.0× |
| 25 | 460 | 69 | 1,035 kg | 4,140 kg | 1,380 kg | 3.0× |

Ovning ~1/3 qismi toʻdani boqadi, qolgani askar yollash va zaxiraga ketadi. Faol oʻyinchi (kuniga 4 ov) ochlikka tushmaydi; kuniga 1–2 marta kiradigan oʻyinchi ham sarfni qoplaydi.

**Yolgʻiz ov (1–3 daraja):** alfaning oʻzi bir bosishda ovlaydi — oʻlja = shu darajaning asosiy oʻljasi (0.5 / 1 / 2 kg), 2 daqiqa kutish. 4-darajadan keyin yolgʻiz ov yopiladi, ov faqat toʻda bilan.

**Oʻlja zinapoyasi:** kemiruvchi 0.5 → qush 1 → quyon 2 → sugʻur 8 → jayron 25 → yovvoyi choʻchqa 50 → kiyik 60 → bugʻu 100 → arxar 120 → yovvoyi ot 250 → los 300 → bizon 500 → mamont bolasi 800 → mamont 1,200 → ruh oʻljasi 400

**Oʻljaning minimal toʻdasi** = yuqoriga yaxlitlangan(oʻlja vazni ÷ 20), kamida 1 boʻri: sugʻur 1 · jayron 2 · kiyik 3 · yovvoyi ot 13 · mamont bolasi 40 · ruh oʻljasi 20. Ovchilar yetmasa, ovga hujumchi yoki boshqa askar qoʻshib yuboriladi — ular shu vaqt inni himoya qilmaydi (asosiy trade-off).

5-darajadan boshlab asosiy oʻlja jayron (25 kg) — bir boʻri uni ovlay olmaydi. **Toʻda ixtiyoriy emas, majburiy.**

### 🗺 Ov xaritasi

Ov tabida har oʻyinchiga **9 ta ov kartasi** (3 × 3) koʻrsatiladi. Kartalar **har 4 soatda** yangilanadi va **har bir oʻyinchida har xil** — urugʻ = oʻyinchi ID + davr raqami, generator server va klientda bir xil (deterministik), shuning uchun kartani “qayta aylantirib” boʻlmaydi. Har karta davr ichida **bir marta** ovlanadi; bir vaqtda bir nechta kartaga (askar yetsa) borish mumkin.

Kartalar **yuqori chapdan pastki oʻngga** — eng qisqa va eng kam oʻljadan eng uzoq va eng koʻp oʻljaga qarab tartiblangan:

| Kartalar | Masofa | Ov vaqti | Oʻlja | Masofa bonusi | Yarador / halok (har bir boʻri) |
|---|---|---|---|---|---|
| 1–3 · **yaqin** | 2–7 km | 16–31 daq | daraja − 1 oʻljasi | — | xavfsiz |
| 4–6 · **oʻrta** | 7–15 km | 31–55 daq | daraja oʻljasi | +20% | 8% / 1% |
| 7–9 · **uzoq** | 15–25 km | 55–85 daq | daraja + 1 oʻljasi | +50% | 15% / 4% |

```
Ov vaqti        = 10 daqiqa + 2 × masofa ÷ 40 km/soat        (eng uzoq ov ~85 daqiqa — oʻyinchi zerikmasligi uchun)
Poda (kg)       = oʻlja vazni × soni;  soni = yaxlitlangan(tavsiya ovchilar × ovchi unumi × vaqt × (1 + bonus) × (0.7 … 1.6) ÷ oʻlja vazni), kamida 1
                  keyingi kartadagi poda oldingisidan kichik boʻlmaydi
Tavsiya ovchilar = MAX(1, yaxlitlangan(qoʻshin sigʻimi × 15%))
Bir ov (kg)     = MIN(poda, Σ ovchi unumi × vaqt × (1 + bonus)),  kichik toʻda boʻlsa × 0.30
XP              = olingan goʻsht × 0.5
```

**Xavf.** Oʻrta va uzoq kartalarda har bir yuborilgan boʻri (ovchi ham, yordamchi ham) alohida tasodif bilan **yarador** yoki **halok** boʻlishi mumkin. Natija ovga chiqishda server tomonida aniqlanadi va qaytishda maʼlum boʻladi (kartada faqat ehtimollar koʻrinadi).
- **Yarador** boʻri qaytgach `injured` ga oʻtadi va **3 soatda** oʻzi tuzaladi (Shifo gʻori orqali davolash — keyingi bosqichda); bu vaqt ovga va jangga chiqmaydi, lekin ovqat yeydi.
- **Halok** boʻlgan boʻri tieri bilan butunlay ketadi (qoʻshin kamayadi).
- Yaqin kartalar doim xavfsiz — ehtiyotkor oʻyinchi kam, lekin kafolatlangan oʻlja oladi.

**Misol (10-daraja, 5 ovchi T1, 7.5 kg/soat):** yaqin karta ~24 daq → ~15 kg · oʻrta ~43 daq → ~32 kg · uzoq ~70 daq → ~66 kg (podadan oshmaydi). Uzoq ovda kutilgan yoʻqotish ≈ 0.75 yarador + 0.2 halok boʻri.

Parametrlar: `Sozlamalar` → “Ov xaritasi” (`hunt_board_refresh_h`, `hunt_base_min`, `hunt_speed_kmh`, `hunt_km_*`, `hunt_*_bonus`, `hunt_*_injury`, `hunt_*_death`, `hunt_herd_*`).

### Ochlik mexanikasi
Ochlik — goʻsht zaxirasi 0 ga tushgan holat (bo'lim 16 da batafsil):
- Jangovar quvvat −30%, ishlab chiqarish −50%
- Birinchi 7 kun hech kim ketmaydi, keyin kuniga 1% (maks 50%)
- Goʻsht qoʻshilishi bilan jazolar darhol oʻchadi

---

## 5. Binolar (9 ta — 8 tasi qurilib oʻstiriladi, 1 tasi avtomatik)

**Qoida:** hech bir bino oʻyinchi darajasidan oshmaydi.

```
Narx(L) = bazaviy × 1.30^(L-2) × bosqich koeffitsienti
Vaqt(L) = 10 daqiqa × bino koeffitsienti × 1.25^(L-2) × bosqich koeffitsienti
```

- **1-daraja** bino ochilganda (bo'lim 2) bepul va darhol paydo boʻladi; narx va navbat 2-darajadan boshlanadi.
- **Qurilish resurslari** (tosh, shox-shabba, teri, suyak) uchun ombor cheklanmagan — har qanday daraja narxini yigʻish mumkin. Cheklov Ustaxona **buferida** (pastga qarang).
- **Goʻsht binolar narxiga kirmaydi** — goʻsht faqat oziq va askar yollash uchun (Oziq gʻori sigʻimi shunga moslangan).

**Bazaviy narx (1→2 daraja, bosqich koeffitsientisiz):**

| Bino | Tosh | Shox-shabba | Teri | Suyak | Jami |
|---|---|---|---|---|---|
| Oziq gʻori | 100 | 60 | — | — | 160 |
| Ustaxona qoyasi | 150 | 100 | — | 40 | 290 |
| Rol binosi (bazaviy maydon) | 180 | — | 150 | 90 | 420 |
| ↳ Razvedka ×0.50 · Jang ×0.70 · Himoya ×0.60 · Ov ×0.45 | | | | | 210 · 294 · 252 · 189 |
| Shifo gʻori | 80 | 120 | 100 | — | 300 |
| Bozor | 130 | 110 | — | — | 240 |

| # | Bino | Vazifasi | Vaqt koeff. | L25 resurs | L25 vaqt | Jami 1→25 resurs | Jami 1→25 vaqt |
|---|---|---|---|---|---|---|---|
| 1 | 🥩 Oziq gʻori | Goʻsht, suv, oʻt saqlash | 1.00 | 83,507 | 35.3 soat | 354,357 | 170.6 soat |
| 2 | 🪨 Ustaxona qoyasi | 4 qurilish resursi | 1.20 | 151,358 | 42.4 soat | 642,273 | 204.6 soat |
| 3 | 🔍 Razvedka qoyasi | Razvedkachi tieri | 0.80 | 109,604 | 28.2 soat | 465,090 | 136.6 soat |
| 4 | ⚔️ Jang maydoni | Hujumchi tieri | 1.30 | 153,445 | 45.9 soat | 651,129 | 221.7 soat |
| 5 | 🛡 Himoya devori | Himoyachi tieri | 1.10 | 131,525 | 38.8 soat | 558,112 | 187.6 soat |
| 6 | 🥩 Ov soʻqmogʻi | Ovchi tieri | 0.70 | 98,644 | 24.7 soat | 418,584 | 119.4 soat |
| 7 | 🏥 Shifo gʻori | Jarohatlangan boʻrilarni davolash | 0.90 | 156,577 | 31.8 soat | 664,418 | 153.5 soat |
| 8 | 🛒 Bozor | Resurs almashtirish | 1.00 | 125,262 | 35.3 soat | 531,532 | 170.6 soat |

**Amaliy taʼsir:** barcha 8 bino jami navbat vaqti (1→25, ketma-ket) = 1,364.6 soat ≈ **56.9 kun** sof navbat vaqti (10-darajadan ikkinchi navbat bilan ~35 kun). Resurs jamgʻarish vaqti bunga kirmaydi.

### 🏠 In (9-bino — avtomatik, narxsiz)

In — oʻyinchining asosiy makoni. U navbat orqali qurilmaydi va narxi yoʻq (tanishtiruvning 3-qadamida qoʻyiladi).

```
In darajasi = oʻyinchi darajasi (avtomatik — daraja koʻtarilganda darhol oshadi, alohida narx yoki qurilish navbati YOʻQ)
```

**Nega narxsiz/avtomatik:** In — boshqa 8 bino kabi mustaqil investitsiya emas, balki oʻyinchining oʻzi bilan birga oʻsadigan "asosiy makon". Shu sababli uning bonusi **faqat vaqtga** taʼsir qiladi, statga emas — aks holda bepul quvvat berib, balans falsafasi (bo'lim 24, qoida 5: "mukofot vaqt tejaydi, kuch bermaydi") buziladi.

```
In tezlanish koeffitsienti(L) = 1 + 0.01 × (L−1)
```

25-darajada: ×1.24 (24% tezroq). Bu koeffitsient bo'lim 6 dagi **Mashq tezligi** formulasiga (rol binosining oʻz tezligiga) qoʻshimcha koʻpaytiruvchi sifatida qoʻllanadi:

```
Yakuniy mashq tezligi = Rol binosi mashq tezligi(L) × In tezlanish koeffitsienti(oʻyinchi darajasi)
```

**Misol (25-daraja):** rol binosi tezligi 1+0.04×24=1.96 · In bonusi ×1.24 → jami ×2.43 tezroq mashq — lekin bu faqat vaqtni qisqartiradi, yangi askar yoki tier bepul berilmaydi.

### Oziq gʻori
```
Sigʻim(L)      = 40 × 1.22^(L-1)   — goʻsht (kg), suv, oʻt va oy nuri uchun alohida-alohida
Passiv suv(L)  = 0.25 × 1.25^(L-1) birlik/soat
Oy nuri        = 0.006 × qoʻshin / soat (faqat 20+ daraja)
Himoya(L)      = 30% + 2%×(L-1)
```
25-darajada: 4,728 sigʻim, 53 suv/soat, 78% himoya.
Sigʻimdan ortiq kelgan goʻsht saqlanmaydi (chiriydi) — shuning uchun gʻorni oʻyinchi darajasi bilan birga koʻtarish kerak.

### Ustaxona qoyasi
```
Ishlab chiqarish(L) = 20 × 1.22^(L-1) birlik/soat
Bufer(L)            = soatlik ishlab chiqarish × 10   (onlayn; oflaynda bo'lim 16 koeffitsienti)
```
25-darajada: 2,364/soat = **56,736/kun**, bufer 23,640.

Ishlab chiqarish avval Ustaxona **buferiga** tushadi; oʻyinchi “Yigʻib olish” tugmasi bilan uni omborga oʻtkazadi (yoki “Avtomatik yigʻish” xaridi bilan har kirishda oʻzi oʻtadi). Bufer toʻlsa, ishlab chiqarish toʻxtaydi — bu kirish uchun sabab. Ombor (qurilish resurslari) cheklanmagan.

Oʻyinchi soatlik ishlab chiqarishni 4 resurs orasida oʻzi taqsimlaydi (standart: tosh 40% · shox-shabba 30% · teri 15% · suyak 15%).

### Rol binolari (Razvedka, Jang, Himoya, Ov)
```
Ochadigan tier   = MAX(1, MIN(6, butun(bino darajasi / 4)))
Askar sigʻimi(L) = 6 × 1.20^(L-1)
Mashq tezligi(L) = 1 + 0.04 × (L-1)
```
Narx koeffitsientlari: Razvedka 0.50 · Jang 0.70 · Himoya 0.60 · Ov 0.45

### Shifo gʻori
```
Sigʻim(L)         = yaxlitlangan(2 + 0.4 × (L-1)) boʻri bir vaqtda
Davolash vaqti(L) = 60 daqiqa / (1 + 0.05×(L-1)) — bir boʻri uchun
Davolash narxi    = 2 × tier shifobaxsh oʻt — bir boʻri uchun
```
25-darajada: 12 boʻri, 27 daqiqa. Shifo gʻori boʻlmasa (1–5 daraja) jarohatlangan boʻri 3 soatda oʻzi tuzaladi (bepul, sekin).

### Bozor
```
Almashinuv kursi(L) = 3.0 − 0.075×(L-1)     (oy nuri uchun ×2)
Kunlik limit(L)     = 200 × 1.20^(L-1)
Soliq(L)            = 20% − 0.6%×(L-1)
```
25-darajada: 1.20:1 kurs, 15,899 limit, 5.6% soliq

---

## 6. Askarlar: 4 rol × 6 tier

### Rollar

| Rol | Vazifasi | Kuch | Tezlik | Chidam | Ish unumi | Mashq binosi |
|---|---|---|---|---|---|---|
| 🔍 Razvedkachi | Raqibni koʻrish, tuzoq topish | 8 | 22 | 30 | 0 | Razvedka qoyasi |
| ⚔️ Hujumchi | Reyd va toʻda janglari | 20 | 12 | 45 | 0 | Jang maydoni |
| 🛡 Himoyachi | In va omborni qoʻriqlash | 12 | 8 | 90 | 0 | Himoya devori |
| 🥩 Ovchi | Ov (goʻsht va oʻt) | 10 | 14 | 40 | 5 × kunlik ehtiyoj kg/soat (bo'lim 4) | Ov soʻqmogʻi |

Ovchi 3-darajadan (Ov soʻqmogʻi bilan), qolgan 3 rol 4-darajadan ochiladi. Alfa — oʻyinchining oʻz boʻrisi — qoʻshinga kirmaydi va jangda qatnashmaydi; 1–3 darajada u yolgʻiz ovlaydi.

### Tierlar

```
Tier CP = (Kuch×2 + Tezlik×1.5 + Chidam×0.5) × 1.45^(tier-1) × (1 + 0.03 × alfa darajasi)
Maks tier = MAX(1, MIN(6, butun(alfa darajasi ÷ 4), butun(shu rol binosi ÷ 4)))
Yangi askar narxi ≈ 20 kg goʻsht + 8 suyak, har tierda ×2.10 (= 1.45²)
Yangi askar vaqti = 4 daqiqa × 1.45^(tier−1)
```

1-tier har doim ochiq (rol binosi qurilgan zahoti); 2-tier 8-darajada, 3-tier 12-da, 4-tier 16-da, 5-tier 20-da, 6-tier 24-darajada ochiladi (bino ham shu darajada boʻlishi kerak).

| Tier | Nomi | CP (alfa 19) | Kuch nisbati | Yangi askar: goʻsht | suyak | vaqt |
|---|---|---|---|---|---|---|
| 1 | **Yosh** | 126 | 1.00 | 20 | 8 | 4.0 daq |
| 2 | **Tajribali** | 183 | 1.45 | 42 | 17 | 5.8 daq |
| 3 | **Urushchi** | 266 | 2.11 | 89 | 35 | 8.4 daq |
| 4 | **Veteran** | 385 | 3.06 | 187 | 75 | 12.2 daq |
| 5 | **Elita** | 559 | 4.44 | 393 | 157 | 17.8 daq |
| 6 | **Afsonaviy** | 810 | 6.43 | 824 | 330 | 25.7 daq |

### Tierga almashtirish

```
Kerakli past tier askar = (yuqori tier CP ÷ past tier CP) × (1 + 10% yoʻqotish) = 1.60
Narx = yangi askar narxining 60%
Vaqt = yangi askar vaqtining 50%
```

**Misol:** 300 ta 1-tier askar → **188 ta 2-tier** (200 emas). Kuch 37,800 dan 34,404 ga tushadi.

**Nega baribir foydali:** 188 askar 300 tasidan kam goʻsht yeydi va bino sigʻimida kam joy oladi. Foyda kuchda emas — samaradorlikda.

### Qarshi-kuch uchburchagi

```
🛡 Himoyachi → ⚔️ Hujumchi → 🔍 Razvedkachi → 🛡 Himoyachi
```
Strelka “ustun keladi” degani: himoyachi hujumchiga, hujumchi razvedkachiga, razvedkachi himoyachiga qarshi ×1.30; teskari yoʻnalishda ×0.77; ovchi va bir xil rol ×1.00. Aralash qoʻshinlarda qanday qoʻllanishi — bo'lim 7, “Jang hisobi”.

### Tavsiya etilgan taqsimot

| Daraja | Qoʻshin | 🔍 | ⚔️ | 🛡 | 🥩 | Maks tier | Kerakli rol binosi | Toʻda CP |
|---|---|---|---|---|---|---|---|---|
| 4 | 10 | 2 | 4 | 2 | 2 | 1 | 4 | 822 |
| 10 | 30 | 6 | 13 | 6 | 5 | 2 | 8 | 4,188 |
| 15 | 74 | 15 | 33 | 15 | 11 | 3 | 12 | 16,775 |
| 20 | 185 | 37 | 83 | 37 | 28 | 5 | 20 | 97,283 |
| 25 | 460 | 92 | 207 | 92 | 69 | 6 | 24 | 383,763 |

Ulushlar: razvedkachi 20% · hujumchi qoldiq · himoyachi 20% · ovchi 15% (eng kamida 1 ta)

### Tier piramidasi

```
Tier k dagi askarlar = rol slotlari × (T − k + 1) ÷ (T × (T+1) ÷ 2)
```
T = maksimal tier. T=6 da ulushlar: 29% · 24% · 19% · 14% · 10% · 5%
1-tier qoldiqni oladi — jami har doim qoʻshin soniga teng.

### Qoʻshin toʻlganligi

```
Vaqt koeffitsienti = MAX(0.50, (toʻlganlik ÷ 60%)^1.8)        — 100% da 2.51×
Bino jazosi = MAX(1, (shu rol askarlari ÷ bino sigʻimi)^2)
Yakuniy vaqt = tier vaqti × MIN(5, bino jazosi × toʻlganlik koeff.) ÷ (mashq tezligi × In koeff.)
```

| Toʻlganlik | Koeff. | Holat |
|---|---|---|
| 5–30% | 0.50× | Tez tiklanish — chegirma |
| 45% | 0.60× | Chegirma |
| **60%** | **1.00×** | Normal |
| 75% | 1.49× | Sekinlashdi |
| 90% | 2.07× | Juda sekin |
| 100% | 2.51× | Qoʻshin toʻla — yangi askar qoʻshib boʻlmaydi (`CAPACITY_FULL`) |

**Jangdan keyin tiklanish (70% yoʻqotish):** 25-daraja 322 askarni 1-tierda 10.7 soatda tiklaydi.

**Muhim qoidalar:**
- Jangovar quvvat qoʻshin **sigʻimidan emas, mavjud askarlardan** hisoblanadi
- Oʻlgan askar tieri bilan ketadi — 6-tierni tiklash 1-tierdan boshlash demak
- Davolanayotgan askar toʻlganlikka kirmaydi

---

## 7. PvP jang mexanikasi

### Raqib roʻyxati

Server **9 ta** raqib taklif qiladi: −1, teng, +1 daraja. 30 daqiqada yoki 3 hujumdan keyin yangilanadi.

**Yovvoyi toʻdalar (botlar):** 4–6 darajada roʻyxat faqat botlardan iborat (oʻyinchi oʻzi ham, raqiblar ham qalqon ostida). 7+ darajada oynada mos raqib yetmasa, boʻsh joylar botlar bilan toʻldiriladi.

```
Bot EP     = oʻyinchining hozirgi EP si × band (kuchsiz 0.70 · teng 1.00 · kuchli 1.30) × tasodif(0.90–1.10)
Bot zaxira = shu darajaning 3 kunlik goʻsht zaxirasi (Oziqlanish jadvali)
```
Botga hujum oʻlja, XP va kundalik vazifa hissasini beradi; mavsum reytingiga kirmaydi; bot qasos olmaydi.

| Maʼlumot | Razvedkasiz | Razvedka bilan |
|---|---|---|
| Nomi va darajasi | ✅ | ✅ |
| Masofa | ✅ | ✅ |
| Kuch | Faqat band (Kuchsiz/Teng/Kuchli) | Aniq CP |
| Askar soni | ❌ | Rol va tier boʻyicha |
| Resurs miqdori | ❌ | Taxminiy yoki aniq |
| Oziq gʻori darajasi | ❌ | ✅ |
| Qalqon, faollik | ✅ | ✅ |

### Hujum oynasi

| Daraja | Hujum qila oladi | Tanlov |
|---|---|---|
| 1–3 | — | Jang yoʻq |
| 4–6 | Faqat botlar | 🛡 Oʻzi qalqon ostida |
| 7 | 7–8 | 2 |
| 8–24 | ±1 | 3 |
| 25 | 24–25 | 2 |

**Dinamik kengayish:** mos raqib topilmasa — 30 daqiqadan keyin ±2, 60 daqiqadan keyin ±3. Kengayish faqat shu oʻyinchi uchun; qalqonni hech qachon buzmaydi.

| Daraja farqi | Oʻlja koeff. |
|---|---|
| −3 | 0.30 |
| −2 | 0.50 |
| −1 | 0.70 |
| teng | 1.00 |
| +1 | 1.30 |
| +2 | 1.50 |
| +3 | 1.70 |

### Masofa

```
Qoʻshin: 20 km/soat · Razvedka: 60 km/soat
```

| Masofa | Qoʻshin | Razvedka | Borib-qaytish | Xavf |
|---|---|---|---|---|
| 5 km | 15 daq | 5 daq | 30 daq | Past |
| 15 km | 45 daq | 15 daq | 90 daq | Past |
| 30 km | 90 daq | 30 daq | 180 daq | Oʻrta |
| 60 km | 180 daq | 60 daq | 360 daq | Oʻrta |
| 100 km | 300 daq | 100 daq | 600 daq | Yuqori |

### Jang hisobi

```
Har bir rol guruhi uchun:  EP_rol = Σ (askar soni × tier CP)        (alfa bonusi tier CP ichida)
Tomon EP si:               EP     = Σ EP_rol

Qarshi-kuch (aralash qoʻshin) — raqib tarkibi ulushlari boʻyicha vaznlangan:
  k_hujumchi  = Σ_i Σ_j (EP_i ÷ EP_hujum) × (EP_j ÷ EP_himoya) × M[i][j]
  k_himoyachi = Σ_j Σ_i (EP_j ÷ EP_himoya) × (EP_i ÷ EP_hujum) × M[j][i]
  M — bo'lim 6 dagi 4×4 jadval (1.30 / 0.77 / 1.00)

Holat koeffitsientlari (koʻpaytiriladi):
  ochlik ×0.70 · oy nuri yetishmasligi ×0.85 · Himoya devori (faqat himoyachi) ×(1 + 0.01 × devor darajasi)

EP_samarali = EP × k × holat koeffitsientlari
R = EP_samarali(hujumchi) ÷ EP_samarali(himoyachi)

Hujumchi yoʻqotishi  = MIN(90%, 40% ÷ R × tuzoq) × tasodif(0.90–1.10)
Himoyachi yoʻqotishi = MIN(90%, 40% × R) × tasodif(0.90–1.10)
Oʻlim     = yoʻqotish × oʻlim ulushi (hujumchi 40%, himoyachi 25%)
Kasalxona = yoʻqotish − oʻlim
Tuzoq     = 1.20 — hujumda razvedkachi yoʻq va amal qiluvchi razvedka hisoboti yoʻq boʻlsa, 15% ehtimol bilan; aks holda 1.00
```

Himoyada inda turgan barcha sogʻlom askarlar qatnashadi (yurishdagi va jarohatlanganlar emas). Yoʻqotish har rol va tier boʻyicha proporsional taqsimlanadi.

**Natija chegaralari:** R ≥ 1.50 — toʻliq gʻalaba · 1.10 ≤ R < 1.50 — qisman gʻalaba · 0.90 < R < 1.10 — durang (oʻlja yoʻq) · R ≤ 0.90 — magʻlubiyat.

| R | Natija | Hujumchi yoʻq. | Himoyachi yoʻq. | Hujumchi oʻlim/kasal | Himoyachi oʻlim/kasal |
|---|---|---|---|---|---|
| 0.50 | Magʻlubiyat | 80% | 20% | 32% / 48% | 5% / 15% |
| 0.75 | Magʻlubiyat | 53% | 30% | 21% / 32% | 8% / 23% |
| 1.00 | Durang | 40% | 40% | 16% / 24% | 10% / 30% |
| 1.25 | Qisman gʻalaba | 32% | 50% | 13% / 19% | 13% / 38% |
| 1.50 | Toʻliq gʻalaba | 27% | 60% | 11% / 16% | 15% / 45% |
| 2.00 | Toʻliq gʻalaba | 20% | 80% | 8% / 12% | 20% / 60% |
| 3.00 | Toʻliq gʻalaba | 13% | 90% | 5% / 8% | 23% / 68% |

### Jang tartibi (raundlar — natijani koʻrsatish uchun)

Natija yuqoridagi formula bilan **bir marta** hisoblanadi; raundlar shu yoʻqotishlarni jurnal (`battles.log`) boʻylab taqsimlab koʻrsatadi.

| Raund | Nima boʻladi |
|---|---|
| 0 — yaqinlashuv | Tuzoq tekshiruvi (yuqoridagi `Tuzoq` koeffitsienti) |
| 1 — toʻqnashuv | Qarshi-kuch koeffitsientlari koʻrsatiladi; yoʻqotishning 20% i |
| 2–3 — asosiy jang | Yoʻqotishning 60% i (har raundda 30%) |
| 4 — hal qiluvchi | Qolgan 20%. Yoʻqotishi 80% dan oshgan tomon shu raundda chekinadi — jang 4 raundda tugaydi |
| 5 — yakun | Gʻolib aniqlanadi, oʻlja olinadi |

R ≥ 5 yoki R ≤ 0.2 boʻlsa (bir tomonlama jang) jurnal 2 raundda tugaydi — adolat nazoratida “minimal raund 3” sharti shuni ushlaydi (bo'lim 13).
Qaytish masofa boʻyicha; yoʻlda hujum qilib boʻlmaydi. Ikkala tomon toʻliq jurnalni koʻradi.

### Qoʻshimcha qoidalar
- Bir raqibga 24 soat ichida koʻpi bilan 3 hujum
- Razvedka bepul, 10 daqiqa kutish; muvaffaqiyatsiz boʻlsa 10% razvedkachi jarohatlanadi
- Yuborilgan askarlar inda yoʻq — shu vaqtda siz himoyasizsiz
- Yurish paytida qaytarib chaqirish mumkin
- Reydda askarlarining 30%+ ini yoʻqotgan himoyachiga 8 soat qalqon (bo'lim 8); oʻzi hujum qilsa oʻchadi
- Mavsum hissasi faqat server tayinlagan janglardan

---

## 8. Oʻlja

```
Oʻlja = Ombordagi goʻsht × (1 − Himoya%) × 0.22 × gʻalaba koeff. × daraja koeff. × takror koeff. × oflayn koeff.
        lekin yuk sigʻimidan oshmaydi
Oflayn koeff. = 0.5, agar himoyachi 24 soatdan koʻp oflayn boʻlsa; aks holda 1.0
Yuk sigʻimi = hujumchilar soni × 15 kg × (1 + 0.2 × tier)
```

Zaxira — 3 kunlik goʻsht zaxirasi, Himoya — shu zaxirani sigʻdiradigan Oziq gʻori darajasidagi himoya (Excel `PvP oʻlja` varagʻi).

| Daraja | Zaxira | Himoya | Himoyalanmagan | Yuk sigʻimi | Maks oʻlja | Kunlik ehtiyoj | Kunlik ov (4 ov) | Oʻlja / ov |
|---|---|---|---|---|---|---|---|---|
| 5 | 36 | 30% | 25 | 108 | 6 | 12 | 40 | 15% ✅ |
| 10 | 135 | 44% | 76 | 273 | 17 | 45 | 150 | 11% ✅ |
| 15 | 444 | 56% | 195 | 792 | 43 | 148 | 440 | 10% ✅ |
| 25 | 4,140 | 78% | 911 | 6,831 | 200 | 1,380 | 4,140 | 5% ✅ |

**Asosiy qoida:** bitta reyd oʻljasi kunlik ehtiyojning (demak kunlik ovning ham) 50% idan oshmasligi kerak — aks holda oʻyinchilar ov qilishni tashlab, faqat bir-birini talaydi.

### Takror hujum koeffitsienti
1-hujum 1.00 → 2-hujum 0.50 → 3-hujum 0.25 (bir raqibga 24 soat ichida; 4-hujum juftlik chegarasi bilan taqiqlangan)

### Gʻalaba koeffitsienti
Toʻliq gʻalaba 1.00 · Qisman 0.55 · Magʻlubiyat 0.00 · Qasos hujumi (24 soat) 1.20

### Olinmaydigan narsalar
Oy toshi · XP · binolar · qurilish resurslari · boʻrilar (jangda oʻladi yoki jarohatlanadi, lekin oʻljaga aylanmaydi). Faqat goʻsht olinadi.

### Qalqon tizimi
| Holat | Qalqon |
|---|---|
| Yangi oʻyinchi (1–6 daraja) | Toʻliq (botlarga hujum uni oʻchirmaydi) |
| Reydda 30%+ yoʻqotgan | 8 soat |
| Ketma-ket 2 marta yutqazgan | 16 soat |
| 72 soat oflayn | Uyqu qalqoni |
| Oʻzi oʻyinchiga hujum qilsa | 8/16 soatlik va uyqu qalqoni darhol oʻchadi |

---

## 9. Razvedka

```
Razvedka kuchi = Σ(razvedkachilar soni × 1.45^(tier−1)) × (1 + 0.03 × alfa darajasi)
Nisbat = yuborilgan razvedkachilar kuchi ÷ raqib inida turgan razvedkachilar kuchi
```
Raqibda razvedkachi yoʻq boʻlsa (yoki bot boʻlsa) — natija har doim “Aniq”.

| Nisbat | Natija | Nima koʻrinadi | Raqib biladimi |
|---|---|---|---|
| ≤ 1.00 | ❌ Muvaffaqiyatsiz | Hech narsa; 10% razvedkachi jarohatlanadi | Ha |
| 1.00–1.50 | ◐ Qisman | Faqat umumiy toʻda hajmi | Yoʻq |
| 1.50–2.50 | ✔ Toʻliq | Rollar boʻyicha askar soni + oʻlja (±20%) | Yoʻq |
| > 2.50 | ★ Aniq | Aniq raqamlar, Oziq gʻori darajasi, himoya %, qalqon | Yoʻq |

- Oyna hujum bilan bir xil: −1, teng, +1
- Kutish vaqti 10 daqiqa, maʼlumot 30 daqiqa amal qiladi
- **Himoyachi faqat muvaffaqiyatsiz razvedkani koʻradi** — muvaffaqiyatli razvedka jim oʻtadi
- Standart taqsimotda teng darajadagi nisbat aynan 1.00 — koʻrish uchun razvedkachilarni tavsiyadan oshirish kerak
- Nisbat 0.95–1.05 oraligʻida natija tasodifiy: 50% “Muvaffaqiyatsiz”, 50% “Qisman”

---

## 10. Lager va oazis

### 🏕 Lager

```
Soatlik yigʻim (xom) = yuborilgan boʻrilar × Ustaxona soatlik ishlab chiqarishi × 0.10 × (1 + 0.05 × tier)
Lager ulushi (xom)   = (8 soatlik yigʻim) ÷ (Ustaxona kunlik ishlab chiqarishi)
Lager ulushi         = MIN(0.60, Lager ulushi (xom))
Soatlik yigʻim       = Lager ulushi × Ustaxona kunlik ishlab chiqarishi ÷ 8
```

Formula Ustaxonani ham suratda, ham maxrajda saqlagani uchun xom ulush faqat qoʻshin hajmi bilan (×1.20/daraja) oʻsadi va 25-darajada 997% ga chiqardi. **60% tavan** Lagerni Ustaxonadan foydaliroq boʻlib ketishidan saqlaydi va faqat Lager tizimining ichida ishlaydi.

| Daraja | Yuboriladi (maks 50%) | 8 soatlik yigʻim | Ustaxona kunlik | Ulush (xom) | Ulush (tavan bilan) |
|---|---|---|---|---|---|
| 4 | 5 | 152 | 872 | 17% | 17% |
| 8 | 11 | 776 | 1,931 | 40% | 40% |
| 15 | 37 | 11,016 | 7,767 | 142% | **60%** (4,660) |
| 19 | 77 | 53,000 | 17,208 | 308% | **60%** (10,325) |
| 25 | 230 | 565,496 | 56,738 | 997% | **60%** (34,043) |

11-darajadan yuqorida tavan ishga tushadi (xom ulush 60% dan oshgach) — bu yerdan boshlab kemp yigʻimi mutlaq songa koʻra oʻsishda davom etadi (Ustaxona kunlik ishlab chiqarishi oʻsgani sari), lekin nisbat 60% da barqaror qoladi.

**Qoidalar:** 4-darajada ochiladi · toʻdaning maks 50% i · 8 soat · **0% himoyalangan** · hujum oynasi PvP bilan bir xil · razvedka qilish oson (nisbat 0.8 yetarli) · erta chaqirish mumkin (qaytish 30 daqiqa)

### 🌴 Oazis

| Oazis | Bonus | Serverda | Egallash talabi |
|---|---|---|---|
| 💧 Suv oazisi | Suv +12% | 8 | 6+ daraja, 3 hujumchi |
| 🌿 Oʻt oazisi | Davolash +20% | 5 | 8+ daraja, 5 hujumchi |
| 🪨 Tosh koni | Tosh +15% | 4 | 12+ daraja, 8 hujumchi |
| 🦴 Suyak dalasi | Suyak +15% | 2 | 16+ daraja, toʻda urushi |
| 🌕 Oy mehrobi | Oy nuri ishlab chiqarishi +40% (ehtiyojning 72% → 100%) | 1 | 20+ daraja, butun toʻda |

**Qoidalar:** oazis toʻdaga tegishli (bitta oʻyinchiga emas) · egallangach 24 soat daxlsiz · faqat jang bilan tortib olinadi · bir toʻda maks 3 ta ushlaydi · yoʻqotsa bonus darhol toʻxtaydi

**Maqsad:** PvP sababi oʻlja emas, **nuqta** boʻlsin.

---

## 11. Klan (toʻda) va toʻda jangi

### Klan darajasi

```
Kerakli klan XP = 5,000 × 1.32^(daraja-1)
```

| Daraja | Maks aʼzo | Klan bonusi | Ochiladigan imkoniyat |
|---|---|---|---|
| 1 | 15 | 0% | Klan yaratildi |
| 5 | 25 | 3% | Klan xazinasi |
| 10 | 35 | 6% | Hudud egallash |
| 15 | 45 | 9% | Ikki frontli urush |
| 20 | 55 | 12% | Ittifoq tuzish |
| 25 | 70 | 15% | Server bayrogʻi |

Klan XP = aʼzolarning jang hissalari yigʻindisi. Bonus barcha aʼzolarning ishlab chiqarishiga qoʻshiladi.

### Raqib tanlash
- Server klan kuchiga mos **6 ta** klanni koʻrsatadi
- Faqat **±20%** kuchdagi klanlar roʻyxatga tushadi
- Maqsadni alfa yoki beta tanlaydi
- Eʼlon qilgan klan xazinasining **5%** ini garovga qoʻyadi
- Raqibga 30 daqiqa beriladi; rad etsa yoki javob bermasa klan reytingidan 50 ball yoʻqotadi, garov eʼlon qilganga qaytariladi
- Bir juftlik **7 kun** ichida qayta urusholmaydi
- Bitta klan bir vaqtda 1 ta urushda (15-darajadan 2 ta)

### 12 soatlik urush tartibi

| Bosqich | Vaqt | Nima boʻladi |
|---|---|---|
| Tayyorgarlik | 0:00–1:00 | Askar yuborish ochiq, jang boshlanmagan |
| 1-toʻlqin | 1:00–5:00 | Toʻqnashuv, har soat natija |
| Oraliq | 5:00–6:00 | Yangi askar, jarohatlanganlar davolanadi |
| 2-toʻlqin | 6:00–11:00 | Asosiy jang, ball farqi shu yerda hal boʻladi |
| Yakun | 11:00–12:00 | Yangi askar qabul qilinmaydi |
| Natija | 12:00 | Gʻolib, mukofot, yoʻqotishlar |

### Yoʻqotishlar

| Tomon | Yoʻqotish | Oʻladi | Kasalxona | Qaytadi |
|---|---|---|---|---|
| **Gʻolib** | 20% | 6% | 14% | 80% |
| **Magʻlub** | 40% | 18% | 22% | 60% |

Gʻalaba ham bepul emas — bu ataylab yutishni ham qimmat qiladi.

### Kelishuvga qarshi himoya

| Qoida | Tafsilot |
|---|---|
| Minimal ishtirok | Klan kuchining ≥25% i yuborilishi shart |
| Aʼzo ishtiroki | Aʼzolarning ≥40% i qatnashishi shart |
| Gʻolib ham yoʻqotadi | 20% — ataylab yutish qimmat |
| Garov yonadi | Minimal ishtirok bajarilmasa qaytmaydi |
| Kuch oynasi | ±20% dan tashqari klan roʻyxatga chiqmaydi |
| Takror juftlik | 7 kunda 1 marta |
| Mavsum tekshiruvi | Graf tahlili — yopiq halqa aniqlansa ikkala klan chiqariladi |
| Hissa oʻlchovi | Ball askar soniga emas, **yetkazilgan zararga** qarab |

### Aʼzo mukofoti

```
Hissa balli = yuborilgan askarlarning EP si × yetkazilgan zarar ulushi
Mukofot     = (shaxsiy ball ÷ klan jami balli) × urush fondi, lekin fondning 15% idan oshmaydi
Shiftdan ortib qolgan qism → klan xazinasiga
```

Misol (fond 50,000 tanga; barcha aʼzolarning zarar ulushi bir xil, shuning uchun ball EP ga proporsional; jami 98,200):

| Aʼzo | Askar | Hissa balli | Ulush | Mukofot |
|---|---|---|---|---|
| Alfa | 120 | 42,000 | 42.8% → 15% (shift) | 7,500 |
| Beta | 90 | 28,000 | 28.5% → 15% (shift) | 7,500 |
| Aʼzo A | 60 | 15,000 | 15.3% → 15% (shift) | 7,500 |
| Aʼzo B | 40 | 8,000 | 8.1% | 4,073 |
| Aʼzo C | 25 | 4,000 | 4.1% | 2,037 |
| Aʼzo D | 10 | 1,200 | 1.2% | 611 |
| **Klan xazinasiga** | | | | **20,779** |

- Magʻlub klan aʼzolari gʻolib mukofotining **25%** ini oladi
- Askar **yubormagan** aʼzo hech narsa olmaydi — hatto klan yutsa ham

---

## 12. Mavsum va mukofot

### Fond kalkulyatori

```
Kunlik daromad = DAU × ARPU
Kunlik fond = daromad × 15%
Mavsum fondi = kunlik fond × 7 kun
```

| | |
|---|---|
| DAU | 10,000 |
| ARPU | $0.05 |
| Kunlik daromad | $500 |
| Jamgʻarma ulushi | 15% |
| **Mavsum fondi** | **$525 = 525,000 tanga** |
| Bitta oʻyinchi maksimumi | 26,250 tanga (5%) |

**Fond har doim daromaddan foiz — qatʼiy summa emas.**

### Hissa formulasi

```
Hissa = yetkazilgan zarar (CP) × natija koeff. × raqib kuchi koeff.
Mukofot = (shaxsiy hissa ÷ barcha hissalar) × mavsum fondi
```

| Holat | Koeff. |
|---|---|
| Gʻalaba | 1.00 |
| Magʻlubiyat (lekin jang qilgan) | 0.40 |
| Raqib CP si 30%+ past | 0.20 |
| Raqib CP si yuqori | 1.30 |
| Askar yoʻqotmasdan gʻalaba | 0.10 |
| Mavsumning oxirgi 3 kuni | 1.50 |
| Bir toʻda ichidagi jang | 0.00 |

### Taqsimot namunasi (haftada 10 jang, koeff. 0.8)

| Daraja | Toʻda CP | Haftalik hissa | Ulush | Mukofot |
|---|---|---|---|---|
| 5 | 1,029 | 8,232 | 0.07% | $0.37 |
| 10 | 4,188 | 33,504 | 0.28% | $1.49 |
| 15 | 16,775 | 134,200 | 1.14% | $5.98 |
| 20+ | 97,283+ | 778,264+ | 5% (shift) | $26.25 |

Toʻda CP — bo'lim 6 “Tavsiya etilgan taqsimot” jadvalidagi qiymat (Excel `Mukofot va mavsum` varagʻi; faraz: har darajada bittadan oʻyinchi).

### Mavsum tuzilmasi
- **7 kun.** Har dushanba reyting nolga tushadi
- Divizionlar: bronza → kumush → oltin → afsona
- Oxirgi 3 kun hissa ×1.5

### Bosqichma-bosqich yoʻl

| Bosqich | Muddat | Mukofot | Xavf |
|---|---|---|---|
| 1 | 0–3 oy | Prestij, unvon, skin, reyting | Yoʻq |
| 2 | 3–6 oy | Telegram Stars — top-100 ga | Past |
| 3 | 6+ oy | Tanga → pul konversiyasi | Yuqori |

> ⚠️ 3-bosqichdan oldin soliq, KYC va Telegram qoidalarini mahalliy yurist bilan tekshiring. Bu hujjat huquqiy maslahat emas.

### Orqada qolganlarni tenglashtirish (Catch-up)

**Muammo:** 20→25 daraja jami XP ning **81%** ini talab qiladi ((592,680 − 113,480) ÷ 592,680, bo'lim 1 jadvali). Kech qoʻshilgan yoki uzoq tanaffusdan qaytgan oʻyinchi uchun bu masofa zerikarli tuyulishi mumkin.

```
Orqada qolish nisbati = MAX(0, (server oʻrtacha darajasi − oʻyinchi darajasi) ÷ server oʻrtacha darajasi)

Daraja fasili(L):
    L < 15        → 1.00
    15 ≤ L < 20   → (20 − L) ÷ 5      # 15 da 1.00 dan 20 da 0.00 gacha chiziqli pasayadi
    L ≥ 20        → 0.00

Agar nisbat ≤ 0.30:
    Catch-up XP koeffitsienti = 1.00  (bonus yoʻq)
Aks holda:
    Catch-up XP koeffitsienti = 1 + MIN(0.50, (nisbat − 0.30) × 1.50) × Daraja fasili(oʻyinchi darajasi)
```

Bu koeffitsient bo'lim 1 dagi barcha XP manbalariga (ov, qurilish/mashq, PvP, vazifa) koʻpaytiruvchi sifatida qoʻllanadi.

**Toʻrt qatlamli himoya:**
- **30% chegara** — faqat sezilarli orqada qolganlar uchun ishlaydi; bir necha kunlik tabiiy farqni "tenglashtirish" shart emas
- **Maksimal +50% (×1.5)** — ×2.5 emas; 1 oylik veteranni 2 haftada emas, tabiiy ravishda sekinroq quvib yetadi
- **15–20 oraligʻida asta-sekin soʻnadi** — keskin "20 da birdan oʻchish" oʻrniga, oʻyinchi bu bosqichga yetganda bonus allaqachon yarmiga (yoki kamroqqa) tushgan boʻladi — tabiiyroq oʻtish
- **20-darajadan yuqorida toʻliq oʻchiriladi** — eng katta investitsiya talab qiladigan afsonaviy bosqich (20–25) hech kimga tezlashtirilmaydi, veteran mavqei shu yerda toʻliq saqlanadi

**Nega bu haqiqiy "yetib olish" emas:** daraja faqat boʻri stati (Kuch/Tezlik/Chidam) va modul ochilishini belgilaydi. Jangovar kuch (CP) asosan **qoʻshin sonidan** keladi (bo'lim 24, qoida 1), qoʻshin esa bino darajasi va mashq navbatiga bogʻliq — bular XP catch-up dan mustaqil, alohida resurs/vaqt talab qiladi. Demak tez darajaga chiqqan oʻyinchi statik jihatdan tenglashadi, lekin qoʻshin hajmida veterandan sezilarli orqada qoladi.

**Nega balans falsafasiga (bo'lim 24, qoida 5) mos:** bu XP tezligini oʻzgartiradi, **CP yoki statni oshirmaydi** — xuddi vazifa/mavsum mukofotlari kabi faqat vaqt tejaydi. Shuning uchun sotilmaydi, hammaga bepul va bir xil ishlaydi.

---

## 13. Adolat nazorati

### Jang turlari

| Jang turi | Raqibni kim tanlaydi | Oʻlja | Mavsum hissasi |
|---|---|---|---|
| Mavsum jangi | **Server** | Ha | ✅ Hisoblanadi |
| Erkin reyd | Oʻyinchi | Ha | ❌ Hisoblanmaydi |
| Qasos hujumi | Oʻyinchi (24 soat) | Ha | ◐ 50% |
| Toʻda urushi | Ikki toʻda kelishadi | Yoʻq | ✅ Hisoblanadi |

**Eng kuchli chora — raqibni server tanlashi.** Qolgan qoidalar faqat teshiklarni yopadi.

### Parametrlar

| Qoida | Qiymat | Natija |
|---|---|---|
| Juftlik hissa chegarasi | 3 jang/mavsum | Bir juftlikning 4-jangidan boshlab mavsum hissasi 0 (hujumning oʻzi PvP qoidasi bilan cheklanadi: 24 soatda 3 ta) |
| Yopiq guruh | 60% | Guruh bayroqlanadi |
| Guruh hajmi | 5 oʻyinchi | Graf tahlili |
| Minimal himoya CP | 60% | Past boʻlsa hissa 0 |
| Minimal raund | 3 | Kam boʻlsa hissa 0 |
| Hujumchi yoʻqotishi | 15% | Past boʻlsa hissa 0 |
| Bir tomonlama jang | 10× | Koeff. 0.2 |
| Toʻda almashtirish | 7 kun | Mukofotsiz |
| Yangi akkaunt | 14 kun | Mukofotsiz |
| Toʻlov kutishi | 48 soat | Tekshiruvdan keyin |
| Qoʻlda tekshiruv | Top-100 | Har mavsum |

### Jazo bosqichlari
1-marta — hissa 50% · 2-marta — mavsumdan chiqarish · 3-marta — 3 mavsum blok · ogʻir holat — akkaunt bloki

Bekor qilingan mukofot **keyingi mavsum fondiga** qoʻshiladi — halol oʻyinchilarga qaytadi.

### Tekshiruv tartibi
Real vaqtda → jang tugagach → mavsum oxirida (graf tahlili) → toʻlovdan oldin (48 soat + qoʻlda)

---

## 14. Vazifalar va gamifikatsiya

### Mukofot byudjeti

```
Kundalik jami = kunlik ishlab chiqarish × 15%
Haftalik jami = kunlik ishlab chiqarish × 40%
Bosqichli (bir martalik) = kunlik ishlab chiqarish × 50%
Xavfsiz chegara = 60%
```

| Daraja | Kunlik ishlab chiqarish | Kundalik jami | Bitta vazifa | Haftalik | Kunlik ulush |
|---|---|---|---|---|---|
| 5 | 1,063 | 159 | 40 | 425 | 21% ✅ |
| 15 | 7,767 | 1,165 | 291 | 3,107 | 21% ✅ |
| 25 | 56,738 | 8,511 | 2,128 | 22,695 | 21% ✅ |

### Tuzilma (Vazifalar tabi)

Vazifalar tabida subtablar: **‹ Orqaga** (oldingi tabga qaytadi) · **Kundalik** · **Haftalik** · **Oylik**. Har subtabda — yangilanishgacha qolgan vaqt, vazifalar, davr sandigʻi va “Hammasini olish”. Davr chegarasi — **Toshkent vaqti** (UTC+5): kun 00:00, hafta dushanba 00:00, oy 1-sanada.

| Davr | Vazifalar | Bitta vazifa | Sandiq (hammasi bajarilsa) | Kuniga oʻrtacha |
|---|---|---|---|---|
| Kundalik | 4 ta | 3.75% | 5% × kun kombosi (×1.0 … ×1.6) | 15% + 5–8% |
| Haftalik | 4 ta | 10% | 10% | 7.1% |
| Oylik | 3 ta | 20% | 30% | 3% |
| Kirish taqvimi | 7 kun | — | n-kun: 1% × n | 4% |

Ulush — **kunlik ishlab chiqarish** (Ustaxona = oʻyinchi darajasi, soatlik × 24) dan. Jami kuniga **≤ 37%** — xavfsiz chegara (60%) ichida (`tools/blue_wolf_config.py` tekshiradi).

**Vazifa turlari** (har davrga oʻyinchi ID + davr urugʻi bilan aralashtirib tanlanadi; daraja yetmaganlari chiqmaydi):

| Vazifa | Sanaladi | Kundalik | Haftalik | Oylik | Daraja |
|---|---|---|---|---|---|
| Ovchi | ov (yolgʻiz ham) | 3 | 20 | 70 | 1+ |
| Goʻsht zaxirasi | ovdan keltirilgan kg | 0.5 × kunlik ehtiyoj | 3 × | 12 × | 1+ |
| Quruvchi | bino kuchaytirish | 1 | 4 | 12 | 2+ |
| Yigʻuvchi | Ustaxona buferini yigʻish | 2 | 10 | 35 | 2+ |
| Uzoq yoʻl | oʻrta/uzoq kartadagi ov | 1 | 5 | 15 | 3+ |
| Murabbiy | tayyorlangan askar | 10% sigʻim | 50% | 150% | 4+ |
| Sodiq boʻri | kirilgan kun | — | 5 | 20 | 1+ |

**Kun kombosi.** Kundalik vazifalarning hammasi bajarilib, **Kun sandigʻi** ochilgan har ketma-ket kun kombo +1; sandiq ×(1 + 0.1 × (kombo − 1)), 7 kunda maks ×1.6. Bir kun oʻtkazilsa kombo yonib, 1 dan boshlanadi.

**Kirish taqvimi.** Kuniga bir marta sovgʻa: 1-kun 1% … 7-kun 7%; 7 kundan keyin yana 1-kun. Kun oʻtkazilsa 1-kundan.

**Mukofot — faqat resurs.** Qurilish resurslari (tosh 40% · shox-shabba 30% · teri 15% · suyak 15%) + goʻsht = ulush × 2 × toʻdaning kunlik goʻsht ehtiyoji (Oziq gʻori sigʻimigacha, ortigʻi chiriydi). Vazifalar goʻshti kunlik ehtiyojning ≤ 75% i — ov kerakligicha qoladi. **Askar, XP, tezlashtirish, oy toshi berilmaydi.** Mukofot miqdori davr boshlangandagi daraja bilan qotadi.

Parametrlar: `Sozlamalar` → “Vazifalar: oylik va mukofotlar” (`quest_*`, `login_gift_step`).

### Bosqichli (10 yoʻnalish)
Quruvchi (5·15·40·80·150) · Toʻda alfasi (5·10·15·20·25 askar) · Murabbiy (birinchi 2/4/6-tier) · Ovchi (50·200·1000) · Toʻplovchi (10k·100k·1mln) · Jangchi (10·50·200) · Gʻolib (5·25·100) · Razvedkachi (20·100) · Egallovchi (1·3 oazis) · Sodiq (7·30·100 kun)

### Mukofot turlari

MVP da vazifalar faqat resurs beradi; quyidagi jadval — kelajakdagi (bosqichli, mavsum) mukofotlar uchun chegara.

| ✅ Beriladi | ❌ Hech qachon |
|---|---|
| Resurs (byudjet ichida) | Doimiy stat bonusi |
| Qurilish/mashq tezlashtirishi | Tier sakrashi yoki bepul tier |
| Bepul davolash | Toʻda hajmini oshirish |
| Qalqon soatlari | Bino darajasini bepul koʻtarish |
| Unvon, ramka, skin | PvP da doimiy ustunlik |
| Mavsum ballari | Oy toshi |
| Bozor soligʻini vaqtincha kamaytirish | Oʻlja koeffitsienti |

**Qoida:** mukofot **vaqt** tejaydi, **kuch** bermaydi. Askar hech qachon mukofot sifatida berilmaydi.

---

## 15. Tanishtiruv (1–5 daraja, 23 qadam, ~15 daqiqa)

Maqsad: yangi oʻyinchi oʻyinning **hamma qismini** tushunsin — har bir resurs nimaga kerak, har bir bino nima qiladi, rollar va tierlar, ov xaritasi va xavf, oziqlanish, vazifalar — va 15 daqiqada 5-darajaga chiqsin. Qadamlar matni va mukofotlari — `bluewolf/public/data/tutorial.json` (server va klient bir xil faylni oʻqiydi).

| # | Daraja | Mavzu | Harakat | Mukofot | XP |
|---|---|---|---|---|---|
| 1 | 1 | Sen — yolgʻiz boʻrisan | “Davom” | — | 5 |
| 2 | 1 | Resurslar paneli | “Davom” | — | 5 |
| 3 | 1 | Goʻsht — eng muhim resurs | Goʻsht katagini bosish | — | 5 |
| 4 | 1 | Birinchi ov | Yolgʻiz ov (Ov tabi) | 5 kg goʻsht | 5 |
| 5 | 1 | In — sening makoning | In binosini ochish | — | 10 |
| 6 | 2 | XP va darajalar | “Davom” | — | 5 |
| 7 | 2 | Oziq gʻori | Oziq gʻorini ochish | — | 5 |
| 8 | 2 | Suv va shifobaxsh oʻt | “Davom” | — | 5 |
| 9 | 2 | Ustaxona qoyasi | Ustaxonani ochish | 100 tosh, buferga 100 resurs | 5 |
| 10 | 2 | Taqsimot | Taqsimotni oʻzgartirish | — | 5 |
| 11 | 2 | Buferni yigʻish | Buferni yigʻish | — | 5 |
| 12 | 2 | Binoni kuchaytirish | Oziq gʻorini 2-darajaga koʻtarish | — | 10 |
| 13 | 3 | Ov soʻqmogʻi | Ov soʻqmogʻini ochish | 25 kg goʻsht, 10 suyak | 15 |
| 14 | 3 | Toʻrt rol | “Davom” | — | 10 |
| 15 | 3 | Birinchi ovchi | Ovchi tayyorlash | — | 20 |
| 16 | 3 | Tier va qoʻshin sigʻimi | “Davom” | — | 15 |
| 17 | 4 | Endi sening toʻdang bor! | “Davom” | 2 ovchi | 20 |
| 18 | 4 | Ov xaritasi | Ov xaritasida ovga chiqish | 8 kg goʻsht | 40 |
| 19 | 4 | Xavf va yaradorlar | “Davom” | — | 20 |
| 20 | 4 | Oziqlanish va ochlik | “Davom” | — | 20 |
| 21 | 4 | Vazifalar | Vazifalar tabini ochish | — | 25 |
| 22 | 4 | Oldinda nima bor | “Davom” | — | 25 |
| 23 | 5 | Omad, alfa! | “Davom” | 60 kg goʻsht, 300 tosh, 200 shox-shabba, 100 teri, 100 suyak | 50 |
| | | | | | **330** |

Jami XP: 5-qadamdan keyin 30 (**2-daraja**), 12-dan keyin 70 (**3**), 16-dan keyin 130 (**4**), 22-dan keyin 280 (**5**). Har qadamning `level` i undan oldingi qadamlar XP si bilan albatta yetiladi (test tekshiradi).

**Nimalar tushuntiriladi:** resurslar paneli (oziq va qurilish qatorlari, sigʻim chizigʻi) · goʻsht (boqish, yollash, ochlik, chirish) · suv, shifobaxsh oʻt, oy nuri · XP va darajalar (daraja — imkoniyat, kuch emas) · In · Oziq gʻori (sigʻim, passiv suv, oflayn ×2) · Ustaxona (bufer, oflayn 70%), taqsimot (har resurs qaysi binoga ketadi), yigʻish · qurilish navbati, bepul tezlashtirish, bekor qilish · rol binolari · 4 rol va kuch uchburchagi · askar narxi va mashq vaqti · tierlar va qoʻshin sigʻimi · toʻda · ov xaritasi (masofa, vaqt, minimal toʻda) · xavf, yarador va halok · oziqlanish va ochlik · vazifalar, kun kombosi, kirish taqvimi · kelajakdagi binolar va jang.

### Qoidalar
- **Yoʻriqchi kartasi** pastda (oyna ochiq boʻlsa — tepada): qadam raqami va progress, matn, mukofot, “Davom” yoki “Belgilangan joyni bosing”. Kerakli element sariq ramka bilan belgilanadi va koʻrinadigan qismga suriladi; boshqa tabda boʻlsa — “Oʻtish”. Kartani yigʻib qoʻyish mumkin.
- **Tanishtiruv davomida qurilish va mashq navbatlari darhol tugaydi**; 5 ta bepul tezlashtirish birinchi kirishda beriladi.
- **XP faqat qadam mukofotidan** keladi (ov, qurilish, mashq XP bermaydi) — daraja chegaralari qadamlarga aniq mos tushadi.
- Qadamlar faqat **ketma-ket** (server tekshiradi). Bloklash yumshoq: boshqa tugmalar ishlaydi, lekin qadam faqat kerakli harakat bilan oʻtadi.
- **12-qadamdan keyin “Oʻtkazib yuborish”**: qolgan qadamlarning XP si beriladi (resurs sovgʻalari — yoʻq), oʻyinchi baribir 5-darajaga chiqadi.
- 17-qadamdagi 2 ta ovchi — tanishtiruvning yagona askar sovgʻasi (vazifalar askar bermaydi, bo'lim 14).
- v0.0.9 dan oldin 2-darajadan oshgan oʻyinchilar tanishtiruvni oʻtgan hisoblanadi.
- **Keyinroq** (jang va razvedka qoʻshilganda): yovvoyi toʻdaga birinchi hujum (gʻalaba kafolatlangan) va razvedka qadamlari qoʻshiladi.

---

## 16. Oflayn hisob

### Vaqt shkalasi

| Yoʻqlik | Ishlab chiqarish | Oziqlanish | Qoʻshin | PvP |
|---|---|---|---|---|
| 0–20 soat | 70% oflayn stavka, Ustaxona buferi toʻlguncha (oflaynda bufer 2× = 20 soat) | Ombordan | Normal | Hujum qilinadi |
| 20 soat – 3 kun | Toʻxtaydi (bufer toʻla) | Zaxira kamayadi | Normal | Hujum qilinadi; 24 soatdan keyin oʻlja ×0.5 |
| 3 – ~7 kun | Toʻxtagan | Zaxira kamayadi (oflayn ombor ~6–7 kunga yetadi) | Normal | Uyqu qalqoni (72 soatdan) |
| zaxira tugagach | Toʻxtagan | **Ochlik** | CP −30% | Uyqu qalqoni |
| ochlikning 7-kunidan | Toʻxtagan | Ochlik | Kuniga 1% ketadi (maks 50%) | Qalqon davom etadi |

**Oflayn** — oʻyinchining oxirgi soʻrovidan 5 daqiqadan koʻp oʻtgan vaqt (`last_seen_at` boʻyicha).

### Ombor necha kunga yetadi

Oflaynda Oziq gʻori sigʻimi va Ustaxona buferi **2× kengayadi** (“Oflayn ombor +50%” xaridi bilan **2.5×**). Jadvalda sigʻim — 3 kunlik zaxirani sigʻdiradigan gʻor darajasida:

| Daraja | Kunlik goʻsht | Oddiy sigʻim | Oflayn sigʻim | Yetadi |
|---|---|---|---|---|
| 5 | 12 | 40 | 80 | 6.7 kun |
| 10 | 45 | 161 | 322 | 7.2 kun |
| 15 | 148 | 531 | 1,062 | 7.2 kun |
| 20 | 463 | 1,434 | 2,868 | 6.2 kun |
| 25 | 1,380 | 4,728 | 9,456 | 6.9 kun |

### Ochlik rejimi — birinchi 7 kun askar yoʻqolmaydi
- Jangovar quvvat −30%, ishlab chiqarish −50%
- **Birinchi 7 kun hech kim ketmaydi**
- 7 kundan keyin kuniga 1%, maksimum 50%
- Goʻsht qoʻshilishi bilan jazolar darhol oʻchadi

### Qaytish ekrani
Sarlavha ("Qaytganingiz bilan, alfa! Siz 3 kun yoʻq edingiz") → hisobot → jang jurnali → 30 daqiqalik qalqon → qaytish paketi (1 kunlik goʻsht) → katta tugma "Toʻdani boq". Ketma-ket kunlar nolga tushmaydi.

### Texnik
- **Timestamp asosida, tick yoʻq.** Hisob algoritmi — `blue_wolf_texnik_spec.md`, 4.1
- Navbatlar tugash vaqti bilan saqlanadi, oflaynda oʻzi tugaydi
- Oflayn stavka 70% — kirish uchun sabab, lekin jazo emas

---

## 17. Monetizatsiya

### Asosiy himoya

```
Tezlashtirish kunlik progressning 25% idan oshmaydi
```

Chegara tugagach tugma oʻchadi. Progressiv narx va chegara har kuni 00:00 UTC da yangilanadi. Natija: **eng koʻp toʻlagan oʻyinchi bepul oʻynagandan koʻpi bilan 1.25× tez**, 5× emas.

Ikkinchi qurilish navbati bu hisobni buzmasligi uchun u **10-darajada hammaga bepul** ochiladi; oy toshiga faqat uni 4–9 darajada **erta** ochish sotiladi. Uzoq muddatda toʻlovchi va bepul oʻyinchi navbatlari teng.

### Tezlashtirish narxi (progressiv, ×1.6)

| Tezlashtirish | Blok narxi | Jami | $ | 1 soat |
|---|---|---|---|---|
| 1 soat | 10 | 10 | $0.10 | $0.10 |
| 2 soat | 16 | 26 | $0.26 | $0.13 |
| 3 soat | 26 | 52 | $0.52 | $0.17 |
| 4 soat | 41 | 93 | $0.93 | $0.23 |
| 5 soat | 66 | 159 | $1.59 | $0.32 |
| 6 soat | 105 | 264 | $2.64 | $0.44 |

Kunlik maksimal xarajat ~$2.64, oyiga ~$79.

### Qaytish tezlashtirishi (koeff. 0.60)

```
Bloklar soni = yuqoriga yaxlitlangan(qolgan qaytish vaqti, soat)
Narx = yuqoriga yaxlitlangan(0.60 × Σ blok narxlari)   — blok narxlari yuqoridagi progressiv jadvaldan (10, 16, 26, ...)
```

| Masofa | Qaytish vaqti | Bloklar | Narx | $ |
|---|---|---|---|---|
| 5 km | 15 daq | 1 | 6 | $0.06 |
| 15 km | 45 daq | 1 | 6 | $0.06 |
| 30 km | 1.5 soat | 2 | 16 | $0.16 |
| 60 km | 3 soat | 3 | 32 | $0.32 |
| 100 km | 5 soat | 5 | 96 | $0.96 |

- ❌ Borish yoʻli — hech qachon
- ❌ Jangning oʻzi — hech qachon
- ✅ Qaytish yoʻli — PvP, lager, oazis
- Iningizga hujum kelayotgan boʻlsa tugma oʻchadi
- Kunlik 25% chegaraga kiradi (tejalgan soniyalar `speedup_usage` ga qoʻshiladi); bir yurishga bir marta

### Oy toshi paketlari

| Paket | Oy toshi | Narx | Bonus |
|---|---|---|---|
| Kichik | 100 | $1 | — |
| Oʻrta | 550 | $5 | +10% |
| Katta | 1,200 | $10 | +20% |
| Alfa | 3,300 | $25 | +32% |

### Doimiy xaridlar
Ikkinchi qurilish navbati — erta ochish (4–9 daraja) 1,500 · Oflayn ombor +50% (oflayn koeff. 2.0 → 2.5) 800 · Avtomatik yigʻish 600 · Mavsum yoʻli 500/mavsum · Skin toʻplami 200–900

### Sotiladi / sotilmaydi

| ✅ Sotiladi | ❌ Hech qachon |
|---|---|
| Tezlashtirish (chegara bilan) | Askar yoki tier |
| Ikkinchi qurilish navbati | CP yoki stat bonusi |
| Oflayn ombor +50% | Qoʻshin sigʻimi |
| Avtomatik yigʻish | Oʻlja koeffitsienti |
| Skin, unvon, ramka | Bino darajasi |
| Mavsum yoʻli | **Jangovar qalqon** |
| Resurs paketi (chegarali) | Mukofot fondi ulushi |
| **Taʼtil rejimi** | Qalqon vaqtini uzaytirish |

### 🌙 Taʼtil rejimi — yagona sotiladigan himoya

| Parametr | Qiymat |
|---|---|
| Yoqilish kechikishi | 12 soat |
| Minimal muddat | 24 soat |
| Maksimal muddat | 168 soat (7 kun) |
| Bepul | 48 soat/oy |
| Qoʻshimcha | 250 oy toshi/kun |

**Taʼtilda:** hujum yoʻq (ikki tomonga) · ishlab chiqarish 0 · oziqlanish toʻxtaydi · mukofot yigʻilmaydi · navbatlar muzlatiladi · hujum/razvedka/lager yuborsa **darhol buziladi** · chiqishda 30 daqiqalik qalqon

**Nega xavfsiz:** bu himoya emas, **pauza**. Oʻyinchi hech narsa yutmaydi — faqat yoʻqotmaydi. 12 soatlik kechikish kelayotgan hujumdan qochishni imkonsiz qiladi.

### Qattiq qoidalar
- Jang va yurish paytida (borishda) tezlashtirish yoʻq
- 12 soatlik klan urushida tezlashtirish butunlay oʻchirilgan
- Mukofot fondidan ulush sotilmaydi
- Yangi oʻyinchiga 7 kun hech narsa sotilmaydi
- Har xarid ekranida "bu nimani tezlashtiradi" aniq yozilsin

---

## 18. Ekranlar (6 tab)

6 ta asosiy tab: 🏔 In · 🐾 Ov · ⚔️ Jang · 🐺 Toʻda · 📋 Vazifalar · 👤 Profil. Toʻda tabi ikonkasi — ikki boʻri boshi, Profil — doira ichidagi boʻri boshi (oʻyinchi nishoni). Har tabning tarkibi — `blue_wolf_texnik_spec.md`, 1-boʻlim.

### Yuqori panel (hamma tabda)
- **Menyu tutqichi** — ekran oʻrtasida, chap chetda yarmi koʻrinib turadigan tugma (›). Bosilganda menyu chap yondan suzib chiqadi (ekranning ~78%, koʻpi bilan 320 px, fon xiralashadi); tutqich menyu ramkasiga ulangan holda u bilan birga suriladi va ‹ ga aylanadi. Qayta bosilsa (yoki ✕, fon, chapga surish, Telegram “Orqaga”, Esc) menyu va tutqich birga chapga qaytadi. Bandlari keyingi versiyalarda qoʻshiladi.
- Avatar, ism, daraja, XP, oy toshi; **resurslar paneli**.
- **Taymerlar paneli** — resurslar ostida, faqat taymer bor paytda koʻrinadi. Har taymer resurs katagiga oʻxshash ixcham belgi: **ikonka + qolgan vaqt** (kichik shrift). Ikonka atrofidagi halqa toʻlib boradi (progress); belgi yumaloq, uzuq chiziqli ramka bilan — resurs kataklaridan ajralib turadi. Har tur oʻz rangida:

| Taymer | Rang | Ikonka |
|---|---|---|
| Qurilish | qahrabo (sariq) | bolgʻa |
| Mashq | binafsha | rol ikonkasi |
| Ov (toʻda ovda) | yashil | panja |

  Taymerlar tugash vaqti boʻyicha tartiblanadi; toʻliq nomi bosib turganda (title) va ekran oʻquvchida. Bosilganda qurilish va mashq taymeri tegishli bino oynasini, ov taymeri Ov tabini ochadi. In sahifasida alohida “Qurilish navbati” boʻlimi yoʻq — navbat holati shu paneldan, tezlashtirish va bekor qilish bino oynasidan. Keyin davolash va boshqa taymerlar ham shu qatorga qoʻshiladi (har biri alohida rang va ikonka).

### Resurs olish animatsiyasi
Vazifa, sandiq, kirish sovgʻasi, bufer yigʻish, ov va tanishtiruv mukofotida har bir resurs “+N” belgisi (resurs rangi va ikonkasi bilan) bosilgan joydan chiqib, yuqoridagi oʻz resurs katagiga uchib boradi; katak bir lahza yonib, kattalashadi. Ovdan qaytgan oʻlja Ov tabidan uchadi. “Harakatni kamaytirish” sozlamasi yoqilgan boʻlsa animatsiya oʻchadi.

---

## 19. Bildirishnomalar

Telegram bot orqali, kuniga koʻpi bilan 6 ta (1-ustuvorlik byudjetdan tashqari), tunda faqat 1-ustuvorlik. Turlar va qoidalar — `blue_wolf_texnik_spec.md`, 2-boʻlim.

---

## 20. Lokalizatsiya

uz (asosiy), ru, en; barcha matn `locales` jadvalida, kodda faqat kalit. Batafsil — `blue_wolf_texnik_spec.md`, 3-boʻlim.

---

## 21. Texnik arxitektura

- **DB:** MySQL 8, 30 jadval — `blue_wolf_schema.sql`
- **Balans:** Excel `blue_wolf_darajalar.xlsx` — `Sozlamalar` varagʻidagi nomlangan kataklar (masalan `xp_base`) va ularga tayangan formulalar. `game_config` jadvali shu varaqdan `tools/blue_wolf_config.py` bilan generatsiya qilinadi (`blue_wolf_game_config.sql`); kalitlar Excel nomlari bilan bir xil. Kodda birorta balans raqami qattiq yozilmaydi
- **API:** 68 endpoint — `blue_wolf_api.md`
- **Server mantiqi, cron, xavfsizlik:** `blue_wolf_texnik_spec.md`, 4-boʻlim

---

## 22. MVP doirasi (10–12 hafta)

### Kiritiladi
- **1–10 daraja**
- **Binolar:** In (avtomatik) + 6 ta — Oziq gʻori, Ustaxona qoyasi, Ov soʻqmogʻi, Jang maydoni, Razvedka qoyasi, Shifo gʻori
- **Rollar:** ovchi, hujumchi, razvedkachi — **1–2 tier** (2-tier 8-darajada ochiladi)
- **Ov:** yolgʻiz ov (1–3 daraja), ov xaritasi (9 karta, xavf va jarohat)
- **Jang:** yovvoyi toʻdalar (botlar) 4-darajadan, PvP 1v1 7–10 darajada, oʻlja, razvedka, jarohat va davolash
- Tanishtiruv (20 qadam) · kundalik vazifalar · oflayn hisob, ochlik · uz tili · oy toshi (faqat test uchun, sotuvsiz)

> **Toʻda majburiy (MVP):** 5-darajadan boshlab asosiy oʻlja (jayron, 25 kg) yolgʻiz ovlanmaydi — oʻyinchi oʻz toʻdasini (ovchilar + yordamchilar) yuboradi. Oʻyinchilararo ov guruhlari olib tashlandi: ijtimoiy oʻyin klan (v2) orqali. Texnik jihatdan — `marches.kind = 'hunt'`, `board_window` / `board_slot`.

### v2 ga qoldiriladi
11–25 daraja · Himoya devori va Bozor · himoyachi roli · 3–6 tier · **rasmiy klan tizimi** (aʼzolik, lavozim, xazina) va toʻda urushi · lager va oazis · mavsum va liga · monetizatsiya (Telegram Stars) · **pul mukofoti** · ru va en

### Oʻlchanadigan raqamlar
D1 retention >30% · D7 >12% · tanishtiruv tugatish >70% · 4-darajaga yetish <15 daqiqa · birinchi botga hujumgacha vaqt · 7-darajaga (birinchi PvP) yetish vaqti

---

## 23. Art yoʻnalishi

**Hozircha oddiy.** Bitta boʻri silueti + rol rangi + tier ramkasi. 25 ta boʻri rasmi yetarli (600 emas).

Rol ranglari: 🔍 koʻk · ⚔️ qizil · 🛡 yashil · 🥩 jigarrang
Tier ramkasi: 1–2 oddiy · 3–4 kumush · 5 oltin · 6 alangali

Batafsil art keyingi bosqichda qoʻshiladi.

---

## 24. Balans falsafasi — 7 qoida

1. **Kuch qoʻshish orqali oʻsadi, koʻpaytirish orqali emas.** 1-darajadan 25-gacha **bitta boʻrining CP**si ~149× oshadi (69→10,269), lekin **butun toʻdaning jangovar quvvati** ~6,092× oshadi (63→383,763 — Excel "Umumiy bogʻlanish" varagʻi). Farq — 460× qoʻshin oʻsishidan (1→460), statdan emas. Shuning uchun matchmaking ishlaydi.

2. **Har tizimda uch qulf.** Askar tieri: alfa darajasi ÷ 4, rol binosi ÷ 4, maksimum 6 (1-tier har doim ochiq). Bitta yoʻl bilan tezlashtirib boʻlmaydi.

3. **Ishlab chiqarish narxdan sekin oʻsadi.** Ishlab chiqarish 1.22×, narx 1.30× — resurs har darajada qadrliroq boʻlib boradi.

4. **Bitta reyd oʻljasi kunlik ehtiyojning (va kunlik ovning) 50% idan oshmaydi.** Aks holda oʻyinchilar ov qilishni tashlab, faqat bir-birini talaydi.

5. **Mukofot vaqt tejaydi, kuch bermaydi.** Vazifa, mavsum va pul — hech biri stat bermaydi.

6. **Yutqazgan tez tiklanadi, yutgan sekin oʻsadi.** Toʻlganlik koeffitsienti 0.5× va 2.5× orasida — farq vaqt bilan yopiladi, lekin gʻalaba baribir foydali.

7. **Hech kim hamma narsani yoʻqotmaydi.** Jangda maksimal yoʻqotish 90%, va yoʻqotilganlarning koʻpi (60–75%) oʻlmaydi — jarohatlanib, davolanadi. Ochlikda askar 7 kun yoʻqolmaydi, keyin ham koʻpi bilan 50%.

---

*Hujjat Blue Wolf balans jadvali (`blue_wolf_darajalar.xlsx`, 21 varaq — kiritish `Sozlamalar` varagʻida), DB sxemasi (`blue_wolf_schema.sql`, 30 jadval), API spetsifikatsiyasi (`blue_wolf_api.md`) va texnik spetsifikatsiya (`blue_wolf_texnik_spec.md`) bilan birga ishlatiladi.*
