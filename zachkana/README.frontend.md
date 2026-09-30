# zachkana.uz — qishloq sayti

Zachkana qishlogʻining raqamli xotirasi: **shajara**, **qishloq tarixi**, **xronologiya**, **faxriylar** va qishloqdoshlar uchun **suhbat (chat)**.
Sayt PWA sifatida qurilgan va oʻzining **Zachkana UI** dizayn tizimiga ega.

> Hozirgi ism, sana va voqealar — dizayn uchun **namuna maʼlumotlar** (`js/data.js`). Haqiqiy maʼlumotlar bilan almashtiriladi.

## Tuzilishi

```
zachkana/
├── index.html            ilova qobigʻi (SPA, hash-router)
├── manifest.webmanifest  PWA manifest (ikonkalar, shortcut'lar)
├── sw.js                 service worker — oflayn rejim
├── ui/
│   ├── zachkana-ui.css   Zachkana UI: tokenlar + komponentlar (z-*)
│   ├── zachkana-icons.js 50+ oʻz ikonalari (SVG sprite)
│   └── index.html        dizayn tizimi hujjati / koʻrgazmasi
├── css/app.css           sahifa joylashuvi (wap / web)
├── js/app.js             sahifalar, shajara daraxti, chat, PWA
├── js/data.js            namuna maʼlumotlar
├── assets/               logotip (SVG)
└── icons/                PWA ikonkalari (192, 512, maskable, apple)
```

## Sahifalar

| Manzil | Tavsif |
| --- | --- |
| `#/` | Bosh sahifa: qishloq manzarasi, raqamlar, eʼlonlar, “Bugun tarixda”, faxriylar |
| `#/shajara` | Oila daraxti: urugʻlar, surish/kattalashtirish (sichqoncha, barmoq, pinch), qidiruv, roʻyxat koʻrinishi, shaxs kartasi, qarindosh qoʻshish |
| `#/tarix` | Qishloq tarixi: boblar, mundarija, iqtiboslar, material yuborish |
| `#/xronologiya` | Davrlar boʻyicha vaqt chizigʻi |
| `#/faxriylar`, `#/faxriylar/:id` | Faxriylar roʻyxati (toifalar, qidiruv) va shaxsiy sahifa, xotiralar |
| `#/chat`, `#/chat/:kanal` | Kanallar va suhbat (demo: xabarlar qurilmada saqlanadi) |
| `#/menyu`, `#/profil` | Telefon menyusi, sozlamalar, kirish (SMS) |

## Wap va web — avtomatik

- **< 1024px** (telefon, planshet): yuqori panel + pastki tab panel, varaqlar pastdan chiqadi.
- **≥ 1024px** (kompyuter): chap yon panel, keng setkalar, chat ikki ustunda.
- Yorugʻ / qorongʻi mavzu (tizimga qarab yoki qoʻlda), iPhone safe-area.

## PWA

- Bosh ekranga oʻrnatish (Android — tugma orqali, iOS — koʻrsatma).
- Oflayn: ilova qobigʻi va koʻrilgan sahifalar keshlanadi; oflayn yozilgan xabar navbatga qoʻyiladi.
- Service worker faqat HTTPS yoki `localhost`da ishlaydi.

## Ishga tushirish

Build shart emas — oddiy statik server yetarli:

```bash
cd zachkana
npx http-server -p 8080 .
# http://localhost:8080 — sayt
# http://localhost:8080/ui/ — Zachkana UI dizayn tizimi
```

## Keyingi qadamlar (backend)

Hozircha frontend dizayn va prototip. Haqiqiy sayt uchun: foydalanuvchilar va SMS-kirish, shajara uchun maʼlumotlar bazasi va moderatsiya, real vaqtli chat (WebSocket), fayl/surat yuklash, push-bildirishnomalar.
