#!/usr/bin/env python3
"""blue_wolf_darajalar.xlsx (Darajalar varagʻi) → data/levels.php

Ishlatish: python3 tools/xlsx_to_levels.py path/to/blue_wolf_darajalar.xlsx
Kuch/tezlik modifikatorlari qoʻlda sozlangani uchun daraja jadvali formula
emas, maʼlumot sifatida saqlanadi.
"""
import sys, openpyxl

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = wb['Darajalar']
rows = []
for r in ws.iter_rows(min_row=1, values_only=True):
    if isinstance(r[0], int) and 1 <= r[0] <= 25:
        rows.append(r)

def q(s): return "'" + str(s).replace("\\", "\\\\").replace("'", "\\'") + "'"

out = ["<?php", "// AVTOMATIK YARATILGAN: tools/xlsx_to_levels.py — qoʻlda tahrirlamang.",
       "// Manba: blue_wolf_darajalar.xlsx → Darajalar varagʻi", "return ["]
for r in rows:
    (lvl, name, sci, cls, weight, cls_k, pmod, smod, xp_cost, xp_total,
     power, speed, hp, cp, army, stage) = r[:16]
    out.append(f"  {lvl} => ['name' => {q(name)}, 'sci' => {q(sci)}, 'class' => {q(cls)}, "
               f"'weight' => {weight or 0}, 'xp_cost' => {int(xp_cost)}, 'xp_total' => {int(xp_total)}, "
               f"'power' => {int(power)}, 'speed' => {int(speed)}, 'hp' => {int(hp)}, 'cp' => {int(cp)}, "
               f"'army' => {int(army)}, 'stage' => {stage}],")
out.append("];")
open('data/levels.php', 'w').write("\n".join(out) + "\n")
print(len(rows), "daraja yozildi")
