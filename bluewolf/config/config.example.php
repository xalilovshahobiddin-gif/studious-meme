<?php
// Nusxa oling: cp config/config.example.php config/config.php — va qiymatlarni toʻldiring.
// config/config.php gitga kirmaydi (.gitignore).
return [
    'db_dsn'     => 'mysql:host=localhost;dbname=bluewolf;charset=utf8mb4',
    'db_user'    => 'bluewolf',
    'db_pass'    => 'CHANGE_ME',
    'bot_token'  => '123456789:CHANGE_ME',          // @BotFather
    'webhook_secret' => 'CHANGE_ME_RANDOM_STRING',   // setWebhook secret_token
    'webapp_url' => 'https://bluewolf.uz/',
    'client_version_min' => '1.0.0',
    'dev'        => false,                           // true — X-Dev-User bilan Telegramsiz kirish (faqat lokal!)
];
