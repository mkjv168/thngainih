# Thngai Nih / ថ្ងៃនេះ

A mobile-first, static Khmer daily card and five-question dish quiz. No account, sign-up or ads. Runtime assets live in `site/`, offline build tools in `tools/`, and tests in `tests/`. Nothing requires a server-side database.

## Local build and slug

Change slug: edit **only `tools/site.json`**, then run:

```sh
python3 tools/build.py && python3 tools/build_daily.py
bash tests/run.sh
```

`build.py` generates `site/js/config.js`, the manifest scope/start URL, home/quiz/404/privacy HTML, eight result pages and their cards. `build_daily.py` generates the rolling daily window. Edit HTML sources in `tools/templates/`; generated HTML may contain Khmer. `tools/siteconfig.py` derives the default Pages base URL from `origin` + `slug`. Pages-host overrides also use that slug; an explicit `SITE_URL` supports a local server or custom domain base. Workflows call these same build tools, with no separate slug setting. Canonical/OG URLs use that base; browser links and service-worker registration resolve relative to the installed site, including a Pages subpath. Do not hand-edit generated config or hard-code a Pages path.

Pillow with RAQM, HarfBuzz and FriBidi is required for shaped 1200×630 Khmer PNG cards. Builds fail without RAQM. Fonts are bundled under `tools/fonts/`; runtime fonts are in `site/assets/fonts/`. Node runs the same calendar code used by the browser. `tools/serve.sh` provides local preview when desired. Building and `tests/run.sh` are offline; do not run scrape, uptime, feed fetching or deployment workflows during offline work.

## Single translation source

All authored Khmer strings live in **`site/i18n/km.json`**, including UI, privacy, quiz copy, holiday names/notes, weekday colours, lunar months/phases, weekdays, solar months, animal years and calendar formatting. English lives in `site/i18n/en.json`; both files have matching keys. JSON data refers to translation keys. Templates resolve `{{km:key}}` at build time; runtime UI uses the same dictionaries. `locale.js` loads those dictionaries in both the browser and Node, without an extra calendar translation file.

The 14 lunar month names initially follow MomentKH, with **កត្តិក** corrected (not កត្ដិក). Edit `lunar.month.11` to change it; display helpers override vendor strings. Pathamasath and Tutiyasath are separate translation keys. Vendor MomentKH is exempt from the embedded-Khmer check. `validate.py` fails on Khmer in authored code/data/templates, with exceptions for dictionaries, vendor and explicitly generated HTML/result/day output.

## Quiz

The phase 2 content contains amok, lok-lak, num-banh-chok, kuy-teav, samlor-korko, bai-sach-chrouk, kralan and prahok-ktis. The generic engine accepts translation keys or inline language objects and supports legacy ordered ties plus `latest-answer` with a fallback order. Ties are narrowed by answer scores from newest to oldest, then fallback order. Every result is reachable. Result names, blurbs, facts, share lines, CTA and daily-card bridge use dictionary keys. Each result links home and carries its incoming source tag; shares link directly to the result and preserve the comparison ID.

Editorial status: all Khmer needs native review (see km_review below). Kralan's EN/KM blurb is Marketer's final copy, used verbatim.

## Calendar and data sources

Thngai Sil is the 8th and 15th waxing day, the 8th waning day and **the last waning day**, which is 14 in a 29-day month or 15 in a 30-day month. The code detects the next day's transition to 1 waxing. Sources supplied in the local research:

