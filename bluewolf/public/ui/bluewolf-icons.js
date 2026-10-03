/* ==========================================================================
   BlueWolf UI — ikonkalar (SVG sprite)
   Ishlatish:  <svg class="bw-icon"><use href="#bw-i-meat"/></svg>
   yoki JS:    BWIcons.svg('meat', 'bw-icon--lg')
   Barcha ikonkalar 24×24, chiziqli (stroke = currentColor).
   ========================================================================== */
(function () {
  "use strict";

  var P = {
    wolf: '<path d="M5 3l4.5 4.5h5L19 3l.6 7.2L18 14l-6 7-6-7-1.6-3.8z"/><path d="M6.4 5.8l1.1 2.9M17.6 5.8l-1.1 2.9M8.6 11.4l2 1.1M15.4 11.4l-2 1.1M10.4 16.4L12 18l1.6-1.6"/>',
    den: '<path d="M3 20h18"/><path d="M5 20v-6a7 7 0 0114 0v6"/><path d="M9.5 20v-4.5a2.5 2.5 0 015 0V20"/><path d="M7 7l-2-2M17 7l2-2M12 5V3"/>',
    meat: '<path d="M14.5 4.5c3 0 5 2 5 5 0 4-4.5 7-8 7l-2.5 2.5"/><path d="M14.5 4.5c-3 0-6.5 3.5-6.5 7.5L5.5 14.5"/><path d="M4 16l2 2M3.5 19a1.5 1.5 0 102.1 2.1M2.9 18.4A1.5 1.5 0 015 16.3"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/><path d="M9 14.5a3 3 0 003 3"/>',
    herb: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    stone: '<path d="M4 17l3-8 5-3 6 3 2 8-5 3H8z"/><path d="M7 9l5 3 6-3M12 12v8"/>',
    wood: '<path d="M12 21V9M12 13l-4-4M12 11l4-4M8 9L6 5M16 7l1-4"/><path d="M9 21h6"/>',
    hide: '<path d="M6 4c2 1 4 1 6 0 2 1 4 1 6 0l1 5-2 3 1 7-6 2-6-2 1-7-2-3z"/>',
    bone: '<path d="M8.5 15.5l7-7"/><path d="M8.5 15.5a2.5 2.5 0 11-3.4 2.1 2.5 2.5 0 112.1-3.4M15.5 8.5a2.5 2.5 0 113.4-2.1 2.5 2.5 0 11-2.1 3.4"/>',
    moonstone: '<path d="M12 3l7 6-7 12L5 9z"/><path d="M5 9h14M9.5 9L12 21l2.5-12M8.5 5.5L9.5 9M15.5 5.5L14.5 9"/>',
    moonlight: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    xp: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    sword: '<path d="M14.5 3H21v6.5L10 20.5 3.5 14z"/><path d="M6 17l-3 4M8 13l3 3"/>',
    swords: '<path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4"/><path d="M7 17l-3 3M17 17l3 3M8 14l2 2M16 14l-2 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    paw: '<ellipse cx="12" cy="16" rx="4" ry="3.5"/><circle cx="6.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="17.5" cy="10.5" r="1.8"/>',
    pack: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.9.3 5 2.6 5 5.8"/>',
    quest: '<path d="M7 3h10v18l-5-3-5 3z"/><path d="M10 8h4M10 12h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    workshop: '<path d="M4.5 8.5C8 4.5 15 3.8 19.5 6.5"/><path d="M13 6l-8.5 14"/><path d="M19.5 6.5c.3 1.6 0 3-.8 4.2"/>',
    cave: '<path d="M2 20h20"/><path d="M4 20c0-7 3.5-12 8-12s8 5 8 12"/><path d="M9 20c0-3 1.3-5 3-5s3 2 3 5"/>',
    wall: '<path d="M3 6h18v14H3z"/><path d="M3 10.5h18M3 15h18M8 6v4.5M14 6v4.5M11 10.5V15M17 10.5V15M8 15v5M14 15v5"/>',
    track: '<path d="M5 20c2-3 1-6 3-9s4-4 6-7"/><circle cx="16" cy="17" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="6.5" cy="6" r="1.6"/>',
    hospital: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
    market: '<path d="M12 3v18M5 21h14"/><path d="M4 8h16"/><path d="M5 8l-3 6a3 3 0 006 0zM19 8l-3 6a3 3 0 006 0z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    scroll: '<path d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2z"/><path d="M6 4a2 2 0 00-2 2v2h2M10 9h6M10 13h6M10 17h3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    palette: '<path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.5-1-1.5-1-3s1-2 2.5-2h2A4 4 0 0021 11c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    moon: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.5"/><circle cx="14.5" cy="14" r="1"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9C10 5 6.5 5.5 7.5 8 8 9 12 9 12 9zM12 9c2-4 5.5-3.5 4.5-1C16 9 12 9 12 9z"/>'
  };

  var sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    Object.keys(P).map(function (k) {
      return '<symbol id="bw-i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + P[k] + '</symbol>';
    }).join('') + '</svg>';

  function inject() {
    if (document.getElementById('bw-icon-sprite')) return;
    var holder = document.createElement('div');
    holder.id = 'bw-icon-sprite';
    holder.innerHTML = sprite;
    document.body.insertBefore(holder, document.body.firstChild);
  }

  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);

  window.BWIcons = {
    names: Object.keys(P),
    svg: function (name, extraClass) {
      return '<svg class="bw-icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"><use href="#bw-i-' + name + '"/></svg>';
    }
  };
})();
