-- =====================================================================
-- BLUE WOLF — katta toʻda: askar soni ×20
-- army_scale toʻdaga bogʻliq hamma narsani bir joydan koʻpaytiradi:
--   qoʻshin sigʻimi (4-darajadan), Oziq gʻori sigʻimi, rol binolari va Shifo gʻori sigʻimi,
--   toʻda ovi goʻshti; bitta askar mashqi vaqti esa shuncha qisqaradi.
-- Bitta askarning narxi, kuchi va yuki oʻzgarmaydi — toʻda kuchi ham ×20.
-- =====================================================================

INSERT INTO game_config (config_key, config_value, unit, note) VALUES
  ('army_scale',       20,   'x',     'Toʻda masshtabi: qoʻshin, ombor, rol binosi va shifo sigʻimi, toʻda ovi oʻljasi'),
  ('hunt_bone_ratio',  0.4,  'ratio', 'Ovdan keladigan suyak = goʻsht × shu (GDD: suyak manbai — ustaxona va ov)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), unit = VALUES(unit), note = VALUES(note);

ALTER TABLE hunts ADD COLUMN bone DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER meat;
