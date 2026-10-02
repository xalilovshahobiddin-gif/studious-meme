-- =====================================================================
-- BLUE WOLF — resurslarni soddalashtirish
-- Teri, shifobaxsh oʻt va suv olib tashlandi: birortasi hech narsaga sarflanmas edi
-- (Excel binolar varagʻida teri yoʻq, oʻtning manbasi yoʻq, suvning sarfi yoʻq).
-- Ustaxona endi 3 resurs ishlab chiqaradi: tosh, shox-shabba, suyak.
-- =====================================================================

-- Mavjud oʻyinchilar: teriga berilgan ulush toshga qoʻshiladi (yigʻindi 100 boʻlib qoladi)
UPDATE player_resources SET alloc_stone = alloc_stone + alloc_hide;

ALTER TABLE player_resources
  DROP COLUMN water,
  DROP COLUMN herb,
  DROP COLUMN hide,
  DROP COLUMN alloc_hide,
  DROP COLUMN ws_hide,
  -- Standart taqsimot 1→10 daraja binolari talabiga mos: tosh 57% · shox-shabba 26% · suyak 17%
  ALTER COLUMN alloc_stone SET DEFAULT 57,
  ALTER COLUMN alloc_wood  SET DEFAULT 26,
  ALTER COLUMN alloc_bone  SET DEFAULT 17;

DELETE FROM game_config WHERE config_key IN
  ('start_hide', 'water_base', 'water_growth', 'water_need_base', 'water_need_growth');
DELETE FROM locales WHERE locale_key IN ('res.water', 'res.herb', 'res.hide', 'fx.water_per_h');
