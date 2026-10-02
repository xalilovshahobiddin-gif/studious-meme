<?php
// Kundalik vazifalar (GDD bo'lim 14): 4 + kirish bonusi.
// target — shart, reward — mukofot turi (byudjet: kunlik ishlab chiqarish × quest_daily_cap ÷ quest_daily_count)
return [
  'daily' => [
    'hunt'  => ['target' => 3, 'reward' => ['meat' => 1.0]],
    'build' => ['target' => 1, 'reward' => ['stone' => 0.5, 'wood' => 0.5]],
    'train' => ['target' => 1, 'reward' => ['bone' => 1.0]],
    'pvp'   => ['target' => 1, 'reward' => ['stone' => 0.4, 'wood' => 0.3, 'bone' => 0.3], 'level' => 4],
    'login' => ['target' => 1, 'reward' => ['meat' => 0.5]],
  ],
];
