# Seed

A reusable, mobile-first English/Khmer static starter. Serve `site/` directly:
plain HTML, CSS, and JavaScript, with a quiz build step and no runtime npm dependencies.
Includes privacy-friendly optional analytics, offline shell caching, content
refresh automation, share art, install icons, and uptime monitoring.

## Layout

- `site/`: public document root; `assets/fonts/`, `i18n/`, `data/`, `js/`, and `sw.js`.
- `tools/`: local server, static checks, image generator, feed normalizer, uptime checks.
- `.github/workflows/`: future Pages publishing, six-hour refresh, half-hour uptime.

## Fork for a new idea

1. Rename the app and URL in `site/js/config.js` and both `site/i18n/*.json` files.
2. Update static English HTML, description, canonical/OG URLs, manifest, 404 links,
   theme colors and favicon. Replace every `SITE_URL` placeholder with the final
   hostname plus any project path. OG image URLs must be absolute.
3. Run `python3 tools/make_images.py --name 'Your app' --tagline 'Your idea' --tagline-km 'គំនិតរបស់អ្នក' --color '#123d35'`.
4. Edit `site/data/content.json`. Schema: `updated` is an ISO UTC timestamp;
   `items` contains `title`, `title_km`, and `url`. Update the normalizer and
   renderer together when changing the schema. URLs are rendered as links only
   for HTTP(S); data is inserted with `textContent`.
5. Bump `CACHE` in `site/sw.js` after changing cached assets. Close old tabs to
   let a new worker activate; DevTools can unregister workers during development.

## Local development

Run `bash tools/serve.sh`, then open http://localhost:8080. Run
`bash tools/check.sh` for HTTP resource checks, JSON validation, dictionary parity,
and size budgets. Exit 77 means the environment prevented local HTTP serving;
run tools/validate.py for offline checks. Service workers register on localhost and secure origins;
opening files directly is not supported because modules/fetch need HTTP.
Static result pages remain usable without JavaScript.

Python tools use the standard library except `make_images.py`, which requires
Pillow on the authoring machine. The generator defaults to Inter and Kantumruy
TTF paths documented in its `--help`; use `--font-en` and `--font-km` for other
TTF/OTF locations. WOFF2 is for the browser, not this generator. Khmer uses RAQM
when available; a warning is printed with BASIC layout because shaping can differ.

## Analytics

