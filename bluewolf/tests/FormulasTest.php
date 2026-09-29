<?php
declare(strict_types=1);

use BlueWolf\Battle;
use BlueWolf\Config;
use BlueWolf\F;

// --- Binolar varagʻi (Excel)
ok(F::buildingCost('food_cave', 2) === ['stone' => 40, 'wood' => 24], 'Oziq gʻori L2 narxi', F::buildingCost('food_cave', 2));
ok(F::buildingCost('food_cave', 5) === ['stone' => 154, 'wood' => 92], 'Oziq gʻori L5 narxi', F::buildingCost('food_cave', 5));
ok(F::buildingCost('food_cave', 25) === ['stone' => 52192, 'wood' => 31315], 'Oziq gʻori L25 narxi', F::buildingCost('food_cave', 25));
ok(F::buildingCost('workshop', 10) === ['stone' => 857, 'wood' => 571, 'bone' => 228], 'Ustaxona L10 narxi', F::buildingCost('workshop', 10));
ok(F::buildingCost('battle_ground', 3) === ['stone' => 66, 'bone' => 33, 'meat' => 55], 'Jang maydoni L3', F::buildingCost('battle_ground', 3));
ok(F::buildingCost('scout_rock', 11) === ['stone' => 954, 'bone' => 477, 'meat' => 795], 'Razvedka qoyasi L11', F::buildingCost('scout_rock', 11));
ok(F::buildingCost('hospital', 2) === ['wood' => 48, 'meat' => 40, 'stone' => 32], 'Shifo gʻori L2', F::buildingCost('hospital', 2));
near(F::buildingTime('food_cave', 25) / 3600, 35.3, 0.05, 'Oziq gʻori L25 vaqti (soat)');
near(F::buildingTime('workshop', 25) / 3600, 42.4, 0.05, 'Ustaxona L25 vaqti (soat)');
near(F::buildingTime('battle_ground', 25) / 3600, 45.9, 0.05, 'Jang maydoni L25 vaqti (soat)');
ok((int) floor(F::foodCap(25)) === 4728, 'Oziq gʻori sigʻimi L25', F::foodCap(25));
near(F::protection(25), 0.78, 1e-9, 'Himoya L25');
near(F::waterRate(25), 397, 0.5, 'Passiv suv L25');
ok((int) round(F::workshopRate(25)) === 2364, 'Ustaxona L25 / soat', F::workshopRate(25));
ok(F::workshopSlots(25) === 10, 'Yigʻuvchi slot L25');
ok(F::healCap(25) === 11 || F::healCap(25) === 12, 'Shifo sigʻimi L25', F::healCap(25));
near(F::healTime(25) / 60, 27.3, 0.1, 'Davolash vaqti L25 (daq)');

// --- Askar iqtisodi
near(F::tierCp('attacker', 1, 19), 126, 0.5, 'Hujumchi t1 CP (alfa 19)');
near(F::tierCp('attacker', 4, 19), 385, 1, 'Hujumchi t4 CP (alfa 19)');
near(F::tierCp('scout', 1, 19), 100, 0.5, 'Razvedkachi t1 CP');
near(F::tierCp('hunter', 3, 19), 201, 1, 'Ovchi t3 CP');
ok(F::trainCost(1) === ['meat' => 20, 'bone' => 8], 'Yangi askar t1 narxi');
ok(F::trainCost(2) === ['meat' => 42, 'bone' => 17], 'Yangi askar t2 narxi', F::trainCost(2));
ok(F::trainCost(3) === ['meat' => 88, 'bone' => 35] || F::trainCost(3) === ['meat' => 89, 'bone' => 35], 'Yangi askar t3 narxi', F::trainCost(3));
near(F::trainTime(3) / 60, 8.4, 0.05, 'Yangi askar t3 vaqti (daq)');
ok((int) (300 / F::promoteNeed(1, 2)) === 188, '300 ta t1 → 188 ta t2');
near(F::occupancyCoef(0.75), 1.49, 0.01, 'Toʻlganlik 75%');
near(F::occupancyCoef(0.9), 2.07, 0.01, 'Toʻlganlik 90%');
near(F::occupancyCoef(0.2), 0.5, 1e-9, 'Toʻlganlik 20% (min)');
ok(F::maxTier('hunter', 1, 1) === 1, 'Ovchi 1-darajada t1');
ok(F::maxTier('attacker', 3, 1) === 0, 'Hujumchi 3-darajada yopiq');
ok(F::maxTier('attacker', 8, 8) === 2, 'Hujumchi L8/B8 → t2');
ok(F::maxTier('attacker', 19, 16) === 4, 'Hujumchi L19/B16 → t4');

