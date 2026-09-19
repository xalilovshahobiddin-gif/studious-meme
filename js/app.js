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

  function getPlayerName() {
    var user = getUser();
    return user && user.first_name ? user.first_name : "Mehmon";
  }

  function buildLeaderboard() {
    var stats = window.BlueWolfGame ? window.BlueWolfGame.getStats() : { highScore: 0 };
    var entries = DEMO_LEADERBOARD.map(function (p) {
      return { name: p.name, score: p.score, isMe: false };
    });

    if (stats.highScore > 0) {
      entries.push({ name: getPlayerName(), score: stats.highScore, isMe: true });
    }

    entries.sort(function (a, b) { return b.score - a.score; });
    return entries;
  }

  function renderLeaderboard() {
    var entries = buildLeaderboard();
    var top3 = entries.slice(0, 3);
    var rest = entries.slice(3);
    var medals = ["🥇", "🥈", "🥉"];

    var podium = document.getElementById("podium");
    podium.innerHTML = top3.map(function (p, i) {
      return (
        '<div class="podium-card rank-' + (i + 1) + (p.isMe ? " me" : "") + '">' +
          '<span class="podium-medal">' + medals[i] + "</span>" +
          '<span class="podium-avatar">' + initials(p.name) + "</span>" +
          '<span class="podium-name">' + p.name + (p.isMe ? " (Siz)" : "") + "</span>" +
          '<span class="podium-score">' + Math.floor(p.score).toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");

    var list = document.getElementById("leaderboardList");
    list.innerHTML = rest.map(function (p, i) {
      var rank = i + 4;
      return (
        '<div class="list-item' + (p.isMe ? " me" : "") + '">' +
          '<span class="lb-rank">#' + rank + "</span>" +
          '<span class="lb-avatar">' + initials(p.name) + "</span>" +
          '<div class="list-item-body">' +
            '<span class="list-item-title">' + p.name + (p.isMe ? " (Siz)" : "") + "</span>" +
          "</div>" +
          '<span class="lb-score">' + Math.floor(p.score).toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function renderStats() {
    if (!window.BlueWolfGame) return;
    var stats = window.BlueWolfGame.getStats();
    var coins = stats.coins || 0;
    var level = 1 + Math.floor(coins / 100);

    document.getElementById("profileLevel").textContent = level;
    document.getElementById("profileCoins").textContent = coins;
    document.getElementById("profileGames").textContent = stats.gamesPlayed || 0;
  }

  function renderResources() {
    if (!window.BlueWolfGame) return;
    var coins = window.BlueWolfGame.getStats().coins || 0;

    document.getElementById("resWheat").textContent = 120 + coins * 3;
    document.getElementById("resWood").textContent = 80 + coins * 2;
    document.getElementById("resStone").textContent = 40 + coins;
    document.getElementById("resGems").textContent = coins;
  }

  function switchScreen(name) {
    document.querySelectorAll(".screen").forEach(function (el) {
      el.classList.toggle("active", el.id === "screen-" + name);
    });
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.screen === name);
    });
    var isGame = name === "game";
    document.querySelector(".topbar").classList.toggle("hidden", isGame);
    document.querySelector(".bottom-nav").classList.toggle("hidden", isGame);
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

  function openGame() {
    switchScreen("game");
    document.getElementById("gameOverOverlay").classList.add("hidden");
    document.getElementById("gameStartOverlay").classList.remove("hidden");
    document.getElementById("gameScoreLive").textContent = "0";
    document.getElementById("gameCoinsLive").textContent = "0";
    if (tg && tg.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(closeGame);
    }
    window.BlueWolfGame.start();
  }

  function closeGame() {
    window.BlueWolfGame.destroy();
    if (tg && tg.BackButton) {
      tg.BackButton.offClick(closeGame);
      tg.BackButton.hide();
    }
    switchScreen("home");
    renderStats();
    renderResources();
    renderLeaderboard();
  }

  function initGameScreen() {
    document.getElementById("playBtn").addEventListener("click", function () {
      haptic("medium");
      openGame();
    });

    document.getElementById("gameStartBtn").addEventListener("click", function () {
      haptic("light");
      document.getElementById("gameStartOverlay").classList.add("hidden");
      window.BlueWolfGame.beginRun();
    });

    document.getElementById("gameRestartBtn").addEventListener("click", function () {
      haptic("light");
      document.getElementById("gameOverOverlay").classList.add("hidden");
      window.BlueWolfGame.beginRun();
    });

    document.getElementById("gameBackBtn").addEventListener("click", function () {
      haptic("light");
      closeGame();
    });

    document.getElementById("gameHomeBtn").addEventListener("click", function () {
      haptic("light");
      closeGame();
    });

    window.addEventListener("bluewolf:gameover", function (evt) {
      haptic("heavy");
      var detail = evt.detail || {};
      document.getElementById("finalScore").textContent = detail.score || 0;
      document.getElementById("finalCoins").textContent = detail.coins || 0;
      document.getElementById("bestScoreLine").textContent = detail.isNewBest
        ? "🎉 Yangi rekord!"
        : "Rekord: " + (detail.highScore || 0);
      document.getElementById("gameOverOverlay").classList.remove("hidden");
    });
  }

  function initLandscape() {
    document.querySelectorAll(".plot-empty, .plot-locked").forEach(function (plot) {
      plot.addEventListener("click", function () {
        haptic("light");
        var message = plot.classList.contains("plot-locked")
          ? "Bu hudud hali qulflangan — keyinroq ochiladi."
          : "Qurilish tez orada ochiladi...";
        if (tg && tg.showAlert) {
          tg.showAlert(message);
        } else {
          alert(message);
        }
      });
    });
  }

  function initActions() {
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
    renderStats();
    renderResources();
    renderLeaderboard();
    initNav();
    initActions();
    initGameScreen();
    initLandscape();
  });
})();
