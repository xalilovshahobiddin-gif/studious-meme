-- =====================================================================
-- BLUE WOLF — MySQL 8.0 sxemasi
-- Telegram Mini App strategiya oʻyini
-- Kodlash: utf8mb4, Engine: InnoDB
-- Barcha vaqtlar UTC. Resurslar timestamp asosida hisoblanadi (tick yoʻq).
--
-- Yuklash tartibi:
--   1) shu fayl
--   2) blue_wolf_game_config.sql  (tools/blue_wolf_config.py generatsiya qiladi)
--
-- (v2) belgisi — jadval MVP da ishlatilmaydi, lekin sxemada turadi.
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
  x                 SMALLINT UNSIGNED NOT NULL COMMENT 'Xarita koordinatasi',
  y                 SMALLINT UNSIGNED NOT NULL,
  tutorial_step     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0..20, 20 = tugagan',
  shield_until      DATETIME        NULL COMMENT '8/16 soatlik qalqon, qaytish qalqoni',
  sleep_shield      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '72 soat oflayndan keyin yoqiladi',
  vacation_from     DATETIME        NULL COMMENT '12 soatlik kechikishdan keyingi boshlanish',
  vacation_until    DATETIME        NULL,
  hunger_since      DATETIME        NULL COMMENT 'Goʻsht aynan 0 ga tushgan vaqt, NULL = toʻq',
  free_speedups     SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tanishtiruv yakunida 5 ta beriladi',
  second_queue_early TINYINT(1)     NOT NULL DEFAULT 0 COMMENT '2-navbat 4–9 darajada sotib olingan; 10-darajadan hammaga bepul',
  auto_collect      TINYINT(1)      NOT NULL DEFAULT 0,
  offline_store_plus TINYINT(1)     NOT NULL DEFAULT 0 COMMENT 'Oflayn koeff. 2.0 -> 2.5',
  login_streak      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_login_date   DATE            NULL,
  device_hash       CHAR(64)        NULL COMMENT 'Anti-cheat: qurilma barmoq izi',
  ip_hash           CHAR(64)        NULL,
  status            ENUM('active','banned','deleted') NOT NULL DEFAULT 'active',
  banned_until      DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'Oflayn = shundan 5 daqiqadan koʻp',
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_tg (tg_id),
  KEY ix_players_level (level, status),
  KEY ix_players_lastseen (last_seen_at),
  KEY ix_players_device (device_hash),
  KEY ix_players_xy (x, y)
) ENGINE=InnoDB;
-- Klan aʼzoligi faqat clan_members jadvalida (bitta manba).

