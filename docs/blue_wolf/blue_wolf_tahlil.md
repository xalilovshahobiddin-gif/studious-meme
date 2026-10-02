# Blue Wolf — hujjatlar tahlili (xato, kamchilik, ortiqcha joylar)

> **Holat:** barcha topilmalar tuzatildi — oxiridagi “9. Tuzatishlar holati” boʻlimiga qarang. Quyidagi 1–8 boʻlimlar asl hujjatlar (birinchi commit) haqida.

Tekshirilgan fayllar: `blue_wolf_GDD.md`, `blue_wolf_texnik_spec.md`, `blue_wolf_schema.md` (SQL), `blue_wolf_api.md`, `blue_wolf_darajalar.xlsx` (21 varaq).
Usul: har bir formula qayta hisoblandi, GDD jadvallari Excel bilan, Excel `Sozlamalar` varagʻi SQL `game_config` bilan, API esa sxema va GDD bilan solishtirildi.

**Qisqa xulosa:** konsepsiya va asosiy formulalar (XP, statlar, qoʻshin, jang yoʻqotishlari, toʻlganlik, tezlashtirish narxi) toʻgʻri hisoblangan. Lekin kod yozishdan oldin tuzatilishi **shart** boʻlgan 8 ta “oʻyinni buzadigan” xato bor. Eng muhimlari: ombor sigʻimi qurilish narxidan kichik, 1–3 darajada askar umuman boʻlmaydi, ov tizimi API/DB da yoʻq, MVP doirasi tanishtiruv bilan toʻqnashadi.

---

## 1. Kritik xatolar (shularsiz oʻyin ishlamaydi)

### 1.1 Ombor sigʻimi qurilish narxidan kichik — 11-darajadan keyin binoni koʻtarib boʻlmaydi
Excel `Binolar` varagʻi boʻyicha:

| Holat | Kerakli | Ombor sigʻimi | Natija |
|---|---|---|---|
| Ustaxona L10→L11, tosh | 1,591 | Ustaxona L10 sigʻimi 1,200 | ❌ yigʻib boʻlmaydi |
| Ustaxona L24→L25, tosh | 78,289 | L24 sigʻimi 19,380 | ❌ 4 baravar kam |
| Oziq gʻori L25, tosh | 52,192 | Ustaxona L24: 19,380 | ❌ |
| Jang maydoni L25, **goʻsht** | ≈54,800 kg | Oziq gʻori L24: 3,876 kg | ❌ 14 baravar kam |

Sabab: narx ×1.30 va bosqich koeff. ×1.25 bilan oʻsadi, sigʻim esa ×1.22 bilan. 24-qoida (“ishlab chiqarish narxdan sekin oʻsadi”) toʻgʻri, lekin **sigʻim** ham narxdan sekin oʻsib qolgan.
**Yechim (biri):** (a) sigʻim = keyingi daraja narxining ≥1.2 baravari boʻlsin; (b) qurilishga resursni “bosqichma-bosqich toʻlash” (navbatga qoʻyilgan bino resursni ombordan oqib oladi); (c) resurslar uchun alohida “Ombor” binosi.

### 1.2 1–3 darajada (va yangi qurilgan binoda) askar umuman yoʻq
`Maks tier = MIN(6, alfa darajasi ÷ 4, rol binosi ÷ 4)` → 1–3 darajada `butun(3/4) = 0`. Excel `Rollar` varagʻida ham 1-tier uchun “kerakli alfa 4, kerakli bino 4”.
Lekin: ovchi “1-darajadan ochiladi”, tanishtiruvning 9-qadamida (3-daraja) ovchi tayyorlanadi, 14-qadamda yangi qurilgan Jang maydoni (1-daraja) bilan hujumchi tayyorlanadi — formula boʻyicha ikkalasi ham **mumkin emas**.
**Yechim:** `Maks tier = MIN(6, 1 + butun((daraja−1) ÷ 4), ...)` yoki `MAX(1, ...)`. Shunda 4/8/12/16/20/24 ochilish nuqtalari 1/5/9/13/17/21 ga suriladi — jadvalni qayta tekshirish kerak.

