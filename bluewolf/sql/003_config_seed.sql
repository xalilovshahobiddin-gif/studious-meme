-- =====================================================================
-- BLUE WOLF — game_config toʻldirish (blue_wolf_darajalar.xlsx → Sozlamalar)
-- 001_schema.sql dagi 78 ta asosiy kalitga qoʻshimcha. Kodda raqam yoʻq —
-- hammasi shu jadvaldan oʻqiladi. "(MVP)" belgili qiymatlar hujjatlarda
-- aniq raqam berilmagan joylar uchun taklif qilingan boshlangʻich qiymat.
-- =====================================================================

INSERT INTO game_config (config_key, config_value, unit, note) VALUES
  -- Umumiy
  ('max_level',               10,    'level',  '(MVP) Oʻyinchi darajasi chegarasi — v2 da 25'),
  ('cp_w_power',              2,     'x',      'CP: kuch vazni'),
  ('cp_w_speed',              1.5,   'x',      'CP: tezlik vazni'),
  ('cp_w_hp',                 0.5,   'x',      'CP: chidam vazni'),
  ('offline_after_min',       5,     'minute', '(MVP) Shuncha vaqt harakatsizlikdan keyin oflayn stavka'),
  ('return_grace_min',        30,    'minute', 'Qaytish qalqoni (uzoq yoʻqlikdan keyin)'),
  ('map_size_km',             20,    'km',     '(MVP) Xarita tomoni — masofa shu kvadrat ichida'),

  -- Boshlangʻich resurslar
  ('start_meat',              40,    'kg',     '(MVP) Boshlangʻich goʻsht'),
  ('start_stone',             200,   'unit',   '(MVP) Boshlangʻich tosh'),
  ('start_wood',              150,   'unit',   '(MVP) Boshlangʻich shox-shabba'),
  ('start_hide',              50,    'unit',   '(MVP) Boshlangʻich teri'),
  ('start_bone',              150,    'unit',   '(MVP) Boshlangʻich suyak'),
  ('start_moonstone',         50,    'ms',     '(MVP) Test uchun oy toshi'),

  -- Rollar (1-tier bazasi)
  ('role_scout_power',        8,     'stat',   'Razvedkachi kuch'),
  ('role_scout_speed',        22,    'stat',   'Razvedkachi tezlik'),
  ('role_scout_hp',           30,    'stat',   'Razvedkachi chidam'),
  ('role_attacker_power',     20,    'stat',   'Hujumchi kuch'),
  ('role_attacker_speed',     12,    'stat',   'Hujumchi tezlik'),
  ('role_attacker_hp',        45,    'stat',   'Hujumchi chidam'),
  ('role_defender_power',     12,    'stat',   'Himoyachi kuch'),
  ('role_defender_speed',     8,     'stat',   'Himoyachi tezlik'),
  ('role_defender_hp',        90,    'stat',   'Himoyachi chidam'),
  ('role_hunter_power',       10,    'stat',   'Ovchi kuch'),
  ('role_hunter_speed',       14,    'stat',   'Ovchi tezlik'),
  ('role_hunter_hp',          40,    'stat',   'Ovchi chidam'),
  ('role_hunter_unlock',      1,     'level',  'Ovchi 1-darajadan'),
  ('counter_weak',            0.77,  'x',      'Qarshi-kuch zaifligi'),

  -- Askar iqtisodi
  ('train_meat_base',         20,    'kg',     'Yangi askar: bazaviy goʻsht'),
  ('train_bone_base',         8,     'unit',   'Yangi askar: bazaviy suyak'),
  ('train_time_min',          4,     'minute', 'Yangi askar: bazaviy vaqt'),
  ('promote_cost_share',      0.6,   'x',      'Almashtirish narx ulushi'),
  ('promote_time_share',      0.5,   'x',      'Almashtirish vaqt ulushi'),
  ('final_time_coef_max',     5,     'x',      'Yakuniy koeff. chegarasi'),
  ('role_cap_base',           6,     'unit',   'Bino askar sigʻimi'),
  ('role_cap_growth',         1.2,   'x',      'Sigʻim oʻsishi'),
  ('role_penalty_exp',        2,     'power',  'Bino jazosi eksponenti'),
  ('role_penalty_max',        5,     'x',      'Bino jazosi maksimumi'),
  ('train_speed_bonus',       0.04,  'ratio',  'Mashq tezligi bonusi / bino darajasi'),
  ('queue_cancel_refund',     0.8,   'ratio',  'Navbat bekor qilinganda qaytariladigan ulush'),

  -- Binolar
  ('build_time_base_min',     10,    'minute', 'Bazaviy qurilish vaqti'),
  ('bld_food_cave_stone',     100,   'unit',   'Oziq gʻori narxi: tosh'),
  ('bld_food_cave_wood',      60,    'unit',   'Oziq gʻori narxi: shox-shabba'),
  ('bld_workshop_stone',      150,   'unit',   'Ustaxona narxi: tosh'),
  ('bld_workshop_wood',       100,   'unit',   'Ustaxona narxi: shox-shabba'),
  ('bld_workshop_bone',       40,    'unit',   'Ustaxona narxi: suyak'),
  ('bld_field_stone',         180,   'unit',   'Mashq maydoni narxi: tosh'),
  ('bld_field_bone',          90,    'unit',   'Mashq maydoni narxi: suyak'),
  ('bld_field_meat',          150,   'kg',     'Mashq maydoni narxi: goʻsht'),
  ('bld_scout_rock_coef',     0.5,   'x',      'Razvedka qoyasi narx koeff.'),
  ('bld_battle_ground_coef',  0.7,   'x',      'Jang maydoni narx koeff.'),
  ('bld_defense_wall_coef',   0.6,   'x',      'Himoya devori narx koeff.'),
  ('bld_hunt_path_coef',      0.45,  'x',      'Ov soʻqmogʻi narx koeff.'),
  ('bld_hospital_wood',       120,   'unit',   'Shifo gʻori narxi: shox-shabba'),
  ('bld_hospital_meat',       100,   'kg',     'Shifo gʻori narxi: goʻsht'),
  ('bld_hospital_stone',      80,    'unit',   'Shifo gʻori narxi: tosh'),
  ('bld_market_stone',        130,   'unit',   'Bozor narxi: tosh'),
  ('bld_market_wood',         110,   'unit',   'Bozor narxi: shox-shabba'),
  ('time_food_cave',          1.0,   'x',      'Vaqt koeff.: Oziq gʻori'),
  ('time_workshop',           1.2,   'x',      'Vaqt koeff.: Ustaxona'),
  ('time_scout_rock',         0.8,   'x',      'Vaqt koeff.: Razvedka qoyasi'),
  ('time_battle_ground',      1.3,   'x',      'Vaqt koeff.: Jang maydoni'),
  ('time_defense_wall',       1.1,   'x',      'Vaqt koeff.: Himoya devori'),
  ('time_hunt_path',          0.7,   'x',      'Vaqt koeff.: Ov soʻqmogʻi'),
  ('time_hospital',           0.9,   'x',      'Vaqt koeff.: Shifo gʻori'),
  ('time_market',             1.0,   'x',      'Vaqt koeff.: Bozor'),

  -- Oziq gʻori
  ('protect_base',            0.30,  'ratio',  'Gʻor himoyasi 1-daraja'),
  ('protect_growth',          0.02,  'ratio',  'Himoya oʻsishi / daraja'),
  ('protect_max',             0.85,  'ratio',  'Himoya maksimumi'),
  ('water_base',              5,     'unit/h', 'Bazaviy passiv suv'),
  ('water_growth',            1.2,   'x',      'Passiv suv oʻsishi'),
  ('water_need_base',         0.4,   'unit',   'Askar boshiga kunlik suv'),
  ('water_need_growth',       0.04,  'unit/lvl','Suv ehtiyoji oʻsishi'),

  -- Ustaxona
  ('workshop_store_hours',    10,    'hour',   'Ustaxona sigʻimi = soatlik × shu'),
  ('workshop_slot_base',      2,     'count',  'Bazaviy yigʻuvchi slot'),

  -- Shifo gʻori
  ('heal_cap_base',           2,     'wolf',   'Shifo bazaviy sigʻimi'),
  ('heal_cap_growth',         0.4,   'wolf/lvl','Shifo sigʻim oʻsishi'),
  ('heal_time_min',           60,    'minute', 'Bazaviy davolash vaqti'),
  ('heal_speed_growth',       0.05,  'ratio',  'Davolash tezligi oʻsishi'),
  ('heal_meat_share',         0.25,  'ratio',  '(MVP) Davolash narxi = mashq goʻshtining shu ulushi'),

  -- Ov
  ('hunt_base_sec',           60,    'second', '(MVP) Ov bazaviy davomiyligi'),
  ('hunt_sec_per_kg',         6,     'second', '(MVP) Har kg oʻlja uchun qoʻshimcha vaqt'),
  ('hunt_hunter_bonus',       0.05,  'ratio',  '(MVP) Har ovchi tieri uchun oʻlja bonusi'),

  -- Jang
  ('battle_win_ratio',        1.10,  'x',      '(MVP) R shundan yuqori — gʻalaba; 1/shu dan past — magʻlubiyat'),
  ('battle_full_win_ratio',   1.50,  'x',      '(MVP) R shundan yuqori — toʻliq gʻalaba, aks holda qisman'),
  ('battle_retreat',          0.20,  'ratio',  'Kuchi shundan kam qolgan tomon chekinadi'),
  ('trap_chance',             0.15,  'ratio',  'Razvedkasiz hujumda tuzoq ehtimoli'),
  ('trap_damage',             0.20,  'ratio',  'Tuzoqda qoʻshimcha zarar'),
  ('xp_result_win',           1.5,   'x',      'PvP XP: gʻalaba'),
  ('xp_result_draw',          1.0,   'x',      'PvP XP: durang'),
  ('xp_result_loss',          0.5,   'x',      'PvP XP: magʻlubiyat'),
  ('window_low',              1,     'level',  'Hujum oynasi: past'),
  ('window_high',             1,     'level',  'Hujum oynasi: yuqori'),
  ('match_refresh_attacks',   3,     'count',  'Shuncha hujumdan keyin roʻyxat yangilanadi'),
  ('bots_per_level',          6,     'count',  '(MVP) Har daraja uchun NPC toʻdalar'),

  -- Oʻlja
  ('carry_base',              15,    'kg',     'Bitta askar yuki'),
  ('carry_tier_bonus',        0.2,   'ratio',  'Tier yuk bonusi'),
  ('loot_win_full',           1.0,   'x',      'Toʻliq gʻalaba'),
  ('loot_win_partial',        0.55,  'x',      'Qisman gʻalaba'),
  ('loot_revenge',            1.2,   'x',      'Qasos hujumi (24 soat)'),
  ('loot_offline_coef',       0.5,   'x',      '1–3 kun oflayn raqibdan oʻlja'),
  ('loot_diff_m3',            0.30,  'x',      'Daraja farqi −3'),
  ('loot_diff_m2',            0.50,  'x',      'Daraja farqi −2'),
  ('loot_diff_m1',            0.70,  'x',      'Daraja farqi −1'),
  ('loot_diff_0',             1.00,  'x',      'Teng daraja'),
  ('loot_diff_p1',            1.30,  'x',      'Daraja farqi +1'),
  ('loot_diff_p2',            1.50,  'x',      'Daraja farqi +2'),
  ('loot_diff_p3',            1.70,  'x',      'Daraja farqi +3'),
  ('loot_repeat_1',           1.00,  'x',      '1-hujum (24 soat)'),
  ('loot_repeat_2',           0.50,  'x',      '2-hujum'),
  ('loot_repeat_3',           0.25,  'x',      '3-hujum'),
  ('loot_repeat_4',           0.10,  'x',      '4+ hujum'),

  -- Qalqon
  ('shield_loss_threshold',   0.30,  'ratio',  'Shuncha yoʻqotgan himoyachiga qalqon'),
  ('shield_streak_h',         16,    'hour',   'Ketma-ket 2 yutqazganga qalqon'),

  -- Razvedka
  ('scout_partial',           1.0,   'x',      'Qisman chegara'),
  ('scout_full',              1.5,   'x',      'Toʻliq chegara'),
  ('scout_exact',             2.5,   'x',      'Aniq chegara'),
  ('scout_cooldown_min',      10,    'minute', 'Razvedka kutish vaqti'),
  ('scout_report_min',        30,    'minute', 'Maʼlumot muddati'),
  ('scout_fail_injury',       0.1,   'ratio',  'Muvaffaqiyatsiz razvedkada jarohat'),
  ('scout_noise',             0.2,   'ratio',  'Toʻliq bosqichda oʻlja aniqligi'),

  -- Ochlik
  ('hunger_leave_daily',      0.01,  'ratio',  'Kunlik ketish ulushi'),
  ('hunger_leave_max',        0.5,   'ratio',  'Maksimal ochlik yoʻqotishi'),

  -- Tanishtiruv, vazifalar, tezlashtirish
  ('tutorial_skip_step',      12,    'step',   'Shundan keyin «Oʻtkazib yuborish»'),
  ('tutorial_steps',          20,    'step',   'Tanishtiruv qadamlari'),
  ('quest_daily_count',       4,     'count',  'Kundalik vazifa soni (+ kirish bonusi)'),
  ('speedup_block_h',         1,     'hour',   'Tezlashtirish narx bloki'),
  ('second_queue_price',      1500,  'ms',     'Ikkinchi qurilish navbati'),
  ('tutorial_free_speedups',  5,     'count',  'Tanishtiruv bepul tezlashtirishlari'),
  ('tutorial_hunt_sec',       5,     'second', '(MVP) Tanishtiruv davomida ov davomiyligi'),
  ('share_scout',             0.20,  'ratio',  'Tavsiya: razvedkachi ulushi'),
  ('share_defender',          0.20,  'ratio',  'Tavsiya: himoyachi ulushi'),
  ('share_hunter',            0.15,  'ratio',  'Tavsiya: ovchi ulushi'),
  ('reserve_days',            3,     'day',    'Zaxira kuni'),
  ('bot_army_share',          0.6,   'ratio',  '(MVP) NPC toʻda qoʻshini = qoʻshin sigʻimining shu ulushi'),
  ('bot_regen_sec',           3600,  'second', '(MVP) NPC toʻda toʻliq tiklanish vaqti'),
  ('notify_daily_budget',     6,     'count',  'Kunlik bildirishnoma chegarasi'),
  ('notify_tz_offset_h',      5,     'hour',   '(MVP) Tungi sokinlik uchun vaqt mintaqasi (UTC+5)'),
  ('notify_night_from',       23,    'hour',   'Tungi sokinlik boshlanishi'),
  ('notify_night_to',         8,     'hour',   'Tungi sokinlik tugashi'),
  ('offline_report_min',      30,    'minute', 'Shundan uzoq yoʻqlikdan keyin qaytish hisoboti'),
  ('rl_read',                 60,    'req/min','GET /state, /profile va boshqa oʻqishlar'),
  ('rl_write',                30,    'req/min','Holat oʻzgartiruvchi POST'),
  ('rl_pvp',                  20,    'req/min','/pvp/attack, /pvp/scout'),
  ('rl_refresh',              10,    'req/h',  '/pvp/targets/refresh'),
  ('rl_events',               120,   'req/min','/events')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), unit = VALUES(unit), note = VALUES(note);
