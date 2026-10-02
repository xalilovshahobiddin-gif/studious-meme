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
2. **Iqtisod** — 7 resurs, 9 bino (8 tasi qurilib oʻstiriladi, 1 tasi — In — oʻyinchi darajasiga avtomatik ergashadi), oziqlanish va ombor cheklovlari
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

> ⚠️ **Eslatma (formulani "tuzatishga" urinmang):** har bir boʻri turining kuch/tezlik modifikatori individual va lore asosida tanlangan (masalan, Fenrir — ulkan, kuchli, lekin sekinroq boʻri). Shuning uchun **tezlik** darajama-daraja monoton oʻsmasligi mumkin (24-daraja Fenrir tezligi 23-daraja Geri va Frekidan past). Balans kafolati tezlikda emas — **CP** har doim monoton oʻsadi. Jadvaldagi tezlik pasayishini xato deb hisoblamang.

### Oʻyinchi XP manbalari

```
Ov XP        = oʻlja vazni (kg) × 0.50
Qurilish/mashq tugash XP = sarflangan asosiy resurs (tosh+yogʻoch+teri+suyak yigʻindisi) × 0.02
PvP XP       = yetkazilgan EP zarar × 0.03 × natija koeff. (gʻalaba 1.5 · durang 1.0 · magʻlubiyat 0.5)
Kundalik vazifa XP = mukofot byudjetining 10% i XP sifatida beriladi
```

Ov — asosiy va doimiy manba (asosiy sikl bilan bir xil ritmda). Qurilish/mashq XP dastlabki darajalarda tez-tez tugaydigan arzon amallardan kelib koʻp XP beradi (shuning uchun 1→4 daraja 15 daqiqada oʻtadi), lekin 16+ darajada navbatlar oʻta uzun boʻlib qoladi va ov asosiy manbaga aylanadi. Har bir XP manbasi `game_config` da alohida koeffitsient sifatida saqlanadi (`xp_hunt_coef`, `xp_build_coef`, `xp_pvp_coef`, `xp_quest_share`) — dizayn testida balanslash uchun.


---

## 2. Ochilish jadvali

| Daraja | Modul | Ochiladigan imkoniyat |
|---|---|---|
| 1 | Ov / Iqtisod | Yolgʻiz ov (kemiruvchi, qush), birinchi in |
| 2 | Iqtisod | Oziq gʻori, Ustaxona qoyasi |
| 3 | Ov | Quyon ovi, yolgʻiz bosqich yakuni |
| **4** | **Toʻda / Klan / PvP** | **🔓 Toʻda bilan ov · klan yaratish yoki qoʻshilish · PvP arena · toʻda janglari** |
| 5 | Toʻda / Ov | Toʻdaning umumiy ombori, yirik oʻlja (faqat toʻda bilan) |
| 6 | Iqtisod / PvP | 🏥 Shifo gʻori, toʻda reydi |
| 7 | PvP | Reyting va liga tizimi |
| 8 | PvP | Toʻda urushi (rejalashtirilgan sessiya) |
| 9 | Klan / Iqtisod | Toʻda lavozimlari, 🛒 Bozor |
| 10 | Klan | Hudud egallash (dasht zonasi) |
| 11 | Toʻda | Co-op boss (togʻ ayigʻi) |
| 12 | Klan | Toʻda xazinasi va ulush taqsimoti |
| 13 | PvP | Himoya urushi |
| 14 | PvP | Haftalik mavsumiy turnir |
| 15 | Toʻda | Taktika: qurshab olish, chekinish, tuzoq |
| 16 | PvP | Katta toʻda urushi (20v20) |
| 17 | Klan | Toʻdalar ittifoqi |
| 18 | PvP | Elite reyd, hudud bosib olish |
| 19 | Klan | Alfa unvoni, server reytingi |
| 20 | Toʻda | Muz davri zonasi, qadimgi janglar |
| 21 | PvP | Afsona bossi |
| 22 | PvP | Tungi reyd (hujum kuchi ×2) |
| 23 | Toʻda | Juft hujum |
| 24 | PvP | Zanjirni uzish (urushda toʻliq tiklanish) |
| 25 | Klan | Koʻk Boʻri — ittifoqqa +10% doimiy bonus |

---

## 3. Resurslar

### Oziq resurslari
| Resurs | Vazifasi | Manba |
|---|---|---|
| 🥩 Goʻsht | Asosiy oziq va valyuta | Ov |
| 💧 Suv | Chidam tiklash | Daryo, Oziq gʻori passiv yigʻimi |
| 🌿 Shifobaxsh oʻt | Davolash | Oʻrmon, togʻ |
| 🌙 Oy nuri | 20+ daraja oziqlanishi | Toʻlin oy, Oy mehrobi, shaxsiy passiv ishlab chiqarish |

### Qurilish resurslari
| Resurs | Manba |
|---|---|
| 🪨 Tosh | Ustaxona qoyasi |
| 🌲 Shox-shabba | Ustaxona qoyasi |
| 🐾 Teri | Ustaxona qoyasi / yirik oʻlja |
| 🦴 Suyak | Ustaxona qoyasi / ov |

### Premium
🌕 **Oy toshi** — Telegram Stars orqali sotib olinadi
🪙 **Tanga** — mavsum mukofoti

---

## 4. Oziqlanish

```
Bir askarning kunlik ehtiyoji = 0.6 + 0.1 × (daraja − 1)  kg
Toʻda kunlik sarfi = shu × qoʻshin soni
Suv = (0.4 + 0.04 × (daraja−1)) × qoʻshin
Oy nuri = 0.2 × qoʻshin (faqat 20+ daraja)
Zaxira talabi = 3 kunlik sarf
```

