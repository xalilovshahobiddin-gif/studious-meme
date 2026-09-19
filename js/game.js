(function () {
  "use strict";

  var GAME_WIDTH = 360;
  var GAME_HEIGHT = 480;
  var GROUND_Y = GAME_HEIGHT - 46;
  var JUMP_VELOCITY = -680;
  var GRAVITY = 1700;
  var START_SPEED = -240;
  var MAX_SPEED = -460;
  var SPEED_RAMP_PER_SEC = 4;
  var OBSTACLE_EMOJIS = ["🌲", "🪨", "🌵"];
  var COIN_EMOJI = "💠";

  var STORAGE_KEY = "blueWolf.stats.v1";

  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private mode / disabled storage */ }
    return { coins: 0, highScore: 0, gamesPlayed: 0 };
  }

  function saveStats(stats) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  function WolfRunScene() {
    Phaser.Scene.call(this, { key: "WolfRunScene" });
  }
  WolfRunScene.prototype = Object.create(Phaser.Scene.prototype);
  WolfRunScene.prototype.constructor = WolfRunScene;

  WolfRunScene.prototype.create = function () {
    this.running = false;
    this.gameOver = false;
    this.score = 0;
    this.coins = 0;
    this.speed = START_SPEED;
    this.elapsed = 0;
    this.nextObstacleIn = 0;
    this.nextCoinIn = 0;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0f1626).setOrigin(0, 0);
    this.add.rectangle(0, -60, GAME_WIDTH, 160, 0x3b7dff, 0.12).setOrigin(0, 0);

    this.ground = this.add.rectangle(0, GROUND_Y + 20, GAME_WIDTH, 4, 0x2a3a5c).setOrigin(0, 0);
    this.physics.add.existing(this.ground, true);

    this.wolf = this.add.text(56, GROUND_Y - 10, "🐺", { fontSize: "38px" }).setOrigin(0.5, 1);
    this.physics.add.existing(this.wolf);
    this.wolf.body.setGravityY(GRAVITY);
    this.wolf.body.setSize(30, 30, true);
    this.wolf.body.setCollideWorldBounds(false);

    this.physics.add.collider(this.wolf, this.ground);

    this.obstacles = this.physics.add.group();
    this.coinGroup = this.physics.add.group();

    this.physics.add.overlap(this.wolf, this.obstacles, this.handleCrash, null, this);
    this.physics.add.overlap(this.wolf, this.coinGroup, this.handleCoin, null, this);

    this.input.on("pointerdown", this.jump, this);
    this.spaceKey = this.input.keyboard ? this.input.keyboard.addKey("SPACE") : null;
    this.upKey = this.input.keyboard ? this.input.keyboard.addKey("UP") : null;

    this.physics.world.pause();
  };

  WolfRunScene.prototype.jump = function () {
    if (!this.running || this.gameOver) return;
    var onGround = this.wolf.body.blocked.down || this.wolf.body.touching.down;
    if (onGround) {
      this.wolf.body.setVelocityY(JUMP_VELOCITY);
    }
  };

  WolfRunScene.prototype.beginRun = function () {
    this.running = true;
    this.gameOver = false;
    this.score = 0;
    this.coins = 0;
    this.speed = START_SPEED;
    this.elapsed = 0;
    this.nextObstacleIn = 500;
    this.nextCoinIn = 1400;

    this.obstacles.clear(true, true);
    this.coinGroup.clear(true, true);
    this.wolf.setPosition(56, GROUND_Y - 10);
    this.wolf.body.setVelocity(0, 0);

    this.physics.world.resume();
    this.updateHud();
  };

  WolfRunScene.prototype.spawnObstacle = function () {
    var emoji = OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)];
    var obstacle = this.add.text(GAME_WIDTH + 20, GROUND_Y - 6, emoji, { fontSize: "34px" }).setOrigin(0.5, 1);
    this.physics.add.existing(obstacle);
    obstacle.body.setAllowGravity(false);
    obstacle.body.setVelocityX(this.speed);
    obstacle.body.setSize(26, 30, true);
    this.obstacles.add(obstacle);
  };

  WolfRunScene.prototype.spawnCoin = function () {
    var altitude = Math.random() < 0.5 ? GROUND_Y - 10 : GROUND_Y - 90;
    var coin = this.add.text(GAME_WIDTH + 20, altitude, COIN_EMOJI, { fontSize: "26px" }).setOrigin(0.5, 1);
    this.physics.add.existing(coin);
    coin.body.setAllowGravity(false);
    coin.body.setVelocityX(this.speed);
    coin.body.setSize(22, 22, true);
    this.coinGroup.add(coin);
  };

  WolfRunScene.prototype.handleCrash = function () {
    if (this.gameOver) return;
    this.gameOver = true;
    this.running = false;
    this.physics.world.pause();
    this.wolf.setTint(0xff6b6b);

    var stats = loadStats();
    var finalScore = Math.floor(this.score);
    stats.coins = (stats.coins || 0) + this.coins;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    var isNewBest = finalScore > (stats.highScore || 0);
    if (isNewBest) stats.highScore = finalScore;
    saveStats(stats);

    window.dispatchEvent(new CustomEvent("bluewolf:gameover", {
      detail: {
        score: finalScore,
        coins: this.coins,
        totalCoins: stats.coins,
        highScore: stats.highScore,
        gamesPlayed: stats.gamesPlayed,
        isNewBest: isNewBest
      }
    }));
  };

  WolfRunScene.prototype.handleCoin = function (wolf, coin) {
    coin.destroy();
    this.coins += 1;
    this.updateHud();
  };

  WolfRunScene.prototype.updateHud = function () {
    var scoreEl = document.getElementById("gameScoreLive");
    var coinsEl = document.getElementById("gameCoinsLive");
    if (scoreEl) scoreEl.textContent = Math.floor(this.score);
    if (coinsEl) coinsEl.textContent = this.coins;
  };

  WolfRunScene.prototype.update = function (time, delta) {
    if (!this.running || this.gameOver) return;

    this.elapsed += delta;
    this.score += delta * 0.01;
    this.speed = Math.max(MAX_SPEED, START_SPEED - (this.elapsed / 1000) * SPEED_RAMP_PER_SEC * 10);

    this.nextObstacleIn -= delta;
    if (this.nextObstacleIn <= 0) {
      this.spawnObstacle();
      this.nextObstacleIn = Phaser.Math.Between(900, 1600);
    }

    this.nextCoinIn -= delta;
    if (this.nextCoinIn <= 0) {
      this.spawnCoin();
      this.nextCoinIn = Phaser.Math.Between(1300, 2200);
    }

    this.obstacles.getChildren().slice().forEach(function (obstacle) {
      obstacle.body.setVelocityX(this.speed);
      if (obstacle.x < -40) obstacle.destroy();
    }, this);

    this.coinGroup.getChildren().slice().forEach(function (coin) {
      coin.body.setVelocityX(this.speed);
      if (coin.x < -40) coin.destroy();
    }, this);

    if (this.wolf.y > GAME_HEIGHT + 100) {
      this.handleCrash();
    }

    this.updateHud();
  };

  var gameInstance = null;

  function createGame() {
    if (gameInstance) return gameInstance;
    gameInstance = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: "phaserContainer",
      backgroundColor: "#0f1626",
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: WolfRunScene
    });
    return gameInstance;
  }

  function getScene() {
    if (!gameInstance) return null;
    return gameInstance.scene.getScene("WolfRunScene");
  }

  window.BlueWolfGame = {
    start: function () {
      createGame();
    },
    beginRun: function () {
      var scene = getScene();
      if (scene && scene.scene.isActive()) {
        scene.beginRun();
      } else {
        // Scene not ready yet on the very first launch; wait for it.
        setTimeout(function () { window.BlueWolfGame.beginRun(); }, 50);
      }
    },
    destroy: function () {
      if (gameInstance) {
        gameInstance.destroy(true);
        gameInstance = null;
      }
    },
    getStats: loadStats
  };
})();
