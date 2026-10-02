/* Zachkana — oʻzbek lotin ↔ kirill oʻgiruvchi (1995-yilgi rasmiy alifbolar).
   Sayt matnlari bazada qanday yozilgan boʻlsa shunday qoladi; ekranga chiqishda
   tanlangan alifboga oʻgiriladi. Sayt manzillari, email, @login va kodlar oʻgirilmaydi. */
(function (root) {
  'use strict';

  const OKINA = 'ʻ', TUTUQ = 'ʼ';
  const APOS = "ʻʼ'‘’`";
  const isApos = ch => !!ch && APOS.includes(ch);
  const LAT_VOWELS = 'aeiouAEIOU';

  // Oʻgirilmaydigan soʻzlar (brendlar, qisqartmalar)
  const KEEP = new Set(['PDF', 'SMS', 'UI', 'PWA', 'URL', 'ID', 'OK', 'Google', 'Telegram', 'GitHub', 'Gmail', 'iPhone', 'Android', 'iOS', 'Chrome', 'Safari', 'Wi-Fi', 'WiFi', 'Claude', 'MyHeritage', 'FamilySearch', 'GEDCOM', 'ISPmanager', 'phpMyAdmin']);

  // Lotin yozuvida yumshatish belgisi (ь) yoki ц yoʻqoladigan soʻzlar: toʻliq soʻz → kirill
  const LAT_EXCEPT = {
    yanvar: 'январь', fevral: 'февраль', aprel: 'апрель', iyun: 'июнь', iyul: 'июль',
    sentabr: 'сентябрь', sentyabr: 'сентябрь', oktabr: 'октябрь', oktyabr: 'октябрь', noyabr: 'ноябрь', dekabr: 'декабрь',
    sirk: 'цирк', konsert: 'концерт', poezd: 'поезд', moskva: 'Москва', medal: 'медаль', model: 'модель',
    aksiya: 'акция', stansiya: 'станция', sement: 'цемент', avtomobil: 'автомобиль', kinoteatr: 'кинотеатр',
  };

  // Matndagi himoyalangan boʻlaklar: URL, email, @login, domen
  const PROTECT = /(https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w-]+\.[\w.]+|@[\w.]+|\b[\w-]+\.(?:uz|com|ru|org|net|io)\b\S*)/g;

  function splitProtected(text, fn) {
    let out = '', last = 0;
    text.replace(PROTECT, (m, _1, idx) => { out += fn(text.slice(last, idx)) + m; last = idx + m.length; return m; });
    return out + fn(text.slice(last));
  }

  /* ---------- Lotin → kirill ---------- */
  const L2C = { a: 'а', b: 'б', c: 'с', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з' };
  const up = (s, isUp) => (isUp ? s.toUpperCase() : s);

  function latWord(w) {
    const lower = w.toLowerCase();
    if (KEEP.has(w)) return w;
    // Istisnolar (qoʻshimchasi bilan ham: oktabrda → октябрда)
    for (const key in LAT_EXCEPT) {
      if (lower === key || (lower.startsWith(key) && lower.length > key.length && /^[a-zʻʼ']+$/.test(lower.slice(key.length)))) {
        let stem = lower === key ? LAT_EXCEPT[key] : LAT_EXCEPT[key].replace(/ь$/, '');
        if (w[0] !== w[0].toLowerCase()) stem = stem[0].toUpperCase() + stem.slice(1);
        if (w === w.toUpperCase() && w.length > 1) stem = stem.toUpperCase();
        return stem + (lower === key ? '' : latWord(w.slice(key.length)));
      }
    }
    const allUp = w.length > 1 && w === w.toUpperCase();
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const ch = w[i], lo = lower[i], next = lower[i + 1] || '', next2 = w[i + 2] || '';
      const U = allUp || ch !== lo;
      if ((lo === 'o' || lo === 'g') && isApos(w[i + 1] || '')) { out += up(lo === 'o' ? 'ў' : 'ғ', U); i++; continue; }
      if (lo === 's' && next === 'h') { out += up('ш', U); i++; continue; }
      if (lo === 'c' && next === 'h') { out += up('ч', U); i++; continue; }
      if (lo === 'y' && 'oaue'.includes(next) && next) {
        if (next === 'o' && isApos(next2)) { out += up('й', U); continue; } // yoʻl → йўл
        out += up({ o: 'ё', u: 'ю', a: 'я', e: 'е' }[next], U); i++; continue;
      }
      if (lo === 'e') {
        const prev = w[i - 1];
        // Soʻz boshida va unlidan keyin — э (ekran, aeroport), boshqa joyda — е
        out += up(!prev || isApos(prev) || LAT_VOWELS.includes(prev) ? 'э' : 'е', U);
        continue;
      }
      if (isApos(ch)) {
        // s'h → сҳ (ajratuvchi belgi), qolgan holatlarda tutuq belgisi → ъ
        if (lower[i - 1] === 's' && next === 'h') continue;
        out += i === 0 || i === w.length - 1 ? ch : (allUp ? 'Ъ' : 'ъ');
        continue;
      }
      out += L2C[lo] ? up(L2C[lo], U) : ch;
    }
    return out;
  }

  function toCyr(text) {
    if (!text || !/[A-Za-z]/.test(text)) return text;
    return splitProtected(text, part => part.replace(/[A-Za-z][A-Za-zʻʼ'‘’`-]*/g, m => {
      // Soʻz oxiridagi tirnoq/defis — soʻzga tegishli emas
      const tail = m.match(/[ʼ'‘’`-]+$/);
      const word = tail && !/[oOgG][ʻʼ'‘’`]$/.test(m) ? m.slice(0, -tail[0].length) : m;
      const rest = m.slice(word.length);
      return word.split('-').map(latWord).join('-') + rest;
    }));
  }

  /* ---------- Kirill → lotin ---------- */
  const C2L = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ч: 'ch', ш: 'sh', щ: 'sh', ъ: TUTUQ, ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ё: 'yo', ў: 'o' + OKINA, қ: 'q', ғ: 'g' + OKINA, ҳ: 'h' };
  const CYR_VOWELS = 'аеёиоуэюяўАЕЁИОУЭЮЯЎ';

  function cyrWord(w) {
    let out = '';
    for (let i = 0; i < w.length; i++) {
      const ch = w[i], lo = ch.toLowerCase();
      const isU = ch !== lo;
      const nextU = (w[i + 1] || '') !== (w[i + 1] || '').toLowerCase();
      const prev = (w[i - 1] || '').toLowerCase();
      let r;
      if (lo === 'е') r = !prev || CYR_VOWELS.includes(prev) || prev === 'ъ' || prev === 'ь' ? 'ye' : 'e';
      else if (lo === 'ц') r = prev && CYR_VOWELS.includes(prev) ? 'ts' : 's';
      else if (lo === 'ҳ' && prev === 'с') r = TUTUQ + 'h'; // Исҳоқ → Is'hoq
      else if (lo in C2L) r = C2L[lo];
      else { out += ch; continue; }
      if (isU && r) r = nextU || (w.length > 1 && w === w.toUpperCase()) ? r.toUpperCase() : r[0].toUpperCase() + r.slice(1);
      out += r;
    }
    return out;
  }

  function toLat(text) {
    if (!text || !/[Ѐ-ӿ]/.test(text)) return text;
    return splitProtected(text, part => part.replace(/[Ѐ-ӿ]+/g, cyrWord));
  }

  root.ZkTranslit = { toCyr, toLat };
  if (typeof module !== 'undefined') module.exports = root.ZkTranslit;
})(typeof window !== 'undefined' ? window : globalThis);