| Daraja | 1 askar | Qoʻshin | Kunlik goʻsht | Suv | Oy nuri | Asosiy oʻlja | Ov/kun | 3 kunlik zaxira | Kerakli Oziq gʻori |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.6 | 1 | 1 | 0 | — | Kemiruvchi (0.5 kg) | 2 | 3 | 1 |
| 4 | 0.9 | 10 | 9 | 5 | — | Sugʻur (8 kg) | 2 | 27 | 1 |
| 10 | 1.5 | 30 | 45 | 23 | — | Kiyik (60 kg) | 1 | 135 | 8 |
| 15 | 2.0 | 74 | 148 | 71 | — | Yovvoyi ot (250 kg) | 1 | 444 | 14 |
| 20 | 2.5 | 185 | 463 | 215 | 37 | Mamont bolasi (800 kg) | 1 | 1,389 | 19 |
| 25 | 3.0 | 460 | 1,380 | 626 | 92 | Ruh oʻljasi (400 kg) | 4 | 4,140 | 25 |

> ⚠️ **Oy nuri — ikki qatlamli ishlab chiqarish (bottleneck oldini olish uchun):** serverda Oy mehrobi oazisi bitta boʻlgani sababli, uni egallamagan toʻdalar 20+ darajaga chiqqach ochlikka mahkum boʻlmasligi kerak. Shu sababli:
> - **Shaxsiy passiv ishlab chiqarish** — Oziq gʻori 20-darajadan boshlab kichik miqdorda oy nuri ishlab chiqaradi: `0.03 × qoʻshin soni / soat` (`game_config`: `moonlight_passive_base`). Bu kichik-oʻrta qoʻshinni boqishga yetadi.
> - **Oy mehrobi — kengaytiruvchi, yagona manba emas.** +1/kun bonusi katta (25-daraja, 460 qoʻshin) armiyani toʻliq boqish uchun zarur boʻladi va shu bois strategik qimmatini saqlaydi, lekin uni egallamagan oʻyinchi tiqilib qolmaydi.

**Oʻlja zinapoyasi:** kemiruvchi 0.5 → qush 1 → quyon 2 → sugʻur 8 → jayron 25 → yovvoyi choʻchqa 50 → kiyik 60 → bugʻu 100 → arxar 120 → yovvoyi ot 250 → los 300 → bizon 500 → mamont bolasi 800 → mamont 1,200 → ruh oʻljasi 400

5-darajadan boshlab asosiy oʻlja jayron (25 kg) — bir boʻri uni ovlay olmaydi. **Toʻda ixtiyoriy emas, majburiy.**

### Ochlik mexanikasi
- Ombor toʻla (>80%) → kuch +10%, XP +5%
- Normal (30–80%) → oddiy
- Och (<30%) → tezlik −15%, jangda CP −20%

---

## 5. Binolar (9 ta — 8 tasi qurilib oʻstiriladi, 1 tasi avtomatik)

**Qoida:** hech bir bino oʻyinchi darajasidan oshmaydi.

```
Narx(L) = bazaviy × 1.30^(L-2) × bosqich koeffitsienti
Vaqt(L) = 10 daqiqa × bino koeffitsienti × 1.25^(L-2) × bosqich koeffitsienti
```

> ⚠️ **Tuzatish (v2 — Excel manba bilan tekshirilgach):** avvalgi versiyada ikkita xato bor edi va men buni faqat qisman toʻgʻrilagan edim. Haqiqiy manba — `blue_wolf_darajalar.xlsx` (Binolar varagʻi) — bilan solishtirib chiqilgach maʼlum boʻldiki: **1) birlik xato edi** (soniya emas, soat — bu toʻgʻri topilgan edi), lekin **2) formuladagi `× bosqich koeffitsienti` ni olib tashlash NOTOʻGʻRI edi** — asl formula toʻgʻri ekan, muammo GDD dagi jadval qiymatlarining oʻzida boʻlgan: ular bosqich koeffitsientisiz (×1.00 bilan) hisoblangan, Excel esa toʻgʻri (×1.25 bilan) hisoblagan — natijada GDD jadvali **haqiqiy qiymatdan aynan 20% past** edi (nisbat 0.80 — barcha 8 bino uchun bir xil), va bu **narx ustunida ham xuddi shunday takrorlangan**. Formula yuqorida asl holatiga qaytarildi; jadval Excel asosida toʻgʻrilandi.

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

