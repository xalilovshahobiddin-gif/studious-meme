<?php
// Tanishtiruv (GDD bo'lim 15) — 20 qadam. Matnlar locales da: tutorial.step.N.text
// level  — qadam bajariladigan daraja (qadam tugagach keyingi qadam darajasiga koʻtariladi)
// check  — server tekshiradigan shart (klientga ishonilmaydi)
// reward — qadam mukofoti
return [
  1  => ['level' => 1, 'check' => null,                               'reward' => []],
  2  => ['level' => 1, 'check' => ['hunts' => 1],                     'reward' => ['meat' => 5]],
  3  => ['level' => 1, 'check' => null,                               'reward' => []],
  4  => ['level' => 2, 'check' => ['building' => ['food_cave', 2]],   'reward' => ['free_speedups' => 1]],
  5  => ['level' => 2, 'check' => null,                               'reward' => ['meat' => 20]],
  6  => ['level' => 2, 'check' => ['building' => ['workshop', 2]],    'reward' => ['free_speedups' => 1]],
  7  => ['level' => 2, 'check' => null,                                'reward' => ['stone' => 100]],
  8  => ['level' => 3, 'check' => ['building' => ['hunt_path', 2]],   'reward' => ['free_speedups' => 1]],
  9  => ['level' => 3, 'check' => ['army' => ['hunter', 1]],          'reward' => []],
  10 => ['level' => 3, 'check' => ['building' => ['food_cave', 3]],   'reward' => ['free_speedups' => 1]],
  11 => ['level' => 4, 'check' => null,                               'reward' => ['army' => ['hunter', 3], 'meat' => 30]],
  12 => ['level' => 4, 'check' => ['hunts' => 3],                     'reward' => ['meat' => 8]],
  13 => ['level' => 4, 'check' => ['building' => ['battle_ground', 2]], 'reward' => ['free_speedups' => 1]],
  14 => ['level' => 4, 'check' => ['army' => ['attacker', 1]],        'reward' => []],
  15 => ['level' => 4, 'check' => null,                               'reward' => ['meat' => 20]],
  16 => ['level' => 4, 'check' => ['tutorial_battle' => true],        'reward' => ['stone' => 50]],
  17 => ['level' => 5, 'check' => ['building' => ['scout_rock', 2]],  'reward' => ['free_speedups' => 1, 'army' => ['scout', 2]]],
  18 => ['level' => 5, 'check' => ['tutorial_scout' => true],         'reward' => []],
  19 => ['level' => 5, 'check' => ['building' => ['defense_wall', 2]], 'reward' => ['free_speedups' => 1]],
  20 => ['level' => 5, 'check' => null,                               'reward' => ['meat' => 500, 'stone' => 300, 'wood' => 200, 'free_speedups' => 1]],
];
