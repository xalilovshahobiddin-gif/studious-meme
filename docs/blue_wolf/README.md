# Blue Wolf — dizayn hujjatlari

| Fayl | Nima |
|---|---|
| `blue_wolf_GDD.md` | Oʻyin dizayni: formulalar, jadvallar, MVP doirasi |
| `blue_wolf_texnik_spec.md` | Texnik spetsifikatsiya: ekranlar, bildirishnomalar, server mantiqi, cron |
| `blue_wolf_api.md` | API (68 endpoint, MVP — 37) |
| `blue_wolf_schema.sql` | MySQL 8.0 sxemasi (30 jadval) |
| `blue_wolf_darajalar.xlsx` | Balans jadvali (formulalar bilan); **kiritish — `Sozlamalar` varagʻi** |
| `blue_wolf_game_config.sql` | `game_config` qiymatlari — **avtomatik yaratiladi** |
| `tools/blue_wolf_config.py` | `Sozlamalar` → SQL, `bluewolf/` ilovasi uchun JSON (seeder va demo) + balans tekshiruvlari |
| `blue_wolf_tahlil.md` | Asl hujjatlar tahlili va tuzatishlar holati |

## Balansni oʻzgartirish

1. `blue_wolf_darajalar.xlsx` ni Excel, LibreOffice yoki Google Sheets da oching.
2. `Sozlamalar` varagʻida **koʻk** qiymatni oʻzgartiring. Har bir parametr nomlangan katak (masalan `xp_base`, `prod_growth`) — boshqa varaqlardagi barcha jadvallar formulalar orqali darhol qayta hisoblanadi. Boshqa varaqlardagi koʻk kataklar (boʻri modifikatorlari, oʻlja vazni, rol statlari, `Profil!B5` …) ham kiritish.
3. Faylni saqlang va SQL ni yangilang:

```bash
pip install openpyxl
python3 tools/blue_wolf_config.py          # blue_wolf_game_config.sql ni yangilaydi va balansni tekshiradi
python3 tools/blue_wolf_config.py --check  # faqat tekshiradi
```

`Sozlamalar` ga yangi qator qoʻshsangiz, uni `tools/blue_wolf_config.py` dagi `KEYS` ga ham qoʻshing va katakka shu nom bilan Excel nomi (Formulas → Name Manager) bering.

## Bazaga yuklash

```bash
mysql -u root < blue_wolf_schema.sql
mysql -u root < blue_wolf_game_config.sql
```
