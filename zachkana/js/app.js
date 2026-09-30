/* Zachkana — ilova (SPA, hash-router, PWA) */
(() => {
  'use strict';

  const D = window.ZK_DATA;
  const I = (n, c) => window.ZIcons.svg(n, c);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* shaxsiy rejim */ } }
  };

  /* ---------- Yordamchi komponentlar ---------- */
  const initials = name => name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0; return (h % 6) + 1; };
  const avatar = (name, size = '', extra = '') => `<span class="z-avatar ${size ? 'z-avatar--' + size : ''} ${extra}" data-hue="${hue(name)}" aria-hidden="true">${esc(initials(name))}</span>`;
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const years = p => p.d ? `${p.b}–${p.d}` : `${p.b}-y.t.`;
  const vetYears = v => v.d ? `${v.b}–${v.d}` : `${v.b}-yilda tugʻilgan`;

  const NAV = [
    { id: 'home', href: '#/', label: 'Bosh sahifa', short: 'Bosh', icon: 'home', group: 'Qishloq' },
    { id: 'tarix', href: '#/tarix', label: 'Qishloq tarixi', icon: 'book', group: 'Qishloq' },
    { id: 'xronologiya', href: '#/xronologiya', label: 'Xronologiya', icon: 'timeline', group: 'Qishloq' },
    { id: 'faxriylar', href: '#/faxriylar', label: 'Faxriylar', icon: 'medal', group: 'Qishloq' },
    { id: 'shajara', href: '#/shajara', label: 'Shajara', icon: 'shajara', group: 'Oila' },
    { id: 'chat', href: '#/chat', label: 'Suhbat', icon: 'chat', group: 'Jamoa' },
    { id: 'profil', href: '#/profil', label: 'Profil', icon: 'user', group: 'Jamoa' }
  ];
  const TABS = ['home', 'shajara', 'faxriylar', 'chat'];
  const unreadTotal = () => D.channels.reduce((s, c) => s + (c.unread || 0), 0);

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
            ['#/profil', 'user', 'Profil', 'Kirish']
          ].map(([h, ic, t, s], i) => `<a class="tile tile--${i + 1}" href="${h}"><span class="tile__icon">${I(ic)}</span><span class="tile__title">${t}</span><span class="tile__sub">${s}</span></a>`).join('')}
        </nav>
      </section>

      <div class="home-cols section">
        <section>
          <div class="section-head"><h2 class="z-h4">Eʼlonlar va yangiliklar</h2><button class="z-btn z-btn--ghost z-btn--sm" data-action="notifications">Barchasi ${I('chevron-right')}</button></div>
          <div class="z-stack" style="--z-gap:12px">
            ${D.news.map(n => `
              <article class="z-card news-card">
                <div class="z-card__body">
                  <div class="z-spread"><span class="z-badge z-badge--${n.tone}">${n.type}</span><span class="z-caption">${n.date}</span></div>
                  <h3 class="news-card__title">${esc(n.title)}</h3>
                  <p class="z-small">${esc(n.text)}</p>
                </div>
              </article>`).join('')}
          </div>
        </section>
        <aside class="z-stack" style="--z-gap:16px">
          <div class="z-card z-card--accent today-card z-ornament">
            <div class="z-card__body">
              <span class="z-overline" style="color:var(--z-orik-300)">Bugun tarixda</span>
              <div class="today-card__year">${D.todayInHistory.year}</div>
              <h3 class="today-card__title">${esc(D.todayInHistory.title)}</h3>
              <p>${esc(D.todayInHistory.text)}</p>
              <a class="z-btn z-btn--accent z-btn--sm" href="#/xronologiya">Xronologiyani koʻrish ${I('chevron-right')}</a>
            </div>
          </div>
          <div class="z-card">
            <div class="z-card__body z-stack" style="--z-gap:12px">
              <div class="z-spread"><strong>Shajarangiz</strong><span class="z-badge z-badge--success">68%</span></div>
              <div class="z-progress" role="progressbar" aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"><span style="width:68%"></span></div>
              <p class="z-small" style="margin:0">4 avlod toʻldirilgan. Buvangiz tomonidagi qarindoshlarni qoʻshing.</p>
              <a class="z-btn z-btn--soft z-btn--sm" href="#/shajara">${I('plus')}Qarindosh qoʻshish</a>
            </div>
          </div>
        </aside>
      </div>

      <section class="section">
        <div class="section-head"><h2 class="z-h4">Qishloq faxriylari</h2><a class="z-btn z-btn--ghost z-btn--sm" href="#/faxriylar">Barchasi ${I('chevron-right')}</a></div>
        <div class="carousel">
          ${D.veterans.slice(0, 6).map(vt => `
            <a class="z-card z-card--interactive vet-mini" href="#/faxriylar/${vt.id}">
              ${avatar(vt.name, 'lg', 'z-avatar--faxriy')}
              <strong>${esc(vt.name)}</strong>
              <span class="z-caption">${vetYears(vt)}</span>
              <span class="z-badge z-badge--accent">${esc(vt.title)}</span>
            </a>`).join('')}
        </div>
      </section>

      <section class="section">
        <a class="z-card z-card--interactive chat-promo" href="#/chat/umumiy">
          <div class="z-card__body z-spread">
            <div class="z-row">
              <div class="z-avatar-group">${['Jasur Ergashev', 'Malika T.', 'Shahlo Hamidova', 'Farhod Bahodirov'].map(n => avatar(n, 'sm')).join('')}</div>
              <div>
                <strong>Qishloq suhbati</strong>
                <div class="z-small"><span class="online-dot"></span>${D.channels[0].online} kishi hozir onlayn</div>
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
      <p class="z-caption">Saytdagi ism, sana va voqealar hozircha dizayn uchun namuna. · <a href="ui/">Zachkana UI dizayn tizimi</a></p>
    </footer>`;
  }

  /* --- Shajara --- */
  const people = new Map();
  function indexTree(node, clan, gen = 1, parent = null) {
    people.set(node.id, { ...node, clan, gen, parent });
    if (node.spouse) people.set(node.spouse.id, { ...node.spouse, clan, gen, spouseOf: node.id });
    (node.children || []).forEach(c => indexTree(c, clan, gen + 1, node.id));
  }
  Object.entries(D.trees).forEach(([clan, root]) => indexTree(root, clan));

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

  views.shajara = () => {
    const s = shajaraState;
    const clanPeople = [...people.values()].filter(p => p.clan === s.clan);
    const gens = Math.max(...clanPeople.map(p => p.gen));
    return {
      title: 'Shajara',
      html: `
      <div class="page-head">
        <div>
          <span class="z-overline">Oila daraxti</span>
          <h1 class="z-h2">Shajara</h1>
          <p class="z-muted">Urugʻingizni tanlang, qarindoshlaringizni toping va daraxtni birga toʻldiring.</p>
        </div>
        <button class="z-btn z-btn--primary" data-action="add-person">${I('plus')}Qarindosh qoʻshish</button>
      </div>

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

      <div class="clan-summary z-small">${clanPeople.length} kishi koʻrsatilgan · ${gens} avlod · <span class="z-muted">namuna maʼlumot</span></div>

      ${s.mode === 'tree' ? `
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
      `,
      mount: mountShajara
    };
  };

  let panzoom = null;
  function mountShajara() {
    const s = shajaraState;
    $$('[data-clan]').forEach(b => b.onclick = () => { s.clan = b.dataset.clan; s.q = ''; render(); });
    $$('[data-mode]').forEach(b => b.onclick = () => { s.mode = b.dataset.mode; render(); });
    const search = $('#treeSearch');
    search.oninput = () => { s.q = search.value.trim().toLowerCase(); applySearch(); };
    if (s.mode === 'tree') {
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
        <div><dt>Tugʻilgan yili</dt><dd>${p.b}</dd></div>
        ${p.d ? `<div><dt>Vafot etgan</dt><dd>${p.d}</dd></div>` : ''}
        ${p.job ? `<div><dt>Kasbi</dt><dd>${esc(p.job)}</dd></div>` : ''}
        ${spouse ? `<div><dt>Turmush oʻrtogʻi</dt><dd><button class="linkish" data-person="${spouse.id}">${esc(spouse.name)}</button></dd></div>` : ''}
        ${father ? `<div><dt>Otasi</dt><dd><button class="linkish" data-person="${father.id}">${esc(father.name)}</button></dd></div>` : ''}
      </dl>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${kids.length ? `<h3 class="sheet-sub">Farzandlari</h3><div class="z-row" style="--z-gap:8px">${kids.map(k => `<button class="z-chip" data-person="${k.id}">${avatar(k.name, 'xs')}${esc(k.name)}</button>`).join('')}</div>` : ''}
      <div class="sheet-actions">
        <button class="z-btn z-btn--primary" data-action="suggest-edit">${I('edit')}Tuzatish taklif qilish</button>
        <button class="z-btn" data-action="share" data-share="${esc(p.name)}">${I('share')}Ulashish</button>
      </div>`);
  }

  function addPersonSheet() {
    const opts = [...people.values()].filter(p => !p.spouseOf && p.clan === shajaraState.clan).map(p => `<option value="${p.id}">${esc(p.name)} (${years(p)})</option>`).join('');
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">Qarindosh qoʻshish</h2>
      <p class="z-muted">Maʼlumot moderator tasdiqlagach shajaraga qoʻshiladi.</p>
      <form class="z-stack form" data-form="person">
        <label class="z-field"><span class="z-label">Ism-sharifi</span><input class="z-input" required placeholder="Masalan: Karimberdi Mirzaboyev"></label>
        <div class="z-field"><span class="z-label">Jinsi</span>
          <div class="z-segment" role="radiogroup"><button type="button" role="radio" aria-selected="true" data-seg>Erkak</button><button type="button" role="radio" aria-selected="false" data-seg>Ayol</button></div></div>
        <div class="form-2">
          <label class="z-field"><span class="z-label">Tugʻilgan yili</span><input class="z-input" inputmode="numeric" pattern="[0-9]{4}" placeholder="1950"></label>
          <label class="z-field"><span class="z-label">Vafot etgan yili</span><input class="z-input" inputmode="numeric" pattern="[0-9]{4}" placeholder="—"><span class="z-hint">Hayot boʻlsa boʻsh qoldiring</span></label>
        </div>
        <label class="z-field"><span class="z-label">Kimning farzandi?</span><select class="z-select">${opts}</select></label>
        <label class="z-field"><span class="z-label">Qoʻshimcha maʼlumot</span><textarea class="z-textarea" placeholder="Kasbi, yashagan joyi, xotiralar…"></textarea></label>
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('check')}Yuborish</button>
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
      <div class="z-row article-meta z-small"><span>${I('book')}${D.history.length} bob</span><span>${I('clock')}8 daqiqa</span><span>${I('users')}Oqsoqollar bilan hamkorlikda</span></div>
    </header>
    <div class="article">
      <aside class="toc" aria-label="Mundarija">
        <div class="z-overline">Mundarija</div>
        <ol>${D.history.map((c, i) => `<li><button data-scroll="ch-${c.id}"><span>${i + 1}</span>${esc(c.title)}</button></li>`).join('')}</ol>
      </aside>
      <article class="z-prose">
        <div class="z-alert z-alert--accent">${I('info')}<div><strong>Namuna matn</strong>Bu boʻlim qishloq oqsoqollari va oʻlkashunoslar bilan birga yoziladi. Hozirgi matn — dizayn uchun namuna.</div></div>
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
              ${avatar(v.name, 'lg', 'z-avatar--faxriy')}
              <h3 class="vet-card__name">${esc(v.name)}</h3>
              <div class="z-caption">${vetYears(v)}</div>
              <span class="z-badge z-badge--primary">${esc(catName(v.cat))}</span>
              <p class="z-small">${esc(v.short)}</p>
              <div class="z-row" style="--z-gap:6px;justify-content:center">${v.medals.map(m => `<span class="z-medal"><i>${I('star')}</i>${esc(m)}</span>`).join('')}</div>
            </div>
          </a>`).join('') : `<div class="z-empty">${I('search')}<p>Hech narsa topilmadi</p></div>`}
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
    const v = D.veterans.find(x => x.id === id);
    if (!v) return views.notfound();
    const memories = store.get('zk-mem-' + id, [
      { a: 'Latofat Umarova', t: '2 kun oldin', text: 'Bolaligimizda u kishining hikoyalarini tinglab oʻsganmiz. Xotirasi yodimizda.' },
      { a: 'Oybek J.', t: '1 hafta oldin', text: 'Bobomning doʻsti edilar. Surati uyimizda hali ham osigʻliq.' }
    ]);
    return {
      title: v.name, back: '#/faxriylar',
      html: `
      <article class="vet-detail">
        <header class="vet-hero z-ornament">
          ${avatar(v.name, 'xl', 'z-avatar--faxriy')}
          <div>
            <span class="z-badge z-badge--accent">${esc(catName(v.cat))}</span>
            <h1 class="z-h2">${esc(v.name)}</h1>
            <p class="z-muted">${esc(v.title)} · ${vetYears(v)}</p>
            <div class="z-row" style="--z-gap:6px">${v.medals.map(m => `<span class="z-medal"><i>${I('star')}</i>${esc(m)}</span>`).join('')}</div>
          </div>
        </header>
        <div class="vet-body">
          <div class="z-prose">
            <blockquote>“${esc(v.quote)}”<cite>— ${esc(v.name.split(' ')[0])}</cite></blockquote>
            <h2>Hayot yoʻli</h2>
            <p>${esc(v.short)} Namuna matn: bu yerda faxriyning tugʻilgan joyi, oilasi, mehnat faoliyati va qishloq uchun qilgan xizmatlari batafsil yoziladi. Maʼlumotlar oila aʼzolari va qishloqdoshlar bilan kelishilgan holda joylanadi.</p>
            <p>Suratlar, hujjatlar va mukofotlar galereyasi ham shu sahifada boʻladi.</p>
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
  const chatMsgs = id => [...(D.messages[id] || []), ...store.get('zk-chat-' + id, [])];
  views.chat = (id) => {
    const wide = matchMedia('(min-width: 1024px)').matches;
    const active = id || (wide ? D.channels[0].id : null);
    const ch = D.channels.find(c => c.id === active);
    if (id && !ch) return views.notfound();
    return {
      title: id && ch ? ch.name : 'Suhbat',
      back: id ? '#/chat' : null,
      immersive: !!id,
      html: `
      <div class="chat-layout" data-mode="${id ? 'pane' : 'list'}">
        <section class="chat-list">
          <div class="chat-list__head">
            <h1 class="z-h3">Suhbat</h1>
            <label class="z-search">${I('search')}<span class="z-sr-only">Kanal qidirish</span><input class="z-input" type="search" placeholder="Qidirish…" id="chSearch"></label>
          </div>
          <ul class="z-list" id="chList">
            ${D.channels.map(c => {
              const last = chatMsgs(c.id).slice(-1)[0];
              return `<li><a class="z-list-item channel ${c.id === active ? 'is-active' : ''}" href="#/chat/${c.id}" data-ch-name="${esc(c.name.toLowerCase())}">
                <span class="channel__icon">${I(c.icon)}</span>
                <span class="z-list-item__main"><span class="z-list-item__title">${esc(c.name)}</span><span class="z-list-item__sub">${last ? esc((last.me ? 'Siz' : last.a.split(' ')[0]) + ': ' + last.text) : esc(c.desc)}</span></span>
                <span class="channel__side"><span class="z-caption">${last?.t || ''}</span>${c.unread && c.id !== active ? `<span class="z-counter">${c.unread}</span>` : ''}</span>
              </a></li>`;
            }).join('')}
          </ul>
          <div class="z-alert chat-note">${I('info')}<div>Demo rejim: yozgan xabarlaringiz hozircha faqat shu qurilmada saqlanadi.</div></div>
        </section>
        <section class="chat-pane">
          ${ch ? `
          <header class="chat-pane__head">
            <span class="channel__icon">${I(ch.icon)}</span>
            <div><strong>${esc(ch.name)}</strong><div class="z-caption"><span class="online-dot"></span>${ch.online} onlayn · ${fmt(ch.members)} aʼzo</div></div>
            <button class="z-btn z-btn--ghost z-btn--icon z-btn--sm" aria-label="Maʼlumot" data-action="channel-info" data-id="${ch.id}">${I('info')}</button>
          </header>
          <div class="chat-scroll" id="chatScroll">${renderMessages(ch.id)}</div>
          <div class="chat-compose">
            ${ch.readonly ? `<div class="z-alert">${I('megaphone')}<div>Bu kanalda faqat moderatorlar eʼlon joylay oladi.</div></div>` : `
            <form class="z-composer" id="composer" data-id="${ch.id}">
              <button type="button" class="z-btn z-btn--ghost z-btn--icon z-btn--sm" aria-label="Fayl biriktirish" data-action="attach">${I('clip')}</button>
              <textarea rows="1" id="msgInput" placeholder="Xabar yozing…" aria-label="Xabar"></textarea>
              <button type="submit" class="z-btn z-btn--primary z-btn--icon z-btn--sm" aria-label="Yuborish">${I('send')}</button>
            </form>`}
          </div>` : `<div class="z-empty chat-empty">${I('chat')}<p>Suhbatni tanlang</p></div>`}
        </section>
      </div>`,
      mount() {
        const s = $('#chSearch');
        s.oninput = () => $$('[data-ch-name]').forEach(a => a.parentElement.hidden = !a.dataset.chName.includes(s.value.trim().toLowerCase()));
        if (!ch) return;
        ch.unread = 0; renderChrome();
        const sc = $('#chatScroll');
        const toBottom = () => { sc.scrollTop = sc.scrollHeight; if (id) window.scrollTo(0, document.documentElement.scrollHeight); };
        toBottom();
        const form = $('#composer');
        if (!form) return;
        const ta = $('#msgInput');
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
        ta.oninput = grow;
        ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
        form.onsubmit = e => {
          e.preventDefault();
          const text = ta.value.trim();
          if (!text) return;
          const now = new Date();
          const msg = { me: true, a: 'Siz', t: now.toTimeString().slice(0, 5), text, queued: !navigator.onLine };
          const saved = store.get('zk-chat-' + ch.id, []); saved.push(msg); store.set('zk-chat-' + ch.id, saved);
          ta.value = ''; grow();
          sc.innerHTML = renderMessages(ch.id); toBottom();
          if (msg.queued) toast('Oflayn: xabar internet qaytganda yuboriladi', 'offline');
        };
      }
    };
  };
  function renderMessages(id) {
    let prev = null;
    return `<div class="z-day-sep"><span>Bugun</span></div>` + chatMsgs(id).map(m => {
      const grouped = prev && prev.a === m.a;
      prev = m;
      return `<div class="z-msg ${m.me ? 'z-msg--me' : ''} ${grouped ? 'z-msg--grouped' : ''}">
        ${m.me ? '' : avatar(m.a, 'sm')}
        <div class="z-bubble">
          ${!m.me && !grouped ? `<div class="z-bubble__author">${esc(m.a)}</div>` : ''}
          ${esc(m.text)}
          <div class="z-bubble__time">${m.t}${m.me ? ' ' + (m.queued ? '🕓' : '✓✓') : ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  /* --- Menyu (telefon) --- */
  views.menyu = () => ({
    title: 'Menyu',
    html: `
    <a class="z-card z-card--interactive profile-card" href="#/profil">
      <div class="z-card__body z-row" style="flex-wrap:nowrap">
        ${avatar('Mehmon', 'lg')}
        <div style="flex:1"><strong>Mehmon</strong><div class="z-small">Kirish yoki roʻyxatdan oʻtish</div></div>
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
  views.profil = () => ({
    title: 'Profil',
    html: `
    <div class="auth">
      <div class="z-card auth-card">
        <div class="auth-card__top z-ornament"><img src="assets/logo-mark.svg" alt="" width="64" height="64"></div>
        <div class="z-card__body z-stack">
          <div style="text-align:center"><h1 class="z-h3">Qishloqdoshlar davrasiga kiring</h1><p class="z-muted">Telefon raqamingizga SMS-kod yuboramiz.</p></div>
          <form class="z-stack" data-form="login">
            <label class="z-field"><span class="z-label">Telefon raqam</span>
              <div class="phone-input"><span>+998</span><input class="z-input" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="90 123 45 67" required></div>
            </label>
            <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">Kod olish</button>
          </form>
          <p class="z-caption" style="text-align:center">Kirish orqali siz foydalanish shartlariga rozilik bildirasiz.</p>
        </div>
      </div>
      <div class="auth-perks">
        <h2 class="z-h4">Roʻyxatdan oʻtsangiz:</h2>
        <ul class="z-stack" style="--z-gap:12px;list-style:none;padding:0">
          <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('shajara')}</span><span>Shajarangizni tahrirlaysiz va qarindoshlarni qoʻshasiz</span></li>
          <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('chat')}</span><span>Qishloq suhbatlarida yozasiz</span></li>
          <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('edit')}</span><span>Faxriylar haqida xotira qoldirasiz</span></li>
          <li class="z-row" style="flex-wrap:nowrap"><span class="perk-icon">${I('bell')}</span><span>Toʻy, hashar va eʼlonlardan xabardor boʻlasiz</span></li>
        </ul>
      </div>
    </div>`
  });

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
    }).join('') + `<div class="z-nav-label">Boshqa</div><a href="ui/">${I('naqsh')}<span>Zachkana UI</span></a>`;
    $('#sideUser').innerHTML = `
      <button class="z-list-item" data-action="theme">${I(effectiveTheme() === 'dark' ? 'sun' : 'moon')}<span class="z-list-item__main"><span class="z-list-item__title">${effectiveTheme() === 'dark' ? 'Yorugʻ mavzu' : 'Qorongʻi mavzu'}</span></span></button>
      <a class="z-list-item" href="#/profil">${avatar('Mehmon', 'sm')}<span class="z-list-item__main"><span class="z-list-item__title">Mehmon</span><span class="z-list-item__sub">Kirish</span></span></a>`;
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
      <button class="z-btn z-btn--ghost z-btn--icon bell" data-action="notifications" aria-label="Bildirishnomalar">${I('bell')}<span class="z-dot"></span></button>`;
    syncInstall();
  }

  function parseHash() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function render() {
    route = parseHash();
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

  let prevRouteKey = '';
  function onRoute() {
    closeSheet();
    const r = parseHash();
    const key = r.name + '/' + (r.arg || '');
    if (key !== prevRouteKey) window.scrollTo(0, 0);
    render();
    if (key !== prevRouteKey) {
      $('#view').classList.remove('view-enter'); void $('#view').offsetWidth; $('#view').classList.add('view-enter');
    }
    prevRouteKey = key;
  }
  window.addEventListener('hashchange', onRoute);
  matchMedia('(min-width: 1024px)').addEventListener?.('change', () => { if (route.name === 'chat') render(); });

  /* ---------- Harakatlar (delegatsiya) ---------- */
  document.addEventListener('click', e => {
    const personEl = e.target.closest('[data-person]');
    if (personEl) { personSheet(personEl.dataset.person); return; }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'close-sheet') closeSheet();
    else if (act === 'theme') setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
    else if (act === 'back') location.hash = a.dataset.href || '#/';
    else if (act === 'install') promptInstall();
    else if (act === 'add-person') addPersonSheet();
    else if (act === 'notifications') openSheet(`<h2 class="z-h3" id="sheetTitle">Bildirishnomalar</h2><ul class="z-list">${D.news.map(n => `<li class="z-list-item" style="align-items:flex-start"><span class="menu-icon">${I(n.tone === 'accent' ? 'megaphone' : n.tone === 'success' ? 'heart' : 'bell')}</span><span class="z-list-item__main"><span class="z-caption">${n.type} · ${n.date}</span><strong style="display:block">${esc(n.title)}</strong><span class="z-small">${esc(n.text)}</span></span></li>`).join('')}</ul>`);
    else if (act === 'suggest-edit') { closeSheet(); toast('Taklifingiz moderatorga yuborildi'); }
    else if (act === 'share') share(a.dataset.share);
    else if (act === 'memory' || act === 'add-memory' || act === 'nominate') memorySheet(act, a.dataset.id);
    else if (act === 'attach') toast('Fayl yuborish tez orada', 'clip');
    else if (act === 'channel-info') { const c = D.channels.find(x => x.id === a.dataset.id); openSheet(`<h2 class="z-h3" id="sheetTitle">${esc(c.name)}</h2><p class="z-muted">${esc(c.desc)}</p><dl class="facts"><div><dt>Aʼzolar</dt><dd>${c.members}</dd></div><div><dt>Onlayn</dt><dd>${c.online}</dd></div></dl><div class="z-alert">${I('info')}<div><strong>Suhbat qoidalari</strong>Hurmat, odob va qishloqdoshlarga mehr. Reklama va haqoratga yoʻl qoʻyilmaydi.</div></div>`); }
    else if (act === 'about') openSheet(`<div style="text-align:center"><img src="assets/logo-mark.svg" alt="" width="72" height="72" style="margin:0 auto 12px"><h2 class="z-h3" id="sheetTitle">zachkana.uz</h2><p class="z-muted">Zachkana qishlogʻining raqamli xotirasi. Shajara, tarix, xronologiya, faxriylar va qishloqdoshlar suhbati.</p><p class="z-caption">Versiya 1.0 · Zachkana UI asosida qurilgan</p><a class="z-btn z-btn--soft" href="ui/">${I('naqsh')}Dizayn tizimini koʻrish</a></div>`);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    if (kind === 'login') { toast('Demo: SMS-kod yuborildi', 'phone'); return; }
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
    closeSheet(); toast('Yuborildi! Moderator koʻrib chiqadi.');
  });
  document.addEventListener('click', e => {
    const seg = e.target.closest('[data-seg]');
    if (seg) seg.parentElement.querySelectorAll('[data-seg]').forEach(b => b.setAttribute('aria-selected', String(b === seg)));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  $('#scrim').addEventListener('click', closeSheet);

  function memorySheet(kind, id) {
    const title = kind === 'nominate' ? 'Faxriy taklif qilish' : kind === 'memory' ? 'Tarix uchun material' : 'Xotira qoldirish';
    const form = kind === 'add-memory' ? 'memory-add' : 'generic';
    openSheet(`
      <h2 class="z-h3" id="sheetTitle">${title}</h2>
      <form class="z-stack form" data-form="${form}" data-id="${esc(id || '')}">
        <label class="z-field"><span class="z-label">Ismingiz</span><input class="z-input" placeholder="Ism-sharifingiz"></label>
        ${kind === 'nominate' ? `<label class="z-field"><span class="z-label">Faxriyning ismi</span><input class="z-input" required></label><label class="z-field"><span class="z-label">Toifa</span><select class="z-select">${D.veteranCats.filter(c => c.id !== 'all').map(c => `<option>${c.name}</option>`).join('')}</select></label>` : ''}
        <label class="z-field"><span class="z-label">${kind === 'add-memory' ? 'Xotirangiz' : 'Hikoya yoki izoh'}</span><textarea class="z-textarea" required placeholder="Yozing…"></textarea></label>
        ${kind !== 'add-memory' ? `<label class="upload">${I('image')}<span><strong>Surat yoki hujjat biriktirish</strong><br><span class="z-caption">JPG, PNG yoki PDF · 10 MB gacha</span></span><input type="file" accept="image/*,application/pdf" class="z-sr-only"></label>` : ''}
        <button class="z-btn z-btn--primary z-btn--lg z-btn--block" type="submit">${I('send')}Yuborish</button>
      </form>`);
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
  netStatus();
  onRoute();
})();
