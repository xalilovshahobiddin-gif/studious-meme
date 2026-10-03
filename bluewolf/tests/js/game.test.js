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

test("resurs paneli: sigʻim, suv, Ustaxona (GDD bo'lim 5)", () => {
  assert.equal(Math.round(G.caveCap(cfg, 1)), 40);
  assert.equal(Math.round(G.caveCap(cfg, 25)), 4728);
  assert.equal(Math.round(G.caveCap(cfg, 0)), 40); // gʻor yoʻq — 1-daraja sigʻimi
  assert.equal(G.waterPerHour(cfg, 0), 0);
  assert.ok(Math.abs(G.waterPerHour(cfg, 25) - 52.94) < 0.01);
  assert.ok(Math.abs(G.waterNeed(cfg, 10) - 0.76) < 1e-9);
  assert.equal(G.workshopPerHour(cfg, 0), 0);
  assert.equal(Math.round(G.workshopPerHour(cfg, 25)), 2364);
});

test("resurslar maʼlumotnomasi toʻliq", () => {
  assert.equal(G.RESOURCES.length, 9);
  for (const r of G.RESOURCES) {
    assert.ok(["food", "build", "premium"].includes(r.group), r.key);
    assert.ok(r.from.length > 0 && r.use.length > 0, r.key);
  }
});

test("ixcham raqamlar", () => {
  assert.equal(G.fmtShort(950), "950");
  assert.equal(G.fmtShort(12400), "12,4K");
  assert.equal(G.fmtShort(123456), "123K");
  assert.equal(G.fmtShort(1234567), "1,2M");
  assert.equal(G.fmtShort(25000000), "25M");
});

test("resurs hisobi: umumiy holatlar (PHP bilan bir xil)", () => {
  const { cases } = require(path.join(__dirname, "../fixtures/economy_cases.json"));
  for (const c of cases) {
    const out = G.advance(cfg, c.input, c.t1);
    for (const group of ["res", "buf"]) {
      for (const [k, v] of Object.entries(c.expect[group] || {})) {
        assert.ok(Math.abs(out[group][k] - v) < 1e-6, `${c.name}: ${group}.${k} = ${out[group][k]}, kutilgan ${v}`);
      }
    }
    assert.equal(out.last_tick, c.t1);
  }
});

test("bufer yigʻish va taqsimot tekshiruvi", () => {
  const e = { res: { stone: 10, wood: 0, hide: 0, bone: 0 }, buf: { stone: 5.75, wood: 2, hide: 0.4, bone: 0 } };
  const { econ, got } = G.collect(e);
  assert.deepEqual(got, { stone: 5, wood: 2, hide: 0, bone: 0 });
  assert.equal(econ.res.stone, 15);
  assert.ok(Math.abs(econ.buf.stone - 0.75) < 1e-9);
  assert.equal(e.res.stone, 10); // asl nusxa oʻzgarmaydi
  assert.ok(G.validAlloc({ stone: 40, wood: 30, hide: 15, bone: 15 }));
  assert.ok(!G.validAlloc({ stone: 40, wood: 30, hide: 15, bone: 10 }));
  assert.ok(!G.validAlloc({ stone: 40.5, wood: 29.5, hide: 15, bone: 15 }));
  assert.ok(!G.validAlloc({ stone: 110, wood: -10, hide: 0, bone: 0 }));
});

test("askar va ov formulalari (PHP bilan bir xil, GDD bo'lim 4 va 6)", () => {
  const cases = require(path.join(__dirname, "../fixtures/army_cases.json"));
  for (const c of cases.train) {
    assert.deepEqual(G.trainCost(cfg, c.tier), c.cost);
    assert.ok(Math.abs(G.trainSeconds(cfg, c.tier, c.level, c.building, c.army, c.role) - c.seconds) < 1e-5);
  }
  for (const c of cases.hunt) assert.deepEqual(G.huntResult(cfg, c.level, c.payload), c.result);
  assert.deepEqual(G.trainCost(cfg, 1), { meat: 20, bone: 8 });
  assert.equal(G.trainSeconds(cfg, 1, 1, 1, 0, 0), 120); // boʻsh qoʻshin — 0.5× chegirma
  assert.equal(G.huntResult(cfg, 4, { hunter: { 1: 2 } }).meat, 9);
  assert.equal(G.huntResult(cfg, 5, { hunter: { 1: 1 } }).penalty, true); // jayronga kamida 2 boʻri
  assert.equal(G.PREY.length, 26);
  assert.equal(G.WOLVES[25], "Koʻk Boʻri");
});

console.log(`\n${passed} ta test oʻtdi`);
