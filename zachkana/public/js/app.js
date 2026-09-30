/* Zachkana — ilova (SPA, hash-router, PWA) */
(() => {
  'use strict';

  // D — ilovadagi barcha maʼlumotlar. Server boʻlsa API dan toʻldiriladi,
  // boʻlmasa (masalan GitHub Pages) js/data.js dagi namuna maʼlumotlar ishlatiladi.
  const D = window.ZK_DATA;
  D.user = null;
  D.vetDetail = {};
  // Kirish usullari (server boʻlsa /api/bootstrap dan keladi; demo uchun hammasi koʻrsatiladi)
  D.auth = { password: true, phone: false, google: true, telegram: 'zachkana_bot' };
  const I = (n, c) => window.ZIcons.svg(n, c);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* shaxsiy rejim */ } }
  };

  /* ---------- API ---------- */
  const api = {
    live: false,     // server bilan ishlayapmizmi (aks holda — demo)
    offline: false,  // server bor, lekin hozir internet yoʻq (keshdan)
    xsrf() { const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/); return m ? decodeURIComponent(m[1]) : ''; },
    async request(method, path, body, { timeout = 12000 } = {}) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
      if (method !== 'GET') headers['X-XSRF-TOKEN'] = this.xsrf();
      if (body && !(body instanceof FormData)) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
      try {
        const res = await fetch('api/' + path, { method, headers, body, credentials: 'same-origin', signal: ctrl.signal });
        const type = res.headers.get('content-type') || '';
        const data = type.includes('application/json') ? await res.json() : null;
        if (!res.ok || data === null) throw Object.assign(new Error(data?.message || 'HTTP ' + res.status), { status: res.status, data });
        return data;
      } finally { clearTimeout(timer); }
    },
    // GET javoblari qurilmada saqlanadi — internet yoʻqligida oxirgi maʼlumot koʻrsatiladi
    async get(path, opts) {
      try {
        const data = await this.request('GET', path, null, opts);
        if (!/messages/.test(path)) store.set('zk-api:' + path, data);
        this.offline = false;
        return data;
      } catch (e) {
        const cached = e.status ? undefined : store.get('zk-api:' + path);
        if (cached !== undefined) { this.offline = true; return cached; }
        throw e;
      }
    },
    post(path, body) { return this.request('POST', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); }
  };
  // Tekshiruv xatosidan birinchi xabarni olish
  const errText = e => e?.data?.errors ? Object.values(e.data.errors)[0][0] : (e?.status === 429 ? 'Juda koʻp urinish. Birozdan keyin qayta urinib koʻring.' : e?.data?.message || (navigator.onLine ? 'Xatolik yuz berdi' : 'Internet yoʻq'));

  const bootNotice = {};
  function applyBootstrap(b) {
    bootNotice.notice = b.notice; bootNotice.error = b.error;
    D.village = b.village;
    D.news = b.news;
    D.todayInHistory = b.todayInHistory;
    D.clans = b.clans;
    D.channels = b.channels;
    D.user = b.user;
    D.members = b.members;
    D.auth = b.auth || D.auth;
    D.unread = b.unread || 0;
    D.trees = {};
    D.messages = {};
    D.history = D.timeline = D.veterans = null;
    D.vetDetail = {};
    if (!D.clans.some(c => c.id === shajaraState.clan)) shajaraState.clan = D.clans[0]?.id;
  }
  async function refreshBootstrap() { applyBootstrap(await api.get('bootstrap')); }

  // Har bir sahifa ochilishidan oldin kerakli maʼlumotni yuklaydi (faqat server rejimida)
  const loaders = {
    home: () => ensureVeterans(),
    shajara: async arg => {
      if (arg === 'oila') { if (D.user) await family.load(); return; }
      if (arg && D.clans.some(c => c.id === arg)) shajaraState.clan = arg;
      await loadClanTree(shajaraState.clan);
    },
    tarix: async () => { if (!D.history) D.history = await api.get('history'); },
    elonlar: async () => { D.news = await api.get('announcements'); },
    xronologiya: async () => { if (!D.timeline) { const t = await api.get('timeline'); D.eras = t.eras; D.timeline = t.events; } },
    faxriylar: async id => {
      await ensureVeterans();
      if (id) D.vetDetail[id] = await api.get('veterans/' + id);
    },
    chat: async id => {
      if (!D.user || !id && !matchMedia('(min-width: 1024px)').matches) return;
      const ch = id || D.channels[0]?.id;
      if (ch && D.channels.some(c => c.id === ch)) {
        const r = await api.get(`channels/${ch}/messages`);
        D.messages[ch] = r.messages;
        D.canPost = r.can_post;
        D.canDelete = r.can_delete;
      }
    }
  };
  async function ensureVeterans() {
    if (!D.veterans) { const v = await api.get('veterans'); D.veteranCats = v.categories; D.veterans = v.veterans; }
  }
  // Kirish talab qilinadigan amallar uchun
  function needLogin(msg = 'Buning uchun saytga kiring') {
    if (!api.live || D.user) return false;
    try { sessionStorage.setItem('zk-return', location.hash); } catch { /* */ }
    toast(msg, 'user');
    location.hash = '#/profil';
    return true;
  }

  /* ---------- Yordamchi komponentlar ---------- */
  const initials = name => name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0; return (h % 6) + 1; };
  const avatar = (name, size = '', extra = '') => `<span class="z-avatar ${size ? 'z-avatar--' + size : ''} ${extra}" data-hue="${hue(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
  const vetAvatar = (v, size) => v.photo
    ? `<span class="z-avatar z-avatar--${size} z-avatar--faxriy"><img src="${esc(v.photo)}" alt="" loading="lazy"></span>`
    : avatar(v.name, size, 'z-avatar--faxriy');
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const years = p => p.d ? `${p.b ?? '?'}–${p.d}` : p.b ? `${p.b}-y.t.` : '';
  const vetYears = v => v.d ? `${v.b ?? '?'}–${v.d}` : v.b ? `${v.b}-yilda tugʻilgan` : '';

  const NAV = [
    { id: 'home', href: '#/', label: 'Bosh sahifa', short: 'Bosh', icon: 'home', group: 'Qishloq' },
    { id: 'tarix', href: '#/tarix', label: 'Qishloq tarixi', icon: 'book', group: 'Qishloq' },
    { id: 'xronologiya', href: '#/xronologiya', label: 'Xronologiya', icon: 'timeline', group: 'Qishloq' },
    { id: 'faxriylar', href: '#/faxriylar', label: 'Faxriylar', icon: 'medal', group: 'Qishloq' },
    { id: 'elonlar', href: '#/elonlar', label: 'Eʼlonlar', icon: 'megaphone', group: 'Qishloq' },
    { id: 'shajara', href: '#/shajara', label: 'Shajara', icon: 'shajara', group: 'Oila' },
    { id: 'chat', href: '#/chat', label: 'Suhbat', icon: 'chat', group: 'Jamoa' },
    { id: 'profil', href: '#/profil', label: 'Profil', icon: 'user', group: 'Jamoa' }
  ];
  const TABS = ['home', 'shajara', 'faxriylar', 'chat'];
  const unreadTotal = () => (D.channels || []).reduce((s, c) => s + (c.unread || 0), 0);

  /* ---------- Mavzu (yorugʻ / qorongʻi) ---------- */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const effectiveTheme = () => document.documentElement.dataset.theme || (mq.matches ? 'dark' : 'light');
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('zk-theme', t); } catch { /* */ }
    $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', t === 'dark' ? '#15120e' : '#faf5ec'));
    renderChrome();
  }
  mq.addEventListener?.('change', () => renderChrome());

  /* ---------- Bildirishnoma (toast) ---------- */
  function toast(msg, icon = 'check') {
    const el = document.createElement('div');
    el.className = 'z-toast';
    el.innerHTML = `${I(icon)}<span>${esc(msg)}</span>`;
    $('#toasts').append(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  /* ---------- Varaq (bottom sheet / modal) ---------- */
  let lastFocus = null;
  function openSheet(html) {
    const sheet = $('#sheet'), scrim = $('#scrim');
    lastFocus = document.activeElement;
    sheet.innerHTML = `<div class="z-sheet__handle"></div><button class="z-btn z-btn--ghost z-btn--icon z-btn--sm sheet-close" data-action="close-sheet" aria-label="Yopish">${I('close')}</button>${html}`;
    sheet.hidden = scrim.hidden = false;
    requestAnimationFrame(() => { sheet.classList.add('is-open'); scrim.classList.add('is-open'); });
    document.body.classList.add('is-locked');
    setTimeout(() => (sheet.querySelector('input, textarea, button:not(.sheet-close)') || sheet).focus?.(), 60);
  }
  function closeSheet() {
    const sheet = $('#sheet'), scrim = $('#scrim');
    if (sheet.hidden) return;
    sheet.classList.remove('is-open'); scrim.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { sheet.hidden = scrim.hidden = true; sheet.innerHTML = ''; }, 320);
    lastFocus?.focus?.();
  }

  /* ---------- Illyustratsiya: qishloq manzarasi ---------- */
  function villageArt(cls = '') {
    const poplar = (x, h) => `<g class="va-tree"><rect x="${x - 1.5}" y="${230 - 8}" width="3" height="10" class="va-trunk"/><ellipse cx="${x}" cy="${230 - 8 - h / 2}" rx="${h / 6.5}" ry="${h / 2}"/></g>`;
    const house = (x, w, h) => `<g><rect x="${x}" y="${232 - h}" width="${w}" height="${h}" rx="2" class="va-house"/><rect x="${x - 3}" y="${232 - h - 5}" width="${w + 6}" height="6" rx="2" class="va-roof"/><rect x="${x + w * .2}" y="${232 - h * .65}" width="${w * .2}" height="${h * .3}" rx="1.5" class="va-win"/><rect x="${x + w * .58}" y="${232 - h * .65}" width="${w * .2}" height="${h * .3}" rx="1.5" class="va-win"/></g>`;
    const stars = [[80, 40], [150, 70], [230, 30], [330, 60], [420, 25], [500, 55], [700, 35], [760, 80], [560, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" class="va-star"/>`).join('');
    return `<svg class="village-art ${cls}" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      ${stars}
      <circle cx="640" cy="92" r="34" class="va-sun"/>
      <path class="va-m1" d="M0 175 90 112l70 38 100-72 100 74 90-52 110 62 90-66 150 58v126H0z"/>
      <path class="va-snow" d="m260 78 22 16-12-2-10 8-10-8-12 3zM650 96l18 13-10-1-8 6-8-6-10 2z"/>
      <path class="va-m2" d="M0 205q120-45 240-14t240-6 320-12v87H0z"/>
      ${[40, 58, 190, 206, 222, 470, 486, 690, 708, 726].map((x, i) => poplar(x, 58 + (i % 3) * 12)).join('')}
      ${house(90, 46, 26)}${house(150, 34, 20)}${house(265, 52, 30)}${house(540, 44, 24)}${house(600, 36, 20)}
      <path class="va-m3" d="M0 232q200-16 400-3t400-4v35H0z"/>
      <path class="va-river" d="M0 248q180-10 360 0t440-2v4q-240 8-440 2T0 252z"/>
    </svg>`;
  }

  /* ---------- Sahifalar ---------- */
  const views = {};

  views.home = () => {
    const v = D.village;
    return {
      title: 'Bosh sahifa',
      html: `
      <section class="hero z-ornament">
        <div class="hero__content">
          <span class="z-overline">Xush kelibsiz</span>
          <h1 class="z-h1">Zachkana — bizning qishloq</h1>
          <p class="z-lead">Shajarangizni toping, qishloq tarixini oʻqing va qishloqdoshlar bilan bir joyda suhbatlashing.</p>
          <div class="z-row hero__cta">
            <a class="z-btn z-btn--primary z-btn--lg" href="#/shajara">${I('shajara')}Shajarani ochish</a>
            <a class="z-btn z-btn--lg hero__btn2" href="#/tarix">${I('book')}Tarixni oʻqish</a>
          </div>
        </div>
        <div class="hero__art">${villageArt()}</div>
      </section>

      <section class="stats" aria-label="Qishloq raqamlarda">
        ${v.stats.map(s => `<div class="z-card stat-card"><span class="stat-card__icon">${I(s.icon)}</span><div class="z-stat"><span class="z-stat__value">${s.value}</span><span class="z-stat__label">${s.label}</span></div></div>`).join('')}
      </section>

      <section class="section">
        <nav class="tiles" aria-label="Tezkor oʻtish">
          ${[
            ['#/shajara', 'shajara', 'Shajara', 'Oila daraxti'],
            ['#/tarix', 'book', 'Tarix', 'Qishloq hikoyasi'],
            ['#/xronologiya', 'timeline', 'Xronologiya', 'Yillar boʻyicha'],
            ['#/faxriylar', 'medal', 'Faxriylar', 'Faxrimiz'],
            ['#/chat', 'chat', 'Suhbat', 'Qishloqdoshlar'],
            ['#/profil', 'user', 'Profil', D.user ? D.user.name.split(' ')[0] : 'Kirish']
          ].map(([h, ic, t, s], i) => `<a class="tile tile--${i + 1}" href="${h}"><span class="tile__icon">${I(ic)}</span><span class="tile__title">${t}</span><span class="tile__sub">${s}</span></a>`).join('')}
        </nav>
      </section>

      <div class="home-cols section">
        <section>
          <div class="section-head"><h2 class="z-h4">Eʼlonlar va yangiliklar</h2><button class="z-btn z-btn--ghost z-btn--sm" data-action="notifications">Barchasi ${I('chevron-right')}</button></div>
          <div class="z-stack" style="--z-gap:12px">
            ${D.news.length ? '' : `<div class="z-card"><div class="z-empty">${I('megaphone')}<p>Hozircha eʼlon yoʻq</p></div></div>`}
            ${D.news.map(n => `
              <a class="z-card z-card--interactive news-card" href="#/elonlar/${n.id}">
                <div class="z-card__body">
                  <div class="z-spread"><span class="z-badge z-badge--${n.tone}">${n.type}</span><span class="z-caption">${n.date}</span></div>
                  <h3 class="news-card__title">${esc(n.title)}</h3>
                  <p class="z-small">${esc(n.text)}</p>
                </div>
              </a>`).join('')}
          </div>
        </section>
        <aside class="z-stack" style="--z-gap:16px">
          ${D.todayInHistory ? `<div class="z-card z-card--accent today-card z-ornament">
            <div class="z-card__body">
              <span class="z-overline" style="color:var(--z-orik-300)">Bugun tarixda</span>
              <div class="today-card__year">${D.todayInHistory.year}</div>
              <h3 class="today-card__title">${esc(D.todayInHistory.title)}</h3>
              <p>${esc(D.todayInHistory.text)}</p>
              <a class="z-btn z-btn--accent z-btn--sm" href="#/xronologiya">Xronologiyani koʻrish ${I('chevron-right')}</a>
            </div>
          </div>` : ''}
          <div class="z-card">
            <div class="z-card__body z-stack" style="--z-gap:12px">
              <div class="z-spread"><strong>Shajarani birga toʻldiramiz</strong><span class="z-badge z-badge--success">${D.clans.length} urugʻ</span></div>
              <p class="z-small" style="margin:0">Shajarada ${D.clans.reduce((n, c) => n + c.count, 0)} kishi bor. Oʻzingizni toping va qarindoshlaringizni qoʻshing.</p>
              <a class="z-btn z-btn--soft z-btn--sm" href="#/shajara">${I('plus')}Qarindosh qoʻshish</a>
            </div>
          </div>
        </aside>
      </div>

      ${(D.veterans || []).length ? `<section class="section">
        <div class="section-head"><h2 class="z-h4">Qishloq faxriylari</h2><a class="z-btn z-btn--ghost z-btn--sm" href="#/faxriylar">Barchasi ${I('chevron-right')}</a></div>
        <div class="carousel">
          ${(D.veterans || []).slice(0, 6).map(vt => `
            <a class="z-card z-card--interactive vet-mini" href="#/faxriylar/${vt.id}">
              ${vetAvatar(vt, 'lg')}
              <strong>${esc(vt.name)}</strong>
              <span class="z-caption">${vetYears(vt)}</span>
              <span class="z-badge z-badge--accent">${esc(vt.title)}</span>
            </a>`).join('')}
        </div>
      </section>` : ''}

      <section class="section">
        <a class="z-card z-card--interactive chat-promo" href="#/chat/umumiy">
          <div class="z-card__body z-spread">
            <div class="z-row">
              <div class="z-avatar-group">${['Jasur Ergashev', 'Malika T.', 'Shahlo Hamidova', 'Farhod Bahodirov'].map(n => avatar(n, 'sm')).join('')}</div>
              <div>
                <strong>Qishloq suhbati</strong>
                <div class="z-small"><span class="online-dot"></span>${D.channels[0]?.online ? `${D.channels[0].online} kishi hozir onlayn` : `${fmt(D.members || D.channels[0]?.members || 0)} qishloqdosh`}</div>
              </div>
            </div>
            <span class="z-btn z-btn--primary z-btn--sm">${I('chat')}Qoʻshilish</span>
          </div>
        </a>
      </section>
      ${footer()}`
    };
  };

  function footer() {
    return `<footer class="site-foot">
      <div class="z-divider-naqsh">${I('naqsh')}</div>
      <p class="z-small">© ${new Date().getFullYear()} zachkana.uz — Zachkana qishlogʻining raqamli xotirasi.</p>
      <p class="z-caption">${api.live ? '' : 'Demo rejim: saytdagi ism, sana va voqealar namuna. · '}<a href="ui/">Zachkana UI dizayn tizimi</a></p>
    </footer>`;
  }

  /* --- Shajara --- */
  const people = new Map();
  function indexTree(node, clan, gen = 1, parent = null) {
    people.set(node.id, { ...node, clan, gen, parent });
    if (node.spouse) people.set(node.spouse.id, { ...node.spouse, clan, gen, spouseOf: node.id });
    (node.children || []).forEach(c => indexTree(c, clan, gen + 1, node.id));
  }
  function reindexPeople() {
    people.clear();
    Object.entries(D.trees).forEach(([clan, root]) => root && indexTree(root, clan));
  }
  reindexPeople();

  function personBtn(p) {
    const cls = ['z-person', p.g === 'f' ? 'z-person--f' : 'z-person--m', p.d ? 'z-person--deceased' : '', p.me ? 'z-person--me' : ''].join(' ');
    return `<button class="${cls}" data-person="${p.id}" data-name="${esc(p.name.toLowerCase())}">
      ${avatar(p.name, 'sm')}
      <span><span class="z-person__name">${esc(p.name)}${p.me ? ' <span class="z-badge z-badge--accent">Siz</span>' : ''}</span><br><span class="z-person__meta">${years(p)}${p.job ? ' · ' + esc(p.job) : ''}</span></span>
    </button>`;
  }
  function treeNode(p) {
    return `<li><div class="z-tree-node"><div class="z-couple">${personBtn(p)}${p.spouse ? personBtn(p.spouse) : ''}</div></div>${p.children?.length ? `<ul>${p.children.map(treeNode).join('')}</ul>` : ''}</li>`;
  }
  const roman = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][n - 1] || n;
  function relationText(p) {
    if (p.spouseOf) { const s = people.get(p.spouseOf); return `${s.name}ning ${p.g === 'f' ? 'rafiqasi' : 'turmush oʻrtogʻi'}`; }
    if (p.parent) { const f = people.get(p.parent); return `${f.name}ning ${p.g === 'f' ? 'qizi' : 'oʻgʻli'}`; }
    return 'Urugʻ asoschisi';
  }

  let shajaraState = { clan: 'mirzaboy', mode: 'tree', q: '' };

  async function loadClanTree(c) {
    if (api.live && c && !D.trees[c]) { const r = await api.get(`clans/${c}/tree`); D.trees[c] = r.tree; reindexPeople(); }
  }
  // Shajara ikki boʻlimdan iborat: qishloq shajarasi (hamma uchun) va oilaviy shajara (shaxsiy)
  const shajaraTabs = active => `
    <nav class="z-segment shajara-tabs" aria-label="Shajara boʻlimlari">
      <a role="tab" href="#/shajara" aria-selected="${active === 'village'}">${I('landmark')}Qishloq shajarasi</a>
      <a role="tab" href="#/shajara/oila" aria-selected="${active === 'family'}">${I('heart')}Oilaviy shajara</a>
    </nav>`;
  views.shajara = arg => {
    if (arg === 'oila') {
      if (!api.live) family.list = store.get('zk-family', []);
      return familyView();
    }
    if (arg && D.clans.some(c => c.id === arg)) shajaraState.clan = arg;
    return villageView();
  };

  function villageView() {
    const s = shajaraState;
    const clanPeople = [...people.values()].filter(p => p.clan === s.clan);
    const gens = clanPeople.length ? Math.max(...clanPeople.map(p => p.gen)) : 0;
    const root = D.trees[s.clan];
    return {
      title: 'Shajara',
      html: `
      <div class="page-head">
        <div>
          <span class="z-overline">Qishloq shajarasi</span>
          <h1 class="z-h2">Shajara</h1>
          <p class="z-muted">Urugʻingizni tanlang, qarindoshlaringizni toping va qishloq shajarasini birga toʻldiring.</p>
        </div>
        ${D.clans.length ? `<button class="z-btn z-btn--primary" data-action="add-person">${I('plus')}Qarindosh qoʻshish</button>` : ''}
      </div>
      ${shajaraTabs('village')}
      ${!D.clans.length ? `<div class="z-card"><div class="z-empty">${I('landmark')}<h2 class="z-h4">Qishloq shajarasi hali boshlanmagan</h2><p>Administrator urugʻlarni qoʻshgach, bu yerda qishloq shajarasi paydo boʻladi. Hozircha <a href="#/shajara/oila">oilaviy shajarangizni</a> tuzishingiz mumkin.</p></div></div>` : `

      <div class="toolbar">
        <label class="z-search toolbar__search">${I('search')}<span class="z-sr-only">Ism boʻyicha qidirish</span><input class="z-input" type="search" id="treeSearch" placeholder="Ism boʻyicha qidirish…" value="${esc(s.q)}"></label>
        <div class="z-segment" role="tablist" aria-label="Koʻrinish">
          <button role="tab" aria-selected="${s.mode === 'tree'}" data-mode="tree">${I('shajara')}Daraxt</button>
          <button role="tab" aria-selected="${s.mode === 'list'}" data-mode="list">${I('timeline')}Roʻyxat</button>
        </div>
      </div>

      <div class="z-chips" role="group" aria-label="Urugʻlar">
        ${D.clans.map(c => `<button class="z-chip" aria-pressed="${c.id === s.clan}" data-clan="${c.id}">${esc(c.name)} <span class="z-count">${c.count}</span></button>`).join('')}
      </div>

      <div class="clan-summary z-small">${clanPeople.length} kishi koʻrsatilgan · ${gens} avlod${api.live ? '' : ' · <span class="z-muted">namuna maʼlumot</span>'}</div>

      ${!root ? `<div class="z-card"><div class="z-empty">${I('shajara')}<h2 class="z-h4">Bu urugʻ hali toʻldirilmagan</h2><p>Birinchi boʻlib maʼlumot qoʻshing — moderator tasdiqlagach shajarada chiqadi.</p><button class="z-btn z-btn--primary" data-action="add-person">${I('plus')}Qarindosh qoʻshish</button></div></div>` : s.mode === 'tree' ? `
      <div class="tree-wrap">
        <div class="tree-viewport z-ornament" id="treeVp" aria-label="Shajara daraxti. Surish uchun torting, kattalashtirish uchun tugmalardan foydalaning.">
          <div class="tree-canvas" id="treeCanvas"><ul class="z-tree">${treeNode(D.trees[s.clan])}</ul></div>
        </div>
        <div class="tree-controls" role="toolbar" aria-label="Daraxtni boshqarish">
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="in" aria-label="Kattalashtirish">${I('zoom-in')}</button>
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="out" aria-label="Kichiklashtirish">${I('zoom-out')}</button>
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="fit" aria-label="Butun daraxt">${I('fit')}</button>
          ${clanPeople.some(p => p.me) ? `<button class="z-btn z-btn--sm z-btn--accent" data-zoom="me">${I('user')}Men</button>` : ''}
        </div>
        <div class="tree-legend z-caption">
          <span><i class="lg lg-m"></i>Erkak</span><span><i class="lg lg-f"></i>Ayol</span><span><i class="lg lg-d"></i>Marhum</span><span><i class="lg lg-me"></i>Siz</span>
        </div>
      </div>` : `
      <div class="gen-list">
        ${Array.from({ length: gens }, (_, i) => i + 1).map(g => {
          const list = clanPeople.filter(p => p.gen === g);
          return `<section class="z-card gen-card"><div class="gen-card__head"><span class="gen-card__num">${roman(g)}</span><strong>${g}-avlod</strong><span class="z-caption">${list.length} kishi</span></div>
            <ul class="z-list">${list.map(p => `<li><button class="z-list-item" data-person="${p.id}" data-name="${esc(p.name.toLowerCase())}">${avatar(p.name)}<span class="z-list-item__main"><span class="z-list-item__title">${esc(p.name)} ${p.me ? '<span class="z-badge z-badge--accent">Siz</span>' : ''}</span><span class="z-list-item__sub">${years(p)} · ${esc(relationText(p))}</span></span>${I('chevron-right', 'z-muted')}</button></li>`).join('')}</ul></section>`;
        }).join('')}
      </div>`}
      `}`,
      mount: mountShajara
    };
  }

  let panzoom = null;
  function mountShajara() {
    const s = shajaraState;
    $$('[data-clan]').forEach(b => b.onclick = () => { s.clan = b.dataset.clan; s.q = ''; location.hash === '#/shajara' ? render() : (location.hash = '#/shajara'); });
    if (!D.trees[s.clan]) return;
    $$('[data-mode]').forEach(b => b.onclick = () => { s.mode = b.dataset.mode; render(); });
    const search = $('#treeSearch');
    search.oninput = () => { s.q = search.value.trim().toLowerCase(); applySearch(); };
    if (s.mode === 'tree') mountTree();
    applySearch();
  }
  function applySearch() {
    const q = shajaraState.q;
    const nodes = $$('[data-person]', $('#view'));
    let first = null;
    nodes.forEach(n => {
      const hit = q && n.dataset.name.includes(q);
      n.classList.toggle('is-match', !!hit);
      if (shajaraState.mode === 'list') n.closest('li').hidden = !!q && !hit;
      if (hit && !first) first = n;
    });
    if (shajaraState.mode === 'list') $$('.gen-card').forEach(c => c.hidden = !!q && !c.querySelector('li:not([hidden])'));
    if (first && panzoom && shajaraState.mode === 'tree') panzoom.focus(first);
  }

  /* --- Oilaviy shajara (shaxsiy) --- */
  // Server boʻlsa API orqali, demo rejimda qurilmada (localStorage) saqlanadi
  const family = {
    list: [],
    async load() {
      this.list = api.live ? (await api.get('family')).members : store.get('zk-family', []);
    },
    save() { if (!api.live) store.set('zk-family', this.list); },
    get(id) { return this.list.find(m => m.id === String(id)); },
    async add(relation, of, fields) {
      if (api.live) { await api.post('family', { ...fields, relation, of }); return this.load(); }
      const target = this.get(of);
      const m = { id: 'f' + Date.now(), parent: null, spouseOf: null, ...fields };
      if (relation === 'child') m.parent = target.spouseOf || target.id;
      if (relation === 'spouse') m.spouseOf = target.id;
      if (relation === 'parent') target.parent = m.id;
      if (m.me) this.list.forEach(x => { x.me = false; });
      this.list.push(m); this.save();
    },
    async update(id, fields) {
      if (api.live) { await api.patch('family/' + id, fields); return this.load(); }
      if (fields.me) this.list.forEach(x => { x.me = false; });
      Object.assign(this.get(id), fields); this.save();
    },
    async remove(id) {
      if (api.live) { await api.del('family/' + id); return this.load(); }
      this.list = this.list.filter(m => m.id !== id && m.spouseOf !== id);
      this.list.forEach(m => { if (m.parent === id) m.parent = null; });
      this.save();
    }
  };
  const famKids = id => family.list.filter(m => m.parent === id).sort((a, b) => (a.b || 9999) - (b.b || 9999));
  const famSpouses = id => family.list.filter(m => m.spouseOf === id);
  const famRoots = () => family.list.filter(m => !m.parent && !m.spouseOf);
  const famBtn = m => `<button class="z-person ${m.g === 'f' ? 'z-person--f' : 'z-person--m'} ${m.d ? 'z-person--deceased' : ''} ${m.me ? 'z-person--me' : ''}" data-fam="${esc(m.id)}">
      ${avatar(m.name, 'sm')}
      <span><span class="z-person__name">${esc(m.name)}${m.me ? ' <span class="z-badge z-badge--accent">Siz</span>' : ''}</span><br><span class="z-person__meta">${years(m)}${m.job ? ' · ' + esc(m.job) : ''}</span></span>
    </button>`;
  const famNode = (m, depth = 0) => {
    const kids = depth < 40 ? famKids(m.id) : [];
    return `<li><div class="z-tree-node"><div class="z-couple">${famBtn(m)}${famSpouses(m.id).map(famBtn).join('')}</div></div>${kids.length ? `<ul>${kids.map(k => famNode(k, depth + 1)).join('')}</ul>` : ''}</li>`;
  };
  function famRelation(m) {
    if (m.spouseOf) { const p = family.get(m.spouseOf); return p ? `${p.name}ning turmush oʻrtogʻi` : ''; }
    if (m.parent) { const p = family.get(m.parent); return p ? `${p.name}ning ${m.g === 'f' ? 'qizi' : 'oʻgʻli'}` : ''; }
    return famKids(m.id).length ? 'Shox boshi' : '';
  }

  function familyView() {
    const head = `
      <div class="page-head">
        <div>
          <span class="z-overline">Oilaviy shajara</span>
          <h1 class="z-h2">Shajara</h1>
          <p class="z-muted">Oʻz oilangiz daraxtini tuzing. U faqat sizga koʻrinadi — xohlagan aʼzoni qishloq shajarasiga taklif qilishingiz mumkin.</p>
        </div>
        ${family.list.length ? `<button class="z-btn" data-action="fam-root">${I('plus')}Yangi shox</button>` : ''}
      </div>
      ${shajaraTabs('family')}`;
    if (api.live && !D.user) {
      return { title: 'Oilaviy shajara', html: `${head}
        <div class="z-card"><div class="z-empty">${I('heart')}<h2 class="z-h4">Oilaviy shajarangizni tuzing</h2><p>Buning uchun saytga kiring — daraxtingiz faqat sizga koʻrinadi.</p><a class="z-btn z-btn--primary" href="#/profil" data-action="login-return">${I('user')}Kirish</a></div></div>` };
    }
    if (!family.list.length) {
      return { title: 'Oilaviy shajara', html: `${head}
        <div class="z-card fam-start"><div class="z-empty">${I('shajara')}<h2 class="z-h4">Oʻzingizdan boshlang</h2><p>Avval oʻzingizni qoʻshing, keyin ota-onangiz, turmush oʻrtogʻingiz va farzandlaringizni birma-bir qoʻshasiz.</p><button class="z-btn z-btn--primary z-btn--lg" data-action="fam-start">${I('plus')}Oʻzimni qoʻshish</button>${api.live ? '' : '<p class="z-caption" style="margin-top:12px">Demo rejim: shajara shu qurilmada saqlanadi.</p>'}</div></div>` };
    }
    return {
      title: 'Oilaviy shajara',
      html: `${head}
      <div class="clan-summary z-small">${family.list.length} kishi · <span class="z-muted">Odam ustiga bosing: farzand, turmush oʻrtogʻi yoki ota-onasini qoʻshing</span></div>
      <div class="tree-wrap">
        <div class="tree-viewport z-ornament" id="treeVp" aria-label="Oilaviy shajara">
          <div class="tree-canvas" id="treeCanvas"><ul class="z-tree">${famRoots().map(r => famNode(r)).join('')}</ul></div>
        </div>
        ${treeControls(family.list.some(m => m.me))}
        <div class="tree-legend z-caption">
          <span><i class="lg lg-m"></i>Erkak</span><span><i class="lg lg-f"></i>Ayol</span><span><i class="lg lg-d"></i>Marhum</span><span><i class="lg lg-me"></i>Siz</span>
        </div>
      </div>`,
      mount: mountTree
    };
  }
  const treeControls = hasMe => `
        <div class="tree-controls" role="toolbar" aria-label="Daraxtni boshqarish">
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="in" aria-label="Kattalashtirish">${I('zoom-in')}</button>
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="out" aria-label="Kichiklashtirish">${I('zoom-out')}</button>
          <button class="z-btn z-btn--icon z-btn--sm" data-zoom="fit" aria-label="Butun daraxt">${I('fit')}</button>
          ${hasMe ? `<button class="z-btn z-btn--sm z-btn--accent" data-zoom="me">${I('user')}Men</button>` : ''}
        </div>`;
  function mountTree() {
    panzoom = setupPanZoom($('#treeVp'), $('#treeCanvas'));
    requestAnimationFrame(() => panzoom.initial());
    document.fonts?.ready.then(() => { if ($('#treeCanvas')) panzoom.initial(); });
    $$('[data-zoom]').forEach(b => b.onclick = () => {
      const z = b.dataset.zoom;
      if (z === 'in') panzoom.zoomBy(1.25);
      else if (z === 'out') panzoom.zoomBy(0.8);
      else if (z === 'fit') panzoom.fit();
      else if (z === 'me') panzoom.focus($('.z-person--me'));
    });
  }

  function famSheet(id) {
    const m = family.get(id);
    if (!m) return;
    const canParent = !m.parent && !m.spouseOf;
    const kids = famKids(m.spouseOf || m.id);
    openSheet(`
      <div class="person-head">
        ${avatar(m.name, 'xl', m.d ? 'is-deceased' : '')}
        <div>
          <h2 class="z-h3" id="sheetTitle">${esc(m.name)}</h2>
          <div class="z-muted">${[years(m), famRelation(m)].filter(Boolean).map(esc).join(' · ')}</div>
          <div class="z-row" style="margin-top:8px;--z-gap:6px">
            ${m.me ? '<span class="z-badge z-badge--accent">Siz</span>' : ''}
            ${m.d ? '<span class="z-badge">Marhum</span>' : '<span class="z-badge z-badge--success">Hayot</span>'}
          </div>
        </div>
      </div>
      ${m.job ? `<dl class="facts"><div><dt>Kasbi</dt><dd>${esc(m.job)}</dd></div></dl>` : ''}
      ${m.bio ? `<p>${esc(m.bio)}</p>` : ''}
      ${kids.length ? `<h3 class="sheet-sub">Farzandlari</h3><div class="z-row" style="--z-gap:8px">${kids.map(k => `<button class="z-chip" data-fam="${esc(k.id)}">${avatar(k.name, 'xs')}${esc(k.name)}</button>`).join('')}</div>` : ''}
      <h3 class="sheet-sub">Qoʻshish</h3>
      <div class="fam-actions">
        <button class="z-btn" data-action="fam-add" data-rel="child" data-of="${esc(m.id)}">${I('plus')}Farzand</button>
        ${!m.spouseOf ? `<button class="z-btn" data-action="fam-add" data-rel="spouse" data-of="${esc(m.id)}">${I('heart')}Turmush oʻrtogʻi</button>` : ''}
        ${canParent ? `<button class="z-btn" data-action="fam-add" data-rel="parent" data-of="${esc(m.id)}">${I('users')}Ota-onasi</button>` : ''}
      </div>
      <div class="sheet-actions">
        <button class="z-btn z-btn--primary" data-action="fam-edit" data-id="${esc(m.id)}">${I('edit')}Tahrirlash</button>
        ${api.live && D.clans.length ? `<button class="z-btn z-btn--soft" data-action="fam-to-village" data-id="${esc(m.id)}">${I('landmark')}Qishloq shajarasiga taklif</button>` : ''}
        <button class="z-btn z-btn--ghost fam-delete" data-action="fam-delete" data-id="${esc(m.id)}">${I('close')}Oʻchirish</button>
      </div>`);
  }

  function famForm({ relation = null, of = null, id = null, me = false } = {}) {
    if (needLogin('Oilaviy shajara uchun saytga kiring')) return;
    const m = id ? family.get(id) : { g: relation === 'spouse' && family.get(of)?.g === 'm' ? 'f' : 'm', me };
    const target = of ? family.get(of) : null;
    const titles = { child: 'Farzand qoʻshish', spouse: 'Turmush oʻrtogʻini qoʻshish', parent: 'Ota yoki onasini qoʻshish', root: 'Yangi odam qoʻshish' };
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">${id ? 'Tahrirlash' : titles[relation]}</h2>
      ${target ? `<p class="z-muted">${esc(target.name)} uchun</p>` : ''}
      <form class="z-stack form" data-form="family" data-relation="${esc(relation || '')}" data-of="${esc(of || '')}" data-id="${esc(id || '')}">
        <label class="z-field"><span class="z-label">Ism-sharifi</span><input class="z-input" name="name" required maxlength="120" value="${esc(m.name || '')}"></label>
        ${genderInput(m.g || 'm')}
        ${yearInputs(m)}
        <label class="z-field"><span class="z-label">Kasbi</span><input class="z-input" name="job" maxlength="120" value="${esc(m.job || '')}"></label>
        <label class="z-field"><span class="z-label">Qoʻshimcha maʼlumot</span><textarea class="z-textarea" name="bio" maxlength="2000" placeholder="Yashagan joyi, xotiralar…">${esc(m.bio || '')}</textarea></label>
        <label class="check-row"><input type="checkbox" name="me" ${m.me ? 'checked' : ''}><span>Bu — men</span></label>
        <p class="z-hint form-error" role="alert" hidden></p>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('check')}Saqlash</button>
      </form>`);
  }

  function setupPanZoom(vp, canvas) {
    const st = { x: 0, y: 0, s: 1 };
    const pts = new Map();
    let start = null, dragging = false, pinch = null;
    const apply = () => { canvas.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.s})`; };
    const zoomAt = (ns, cx, cy) => {
      ns = clamp(ns, 0.3, 2);
      const r = vp.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      st.x = px - (px - st.x) * (ns / st.s);
      st.y = py - (py - st.y) * (ns / st.s);
      st.s = ns; apply();
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    vp.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, ox: st.x, oy: st.y }; dragging = false; }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: dist(a, b), s: st.s }; }
    });
    vp.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        dragging = true;
        zoomAt(pinch.s * dist(a, b) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) > 6) { dragging = true; vp.setPointerCapture(e.pointerId); vp.classList.add('is-dragging'); }
      if (dragging) { st.x = start.ox + dx; st.y = start.oy + dy; apply(); }
    });
    const end = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; start = { x: p.x, y: p.y, ox: st.x, oy: st.y }; }
      if (pts.size === 0) {
        start = null; vp.classList.remove('is-dragging');
        if (dragging) { vp.dataset.dragged = '1'; setTimeout(() => delete vp.dataset.dragged, 60); }
      }
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener('click', e => { if (vp.dataset.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    vp.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(st.s * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      else { st.x -= e.deltaX; st.y -= e.deltaY; apply(); }
    }, { passive: false });

    return {
      zoomBy(f) { const r = vp.getBoundingClientRect(); zoomAt(st.s * f, r.left + r.width / 2, r.top + r.height / 2); },
      fit() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight, W = vp.clientWidth, H = vp.clientHeight;
        st.s = clamp(Math.min(W / w, H / h) * 0.94, 0.45, 1);
        st.x = (W - w * st.s) / 2;
        st.y = Math.max(20, (H - h * st.s) / 2);
        apply();
      },
      // Kichik ekranda butun daraxt juda mayda boʻladi — ildiz tugunidan boshlaymiz
      initial() {
        const w = canvas.offsetWidth, h = canvas.offsetHeight, W = vp.clientWidth, H = vp.clientHeight;
        if (Math.min(W / w, H / h) * 0.94 >= 0.6) return this.fit();
        const root = canvas.querySelector('.z-tree > li > .z-tree-node');
        const cr = canvas.getBoundingClientRect(), rr = root.getBoundingClientRect();
        const cx = (rr.left - cr.left + rr.width / 2) / st.s;
        st.s = 0.8;
        st.x = W / 2 - cx * st.s;
        st.y = 16;
        apply();
      },
      focus(el) {
        if (!el) return;
        const cr = canvas.getBoundingClientRect(), er = el.getBoundingClientRect();
        const ex = (er.left - cr.left) / st.s, ey = (er.top - cr.top) / st.s;
        st.s = Math.max(st.s, 0.85);
        canvas.classList.add('is-animating');
        st.x = vp.clientWidth / 2 - (ex + el.offsetWidth / 2) * st.s;
        st.y = vp.clientHeight / 2 - (ey + el.offsetHeight / 2) * st.s;
        apply();
        setTimeout(() => canvas.classList.remove('is-animating'), 400);
      }
    };
  }

  function personSheet(id) {
    const p = people.get(id);
    if (!p) return;
    const father = p.parent ? people.get(p.parent) : null;
    const spouse = p.spouse ? people.get(p.spouse.id) : (p.spouseOf ? people.get(p.spouseOf) : null);
    const kids = (p.children || (p.spouseOf ? people.get(p.spouseOf).children : null) || []);
    const clan = D.clans.find(c => c.id === p.clan);
    openSheet(`
      <div class="person-head">
        ${avatar(p.name, 'xl', p.d ? 'is-deceased' : '')}
        <div>
          <h2 class="z-h3" id="sheetTitle">${esc(p.name)}</h2>
          <div class="z-muted">${years(p)} · ${esc(relationText(p))}</div>
          <div class="z-row" style="margin-top:8px;--z-gap:6px">
            ${p.me ? '<span class="z-badge z-badge--accent">Siz</span>' : ''}
            <span class="z-badge z-badge--primary">${esc(clan?.name || '')}</span>
            <span class="z-badge">${p.gen}-avlod</span>
            ${p.d ? '<span class="z-badge">Marhum</span>' : '<span class="z-badge z-badge--success">Hayot</span>'}
          </div>
        </div>
      </div>
      <dl class="facts">
        ${p.b ? `<div><dt>Tugʻilgan yili</dt><dd>${p.b}</dd></div>` : ''}
        ${p.d ? `<div><dt>Vafot etgan</dt><dd>${p.d}</dd></div>` : ''}
        ${p.job ? `<div><dt>Kasbi</dt><dd>${esc(p.job)}</dd></div>` : ''}
        ${spouse ? `<div><dt>Turmush oʻrtogʻi</dt><dd><button class="linkish" data-person="${spouse.id}">${esc(spouse.name)}</button></dd></div>` : ''}
        ${father ? `<div><dt>${father.g === 'f' ? 'Onasi' : 'Otasi'}</dt><dd><button class="linkish" data-person="${father.id}">${esc(father.name)}</button></dd></div>` : ''}
      </dl>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${kids.length ? `<h3 class="sheet-sub">Farzandlari</h3><div class="z-row" style="--z-gap:8px">${kids.map(k => `<button class="z-chip" data-person="${k.id}">${avatar(k.name, 'xs')}${esc(k.name)}</button>`).join('')}</div>` : ''}
      <div class="sheet-actions">
        <button class="z-btn z-btn--primary" data-action="suggest-edit" data-id="${p.id}">${I('edit')}Tuzatish taklif qilish</button>
        <button class="z-btn" data-action="share" data-share="${esc(p.name)}">${I('share')}Ulashish</button>
      </div>`);
  }

  const yearInputs = (p = {}) => `
        <div class="form-2">
          <label class="z-field"><span class="z-label">Tugʻilgan yili</span><input class="z-input" name="birth_year" inputmode="numeric" pattern="[0-9]{4}" placeholder="1950" value="${esc(p.b ?? '')}"></label>
          <label class="z-field"><span class="z-label">Vafot etgan yili</span><input class="z-input" name="death_year" inputmode="numeric" pattern="[0-9]{4}" placeholder="—" value="${esc(p.d ?? '')}"><span class="z-hint">Hayot boʻlsa boʻsh qoldiring</span></label>
        </div>`;
  const genderInput = (g = 'm') => `
        <div class="z-field"><span class="z-label">Jinsi</span>
          <input type="hidden" name="gender" value="${g}">
          <div class="z-segment" role="radiogroup"><button type="button" role="radio" aria-selected="${g === 'm'}" data-seg="m">Erkak</button><button type="button" role="radio" aria-selected="${g === 'f'}" data-seg="f">Ayol</button></div></div>`;

  function addPersonSheet(pre = {}) {
    if (needLogin('Qarindosh qoʻshish uchun saytga kiring')) return;
    if (!D.clans.length) { toast('Qishloq shajarasida hali urugʻ yoʻq', 'info'); return; }
    const parentOptions = clan => [...people.values()].filter(p => !p.spouseOf && p.clan === clan).map(p => `<option value="${p.id}">${esc(p.name)} (${years(p)})</option>`).join('') || '<option value="">— Urugʻ asoschisi —</option>';
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">${pre.name ? 'Qishloq shajarasiga taklif' : 'Qarindosh qoʻshish'}</h2>
      <p class="z-muted">Maʼlumot moderator tasdiqlagach qishloq shajarasiga qoʻshiladi.</p>
      <form class="z-stack form" data-form="person">
        <label class="z-field"><span class="z-label">Urugʻ</span><select class="z-select" name="clan" id="sugClan">${D.clans.map(c => `<option value="${esc(c.id)}" ${c.id === shajaraState.clan ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="z-field"><span class="z-label">Ism-sharifi</span><input class="z-input" name="name" required maxlength="120" placeholder="Masalan: Karimberdi Mirzaboyev" value="${esc(pre.name || '')}"></label>
        ${genderInput(pre.g || 'm')}
        ${yearInputs(pre)}
        <label class="z-field"><span class="z-label">Kimning farzandi?</span><select class="z-select" name="parent_id" id="sugParent">${parentOptions(shajaraState.clan)}</select></label>
        <label class="z-field"><span class="z-label">Kasbi</span><input class="z-input" name="job" maxlength="120" placeholder="Masalan: oʻqituvchi" value="${esc(pre.job || '')}"></label>
        <label class="z-field"><span class="z-label">Qoʻshimcha maʼlumot</span><textarea class="z-textarea" name="bio" maxlength="2000" placeholder="Yashagan joyi, xotiralar…">${esc(pre.bio || '')}</textarea></label>
        <p class="z-hint form-error" role="alert" hidden></p>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('check')}Yuborish</button>
      </form>`);
    const clanSel = $('#sugClan');
    clanSel.onchange = async () => {
      const sel = $('#sugParent');
      sel.innerHTML = '<option>Yuklanmoqda…</option>';
      try { await loadClanTree(clanSel.value); sel.innerHTML = parentOptions(clanSel.value); }
      catch (e) { sel.innerHTML = '<option value="">— Urugʻ asoschisi —</option>'; toast(errText(e), 'info'); }
    };
    if (!D.trees[clanSel.value]) clanSel.onchange();
  }

  function editPersonSheet(id) {
    if (needLogin('Tuzatish taklif qilish uchun saytga kiring')) return;
    const p = people.get(id);
    if (!p) return;
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">Tuzatish taklifi</h2>
      <p class="z-muted">${esc(p.name)} haqidagi maʼlumotni toʻgʻrilang. Moderator koʻrib chiqadi.</p>
      <form class="z-stack form" data-form="person-edit" data-id="${esc(id)}">
        <label class="z-field"><span class="z-label">Ism-sharifi</span><input class="z-input" name="name" required maxlength="120" value="${esc(p.name)}"></label>
        ${genderInput(p.g)}
        ${yearInputs(p)}
        <label class="z-field"><span class="z-label">Kasbi</span><input class="z-input" name="job" maxlength="120" value="${esc(p.job || '')}"></label>
        <label class="z-field"><span class="z-label">Izoh (manba, nima notoʻgʻri)</span><textarea class="z-textarea" name="comment" maxlength="2000" placeholder="Masalan: tugʻilgan yili 1897, buvimning hujjatlaridan"></textarea></label>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('send')}Taklifni yuborish</button>
      </form>`);
  }

  /* --- Tarix --- */
  views.tarix = () => ({
    title: 'Qishloq tarixi',
    html: `
    <header class="article-hero z-ornament">
      <span class="z-overline">Qishloq tarixi</span>
      <h1 class="z-h1">Zachkana hikoyasi</h1>
      <p class="z-lead">Qadimiy bulogʻlardan bugungi kungacha — qishloqning oʻtmishi, odamlari va anʼanalari.</p>
      <div class="z-row article-meta z-small"><span>${I('book')}${D.history.length} bob</span><span>${I('users')}Oqsoqollar bilan hamkorlikda</span></div>
    </header>
    <div class="article">
${D.history.length ? `      <aside class="toc" aria-label="Mundarija">
        <div class="z-overline">Mundarija</div>
        <ol>${D.history.map((c, i) => `<li><button data-scroll="ch-${c.id}"><span>${i + 1}</span>${esc(c.title)}</button></li>`).join('')}</ol>
      </aside>` : ''}
      <article class="z-prose">
        ${!api.live ? `<div class="z-alert z-alert--accent">${I('info')}<div><strong>Namuna matn</strong>Bu boʻlim qishloq oqsoqollari va oʻlkashunoslar bilan birga yoziladi. Hozirgi matn — dizayn uchun namuna.</div></div>` : ''}
        ${!D.history.length ? `<div class="z-card"><div class="z-empty">${I('book')}<h2 class="z-h4">Qishloq tarixi hali yozilmagan</h2><p>Tarix boblari admin panel orqali qoʻshiladi. Sizda eski surat, hujjat yoki xotira boʻlsa — pastdagi tugma orqali yuboring.</p></div></div>` : ''}
        ${D.history.map((c, i) => `
          <section id="ch-${c.id}" class="chapter">
            <h2><span class="chapter__num">${String(i + 1).padStart(2, '0')}</span>${esc(c.title)}</h2>
            ${c.paras.map(p => `<p>${esc(p)}</p>`).join('')}
            ${c.quote ? `<blockquote>${esc(c.quote.text)}<cite>— ${esc(c.quote.cite)}</cite></blockquote>` : ''}
            ${i === 1 ? `<figure class="figure">${villageArt('va--sepia')}<figcaption>Qishloq manzarasi (illyustratsiya). Bu yerga eski suratlar joylanadi.</figcaption></figure>` : ''}
          </section>`).join('')}
        <div class="z-card memory-cta z-ornament">
          <div class="z-card__body">
            <h3 class="z-h4">Sizda eski surat yoki xotira bormi?</h3>
            <p class="z-small">Qishloq tarixini birga yozamiz. Suratlar, hujjatlar va hikoyalaringizni yuboring.</p>
            <button class="z-btn z-btn--primary" data-action="memory">${I('image')}Material yuborish</button>
          </div>
        </div>
      </article>
    </div>
    ${footer()}`,
    mount() {
      $$('[data-scroll]').forEach(b => b.onclick = () => document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  });

  /* --- Xronologiya --- */
  let era = 'Barchasi';
  views.xronologiya = () => {
    const items = D.timeline.filter(t => era === 'Barchasi' || t.era === era);
    let lastEra = null;
    return {
      title: 'Xronologiya',
      html: `
      <div class="page-head">
        <div><span class="z-overline">Yillar boʻyicha</span><h1 class="z-h2">Xronologiya</h1><p class="z-muted">Qishloq hayotidagi muhim sanalar — qadimdan bugungacha.</p></div>
      </div>
      <div class="z-chips" role="group" aria-label="Davrlar">${D.eras.map(e => `<button class="z-chip" aria-pressed="${e === era}" data-era="${esc(e)}">${esc(e)}</button>`).join('')}</div>
      ${!items.length ? `<div class="z-card" style="margin-top:16px"><div class="z-empty">${I('timeline')}<h2 class="z-h4">Hali voqealar qoʻshilmagan</h2><p>Qishloq tarixidagi muhim sanalar admin panel orqali qoʻshiladi.</p></div></div>` : ''}
      <ol class="z-timeline z-timeline--center timeline-page">
        ${items.map((t, i) => {
          const sep = era === 'Barchasi' && t.era !== lastEra ? `<li class="z-timeline-era"><span>${I('naqsh')}${esc(t.era)}</span></li>` : '';
          lastEra = t.era;
          return `${sep}<li class="z-timeline-item ${t.major ? 'z-timeline-item--major' : ''} ${i % 2 ? 'z-timeline-item--alt' : ''}">
            <span class="z-timeline-item__marker">${I(t.icon)}</span>
            <div class="z-timeline-item__year">${esc(t.year)}</div>
            <div class="z-timeline-item__title">${esc(t.title)}</div>
            <p class="z-timeline-item__text">${esc(t.text)}</p>
          </li>`;
        }).join('')}
      </ol>
      ${footer()}`,
      mount() { $$('[data-era]').forEach(b => b.onclick = () => { era = b.dataset.era; render(); }); }
    };
  };

  /* --- Faxriylar --- */
  let vetState = { cat: 'all', q: '' };
  const catName = id => D.veteranCats.find(c => c.id === id)?.name || '';
  views.faxriylar = (id) => {
    if (id) return vetDetail(id);
    const list = D.veterans.filter(v => (vetState.cat === 'all' || v.cat === vetState.cat) && v.name.toLowerCase().includes(vetState.q));
    return {
      title: 'Faxriylar',
      html: `
      <div class="page-head">
        <div><span class="z-overline">Faxrimiz</span><h1 class="z-h2">Qishloq faxriylari</h1><p class="z-muted">Urush qatnashchilari, mehnat faxriylari, ustozlar va shifokorlar — ularning nomi qishloq xotirasida.</p></div>
        <button class="z-btn" data-action="nominate">${I('plus')}Faxriy taklif qilish</button>
      </div>
      <div class="toolbar">
        <label class="z-search toolbar__search">${I('search')}<span class="z-sr-only">Qidirish</span><input class="z-input" type="search" id="vetSearch" placeholder="Faxriyni qidirish…" value="${esc(vetState.q)}"></label>
      </div>
      <div class="z-chips" role="group" aria-label="Toifalar">${D.veteranCats.map(c => {
        const n = c.id === 'all' ? D.veterans.length : D.veterans.filter(v => v.cat === c.id).length;
        return `<button class="z-chip" aria-pressed="${c.id === vetState.cat}" data-cat="${c.id}">${esc(c.name)} <span class="z-count">${n}</span></button>`;
      }).join('')}</div>
      <div class="vet-grid" id="vetGrid">
        ${list.length ? list.map(v => `
          <a class="z-card z-card--interactive vet-card" href="#/faxriylar/${v.id}">
            <div class="vet-card__band z-ornament"></div>
            <div class="vet-card__body">
              ${vetAvatar(v, 'lg')}
              <h3 class="vet-card__name">${esc(v.name)}</h3>
              <div class="z-caption">${vetYears(v)}</div>
              <span class="z-badge z-badge--primary">${esc(catName(v.cat))}</span>
              <p class="z-small">${esc(v.short)}</p>
              <div class="z-row" style="--z-gap:6px;justify-content:center">${v.medals.map(m => `<span class="z-medal"><i>${I('star')}</i>${esc(m)}</span>`).join('')}</div>
            </div>
          </a>`).join('') : `<div class="z-empty">${I(D.veterans.length ? 'search' : 'medal')}<p>${D.veterans.length ? 'Hech narsa topilmadi' : 'Faxriylar hali qoʻshilmagan. Qishloq faxriyini taklif qilishingiz mumkin.'}</p></div>`}
      </div>
      ${footer()}`,
      mount() {
        $$('[data-cat]').forEach(b => b.onclick = () => { vetState.cat = b.dataset.cat; render(); });
        const s = $('#vetSearch');
        s.oninput = () => { vetState.q = s.value.trim().toLowerCase(); render(); const n = $('#vetSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
      }
    };
  };

  function vetDetail(id) {
    const v = D.vetDetail[id] || D.veterans.find(x => x.id === id);
    if (!v) return views.notfound();
    const memories = api.live ? (v.memories || []) : store.get('zk-mem-' + id, [
      { a: 'Latofat Umarova', t: '2 kun oldin', text: 'Bolaligimizda u kishining hikoyalarini tinglab oʻsganmiz. Xotirasi yodimizda.' },
      { a: 'Oybek J.', t: '1 hafta oldin', text: 'Bobomning doʻsti edilar. Surati uyimizda hali ham osigʻliq.' }
    ]);
    return {
      title: v.name, back: '#/faxriylar',
      html: `
      <article class="vet-detail">
        <header class="vet-hero z-ornament">
          ${vetAvatar(v, 'xl')}
          <div>
            <span class="z-badge z-badge--accent">${esc(catName(v.cat))}</span>
            <h1 class="z-h2">${esc(v.name)}</h1>
            <p class="z-muted">${esc(v.title)} · ${vetYears(v)}</p>
            <div class="z-row" style="--z-gap:6px">${v.medals.map(m => `<span class="z-medal"><i>${I('star')}</i>${esc(m)}</span>`).join('')}</div>
          </div>
        </header>
        <div class="vet-body">
          <div class="z-prose">
            ${v.quote ? `<blockquote>“${esc(v.quote)}”<cite>— ${esc(v.name.split(' ')[0])}</cite></blockquote>` : ''}
            <h2>Hayot yoʻli</h2>
            ${api.live
              ? (v.bio ? v.bio.split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('') : `<p>${esc(v.short || 'Maʼlumot tez orada qoʻshiladi.')}</p>`)
              : `<p>${esc(v.short)} Namuna matn: bu yerda faxriyning tugʻilgan joyi, oilasi, mehnat faoliyati va qishloq uchun qilgan xizmatlari batafsil yoziladi. Maʼlumotlar oila aʼzolari va qishloqdoshlar bilan kelishilgan holda joylanadi.</p>
            <p>Suratlar, hujjatlar va mukofotlar galereyasi ham shu sahifada boʻladi.</p>`}
          </div>
          <aside class="z-stack" style="--z-gap:12px">
            <div class="z-card"><div class="z-card__body z-stack" style="--z-gap:10px">
              <strong>Qisqacha</strong>
              <dl class="facts facts--compact">
                <div><dt>Tugʻilgan</dt><dd>${v.b}</dd></div>
                ${v.d ? `<div><dt>Vafot etgan</dt><dd>${v.d}</dd></div>` : ''}
                <div><dt>Faoliyati</dt><dd>${esc(v.title)}</dd></div>
                <div><dt>Mukofotlar</dt><dd>${v.medals.length} ta</dd></div>
              </dl>
              <button class="z-btn z-btn--soft z-btn--sm" data-action="share" data-share="${esc(v.name)}">${I('share')}Ulashish</button>
            </div></div>
          </aside>
        </div>
        <section class="memories">
          <div class="section-head"><h2 class="z-h4">Xotiralar <span class="z-badge">${memories.length}</span></h2><button class="z-btn z-btn--primary z-btn--sm" data-action="add-memory" data-id="${v.id}">${I('edit')}Xotira qoldirish</button></div>
          <ul class="z-stack" style="--z-gap:12px;list-style:none;padding:0;margin:0">
            ${memories.map(m => `<li class="z-card memory"><div class="z-card__body z-row" style="align-items:flex-start;flex-wrap:nowrap">${avatar(m.a, 'sm')}<div><div class="z-row" style="--z-gap:8px"><strong>${esc(m.a)}</strong><span class="z-caption">${esc(m.t)}</span></div><p style="margin:4px 0 0">${esc(m.text)}</p></div></div></li>`).join('')}
          </ul>
        </section>
      </article>
      ${footer()}`
    };
  }

  /* --- Suhbat (chat) --- */
  const chatMsgs = id => api.live ? (D.messages[id] || [])
    : [...(D.messages[id] || []).map((m, i) => ({ id: 'd' + i, ...m })), ...store.get('zk-chat-' + id, []).map((m, i) => ({ id: 'l' + i, ...m }))];
  const lastMsg = c => api.live ? c.last : chatMsgs(c.id).slice(-1)[0];

  // Yangi xabarlarni davriy soʻrash (oddiy hostingda ham ishlaydi)
  let chatTimer = null;
  let replyTo = null; // javob berilayotgan xabar
  function stopChatPolling() { clearTimeout(chatTimer); chatTimer = null; }
  function startChatPolling(id, onNew) {
    stopChatPolling();
    const tick = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const list = D.messages[id] || [];
        const after = list.length ? list[list.length - 1].id : 0;
        try {
          const r = await api.get(`channels/${id}/messages?after=${after}`);
          const fresh = r.messages.filter(m => !list.some(x => x.id === m.id));
          const gone = new Set(r.deleted || []);
          const removed = list.some(m => gone.has(m.id));
          if ((fresh.length || removed) && parseHash().name === 'chat') {
            D.messages[id] = list.filter(m => !gone.has(m.id)).concat(fresh);
            onNew();
          }
        } catch { /* keyingi urinishda */ }
      }
      if (chatTimer !== null) chatTimer = setTimeout(tick, 4000);
    };
    chatTimer = setTimeout(tick, 4000);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && chatTimer) { /* tick oʻzi davom etadi */ } });

  views.chat = (id) => {
    const wide = matchMedia('(min-width: 1024px)').matches;
    const active = id || (wide ? D.channels[0]?.id : null);
    const ch = D.channels.find(c => c.id === active);
    if (id && !ch) return views.notfound();
    const locked = api.live && !D.user;
    const canPost = ch && (api.live ? D.canPost !== false && (!ch.readonly || D.user?.staff) : !ch.readonly);
    return {
      title: id && ch ? ch.name : 'Suhbat',
      back: id ? '#/chat' : null,
      immersive: !!id && !locked,
      html: `
      <div class="chat-layout" data-mode="${id ? 'pane' : 'list'}">
        <section class="chat-list">
          <div class="chat-list__head">
            <h1 class="z-h3">Suhbat</h1>
            <label class="z-search">${I('search')}<span class="z-sr-only">Kanal qidirish</span><input class="z-input" type="search" placeholder="Qidirish…" id="chSearch"></label>
          </div>
          <ul class="z-list" id="chList">
            ${D.channels.map(c => {
              const last = lastMsg(c);
              return `<li><a class="z-list-item channel ${c.id === active ? 'is-active' : ''}" href="#/chat/${c.id}" data-ch-name="${esc(c.name.toLowerCase())}">
                <span class="channel__icon">${I(c.icon)}</span>
                <span class="z-list-item__main"><span class="z-list-item__title">${esc(c.name)}</span><span class="z-list-item__sub">${last ? esc((last.me ? 'Siz' : last.a.split(' ')[0]) + ': ' + last.text) : esc(c.desc || '')}</span></span>
                <span class="channel__side"><span class="z-caption">${last?.t || ''}</span>${c.unread && c.id !== active ? `<span class="z-counter">${c.unread}</span>` : ''}</span>
              </a></li>`;
            }).join('')}
          </ul>
          ${api.live ? '' : `<div class="z-alert chat-note">${I('info')}<div>Demo rejim: yozgan xabarlaringiz faqat shu qurilmada saqlanadi.</div></div>`}
        </section>
        <section class="chat-pane">
          ${locked && (id || wide) ? `<div class="z-empty chat-empty">${I('chat')}<h2 class="z-h4">Suhbatga qoʻshiling</h2><p>Qishloqdoshlar bilan yozishish uchun saytga kiring yoki roʻyxatdan oʻting.</p><a class="z-btn z-btn--primary" href="#/profil" data-action="login-return">${I('user')}Kirish</a></div>` : ch ? `
          <header class="chat-pane__head">
            <span class="channel__icon">${I(ch.icon)}</span>
            <div><strong>${esc(ch.name)}</strong><div class="z-caption">${ch.online ? `<span class="online-dot"></span>${ch.online} onlayn · ` : ''}${fmt(ch.members)} aʼzo</div></div>
            <button class="z-btn z-btn--ghost z-btn--icon z-btn--sm" aria-label="Maʼlumot" data-action="channel-info" data-id="${ch.id}">${I('info')}</button>
          </header>
          <div class="chat-scroll" id="chatScroll">${renderMessages(ch.id)}</div>
          <div class="chat-compose">
            ${!canPost ? `<div class="z-alert">${I('megaphone')}<div>Bu kanalda faqat moderatorlar eʼlon joylay oladi.</div></div>` : `
            <div class="reply-bar" id="replyBar" hidden></div>
            <form class="z-composer" id="composer" data-id="${ch.id}">
              <textarea rows="1" id="msgInput" placeholder="Xabar yozing…" aria-label="Xabar" maxlength="2000"></textarea>
              <button type="submit" class="z-btn z-btn--primary z-btn--icon z-btn--sm" aria-label="Yuborish">${I('send')}</button>
            </form>`}
          </div>` : `<div class="z-empty chat-empty">${I('chat')}<p>Suhbatni tanlang</p></div>`}
        </section>
      </div>`,
      mount() {
        const s = $('#chSearch');
        s.oninput = () => $$('[data-ch-name]').forEach(a => a.parentElement.hidden = !a.dataset.chName.includes(s.value.trim().toLowerCase()));
        const sc = $('#chatScroll');
        if (!ch || !sc) return;
        ch.unread = 0; renderChrome();
        const nearBottom = () => sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120 || document.documentElement.scrollHeight - scrollY - innerHeight < 160;
        const toBottom = () => { sc.scrollTop = sc.scrollHeight; if (id && !wide) window.scrollTo(0, document.documentElement.scrollHeight); };
        const redraw = () => { const stick = nearBottom(); sc.innerHTML = renderMessages(ch.id); if (stick) toBottom(); };
        toBottom();
        if (api.live) startChatPolling(ch.id, redraw);

        // Bildirishnomadan kelgan boʻlsa (#/chat/kanal/xabarId) — oʻsha xabarni koʻrsatish
        const flash = mid => {
          const el = document.getElementById('msg-' + mid);
          if (!el) { toast('Xabar topilmadi (oʻchirilgan yoki eski)', 'info'); return; }
          el.scrollIntoView({ block: 'center' });
          el.classList.add('is-flash');
          setTimeout(() => el.classList.remove('is-flash'), 2000);
        };
        const extra = parseHash().extra;
        if (extra) setTimeout(() => flash(extra), 60);

        // Xabar ustiga bosilganda: javob berish / oʻchirish tugmalari
        const bar = $('#replyBar');
        const setReply = m => {
          replyTo = m;
          if (!bar) return;
          bar.hidden = !m;
          bar.innerHTML = m ? `${I('chat')}<div class="reply-bar__main"><strong>${esc(m.me ? 'Siz' : m.a)}</strong><span>${esc(m.text)}</span></div><button type="button" class="z-btn z-btn--ghost z-btn--icon z-btn--sm" data-action="reply-cancel" aria-label="Bekor qilish">${I('close')}</button>` : '';
        };
        setReply(null);
        sc.onclick = async e => {
          const go = e.target.closest('[data-goto]');
          if (go) { flash(go.dataset.goto); return; }
          const actBtn = e.target.closest('[data-msg-act]');
          const msgEl = e.target.closest('.z-msg');
          if (!msgEl) return;
          const m = chatMsgs(ch.id).find(x => String(x.id) === msgEl.dataset.msg);
          if (!actBtn) {
            // Bir vaqtda bitta xabarning tugmalari ochiq turadi
            const was = msgEl.classList.contains('is-selected');
            $$('.z-msg.is-selected', sc).forEach(x => x.classList.remove('is-selected'));
            msgEl.classList.toggle('is-selected', !was);
            return;
          }
          msgEl.classList.remove('is-selected');
          if (actBtn.dataset.msgAct === 'reply') {
            if (needLogin('Javob berish uchun saytga kiring')) return;
            setReply(m); $('#msgInput')?.focus();
          } else if (actBtn.dataset.msgAct === 'delete') {
            if (!confirm('Bu xabar hamma uchun oʻchiriladi. Davom etasizmi?')) return;
            try {
              await api.del(`channels/${ch.id}/messages/${m.id}`);
              D.messages[ch.id] = chatMsgs(ch.id).filter(x => x.id !== m.id);
              redraw(); toast('Xabar oʻchirildi', 'check');
            } catch (err) { toast(errText(err), 'info'); }
          }
        };
        if (bar) bar.onclick = e => { if (e.target.closest('[data-action="reply-cancel"]')) setReply(null); };
        const form = $('#composer');
        if (!form) return;
        const ta = $('#msgInput');
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
        ta.oninput = grow;
        ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
        form.onsubmit = async e => {
          e.preventDefault();
          const text = ta.value.trim();
          if (!text) return;
          if (!api.live) {
            const msg = { id: 'l' + Date.now(), me: true, a: 'Siz', t: new Date().toTimeString().slice(0, 5), text,
              reply: replyTo ? { id: replyTo.id, a: replyTo.me ? 'Siz' : replyTo.a, text: replyTo.text.slice(0, 90) } : null };
            setReply(null);
            const saved = store.get('zk-chat-' + ch.id, []); saved.push(msg); store.set('zk-chat-' + ch.id, saved);
            ta.value = ''; grow(); redraw(); toBottom();
            return;
          }
          const btn = form.querySelector('[type="submit"]');
          btn.disabled = true;
          try {
            const r = await api.post(`channels/${ch.id}/messages`, { body: text, reply_to_id: replyTo?.id || null });
            setReply(null);
            const list = D.messages[ch.id] || (D.messages[ch.id] = []);
            if (!list.some(m => m.id === r.message.id)) list.push(r.message);
            ch.last = r.message;
            ta.value = ''; grow(); sc.innerHTML = renderMessages(ch.id); toBottom();
          } catch (err) {
            toast(navigator.onLine ? errText(err) : 'Internet yoʻq — xabar yuborilmadi', 'offline');
          } finally { btn.disabled = false; ta.focus(); }
        };
      }
    };
  };
  const dayLabel = day => {
    if (!day) return 'Bugun';
    const d = new Date(day + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((t - d) / 864e5);
    return diff === 0 ? 'Bugun' : diff === 1 ? 'Kecha' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
  };
  function renderMessages(id) {
    const list = chatMsgs(id);
    if (!list.length) return `<div class="z-empty">${I('chat')}<p>Hali xabar yoʻq. Birinchi boʻlib yozing!</p></div>`;
    let prev = null, lastDay = null;
    return list.map(m => {
      const day = m.day || null;
      const sep = day !== lastDay || prev === null ? `<div class="z-day-sep"><span>${dayLabel(day)}</span></div>` : '';
      lastDay = day;
      const grouped = !sep && prev && prev.a === m.a && prev.me === m.me;
      prev = m;
      const canDelete = api.live && D.canDelete;
      return `${sep}<div class="z-msg ${m.me ? 'z-msg--me' : ''} ${grouped ? 'z-msg--grouped' : ''}" id="msg-${esc(m.id)}" data-msg="${esc(m.id)}">
        ${m.me ? '' : avatar(m.a, 'sm')}
        <div class="z-msg__body">
          <div class="z-bubble" tabindex="0">
            ${!m.me && !grouped ? `<div class="z-bubble__author">${esc(m.a)}</div>` : ''}
            ${m.reply ? `<button type="button" class="z-bubble__reply" data-goto="${esc(m.reply.id)}"><strong>${esc(m.reply.a)}</strong><span>${esc(m.reply.text)}</span></button>` : ''}
            ${esc(m.text)}
            <div class="z-bubble__time">${m.t}${m.me ? ' ✓' : ''}</div>
          </div>
          <div class="msg-actions">
            <button type="button" class="z-btn z-btn--sm msg-act" data-msg-act="reply">${I('back')}Javob berish</button>
            ${canDelete ? `<button type="button" class="z-btn z-btn--sm msg-act msg-act--danger" data-msg-act="delete">${I('close')}Oʻchirish</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* --- Eʼlonlar --- */
  views.elonlar = (id) => {
    if (id) {
      const n = D.news.find(x => String(x.id) === String(id));
      if (!n) return views.notfound();
      return {
        title: n.type, back: '#/elonlar',
        html: `
        <article class="announcement z-card">
          <div class="z-card__body">
            <div class="z-spread"><span class="z-badge z-badge--${n.tone}">${esc(n.type)}</span><span class="z-caption">${esc(n.date)}</span></div>
            <h1 class="z-h3" style="margin:14px 0 10px">${esc(n.title)}</h1>
            <div class="z-prose announcement__body">${(n.body || n.text).split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
            <div class="sheet-actions"><button class="z-btn" data-action="share" data-share="${esc(n.title)}">${I('share')}Ulashish</button><a class="z-btn z-btn--ghost" href="#/elonlar">Barcha eʼlonlar</a></div>
          </div>
        </article>
        ${footer()}`
      };
    }
    return {
      title: 'Eʼlonlar',
      html: `
      <div class="page-head"><div><span class="z-overline">Qishloq hayoti</span><h1 class="z-h2">Eʼlonlar va yangiliklar</h1><p class="z-muted">Hashar, toʻy-marakalar va qishloq yangiliklari.</p></div></div>
      <div class="z-stack" style="--z-gap:12px">
        ${D.news.length ? D.news.map(n => `
          <a class="z-card z-card--interactive news-card" href="#/elonlar/${n.id}">
            <div class="z-card__body">
              <div class="z-spread"><span class="z-badge z-badge--${n.tone}">${esc(n.type)}</span><span class="z-caption">${esc(n.date)}</span></div>
              <h3 class="news-card__title">${esc(n.title)}</h3>
              <p class="z-small">${esc(n.text)}</p>
            </div>
          </a>`).join('') : `<div class="z-card"><div class="z-empty">${I('megaphone')}<p>Hozircha eʼlon yoʻq</p></div></div>`}
      </div>
      ${footer()}`
    };
  };

  /* --- Bildirishnomalar (qoʻngʻiroqcha) --- */
  // Mehmon uchun: qaysi eʼlonlar koʻrilgani qurilmada saqlanadi
  const seenAt = () => store.get('zk-seen-at', '');
  function unreadCount() {
    if (api.live && D.user) return D.unread || 0;
    const seen = seenAt();
    return (D.news || []).filter(n => !seen || (n.at || '') > seen).length;
  }
  async function openNotifications() {
    openSheet(`<h2 class="z-h3" id="sheetTitle">Bildirishnomalar</h2><div id="notifList">${skeletonList()}</div>`);
    let items;
    if (api.live) {
      try { const r = await api.get('notifications'); items = r.items; D.unread = r.unread; }
      catch (e) { $('#notifList').innerHTML = `<div class="z-empty">${I('offline')}<p>${esc(errText(e))}</p></div>`; return; }
    } else {
      items = D.news.map(n => ({ id: 'a' + n.id, icon: n.tone === 'accent' ? 'megaphone' : n.tone === 'success' ? 'heart' : 'bell', label: n.type, title: n.title, text: n.text, date: n.date, url: '#/elonlar/' + n.id, at: n.at || '' }));
    }
    if (!D.user) items = items.map(n => ({ ...n, unread: !seenAt() || (n.at || '') > seenAt() }));
    const box = $('#notifList');
    if (!box) return;
    box.innerHTML = items.length ? `
      ${items.some(n => n.unread) ? `<div class="z-spread notif-head"><span class="z-caption">${items.filter(n => n.unread).length} ta oʻqilmagan</span><button class="z-btn z-btn--ghost z-btn--sm" data-action="notif-read-all">${I('check')}Hammasini oʻqildi</button></div>` : ''}
      <ul class="z-list notif-list">${items.map(n => `
        <li><a class="z-list-item notif ${n.unread ? 'is-unread' : ''}" href="${esc(n.url || '#/')}" data-notif="${esc(n.id)}">
          <span class="menu-icon">${I(n.icon || 'bell')}</span>
          <span class="z-list-item__main">
            <span class="z-caption">${esc(n.label || '')} · ${esc(n.date || '')}</span>
            <strong class="notif__title">${esc(n.title)}</strong>
            ${n.text ? `<span class="z-small notif__text">${esc(n.text)}</span>` : ''}
          </span>
          ${n.unread ? '<span class="z-dot" aria-label="oʻqilmagan"></span>' : I('chevron-right', 'z-muted')}
        </a></li>`).join('')}</ul>`
      : `<div class="z-empty">${I('bell')}<p>Hozircha bildirishnoma yoʻq</p></div>`;
    // Mehmon uchun: ochilgan zahoti eʼlonlar koʻrilgan hisoblanadi
    if (!D.user) { store.set('zk-seen-at', new Date().toISOString()); renderChrome(); }
  }
  const skeletonList = () => Array.from({ length: 3 }, () => '<div class="z-row" style="padding:12px 0;flex-wrap:nowrap"><div class="z-skeleton" style="width:36px;height:36px;border-radius:10px"></div><div class="z-stack" style="flex:1;--z-gap:6px"><div class="z-skeleton" style="height:10px;width:40%"></div><div class="z-skeleton" style="height:12px;width:80%"></div></div></div>').join('');
  // Sayt ochiq turganda yangi bildirishnomalarni tekshirib turish
  let unreadCheckedAt = 0;
  async function checkUnread() {
    if (!(api.live && D.user) || document.visibilityState !== 'visible' || !navigator.onLine) return;
    if (Date.now() - unreadCheckedAt < 5000) return;
    unreadCheckedAt = Date.now();
    try {
      const r = await api.request('GET', 'notifications/unread', null, { timeout: 8000 });
      if (r.unread !== D.unread) { D.unread = r.unread; renderChrome(); }
    } catch { /* keyingi safar */ }
  }
  setInterval(checkUnread, 45000);
  document.addEventListener('visibilitychange', checkUnread);
  window.addEventListener('hashchange', checkUnread);

  async function markRead(id) {
    if (!(api.live && D.user)) return;
    try { const r = await api.post('notifications/read', id ? { id } : {}); D.unread = r.unread; renderChrome(); } catch { /* */ }
  }

  /* --- Menyu (telefon) --- */
  views.menyu = () => ({
    title: 'Menyu',
    html: `
    <a class="z-card z-card--interactive profile-card" href="#/profil">
      <div class="z-card__body z-row" style="flex-wrap:nowrap">
        ${avatar(D.user?.name || 'Mehmon', 'lg')}
        <div style="flex:1"><strong>${esc(D.user?.name || 'Mehmon')}</strong><div class="z-small">${D.user ? esc(userHandle(D.user)) : 'Kirish yoki roʻyxatdan oʻtish'}</div></div>
        ${I('chevron-right', 'z-muted')}
      </div>
    </a>
    <div class="menu-group">
      <div class="z-nav-label">Boʻlimlar</div>
      <div class="z-card"><ul class="z-list z-list--divided">
        ${NAV.filter(n => n.id !== 'profil').map(n => `<li><a class="z-list-item" href="${n.href}"><span class="menu-icon">${I(n.icon)}</span><span class="z-list-item__main"><span class="z-list-item__title">${n.label}</span></span>${n.id === 'chat' && unreadTotal() ? `<span class="z-counter">${unreadTotal()}</span>` : ''}${I('chevron-right', 'z-muted')}</a></li>`).join('')}
      </ul></div>
    </div>
    <div class="menu-group">
      <div class="z-nav-label">Sozlamalar</div>
      <div class="z-card"><ul class="z-list z-list--divided">
        <li><label class="z-list-item"><span class="menu-icon">${I('moon')}</span><span class="z-list-item__main"><span class="z-list-item__title">Qorongʻi mavzu</span></span><span class="z-switch"><input type="checkbox" id="themeSwitch" ${effectiveTheme() === 'dark' ? 'checked' : ''}><span></span></span></label></li>
        <li><button class="z-list-item" data-action="install"><span class="menu-icon">${I('download')}</span><span class="z-list-item__main"><span class="z-list-item__title">Ilovani oʻrnatish</span><span class="z-list-item__sub">Bosh ekranga qoʻshish, oflayn ishlaydi</span></span></button></li>
        <li><a class="z-list-item" href="ui/"><span class="menu-icon">${I('naqsh')}</span><span class="z-list-item__main"><span class="z-list-item__title">Zachkana UI</span><span class="z-list-item__sub">Sayt dizayn tizimi</span></span>${I('chevron-right', 'z-muted')}</a></li>
        <li><button class="z-list-item" data-action="about"><span class="menu-icon">${I('info')}</span><span class="z-list-item__main"><span class="z-list-item__title">Sayt haqida</span></span></button></li>
      </ul></div>
    </div>
    ${footer()}`,
    mount() { $('#themeSwitch').onchange = e => setTheme(e.target.checked ? 'dark' : 'light'); }
  });

  /* --- Profil / Kirish --- */
  let authMode = 'login';     // login | register | phone
  let phoneReg = false;       // telefon boʻlimida: kirish yoki roʻyxatdan oʻtish
  const ROLE_NAMES = { user: 'Qishloqdosh', moderator: 'Moderator', admin: 'Administrator' };
  const userHandle = u => u.username ? '@' + u.username : u.email || (u.phone ? '+' + u.phone : '');
  const GOOGLE_G = '<svg class="social-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const TG_LOGO = '<svg class="social-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#29A9EB"/><path fill="#fff" d="m5.4 11.8 11.6-4.5c.5-.2 1 .1.8.9l-2 9.3c-.1.7-.5.8-1.1.5l-3-2.2-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.4-.1l-6.9 4.3-3-.9c-.6-.2-.7-.6.3-.9z"/></svg>';

  // Google tugmasi va Telegram vidjeti (link — kirgan foydalanuvchi akkaunt ulaydi)
  function socialButtons(link = false) {
    const a = D.auth, u = D.user;
    const google = a.google && !(u?.methods || []).includes('google');
    const tg = a.telegram && !(u?.methods || []).includes('telegram');
    if (!google && !tg) return '';
    return `<div class="social-login">
      ${google ? (api.live
        ? `<a class="z-btn z-btn--block social-btn" href="auth/google/redirect">${GOOGLE_G}${link ? 'Google akkauntini ulash' : 'Google orqali kirish'}</a>`
        : `<button type="button" class="z-btn z-btn--block social-btn" data-action="demo-social">${GOOGLE_G}Google orqali kirish</button>`) : ''}
      ${tg ? (api.live
        ? `<div class="tg-login" id="tgLogin" data-bot="${esc(a.telegram)}"><span class="z-caption">Telegram yuklanmoqda…</span></div>`
        : `<button type="button" class="z-btn z-btn--block social-btn" data-action="demo-social">${TG_LOGO}Telegram orqali kirish</button>`) : ''}
    </div>`;
  }
  function mountTelegram() {
    const box = $('#tgLogin');
    if (!box) return;
    // Kirgan foydalanuvchi — serverga "ulamoqchiman" deb bildiramiz (himoya uchun)
    if (D.user) api.post('link/telegram').catch(() => { /* */ });
    const sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://telegram.org/js/telegram-widget.js?22';
    sc.dataset.telegramLogin = box.dataset.bot;
    sc.dataset.size = 'large';
    sc.dataset.radius = '22';
    sc.dataset.userpic = 'false';
    sc.dataset.authUrl = new URL('auth/telegram/callback', location.href.split('#')[0]).href;
    sc.onload = () => box.querySelector('.z-caption')?.remove();
    sc.onerror = () => { box.innerHTML = '<span class="z-caption">Telegram vidjeti yuklanmadi</span>'; };
    box.append(sc);
  }

  views.profil = () => {
    const u = D.user, a = D.auth;
    if (u) {
      const m = u.methods || [];
      const method = (key, label, icon) => `<li class="z-list-item"><span class="menu-icon">${icon}</span><span class="z-list-item__main"><span class="z-list-item__title">${label}</span></span>${m.includes(key) ? `<span class="z-badge z-badge--success">${I('check')}Ulangan</span>` : '<span class="z-badge">Ulanmagan</span>'}</li>`;
      return {
        title: 'Profil',
        html: `
        <div class="auth">
          <div class="z-card auth-card">
            <div class="auth-card__top z-ornament">${u.avatar ? `<span class="z-avatar z-avatar--xl"><img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer"></span>` : avatar(u.name, 'xl')}</div>
            <div class="z-card__body z-stack" style="text-align:center">
              <div><h1 class="z-h3">${esc(u.name)}</h1><p class="z-muted" style="margin:4px 0 0">${esc(userHandle(u))}</p></div>
              <div><span class="z-badge ${u.staff ? 'z-badge--accent' : 'z-badge--primary'}">${ROLE_NAMES[u.role] || u.role}</span></div>
              ${u.staff ? `<a class="z-btn z-btn--primary z-btn--block" href="admin">${I('sliders')}Admin panel</a>` : ''}
              <a class="z-btn z-btn--block" href="#/shajara">${I('shajara')}Shajarada oʻzimni topish</a>
              <button class="z-btn z-btn--ghost z-btn--block" data-action="logout">${I('logout')}Chiqish</button>
            </div>
          </div>
          <div class="auth-perks z-stack">
            <div>
              <h2 class="z-h4">Kirish usullari</h2>
              <div class="z-card" style="margin-top:12px"><ul class="z-list z-list--divided">
                ${method('password', 'Login va parol', I('user'))}
                ${a.google || m.includes('google') ? method('google', 'Google', GOOGLE_G) : ''}
                ${a.telegram || m.includes('telegram') ? method('telegram', 'Telegram', TG_LOGO) : ''}
                ${m.includes('phone') ? method('phone', 'Telefon raqam', I('phone')) : ''}
              </ul></div>
            </div>
            ${socialButtons(true)}
          </div>
        </div>`,
        mount: mountTelegram
      };
    }
    const tabs = [...(a.password ? [['login', 'Kirish'], ['register', 'Roʻyxatdan oʻtish']] : []), ...(a.phone ? [['phone', 'Telefon']] : [])];
    const mode = tabs.some(([k]) => k === authMode) ? authMode : (tabs[0]?.[0] || 'none');
    const reg = mode === 'register';
    const passwordForm = `
      <form class="z-stack" data-form="${reg ? 'register' : 'login'}" novalidate>
        ${reg ? `<label class="z-field"><span class="z-label">Ism-sharifingiz</span><input class="z-input" name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Masalan: Sardor Rustamov"></label>` : ''}
        <label class="z-field"><span class="z-label">Login</span><input class="z-input" name="${reg ? 'username' : 'login'}" autocomplete="username" autocapitalize="off" spellcheck="false" required maxlength="32" placeholder="${reg ? 'masalan: sardor_r' : ''}">${reg ? '<span class="z-hint">Lotin harflari, raqamlar, "_" va "." (3–32 belgi)</span>' : ''}</label>
        <label class="z-field"><span class="z-label">Parol</span><input class="z-input" name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required minlength="${reg ? 6 : 1}" placeholder="${reg ? 'Kamida 6 belgi' : ''}"></label>
        <p class="z-hint form-error" role="alert" hidden></p>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${reg ? 'Roʻyxatdan oʻtish' : 'Kirish'}</button>
      </form>`;
    const phoneForm = `
      <form class="z-stack" data-form="${phoneReg ? 'phone-register' : 'phone-login'}" novalidate>
        ${phoneReg ? `<label class="z-field"><span class="z-label">Ism-sharifingiz</span><input class="z-input" name="name" autocomplete="name" required minlength="2" maxlength="80"></label>` : ''}
        <label class="z-field"><span class="z-label">Telefon raqam</span>
          <div class="phone-input"><span>+998</span><input class="z-input" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="90 123 45 67" required></div>
        </label>
        <label class="z-field"><span class="z-label">Parol</span><input class="z-input" name="password" type="password" autocomplete="${phoneReg ? 'new-password' : 'current-password'}" required></label>
        <p class="z-hint form-error" role="alert" hidden></p>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${phoneReg ? 'Roʻyxatdan oʻtish' : 'Kirish'}</button>
        <button type="button" class="z-btn z-btn--ghost z-btn--sm" data-action="phone-toggle">${phoneReg ? 'Akkauntim bor — kirish' : 'Telefon bilan roʻyxatdan oʻtish'}</button>
      </form>`;
    const social = socialButtons();
    return {
      title: 'Profil',
      html: `
      <div class="auth">
        <div class="z-card auth-card">
          <div class="auth-card__top z-ornament"><img src="assets/logo-mark.svg" alt="" width="64" height="64"></div>
          <div class="z-card__body z-stack">
            <div style="text-align:center"><h1 class="z-h3">Qishloqdoshlar davrasiga kiring</h1><p class="z-muted">${reg ? 'Ismingiz, login va parol oʻylab toping.' : 'Qulay usulni tanlang.'}</p></div>
            ${api.live ? '' : `<div class="z-alert">${I('info')}<div><strong>Demo rejim</strong>Server ulanmagan — kirish ishlamaydi.</div></div>`}
            ${social}
            ${social && mode !== 'none' ? '<div class="or-sep"><span>yoki</span></div>' : ''}
            ${tabs.length > 1 && mode !== 'none' ? `<div class="z-segment" role="tablist" style="align-self:center">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === mode}" data-auth="${k}">${l}</button>`).join('')}</div>` : ''}
            ${mode === 'phone' ? phoneForm : mode === 'none' ? '' : passwordForm}
            ${!a.password && !a.phone && !social ? `<div class="z-alert z-alert--accent">${I('info')}<div>Hozircha saytga kirish yopiq. Keyinroq urinib koʻring.</div></div>` : ''}
          </div>
        </div>
        <div class="auth-perks">
          <h2 class="z-h4">Roʻyxatdan oʻtsangiz:</h2>
          ${perks()}
        </div>
      </div>`,
      mount() {
        $$('[data-auth]').forEach(b => b.onclick = () => { authMode = b.dataset.auth; render(); });
        mountTelegram();
      }
    };
  };
  const perks = () => `<ul class="z-stack" style="--z-gap:12px;list-style:none;padding:0">
    <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('shajara')}</span><span>Shajaraga qarindoshlarni qoʻshasiz va tuzatish taklif qilasiz</span></li>
    <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('chat')}</span><span>Qishloq suhbatlarida yozasiz</span></li>
    <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('edit')}</span><span>Faxriylar haqida xotira qoldirasiz</span></li>
    <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('image')}</span><span>Qishloq tarixi uchun surat va hujjat yuborasiz</span></li>
  </ul>`;

  views.notfound = () => ({
    title: 'Topilmadi',
    html: `<div class="z-empty">${I('map')}<h1 class="z-h3">Sahifa topilmadi</h1><p>Bunday sahifa yoʻq yoki koʻchirilgan.</p><a class="z-btn z-btn--primary" href="#/">Bosh sahifaga</a></div>`
  });

  /* ---------- Chrome: yon panel, tab panel, yuqori panel ---------- */
  let route = { name: 'home', arg: null };
  function renderChrome(meta = {}) {
    const active = route.name;
    const unread = unreadTotal();
    // Yon panel
    let lastGroup = '';
    $('#sideNav').innerHTML = NAV.map(n => {
      const label = n.group !== lastGroup ? `<div class="z-nav-label">${n.group}</div>` : '';
      lastGroup = n.group;
      return `${label}<a href="${n.href}" ${n.id === active ? 'aria-current="page"' : ''}>${I(n.icon)}<span>${n.label}</span>${n.id === 'chat' && unread ? `<span class="z-counter">${unread}</span>` : ''}</a>`;
    }).join('') + `<div class="z-nav-label">Boshqa</div>${D.user?.staff ? `<a href="admin">${I('sliders')}<span>Admin panel</span></a>` : ''}<a href="ui/">${I('naqsh')}<span>Zachkana UI</span></a>`;
    $('#sideUser').innerHTML = `
      <button class="z-list-item" data-action="theme">${I(effectiveTheme() === 'dark' ? 'sun' : 'moon')}<span class="z-list-item__main"><span class="z-list-item__title">${effectiveTheme() === 'dark' ? 'Yorugʻ mavzu' : 'Qorongʻi mavzu'}</span></span></button>
      <a class="z-list-item" href="#/profil">${avatar(D.user?.name || 'Mehmon', 'sm')}<span class="z-list-item__main"><span class="z-list-item__title">${esc(D.user?.name || 'Mehmon')}</span><span class="z-list-item__sub">${D.user ? ROLE_NAMES[D.user.role] : 'Kirish'}</span></span></a>`;
    // Tab panel
    const tabActive = TABS.includes(active) ? active : 'menyu';
    $('#tabbar').innerHTML = [...TABS.map(id => NAV.find(n => n.id === id)), { id: 'menyu', href: '#/menyu', label: 'Menyu', icon: 'grid' }]
      .map(n => `<a href="${n.href}" ${n.id === tabActive ? 'aria-current="page"' : ''}><span class="z-tabbar__icon">${I(n.icon)}</span>${n.short || n.label}${n.id === 'chat' && unread ? `<span class="z-counter">${unread}</span>` : ''}</a>`).join('');
    // Yuqori panel
    if (meta.title !== undefined) {
      $('#appbarTitle').textContent = meta.title;
      const back = $('.appbar-back');
      back.hidden = !meta.back;
      back.dataset.href = meta.back || '';
      back.innerHTML = I('back');
      document.body.classList.toggle('has-back', !!meta.back);
    }
    $('#appbarActions').innerHTML = `
      <button class="z-btn z-btn--ghost z-btn--icon" data-action="theme" aria-label="Mavzuni almashtirish">${I(effectiveTheme() === 'dark' ? 'sun' : 'moon')}</button>
      <button class="z-btn z-btn--ghost z-btn--icon bell" data-action="notifications" aria-label="Bildirishnomalar${unreadCount() ? ` (${unreadCount()} ta yangi)` : ''}">${I('bell')}${unreadCount() ? `<span class="z-counter bell__count">${unreadCount() > 9 ? '9+' : unreadCount()}</span>` : ''}</button>`;
    syncInstall();
  }

  function parseHash() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : null, extra: parts[2] ? decodeURIComponent(parts[2]) : null };
  }

  let renderSeq = 0;
  async function render() {
    route = parseHash();
    const seq = ++renderSeq;
    const loader = api.live && loaders[route.name];
    if (loader) {
      // Tez yuklansa skelet koʻrsatilmaydi (miltillamaslik uchun)
      const sk = setTimeout(() => { if (seq === renderSeq) $('#view').innerHTML = skeleton(); }, 180);
      try { await loader(route.arg); }
      catch (e) {
        clearTimeout(sk);
        if (seq !== renderSeq) return;
        renderChrome({ title: 'Xatolik' });
        $('#view').innerHTML = `<div class="z-empty">${I(e.status === 404 ? 'map' : 'offline')}<h1 class="z-h3">${e.status === 404 ? 'Topilmadi' : 'Yuklab boʻlmadi'}</h1><p>${esc(errText(e))}</p><button class="z-btn z-btn--primary" data-action="retry">Qayta urinish</button></div>`;
        return;
      }
      clearTimeout(sk);
      if (seq !== renderSeq) return; // foydalanuvchi boshqa sahifaga oʻtib ketdi
    }
    const fn = views[route.name] || views.notfound;
    const v = fn(route.arg);
    document.body.dataset.route = route.name;
    document.body.classList.toggle('is-immersive', !!v.immersive);
    document.body.classList.toggle('is-home', route.name === 'home');
    document.title = (route.name === 'home' ? 'Zachkana — qishloq sayti' : `${v.title} · Zachkana`);
    const view = $('#view');
    view.innerHTML = v.html;
    renderChrome({ title: v.title, back: v.back });
    v.mount?.();
  }

  function skeleton() {
    return `<div class="z-stack" style="--z-gap:16px;padding-top:8px" aria-busy="true" aria-label="Yuklanmoqda">
      <div class="z-skeleton" style="height:14px;width:120px"></div><div class="z-skeleton" style="height:40px;width:60%"></div>
      <div class="z-skeleton" style="height:14px;width:80%"></div><div class="z-skeleton" style="height:220px;border-radius:var(--z-radius-lg)"></div>
      <div class="z-skeleton" style="height:90px;border-radius:var(--z-radius-lg)"></div></div>`;
  }

  let prevRouteKey = '';
  async function onRoute() {
    closeSheet();
    stopChatPolling();
    const r = parseHash();
    const key = r.name + '/' + (r.arg || '');
    if (key !== prevRouteKey) window.scrollTo(0, 0);
    await render();
    if (key !== prevRouteKey) {
      $('#view').classList.remove('view-enter'); void $('#view').offsetWidth; $('#view').classList.add('view-enter');
    }
    prevRouteKey = key;
  }
  window.addEventListener('hashchange', onRoute);
  matchMedia('(min-width: 1024px)').addEventListener?.('change', () => { if (route.name === 'chat') render(); });

  /* ---------- Harakatlar (delegatsiya) ---------- */
  document.addEventListener('click', e => {
    const notif = e.target.closest('[data-notif]');
    if (notif) {
      if (notif.classList.contains('is-unread')) markRead(notif.dataset.notif);
      // Xuddi shu sahifa boʻlsa ham qayta chiziladi (masalan boshqa xabarga oʻtish)
      if (notif.getAttribute('href') === location.hash) { e.preventDefault(); closeSheet(); render(); }
      return;
    }
    const personEl = e.target.closest('[data-person]');
    if (personEl) { personSheet(personEl.dataset.person); return; }
    const famEl = e.target.closest('[data-fam]');
    if (famEl) { famSheet(famEl.dataset.fam); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'close-sheet') closeSheet();
    else if (act === 'theme') setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
    else if (act === 'back') location.hash = a.dataset.href || '#/';
    else if (act === 'install') promptInstall();
    else if (act === 'add-person') addPersonSheet();
    else if (act === 'notifications') openNotifications();
    else if (act === 'notif-read-all') { markRead(); $$('.notif.is-unread').forEach(el => { el.classList.remove('is-unread'); el.querySelector('.z-dot')?.remove(); }); $('.notif-head')?.remove(); }
    else if (act === 'suggest-edit') editPersonSheet(a.dataset.id);
    else if (act === 'logout') logout();
    else if (act === 'fam-start') famForm({ relation: 'root', me: true });
    else if (act === 'fam-root') famForm({ relation: 'root' });
    else if (act === 'fam-add') famForm({ relation: a.dataset.rel, of: a.dataset.of });
    else if (act === 'fam-edit') famForm({ id: a.dataset.id });
    else if (act === 'fam-to-village') { const m = family.get(a.dataset.id); closeSheet(); setTimeout(() => addPersonSheet(m), 340); }
    else if (act === 'fam-delete') {
      const m = family.get(a.dataset.id);
      const extra = famSpouses(m.id).length ? ' Turmush oʻrtogʻi ham oʻchiriladi.' : '';
      if (confirm(`${m.name} shajaradan oʻchirilsinmi?${extra}`)) {
        family.remove(m.id).then(() => { closeSheet(); render(); toast('Oʻchirildi', 'check'); }).catch(err => toast(errText(err), 'info'));
      }
    }
    else if (act === 'phone-toggle') { phoneReg = !phoneReg; render(); }
    else if (act === 'demo-social') toast('Demo rejim: server ulangach ishlaydi', 'info');
    else if (act === 'retry') render();
    else if (act === 'login-return') { try { sessionStorage.setItem('zk-return', location.hash); } catch { /* */ } }
    else if (act === 'share') share(a.dataset.share);
    else if (act === 'memory' || act === 'add-memory' || act === 'nominate') memorySheet(act, a.dataset.id);
    else if (act === 'attach') toast('Fayl yuborish tez orada', 'clip');
    else if (act === 'channel-info') { const c = D.channels.find(x => x.id === a.dataset.id); openSheet(`<h2 class="z-h3" id="sheetTitle">${esc(c.name)}</h2><p class="z-muted">${esc(c.desc || '')}</p><dl class="facts"><div><dt>Aʼzolar</dt><dd>${fmt(c.members)}</dd></div>${c.online ? `<div><dt>Onlayn</dt><dd>${c.online}</dd></div>` : ''}</dl><div class="z-alert">${I('info')}<div><strong>Suhbat qoidalari</strong>Hurmat, odob va qishloqdoshlarga mehr. Reklama va haqoratga yoʻl qoʻyilmaydi.</div></div>`); }
    else if (act === 'about') openSheet(`<div style="text-align:center"><img src="assets/logo-mark.svg" alt="" width="72" height="72" style="margin:0 auto 12px"><h2 class="z-h3" id="sheetTitle">zachkana.uz</h2><p class="z-muted">Zachkana qishlogʻining raqamli xotirasi. Shajara, tarix, xronologiya, faxriylar va qishloqdoshlar suhbati.</p><p class="z-caption">Versiya 1.0 · Zachkana UI asosida qurilgan</p><a class="z-btn z-btn--soft" href="ui/">${I('naqsh')}Dizayn tizimini koʻrish</a></div>`);
  });
  // Formadagi maydonlarni obyektga yigʻish (boʻsh qiymatlar tashlab yuboriladi)
  const formData = f => Object.fromEntries([...new FormData(f)].filter(([, v]) => typeof v !== 'string' || v.trim() !== '').map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

  document.addEventListener('submit', async e => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    const btn = f.querySelector('[type="submit"]');
    const errBox = f.querySelector('.form-error');
    const fail = msg => { if (errBox) { errBox.textContent = msg; errBox.hidden = false; } else toast(msg, 'info'); };
    if (errBox) errBox.hidden = true;

    // Oilaviy shajara (demo rejimda ham ishlaydi — qurilmada saqlanadi)
    if (kind === 'family') {
      const d = formData(f);
      const fields = {
        name: d.name, gender: d.gender || 'm', g: d.gender || 'm',
        birth_year: d.birth_year ? +d.birth_year : null, death_year: d.death_year ? +d.death_year : null,
        b: d.birth_year ? +d.birth_year : null, d: d.death_year ? +d.death_year : null,
        job: d.job || null, bio: d.bio || null, is_me: !!d.me, me: !!d.me
      };
      if (fields.d && fields.b && fields.d < fields.b) { fail('Vafot yili tugʻilgan yildan oldin boʻlishi mumkin emas.'); return; }
      btn && (btn.disabled = true);
      try {
        if (f.dataset.id) await family.update(f.dataset.id, fields);
        else await family.add(f.dataset.relation || 'root', f.dataset.of || null, fields);
        closeSheet(); render(); toast('Saqlandi', 'check');
      } catch (err) { fail(errText(err)); }
      finally { btn && (btn.disabled = false); }
      return;
    }

    // Demo rejim: server yoʻq — avvalgidek qurilmada saqlanadi
    if (!api.live) {
      if (/^(phone-)?(login|register)$/.test(kind)) { fail('Demo rejimda kirish ishlamaydi — server ulanmagan.'); return; }
      if (kind === 'memory-add') {
        const id = f.dataset.id, text = f.querySelector('textarea').value.trim();
        if (!text) return;
        const list = store.get('zk-mem-' + id, null) || [
          { a: 'Latofat Umarova', t: '2 kun oldin', text: 'Bolaligimizda u kishining hikoyalarini tinglab oʻsganmiz. Xotirasi yodimizda.' },
          { a: 'Oybek J.', t: '1 hafta oldin', text: 'Bobomning doʻsti edilar. Surati uyimizda hali ham osigʻliq.' }
        ];
        list.unshift({ a: f.querySelector('input').value.trim() || 'Mehmon', t: 'Hozirgina', text });
        store.set('zk-mem-' + id, list);
        closeSheet(); render(); toast('Xotirangiz qoʻshildi. Rahmat!', 'heart');
        return;
      }
      closeSheet(); toast('Demo: maʼlumot serverga yuborilmadi');
      return;
    }

    btn && (btn.disabled = true);
    try {
      if (/^(phone-)?(login|register)$/.test(kind)) {
        const r = await api.post(kind.replace('phone-', 'phone/'), formData(f));
        D.user = r.user;
        await refreshBootstrap();
        toast(`Xush kelibsiz, ${r.user.name.split(' ')[0]}!`, 'check');
        let back = '';
        try { back = sessionStorage.getItem('zk-return') || ''; sessionStorage.removeItem('zk-return'); } catch { /* */ }
        if (back && back !== '#/profil') location.hash = back; else render();
        return;
      }
      if (kind === 'person' || kind === 'person-edit') {
        const data = formData(f);
        if (kind === 'person-edit') Object.assign(data, { type: 'edit', person_id: f.dataset.id });
        else data.type = 'add';
        await api.post('people/suggestions', data);
        closeSheet(); toast('Rahmat! Moderator tasdiqlagach shajarada chiqadi.');
        return;
      }
      if (kind === 'memory-add') {
        const r = await api.post(`veterans/${f.dataset.id}/memories`, formData(f));
        closeSheet();
        if (r.status === 'approved') { delete D.vetDetail[f.dataset.id]; render(); toast('Xotira qoʻshildi', 'heart'); }
        else toast('Rahmat! Xotirangiz moderator tasdiqlagach chiqadi.', 'heart');
        return;
      }
      if (kind === 'submission') {
        await api.post('submissions', new FormData(f));
        closeSheet(); toast('Yuborildi! Moderator koʻrib chiqadi.');
        return;
      }
    } catch (err) {
      if (err.status === 401) { D.user = null; closeSheet(); needLogin('Sessiya tugadi — qaytadan kiring'); return; }
      fail(errText(err));
    } finally { btn && (btn.disabled = false); }
  });

  async function logout() {
    try { await api.post('logout'); } catch { /* baribir chiqamiz */ }
    D.user = null;
    try { await refreshBootstrap(); } catch { /* */ }
    toast('Saytdan chiqdingiz', 'logout');
    location.hash = '#/';
    render();
  }

  document.addEventListener('click', e => {
    const seg = e.target.closest('[data-seg]');
    if (!seg) return;
    seg.parentElement.querySelectorAll('[data-seg]').forEach(b => b.setAttribute('aria-selected', String(b === seg)));
    const hidden = seg.closest('.z-field')?.querySelector('input[type="hidden"]');
    if (hidden) hidden.value = seg.dataset.seg;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  $('#scrim').addEventListener('click', closeSheet);

  function memorySheet(kind, id) {
    if (needLogin(kind === 'add-memory' ? 'Xotira qoldirish uchun saytga kiring' : 'Material yuborish uchun saytga kiring')) return;
    const title = kind === 'nominate' ? 'Faxriy taklif qilish' : kind === 'memory' ? 'Tarix uchun material' : 'Xotira qoldirish';
    const form = kind === 'add-memory' ? 'memory-add' : 'submission';
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">${title}</h2>
      <form class="z-stack form" data-form="${form}" data-id="${esc(id || '')}" enctype="multipart/form-data">
        ${form === 'submission' ? `<input type="hidden" name="type" value="${kind === 'nominate' ? 'veteran' : 'history'}">` : ''}
        <label class="z-field"><span class="z-label">Ismingiz</span><input class="z-input" name="author_name" maxlength="80" placeholder="Ism-sharifingiz" value="${esc(D.user?.name || '')}"></label>
        ${kind === 'nominate' ? `<label class="z-field"><span class="z-label">Faxriyning ismi</span><input class="z-input" name="subject" required maxlength="160"></label><label class="z-field"><span class="z-label">Toifa</span><select class="z-select" name="category">${(D.veteranCats || []).filter(c => c.id !== 'all').map(c => `<option>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
        ${kind === 'memory' ? `<label class="z-field"><span class="z-label">Mavzu</span><input class="z-input" name="subject" maxlength="160" placeholder="Masalan: 1960-yillardagi guzar surati"></label>` : ''}
        <label class="z-field"><span class="z-label">${kind === 'add-memory' ? 'Xotirangiz' : 'Hikoya yoki izoh'}</span><textarea class="z-textarea" name="body" required minlength="3" maxlength="5000" placeholder="Yozing…"></textarea></label>
        ${form === 'submission' ? `<label class="upload">${I('image')}<span><strong>Surat yoki hujjat biriktirish</strong><br><span class="z-caption upload-name">JPG, PNG yoki PDF · 10 MB gacha</span></span><input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" class="z-sr-only"></label>` : ''}
        <p class="z-hint form-error" role="alert" hidden></p>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('send')}Yuborish</button>
      </form>`);
    const file = $('#sheet input[type="file"]');
    if (file) file.onchange = () => { $('#sheet .upload-name').textContent = file.files[0]?.name || 'JPG, PNG yoki PDF · 10 MB gacha'; };
  }

  async function share(title) {
    const data = { title: `${title} — Zachkana`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); toast('Havola nusxalandi', 'link'); }
    } catch { /* bekor qilindi */ }
  }

  /* ---------- Appbar soyasi ---------- */
  window.addEventListener('scroll', () => $('#appbar').classList.toggle('is-scrolled', scrollY > 4), { passive: true });

  /* ---------- Onlayn / oflayn ---------- */
  function netStatus() {
    const b = $('#netBanner');
    if (navigator.onLine) { if (!b.hidden) { b.innerHTML = `${I('check')}Internet qaytdi`; b.classList.add('is-ok'); setTimeout(() => { b.hidden = true; b.classList.remove('is-ok'); }, 1800); } }
    else { b.hidden = false; b.classList.remove('is-ok'); b.innerHTML = `${I('offline')}Oflayn rejim — saqlangan sahifalar koʻrsatilmoqda`; }
  }
  window.addEventListener('online', netStatus);
  window.addEventListener('offline', netStatus);

  /* ---------- PWA: oʻrnatish va service worker ---------- */
  let deferredPrompt = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function syncInstall() {
    $$('.install-btn').forEach(b => { b.hidden = isStandalone() || (!deferredPrompt && !isIOS); b.innerHTML = `${I('download')}Ilovani oʻrnatish`; });
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; syncInstall(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; syncInstall(); toast('Zachkana oʻrnatildi!', 'check'); });
  async function promptInstall() {
    if (isStandalone()) { toast('Ilova allaqachon oʻrnatilgan'); return; }
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; syncInstall(); return; }
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">Ilovani oʻrnatish</h2>
      <p class="z-muted">Zachkana’ni telefoningiz bosh ekraniga qoʻshing — u oddiy ilova kabi ochiladi va internet boʻlmaganda ham ishlaydi.</p>
      <ol class="install-steps">
        ${isIOS
          ? `<li><span>1</span>Safari pastidagi <strong>Ulashish</strong> ${I('share')} tugmasini bosing</li><li><span>2</span><strong>“Bosh ekranga qoʻshish”</strong> ni tanlang</li><li><span>3</span><strong>Qoʻshish</strong> ni bosing</li>`
          : `<li><span>1</span>Brauzer menyusini ${I('more')} oching</li><li><span>2</span><strong>“Ilovani oʻrnatish”</strong> yoki <strong>“Bosh ekranga qoʻshish”</strong> ni tanlang</li><li><span>3</span>Tasdiqlang</li>`}
      </ol>`);
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* SW ishlamasa ham sayt ishlaydi */ }));
  }

  /* ---------- Ishga tushirish ---------- */
  (async () => {
    try {
      // Server bormi? Boʻlmasa (404, HTML javob yoki javob kelmasa) — demo rejim
      applyBootstrap(await api.get('bootstrap', { timeout: 6000 }));
      api.live = true;
    } catch (e) {
      // Sayt serverga yuklangan, lekin hali oʻrnatilmagan
      if (e.status === 503 && e.data?.install) { location.href = e.data.install; return; }
      api.live = false;
    }
    document.documentElement.dataset.mode = api.live ? 'live' : 'demo';
    netStatus();
    await onRoute();
    // Google/Telegram orqali kirishdan keyingi xabar
    if (api.live && bootNotice.error) toast(bootNotice.error, 'info');
    else if (api.live && bootNotice.notice) toast(bootNotice.notice, 'check');
  })();
})();