Sign up at [GoatCounter](https://www.goatcounter.com/), then set
`provider: 'goatcounter'` and your `goatcounterCode` in `site/js/config.js`.
Default is `none`. No script loads with an empty code, on localhost/127.0.0.1,
on file URLs, or with GPC. DNT is always respected. Set `debug` to log suppressed calls locally. Do not put personal data in events.

Pageviews feed GoatCounter's visitor counts; unique visitors are derived from
pageviews. Custom events appear as named paths flagged as events, not extra
pageviews. `track('cta_click')`, `track('lang_switch', {to: 'km'})`, and delegated
`data-track="event_name"` clicks are supported. Events queue until the lazy
script loads. Pageview is sent once by the app with automatic onload counting off.

## Publishing (ONLY after sativa approves)

No deployment has been performed. After approval:

1. Placeholder: choose a hosting destination, set final URLs and rerun checks.
2. Placeholder: configure a remote and publish the repository only when authorized.
3. Placeholder: for GitHub Pages, select GitHub Actions as the source, configure
   the `github-pages` environment and required repository permissions, then run
   the Pages workflow. These workflows assume the `main` branch.

The workflows are definitions only locally. Once placed on GitHub, pushes to
`main` affecting `site/**` can deploy automatically; enable them only after approval.

## Scheduled content and uptime

`CONTENT_SOURCE_URL` (repository variable in Actions, environment variable locally)
accepts JSON with an `items` list, a JSON list, RSS, or Atom. Refresh normalizes up
to 100 items; missing Khmer titles fall back to English. Unchanged fetched items
keep their prior timestamp and produce no commit. With no source, deterministic
sample items are written with the current UTC timestamp. Failed fetches leave
existing content untouched and fail the job. Run `python3 tools/refresh_content.py`.

Refresh runs at minute 17 every six hours and commits changed content as
`github-actions[bot]`. Branch protection must permit that bot commit. A token's
push does **not** start other workflows, so a second job explicitly calls the
reusable Pages workflow with the new commit SHA. A keepalive reminder step notes
the inactivity rule; it does not guarantee GitHub considers a bot commit activity.

Uptime runs every 30 minutes. Configure comma-separated `UPTIME_URLS` as a
repository variable, or run `python3 tools/uptime_check.py URL [URL...]`.
`--expected-text 'text'` (or `UPTIME_EXPECTED_TEXT`) adds a body check. Only HTTP
200 passes. Missing URLs fail clearly. JSON results go to stdout, and failure
returns nonzero so Actions marks downtime; notification emails depend on account settings.

GitHub Actions schedules have a minimum interval of five minutes and may be
delayed or dropped under load. They run on the default branch. Public repository
schedules disable after 60 days of no repository activity: monitor and manually
re-enable them when needed. Standard GitHub-hosted runners have unlimited free
minutes in public repositories; private repositories have plan limits. These are
best-effort checks, not a guaranteed monitoring service.

## i18n and accessibility

Use matching keys in both dictionaries. `data-i18n="key"` sets `textContent`;
`data-i18n-attr="aria-label:key"` sets an attribute (semicolon-separated bindings
are supported). Never store markup in translation strings. English is default;
a valid `?lang=km` or `?lang=en` takes precedence over saved `localStorage.lang`.
The toggle updates the root language, title, date formatting, labels and pressed
state, and persists the choice. Content titles use `title_km` with English fallback.
Khmer has its own font range and 1.7 line height. Focus outlines, 44px controls,
a skip link, live status, dark mode, safe-area padding and reduced motion are included.

## Performance and offline behavior

Initial HTML + CSS + all app JS + preloaded Inter font must be <=150,000 bytes.
The quiz module must stay below 6,000 bytes. Checks use
uncompressed file sizes, so the budget is conservative. Only Inter is preloaded;
Khmer is not preloaded; the offline worker caches both fonts after registration. Share art and icons are outside the initial-page budget.
The worker is versioned `v2-quiz`: cache-first shell, network-first `data/content.json`
with cached fallback. Offline content is available after a successful content fetch.
Browser UI and live GoatCounter integration require manual verification before publishing.

## Font licenses

Inter and Kantumruy Pro are SIL OFL 1.1 fonts; see `LICENSE-fonts.txt` and the
upstream notices linked there. Font licensing does not license this starter's
code. Choose a code license before redistributing a fork.

## Quiz module

The default `SITE_CONFIG.module = 'quiz'` is a five-question bilingual example.
Replace example copy before launch. Scores sum across answers; ties use the
`tiebreak` order. Back changes answers, and language changes preserve progress.
Finish waits at most 300ms for counting before navigating; GoatCounter uses its
beacon transport when available. Runtime links derive from module URLs and work
under a Pages project subpath without a base tag.

## Data schema

`site/quiz/quiz.json` has `_note`, `id`, `version`, bilingual `title` and `intro`,
`questions`, `results`, and `tiebreak`. Bilingual values have `en` and `km` keys.
Questions contain `id`, `text`, and `answers`; answers contain `id`, `text`, and
`scores` mapping result IDs to numeric points. Missing scores contribute zero.
Results contain unique URL-safe slug `id`, `emoji`, hex `color`, and bilingual
`name`, `tagline`, `description`. List every result exactly once in `tiebreak`,
highest priority first. Descriptions are marked example copy. The build validates
result slugs, tiebreak, score references, and colors.

## Result pages & OG cards (Khmer shaping requires RAQM)

Install Pillow, then run `python3 tools/build.py`. It reads quiz data,
`tools/site.json`, and `tools/templates/result.html`; writes `site/r/<id>/index.html`,
`og.png`, `site/r/index.json`, and `site/og-image.png`; and rewrites index OG tags
between `<!-- og:start -->` and `<!-- og:end -->`. Keep those markers.
Set the absolute base URL, including project path and trailing slash, in both
`tools/site.json` and `SITE_CONFIG.siteUrl`. Environment `SITE_URL` overrides the
build setting. Builds are deterministic; remove obsolete result directories when
removing result IDs. Generated pages and PNGs may be committed.

The build requires `PIL.features.check('raqm')`; without it Khmer shaping would
break, so it fails instead of using BASIC. Linux needs libraqm, FriBidi, HarfBuzz,
and a RAQM-enabled Pillow. Pages installs these before building with its base URL.
Self-contained TTF fonts and the Noto OFL notice live in `tools/fonts/`; Noto Sans
Khmer supplies Khmer and Latin. Inter licensing is documented in LICENSE-fonts.txt.
Cards use a letter badge rather than unreliable emoji fonts, fitted Khmer text,
and a background darkened for white-text contrast.

Run `python3 tools/preview_cards.py` for `/tmp/cards-preview.png` visual QA.
`bash tools/check.sh` builds for its temporary HTTP server and validates resources;
rerun the build with the intended URL afterward. Where sockets are forbidden, run
build and `python3 tools/validate.py` with matching SITE_URL instead. Validate JS
with `node --input-type=module --check < file.js`. The initial page budget stays
150KB; the quiz module stays below 6KB. The previous 10KB total-JS limit is replaced
by these budgets. The worker version is `v2-quiz` and precaches quiz modules/data.

Result pages remain readable without JS and offer plain Facebook/Telegram links.
JS adds native sharing, mobile Messenger, clipboard fallback, bilingual display,
and friend comparison for a different valid `?vs=`. Desktop Messenger is hidden
because its web dialog needs an app ID. Take the quiz preserves the challenge.

## Source tags (?src=)

Use `fb-own`, `fb-group-<x>`, `tg`, `msgr`, `tiktok`, `rd-webgames`,
`rd-sideproject`, or `share`. Aliases `s`, `utm_source`, and `ref` follow `src`
in precedence. Values are lowercased, restricted to `[a-z0-9_-]`, and truncated
to 40 characters. `getSource()` uses sessionStorage only, never cookies or
localStorage. New query attribution replaces the tab's saved source; untagged
navigation preserves it. Quiz/result navigation explicitly carries source.
Every result share URL targets that result page with `?src=share&vs=<resultId>`.

## Events

`quiz_started`, `quiz_finished`, `share_tapped/<channel>` and pageviews carry
GoatCounter referrer `src:<value>`, or document.referrer if untagged. Channels are
`native`, `facebook`, `messenger`, `telegram`, `copy`. `track(name, {channel})`
emits path `name/channel`, title `name`, event true; without channel the path is
just `name` (replacing the earlier `evt-*` convention). GPC and DNT always block
analytics, overriding the legacy respectDNT setting. Local counting requires
`allowLocal: true`, which sets GoatCounter `allow_local`. Default remains disabled.

In GoatCounter, Paths lists events, Visitors represents unique cookieless sessions,
and Referrers on a path gives source breakdown. Open quiz_finished then Referrers
to compare finishes per source. Use GoatCounter API/CSV export for reporting.
Keep personal data out of source tags. Live delivery and mobile sharing require
browser QA; shared recipients are intentionally attributed to `share`.

## Adding another module (daily game / utility)

Create `site/js/modules/<name>.js` exporting `async function mount(rootEl, ctx)`.
The shell dynamically imports the configured name and supplies
`{t, getLang, onLangChange, track, source}`. Render inside rootEl, use textContent
for data, and subscribe to onLangChange without resetting game progress.
Use lowercase letters, digits, and hyphens for module names. Set SITE_CONFIG.module,
add assets to the worker precache, and bump CACHE. `content` preserves the old
content.json feed renderer and SITE_CONFIG.contentUrl. Card building is quiz-specific;
a daily game or utility can replace that build stage while reusing the shell.
