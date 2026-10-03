<?php

return [

    /*
    | Ilova versiyasi. Klient X-Client-Version bilan solishtiradi.
    */
    'version' => '0.0.8',

    /*
    | Telegram bot tokeni (@BotFather). initData imzosi shu bilan tekshiriladi.
    */
    'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),

    /*
    | initData qancha vaqtgacha amal qiladi (soniya). API spetsifikatsiyasi: 24 soat.
    */
    'init_data_max_age' => (int) env('TELEGRAM_INIT_DATA_MAX_AGE', 86400),

    /*
    | Faqat lokal ishlab chiqish uchun: Telegramsiz brauzerda ochilganda
    | "X-Dev-User: <id>" sarlavhasi bilan kirish. Productionda HAR DOIM false.
    */
    'dev_auth' => (bool) env('BLUEWOLF_DEV_AUTH', false),

];
