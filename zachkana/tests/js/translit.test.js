// Lotin ↔ kirill oʻgiruvchi testlari: node tests/js/translit.test.js
const assert = require('node:assert/strict');
const T = require('../../public/js/translit.js');

const L2C = [
  ['Shajara', 'Шажара'], ['Qishloq shajarasi', 'Қишлоқ шажараси'], ['Oʻzbekiston', 'Ўзбекистон'], ["O'zbekiston", 'Ўзбекистон'],
  ['O‘g‘il', 'Ўғил'], ['Toshkent', 'Тошкент'], ['Abdullayev', 'Абдуллаев'], ['yer', 'ер'], ['Yangi yil', 'Янги йил'],
  ['yoʻl', 'йўл'], ['Yoʻldosh', 'Йўлдош'], ['ekran', 'экран'], ['Eʼlonlar', 'Эълонлар'], ['maʼlumot', 'маълумот'],
  ['aeroport', 'аэропорт'], ['keldi', 'келди'], ['Qorongʻi mavzu', 'Қоронғи мавзу'], ['Gʻayrat', 'Ғайрат'], ["Is'hoq", 'Исҳоқ'],
  ['Shoʻxrat', 'Шўхрат'], ['ming', 'минг'], ['Rustam Abdullayevning oʻgʻli', 'Рустам Абдуллаевнинг ўғли'],
  ['oktabrda', 'октябрда'], ['15-oktabr', '15-октябрь'], ['Sentabr', 'Сентябрь'], ['SHAJARA', 'ШАЖАРА'],
  ['PDF yuklash', 'PDF юклаш'], ['Telegram orqali kirish', 'Telegram орқали кириш'],
  ['zachkana.uz saytiga', 'zachkana.uz сайтига'], ['@dilnoza yozdi', '@dilnoza ёзди'], ['https://zachkana.uz/#/shajara', 'https://zachkana.uz/#/shajara'],
  ['1950-y.t.', '1950-й.т.'], ['Soat 8:00 da', 'Соат 8:00 да'], ['Yevropa', 'Европа'], ['Muhammad', 'Муҳаммад'],
];
const C2L = [
  ['Шажара', 'Shajara'], ['Ўзбекистон', 'Oʻzbekiston'], ['Абдуллаев', 'Abdullayev'], ['ер', 'yer'], ['Европа', 'Yevropa'],
  ['келди', 'keldi'], ['Исҳоқ', 'Isʼhoq'], ['маълумот', 'maʼlumot'], ['ШАЖАРА', 'SHAJARA'], ['Шўхрат', 'Shoʻxrat'],
  ['цирк', 'sirk'], ['милиция', 'militsiya'], ['октябрь', 'oktyabr'], ['Ёқубжон', 'Yoqubjon'], ['Эълонлар', 'Eʼlonlar'],
  ['Чорвоқ', 'Chorvoq'], ['Assalomu alaykum', 'Assalomu alaykum'],
];
for (const [l, c] of L2C) assert.equal(T.toCyr(l), c, `toCyr(${l})`);
for (const [c, l] of C2L) assert.equal(T.toLat(c), l, `toLat(${c})`);
// Lotin → kirill → lotin aslidek qaytadi
for (const s of ['Navroʻz bayrami, hammani kutamiz!', 'Hammasini oʻqildi', 'Qoʻngʻiroq', 'Taʼziya']) {
  assert.equal(T.toLat(T.toCyr(s)), s.replace(/'/g, 'ʻ'), s);
}
console.log(`translit: ${L2C.length + C2L.length + 4} ta tekshiruv oʻtdi`);
