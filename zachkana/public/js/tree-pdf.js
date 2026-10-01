/* Zachkana — shajarani PDF qilib yuklash.
   Daraxt canvas'ga chiziladi (Oʻzbek harflari va suratlar bilan), keyin rasmlar
   oddiy PDF faylga joylanadi. Tashqi kutubxona kerak emas, oflayn ham ishlaydi.
   Katta daraxt: 1-varaqda butun daraxt (katta varaq), keyingi varaqlarda A4 boʻlaklar
   (chop etib, yonma-yon yopishtirish mumkin). */
(function () {
  'use strict';

  const BOX_W = 200, BOX_H = 68, GAP_SPOUSE = 16, GAP_SIB = 28, GAP_GEN = 58, PAD = 48, HEADER = 118, FOOTER = 40;
  const TILE_W = 1400, TILE_H = 990;            // A4 albom varagʻi (297×210) nisbati
  const OVERLAP = 70;                           // chekkadagi kartalar ikkala varaqda ham chiqsin
  const PT = 0.6;                               // 1 chizma pikseli = 0.6 pt (1400px ≈ A4 kengligi)
  const C = {
    bg: '#fbf8f2', card: '#fffdf8', cardDead: '#efe9df', border: '#e0d3bd', text: '#2a241c', muted: '#7a6d5b',
    m: '#2a5ea8', f: '#b8323a', me: '#e39a2d', line: '#c7ad83', accent: '#9a6512'
  };
  const HUES = [['#d7e3f5', '#173a6c'], ['#fcebcf', '#7a4a08'], ['#dcefe0', '#1f4a2a'], ['#f7dada', '#7a1e24'], ['#e8e0f5', '#3d2a6c'], ['#d9f0ef', '#15504d']];
  const FONT = '"Manrope", "Noto Sans", system-ui, sans-serif';
  const SERIF = '"Lora", "Noto Serif", Georgia, serif';

  const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const hue = n => { let h = 0; for (const ch of n) h = (h * 31 + ch.codePointAt(0)) >>> 0; return HUES[h % HUES.length]; };
  const years = p => p.d ? `${p.b ?? '?'} – ${p.d}` : p.b ? `${p.b}-y.t.` : '';

  /* ---------- Joylashtirish (har bir shox oʻz kengligini egallaydi) ---------- */
  function measure(n) {
    n.cw = n.people.length * BOX_W + (n.people.length - 1) * GAP_SPOUSE;
    n.kw = n.children.reduce((s, c) => s + measure(c), 0) + Math.max(0, n.children.length - 1) * GAP_SIB;
    n.w = Math.max(n.cw, n.kw);
    return n.w;
  }
  function place(n, x, depth, out) {
    n.y = PAD + HEADER + depth * (BOX_H + GAP_GEN);
    n.x = x + (n.w - n.cw) / 2;
    out.depth = Math.max(out.depth, depth);
    n.people.forEach((p, i) => out.boxes.push({ p, x: n.x + i * (BOX_W + GAP_SPOUSE), y: n.y }));
    let cx = x + (n.w - n.kw) / 2;
    for (const c of n.children) { place(c, cx, depth + 1, out); cx += c.w + GAP_SIB; }
  }
  // Ota-ona chizigʻi chiqadigan nuqta: er-xotin orasi yoki yolgʻiz odamning oʻrtasi
  const anchor = n => n.x + (n.people.length > 1 ? BOX_W + GAP_SPOUSE / 2 : BOX_W / 2);

  function layout(forest) {
    const out = { boxes: [], depth: 0, forest };
    let x = PAD;
    for (const t of forest) { measure(t); place(t, x, 0, out); x += t.w + GAP_SIB * 2; }
    out.W = Math.max(x - GAP_SIB * 2 + PAD, 900);
    out.H = PAD + HEADER + (out.depth + 1) * (BOX_H + GAP_GEN) - GAP_GEN + PAD + FOOTER;
    return out;
  }

  /* ---------- Chizish ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fitText(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > max) text = text.slice(0, -1);
    return text.trimEnd() + '…';
  }
  function wrap2(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return [text];
    const words = text.split(' ');
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > max && line) return [line, fitText(ctx, words.slice(i).join(' '), max)];
      line = next;
    }
    return [fitText(ctx, line, max)];
  }

  function drawLines(ctx, n) {
    if (!n.children.length) return;
    const ax = anchor(n), top = n.y + BOX_H, mid = top + GAP_GEN / 2;
    const xs = n.children.map(c => c.x + BOX_W / 2); // bolaning oʻzi (qon qarindosh) — birinchi karta
    ctx.beginPath();
    ctx.moveTo(ax, top); ctx.lineTo(ax, mid);
    ctx.moveTo(Math.min(ax, ...xs), mid); ctx.lineTo(Math.max(ax, ...xs), mid);
    xs.forEach(x => { ctx.moveTo(x, mid); ctx.lineTo(x, mid + GAP_GEN / 2); });
    ctx.stroke();
    n.children.forEach(c => drawLines(ctx, c));
  }

  function drawBox(ctx, b, imgs) {
    const { p, x, y } = b;
    ctx.save();
    roundRect(ctx, x, y, BOX_W, BOX_H, 12);
    ctx.fillStyle = p.d ? C.cardDead : C.card; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = p.g === 'f' ? C.f : C.m; ctx.fillRect(x, y, BOX_W, 5);
    ctx.restore();
    ctx.lineWidth = p.me ? 3 : 1.2;
    ctx.strokeStyle = p.me ? C.me : p.d ? C.muted : C.border;
    if (p.d && !p.me) ctx.setLineDash([5, 4]);
    roundRect(ctx, x, y, BOX_W, BOX_H, 12); ctx.stroke();
    ctx.setLineDash([]);

    // Avatar: surat yoki bosh harflar
    const cx = x + 32, cy = y + BOX_H / 2 + 2, r = 21;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    const img = p.photo && imgs.get(p.photo);
    if (img) {
      ctx.clip();
      const s = Math.max((r * 2) / img.width, (r * 2) / img.height);
      if (p.d) ctx.filter = 'grayscale(0.7)';
      ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      ctx.filter = 'none';
    } else {
      const [bg, fg] = hue(p.name);
      ctx.fillStyle = bg; ctx.fill();
      ctx.fillStyle = fg; ctx.font = `800 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initials(p.name), cx, cy + 1);
    }
    ctx.restore();

    // Ism (2 qatorgacha) va yillar
    const tx = x + 62, maxW = BOX_W - 70;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `800 14px ${FONT}`; ctx.fillStyle = C.text;
    const lines = wrap2(ctx, p.name + (p.me ? ' (Siz)' : ''), maxW);
    const yr = years(p);
    let ty = y + (lines.length > 1 ? 27 : 33) - (yr ? 0 : -8);
    lines.forEach(l => { ctx.fillText(l, tx, ty); ty += 17; });
    if (yr) { ctx.font = `600 11.5px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(fitText(ctx, yr, maxW), tx, ty + 1); }
    ctx.restore();
  }

  function drawCouples(ctx, n) {
    if (n.people.length > 1) {
      for (let i = 1; i < n.people.length; i++) {
        const x1 = n.x + i * (BOX_W + GAP_SPOUSE) - GAP_SPOUSE, y = n.y + BOX_H / 2;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + GAP_SPOUSE, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x1 + GAP_SPOUSE / 2, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = C.line; ctx.fill();
      }
    }
    n.children.forEach(c => drawCouples(ctx, c));
  }

  function drawHeader(ctx, L, meta) {
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.fillStyle = C.accent; ctx.font = `800 13px ${FONT}`; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ZACHKANA · SHAJARA', PAD, PAD + 14);
    ctx.fillStyle = C.text; ctx.font = `700 30px ${SERIF}`;
    ctx.fillText(fitText(ctx, meta.title, L.W - PAD * 2), PAD, PAD + 52);
    ctx.fillStyle = C.muted; ctx.font = `600 14px ${FONT}`;
    ctx.fillText(meta.subtitle, PAD, PAD + 78);
    // Belgilar
    let x = PAD;
    const y = PAD + 100;
    for (const [label, draw] of [
      ['Erkak', () => { ctx.fillStyle = C.m; ctx.fillRect(x, y - 9, 18, 5); }],
      ['Ayol', () => { ctx.fillStyle = C.f; ctx.fillRect(x, y - 9, 18, 5); }],
      ['Marhum', () => { ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.strokeRect(x, y - 12, 18, 12); ctx.setLineDash([]); }],
      ...(meta.hasMe ? [['Siz', () => { ctx.lineWidth = 2.5; ctx.strokeStyle = C.me; ctx.strokeRect(x, y - 12, 18, 12); ctx.lineWidth = 1.5; }]] : [])
    ]) {
      draw();
      ctx.fillStyle = C.muted; ctx.font = `600 12px ${FONT}`; ctx.fillText(label, x + 24, y);
      x += 24 + ctx.measureText(label).width + 22;
    }
    ctx.restore();
  }

  function drawAll(ctx, L, meta, imgs) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, L.W, L.H);
    drawHeader(ctx, L, meta);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    L.forest.forEach(t => { drawLines(ctx, t); drawCouples(ctx, t); });
    L.boxes.forEach(b => drawBox(ctx, b, imgs));
    ctx.fillStyle = C.muted; ctx.font = `600 12px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(meta.footer, L.W - PAD, L.H - PAD / 2);
    ctx.textAlign = 'left';
  }

  /* ---------- Rasm → JPEG → PDF ---------- */
  // iOS Safari: canvas maydoni ~16.7 mln pikseldan oshmasligi kerak
  const MAX_AREA = 16e6, MAX_SIDE = 16000;

  async function renderJpeg(L, meta, imgs, sx, sy, sw, sh, scale, label, grid) {
    scale = Math.min(scale, Math.sqrt(MAX_AREA / (sw * sh)), MAX_SIDE / sw, MAX_SIDE / sh);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(sw * scale)); cv.height = Math.max(1, Math.round(sh * scale));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.scale(scale, scale); ctx.translate(-sx, -sy);
    drawAll(ctx, L, meta, imgs);
    if (grid) { // umumiy koʻrinishda varaqlar chegarasi va raqami
      ctx.strokeStyle = 'rgba(154,101,18,.55)'; ctx.lineWidth = 3 / Math.max(scale, 0.05); ctx.setLineDash([12, 8]);
      ctx.font = `800 ${Math.round(56)}px ${FONT}`; ctx.fillStyle = 'rgba(154,101,18,.35)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      grid.forEach((t, i) => {
        ctx.strokeRect(t.x0 + 4, t.y0 + 4, TILE_W - 8, TILE_H - 8);
        ctx.fillText(String(i + 2), t.x0 + TILE_W / 2, t.y0 + TILE_H / 2);
      });
      ctx.setLineDash([]); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (label) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.font = `700 12px ${FONT}`;
      const w = ctx.measureText(label).width + 20;
      ctx.fillStyle = 'rgba(42,36,28,.78)'; roundRect(ctx, sw - w - 12, sh - 34, w, 24, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, sw - w - 2, sh - 17);
    }
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
    const pw = cv.width, ph = cv.height;
    cv.width = cv.height = 0; // xotirani boʻshatish
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), pw, ph };
  }

  function pdfString(s) { // UTF-16BE hex — kirill/oʻzbek harflari uchun
    let hex = 'FEFF';
    for (const ch of s) { const c = ch.codePointAt(0); if (c > 0xffff) continue; hex += c.toString(16).padStart(4, '0').toUpperCase(); }
    return `<${hex}>`;
  }

  function buildPdf(pages, title) {
    const enc = new TextEncoder(), chunks = [], offsets = [];
    let size = 0;
    const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length; };
    const obj = (n, parts) => { offsets[n] = size; put(`${n} 0 obj\n`); parts.forEach(put); put('\nendobj\n'); };
    put(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])); // %PDF-1.4 + binar belgi
    const first = 4, kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(' ');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`]);
    obj(3, [`<< /Title ${pdfString(title)} /Creator (Zachkana) /Producer (zachkana.uz) >>`]);
    pages.forEach((p, i) => {
      const n = first + i * 3, w = p.w.toFixed(2), h = p.h.toFixed(2);
      const stream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
      obj(n, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`]);
      obj(n + 1, [`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]);
      obj(n + 2, [`<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream']);
    });
    const total = first + pages.length * 3, xref = size;
    put(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let i = 1; i < total; i++) put(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    put(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function loadImages(forest) {
    const urls = new Set();
    const walk = n => { n.people.forEach(p => p.photo && urls.add(p.photo)); n.children.forEach(walk); };
    forest.forEach(walk);
    const map = new Map();
    return Promise.all([...urls].map(u => new Promise(res => {
      const img = new Image();
      img.onload = () => { map.set(u, img); res(); };
      img.onerror = () => res();
      img.src = u;
    }))).then(() => map);
  }

  /**
   * forest: [{ people: [{name, g, b, d, photo, me}], children: [...] }]
   * meta:   { title, subtitle, footer, filename, hasMe }
   * onProgress(text) — "3/12 varaq" kabi
   */
  async function exportTreePdf(forest, meta, onProgress = () => {}) {
    await document.fonts?.ready;
    const L = layout(forest);
    const imgs = await loadImages(forest);
    const pages = [];
    const single = L.W <= TILE_W * 1.4 && L.H <= TILE_H * 1.4;

    if (single) {
      onProgress('Chizilmoqda…');
      const r = await renderJpeg(L, meta, imgs, 0, 0, L.W, L.H, 2);
      const k = Math.max(PT, 842 / L.W); // kamida A4 albom kengligi
      pages.push({ ...r, w: L.W * k, h: L.H * k });
    } else {
      const stepX = TILE_W - OVERLAP, stepY = TILE_H - OVERLAP;
      const cols = Math.ceil((L.W - OVERLAP) / stepX), rows = Math.ceil((L.H - OVERLAP) / stepY);
      // Boʻsh boʻlaklar (kartasiz) tashlab yuboriladi
      const tiles = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = c * stepX, y0 = r * stepY;
          const used = r === 0 || L.boxes.some(b => b.x + BOX_W > x0 && b.x < x0 + TILE_W && b.y + BOX_H + GAP_GEN > y0 && b.y - GAP_GEN < y0 + TILE_H);
          if (used) tiles.push({ r, c, x0, y0 });
        }
      }
      // 1-varaq: umumiy koʻrinish, boʻlaklar raqami bilan
      onProgress(`Butun daraxt… (${tiles.length + 1} varaq)`);
      const ov = await renderJpeg(L, meta, imgs, 0, 0, L.W, L.H, 1.4, null, tiles);
      // Butun daraxt bitta katta varaqda (ekranda kattalashtirib koʻriladi yoki plotterda chop etiladi).
      // PDF varagʻi 14400 pt dan katta boʻla olmaydi.
      const k = Math.min(PT, 14400 / L.W, 14400 / L.H);
      pages.push({ ...ov, w: L.W * k, h: L.H * k });
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        onProgress(`${i + 2}/${tiles.length + 1} varaq…`);
        const label = `${i + 2}-varaq · qator ${t.r + 1}, ustun ${t.c + 1}`;
        const r = await renderJpeg(L, meta, imgs, t.x0, t.y0, TILE_W, TILE_H, 2, label);
        pages.push({ ...r, w: TILE_W * PT, h: TILE_H * PT });
        await new Promise(res => setTimeout(res, 0)); // sahifa qotib qolmasin
      }
    }

    onProgress('PDF tayyorlanmoqda…');
    const blob = buildPdf(pages, meta.title);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = meta.filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { pages: pages.length, size: blob.size, blob };
  }

  window.ZachkanaTreePdf = { exportTreePdf, layout, buildPdf };
})();
