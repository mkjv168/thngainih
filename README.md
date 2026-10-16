# Seed

A reusable, mobile-first English/Khmer static starter. Serve `site/` directly:
plain HTML, CSS, and JavaScript, with no build step or runtime npm dependencies.
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
static checks still run first. Service workers register on localhost and secure origins;
opening files directly is not supported because modules/fetch need HTTP.
The English hero remains usable without JavaScript.

Python tools use the standard library except `make_images.py`, which requires
Pillow on the authoring machine. The generator defaults to Inter and Kantumruy
TTF paths documented in its `--help`; use `--font-en` and `--font-km` for other
TTF/OTF locations. WOFF2 is for the browser, not this generator. Khmer uses RAQM
when available; a warning is printed with BASIC layout because shaping can differ.

## Analytics

Sign up at [GoatCounter](https://www.goatcounter.com/), then set
`provider: 'goatcounter'` and your `goatcounterCode` in `site/js/config.js`.
Default is `none`. No script loads with an empty code, on localhost/127.0.0.1,
on file URLs, or with GPC. DNT is respected unless `respectDNT` is explicitly
false. Set `debug` to log suppressed calls locally. Do not put personal data in events.

Pageviews feed GoatCounter's visitor counts; unique visitors are derived from
pageviews. Custom events appear as `evt-*` paths flagged as events, not extra
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
All JavaScript including the worker must stay below 10,000 bytes. Checks use
uncompressed file sizes, so the budget is conservative. Only Inter is preloaded;
Khmer is not preloaded; the offline worker caches both fonts after registration. Share art and icons are outside the initial-page budget.
The worker is versioned `v1`: cache-first shell, network-first `data/content.json`
with cached fallback. Offline content is available after a successful content fetch.
Browser UI and live GoatCounter integration require manual verification before publishing.

## Font licenses

Inter and Kantumruy Pro are SIL OFL 1.1 fonts; see `LICENSE-fonts.txt` and the
upstream notices linked there. Font licensing does not license this starter's
code. Choose a code license before redistributing a fork.
