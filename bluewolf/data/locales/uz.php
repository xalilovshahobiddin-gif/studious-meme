<?php
// Oʻzbekcha lokalizatsiya (asosiy til). Kalit tuzilishi: bolim.element.holat
// bin/install.php bularni `locales` jadvaliga yozadi; klient GET /locales/uz orqali oladi.
return [
  // Navigatsiya
  'nav.den' => 'In', 'nav.battle' => 'Jang', 'nav.pack' => 'Toʻda', 'nav.quests' => 'Vazifalar', 'nav.profile' => 'Profil',

  // Umumiy
  'common.level' => 'Daraja', 'common.done' => 'Tayyor', 'common.now' => 'Hozir', 'common.next' => 'Keyingi',
  'common.save' => 'Saqlash', 'common.saved' => 'Saqlandi', 'common.soon' => 'Tez orada',
  'common.soon_long' => 'Bu boʻlim keyingi versiyada ochiladi.',
  'time.h' => 'soat', 'time.m' => 'daq', 'time.s' => 'son',

  // Resurslar
  'res.meat' => 'Goʻsht', 'res.stone' => 'Tosh', 'res.wood' => 'Shox-shabba', 'res.bone' => 'Suyak', 'res.moonstone' => 'Oy toshi',
  'res.meat.info' => 'Goʻsht: {v} / {cap} kg · toʻda soatiga {rate} kg yeydi. Ov qilib toʻldiring.',
  'res.meat.full' => 'Oziq gʻori toʻla — yangi oʻlja sigʻmaydi. Gʻorni kuchaytiring yoki goʻshtni sarflang.',
  'res.stone.info' => 'Tosh: {v} · ustaxonada soatiga +{rate}',
  'res.wood.info' => 'Shox-shabba: {v} · ustaxonada soatiga +{rate}',
  'res.bone.info' => 'Suyak: {v} · ustaxonada soatiga +{rate}',
  'res.moonstone.info' => 'Oy toshi: {v} · tezlashtirish uchun',

  'flag.hunger' => '🍂 Ochlik', 'flag.shield' => '🛡 Qalqon', 'flag.incoming' => '⚠️ Hujum!',
  'wolf.class.Haqiqiy' => 'haqiqiy boʻri', 'wolf.class.Qadimgi' => 'qadimgi boʻri', 'wolf.class.Mifologik' => 'afsonaviy boʻri',

  // In
  'den.queues' => 'Navbat', 'den.queue_empty' => 'Navbat boʻsh — bino quring yoki askar tayyorlang.',
  'den.free_speedups' => '⚡ bepul: {n}', 'den.buildings' => 'Binolar',
  'den.meat_rate_short' => '−{v} kg/soat',
  'den.meat_rate' => 'Toʻda soatiga {v} kg goʻsht yeydi',
  'hunt.go' => 'Ovga chiqish', 'hunt.title' => 'Ov', 'hunt.on' => '{prey} ovi…', 'hunt.started' => 'Ov boshlandi!',
  'hunt.solo' => 'yolgʻiz', 'hunt.desc' => 'Alfa ovga chiqadi. Yirik oʻlja uchun toʻda kerak — inda {n} ta ovchi bor.',
  'queue.free' => 'Bepul', 'queue.speedup' => 'Tezlashtirish', 'queue.done' => 'Tayyor!',
  'queue.cancel_confirm' => 'Bekor qilish uchun ✕ ni yana bir marta bosing — resursning 80% i qaytadi.',
  'queue.train' => '{n} × {role} ({tier})', 'queue.promote' => '{n} × {role} → {tier}', 'queue.heal' => '{n} × {role} davolanmoqda',
  'speedup.desc' => 'Bugun yana {left} tezlashtirish mumkin (kunlik 25% chegara).',
  'speedup.rule' => 'Tezlashtirish faqat vaqt tejaydi — kuch sotilmaydi. Har keyingi soat qimmatroq.',
  'ws.rate' => 'Soatiga {v} birlik · sigʻim {cap}', 'ws.collect' => 'Yigʻish', 'ws.collected' => 'Omborga oʻtkazildi',
  'ws.alloc' => 'Taqsimot', 'ws.alloc_desc' => 'Ustaxona soatlik ishlab chiqarishini 3 resurs orasida taqsimlang. Binolarga eng koʻp tosh kerak boʻladi.',
  'ws.alloc_sum' => 'Yigʻindi: {s}% (100% boʻlishi kerak)',

  // Binolar
  'bld.den' => 'In', 'bld.food_cave' => 'Oziq gʻori', 'bld.workshop' => 'Ustaxona qoyasi', 'bld.scout_rock' => 'Razvedka qoyasi',
  'bld.battle_ground' => 'Jang maydoni', 'bld.defense_wall' => 'Himoya devori', 'bld.hunt_path' => 'Ov soʻqmogʻi',
  'bld.hospital' => 'Shifo gʻori', 'bld.market' => 'Bozor',
  'bld.den.desc' => 'Toʻdaning asosiy makoni. Darajasi sizning darajangiz bilan birga oʻsadi va mashqni tezlashtiradi.',
  'bld.food_cave.desc' => 'Goʻshtni saqlaydi. Kattaroq gʻor — koʻproq zaxira va reydda kuchliroq himoya.',
  'bld.workshop.desc' => 'Tosh, shox-shabba va suyak ishlab chiqaradi.',
  'bld.scout_rock.desc' => 'Razvedkachilar tieri va mashqi.', 'bld.battle_ground.desc' => 'Hujumchilar tieri va mashqi.',
  'bld.defense_wall.desc' => 'Himoyachilar tieri va mashqi.', 'bld.hunt_path.desc' => 'Ovchilar tieri va mashqi.',
  'bld.hospital.desc' => 'Jarohatlangan boʻrilarni davolaydi. Boʻrilar oʻlmaydi — jarohatlanadi.',
  'bld.market.desc' => 'Resurslarni almashtirish.',
  'bld.den.auto' => 'In alohida qurilmaydi — daraja koʻtarilganda avtomatik oʻsadi.',
  'bld.next' => '{l}-darajaga', 'bld.upgrade' => 'Kuchaytirish', 'bld.started' => 'Qurilish boshlandi',
  'bld.max_by_level' => 'Bino oʻyinchi darajasidan oshmaydi. Darajangizni koʻtaring!',
  'fx.capacity' => 'Sigʻim', 'fx.protection' => 'Himoya', 'fx.per_hour' => 'Ishlab chiqarish / soat',
  'fx.slots' => 'Yigʻuvchi slot', 'fx.max_tier' => 'Maks tier', 'fx.soldier_cap' => 'Askar sigʻimi', 'fx.train_speed' => 'Mashq tezligi',
  'fx.heal_cap' => 'Bir vaqtda davolash', 'fx.heal_minutes' => 'Davolash (daq)',
  'hospital.injured' => 'Jarohatlanganlar', 'hospital.none' => 'Jarohatlangan boʻri yoʻq.', 'hospital.started' => 'Davolash boshlandi',

  // Oʻljalar
  'prey.rodent' => 'Kemiruvchi', 'prey.bird' => 'Qush', 'prey.rabbit' => 'Quyon', 'prey.marmot' => 'Sugʻur', 'prey.gazelle' => 'Jayron',
  'prey.boar' => 'Yovvoyi choʻchqa', 'prey.deer' => 'Kiyik', 'prey.reindeer' => 'Bugʻu', 'prey.argali' => 'Arxar',
  'prey.horse' => 'Yovvoyi ot', 'prey.moose' => 'Los', 'prey.bison' => 'Bizon', 'prey.mammoth_calf' => 'Mamont bolasi',
  'prey.mammoth' => 'Mamont', 'prey.spirit' => 'Ruh oʻljasi',

  // Rollar va tierlar
  'role.scout' => 'Razvedkachi', 'role.attacker' => 'Hujumchi', 'role.defender' => 'Himoyachi', 'role.hunter' => 'Ovchi',
  'role.scout.desc' => 'Raqibni koʻradi, tuzoqni topadi. Himoyachini yengadi.',
  'role.attacker.desc' => 'Reyd va janglar. Razvedkachini yengadi.',
  'role.defender.desc' => 'In va omborni qoʻriqlaydi. Hujumchini yengadi.',
  'role.hunter.desc' => 'Ovda toʻda boʻladi va koʻproq goʻsht olib keladi.',
  'role.unlock' => '{l}-darajada ochiladi',
  'tier.1' => 'Yosh', 'tier.2' => 'Tajribali', 'tier.3' => 'Urushchi', 'tier.4' => 'Veteran', 'tier.5' => 'Elita', 'tier.6' => 'Afsonaviy',
  'pack.size' => 'Toʻda', 'pack.occupancy' => 'Toʻlganlik {p}% · mashq vaqti ×{k}', 'pack.train' => 'Tayyorlash',
  'pack.promote' => 'Tierga oʻtkazish', 'pack.free' => 'boʻsh joy: {n}', 'pack.training' => 'Mashq boshlandi',
  'pack.promoting' => 'Almashtirish boshlandi',
  'pack.train_note' => 'Toʻda kam boʻlsa mashq tezroq, toʻla boʻlsa sekinroq.',
  'pick.qty' => 'Soni', 'pick.none' => 'Inda mos askar yoʻq.', 'pick.time' => 'Borish {one} · borib-qaytish {both}',
  'pick.scouted' => '✔ Razvedka qilingan — tuzoq xavfi yoʻq', 'pick.trap' => '⚠️ Razvedkasiz: 15% tuzoq ehtimoli (+20% zarar)',
  'promote.desc' => 'Past tier askarlar kuch nisbatida yuqori tierga almashtiriladi (10% yoʻqotish bilan). Foyda — kam goʻsht va kam joy.',
  'promote.rate' => '1 ta yuqori tier = {need} ta past tier', 'promote.have' => 'Mavjud: {n} · maksimal: {m} ta',
  'clan.title' => 'Klan (toʻda)', 'clan.soon' => 'Klan, lavozimlar, xazina va toʻda urushi keyingi versiyada.',

  // PvP
  'pvp.locked_title' => 'Jang maydoni yopiq', 'pvp.locked' => 'PvP {l}-darajada, toʻda bilan birga ochiladi.',
  'pvp.targets' => 'Raqiblar', 'pvp.attack' => 'Hujum', 'pvp.scout' => 'Razvedka', 'pvp.wild' => 'yovvoyi',
  'pvp.newbie_note' => '1–6 darajada siz qalqon ostidasiz. Hozircha yovvoyi toʻdalarga hujum qilib mashq qiling.',
  'pvp.marches' => 'Yurishlar', 'pvp.loot' => 'Oʻlja', 'pvp.log' => 'Jang jurnali', 'pvp.log_empty' => 'Hali jang boʻlmagan.',
  'pvp.incoming' => '{name} iningizga kelmoqda', 'pvp.sent' => 'Toʻda yoʻlga chiqdi!', 'pvp.scout_sent' => 'Razvedkachilar yoʻlda',
  'band.weak' => 'Kuchsiz', 'band.even' => 'Teng', 'band.strong' => 'Kuchli',
  'march.outbound' => 'yoʻlda', 'march.returning' => 'qaytmoqda', 'march.recalled' => 'Qaytarib chaqirildi', 'march.recall' => 'Qaytarish',
  'grade.fail' => 'Muvaffaqiyatsiz', 'grade.partial' => 'Qisman', 'grade.full' => 'Toʻliq', 'grade.exact' => 'Aniq',
  'scout.fail' => 'Razvedkachilar qoʻlga tushdi. Raqib bundan xabar topdi.', 'scout.total' => 'Inda {n} ta boʻri',
  'scout.loot' => 'Taxminiy oʻlja', 'scout.valid' => 'Maʼlumot amal qiladi:', 'scout.expired' => 'eskirgan',
  'outcome.win' => 'Gʻalaba', 'outcome.loss' => 'Magʻlubiyat', 'outcome.draw' => 'Durang',
  'round.approach' => 'Yaqinlashuv', 'round.trap' => 'Tuzoq!', 'round.clash' => 'Toʻqnashuv', 'round.melee' => 'Asosiy jang',
  'round.decisive' => 'Hal qiluvchi', 'round.att_retreat' => 'Hujumchi chekinmoqda', 'round.def_retreat' => 'Himoyachi chekinmoqda',
  'round.attacker_win' => 'Hujumchi yutdi', 'round.defender_win' => 'Himoyachi yutdi', 'round.draw' => 'Durang',
  'battle.trap' => '⚠️ Razvedkasiz hujum tuzoqqa tushdi: zarar +20%.', 'battle.losses' => 'Yoʻqotishlar',
  'battle.attacker' => 'Hujumchi', 'battle.defender' => 'Himoyachi',

  // Vazifalar
  'quests.daily' => 'Kundalik vazifalar', 'quests.weekly' => 'Haftalik', 'quests.season' => 'Mavsum yoʻli',
  'quests.claim' => 'Olish', 'quests.got' => 'Mukofot:', 'quests.reset' => 'Yangilanishga {t}',
  'quests.rule' => 'Mukofot vaqt tejaydi, kuch bermaydi.',
  'quest.hunt' => '🐾 Ovchi — 3 marta ov qiling', 'quest.build' => '🪨 Quruvchi — 1 binoni kuchaytiring',
  'quest.train' => '➕ Murabbiy — 1 askar tayyorlang', 'quest.pvp' => '⚔️ Jangchi — 1 PvP jangi', 'quest.login' => '🌅 Kirish bonusi',

  // Profil
  'profile.wins' => 'Gʻalaba', 'profile.hunts' => 'Ov', 'profile.ladder' => 'Boʻri zinapoyasi (1–25)', 'profile.lang' => 'Til',
  'profile.lang_soon' => 'Ruscha va inglizcha keyingi versiyada.', 'shop.title' => 'Doʻkon',
  'shop.soon' => 'Oy toshi paketlari (Telegram Stars) keyingi versiyada. Hozir test uchun 50 oy toshi berilgan.',

  // Qaytish ekrani
  'return.title' => 'Qaytganingiz bilan, alfa!', 'return.away' => 'Siz {t} yoʻq edingiz. Toʻda sizni kutdi.',
  'return.attacks' => 'Bu vaqtda iningizga {n} marta hujum boʻldi — jang jurnalini koʻring.', 'return.go' => 'Toʻdani boq',

  // Tanishtiruv
  'tutorial.step' => 'Qadam {n}/20', 'tutorial.skip' => 'Oʻtkazib yuborish', 'tutorial.reward' => 'Mukofot:',
  'tutorial.wait' => 'Qurilish tugashini kuting: {t}', 'tutorial.hunt_hint' => 'ovga chiqib goʻsht toping',
  'tutorial.done_title' => 'Omad, alfa!', 'tutorial.done' => 'Endi siz oʻyinga tayyorsiz. Keyingi maqsad: 6-daraja — Shifo gʻorini oching.',
  'tutorial.step.1.text' => 'Sen toʻdangni yoʻqotgan yolgʻiz boʻrisan. Omon qolish kerak.', 'tutorial.step.1.action' => 'Boshlash',
  'tutorial.step.2.text' => 'Mana oʻlja. Ov qilib koʻr.', 'tutorial.step.2.action' => '🐁 Ovlash',
  'tutorial.step.3.text' => 'Yashash uchun in kerak. Mana bu joy yaxshi.', 'tutorial.step.3.action' => '🏔 Inni qoʻyish',
  'tutorial.step.4.text' => 'Goʻsht buziladi. Uni saqlash uchun Oziq gʻori kerak.', 'tutorial.step.4.action' => '🍖 Oziq gʻorini qurish',
  'tutorial.step.5.text' => 'Ovlagan goʻshtingni gʻorga sol.', 'tutorial.step.5.action' => 'Saqlash',
  'tutorial.step.6.text' => 'Qurilish uchun tosh kerak. Ustaxona qoyasini qur.', 'tutorial.step.6.action' => '🪨 Ustaxona qurish',
  'tutorial.step.7.text' => 'Ustaxona sen uchun tosh, shox-shabba va suyak yigʻadi. Taqsimotni tanla.', 'tutorial.step.7.action' => '⚖️ Tasdiqlash',
  'tutorial.step.8.text' => 'Ov qilish uchun mashq kerak. Ov soʻqmogʻini qur.', 'tutorial.step.8.action' => '🐾 Ov soʻqmogʻi',
  'tutorial.step.9.text' => 'Birinchi ovchingni tayyorla.', 'tutorial.step.9.action' => '🥩 Ovchi tayyorlash',
  'tutorial.step.10.text' => 'Binolarni kuchaytirsang, koʻproq sigʻadi.', 'tutorial.step.10.action' => '⬆️ Oziq gʻori L3',
  'tutorial.step.11.text' => 'Boʻri yolgʻiz kuchsiz. Endi toʻdang boʻladi!', 'tutorial.step.11.action' => '🐺🐺🐺 Toʻdani koʻrish',
  'tutorial.step.12.text' => 'Toʻda bilan kattaroq oʻlja ovlash mumkin. 3 marta ov qil.', 'tutorial.step.12.action' => '🦫 Toʻda ovi',
  'tutorial.step.13.text' => 'Jang qiladigan boʻrilar kerak.', 'tutorial.step.13.action' => '⚔️ Jang maydoni',
  'tutorial.step.14.text' => 'Birinchi hujumchingni tayyorla.', 'tutorial.step.14.action' => '⚔️ Hujumchi tayyorlash',
  'tutorial.step.15.text' => 'Yolgʻiz boʻri omon qolmaydi. Klanlar tez orada ochiladi — hozircha oʻz toʻdangni kuchaytir.', 'tutorial.step.15.action' => 'Tushunarli',
  'tutorial.step.16.text' => 'Endi birinchi jang. Qoʻrqma — bu mashq jangi.', 'tutorial.step.16.action' => '⚔️ Jangga!',
  'tutorial.step.17.text' => 'Raqibni oldindan koʻrish uchun razvedkachi kerak.', 'tutorial.step.17.action' => '🔭 Razvedka qoyasi',
  'tutorial.step.18.text' => 'Raqibni razvedka qilib koʻr.', 'tutorial.step.18.action' => '🔍 Razvedka',
  'tutorial.step.19.text' => 'Sening iningga ham hujum qilishadi.', 'tutorial.step.19.action' => '🛡 Himoya devori',
  'tutorial.step.20.text' => 'Endi siz oʻyinga tayyorsiz. Omad, alfa!', 'tutorial.step.20.action' => '🏆 Yakunlash',

  // Navbatni bekor qilish (ikki marta bosish)
  'queue.cancel_tap' => 'Yana bos', 'queue.cancelled' => 'Bekor qilindi',

  // Demo rejim (serversiz, brauzerda)
  'demo.badge' => 'Demo', 'demo.title' => 'Demo vaqti',
  'demo.desc' => 'Bu brauzerda ishlaydigan demo: oʻyin mantiqi server bilan bir xil, holat shu brauzerda saqlanadi. Qurilish, mashq va yurishlarni kutmaslik uchun vaqtni oldinga suring.',
  'demo.offset' => 'Hozircha {t} oldinga surilgan.', 'demo.skipped' => 'Vaqt {t} oldinga surildi',
  'demo.reset' => 'Qaytadan boshlash', 'demo.reset_confirm' => 'Hamma progress oʻchadi — yana bosing',

  // In sahnasi: kun vaqti va yashash muhiti
  'phase.day' => '☀️ Kunduz', 'phase.night' => '🌙 Tun', 'phase.dawn' => '🌅 Tong', 'phase.dusk' => '🌇 Shom',
  'habitat.forest' => 'Oʻrmon', 'habitat.autumn' => 'Kuzgi oʻrmon', 'habitat.mountain' => 'Togʻ', 'habitat.desert' => 'Choʻl',
  'habitat.steppe' => 'Dasht', 'habitat.swamp' => 'Botqoq', 'habitat.snow' => 'Qorli oʻlka', 'habitat.aurora' => 'Qutb yogʻdusi',
  'habitat.ice' => 'Muzlik', 'habitat.tar' => 'Smola botqogʻi', 'habitat.fire' => 'Olovli oʻlka', 'habitat.sky' => 'Koʻk Tangri osmoni',

  // Daraja oshishi
  'levelup.title' => '{l}-daraja! Yangi boʻri',

  // Xatolar
  'error.UNAUTHORIZED' => 'Telegram orqali qayta oching', 'error.BANNED' => 'Akkaunt bloklangan',
  'error.NOT_ENOUGH_RESOURCES' => 'Resurs yetarli emas', 'error.LEVEL_TOO_LOW' => 'Daraja yetarli emas ({need_level})',
  'error.BUILDING_TOO_LOW' => 'Bino darajasi yetarli emas', 'error.QUEUE_BUSY' => 'Navbat band',
  'error.CAPACITY_FULL' => 'Sigʻim toʻlgan', 'error.TIER_LOCKED' => 'Tier hali ochilmagan',
  'error.OUT_OF_WINDOW' => 'Raqib hujum oynasidan tashqarida', 'error.TARGET_SHIELDED' => 'Raqib qalqon ostida',
  'error.PAIR_LIMIT' => 'Bu raqibga bugun 3 marta hujum qildingiz', 'error.SPEEDUP_CAP' => 'Kunlik tezlashtirish chegarasi',
  'error.RATE_LIMITED' => 'Juda tez! Biroz kuting', 'error.VERSION_OUTDATED' => 'Ilovani yangilang',
  'error.DEN_AUTO_LEVEL' => 'In avtomatik oʻsadi', 'error.NOT_ENOUGH_ARMY' => 'Askar yetarli emas',
  'error.COOLDOWN' => 'Biroz kuting', 'error.TUTORIAL_ORDER' => 'Qadam tartibi buzildi',
  'error.TUTORIAL_CHECK' => 'Avval vazifani bajaring', 'error.NOT_IN_MVP' => 'Keyingi versiyada',
  'error.NETWORK' => 'Aloqa xatosi', 'error.SERVER_ERROR' => 'Server xatosi',

  // Bildirishnomalar (bot)
  'notify.attack_incoming' => '⚠️ {from} iningizga hujum qilmoqda! Yetib kelish: {arrives_at}',
  'notify.attack_result' => '⚔️ Jang tugadi. Natija: {result}',
  'notify.build_done' => '🏗 Qurilish tugadi!', 'notify.scout_failed' => '🔍 {from} iningizni razvedka qilmoqchi boʻldi — qoʻlga tushdi!',
];