### 1.3 Ov — asosiy siklning 1-qadami — DB va API da umuman yoʻq
Asosiy sikl “ov → resurs → ...”, lekin:
- API da `hunt` endpointi yoʻq (60 endpointning birortasi emas);
- `marches.kind` = `attack|scout|camp|oasis` — `hunt` yoʻq;
- MVP dagi “yengil toʻda ovi (hunt_party)” uchun na jadval, na endpoint bor;
- `texnik_spec 4.1` resurs hisobida goʻsht faqat **sarflanadi**, qayerdan kelishi yozilmagan.

Bundan tashqari **ikkita bir-biriga zid ov modeli** bor:
1. Ovchi rolining “Ish unumi 12 kg/soat” (passiv) — 1 ovchi kuniga 288 kg beradi. 4-darajada 2 ovchi = 576 kg/kun, ehtiyoj esa 9 kg/kun (**64×** ortiqcha), ombor 73 kg.
2. `Oziqlanish` varagʻidagi oʻlja zinapoyasi (kuniga 1–4 ta faol ov, sugʻur 8 kg, jayron 25 kg...).

**Yechim:** bitta modelni tanlash. Tavsiya: faol ov (zinapoya) asosiy, ovchi askarlar esa ov muvaffaqiyati/hajmiga koeffitsient. Keyin `POST /hunt`, `marches.kind='hunt'` va `hunt_parties` jadvali qoʻshiladi.

### 1.4 Tanishtiruv 15 daqiqada 4–5-darajaga yetkaza olmaydi
4-daraja uchun 130 XP, 5-daraja uchun 280 XP kerak. XP manbalari boʻyicha tanishtiruvdagi barcha harakatlar taxminan **10–20 XP** beradi:
- ov: 5 kg × 0.5 = 2.5 XP, toʻda ovi 8 kg × 0.5 = 4 XP;
- Oziq gʻori L2: (40+24) × 0.02 ≈ 1.3 XP; 1-darajali binolar tekin (narx 0) → 0 XP;
- ovchi mashqi: 8 suyak × 0.02 = 0.16 XP.

Excel “15 daqiqa realistik” deydi, lekin qadamlarda XP mukofoti yoʻq.
**Yechim:** har tanishtiruv qadamiga aniq XP mukofoti yozish (yigʻindisi 280) va `tutorial_step` mukofotini `game_config`/alohida jadvalda saqlash.

### 1.5 MVP doirasi oʻz tanishtiruvi bilan toʻqnashadi
| MVP da yoʻq | Lekin tanishtiruvda / MVP ichida kerak |
|---|---|
| Ov soʻqmogʻi (faqat 3 bino: Oziq gʻori, Ustaxona, Jang maydoni) | 8-qadam; ovchi shu binoda tayyorlanadi — MVP ning 2 rolidan biri |
| Razvedkachi roli (v2) | MVP da “razvedka” bor; 17–18-qadamlar |
| Himoya devori (v2) | 19-qadam |
| Klan (v2) | 15-qadam “Klanga qoʻshilish” |
| Shifo gʻori (v2) | Jangda 24–48% askar “kasalxona”ga tushadi — MVP da ularni davolash joyi yoʻq |
| “3 tier” | 1–10 darajada maks tier = `butun(10/4)` = **2** |
| “PvP 1v1” 4-darajadan | 1–6 daraja qalqon ostida, hujum oynasi 7-darajadan → MVP da PvP faqat 7–10 darajalar orasida |

**Yechim:** MVP ni qayta yozish (8-boʻlimdagi taklifga qarang).

### 1.6 Boʻrilar oʻladimi yoki yoʻqmi — hujjatlar bir-birini inkor qiladi
- “Oʻlmaydi”: GDD 24-qoida №7, GDD 8 (“boʻrilar oʻlmaydi, jarohatlanadi”), Excel `PvP oʻlja` (“Oʻlmaydi — 30% jarohatlanadi, 1–3 soat davolanadi”).
- “Oʻladi”: jang formulasi (hujumchi 40%, himoyachi 25% oʻlim ulushi), GDD 6 (“oʻlgan askar tieri bilan ketadi”), urush jadvali (6% / 18% oʻladi), ochlikda 7 kundan keyin ketish.

