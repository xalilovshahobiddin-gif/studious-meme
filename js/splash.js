(function () {
  "use strict";

  var DURATION = 10000;
  var MESSAGES = [
    "Qurol-yarog' tekshirilmoqda...",
    "Qalqon jangga sozlanmoqda...",
    "Dushman kuchlari aniqlanmoqda...",
    "Bo'ri instinktlari faollashmoqda...",
    "Jang maydoni tayyorlanmoqda...",
    "Kuch-g'ayrat to'planmoqda...",
    "Jangga otlanish!"
  ];

  function start() {
    var splash = document.getElementById("splashScreen");
    var fill = document.getElementById("splashProgressFill");
    var pct = document.getElementById("splashProgressPct");
    var msg = document.getElementById("splashMessage");
    if (!splash || !fill || !pct || !msg) return;

    var startTime = null;
    var msgIndex = 0;
    var msgSwitchAt = DURATION / MESSAGES.length;
    var nextMsgTime = msgSwitchAt;
    msg.textContent = MESSAGES[0];

    function tick(now) {
      if (startTime === null) startTime = now;
      var elapsed = now - startTime;
      var progress = Math.min(1, elapsed / DURATION);

      fill.style.width = (progress * 100) + "%";
      pct.textContent = Math.floor(progress * 100) + "%";

      if (elapsed >= nextMsgTime && msgIndex < MESSAGES.length - 1) {
        msgIndex += 1;
        nextMsgTime += msgSwitchAt;
        msg.classList.add("flicker-out");
        setTimeout(function () {
          msg.textContent = MESSAGES[msgIndex];
          msg.classList.remove("flicker-out");
        }, 150);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        finish();
      }
    }

    function finish() {
      splash.classList.add("splash-done");
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 650);
    }

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