**Amaliy taʼsir:** barcha 8 bino jami navbat vaqti (1→25, bitta navbat bilan, ketma-ket) = 1,364.0 soat ≈ **56.8 kun** sof navbat vaqti. Bu "necha oy" hisobiga (bo'lim 1 XP manbalari qismi) qoʻshimcha lower-bound beradi — resurs jamgʻarish vaqti hisobga olinmagan holda ham, faqat qurilish navbatlarining oʻzi ~2 oy talab qiladi.

### 🏠 In (9-bino — avtomatik, narxsiz)

> ⚠️ **Topilgan nomuvofiqlik:** DB sxemasidagi `buildings.type` ENUM ida `'den'` bor va tanishtiruvning 3-qadamida ("Inni qoʻyish → In 1-daraja") tilga olinadi, lekin yuqoridagi 8 ta bino roʻyxatida In yoʻq edi — uning narxi/vaqti/foydasi hech qayerda taʼriflanmagan edi. Quyida taʼriflanadi.

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
Sigʻim(L)      = 40 × 1.22^(L-1) kg
Chirish(L)     = 12 soat × (1 + 0.12×(L-1))
Passiv suv(L)  = 5 × 1.20^(L-1) birlik/soat
Himoya(L)      = 30% + 2%×(L-1), maksimum 85%
```
25-darajada: 4,728 kg sigʻim, 47 soat chirish, 397 suv/soat, 78% himoya

### Ustaxona qoyasi
```
Ishlab chiqarish(L) = 20 × 1.22^(L-1) birlik/soat
Sigʻim(L)           = soatlik ishlab chiqarish × 10
Yigʻuvchi slot(L)   = 2 + butun(L/3)
```
25-darajada: 2,364/soat = **56,736/kun**, sigʻim 23,640, 10 slot

Oʻyinchi soatlik ishlab chiqarishni 4 resurs orasida oʻzi taqsimlaydi.

### Rol binolari (Razvedka, Jang, Himoya, Ov)
```
Ochadigan tier   = MIN(6, butun(bino darajasi / 4))
Askar sigʻimi(L) = 6 × 1.20^(L-1)
Mashq tezligi(L) = 1 + 0.04 × (L-1)
```
Narx koeffitsientlari: Razvedka 0.50 · Jang 0.70 · Himoya 0.60 · Ov 0.45

### Shifo gʻori
```
Sigʻim(L)        = 2 + 0.4 × (L-1) boʻri
Davolash vaqti(L) = 60 daqiqa / (1 + 0.05×(L-1))
```
25-darajada: 12 boʻri, 27 daqiqa

### Bozor
```
Almashinuv kursi(L) = MAX(1.1, 3.0 − 0.075×(L-1))
Kunlik limit(L)     = 200 × 1.20^(L-1)
Soliq(L)            = MAX(5%, 20% − 0.6%×(L-1))
```
25-darajada: 1.20:1 kurs, 15,899 limit, 6% soliq

---

## 6. Askarlar: 4 rol × 6 tier

### Rollar

| Rol | Vazifasi | Kuch | Tezlik | Chidam | Ish unumi | Mashq binosi |
|---|---|---|---|---|---|---|
| 🔍 Razvedkachi | Raqibni koʻrish, tuzoq topish | 8 | 22 | 30 | 0 | Razvedka qoyasi |
| ⚔️ Hujumchi | Reyd va toʻda janglari | 20 | 12 | 45 | 0 | Jang maydoni |
| 🛡 Himoyachi | In va omborni qoʻriqlash | 12 | 8 | 90 | 0 | Himoya devori |
| 🥩 Ovchi | Goʻsht va resurs yigʻish | 10 | 14 | 40 | 12 kg/soat | Ov soʻqmogʻi |

Ovchi 1-darajadan, qolgan 3 rol 4-darajadan ochiladi.

### Tierlar

```
Tier CP = (Kuch×2 + Tezlik×1.5 + Chidam×0.5) × 1.45^(tier-1) × (1 + 0.03 × alfa darajasi)
Maks tier = MIN(6, alfa darajasi ÷ 4, shu rol binosi ÷ 4)
```

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

**Misol:** 300 ta 1-tier askar → **188 ta 2-tier** (200 emas). Kuch 37,800 dan 34,400 ga tushadi.

**Nega baribir foydali:** 188 askar 300 tasidan kam goʻsht yeydi va bino sigʻimida kam joy oladi. Foyda kuchda emas — samaradorlikda.

### Qarshi-kuch uchburchagi

```
🛡 Himoyachi → ⚔️ Hujumchi → 🔍 Razvedkachi → 🛡 Himoyachi
```
Ustunlik ×1.30, zaiflik ×0.77, boshqa holatlarda ×1.00

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
Vaqt koeffitsienti = (toʻlganlik ÷ 60%)^1.8 , 0.50× va 3.00× orasida
Yakuniy vaqt = tier vaqti × bino jazosi × toʻlganlik koeff. ÷ mashq tezligi
Bino jazosi = (askar ÷ bino sigʻimi)^2 , maksimum 5×
```

| Toʻlganlik | Koeff. | Holat |
|---|---|---|
| 5–30% | 0.50× | Tez tiklanish — chegirma |
| 45% | 0.60× | Chegirma |
| **60%** | **1.00×** | Normal |
| 75% | 1.49× | Sekinlashdi |
| 90% | 2.07× | Juda sekin |
| 100% | — | Butunlay toʻxtaydi |

**Jangdan keyin tiklanish (70% yoʻqotish):** 25-daraja 322 askarni 1-tierda 10.7 soatda tiklaydi.

**Muhim qoidalar:**
- Jangovar quvvat qoʻshin **sigʻimidan emas, mavjud askarlardan** hisoblanadi
- Oʻlgan askar tieri bilan ketadi — 6-tierni tiklash 1-tierdan boshlash demak
- Davolanayotgan askar toʻlganlikka kirmaydi

---

## 7. PvP jang mexanikasi

### Raqib roʻyxati

Server **9 ta** raqib taklif qiladi: −1, teng, +1 daraja. 30 daqiqada yoki 3 hujumdan keyin yangilanadi.

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
| 1–6 | — | 🛡 Qalqon ostida |
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
EP = Σ(askar × tier CP × rol koeff. × qarshi-kuch koeff.)
R  = hujumchi EP ÷ himoyachi EP
Hujumchi yoʻqotishi  = MIN(90%, 40% ÷ R) × (1 ± 10%)
Himoyachi yoʻqotishi = MIN(90%, 40% × R) × (1 ± 10%)
Oʻlim = yoʻqotish × oʻlim ulushi (hujumchi 40%, himoyachi 25%)
Kasalxona = yoʻqotish × qolgani
```

| R | Natija | Hujumchi yoʻq. | Himoyachi yoʻq. | Hujumchi oʻlim/kasal | Himoyachi oʻlim/kasal |
|---|---|---|---|---|---|
| 0.50 | Magʻlubiyat | 80% | 20% | 32% / 48% | 5% / 15% |
| 0.75 | Magʻlubiyat | 53% | 30% | 21% / 32% | 8% / 23% |
| 1.00 | Durang | 40% | 40% | 16% / 24% | 10% / 30% |
| 1.25 | Gʻalaba | 32% | 50% | 13% / 19% | 13% / 38% |
| 1.50 | Gʻalaba | 27% | 60% | 11% / 16% | 15% / 45% |
| 2.00 | Gʻalaba | 20% | 80% | 8% / 12% | 20% / 60% |
| 3.00 | Gʻalaba | 13% | 90% | 5% / 8% | 23% / 68% |

### Jang tartibi (5 raund)

| Raund | Nima boʻladi |
|---|---|
| 0 — yaqinlashuv | Razvedkachilar tuzoqni aniqlaydi. Razvedkasiz — 15% tuzoq ehtimoli, zarar +20% |
| 1 — toʻqnashuv | Qarshi-kuch uchburchagi qoʻllanadi |
| 2–3 — asosiy jang | EP ga proporsional zarar, ±10% tasodif |
| 4 — hal qiluvchi | Kuchi 20% dan kam qolgan tomon chekinadi |
| 5 — yakun | Gʻolib aniqlanadi, oʻlja olinadi |
| Qaytish | Masofa boʻyicha. Yoʻlda hujum qilib boʻlmaydi |
| Hisobot | Ikkala tomon toʻliq jurnalni koʻradi |

### Qoʻshimcha qoidalar
- Bir raqibga kuniga 3 marta
- Razvedka bepul, 10 daqiqa kutish; muvaffaqiyatsiz boʻlsa 10% razvedkachi jarohatlanadi
- Yuborilgan askarlar inda yoʻq — shu vaqtda siz himoyasizsiz
- Yurish paytida qaytarib chaqirish mumkin
- Hujumdan keyin himoyachiga 8 soat qalqon; oʻzi hujum qilsa oʻchadi
- Mavsum hissasi faqat server tayinlagan janglardan

---

## 8. Oʻlja

```
Oʻlja = Ombordagi zaxira × (1 − Himoya%) × 0.22 × gʻalaba koeff. × daraja koeff. × takror koeff.
        lekin yuk sigʻimidan oshmaydi
Yuk sigʻimi = hujumchilar soni × 15 kg × (1 + 0.2 × tier)
```

| Daraja | Zaxira | Himoya | Himoyalanmagan | Yuk sigʻimi | Maks oʻlja | Kunlik ov | Nisbat |
|---|---|---|---|---|---|---|---|
| 5 | 39 | 30% | 27 | 21 | 6 | 13 | 46% ✅ |
| 10 | 114 | 44% | 64 | 72 | 14 | 38 | 37% ✅ |
| 15 | 243 | 56% | 117 | 135 | 26 | 81 | 32% ✅ |
| 25 | 606 | 78% | 218 | 363 | 48 | 202 | 24% ✅ |

**Asosiy qoida:** oʻlja kunlik ovning 50% idan oshmasligi kerak — aks holda oʻyinchilar ov qilishni tashlab, faqat bir-birini talaydi.

### Takror hujum koeffitsienti
1-hujum 1.00 → 2-hujum 0.50 → 3-hujum 0.25 → 4+ 0.10 (24 soat ichida)

### Gʻalaba koeffitsienti
Toʻliq gʻalaba 1.00 · Qisman 0.55 · Magʻlubiyat 0.00 · Qasos hujumi (24 soat) 1.20

### Olinmaydigan narsalar
Oy toshi · XP · binolar · boʻrilar (oʻlmaydi, jarohatlanadi)

### Qalqon tizimi
| Holat | Qalqon |
|---|---|
| Yangi oʻyinchi (1–6 daraja) | Toʻliq |
| Reydda 30%+ yoʻqotgan | 8 soat |
| Ketma-ket 2 marta yutqazgan | 16 soat |
| 72 soat oflayn | Uyqu qalqoni |
| Oʻzi hujum qilsa | Darhol oʻchadi |

---

## 9. Razvedka

```
Razvedka kuchi = razvedkachilar soni × tier koeffitsienti × (1 + 0.03 × daraja)
Nisbat = oʻz kuchi ÷ raqib kuchi
```

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
- Tavsiya: nisbat 0.95–1.05 oraligʻida natija 50/50 tasodifiy boʻlsin

---

## 10. Lager va oazis

### 🏕 Lager

```
Soatlik yigʻim (xom) = yuborilgan boʻrilar × Ustaxona soatlik ishlab chiqarishi × 0.10 × (1 + 0.05 × tier)
Lager ulushi (xom)   = (8 soatlik yigʻim) ÷ (Ustaxona kunlik ishlab chiqarishi)
Lager ulushi         = MIN(0.60, Lager ulushi (xom))   ← YANGI TAVAN
Soatlik yigʻim       = Lager ulushi × Ustaxona kunlik ishlab chiqarishi ÷ 8
```

> ⚠️ **Ikki tuzatish (Excel bilan solishtirilgach):**
> 1. **"Yuboriladi" ustuni notoʻgʻri edi** — avval 2/4/7/9/11 (eski, yangilanmagan qoʻshin jadvalidan qolgan raqamlar) yozilgan edi, toʻgʻrisi — qoʻshinning 50% i (bo'lim 6 jadvaliga mos): 5/11/37/77/230.
> 2. **Ulush cheksiz oʻsib ketardi** — formula matematik jihatdan Ustaxonaning oʻzini bekor qiladi (u ham numeratorda, ham denominatorda), shuning uchun ulush faqat qoʻshin hajmiga bogʻliq boʻlib qoladi, u esa ×1.20/daraja oʻsadi. Toʻgʻri "Yuboriladi" raqamlari bilan hisoblasa, 25-darajada ulush **997%** ga chiqadi (Excel oʻzi yozgan "5–60% sogʻlom" chegarasidan 16 baravar oshib) — bu Ustaxonani maʼnosiz qilib qoʻyardi. Yuqoridagi **60% tavan** shuni oldini oladi: boshqa hech qanday tizimga (Ustaxona, qoʻshin, narx) taʼsir qilmaydi, faqat Lager tizimining oʻzida ishlaydi.

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
| 🌕 Oy mehrobi | Oy toshi +1/kun | 1 | 20+ daraja, butun toʻda |

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
- Raqibga 30 daqiqa beriladi; rad etsa reytingdan ball yoʻqotadi
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
Mukofot = (shaxsiy ball ÷ klan jami balli) × urush fondi, 15% shift bilan
```

Misol (fond 50,000 tanga):

| Aʼzo | Askar | EP | Ulush | Mukofot |
|---|---|---|---|---|
| Alfa | 120 | 42,000 | 15% (shift) | 7,500 |
| Beta | 90 | 28,000 | 15% (shift) | 7,500 |
| Aʼzo A | 60 | 15,000 | 15.3% | — |
| Aʼzo B | 40 | 8,000 | 8.1% | 4,073 |
| Aʼzo C | 25 | 4,000 | 4.1% | 2,036 |
| Aʼzo D | 10 | 1,200 | 1.2% | 611 |

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
| 5 | 329 | 2,632 | 0.29% | $1.52 |
| 10 | 1,117 | 8,936 | 0.98% | $5.17 |
| 15 | 2,925 | 23,400 | 2.58% | $13.53 |
| 21+ | 9,558+ | 76,464+ | 5% (shift) | $26.25 |

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

**Muammo:** 20→25 daraja jami progressiyaning 47–72% ini yeydi (bo'lim 1 hisob-kitobi). Kech qoʻshilgan yoki uzoq tanaffusdan qaytgan oʻyinchi uchun bu masofa zerikarli tuyulishi mumkin.

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

**Toʻrt qatlamli himoya (birinchi versiyadan tuzatildi — ×2.5 juda tez yetib olishga imkon berardi):**
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
| Juftlik chegarasi | 3 jang/mavsum | 4-jangdan hissa 0 |
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

### Kundalik (4+1)
Ovchi (3 ov) · Quruvchi (1 bino) · Murabbiy (1 askar) · Jangchi (1 PvP) · Kirish bonusi

### Haftalik (4)
Katta ov (20 ov) · Sayohatchi (3 lager) · Tajovuzkor (10 PvP) · Toʻda aʼzosi (3 toʻda jangi)

### Bosqichli (10 yoʻnalish)
Quruvchi (5·15·40·80·150) · Toʻda alfasi (5·10·15·20·25 askar) · Murabbiy (birinchi 2/4/6-tier) · Ovchi (50·200·1000) · Toʻplovchi (10k·100k·1mln) · Jangchi (10·50·200) · Gʻolib (5·25·100) · Razvedkachi (20·100) · Egallovchi (1·3 oazis) · Sodiq (7·30·100 kun)

### Mukofot turlari

| ✅ Beriladi | ❌ Hech qachon |
|---|---|
| Resurs (byudjet ichida) | Doimiy stat bonusi |
| Qurilish/mashq tezlashtirishi | Tier sakrashi yoki bepul tier |
| Bepul davolash | Toʻda hajmini oshirish |
| Qalqon soatlari | Bino darajasini bepul koʻtarish |
| Unvon, ramka, skin | PvP da doimiy ustunlik |
| Mavsum ballari | Oy toshi |
| Bozor soligʻini vaqtincha kamaytirish | Oʻlja koeffitsienti |

**Qoida:** mukofot **vaqt** tejaydi, **kuch** bermaydi.

---

## 15. Tanishtiruv (1–5 daraja, 20 qadam, 15 daqiqa)

| # | Daraja | Yoʻriqchi matni | Harakat | Mukofot | Vaqt |
|---|---|---|---|---|---|
| 1 | 1 | Sen toʻdangni yoʻqotgan yolgʻiz boʻrisan. Omon qolish kerak. | Bosish | — | 0.5 |
| 2 | 1 | Mana quyon. Ov qilib koʻr. | Quyonni bosish | 5 kg goʻsht | 0.5 |
| 3 | 1 | Yashash uchun in kerak. Mana bu joy yaxshi. | Inni qoʻyish | In 1-daraja | 1 |
| 4 | 2 | Goʻsht buziladi. Uni saqlash uchun Oziq gʻori kerak. | Oziq gʻori qurish | Bepul tezlashtirish | 1 |
| 5 | 2 | Ovlagan goʻshtingni gʻorga sol. | Goʻshtni saqlash | 20 kg goʻsht | 0.5 |
| 6 | 2 | Qurilish uchun tosh kerak. Ustaxona qoyasini qur. | Ustaxona qurish | Bepul tezlashtirish | 1 |
| 7 | 2 | Ustaxonaga boʻri qoʻy — u sen uchun tosh yigʻadi. | Yigʻuvchi tayinlash | 100 tosh | 0.5 |
| 8 | 3 | Ov qilish uchun mashq kerak. Ov soʻqmogʻini qur. | Ov soʻqmogʻi | Bepul tezlashtirish | 1 |
| 9 | 3 | Birinchi ovchingni tayyorla. | Ovchi mashqi | 1 ovchi | 1 |
| 10 | 3 | Binolarni kuchaytirsang, koʻproq sigʻadi. | Oziq gʻori L2 | Bepul tezlashtirish | 1 |
| **11** | **4** | **Boʻri yolgʻiz kuchsiz. Endi toʻdang boʻladi!** | Toʻdani koʻrish | 3 boʻri | 0.5 |
| 12 | 4 | Toʻda bilan kattaroq oʻlja ovlash mumkin. | Toʻda ovi | 8 kg goʻsht | 1 |
| 13 | 4 | Jang qiladigan boʻrilar kerak. | Jang maydoni | Bepul tezlashtirish | 0.5 |
| 14 | 4 | Birinchi hujumchingni tayyorla. | Hujumchi mashqi | 1 hujumchi | 0.5 |
| 15 | 4 | Yolgʻiz boʻri omon qolmaydi. Toʻdaga qoʻshil. | Klanga qoʻshilish | Klan bonusi | 1 |
| 16 | 4 | Endi birinchi jang. Qoʻrqma — bu mashq jangi. | PvP (bot raqib) | Gʻalaba + 50 tosh | 1.5 |
| 17 | 5 | Raqibni oldindan koʻrish uchun razvedkachi kerak. | Razvedka qoyasi | Bepul tezlashtirish | 0.5 |
| 18 | 5 | Raqibni razvedka qilib koʻr. | Razvedka yuborish | Maʼlumot | 0.5 |
| 19 | 5 | Sening iningga ham hujum qilishadi. | Himoya devori | Bepul tezlashtirish | 0.5 |
| 20 | 5 | **Endi siz oʻyinga tayyorsiz. Omad, alfa!** | Yakun | Boshlangʻich paket | 0.5 |

### Qoidalar
- **5 marta bepul tezlashtirish** — tanishtiruvda hech narsa kutilmaydi
- **16-qadamdagi jang bot bilan** — birinchi tajriba gʻalaba boʻlishi shart
- **1–12 qadam qattiq qulf** — faqat koʻrsatilgan tugma ishlaydi
- **12-qadamdan keyin "Oʻtkazib yuborish"** tugmasi chiqadi
- Yakuniy paket: 500 goʻsht, 300 tosh, 200 shox-shabba, 1 bepul tier mashqi
- Yakunda darhol yangi maqsad: "Shifo gʻorini och — 6-daraja"
- 60 soniya harakatsizlikda koʻrsatma qayta miltillaydi
- **11-qadam eng muhim:** yolgʻizlikdan toʻdaga oʻtish — musiqa va animatsiya oʻzgarsin

---

## 16. Oflayn hisob

### Vaqt shkalasi

| Yoʻqlik | Ishlab chiqarish | Oziqlanish | Qoʻshin | PvP |
|---|---|---|---|---|
| 0–8 soat | Toʻliq (70% oflayn stavka) | Ombordan | Normal | Hujum qilinadi |
| 8–24 soat | Ombor toʻlguncha | Ombordan | Normal | Hujum qilinadi |
| 1–3 kun | Toʻxtaydi (ombor toʻla) | Zaxira kamayadi | Normal | Oʻlja koeff. 0.5× |
| 3–7 kun | Toʻxtagan | Ochlik rejimi | CP −30% | Uyqu qalqoni |
| 7+ kun | Toʻxtagan | Ochlik | Kuniga 1% ketadi (maks 50%) | Qalqon davom etadi |

### Ombor necha kunga yetadi

Oflaynda sigʻim **2× kengayadi**:

| Daraja | Kunlik goʻsht | Oddiy sigʻim | Oflayn sigʻim | Yetadi |
|---|---|---|---|---|
| 5 | 12 | 40 | 80 | 6.7 kun |
| 10 | 45 | 161 | 322 | 7.2 kun |
| 15 | 148 | 531 | 1,062 | 7.2 kun |
| 20 | 463 | 1,434 | 2,868 | 6.2 kun |
| 25 | 1,380 | 4,728 | 9,456 | 6.9 kun |

### Ochlik rejimi — askar YOʻQOLMAYDI
- Jangovar quvvat −30%, ishlab chiqarish −50%
- **Birinchi 7 kun hech kim ketmaydi**
- 7 kundan keyin kuniga 1%, maksimum 50%
- Goʻsht qoʻshilishi bilan jazolar darhol oʻchadi

### Qaytish ekrani
Sarlavha ("Qaytganingiz bilan, alfa! Siz 3 kun yoʻq edingiz") → hisobot → jang jurnali → 30 daqiqalik qalqon → qaytish paketi (1 kunlik goʻsht) → katta tugma "Toʻdani boq". Ketma-ket kunlar nolga tushmaydi.

### Texnik
- **Timestamp asosida, tick yoʻq.** Har resursda `last_update`; kirganda `(hozir − last_update) × stavka`, sigʻim bilan cheklanadi
- Navbatlar tugash vaqti bilan saqlanadi, oflaynda oʻzi tugaydi
- Oflayn stavka 70% — kirish uchun sabab, lekin jazo emas

---

## 17. Monetizatsiya

### Asosiy himoya

```
Tezlashtirish kunlik progressning 25% idan oshmaydi
```

Chegara tugagach tugma oʻchadi. Natija: **eng koʻp toʻlagan oʻyinchi bepul oʻynagandan 1.25× tez**, 5× emas.

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

| Masofa | Qaytish vaqti | Narx | $ |
|---|---|---|---|
| 5 km | 15 daq | 6 | $0.06 |
| 15 km | 45 daq | 6 | $0.06 |
| 30 km | 1.5 soat | 10 | $0.10 |
| 60 km | 3 soat | 15 | $0.15 |
| 100 km | 5 soat | 39 | $0.39 |

- ❌ Borish yoʻli — hech qachon
- ❌ Jangning oʻzi — hech qachon
- ✅ Qaytish yoʻli — PvP, lager, oazis
- Iningizga hujum kelayotgan boʻlsa tugma oʻchadi
- Kunlik 25% chegaraga kiradi

### Oy toshi paketlari

| Paket | Oy toshi | Narx | Bonus |
|---|---|---|---|
| Kichik | 100 | $1 | — |
| Oʻrta | 550 | $5 | +10% |
| Katta | 1,200 | $10 | +20% |
| Alfa | 3,300 | $25 | +32% |

### Doimiy xaridlar
Ikkinchi qurilish navbati 1,500 · Oflayn ombor +50% 800 · Avtomatik yigʻish 600 · Mavsum yoʻli 500/mavsum · Skin toʻplami 200–900

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

## 18. Ekranlar (5 tab)

### 🏔 In
Bino kartalari (8 ta) · resurs paneli · qurilish navbati (1–2 slot) · Ustaxona taqsimoti · Bozor · Shifo gʻori

### ⚔️ Jang
PvP roʻyxati (9 raqib) · qoʻshin yuborish oynasi · lager · oazis · jang jurnali · razvedka hisobotlari

### 🐺 Toʻda
Klan profili · aʼzolar va lavozimlar · toʻda urushi (taklif, eʼlon, jonli hisob, hissa jadvali) · klan chati · oazislar

### 📋 Vazifalar
Kundalik · haftalik · bosqichli · mavsum yoʻli

### 👤 Profil
Qoʻshin (4×6 jadval) · askar yigʻish va almashtirish · statistika va liga · sozlamalar (til, bildirishnoma, taʼtil) · doʻkon

---

## 19. Bildirishnomalar

Kuniga eng koʻpi **6 ta**. Tunda (23:00–08:00) faqat 1-ustuvorlik.

| Tur | Qachon | Ustuvorlik |
|---|---|---|
| `attack_incoming` | Hujum yoʻlga chiqqanda | 1 |
| `attack_result` | Jang tugagach (ikkala tomonga) | 1 |
| `war_declared` | Urush eʼlon qilinganda | 1 |
| `war_start` / `war_end` | Urush boshlanishi va yakuni | 1 |
| `camp_raided` | Lager bosib olinganda | 1 |
| `build_done` | Qurilish tugaganda (>1 soat) | 2 |
| `train_done` | Katta mashq partiyasi | 2 |
| `storage_full` | Ombor toʻlganda | 2 |
| `hunger_warning` | Goʻsht 12 soatga qolganda | 2 |
| `season_ending` | Mavsumga 6 soat | 3 |
| `daily_quests` | Kuniga bir marta | 3 |
| `comeback_2d` | 2 kun kirmasa | 3 |
| `comeback_7d` | 7 kun kirmasa (keyin toʻxtaydi) | 3 |

Taʼtil rejimida faqat `war_*` va `season_*`. 1-ustuvorlik byudjetdan tashqarida.

---

## 20. Lokalizatsiya

- **uz** (asosiy), **ru**, **en** — `locales` jadvalida
- Kodda matn yozilmaydi: `t('battle.result.win')`
- Til Telegram `language_code` dan, topilmasa `uz`; profilda oʻzgartiriladi
- Kalit tuzilishi: `bolim.element.holat`
- Boʻri va tier nomlari lokalizatsiya qilinadi; **klan va oʻyinchi nomi — yoʻq**
- Raqamlar va sanalar `Intl` formatida
- Bildirishnomalar oʻyinchi tilida
- Hajm: ~600 kalit

---

## 21. Texnik arxitektura

### Maʼlumotlar bazasi — 22 jadval
`players` · `player_resources` · `buildings` · `army` · `queues` · `marches` · `battles` · `scout_reports` · `match_offers` · `camps` · `oases` · `clans` · `clan_members` · `clan_wars` · `clan_war_contributions` · `quests` · `seasons` · `season_scores` · `transactions` · `speedup_usage` · `fairplay_flags` · `notifications` · `notification_budget` · `game_config` · `locales` · `analytics_events`

**`game_config`** — 70 ta balans parametri baza ichida. Kodda birorta raqam qattiq yozilmaydi.
**`army`** kompozit kaliti (player_id, role, tier) — har tier alohida qator, `alive`/`on_march`/`injured` bilan.

### API — 60 endpoint
10 boʻlim: holat va profil · binolar · qoʻshin · PvP · lager va oazis · klan · urush · vazifalar va mavsum · doʻkon · tanishtiruv va xizmat

Auth: Telegram `initData` HMAC-SHA256, har soʻrovda tekshiriladi.
Idempotentlik: `X-Request-Id` (UUID) barcha holat oʻzgartiruvchi `POST` larda.
Har javobda `state` snapshot — klient kamdan-kam `GET /state` chaqiradi.

### Cron

| Vaqt | Ish |
|---|---|
| Har daqiqa | Navbatlar, yurishlar, janglar, bildirishnoma |
| Har 5 daqiqa | Matchmaking roʻyxati |
| Har soat | Klan `power_cache`, oazis bonuslari |
| Har kun 00:00 | Kundalik vazifalar, tezlashtirish chegarasi, streak |
| Har dushanba | Haftalik vazifalar, mavsum, liga |
| Mavsum + 48 soat | Adolat auditi → toʻlov |

### Xavfsizlik
- Klientga hech qachon ishonilmaydi: narx, vaqt, CP, oʻlja serverda qayta hisoblanadi
- Har holat oʻzgarishi bitta tranzaksiyada (resurs yechish + navbat yaratish atomar)
- Jang natijasi faqat serverda; klient animatsiyani `log` dan chizadi

---

## 22. MVP doirasi (8–10 hafta)

### Kiritiladi
1–10 daraja · 3 bino (Oziq gʻori, Ustaxona, Jang maydoni) · 2 rol (ovchi, hujumchi) 3 tier · PvP 1v1 + oʻlja + razvedka · tanishtiruv (20 qadam) · kundalik vazifalar · oflayn hisob · uz tili · **yengil toʻda ovi**

> **Yengil toʻda ovi (MVP) vs Klan (v2) — muhim farq:** 5-darajadan boshlab asosiy oʻlja (jayron, 25 kg) yolgʻiz ovlanmaydi — bu **mexanik zaruriyat**, "toʻda majburiy" qoidasi shundan kelib chiqadi. MVP bosqichida bu talab rasmiy klan tizimisiz, **vaqtinchalik ov guruhi** orqali qondiriladi: 2–4 oʻyinchi bitta ov uchun birlashadi, aʼzolik, lavozim, xazina va urush kerak emas. Texnik jihatdan bu `clans`/`clan_members` jadvallarisiz, `marches.payload` ichida bir nechta `player_id` ni bogʻlaydigan oddiy "hunt_party" strukturasi bilan amalga oshiriladi. Rasmiy klan (aʼzolik, lavozim, xazina, toʻda urushi) v2 ga qoladi.

### v2 ga qoldiriladi
11–25 daraja · qolgan 5 bino · razvedkachi va himoyachi · 4–6 tier · **rasmiy klan tizimi** (aʼzolik, lavozim, xazina) va toʻda urushi · lager va oazis · mavsum va liga · monetizatsiya · **pul mukofoti** · ru va en

### Oʻlchanadigan raqamlar
D1 retention >30% · D7 >12% · tanishtiruv tugatish >70% · 4-darajaga yetish <15 daqiqa

---

## 23. Art yoʻnalishi

**Hozircha oddiy.** Bitta boʻri silueti + rol rangi + tier ramkasi. 25 ta boʻri rasmi yetarli (600 emas).

Rol ranglari: 🔍 koʻk · ⚔️ qizil · 🛡 yashil · 🥩 jigarrang
Tier ramkasi: 1–2 oddiy · 3–4 kumush · 5 oltin · 6 alangali

Batafsil art keyingi bosqichda qoʻshiladi.

---

## 24. Balans falsafasi — 7 qoida

1. **Kuch qoʻshish orqali oʻsadi, koʻpaytirish orqali emas.** 1-darajadan 25-gacha **bitta boʻrining CP**si ~149× oshadi (69→10,269), lekin **butun toʻdaning jangovar quvvati** ~6,092× oshadi (63→383,763 — Excel "Umumiy bogʻlanish" varagʻi). Farq — 460× qoʻshin oʻsishidan (1→460), statdan emas. Shuning uchun matchmaking ishlaydi. *(Tuzatish: avval "294×" yozilgan edi — bu raqam Excel manba bilan solishtirilganda hech qaysi ustunga mos kelmadi; toʻgʻri qiymatlar yuqorida.)*

2. **Har tizimda uch qulf.** Askar tieri: alfa darajasi ÷ 4, rol binosi ÷ 4, maksimum 6. Bitta yoʻl bilan tezlashtirib boʻlmaydi.

3. **Ishlab chiqarish narxdan sekin oʻsadi.** Ishlab chiqarish 1.22×, narx 1.30× — resurs har darajada qadrliroq boʻlib boradi.

4. **Oʻlja kunlik ovning 50% idan oshmaydi.** Aks holda oʻyinchilar ov qilishni tashlab, faqat bir-birini talaydi.

5. **Mukofot vaqt tejaydi, kuch bermaydi.** Vazifa, mavsum va pul — hech biri stat bermaydi.

6. **Yutqazgan tez tiklanadi, yutgan sekin oʻsadi.** Toʻlganlik koeffitsienti 0.5× va 3× orasida — farq vaqt bilan yopiladi, lekin gʻalaba baribir foydali.

7. **Hech kim hamma narsani yoʻqotmaydi.** Jangda maksimal yoʻqotish 90%, ochlikda 50%, boʻrilar oʻlmaydi — jarohatlanadi.

---

*Hujjat Blue Wolf balans jadvali (21 varaq, 5,300 formula), DB sxemasi (22 jadval) va API spetsifikatsiyasi (60 endpoint) bilan birga ishlatiladi.*

> ⚠️ **Fayl format ogohlantirishi:** `blue_wolf_darajalar.xlsx` haqiqiy Excel binary emas — bu `.xlsx` kengaytmali oddiy matn fayl (UTF-8, tab bilan ajratilgan). Excel/Google Sheets uni ocholmaydi ("buzuq fayl" xatosi beradi). Ishlab chiqarishga oʻtishdan oldin buni haqiqiy `.xlsx` ga (yoki CSV toʻplamiga) aylantirish kerak, aks holda jamoa balans jadvalini tahrirlay olmaydi.
