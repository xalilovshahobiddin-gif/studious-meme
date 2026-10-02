# Blue Wolf — dizayn hujjatlari

| Fayl | Nima |
|---|---|
| `blue_wolf_GDD.md` | Oʻyin dizayni: formulalar, jadvallar, MVP doirasi |
| `blue_wolf_texnik_spec.md` | Texnik spetsifikatsiya: ekranlar, bildirishnomalar, server mantiqi, cron |
| `blue_wolf_api.md` | API (70 endpoint, MVP — 39) |
| `blue_wolf_schema.sql` | MySQL 8.0 sxemasi (32 jadval) |
| `blue_wolf_darajalar.xlsx` | Balans jadvali; **kiritish — `Sozlamalar` varagʻi** |
| `blue_wolf_game_config.sql` | `game_config` qiymatlari — **avtomatik yaratiladi** |
| `tools/blue_wolf_config.py` | `Sozlamalar` → SQL + balans tekshiruvlari |
| `blue_wolf_tahlil.md` | Asl hujjatlar tahlili va tuzatishlar holati |

## Balansni oʻzgartirish

```bash
pip install openpyxl
# blue_wolf_darajalar.xlsx → Sozlamalar varagʻida qiymatni oʻzgartiring, keyin:
python3 tools/blue_wolf_config.py        # SQL ni yangilaydi va tekshiradi
python3 tools/blue_wolf_config.py --check
```

## Bazaga yuklash

```bash
mysql -u root < blue_wolf_schema.sql
mysql -u root < blue_wolf_game_config.sql
```