-- Resurslar alohida jadvalda: eng tez-tez yangilanadigan qator.
-- DECIMAL — soniyalik accrual kasr qismini yoʻqotmasligi uchun.
CREATE TABLE player_resources (
  player_id     BIGINT UNSIGNED NOT NULL,
  -- Oziq resurslari (Oziq gʻori sigʻimi bilan cheklangan)
  meat          DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Goʻsht (kg)',
  water         DECIMAL(20,4) NOT NULL DEFAULT 0,
  herb          DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Shifobaxsh oʻt',
  moonlight     DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Oy nuri (20+ daraja)',
  -- Qurilish resurslari ombori (cheklanmagan)
  stone         DECIMAL(20,4) NOT NULL DEFAULT 0,
  wood          DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Shox-shabba',
  hide          DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Teri',
  bone          DECIMAL(20,4) NOT NULL DEFAULT 0 COMMENT 'Suyak',
  -- Ustaxona buferi (yigʻib olinmagan ishlab chiqarish; sigʻim = soatlik × 10 × oflayn koeff.)
  buf_stone     DECIMAL(20,4) NOT NULL DEFAULT 0,
  buf_wood      DECIMAL(20,4) NOT NULL DEFAULT 0,
  buf_hide      DECIMAL(20,4) NOT NULL DEFAULT 0,
  buf_bone      DECIMAL(20,4) NOT NULL DEFAULT 0,
  -- Valyutalar (butun son)
  moonstone     INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT 'Oy toshi (premium)',
  coins         BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Mavsum tangasi',
  -- Ustaxona taqsimoti: 0..100, yigʻindisi 100 boʻlishi shart
  alloc_stone   TINYINT UNSIGNED NOT NULL DEFAULT 40,
  alloc_wood    TINYINT UNSIGNED NOT NULL DEFAULT 30,
  alloc_hide    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  alloc_bone    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  last_tick_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                COMMENT 'Oxirgi hisob vaqti — timestamp accrual uchun',
  PRIMARY KEY (player_id),
  CONSTRAINT chk_alloc CHECK (alloc_stone + alloc_wood + alloc_hide + alloc_bone = 100),
  CONSTRAINT fk_res_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tur boʻyicha bildirishnoma sozlamalari va vaqt zonasi
CREATE TABLE player_settings (
  player_id       BIGINT UNSIGNED NOT NULL,
  tz              VARCHAR(40) NOT NULL DEFAULT 'Asia/Tashkent' COMMENT 'Klient Intl dan yuboradi; tungi 23:00–08:00 qoidasi uchun',
  allows_pm       TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Telegram: bot yozishi mumkinmi (allows_write_to_pm / requestWriteAccess)',
  notif_disabled  JSON        NULL COMMENT 'Oʻchirilgan turlar: ["build_done", ...]',
  updated_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),
  CONSTRAINT fk_set_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Davriy hisoblagichlar: bozor kunlik limiti, raqib roʻyxatini yangilash,
-- bepul taʼtil soatlari (oylik) va h.k. Bitta jadval — har biri uchun alohida jadval kerak emas.
CREATE TABLE player_counters (
  player_id     BIGINT UNSIGNED NOT NULL,
  counter_key   VARCHAR(32) NOT NULL COMMENT 'market_exchanged, targets_refresh, vacation_free_h, solo_hunt ...',
  period_start  DATE NOT NULL COMMENT 'Kunlik — sana, oylik — oyning 1-kuni',
  value         DECIMAL(20,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, counter_key, period_start),
  CONSTRAINT fk_cnt_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Kosmetika va mavsum yoʻli egaligi (v2)
CREATE TABLE player_items (
  player_id     BIGINT UNSIGNED NOT NULL,
  item_key      VARCHAR(48) NOT NULL COMMENT 'skin_*, frame_*, title_*, pass_season',
  season_id     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Mavsum yoʻli uchun; doimiy narsalar uchun 0',
  acquired_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, item_key, season_id),
  CONSTRAINT fk_item_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 2. BINOLAR
-- 'den' (In) — navbat orqali QURILMAYDI: level = players.level bilan
-- daraja koʻtarilganda kod tomonidan sinxronlanadi.
-- 1-daraja bino ochilganda bepul va darhol yaratiladi (bo'lim 5).
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
-- Alfa (oʻyinchining oʻz boʻrisi) bu jadvalga kirmaydi.
-- =====================================================================

CREATE TABLE army (
  player_id     BIGINT UNSIGNED NOT NULL,
  role          ENUM('scout','attacker','defender','hunter') NOT NULL,
  tier          TINYINT UNSIGNED NOT NULL COMMENT '1..6',
  alive         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Inda turgan sogʻlom askar',
  on_march      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Yurishdagi askar (hujum, razvedka, ov, lager, urush)',
  injured       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jarohatlangan (davolash navbatida yoki kutmoqda)',
  PRIMARY KEY (player_id, role, tier),
  CONSTRAINT fk_army_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 4. NAVBATLAR — qurilish, mashq, almashtirish, davolash
-- Hammasi ends_at bilan. Oflaynda oʻzi tugaydi.
-- =====================================================================

CREATE TABLE queues (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  kind          ENUM('build','train','promote','heal') NOT NULL,
  slot          TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'build uchun 1 yoki 2',
  -- build uchun ('den' hech qachon navbatga tushmaydi)
  building_type ENUM('food_cave','workshop','scout_rock','battle_ground',
                     'defense_wall','hunt_path','hospital','market') NULL,
  target_level  TINYINT UNSIGNED NULL,
  -- train / promote / heal uchun
  role          ENUM('scout','attacker','defender','hunter') NULL,
  tier          TINYINT UNSIGNED NULL,
  from_tier     TINYINT UNSIGNED NULL COMMENT 'promote uchun',
  qty           INT UNSIGNED NULL,
  cost          JSON NOT NULL COMMENT 'Yechilgan resurslar {stone:..,meat:..} — bekor qilishda 80% qaytarish uchun',
  time_coef     DECIMAL(6,3) NOT NULL DEFAULT 1.000 COMMENT 'Bino jazosi x toʻlganlik koeff.',
  started_at    DATETIME NOT NULL,
  ends_at       DATETIME NOT NULL,
  frozen_sec    INT UNSIGNED NULL COMMENT 'Taʼtilda muzlatilganda qolgan soniyalar',
  speeded_sec   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tezlashtirilgan soniyalar',
  state         ENUM('running','done','cancelled') NOT NULL DEFAULT 'running',
  PRIMARY KEY (id),
  KEY ix_queue_player (player_id, state),
  KEY ix_queue_ends (state, ends_at),
  CONSTRAINT fk_queue_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 5. OV GURUHLARI (MVP: rasmiy klansiz vaqtinchalik guruh, 2–4 oʻyinchi)
-- =====================================================================

CREATE TABLE hunt_parties (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  leader_id     BIGINT UNSIGNED NOT NULL,
  prey_level    TINYINT UNSIGNED NOT NULL COMMENT 'Oʻlja qaysi daraja jadvalidan',
  max_members   TINYINT UNSIGNED NOT NULL DEFAULT 4,
  departs_at    DATETIME NOT NULL COMMENT 'Yigʻilish tugaydi, ov boshlanadi',
  state         ENUM('open','hunting','done','cancelled') NOT NULL DEFAULT 'open',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_party_state (state, departs_at),
  CONSTRAINT fk_party_leader FOREIGN KEY (leader_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE hunt_party_members (
  party_id      BIGINT UNSIGNED NOT NULL,
  player_id     BIGINT UNSIGNED NOT NULL,
  march_id      BIGINT UNSIGNED NULL,
  hunt_power    DECIMAL(14,4) NOT NULL DEFAULT 0 COMMENT 'Yuborilgan ovchi unumi, kg/soat — oʻljani boʻlish uchun',
  meat_share    DECIMAL(14,4) NULL,
  joined_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (party_id, player_id),
  KEY ix_hpm_player (player_id),
  CONSTRAINT fk_hpm_party FOREIGN KEY (party_id) REFERENCES hunt_parties(id) ON DELETE CASCADE,
  CONSTRAINT fk_hpm_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 6. YURISHLAR — ov, hujum, razvedka, lager, oazis, urush
-- =====================================================================

CREATE TABLE marches (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id      BIGINT UNSIGNED NOT NULL COMMENT 'Yuboruvchi',
  kind           ENUM('hunt','attack','scout','camp','oasis','war') NOT NULL,
  target_player  BIGINT UNSIGNED NULL COMMENT 'PvP uchun',
  target_bot     JSON NULL COMMENT 'Yovvoyi toʻda: {level, ep, stock, seed}',
  target_oasis   BIGINT UNSIGNED NULL,
  party_id       BIGINT UNSIGNED NULL COMMENT 'Ov guruhi',
  war_id         BIGINT UNSIGNED NULL,
  offer_slot     TINYINT UNSIGNED NULL COMMENT 'Server taklifidan (mavsum jangi) boʻlsa 1..9',
  payload        JSON NOT NULL COMMENT '[{role,tier,qty}, ...]',
  distance_km    DECIMAL(6,2) NOT NULL DEFAULT 0,
  speed_kmh      DECIMAL(6,2) NOT NULL DEFAULT 0,
  departs_at     DATETIME NOT NULL,
  arrives_at     DATETIME NOT NULL COMMENT 'Ov uchun — ov tugash vaqti',
  returns_at     DATETIME NULL COMMENT 'Uyga qaytish vaqti',
  return_speeded TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bir yurishga bir marta',
  loot           JSON NULL COMMENT 'Olib kelinayotgan resurslar',
  state          ENUM('outbound','fighting','gathering','returning','done','recalled')
                 NOT NULL DEFAULT 'outbound',
  PRIMARY KEY (id),
  KEY ix_march_player (player_id, state),
  KEY ix_march_target (target_player, state),
  KEY ix_march_arrive (state, arrives_at),
  KEY ix_march_return (state, returns_at),
  KEY ix_march_war (war_id),
  CONSTRAINT fk_march_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 7. JANGLAR
-- Jang yozuvlari oʻyinchi oʻchirilsa ham saqlanadi (raqibning tarixi uchun),
-- shuning uchun bu yerda FK yoʻq.
-- =====================================================================

CREATE TABLE battles (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind           ENUM('pvp','pve','war','oasis','camp') NOT NULL DEFAULT 'pvp',
  march_id       BIGINT UNSIGNED NULL,
  attacker_id    BIGINT UNSIGNED NOT NULL,
  defender_id    BIGINT UNSIGNED NULL COMMENT 'Bot boʻlsa NULL',
  defender_bot   JSON NULL,
  season_id      INT UNSIGNED NULL,
  is_ranked      TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Server tayinlagan mavsum jangimi',
  is_revenge     TINYINT(1) NOT NULL DEFAULT 0,
  ep_attacker    BIGINT UNSIGNED NOT NULL,
  ep_defender    BIGINT UNSIGNED NOT NULL,
  ratio          DECIMAL(8,3) NOT NULL,
  rounds         TINYINT UNSIGNED NOT NULL DEFAULT 5,
  result         ENUM('attacker_full','attacker_partial','draw','defender_win') NOT NULL,
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
  target_id     BIGINT UNSIGNED NULL COMMENT 'Bot boʻlsa NULL',
  offer_slot    TINYINT UNSIGNED NULL,
  ratio         DECIMAL(8,3) NOT NULL,
  grade         ENUM('fail','partial','full','exact') NOT NULL,
  payload       JSON NULL COMMENT 'Grade darajasiga mos maʼlumot',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL COMMENT '30 daqiqa',
  PRIMARY KEY (id),
  KEY ix_scout_player (player_id, expires_at),
  KEY ix_scout_target (target_id, created_at),
  CONSTRAINT fk_scout_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Matchmaking roʻyxati (30 daqiqa saqlanadi). Botlar ham shu yerda.
CREATE TABLE match_offers (
  player_id     BIGINT UNSIGNED NOT NULL,
  slot          TINYINT UNSIGNED NOT NULL COMMENT '1..9',
  target_id     BIGINT UNSIGNED NULL COMMENT 'Bot boʻlsa NULL',
  bot           JSON NULL COMMENT 'Yovvoyi toʻda: {name_key, level, ep, stock, seed}',
  distance_km   DECIMAL(6,2) NOT NULL,
  power_band    ENUM('weak','even','strong') NOT NULL,
  attacks_used  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  generated_at  DATETIME NOT NULL,
  expires_at    DATETIME NOT NULL,
  PRIMARY KEY (player_id, slot),
  KEY ix_offer_expiry (expires_at),
  CONSTRAINT chk_offer_target CHECK ((target_id IS NULL) <> (bot IS NULL))
) ENGINE=InnoDB;

-- =====================================================================
-- 8. LAGER VA OAZIS (v2)
-- =====================================================================

CREATE TABLE camps (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  march_id      BIGINT UNSIGNED NULL,
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
  KEY ix_camp_ends (state, ends_at),
  CONSTRAINT fk_camp_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE oases (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type          ENUM('water','herb','stone','bone','moon') NOT NULL,
  x             SMALLINT UNSIGNED NOT NULL,
  y             SMALLINT UNSIGNED NOT NULL,
  clan_id       BIGINT UNSIGNED NULL COMMENT 'Egasi, NULL = boʻsh',
  captured_at   DATETIME NULL,
  hold_until    DATETIME NULL COMMENT '24 soat daxlsizlik',
  bonus_pct     DECIMAL(5,3) NOT NULL COMMENT 'Turiga qarab: suv .12, oʻt .20, tosh .15, suyak .15, oy nuri .40',
  min_level     TINYINT UNSIGNED NOT NULL COMMENT '6 / 8 / 12 / 16 / 20',
  PRIMARY KEY (id),
  KEY ix_oasis_clan (clan_id),
  KEY ix_oasis_xy (x, y)
) ENGINE=InnoDB;

-- =====================================================================
-- 9. KLAN (TOʻDA) (v2)
-- =====================================================================

CREATE TABLE clans (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(32) NOT NULL,
  tag           VARCHAR(6)  NOT NULL,
  lang          ENUM('uz','ru','en') NOT NULL DEFAULT 'uz',
  level         TINYINT UNSIGNED NOT NULL DEFAULT 1,
  xp            BIGINT UNSIGNED NOT NULL DEFAULT 0,
  rating        INT NOT NULL DEFAULT 1000 COMMENT 'Urushni rad etsa −50',
  leader_id     BIGINT UNSIGNED NOT NULL,
  treasury      BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Urush mukofotining shiftdan ortgan qismi ham shu yerga',
  max_members   TINYINT UNSIGNED NOT NULL DEFAULT 15,
  join_mode     ENUM('open','request') NOT NULL DEFAULT 'open',
  power_cache   BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Matchmaking uchun, soatda yangilanadi',
  description   VARCHAR(255) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clan_name (name),
  UNIQUE KEY uq_clan_tag (tag),
  KEY ix_clan_power (power_cache),
  CONSTRAINT fk_clan_leader FOREIGN KEY (leader_id) REFERENCES players(id)
) ENGINE=InnoDB;

CREATE TABLE clan_members (
  clan_id       BIGINT UNSIGNED NOT NULL,
  player_id     BIGINT UNSIGNED NOT NULL,
  role          ENUM('alpha','beta','hunter','guard','member') NOT NULL DEFAULT 'member',
  state         ENUM('member','requested') NOT NULL DEFAULT 'member',
  contribution  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  joined_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id),                -- oʻyinchi bir vaqtda bitta klanda (yoki bitta soʻrovda)
  KEY ix_cm_clan (clan_id, state, role),
  CONSTRAINT fk_cm_clan FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
  CONSTRAINT fk_cm_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
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
  state          ENUM('pending','declined','prep','wave1','pause','wave2','final','settled')
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
  KEY ix_cwc_player (player_id),
  CONSTRAINT fk_cwc_war FOREIGN KEY (war_id) REFERENCES clan_wars(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 10. VAZIFALAR VA MAVSUM
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
  KEY ix_quest_reset (kind, resets_at),
  CONSTRAINT fk_quest_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
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
  KEY ix_ss_rank (season_id, score DESC),
  CONSTRAINT fk_ss_season FOREIGN KEY (season_id) REFERENCES seasons(id)
) ENGINE=InnoDB;

-- =====================================================================
-- 11. MONETIZATSIYA
-- Moliyaviy yozuvlar oʻchirilmaydi — FK yoʻq ataylab.
-- =====================================================================

CREATE TABLE transactions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id       BIGINT UNSIGNED NOT NULL,
  kind            ENUM('stars_purchase','moonstone_spend','refund','admin_grant') NOT NULL,
  item_key        VARCHAR(48) NOT NULL COMMENT 'pack_small, speedup_1h, vacation_day, pass_season...',
  stars           INT UNSIGNED NOT NULL DEFAULT 0,
  moonstone_delta INT NOT NULL DEFAULT 0,
  usd_value       DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT 'Mavsum fondi hisobi uchun',
  tg_payment_id   VARCHAR(128) NULL COMMENT 'successful_payment.telegram_payment_charge_id',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tg_payment (tg_payment_id),
  KEY ix_tx_player (player_id, created_at),
  KEY ix_tx_date (created_at)
) ENGINE=InnoDB;

-- Kunlik tezlashtirish chegarasi (25%) va progressiv narx hisoblagichi
CREATE TABLE speedup_usage (
  player_id     BIGINT UNSIGNED NOT NULL,
  usage_date    DATE NOT NULL,
  used_seconds  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Navbat va qaytish tezlashtirishi birga',
  blocks_bought SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Progressiv narx uchun, kunlik',
  cap_seconds   INT UNSIGNED NOT NULL COMMENT '24h x 0.25 = 21600, konfigdan',
  PRIMARY KEY (player_id, usage_date),
  CONSTRAINT fk_su_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 12. ADOLAT NAZORATI
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
-- 13. BILDIRISHNOMALAR
-- =====================================================================

CREATE TABLE notifications (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id     BIGINT UNSIGNED NOT NULL,
  type          VARCHAR(48) NOT NULL COMMENT 'attack_incoming, build_done, war_start...',
  priority      TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '1 — byudjetdan tashqari',
  payload       JSON NULL,
  channel       ENUM('telegram','inapp') NOT NULL DEFAULT 'telegram',
  scheduled_at  DATETIME NOT NULL,
  sent_at       DATETIME NULL,
  read_at       DATETIME NULL,
  state         ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
  PRIMARY KEY (id),
  KEY ix_notif_send (state, scheduled_at),
  KEY ix_notif_player (player_id, type, scheduled_at),
  CONSTRAINT fk_notif_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Kunlik bildirishnoma chegarasi (spam boʻlmasligi uchun)
CREATE TABLE notification_budget (
  player_id     BIGINT UNSIGNED NOT NULL,
  budget_date   DATE NOT NULL,
  sent_count    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  muted_until   DATETIME NULL,
  PRIMARY KEY (player_id, budget_date),
  CONSTRAINT fk_nb_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 14. IDEMPOTENTLIK (X-Request-Id)
-- Bir xil id bilan takroriy soʻrov saqlangan javobni qaytaradi.
-- Cron 24 soatdan eski yozuvlarni oʻchiradi.
-- =====================================================================

CREATE TABLE request_log (
  player_id     BIGINT UNSIGNED NOT NULL,
  request_id    CHAR(36) NOT NULL,
  endpoint      VARCHAR(64) NOT NULL,
  body_hash     CHAR(64) NOT NULL COMMENT 'Bir xil id, boshqa tana -> 409 IDEMPOTENCY_CONFLICT',
  http_status   SMALLINT UNSIGNED NOT NULL,
  response      MEDIUMTEXT NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, request_id),
  KEY ix_req_created (created_at)
) ENGINE=InnoDB;

-- =====================================================================
-- 15. KONFIG VA LOKALIZATSIYA
-- =====================================================================

-- Balans parametrlari. Qiymatlar bu yerda yozilmaydi — ular
-- blue_wolf_game_config.sql da (Excel "Sozlamalar" varagʻidan generatsiya).
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
-- 16. ANALITIKA
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
-- FOYDALI SOʻROVLAR (izoh sifatida)
-- =====================================================================

-- Resurs hisobi (har soʻrovda, tranzaksiya ichida qator qulflanadi):
-- SELECT * FROM player_resources WHERE player_id=? FOR UPDATE;

-- Juftlik chegarasi (24 soatda 3 hujum):
-- SELECT COUNT(*) FROM battles
--  WHERE attacker_id=? AND defender_id=? AND created_at > NOW() - INTERVAL 1 DAY;

-- Takroriy urush bloki:
-- SELECT 1 FROM clan_wars
--  WHERE ((clan_a=? AND clan_b=?) OR (clan_a=? AND clan_b=?))
--    AND declared_at > NOW() - INTERVAL 7 DAY AND state <> 'declined' LIMIT 1;

-- Tugagan navbatlarni yopish (cron va soʻrov ikkalasi ham; ikki marta bajarilmasligi uchun shartli UPDATE):
-- UPDATE queues SET state='done' WHERE id=? AND state='running';   -- affected_rows = 1 boʻlsa davom etiladi