Bu iqtisodning markaziy qarori. Tavsiya: oʻlim bor (formula shunga qurilgan), 7-qoida va oʻlja boʻlimidagi matn tuzatiladi.

### 1.7 Kasr resurslar yoʻqoladi (sxema xatosi)
`player_resources` ustunlari `BIGINT`, `last_tick_at` esa soniyagacha `DATETIME`. Ustaxona 1-darajada 20/soat = 0.0056/soniya. Mini App har 2–5 soniyada soʻrov yuborsa, har safar qoʻshiladigan 0.01–0.03 butun songa yaxlitlanib **0 boʻladi**, `last_tick_at` esa oldinga suriladi → resurs hech qachon oʻsmaydi.
**Yechim:** `DECIMAL(20,4)` ustunlar + `DATETIME(3)`, yoki `last_tick_at` ni faqat butun birlik qoʻshilgan vaqtgacha surish.

### 1.8 Excel jadvalida formula yoʻq
Faylda 21 varaq bor, lekin **0 ta formula** — hammasi tayyor qiymat. “Faqat koʻk kataklarni oʻzgartiring, qolgani qayta hisoblanadi” ishlamaydi; “5,300 formula” daʼvosi bu faylga toʻgʻri kelmaydi. Balansni oʻzgartirish uchun formulalarni tiklash yoki jadvalni skript (PHP/Python) bilan generatsiya qilish kerak.
Shu bilan birga GDD oxiridagi ogohlantirish (“xlsx aslida tab bilan ajratilgan matn”) **notoʻgʻri** — fayl haqiqiy Excel 2007+ formatida, oddiy ochiladi. Bu ogohlantirishni olib tashlash kerak.

---

## 2. Balans xatolari

| # | Muammo | Hisob | Tavsiya |
|---|---|---|---|
| 2.1 | Oy nuri passivi ehtiyojdan 3.6× koʻp | `0.03 × qoʻshin × 24 = 0.72` /kun, ehtiyoj `0.2 × qoʻshin` | Oy mehrobining maʼnosi qolmaydi. `0.006–0.007` qilish yoki ehtiyojning ~50–70% ini qoplasin |
| 2.2 | Oy mehrobi bonusi chalkash | Oazis jadvali: “**Oy toshi** +1/kun” (premium valyuta!), 4-boʻlim izohi uni oy nuri deb hisoblaydi | Oy toshi mukofot sifatida taqiqlangan (GDD 14). “Oy nuri +X%/kun” deb yozish; 25-daraja 92 birlik/kun talab qiladi — “+1” juda kam |
| 2.3 | Suv deyarli cheksiz | L1: 120 suv/kun, ehtiyoj 0.4; L25: 9,528 vs 626 | Suvni 10–15× kamaytirish yoki resursni olib tashlash (“chidam tiklash” mexanikasi hech qayerda yozilmagan) |
| 2.4 | Shifobaxsh oʻt manbai va sarfi yoʻq | “Oʻrmon, togʻ” — mexanika yoʻq; davolash narxi yozilmagan | Davolash narxini (oʻt) va oʻt manbaini belgilash, yoki MVP dan chiqarish |
| 2.5 | Goʻsht chirishi oflayn modelni buzadi | Chirish 12–47 soat, oflayn ombor esa “6–7 kunga yetadi” | Chirish faqat ombordan tashqaridagi goʻshtga taalluqli boʻlsin yoki olib tashlansin. Sxema va spec da chirish yoʻq |
| 2.6 | Ochlik ikki xil taʼriflangan | GDD 4: <30% → tezlik −15%, CP −20%; >80% → kuch +10%. GDD 16 + config: CP −30%, ishlab chiqarish −50% | Bitta model qoldirish |
| 2.7 | XP ulushi notoʻgʻri | “20→25 progressiyaning 47–72% i” — haqiqatda (592,680−113,480)/592,680 = **81%**. “Bo'lim 1 hisob-kitobi” degan joy mavjud emas | Raqam va havolani tuzatish |
| 2.8 | “Toʻlov qilgan 1.25× tez” daʼvosi | “Ikkinchi qurilish navbati” bino tezligini 2× qiladi | Ikkinchi navbatni tezlashtirish limitiga bogʻlash yoki daʼvoni oʻzgartirish |
| 2.9 | Urush mukofoti misolida xato | Aʼzo A: 15,000 / 98,200 = 15.3% → shift 15% → **7,500** boʻlishi kerak, jadvalda “—”. Shiftdan keyin 20,780 tanga taqsimlanmay qoladi | Ortib qolgan fond qayerga ketishini yozish (qayta taqsimlash yoki keyingi fondga) |
| 2.10 | Qaytish tezlashtirish narxlari formula bilan chiqmaydi | 15 daq va 45 daq ikkalasi 6; 5 soat 39 (formula: 159 × 0.6 ≈ 95) | Formulani aniq yozish |
| 2.11 | GDD oʻlja jadvali eskirgan | L25: GDD maks oʻlja 48, yuk 363 — Excel: 200 va 6,831; L10: 14 vs 17 | Excel qiymatlariga almashtirish |
| 2.12 | 22/24/25-daraja ochilishlari balans qoidasiga zid | “Tungi reyd — hujum ×2”, “urushda toʻliq tiklanish”, “+10% doimiy bonus” — 24-qoida №5 va “doimiy stat bonusi ❌” ga qarshi | Kosmetik/qulaylik ochilishlarga almashtirish |
| 2.13 | Takror hujum “4+ = 0.10” hech qachon ishlamaydi | Bir raqibga kuniga 3 hujum limiti 4-hujumga yoʻl qoʻymaydi | Qatorni olib tashlash yoki limitni oshirish |