// --- Daraja jadvali
ok(F::xpTotal(5) === 280 && F::xpTotal(10) === 2420 && F::xpTotal(25) === 592680, 'Jami XP (Darajalar)');
ok(F::armyCap(4) === 10 && F::armyCap(10) === 30, 'Qoʻshin sigʻimi');
ok(F::stage(4) === 0.4 && F::stage(5) === 0.7 && F::stage(11) === 1.0 && F::stage(16) === 1.25, 'Bosqich koeff.');
near(F::meatNeed(10), 1.5, 1e-9, 'Kunlik goʻsht L10');

// --- PvP
ok(F::marchSeconds(5) === 900 && F::marchSeconds(5, true) === 300, 'Yurish 5 km: 15/5 daq');
near(F::lootDiffCoef(1), 1.3, 1e-9, 'Oʻlja +1 daraja');
near(F::lootDiffCoef(-5), 0.3, 1e-9, 'Oʻlja −3 dan past');
near(F::carry(1), 18, 1e-9, 'Yuk t1');

// --- Tezlashtirish (GDD bo'lim 17): 1s=10, 2s=26, 6s=264
ok(F::speedupPrice(0, 3600) === 10, '1 soat = 10');
ok(F::speedupPrice(0, 7200) === 26, '2 soat = 26', F::speedupPrice(0, 7200));
ok(F::speedupPrice(0, 6 * 3600) === 264, '6 soat = 264', F::speedupPrice(0, 6 * 3600));
ok(F::speedupPrice(3600, 3600) === 16, '2-soat bloki = 16');
ok(F::speedupDailyCap() === 21600, 'Kunlik chegara 6 soat');

// --- Jang (GDD jadvali, tasodifsiz)
$mid = static fn(): float => 0.5;
$g = static fn(int $n) => [['role' => 'hunter', 'tier' => 1, 'qty' => $n]];
$b = Battle::resolve(['groups' => $g(100), 'level' => 10], ['groups' => $g(100), 'level' => 10, 'alpha_cp' => 0.0], false, $mid);
near($b['ratio'], 1.0, 1e-6, 'Teng kuch R');
near($b['att_loss_pct'], 0.40, 1e-6, 'R=1 hujumchi yoʻqotishi');
near($b['def_loss_pct'], 0.40, 1e-6, 'R=1 himoyachi yoʻqotishi');
ok($b['result'] === 'draw', 'R=1 durang');
$lost = array_sum(array_column($b['att_losses']['dead'], 'qty'));
ok($lost === 16, 'R=1 hujumchi oʻlimi 16%', $lost);
$lost = array_sum(array_column($b['def_losses']['dead'], 'qty'));
ok($lost === 10, 'R=1 himoyachi oʻlimi 10%', $lost);
$b = Battle::resolve(['groups' => $g(200), 'level' => 10], ['groups' => $g(100), 'level' => 10, 'alpha_cp' => 0.0], false, $mid);
near($b['att_loss_pct'], 0.20, 1e-6, 'R=2 hujumchi 20%');
near($b['def_loss_pct'], 0.80, 1e-6, 'R=2 himoyachi 80%');
ok($b['result'] === 'attacker_win' && $b['full_win'], 'R=2 toʻliq gʻalaba');
$b = Battle::resolve(['groups' => $g(300), 'level' => 10], ['groups' => $g(100), 'level' => 10, 'alpha_cp' => 0.0], false, $mid);
near($b['def_loss_pct'], 0.90, 1e-6, 'R=3 himoyachi maks 90%');
$b = Battle::resolve(['groups' => $g(100), 'level' => 10], ['groups' => $g(100), 'level' => 10, 'alpha_cp' => 0.0], true, $mid);
near($b['att_loss_pct'], 0.48, 1e-6, 'Tuzoq +20% zarar');
// Qarshi-kuch: himoyachi hujumchini yengadi
$att = [['role' => 'attacker', 'tier' => 1, 'qty' => 100]];
$def = [['role' => 'defender', 'tier' => 1, 'qty' => 100]];
ok(Battle::ep($def, 10, $att, 10, false) > Battle::ep($def, 10, [['role' => 'hunter', 'tier' => 1, 'qty' => 100]], 10, false),
    'Himoyachi hujumchiga qarshi ×1.30');
ok(count(Battle::resolve(['groups' => $att, 'level' => 5], ['groups' => $def, 'level' => 5, 'alpha_cp' => 50], false)['log'])
    === Config::int('battle_rounds') + 1, 'Raund jurnali 0..5');
