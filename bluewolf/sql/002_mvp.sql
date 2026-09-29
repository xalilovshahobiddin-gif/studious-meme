-- =====================================================================
-- BLUE WOLF — MVP qoʻshimchalari (001_schema.sql ustidan)
-- Asosiy sxemaga tegmasdan, MVP uchun kerakli ustun va jadvallar.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Oʻyinchi: botlar (NPC toʻdalar), jang seriyasi, statistika
ALTER TABLE players
  ADD COLUMN is_bot           TINYINT(1)       NOT NULL DEFAULT 0 COMMENT 'NPC toʻda (matchmaking havzasini toʻldiradi)' AFTER status,
  ADD COLUMN def_loss_streak  TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ketma-ket himoyada yutqazish (16 soatlik qalqon uchun)',
  ADD COLUMN hunger_lost_pct  DECIMAL(5,3)     NOT NULL DEFAULT 0 COMMENT 'Ochlikda ketgan askarlar ulushi (maks 0.5)',
  ADD COLUMN offers_attacks   TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Joriy raqib roʻyxatidan beri hujumlar',
  ADD COLUMN stat_hunts       INT UNSIGNED     NOT NULL DEFAULT 0,
  ADD COLUMN stat_battles     INT UNSIGNED     NOT NULL DEFAULT 0,
  ADD COLUMN stat_wins        INT UNSIGNED     NOT NULL DEFAULT 0,
  ADD KEY ix_players_bot (is_bot, level);

-- Resurslar kasr qismini yoʻqotmasligi uchun DECIMAL (timestamp accrual)
ALTER TABLE player_resources
  MODIFY meat  DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY water DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY herb  DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY stone DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY wood  DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY hide  DECIMAL(20,4) NOT NULL DEFAULT 0,
  MODIFY bone  DECIMAL(20,4) NOT NULL DEFAULT 0,
  -- Ustaxona ichki ombori: /buildings/collect bilan asosiy omborga oʻtadi
  ADD COLUMN ws_stone DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN ws_wood  DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN ws_hide  DECIMAL(20,4) NOT NULL DEFAULT 0,
  ADD COLUMN ws_bone  DECIMAL(20,4) NOT NULL DEFAULT 0;

ALTER TABLE battles
  ADD COLUMN kind ENUM('pvp','bot','tutorial') NOT NULL DEFAULT 'pvp' AFTER march_id,
  ADD COLUMN trap TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Razvedkasiz hujumda tuzoqqa tushdi';

-- Ov (asosiy sikl): alfa va ovchilar oʻljaga chiqadi
CREATE TABLE hunts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id   BIGINT UNSIGNED NOT NULL,
  prey_key    VARCHAR(24)     NOT NULL,
  payload     JSON            NOT NULL COMMENT 'Ovga chiqqan ovchilar [{role,tier,qty}]',
  meat        DECIMAL(12,2)   NOT NULL,
  xp          INT UNSIGNED    NOT NULL,
  started_at  DATETIME        NOT NULL,
  ends_at     DATETIME        NOT NULL,
  state       ENUM('running','done','cancelled') NOT NULL DEFAULT 'running',
  PRIMARY KEY (id),
  KEY ix_hunt_player (player_id, state),
  CONSTRAINT fk_hunt_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Idempotentlik: X-Request-Id boʻyicha javob keshi
CREATE TABLE request_log (
  player_id   BIGINT UNSIGNED NOT NULL,
  request_id  CHAR(36)        NOT NULL,
  endpoint    VARCHAR(64)     NOT NULL,
  response    MEDIUMTEXT      NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, request_id),
  KEY ix_reqlog_created (created_at)
) ENGINE=InnoDB;

-- Chastota cheklovi (API bo'lim 13)
CREATE TABLE rate_limits (
  player_id     BIGINT UNSIGNED NOT NULL,
  bucket        VARCHAR(24)     NOT NULL,
  window_start  DATETIME        NOT NULL,
  hits          INT UNSIGNED    NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, bucket)
) ENGINE=InnoDB;
