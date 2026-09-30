/* Zachkana — namuna maʼlumotlar.
   DIQQAT: bu yerdagi barcha ismlar, sanalar va voqealar dizayn uchun
   toʻqilgan namunalardir. Haqiqiy qishloq maʼlumotlari bilan almashtiriladi
   (keyinchalik API: /api/shajara, /api/tarix, /api/faxriylar, /api/chat). */
window.ZK_DATA = {
  village: {
    name: 'Zachkana',
    region: 'Namuna viloyati, namuna tumani',
    stats: [
      { value: '4 250', label: 'Aholi', icon: 'users' },
      { value: '780', label: 'Xonadon', icon: 'home2' },
      { value: '1 346', label: 'Shajarada', icon: 'shajara' },
      { value: '64', label: 'Faxriy', icon: 'medal' }
    ]
  },

  news: [
    { id: 1, type: 'Eʼlon', tone: 'accent', date: '28-sentabr', title: 'Hasharga taklif: bogʻ koʻchasidagi ariq tozalanadi', text: 'Shanba kuni ertalab soat 8:00 da mahalla guzarida yigʻilamiz. Belkurak olib keling.' },
    { id: 2, type: 'Yangilik', tone: 'primary', date: '25-sentabr', title: 'Shajara boʻlimiga 120 ta yangi ism qoʻshildi', text: 'Qoraxonlar va Mirzaboylar urugʻi boʻyicha maʼlumotlar yangilandi. Oʻzingizni toping!' },
    { id: 3, type: 'Marosim', tone: 'success', date: '22-sentabr', title: 'Toʻxtasinovlar xonadonida toʻy', text: 'Barcha qishloqdoshlar 5-oktabr kuni toʻyga taklif etiladi.' }
  ],

  todayInHistory: { year: 1957, title: 'Qishloqqa birinchi elektr chiroq yondi', text: 'Namuna matn: shu kuni markaziy guzarda birinchi lampochka yoqilgan va butun qishloq bayram qilgan.' },

  clans: [
    { id: 'mirzaboy', name: 'Mirzaboylar', count: 612 },
    { id: 'qoraxon', name: 'Qoraxonlar', count: 438 },
    { id: 'eshon', name: 'Eshonlar', count: 296 }
  ],

  /* Shajara: ichma-ich tuzilma. spouse — turmush oʻrtogʻi. */
  trees: {
    mirzaboy: {
      id: 'p1', name: 'Mirzaboy', g: 'm', b: 1868, d: 1941, job: 'Dehqon, ariq qazuvchi',
      bio: 'Urugʻ asoschisi. Qishloqning yuqori mavzesida birinchi boʻlib bogʻ barpo etgan.',
      spouse: { id: 'p1s', name: 'Oysha momo', g: 'f', b: 1874, d: 1950 },
      children: [
        {
          id: 'p2', name: 'Karimberdi', g: 'm', b: 1895, d: 1972, job: 'Temirchi',
          spouse: { id: 'p2s', name: 'Zulfiya', g: 'f', b: 1899, d: 1980 },
          children: [
            {
              id: 'p5', name: 'Abdulla', g: 'm', b: 1921, d: 1998, job: 'Maktab direktori',
              spouse: { id: 'p5s', name: 'Hojar', g: 'f', b: 1925, d: 2004 },
              children: [
                { id: 'p9', name: 'Rustam', g: 'm', b: 1950, d: 2019, job: 'Agronom',
                  spouse: { id: 'p9s', name: 'Gulnora', g: 'f', b: 1954 },
                  children: [
                    { id: 'p14', name: 'Sardor', g: 'm', b: 1979, job: 'Muhandis', me: true },
                    { id: 'p15', name: 'Dilnoza', g: 'f', b: 1983, job: 'Shifokor' }
                  ] },
                { id: 'p10', name: 'Nodira', g: 'f', b: 1955, job: 'Oʻqituvchi' }
              ]
            },
            { id: 'p6', name: 'Saodat', g: 'f', b: 1926, d: 2011, job: 'Tikuvchi' }
          ]
        },
        {
          id: 'p3', name: 'Toʻxtasin', g: 'm', b: 1901, d: 1978, job: 'Kolxoz raisi',
          spouse: { id: 'p3s', name: 'Robiya', g: 'f', b: 1905, d: 1988 },
          children: [
            { id: 'p7', name: 'Ergash', g: 'm', b: 1930, d: 2008, job: 'Haydovchi',
              spouse: { id: 'p7s', name: 'Mehri', g: 'f', b: 1934, d: 2015 },
              children: [
                { id: 'p11', name: 'Jasur', g: 'm', b: 1962, job: 'Fermer',
                  children: [ { id: 'p16', name: 'Oybek', g: 'm', b: 1990, job: 'Dasturchi' } ] },
                { id: 'p12', name: 'Malika', g: 'f', b: 1966, job: 'Hamshira' }
              ] }
          ]
        },
        {
          id: 'p4', name: 'Hoshimjon', g: 'm', b: 1906, d: 1943, job: 'Askar',
          bio: 'Ikkinchi jahon urushida halok boʻlgan. Xotirasi qishloq yodgorligida.',
          spouse: { id: 'p4s', name: 'Mastura', g: 'f', b: 1910, d: 1992 },
          children: [
            { id: 'p8', name: 'Hamid', g: 'm', b: 1932, d: 2001, job: 'Duradgor',
              children: [ { id: 'p13', name: 'Shahlo', g: 'f', b: 1960, job: 'Kutubxonachi' } ] }
          ]
        }
      ]
    },
    qoraxon: {
      id: 'q1', name: 'Qoraxon', g: 'm', b: 1872, d: 1938, job: 'Chorvador',
      spouse: { id: 'q1s', name: 'Bibisora', g: 'f', b: 1880, d: 1946 },
      children: [
        { id: 'q2', name: 'Umar', g: 'm', b: 1904, d: 1970, job: 'Mirob',
          children: [
            { id: 'q4', name: 'Bahodir', g: 'm', b: 1935, d: 2010, job: 'Veterinar',
              children: [ { id: 'q6', name: 'Farhod', g: 'm', b: 1968, job: 'Tadbirkor' } ] },
            { id: 'q5', name: 'Latofat', g: 'f', b: 1940, job: 'Oʻqituvchi' }
          ] },
        { id: 'q3', name: 'Oyqiz', g: 'f', b: 1909, d: 1995, job: 'Kashtachi' }
      ]
    },
    eshon: {
      id: 'e1', name: 'Eshon bobo', g: 'm', b: 1880, d: 1955, job: 'Mudarris',
      children: [
        { id: 'e2', name: 'Nurmuhammad', g: 'm', b: 1912, d: 1990, job: 'Hisobchi',
          children: [ { id: 'e3', name: 'Zarina', g: 'f', b: 1948, job: 'Shifokor' }, { id: 'e4', name: 'Anvar', g: 'm', b: 1952, job: 'Muhandis' } ] }
      ]
    }
  },

  history: [
    { id: 'nom', title: 'Qishloq nomi qayerdan?', paras: [
      'Namuna matn. Keksalarning hikoya qilishicha, “Zachkana” nomi qadimda shu yerda boʻlgan kichik qalʼa va uning atrofidagi bulogʻlar bilan bogʻliq. Nomning kelib chiqishi haqida bir necha rivoyat bor — ularni qishloqdoshlardan yigʻib, shu boʻlimda jamlaymiz.',
      'Ushbu sahifa qishloq oqsoqollari, maktab oʻqituvchilari va oʻlkashunoslar bilan birgalikda toʻldiriladi. Har bir fakt manbasi bilan koʻrsatiladi.'
    ], quote: { text: 'Qishloqning tarixi — uning odamlari. Har bir xonadonning oʻz hikoyasi bor.', cite: 'Oqsoqollar kengashidan' } },
    { id: 'qadim', title: 'Qadimgi davr', paras: [
      'Namuna matn. Qishloq hududida topilgan sopol buyumlar va eski ariq izlari bu yerda qadimdan dehqonchilik bilan shugʻullanilganini koʻrsatadi.',
      'Suv — hayot. Qishloq tarixi eng avvalo ariqlar, bulogʻlar va ularni asrab kelgan miroblar tarixidir.'
    ] },
    { id: 'xx', title: 'XX asr', paras: [
      'Namuna matn. Asr boshida qishloqda birinchi maktab ochildi. Urush yillarida koʻplab qishloqdoshlarimiz frontga ketdi, ularning nomlari bugun yodgorlik toshida bitilgan.',
      '1950–1970-yillarda qishloqqa elektr, keyin esa radio va telefon keldi. Bogʻlar kengaydi, yangi koʻchalar paydo boʻldi.'
    ] },
    { id: 'mustaqillik', title: 'Mustaqillik yillari', paras: [
      'Namuna matn. Yangi maktab binosi, qishloq vrachlik punkti va sport maydonchasi qurildi. Yoshlar tadbirkorlik bilan shugʻullana boshladi.'
    ] },
    { id: 'bugun', title: 'Bugungi Zachkana', paras: [
      'Bugun Zachkana — anʼanalarini asrab, zamon bilan hamnafas yashayotgan qishloq. zachkana.uz sayti esa uning raqamli xotirasi: shajara, tarix va qishloqdoshlar suhbati bir joyda.'
    ] }
  ],

  eras: ['Barchasi', 'Qadimiy davr', 'XIX asr', 'XX asr', 'Mustaqillik'],
  timeline: [
    { era: 'Qadimiy davr', year: 'Miloddan avval', title: 'Ilk manzilgoh izlari', text: 'Namuna: qishloq hududida qadimiy sopol parchalari topilgan.', icon: 'landmark', major: true },
    { era: 'Qadimiy davr', year: 'X–XII asrlar', title: 'Karvon yoʻli yonidagi bekat', text: 'Namuna: rivoyatlarga koʻra qishloq karvon yoʻlidagi toʻxtash joyi boʻlgan.', icon: 'map' },
    { era: 'XIX asr', year: '1868', title: 'Mirzaboy urugʻi asos solindi', text: 'Namuna: yuqori mavzeda birinchi bogʻ barpo etildi.', icon: 'leaf' },
    { era: 'XIX asr', year: '1890', title: 'Katta ariq qazildi', text: 'Namuna: hashar yoʻli bilan qishloqqa yangi suv keltirildi.', icon: 'flag' },
    { era: 'XX asr', year: '1924', title: 'Birinchi maktab', text: 'Namuna: guzar yonidagi xonadonda savod maktabi ochildi.', icon: 'book', major: true },
    { era: 'XX asr', year: '1941–1945', title: 'Urush yillari', text: 'Namuna: 200 dan ortiq qishloqdoshimiz frontga ketdi.', icon: 'medal' },
    { era: 'XX asr', year: '1957', title: 'Elektr chiroq', text: 'Namuna: qishloqqa birinchi elektr liniyasi tortildi.', icon: 'sun' },
    { era: 'XX asr', year: '1975', title: 'Madaniyat uyi', text: 'Namuna: toʻy va yigʻinlar uchun katta bino qurildi.', icon: 'landmark' },
    { era: 'Mustaqillik', year: '1991', title: 'Yangi davr', text: 'Namuna: qishloq hayotida yangi sahifa ochildi.', icon: 'flag', major: true },
    { era: 'Mustaqillik', year: '2008', title: 'Yangi maktab binosi', text: 'Namuna: 600 oʻrinli zamonaviy maktab foydalanishga topshirildi.', icon: 'book' },
    { era: 'Mustaqillik', year: '2026', title: 'zachkana.uz ishga tushdi', text: 'Qishloqning raqamli xotirasi — shajara, tarix va suhbat bir joyda.', icon: 'star', major: true }
  ],

  veteranCats: [
    { id: 'all', name: 'Barchasi' },
    { id: 'urush', name: 'Urush qatnashchilari' },
    { id: 'mehnat', name: 'Mehnat faxriylari' },
    { id: 'ustoz', name: 'Ustozlar' },
    { id: 'shifokor', name: 'Shifokorlar' }
  ],
  veterans: [
    { id: 'v1', name: 'Hoshimjon Mirzaboyev', b: 1906, d: 1943, cat: 'urush', title: 'Urush qatnashchisi', medals: ['Jasorat ordeni'], short: 'Frontda halok boʻlgan. Xotirasi abadiy.', quote: 'Qaytib kelaman, ona, bogʻni asrang.' },
    { id: 'v2', name: 'Toʻxtasin Mirzaboyev', b: 1901, d: 1978, cat: 'mehnat', title: 'Kolxoz raisi', medals: ['Mehnat shuhrati'], short: '30 yil qishloq xoʻjaligini boshqargan.', quote: 'Yer mehnatni yaxshi koʻradi.' },
    { id: 'v3', name: 'Abdulla Karimberdiyev', b: 1921, d: 1998, cat: 'ustoz', title: 'Maktab direktori', medals: ['Xalq maorifi aʼlochisi'], short: 'Uch avlod qishloqdoshlarni oʻqitgan.', quote: 'Bilim — eng katta meros.' },
    { id: 'v4', name: 'Zarina Nurmuhammadova', b: 1948, cat: 'shifokor', title: 'Qishloq shifokori', medals: ['Sogʻliqni saqlash aʼlochisi'], short: '40 yildan beri qishloq vrachlik punktida.', quote: 'Kechasi eshik taqillasa, turib ketaverasiz.' },
    { id: 'v5', name: 'Ergash Toʻxtasinov', b: 1925, d: 2012, cat: 'urush', title: 'Urush qatnashchisi', medals: ['Gʻalaba medali', 'Jasorat medali'], short: 'Berlingacha borib qaytgan.', quote: 'Tinchlikning qadriga yeting.' },
    { id: 'v6', name: 'Latofat Umarova', b: 1940, cat: 'ustoz', title: 'Boshlangʻich sinf oʻqituvchisi', medals: ['Hurmatli ustoz'], short: '45 yil boshlangʻich sinflarga dars bergan.', quote: 'Har bir bola — bir olam.' },
    { id: 'v7', name: 'Bahodir Umarov', b: 1935, d: 2010, cat: 'mehnat', title: 'Veterinar', medals: ['Mehnat faxriysi'], short: 'Qishloq chorvasini yarim asr davolagan.', quote: 'Hayvon ham til bilmaydi, lekin mehrni tushunadi.' },
    { id: 'v8', name: 'Oyqiz Qoraxonova', b: 1909, d: 1995, cat: 'mehnat', title: 'Kashtachi usta', medals: ['Xalq ustasi'], short: 'Uning soʻzanalari bugun ham xonadonlarni bezaydi.', quote: 'Har bir chok — bir duo.' }
  ],

  channels: [
    { id: 'umumiy', name: 'Umumiy suhbat', icon: 'hash', desc: 'Barcha qishloqdoshlar uchun', members: 1240, online: 23, unread: 4 },
    { id: 'elonlar', name: 'Eʼlonlar', icon: 'megaphone', desc: 'Faqat rasmiy eʼlonlar', members: 1650, online: 12, unread: 1, readonly: true },
    { id: 'marosim', name: 'Toʻy va marakalar', icon: 'heart', desc: 'Taklifnomalar va tabriklar', members: 980, online: 8 },
    { id: 'shajara', name: 'Shajara savollari', icon: 'shajara', desc: 'Qarindoshlarni birga izlaymiz', members: 410, online: 5 },
    { id: 'yoshlar', name: 'Yoshlar', icon: 'star', desc: 'Sport, taʼlim, ish', members: 520, online: 14 }
  ],
  messages: {
    umumiy: [
      { a: 'Jasur Ergashev', t: '08:12', text: 'Assalomu alaykum, qishloqdoshlar! Bugun guzarda bozor bormi?' },
      { a: 'Malika T.', t: '08:15', text: 'Vaalaykum assalom. Ha, soat 9 dan boshlanadi 🙂' },
      { a: 'Shahlo Hamidova', t: '08:21', text: 'Kutubxonaga yangi kitoblar keldi, bolalarni olib keling.' },
      { a: 'Shahlo Hamidova', t: '08:22', text: 'Shanba kuni ertak kechasi ham boʻladi.' },
      { a: 'Farhod Bahodirov', t: '08:40', text: 'Shajara boʻlimida bobomni topdim, rahmat tuzganlarga! Kimdir Qoraxonlar haqida koʻproq bilsa, yozing.' },
      { me: true, a: 'Siz', t: '08:44', text: 'Farhod aka, 1938-yilgacha boʻlgan maʼlumotlarni Latofat opadan soʻrasangiz boʻladi.' }
    ],
    elonlar: [
      { a: 'Mahalla raisi', t: 'Kecha', text: 'Shanba kuni soat 8:00 da ariq tozalash hashari. Hammani kutamiz.' }
    ],
    marosim: [
      { a: 'Toʻxtasinovlar', t: 'Dush', text: '5-oktabr kuni oʻgʻlimiz Oybekning toʻyi. Barchangizni taklif qilamiz!' }
    ],
    shajara: [
      { a: 'Oybek J.', t: '12:03', text: 'Hoshimjon bobomizning urushdan kelgan xatlari kimda saqlangan?' }
    ],
    yoshlar: [
      { a: 'Sardor R.', t: '19:30', text: 'Yakshanba kuni maktab stadionida futbol. Kim qatnashadi?' }
    ]
  }
};