---

## 3. Hujjatlararo nomuvofiqliklar

| Mavzu | A hujjat | B hujjat |
|---|---|---|
| Juftlik chegarasi | PvP: 3 hujum/**kun** (GDD 7, config `pair_limit`) | Adolat: 3 jang/**mavsum** (GDD 13, Excel) |
| Hujumdan keyingi qalqon | GDD 7: har hujumdan keyin 8 soat | GDD 8 / Excel: faqat 30%+ yoʻqotganda |
| Haftalik vazifalar soni | GDD 14: 4 ta | Excel `Sozlamalar`: 3 ta |
| PvP ochilishi | GDD 2: 4-daraja “PvP arena” | Qalqon 1–6, hujum oynasi 7-darajadan |
| Askar mashqi narxi | Excel `Rollar`: tier mashqi 200 goʻsht / 80 suyak / 2 soat, ×2.2 | Excel `Askar iqtisodi` + GDD: yangi askar 20/8/4 daq; almashtirish 60% — **uchta** model |
| Resurslar soni | GDD: “7 resurs” | Aslida 8 ta (goʻsht, suv, oʻt, oy nuri + 4 qurilish); sxemada 7 ta — **oy nuri yoʻq**; spec resurs panelida oʻt va oy nuri yoʻq |
| Bino kartalari | Spec: 9 karta (Bosh in bilan) | GDD 18: 8 karta |
| Oflayn ombor | Oflayn ×2.0 | Doʻkon “Oflayn ombor +50%” — 2.5× mi yoki 3× mi? |
| `DEN_AUTO_LEVEL` | API 4-boʻlimda ishlatiladi | API xato kodlari jadvalida yoʻq |
| Jadval soni | GDD 21: “22 jadval” | Sxemada **26** ta (roʻyxatning oʻzida ham 26 nom) |
| Config soni | GDD: “70 parametr” | SQL da **78**; Excel `Sozlamalar`da ~170 |

---

## 4. Yetishmayotgan narsalar

### 4.1 `game_config` — Excel dagi ~90 parametr SQL ga koʻchirilmagan
Masalan: binolarning bazaviy narxlari (gʻor 100/60, ustaxona 150/100/40, maydon 180/90/150, shifo, bozor), vaqt koeffitsientlari (1.0/1.2/0.8/1.3/...), rol binosi narx koeffitsientlari, urush garovi 0.05, urushdagi oʻlim ulushi (0.30 / 0.45), oʻlja yuki (15 kg, +0.2/tier), razvedka chegaralari (1.0/1.5/2.5), lager (0.10, +0.05/tier, 8 soat, 50%), taʼtil (min 24, maks 168 soat, 250/kun), oazis ushlab turish, bozor, shifo, gʻor himoyasi va chirish, navbat bekor qilishda 80% qaytish.
“Kodda raqam yoʻq” qoidasi uchun bularning hammasi kerak → `Sozlamalar` varagʻidan avtomatik INSERT generatsiya qilish tavsiya etiladi.

### 4.2 Jang formulasidagi aniqlanmagan qismlar
- `role_coef` — formulada bor, hech qayerda taʼriflanmagan.
- Aralash qoʻshinlarda qarshi-kuch koeffitsienti qanday qoʻllanadi (hujumchi 3 rol × himoyachi 4 rol)? Matritsa bilan vaznlangan formula kerak.
- Gʻalaba/durang/magʻlubiyat chegarasi: durang faqat R = 1.00 da-mi? (masalan 0.95–1.05 = durang).
- 5 raund tavsifi (tuzoq 15%, +20% zarar, <20% kuch qolsa chekinish) yoʻqotish formulasida aks etmagan.
- Himoya devori himoyachiga qanday bonus beradi — yozilmagan.

### 4.3 DB da yoʻq jadval/ustunlar
- `X-Request-Id` idempotentligi uchun jadval (`request_id → javob`) — API talab qiladi, sxemada yoʻq.
- Bildirishnoma sozlamalari (tur boʻyicha yoqish/oʻchirish) va oʻyinchi **vaqt zonasi** (23:00–08:00 qoidasi uchun; Telegram tz bermaydi — klient `Intl` dan yuborishi kerak).
- Ov / `hunt_party`, Ustaxona yigʻuvchi slotlari (tanishtiruv 7-qadam), bozor kunlik limiti sarfi, raqib roʻyxatini yangilash hisoblagichi, bepul taʼtil soatlari (48 soat/oy), mavsum yoʻli va skinlar egaligi, klan reyting bali (urushni rad etsa ball yoʻqotadi), 5-darajadagi “toʻda umumiy ombori”.
- `marches.kind` da `hunt` va `war` yoʻq — urushga yuborilgan askarlarning `on_march` holati qayerda kuzatiladi, nomaʼlum.
- `oy nuri` resurs ustuni.

### 4.4 API da yoʻq endpointlar
`POST /hunt` (va toʻda ovi), Ustaxonaga yigʻuvchi tayinlash, `POST /wars/:id/decline`, klanga qoʻshilish soʻrovini tasdiqlash, `GET /march/:id`. `POST /clans/:id/kick` tanasida kimni chiqarish koʻrsatilmagan → `/clans/:id/members/:player_id/kick` qilish kerak.

### 4.5 Taʼriflanmagan mexanikalar (ochilish jadvalida bor, dizayni yoʻq)
Co-op boss (11), toʻda taktikasi (15), 20v20 (16), ittifoq (17), elita reyd/hudud (18), muz davri zonasi (20), afsona bossi (21), tungi reyd (22), juft hujum (23), zanjirni uzish (24), himoya urushi (13), haftalik turnir (14), “dasht zonasi” hududi (10 — oazisdan farqi nima?).

---

## 5. Texnik eslatmalar

1. **Telegram Stars toʻlovi** alohida `/shop/webhook` ga emas, **bot webhook**iga `pre_checkout_query` (10 soniyada javob berish shart) va `successful_payment` update sifatida keladi. Webhookni `X-Telegram-Bot-Api-Secret-Token` bilan tekshirish kerak.
2. **Bildirishnomalar:** bot faqat botni ishga tushirgan yoki `allows_write_to_pm` bergan foydalanuvchiga yoza oladi → Mini App ichida `requestWriteAccess()` soʻrash kerak.
3. **“Oflayn” taʼrifi yoʻq:** resurs soʻrov paytida hisoblanadi, server oʻyinchi qachon onlayn boʻlganini bilmaydi. Masalan: `last_seen_at` dan keyin 5 daqiqadan koʻp boʻlgan qism — oflayn (70%).
4. **Ochlik vaqti:** `hunger_since = now` emas, goʻsht aynan **qachon** 0 ga tushganini hisoblash kerak (oraliqni boʻlib hisoblash).
5. **Parallel soʻrovlar:** cron va foydalanuvchi soʻrovi bir yurishni ikki marta hisoblamasligi uchun `SELECT … FOR UPDATE` (yoki `state` boʻyicha shartli UPDATE) kerak. Resurs qatori ham shunday qulflanadi.
6. **Cron har daqiqa** (ISPmanager): jang 60 soniyagacha kechikadi → raqib ilovani ochganda jang “dangasa” (lazy) usulda ham hisoblansin.
7. Xato kodlari: `PAIR_LIMIT` va `SPEEDUP_CAP` uchun 429 (rate limit maʼnosi) emas, 400/409 toʻgʻriroq.
8. `players.clan_id` va `clan_members.player_id` — bitta maʼlumotning ikki manbai; bittasini qoldirish kerak.
9. Bir qator jadvallarda tashqi kalit (FK) yoʻq (`battles`, `clan_members.player_id`, `clans.leader_id` ...). `ON DELETE CASCADE` esa `status='deleted'` (yumshoq oʻchirish) bilan birga chalkashlik keltiradi.
10. Repodagi hozirgi frontend (`index.html`, `js/game.js`) — Phaser “Blue Wolf Run” yuguruvchi oʻyini; bu dizaynga mos emas. Undan faqat splash ekran va Telegram WebApp init qismi qayta ishlatiladi.

---

## 6. Ortiqcha (olib tashlash yoki soddalashtirish mumkin)

- Hech qachon yetib boʻlmaydigan chegaralar: gʻor himoyasi “maks 85%” (L25 da 78%), bozor kursi “MIN 1.1” (L25 da 1.2), soliq “MIN 5%” (L25 da 5.6%), toʻlganlik “maks 3.0×” (100% toʻlganlikda formula 2.51× beradi; jadvaldagi “toʻxtaydi” ham formulaga mos emas).
- `queues.building_type` ENUM idagi `'den'` — hech qachon ishlatilmaydi.
- `stage_*` uchun 11–15 darajaning 1.00 koeffitsienti configda yoʻq (yashirin) — aniq qoʻshish yaxshiroq.
- GDD va spec da bir xil boʻlimlar ikki marta yozilgan (ekranlar, bildirishnomalar, lokalizatsiya, cron, MVP). Bittasi oʻzgarsa ikkinchisi eskirib qoladi (allaqachon shunday boʻlgan — masalan 22/26 jadval). Spec da qoldirib, GDD dan havola qilish tavsiya etiladi.
- Hujjatlar ichidagi “tuzatildi / avval 48 yozilgan edi / v2 tuzatish” izohlari — tarix git da saqlanadi, matnni chalkashtiradi.
- MVP uchun: mavsum, adolat graf tahlili, pul mukofoti, oazis, lager — toʻgʻri v2 ga qoldirilgan, lekin sxemada ham MVP uchun keraksiz 10+ jadval bor; ularni keyinroq migratsiya bilan qoʻshish mumkin.

---

## 7. Hammasi toʻgʻri chiqqan joylar (tekshirildi)

XP narxi va jami XP, kuch/tezlik/chidam/CP, qoʻshin sigʻimi (10 × 1.2^(L−4)), oziqlanish jadvali va kerakli gʻor darajasi, bino L25 narx/vaqt jadvali (Excel bilan mos), Ustaxona/Oziq gʻori/Shifo/Bozor L25 qiymatlari, tier CP (alfa 19), almashtirish (300 → 188, 37,800 → 34,404), tier piramidasi ulushlari, toʻlganlik koeffitsientlari, jang yoʻqotish jadvali, lager (tavan bilan), tezlashtirish narxlari (10/26/52/93/159/264), oy toshi paketlari, mavsum fondi (525,000 tanga, 5% = 26,250), API dagi 60 endpoint va MVP dagi 23 endpoint soni.

---

## 8. Tavsiya etilgan keyingi qadamlar

1. **Yagona manba:** `Sozlamalar` varagʻi → skript bilan `game_config` INSERT va GDD jadvallari generatsiya qilinadi (qoʻlda koʻchirish toʻxtaydi).
2. **8 ta kritik xatoni hal qilish** (1-boʻlim) — ayniqsa ombor/narx, tier formulasi, ov modeli, oʻlim qoidasi.
3. **MVP ni qayta belgilash** (taklif):
   - Binolar: In (avto), Oziq gʻori, Ustaxona, Ov soʻqmogʻi, Jang maydoni, Shifo gʻori (soddalashtirilgan);
   - Rollar: ovchi + hujumchi, tier 1–2; razvedkani hujumchi “koʻz” sifatida soddalashtirish yoki razvedkachini MVP ga qoʻshish;
   - MVP da yangi oʻyinchi qalqonini 4-darajagacha tushirish (yoki 4–6 da bot raqiblar), aks holda PvP faqat 7–10 darajada boʻladi;
   - Tanishtiruvdan klan qadamini olib tashlash (yoki “ov guruhiga qoʻshilish”ga almashtirish), har qadamga XP yozish.
4. Sxemaga: `DECIMAL` resurslar, `oy nuri`, `hunt` yurishlari, idempotentlik va bildirishnoma sozlamalari jadvallari.
5. Shundan keyin — reja boʻyicha tanishtiruv oqimini qurish.

---

## 9. Tuzatishlar holati

Barcha fayllar shu papkada: `blue_wolf_GDD.md`, `blue_wolf_texnik_spec.md`, `blue_wolf_api.md`, `blue_wolf_schema.sql`, `blue_wolf_darajalar.xlsx`, `blue_wolf_game_config.sql` (generatsiya), `tools/blue_wolf_config.py`.

### Kritik xatolar

| # | Muammo | Qaror | Qayerda |
|---|---|---|---|
| 1.1 | Ombor sigʻimi < qurilish narxi | Qurilish resurslari ombori **cheklanmagan**; Ustaxona “sigʻimi” — 10 soatlik **bufer** (yigʻib olish kerak). Goʻsht bino narxidan olib tashlandi (rol binolari va Shifo gʻorida **teri** bilan almashtirildi — L25 jami narxlar oʻzgarmadi), shu bilan teri ham ishlatiladigan boʻldi | GDD 3, 5 · Excel `Binolar`, `Sozlamalar` · sxema `buf_*` |
| 1.2 | 1–3 darajada askar yoʻq | `Maks tier = MAX(1, MIN(6, daraja÷4, bino÷4))` — 1-tier har doim ochiq; boshqa tierlar oʻzgarmadi | GDD 5, 6, 24 · Excel `Rollar`, `Askar iqtisodi`, `Binolar` |
| 1.3 | Ov tizimi yoʻq / ikki model | Bitta model: 1 soatlik **ov yurishi**, ovchi unumi = 5 × kunlik ehtiyoj kg/soat (kuniga 4 ov ≈ sarfning 3×), oʻljaning minimal toʻdasi, yolgʻiz ov (1–3), ov guruhi (2–4 oʻyinchi). `marches.kind='hunt'`, `hunt_parties`, `/hunt*` endpointlari | GDD 4 · API 6 · sxema · `Sozlamalar` “Ov” |
| 1.4 | Tanishtiruv XP si yetmaydi | Har qadamga XP (jami 330), tanishtiruvda XP faqat qadamlardan; skip qilinganda ham XP beriladi. Generator daraja/qadam mosligini tekshiradi | GDD 1, 15 · Excel `Tanishtiruv` |
| 1.5 | MVP ↔ tanishtiruv | MVP: In + 6 bino, 3 rol (ovchi, hujumchi, razvedkachi), 1–2 tier, botlar 4-darajadan, PvP 7–10; tanishtiruvda klan → ov guruhi, Himoya devori → yigʻib olish | GDD 2, 15, 22 · spec 5 |
| 1.6 | Boʻrilar oʻladimi | Oʻladi (formula boʻyicha 25–40%), qolgani jarohatlanadi; 7-qoida va oʻlja matni tuzatildi | GDD 8, 24 · Excel `PvP oʻlja` |
| 1.7 | Kasr resurs yoʻqoladi | `DECIMAL(20,4)` + `DATETIME(3)`; MySQL 8.0.46 da sinaldi (0.0056 saqlanadi) | sxema |
| 1.8 | Excel da formula yoʻq | `Sozlamalar` — yagona kiritish; `tools/blue_wolf_config.py` SQL ni yaratadi va 11 turdagi balans tekshiruvini bajaradi. GDD dagi “xlsx — matn fayl” ogohlantirishi olib tashlandi | tools · GDD 21 |

### Balans va nomuvofiqliklar

| # | Qaror |
|---|---|
| 2.1–2.2 | Oy nuri passivi 0.006/askar/soat (ehtiyojning 72%); Oy mehrobi — **oy nuri +40%** (100%), oy toshi emas; yetishmasa CP −15% |
| 2.3 | Passiv suv `0.25 × 1.25^(L−1)`/soat (ehtiyojning ~2×); yetishmasa yurish −20% |
| 2.4 | Oʻt: ovdan 10%; davolash 2 × tier oʻt |
| 2.5 | Chirish olib tashlandi: sigʻimdan ortiq goʻsht saqlanmaydi |
| 2.6 | Bitta ochlik modeli (CP −30%, ishlab chiqarish −50%) |
| 2.7 | 81% ga tuzatildi |
| 2.8 | Ikkinchi navbat 10-darajada hammaga bepul; sotuvda faqat erta ochish |
| 2.9 | Aʼzo A = 7,500; shiftdan ortgan 20,779 → klan xazinasi |
| 2.10 | Formula: `ceil(0.6 × Σ blok narxi)` → 6 · 6 · 16 · 32 · 96 |
| 2.11 | GDD oʻlja va mavsum jadvallari Excel qiymatlariga almashtirildi |
| 2.12 | 22/24/25 ochilishlari kuch emas — tezlik, davolash, ishlab chiqarish |
| 2.13 | “4+ hujum 0.10” olib tashlandi |
| 3 | Juftlik: 24 soatda 3 hujum (PvP) va mavsumda 3 jang hissasi (adolat) — ikki xil qoida aniq nomlandi · qalqon faqat 30%+ yoʻqotganda · haftalik vazifa 4 ta · PvP 7-darajadan, 4–6 da botlar · askar narxi — bitta model · 8 resurs · 9 karta · oflayn 2.0 / 2.5 · `DEN_AUTO_LEVEL` jadvalda · 32 jadval, 271 parametr |
| 4.1 | Excel dagi barcha parametrlar + yangi parametrlar `game_config` da (271) |
| 4.2 | Aralash qoʻshin qarshi-kuch formulasi, `role_coef` olib tashlandi, natija chegaralari, tuzoq, raundlar, Himoya devori bonusi — GDD 7 |
| 4.3 | `request_log`, `player_settings` (tz, bildirishnomalar), `player_counters`, `player_items`, `hunt_parties`, `marches.kind` (`hunt`, `war`), `oy nuri`, `clans.rating`, botlar uchun ustunlar |
| 4.4 | `/hunt*`, `/wars/:id/decline`, klan soʻrovlari, `GET /march/:id`, kick yoʻli, `/bot/webhook` |
| 4.5 | Taʼriflanmagan ochilishlar (v3) deb belgilandi |
| 5 | Stars — bot webhook (`pre_checkout_query` 10 soniya), `requestWriteAccess`, `tz`, oflayn taʼrifi, ochlik vaqti, `FOR UPDATE`, lazy hisob, 429 → 400, `players.clan_id` olib tashlandi, FK lar qoʻshildi |
| 6 | Erishib boʻlmaydigan chegaralar va `occupancy_max` olib tashlandi, `'den'` navbat ENUM idan chiqarildi, `stage_normal` aniq qoʻshildi, takroriy boʻlimlar spec ga havola qilindi, “tuzatildi” izohlari tozalandi |
