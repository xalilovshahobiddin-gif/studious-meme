-- =====================================================================
-- BLUE WOLF — MySQL 8.0 sxemasi
-- Telegram Mini App strategiya oʻyini
-- Kodlash: utf8mb4, Engine: InnoDB
-- Barcha vaqtlar UTC. Resurslar timestamp asosida hisoblanadi (tick yoʻq).
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS bluewolf
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE bluewolf;

-- =====================================================================
-- 1. OʻYINCHI
-- =====================================================================

CREATE TABLE players (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tg_id             BIGINT UNSIGNED NOT NULL COMMENT 'Telegram user id',
  tg_username       VARCHAR(64)     NULL,
  display_name      VARCHAR(48)     NOT NULL,
  lang              ENUM('uz','ru','en') NOT NULL DEFAULT 'uz',
  level             TINYINT UNSIGNED NOT NULL DEFAULT 1,
  xp                BIGINT UNSIGNED NOT NULL DEFAULT 0,
  clan_id           BIGINT UNSIGNED NULL,
  x                 SMALLINT UNSIGNED NOT NULL COMMENT 'Xarita koordinatasi',
  y                 SMALLINT UNSIGNED NOT NULL,
  tutorial_step     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0..20, 20 = tugagan',
  shield_until      DATETIME        NULL COMMENT 'Oddiy qalqon (jangdan keyin, yangi oʻyinchi)',
  vacation_from     DATETIME        NULL COMMENT '12 soatlik kechikishdan keyingi boshlanish',
  vacation_until    DATETIME        NULL,
  hunger_since      DATETIME        NULL COMMENT 'Ochlik boshlangan vaqt, NULL = toʻq',
  free_speedups     SMALLINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'Tanishtiruv bepul tezlashtirishlari',
  second_queue      TINYINT(1)      NOT NULL DEFAULT 0,
  auto_collect      TINYINT(1)      NOT NULL DEFAULT 0,
  offline_store_plus TINYINT(1)     NOT NULL DEFAULT 0,
  login_streak      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_login_date   DATE            NULL,
  device_hash       CHAR(64)        NULL COMMENT 'Anti-cheat: qurilma barmoq izi',
  ip_hash           CHAR(64)        NULL,
  status            ENUM('active','banned','deleted') NOT NULL DEFAULT 'active',
  banned_until      DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_tg (tg_id),
  KEY ix_players_level (level, status),
  KEY ix_players_clan (clan_id),
  KEY ix_players_lastseen (last_seen_at),
  KEY ix_players_device (device_hash),
  KEY ix_players_xy (x, y)
) ENGINE=InnoDB;

