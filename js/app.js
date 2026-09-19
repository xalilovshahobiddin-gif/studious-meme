(function () {
  "use strict";

  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  var DEMO_LEADERBOARD = [
    { name: "Sherzod", score: 12480 },
    { name: "Nilufar", score: 10930 },
    { name: "Javlon", score: 9870 },
    { name: "Madina", score: 8420 },
    { name: "Otabek", score: 7650 },
    { name: "Dilnoza", score: 6980 },
    { name: "Bekzod", score: 6110 },
    { name: "Kamola", score: 5340 }
  ];

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    var first = parts[0] ? parts[0][0] : "";
    var second = parts[1] ? parts[1][0] : "";
    return (first + second).toUpperCase() || "?";
  }

  function setAvatar(imgEl, fallbackEl, photoUrl, name) {
    fallbackEl.textContent = initials(name);
    if (photoUrl) {
      imgEl.src = photoUrl;
      imgEl.onload = function () {
        imgEl.classList.add("show");
        fallbackEl.classList.remove("show");
      };
      imgEl.onerror = function () {
        imgEl.classList.remove("show");
        fallbackEl.classList.add("show");
      };
    } else {
      fallbackEl.classList.add("show");
    }
  }

  function haptic(style) {
    if (tg && tg.HapticFeedback) {
      try { tg.HapticFeedback.impactOccurred(style || "light"); } catch (e) { /* no-op */ }
    }
  }

  function getUser() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      return tg.initDataUnsafe.user;
    }
    return null;
  }

  function applyUser() {
    var user = getUser();
    var displayName = user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ")
      : "Mehmon";
    var photo = user ? user.photo_url : null;

    document.getElementById("homeUserName").textContent = user ? user.first_name : "mehmon";
    document.getElementById("profileName").textContent = displayName || "Mehmon";
    document.getElementById("profileUsername").textContent = user && user.username ? "@" + user.username : "Telegramdan tashqarida ochilgan";

    setAvatar(
      document.getElementById("userAvatar"),
      document.getElementById("userAvatarFallback"),
      photo,
      displayName
    );
    setAvatar(
      document.getElementById("profileAvatar"),
      document.getElementById("profileAvatarFallback"),
      photo,
      displayName
    );

    var debugEl = document.getElementById("appDebug");
    debugEl.textContent = tg
      ? "Blue Wolf • Telegram WebApp v" + (tg.version || "?") + " • " + (tg.platform || "web")
      : "Blue Wolf • brauzerda demo rejim (Telegram tashqarisida)";
  }

  function renderLeaderboard() {
    var top3 = DEMO_LEADERBOARD.slice(0, 3);
    var rest = DEMO_LEADERBOARD.slice(3);
    var medals = ["🥇", "🥈", "🥉"];

    var podium = document.getElementById("podium");
    podium.innerHTML = top3.map(function (p, i) {
      return (
        '<div class="podium-card rank-' + (i + 1) + '">' +
          '<span class="podium-medal">' + medals[i] + "</span>" +
          '<span class="podium-avatar">' + initials(p.name) + "</span>" +
          '<span class="podium-name">' + p.name + "</span>" +
          '<span class="podium-score">' + p.score.toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");

    var list = document.getElementById("leaderboardList");
    list.innerHTML = rest.map(function (p, i) {
      var rank = i + 4;
      return (
        '<div class="list-item">' +
          '<span class="lb-rank">#' + rank + "</span>" +
          '<span class="lb-avatar">' + initials(p.name) + "</span>" +
          '<div class="list-item-body">' +
            '<span class="list-item-title">' + p.name + "</span>" +
          "</div>" +
          '<span class="lb-score">' + p.score.toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function switchScreen(name) {
    document.querySelectorAll(".screen").forEach(function (el) {
      el.classList.toggle("active", el.id === "screen-" + name);
    });
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.screen === name);
    });
    window.scrollTo(0, 0);
  }

  function initNav() {
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        haptic("light");
        switchScreen(btn.dataset.screen);
      });
    });
  }

  function initActions() {
    document.getElementById("playBtn").addEventListener("click", function () {
      haptic("medium");
      if (tg && tg.showAlert) {
        tg.showAlert("O'yin mexanikasi hali qo'shilmagan — bu Blue Wolf UI shabloni.");
      } else {
        alert("O'yin mexanikasi hali qo'shilmagan — bu Blue Wolf UI shabloni.");
      }
    });

    document.getElementById("shareBtn").addEventListener("click", function () {
      haptic("light");
      if (tg && tg.openTelegramLink) {
        var url = "https://t.me/share/url?url=" + encodeURIComponent(location.href) +
          "&text=" + encodeURIComponent("Blue Wolf mini-ilovasini sinab ko'r!");
        tg.openTelegramLink(url);
      } else if (navigator.share) {
        navigator.share({ title: "Blue Wolf", text: "Blue Wolf mini-ilovasini sinab ko'r!", url: location.href });
      }
    });
  }

  function initTelegram() {
    if (!tg) return;
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor("secondary_bg_color");
      tg.setBackgroundColor("bg_color");
    } catch (e) { /* older client versions may not support this */ }
    tg.MainButton.hide();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTelegram();
    applyUser();
    renderLeaderboard();
    initNav();
    initActions();
  });
})();