- [Cambodia Handbook: Khmer calendar](https://cambodiahandbook.com/khmer-calendar/)
- [Sila day and eight precepts](https://www.sam-inspire.com/sila-day-8-precepts-in-khmer-english/)
- [Khmer Calendar holy-day guide](https://khmer-calendar.com/en/guides/buddhist-holy-days)

`site/data/holidays.json` schemaVersion 2 contains **28 official dated entries** spanning the remaining 2026 holidays and 2027, from Sub-Decrees **167/198 ANKr.BK**. Source links and legal basis are retained in its metadata/entries. Consecutive days with the same base holiday name form one countdown, targeting the first day. Optional holiday notes are translated and shown, including the 2026 Water Festival suspension of Phnom Penh riverside celebrations. Holiday dates are official; **Khmer name unverified** is an editorial/data hint only. Review 2028 dates when the next sub-decree arrives (around September 2027).

- [2026 Sub-Decree 167 PDF](https://nis.gov.kh/wp-content/uploads/2026/04/Sub-Decree-167-Public-Holiday-2026.pdf)
- [2027 Sub-Decree publication](https://commerce-cambodia.com/2026/10/06/sub-decree-on-public-holiday-for-civil-servants-workers-and-employees-for-2027-kh-en/)
- [AKP Water Festival notice](https://www.akp.gov.kh/post/detail/374510)

The label is **Traditional weekday colour / ពណ៌ប្រចាំថ្ងៃតាមប្រពៃណី**. Values follow `/home/box/research/24h-data/rules.json` and `thngai-sil-and-colours.md`: red, yellow-orange, purple, olive green, green, blue, dark purple (plum). Saturday mentions black/indigo/dark brown alternatives. Wednesday and some colour spellings still need native review. This is the traditional dress convention; khmer-calendar.com astrology colours are a different system and are informational in comparison tests.

Research sources:

- [Khmer Wikipedia: weekday colours](https://km.wikipedia.org/wiki/ពណ៌តាមថ្ងៃ)
- [Khmer Wikipedia: traditional weekday clothing](https://km.wikipedia.org/wiki/សំលៀកបំពាក់ខ្មែរ_តំណាងថ្ងៃ)
- [Khmer Nokor](https://www.khmernokor.com/question-answers/5a0472efb1203)
- [Cambolist](https://www.cambolist.com/detail/N3qUJK9M)
- [The Better Cambodia: seven traditional colours](https://thebettercambodia.com/the-seven-colors-of-cambodian-tradition/)

## Privacy and analytics

`site/privacy/index.html` has the same bilingual toggle as the rest of the site and is precached. Home, quiz, result and daily pages link to it. There are no cookies or accounts; we store no IP addresses or personal data. Language preference stays in local storage on the device. Calendar and holiday lookup happen on the device.

Generated analytics configuration defaults to `provider: 'none'` until deployment. The GoatCounter code is left empty until deploy (planned code: `thngainih`). If enabled, GoatCounter counts page views and named events (`quiz_started`, `quiz_finished`, `share_tapped`, plus daily-card/install interactions) without cookies. GoatCounter computes a short-lived hash of IP + User-Agent for unique visitors and does not store IP addresses: [provider privacy details](https://www.goatcounter.com/help/privacy). DNT/GPC and local-host protections remain enabled.

`?s=` records only the channel a link came from. The existing `src`, `utm_source`, and `ref` aliases are supported; internal navigation carries the normalized source, and share URLs set `share`. No personal values belong in source tags.

## Offline tests and byte budget

`bash tests/run.sh` runs all `*.test.mjs` files and `tools/validate.py`. Checks cover the 2026–2028 Sil rule, the holy-day window, every JSON fixture under `tests/fixtures/khmer-calendar-com/`, generic latest-answer ties, all eight reachable results, holiday grouping/notes, dictionary keys, corrected month display, result/day metadata, 1200×630 PNGs, privacy links/precache, JSON and embedded Khmer. Fixture output reports field counts separately per file. Month aliases include Mikh/Migasir, Jais/Jesth, Srapon/Srap and Asadh/Asath/Pathamasath/Tutiyasath. All fixtures present are tested, including leap-month and 2027 New Year fixtures. Daily animal-year labels use the whole civil New Year date, independently of the Buddhist-year rollover, avoiding a vendor double increment on the Visakha boundary.

The initial source-asset ceiling is **190,000 bytes** (previously 170,000); the **6,000-byte** quiz-engine ceiling is unchanged. The check now includes both translation dictionaries and the Khmer font, which the previous accounting omitted. Centralized bilingual content is loaded by the shared browser/Node calendar helpers, and the Khmer font is used on the initial bilingual card, so including them gives a more honest budget. The expanded asset total stays below 190 KB. Service worker cache version is bumped for this release. Add new runtime modules to the precache list when introducing them.

## km_review (native Khmer check needed)
- **Machine-translated, unverified:** `quiz.r.*.fact` for all 8 dishes in `site/i18n/km.json` (amok, lok-lak, num-banh-chok, kuy-teav, samlor-korko, bai-sach-chrouk, kralan, prahok-ktis). I translated them from the English facts and added no new claims. Also listed in `tools/km_review.json`.
- **Verbatim from Marketer's launch kit (still marked [needs native check] there):** all quiz/UI Khmer, including `quiz.r.kralan.blurb`.
- **Holiday names:** `km_verified=false` (Research Bot).
