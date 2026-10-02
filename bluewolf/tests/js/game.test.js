// Klientdagi formulalar GDD va Excel qiymatlariga mosligini tekshiradi.
// Ishga tushirish: node tests/js/game.test.js
const assert = require("node:assert/strict");
const path = require("node:path");
const G = require(path.join(__dirname, "../../public/js/game.js"));
const cfg = require(path.join(__dirname, "../../public/data/game_config.json"));

let passed = 0;
function test(name, fn) { fn(); passed++; console.log("✓", name); }

test("daraja narxi va jami XP (GDD bo'lim 1)", () => {
  assert.equal(G.levelCost(cfg, 2), 30);
  assert.equal(G.levelCost(cfg, 5), 150);
  assert.equal(G.levelCost(cfg, 11), 1450);
  assert.equal(G.levelCost(cfg, 25), 164900);
  assert.equal(G.totalXp(cfg, 4), 130);
  assert.equal(G.totalXp(cfg, 25), 592680);
});

test("XP progress", () => {
  const p = G.xpProgress(cfg, 5, 412);
  assert.equal(p.into, 132);
  assert.equal(p.need, 200);
});

test("bino narxi va vaqti (Excel Binolar varagʻi)", () => {
  assert.deepEqual(G.buildingCost(cfg, "workshop", 5), { stone: 231, wood: 154, bone: 62 });
  assert.deepEqual(G.buildingCost(cfg, "food_cave", 2), { stone: 40, wood: 24 });
  assert.deepEqual(G.buildingCost(cfg, "den", 5), {});
  assert.deepEqual(G.buildingCost(cfg, "market", 1), {});
  const bg = G.buildingCost(cfg, "battle_ground", 25);
  assert.equal(bg.stone + bg.bone + bg.hide, 153445); // GDD bo'lim 5 jadvali
  assert.equal(Math.round(G.buildingTime(cfg, "food_cave", 25) / 6) / 10, 35.3);
});

test("tier: 1-tier har doim ochiq (GDD bo'lim 6)", () => {
  assert.equal(G.maxTier(cfg, 1, 1), 1);
  assert.equal(G.maxTier(cfg, 8, 8), 2);
  assert.equal(G.maxTier(cfg, 8, 4), 1);
  assert.equal(G.maxTier(cfg, 25, 25), 6);
});

test("qoʻshin va ov (GDD bo'lim 4)", () => {
  assert.equal(G.armyCap(cfg, 3), 1);
  assert.equal(G.armyCap(cfg, 4), 10);
  assert.equal(G.armyCap(cfg, 25), 460);
  assert.ok(Math.abs(G.hunterYield(cfg, 10, 1) - 7.5) < 1e-9);
  assert.ok(Math.abs(G.hunterYield(cfg, 25, 1) - 15) < 1e-9);
});

console.log(`\n${passed} ta test oʻtdi`);