-- Resurslar alohida jadvalda: eng tez-tez yangilanadigan qator
CREATE TABLE player_resources (
  player_id     BIGINT UNSIGNED NOT NULL,
  meat          BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Goʻsht (kg)',
  water         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  herb          BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Shifobaxsh oʻt',
  stone         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  wood          BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Shox-shabba',
  hide          BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Teri',
  bone          BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Suyak',
  moonstone     INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Oy toshi (premium)',
  coins         BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Mavsum tangasi',
  -- Ustaxona taqsimoti: 0..100, yigʻindisi 100 boʻlishi shart
  alloc_stone   TINYINT UNSIGNED NOT NULL DEFAULT 40,
  alloc_wood    TINYINT UNSIGNED NOT NULL DEFAULT 30,
  alloc_hide    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  alloc_bone    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  last_tick_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                COMMENT 'Oxirgi hisob vaqti — timestamp accrual uchun',
  PRIMARY KEY (player_id),
  CONSTRAINT fk_res_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 2. BINOLAR
-- 'den' (In) — istisno: navbat orqali QURILMAYDI. level = players.level
-- bilan bir vaqtda kod tomonidan sinxronlanadi (daraja koʻtarilganda
-- shu qatorni ham yangilaydi). queues.building_type da 'den' hech qachon
-- ishlatilmaydi. GDD bo'lim 5 ga qarang.
-- =====================================================================

CREATE TABLE buildings (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id       BIGINT UNSIGNED NOT NULL,
  type            ENUM('den','food_cave','workshop','scout_rock','battle_ground',
                       'defense_wall','hunt_path','hospital','market') NOT NULL,
  level           TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '"den" uchun players.level bilan avtomatik sinxron',
  PRIMARY KEY (id),
  UNIQUE KEY uq_building (player_id, type),
  CONSTRAINT fk_bld_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- =====================================================================
-- 3. QOʻSHIN
-- =====================================================================

CREATE TABLE army (
  player_id     BIGINT UNSIGNED NOT NULL,
  role          ENUM('scout','attacker','defender','hunter') NOT NULL,
  tier          TINYINT UNSIGNED NOT NULL COMMENT '1..6',
  alive         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Inda turgan sogʻlom askar',
  on_march      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Yurishdagi askar',
  injured       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Kasalxonada',
  PRIMARY KEY (player_id, role, tier),
  CONSTRAINT fk_army_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 4. NAVBATLAR — qurilish, mashq, davolash
-- Hammasi ends_at bilan. Oflaynda oʻzi tugaydi.
-- =====================================================================

CREATE TABLE queues (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  kind          ENUM('build','train','promote','heal') NOT NULL,
  slot          TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1 yoki 2 (sotib olingan navbat)',
  -- build uchun
  building_type ENUM('den','food_cave','workshop','scout_rock','battle_ground',
                     'defense_wall','hunt_path','hospital','market') NULL,
  target_level  TINYINT UNSIGNED NULL,
  -- train / promote / heal uchun
  role          ENUM('scout','attacker','defender','hunter') NULL,
  tier          TINYINT UNSIGNED NULL,
  from_tier     TINYINT UNSIGNED NULL COMMENT 'promote uchun',
  qty           INT UNSIGNED NULL,
  time_coef     DECIMAL(6,3) NOT NULL DEFAULT 1.000 COMMENT 'Bino jazosi x toʻlganlik koeff.',
  started_at    DATETIME NOT NULL,
  ends_at       DATETIME NOT NULL,
  speeded_sec   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tezlashtirilgan soniyalar',
  state         ENUM('running','done','cancelled') NOT NULL DEFAULT 'running',
  PRIMARY KEY (id),
  KEY ix_queue_player (player_id, state),
  KEY ix_queue_ends (state, ends_at),
  CONSTRAINT fk_queue_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 5. YURISHLAR — hujum, razvedka, lager, oazis
-- =====================================================================

CREATE TABLE marches (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id      BIGINT UNSIGNED NOT NULL COMMENT 'Yuboruvchi',
  target_player  BIGINT UNSIGNED NULL COMMENT 'PvP uchun',
  target_oasis   BIGINT UNSIGNED NULL,
  kind           ENUM('attack','scout','camp','oasis') NOT NULL,
  payload        JSON NOT NULL COMMENT '[{role,tier,qty}, ...]',
  distance_km    DECIMAL(6,2) NOT NULL,
  speed_kmh      DECIMAL(6,2) NOT NULL,
  departs_at     DATETIME NOT NULL,
  arrives_at     DATETIME NOT NULL,
  returns_at     DATETIME NULL COMMENT 'Uyga qaytish vaqti',
  return_speeded TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bir yurishga bir marta',
  loot           JSON NULL,
  state          ENUM('outbound','fighting','gathering','returning','done','recalled')
                 NOT NULL DEFAULT 'outbound',
  PRIMARY KEY (id),
  KEY ix_march_player (player_id, state),
  KEY ix_march_target (target_player, state),
  KEY ix_march_arrive (state, arrives_at),
  KEY ix_march_return (state, returns_at),
  CONSTRAINT fk_march_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 6. JANGLAR
-- =====================================================================

CREATE TABLE battles (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  march_id       BIGINT UNSIGNED NULL,
  attacker_id    BIGINT UNSIGNED NOT NULL,
  defender_id    BIGINT UNSIGNED NOT NULL,
  season_id      INT UNSIGNED NULL,
  is_ranked      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Server tayinlagan mavsum jangimi',
  ep_attacker    BIGINT UNSIGNED NOT NULL,
  ep_defender    BIGINT UNSIGNED NOT NULL,
  ratio          DECIMAL(8,3) NOT NULL,
  rounds         TINYINT UNSIGNED NOT NULL DEFAULT 5,
  result         ENUM('attacker_win','defender_win','draw') NOT NULL,
  att_losses     JSON NOT NULL COMMENT '{dead:[{role,tier,qty}], injured:[...]}',
  def_losses     JSON NOT NULL,
  loot           JSON NULL,
  log            JSON NOT NULL COMMENT 'Raund-raund jurnal',
  score_gain     INT NOT NULL DEFAULT 0 COMMENT 'Mavsum hissasi',
  fair_flags     JSON NULL COMMENT 'Adolat nazorati belgilari',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_battle_att (attacker_id, created_at),
  KEY ix_battle_def (defender_id, created_at),
  KEY ix_battle_pair (attacker_id, defender_id, created_at) COMMENT 'Juftlik chegarasi',
  KEY ix_battle_season (season_id, is_ranked)
) ENGINE=InnoDB;

CREATE TABLE scout_reports (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL COMMENT 'Razvedka qilgan',
  target_id     BIGINT UNSIGNED NOT NULL,
  ratio         DECIMAL(8,3) NOT NULL,
  grade         ENUM('fail','partial','full','exact') NOT NULL,
  payload       JSON NULL COMMENT 'Grade darajasiga mos maʼlumot',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL COMMENT '30 daqiqa',
  PRIMARY KEY (id),
  KEY ix_scout_player (player_id, expires_at),
  KEY ix_scout_target (target_id, created_at)
) ENGINE=InnoDB;

-- Matchmaking roʻyxati (30 daqiqa saqlanadi)
CREATE TABLE match_offers (
  player_id     BIGINT UNSIGNED NOT NULL,
  slot          TINYINT UNSIGNED NOT NULL COMMENT '1..9',
  target_id     BIGINT UNSIGNED NOT NULL,
  distance_km   DECIMAL(6,2) NOT NULL,
  power_band    ENUM('weak','even','strong') NOT NULL,
  generated_at  DATETIME NOT NULL,
  expires_at    DATETIME NOT NULL,
  PRIMARY KEY (player_id, slot),
  KEY ix_offer_expiry (expires_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. LAGER VA OAZIS
-- =====================================================================

CREATE TABLE camps (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  payload       JSON NOT NULL COMMENT 'Yuborilgan askarlar',
  wolves_sent   INT UNSIGNED NOT NULL,
  rate_per_hour DECIMAL(12,2) NOT NULL,
  started_at    DATETIME NOT NULL,
  ends_at       DATETIME NOT NULL,
  collected     JSON NULL,
  raided_by     BIGINT UNSIGNED NULL COMMENT 'Kim bosib oldi',
  state         ENUM('gathering','returning','done','raided') NOT NULL DEFAULT 'gathering',
  PRIMARY KEY (id),
  KEY ix_camp_player (player_id, state),
  KEY ix_camp_ends (state, ends_at)
) ENGINE=InnoDB;

CREATE TABLE oases (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type          ENUM('water','herb','stone','bone','moon') NOT NULL,
  x             SMALLINT UNSIGNED NOT NULL,
  y             SMALLINT UNSIGNED NOT NULL,
  clan_id       BIGINT UNSIGNED NULL COMMENT 'Egasi, NULL = boʻsh',
  captured_at   DATETIME NULL,
  hold_until    DATETIME NULL COMMENT '24 soat daxlsizlik',
  bonus_pct     DECIMAL(5,3) NOT NULL DEFAULT 0.120,
  PRIMARY KEY (id),
  KEY ix_oasis_clan (clan_id),
  KEY ix_oasis_xy (x, y)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. KLAN (TOʻDA)
-- =====================================================================

CREATE TABLE clans (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(32) NOT NULL,
  tag           VARCHAR(6)  NOT NULL,
  lang          ENUM('uz','ru','en') NOT NULL DEFAULT 'uz',
  level         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  xp            BIGINT UNSIGNED NOT NULL DEFAULT 0,
  leader_id     BIGINT UNSIGNED NOT NULL,
  treasury      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  max_members   TINYINT UNSIGNED NOT NULL DEFAULT 15,
  power_cache   BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Matchmaking uchun, soatda yangilanadi',
  description   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clan_name (name),
  UNIQUE KEY uq_clan_tag (tag),
  KEY ix_clan_power (power_cache)
) ENGINE=InnoDB;

CREATE TABLE clan_members (
  clan_id       BIGINT UNSIGNED NOT NULL,
  player_id     BIGINT UNSIGNED NOT NULL,
  role          ENUM('alpha','beta','hunter','guard','member') NOT NULL DEFAULT 'member',
  contribution  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  joined_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  KEY ix_cm_clan (clan_id, role),
  CONSTRAINT fk_cm_clan FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE clan_wars (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clan_a         BIGINT UNSIGNED NOT NULL COMMENT 'Eʼlon qilgan',
  clan_b         BIGINT UNSIGNED NOT NULL,
  declared_at    DATETIME NOT NULL,
  starts_at      DATETIME NOT NULL,
  ends_at        DATETIME NOT NULL COMMENT '+12 soat',
  deposit_a      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  deposit_b      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  power_a        BIGINT UNSIGNED NOT NULL,
  power_b        BIGINT UNSIGNED NOT NULL,
  score_a        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  score_b        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sent_ratio_a   DECIMAL(5,3) NOT NULL DEFAULT 0 COMMENT 'Minimal ishtirok tekshiruvi',
  sent_ratio_b   DECIMAL(5,3) NOT NULL DEFAULT 0,
  winner         ENUM('a','b','draw','void') NULL,
  void_reason    VARCHAR(120) NULL,
  fund_coins     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  state          ENUM('pending','prep','wave1','pause','wave2','final','settled')
                 NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id),
  KEY ix_war_clans (clan_a, clan_b, declared_at) COMMENT '7 kunlik takror bloki',
  KEY ix_war_state (state, ends_at)
) ENGINE=InnoDB;

CREATE TABLE clan_war_contributions (
  war_id        BIGINT UNSIGNED NOT NULL,
  player_id     BIGINT UNSIGNED NOT NULL,
  clan_id       BIGINT UNSIGNED NOT NULL,
  sent_count    INT UNSIGNED NOT NULL DEFAULT 0,
  sent_ep       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  damage_dealt  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  score         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  dead          INT UNSIGNED NOT NULL DEFAULT 0,
  injured       INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (war_id, player_id),
  KEY ix_cwc_player (player_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 9. VAZIFALAR VA MAVSUM
-- =====================================================================

CREATE TABLE quests (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  quest_key     VARCHAR(48) NOT NULL COMMENT 'locales kalitiga mos',
  kind          ENUM('daily','weekly','milestone') NOT NULL,
  progress      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  target        BIGINT UNSIGNED NOT NULL,
  stage         TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Bosqichli vazifalar uchun',
  claimed_at    DATETIME NULL,
  resets_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quest (player_id, quest_key, kind),
  KEY ix_quest_reset (kind, resets_at)
) ENGINE=InnoDB;

CREATE TABLE seasons (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  starts_at     DATETIME NOT NULL,
  ends_at       DATETIME NOT NULL,
  payout_at     DATETIME NOT NULL COMMENT 'ends_at + 48 soat',
  revenue_usd   DECIMAL(12,2) NOT NULL DEFAULT 0,
  fund_usd      DECIMAL(12,2) NOT NULL DEFAULT 0,
  fund_coins    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  carried_over  BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Bekor qilingan mukofotlar',
  state         ENUM('active','closed','audited','paid') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  KEY ix_season_state (state, ends_at)
) ENGINE=InnoDB;

CREATE TABLE season_scores (
  season_id     INT UNSIGNED NOT NULL,
  player_id     BIGINT UNSIGNED NOT NULL,
  score         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  battles       INT UNSIGNED NOT NULL DEFAULT 0,
  wins          INT UNSIGNED NOT NULL DEFAULT 0,
  rank_pos      INT UNSIGNED NULL,
  league        ENUM('bronze','silver','gold','legend') NOT NULL DEFAULT 'bronze',
  reward_coins  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  flagged       TINYINT(1) NOT NULL DEFAULT 0,
  paid_at       DATETIME NULL,
  PRIMARY KEY (season_id, player_id),
  KEY ix_ss_rank (season_id, score DESC)
) ENGINE=InnoDB;

-- =====================================================================
-- 10. MONETIZATSIYA
-- =====================================================================

CREATE TABLE transactions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('stars_purchase','moonstone_spend','refund') NOT NULL,
  item_key        VARCHAR(48) NOT NULL COMMENT 'pack_small, speedup_1h, vacation_day, pass_season...',
  stars           INT UNSIGNED NOT NULL DEFAULT 0,
  moonstone_delta INT NOT NULL DEFAULT 0,
  usd_value       DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT 'Mavsum fondi hisobi uchun',
  tg_payment_id   VARCHAR(128) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tg_payment (tg_payment_id),
  KEY ix_tx_player (player_id, created_at),
  KEY ix_tx_date (created_at)
) ENGINE=InnoDB;

-- Kunlik tezlashtirish chegarasi (25%)
CREATE TABLE speedup_usage (
  player_id     BIGINT UNSIGNED NOT NULL,
  usage_date    DATE NOT NULL,
  used_seconds  INT UNSIGNED NOT NULL DEFAULT 0,
  cap_seconds   INT UNSIGNED NOT NULL COMMENT '24h x 0.25 = 21600, konfigdan',
  PRIMARY KEY (player_id, usage_date)
) ENGINE=InnoDB;

-- =====================================================================
-- 11. ADOLAT NAZORATI
-- =====================================================================

CREATE TABLE fairplay_flags (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  season_id     INT UNSIGNED NULL,
  rule_key      VARCHAR(48) NOT NULL COMMENT 'pair_limit, closed_group, low_losses, same_device...',
  detail        JSON NULL,
  severity      TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1..3',
  action_taken  ENUM('none','score_50','season_zero','rank_block','ban') NOT NULL DEFAULT 'none',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_flag_player (player_id, season_id),
  KEY ix_flag_rule (rule_key, created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 12. BILDIRISHNOMALAR
-- =====================================================================

CREATE TABLE notifications (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  type          VARCHAR(48) NOT NULL COMMENT 'attack_incoming, build_done, war_start...',
  payload       JSON NULL,
  channel       ENUM('telegram','inapp') NOT NULL DEFAULT 'telegram',
  scheduled_at  DATETIME NOT NULL,
  sent_at       DATETIME NULL,
  read_at       DATETIME NULL,
  state         ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  PRIMARY KEY (id),
  KEY ix_notif_send (state, scheduled_at),
  KEY ix_notif_player (player_id, type, scheduled_at)
) ENGINE=InnoDB;

-- Kunlik bildirishnoma chegarasi (spam boʻlmasligi uchun)
CREATE TABLE notification_budget (
  player_id     BIGINT UNSIGNED NOT NULL,
  budget_date   DATE NOT NULL,
  sent_count    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  muted_until   DATETIME NULL,
  PRIMARY KEY (player_id, budget_date)
) ENGINE=InnoDB;

-- =====================================================================
-- 13. KONFIG VA LOKALIZATSIYA
-- =====================================================================

-- Excel jadvalidagi barcha balans parametrlari shu yerga koʻchiriladi.
-- Kodda hech qanday raqam qattiq yozilmaydi.
CREATE TABLE game_config (
  config_key    VARCHAR(64) NOT NULL,
  config_value  DECIMAL(18,6) NOT NULL,
  unit          VARCHAR(24) NULL,
  note          VARCHAR(255) NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB;

CREATE TABLE locales (
  locale_key    VARCHAR(96) NOT NULL,
  uz            TEXT NOT NULL,
  ru            TEXT NULL,
  en            TEXT NULL,
  context       VARCHAR(120) NULL,
  PRIMARY KEY (locale_key)
) ENGINE=InnoDB;

-- =====================================================================
-- 14. ANALITIKA
-- =====================================================================

CREATE TABLE analytics_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NULL,
  event         VARCHAR(48) NOT NULL COMMENT 'tutorial_step, first_battle, level_up, purchase...',
  payload       JSON NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_ev_name (event, created_at),
  KEY ix_ev_player (player_id, created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- BOSHLANGʻICH KONFIG (jadvaldan koʻchirilgan asosiy qiymatlar)
-- =====================================================================

INSERT INTO game_config (config_key, config_value, unit, note) VALUES
  ('xp_base',                 80,     'xp',     'Bazaviy XP 1->2'),
  ('xp_growth',               1.38,   'x',      'XP oʻsish koeffitsienti'),
  ('stage_early',             0.40,   'x',      '1-4 daraja koeffitsienti'),
  ('stage_mid',               0.70,   'x',      '5-10 daraja'),
  ('stage_mid_level',         10,     'level',  'Oʻrta bosqich chegarasi'),
  ('stage_late',              1.25,   'x',      '16+ daraja'),
  ('stage_late_level',        15,     'level',  'Kech bosqich chegarasi'),
  ('pack_unlock_level',       4,      'level',  'Toʻda ochilish darajasi'),
  ('pack_base',               10,     'unit',   'Bazaviy qoʻshin sigʻimi'),
  ('pack_growth',             1.20,   'x',      'Qoʻshin oʻsishi'),
  ('tier_coef',               1.45,   'x',      'Tier stat koeffitsienti'),
  ('tier_step_level',         4,      'level',  'Alfa darajasi / shu = maks tier'),
  ('tier_step_building',      4,      'level',  'Bino darajasi / shu = maks tier'),
  ('alpha_bonus',             0.03,   'ratio',  'Har daraja uchun askar bonusi'),
  ('counter_bonus',           1.30,   'x',      'Qarshi-kuch uchburchagi'),
  ('cost_growth',             1.30,   'x',      'Bino narx oʻsishi'),
  ('time_growth',             1.25,   'x',      'Bino vaqt oʻsishi'),
  ('prod_base',               20,     'unit/h', 'Ustaxona bazaviy ishlab chiqarishi'),
  ('prod_growth',             1.22,   'x',      'Ishlab chiqarish oʻsishi'),
  ('store_base',              40,     'kg',     'Oziq gʻori bazaviy sigʻimi'),
  ('store_growth',            1.22,   'x',      'Sigʻim oʻsishi'),
  ('need_base',               0.60,   'kg',     'Askar boshiga kunlik goʻsht'),
  ('need_growth',             0.10,   'kg/lvl', 'Ehtiyoj oʻsishi'),
  ('raid_coef',               0.22,   'ratio',  'Himoyalanmagan zaxiradan olinadigan ulush'),
  ('loot_cap_ratio',          0.50,   'ratio',  'Oʻlja / kunlik ov chegarasi'),
  ('battle_base_loss',        0.40,   'ratio',  'Teng kuchda yoʻqotish'),
  ('battle_max_loss',         0.90,   'ratio',  'Maksimal yoʻqotish'),
  ('battle_rounds',           5,      'round',  'Jang raundlari'),
  ('battle_variance',         0.10,   'ratio',  'Zarar tasodifi'),
  ('att_death_share',         0.40,   'ratio',  'Hujumchi oʻlim ulushi'),
  ('def_death_share',         0.25,   'ratio',  'Himoyachi oʻlim ulushi'),
  ('march_speed',             20,     'km/h',   'Qoʻshin tezligi'),
  ('scout_speed',             60,     'km/h',   'Razvedka tezligi'),
  ('match_offers',            9,      'count',  'Taklif etiladigan raqib'),
  ('match_refresh_min',       30,     'minute', 'Roʻyxat yangilanishi'),
  ('pair_limit',              3,      'count',  'Bir raqibga kunlik limit'),
  ('shield_newbie_level',     6,      'level',  'Shu darajagacha qalqon'),
  ('shield_after_raid_h',     8,      'hour',   'Hujumdan keyingi qalqon'),
  ('war_duration_h',          12,     'hour',   'Klan urushi'),
  ('war_power_window',        0.20,   'ratio',  'Klan kuch oynasi'),
  ('war_min_participation',   0.25,   'ratio',  'Minimal ishtirok'),
  ('war_min_members',         0.40,   'ratio',  'Minimal aʼzo ishtiroki'),
  ('war_repeat_block_d',      7,      'day',    'Takroriy urush bloki'),
  ('war_winner_loss',         0.20,   'ratio',  'Gʻolib yoʻqotishi'),
  ('war_loser_loss',          0.40,   'ratio',  'Magʻlub yoʻqotishi'),
  ('war_member_cap',          0.15,   'ratio',  'Aʼzo mukofot shifti'),
  ('occupancy_normal',        0.60,   'ratio',  'Normal toʻlganlik'),
  ('occupancy_exp',           1.80,   'power',  'Toʻlganlik eksponenti'),
  ('occupancy_min',           0.50,   'x',      'Minimal vaqt koeffitsienti'),
  ('occupancy_max',           3.00,   'x',      'Maksimal vaqt koeffitsienti'),
  ('promote_loss',            0.10,   'ratio',  'Almashtirish yoʻqotishi'),
  ('offline_store_mult',      2.00,   'x',      'Oflayn ombor kengaytmasi'),
  ('offline_prod_rate',       0.70,   'ratio',  'Oflayn ishlab chiqarish'),
  ('hunger_cp_penalty',       0.30,   'ratio',  'Ochlik CP jazosi'),
  ('hunger_prod_penalty',     0.50,   'ratio',  'Ochlik ishlab chiqarish jazosi'),
  ('hunger_leave_after_d',    7,      'day',    'Ochlikda ketish boshlanishi'),
  ('sleep_shield_h',          72,     'hour',   'Uyqu qalqoni'),
  ('speedup_daily_cap',       0.25,   'ratio',  'Kunlik tezlashtirish chegarasi'),
  ('speedup_base_price',      10,     'ms/h',   'Tezlashtirish bazaviy narxi'),
  ('speedup_price_growth',    1.60,   'x',      'Progressiv narx'),
  ('return_price_coef',       0.60,   'x',      'Qaytish tezlashtirishi'),
  ('vacation_delay_h',        12,     'hour',   'Taʼtil kechikishi'),
  ('vacation_free_h',         48,     'hour',   'Oyiga bepul taʼtil'),
  ('fund_share',              0.15,   'ratio',  'Daromadning mukofot fondiga ulushi'),
  ('quest_daily_cap',         0.15,   'ratio',  'Kundalik vazifa byudjeti'),
  ('quest_weekly_cap',        0.40,   'ratio',  'Haftalik vazifa byudjeti'),
  ('moonlight_passive_base',  0.03,   'unit/soldier/h', 'Oy nuri shaxsiy passiv ishlab chiqarish (20+ daraja, oazissiz)'),
  ('xp_hunt_coef',            0.50,   'xp/kg',  'Ov orqali XP'),
  ('xp_build_coef',           0.02,   'xp/unit','Qurilish/mashq tugashi orqali XP'),
  ('xp_pvp_coef',             0.03,   'xp/EP',  'PvP zarar orqali XP'),
  ('xp_quest_share',          0.10,   'ratio',  'Vazifa mukofoti byudjetidan XP ulushi'),
  ('catchup_max_mult',        0.50,   'ratio',  'Catch-up XP bonusining maksimal qoʻshimchasi (+50%)'),
  ('catchup_gap_coef',        1.50,   'x',      'Chegaradan yuqori nisbatga qoʻllanadigan koeffitsient'),
  ('catchup_gap_threshold',   0.30,   'ratio',  'Bonus ishga tushishi uchun minimal orqada qolish nisbati'),
  ('catchup_taper_start',     15,     'level',  'Bonus shu darajadan pasaya boshlaydi'),
  ('catchup_taper_end',       20,     'level',  'Bonus shu darajada nolga tushadi'),
  ('den_speed_coef',          0.01,   'ratio/lvl', 'In (den) mashq tezlanish bonusi — daraja boshiga'),
  ('camp_yield_share_max',    0.60,   'ratio',  'Lager ulushining maksimal chegarasi (Ustaxona kunlikka nisbatan)');

-- =====================================================================
-- FOYDALI SOʻROVLAR (izoh sifatida)
-- =====================================================================

-- Juftlik chegarasi tekshiruvi:
-- SELECT COUNT(*) FROM battles
--  WHERE attacker_id=? AND defender_id=? AND created_at > NOW() - INTERVAL 1 DAY;

-- Takroriy urush bloki:
-- SELECT 1 FROM clan_wars
--  WHERE ((clan_a=? AND clan_b=?) OR (clan_a=? AND clan_b=?))
--    AND declared_at > NOW() - INTERVAL 7 DAY LIMIT 1;

-- Tugagan navbatlarni yopish (cron, har daqiqa):
-- SELECT id, player_id, kind FROM queues
--  WHERE state='running' AND ends_at <= NOW() LIMIT 500;
