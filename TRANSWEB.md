# Transweb

Transweb is a distribution of [Fleetbase](https://github.com/fleetbase/fleetbase) (AGPL-3.0) rebranded
and adapted for logistics operators in **Mozambique**. This branch (`transweb`) is based on upstream
**v0.7.63**, matching the API image the installation runs (core-api 1.6.62, fleetops 0.6.68).

See also: [`NOTICE-TRANSWEB.md`](NOTICE-TRANSWEB.md) (licence obligations) and
[`branding/ROADMAP-MOCAMBIQUE.md`](branding/ROADMAP-MOCAMBIQUE.md) (original brand-kit roadmap, PT).

---

## 1. What this branch changes

### Visual identity
| Area | Change | Where |
|---|---|---|
| Logos, icon, favicons, PWA manifest, OG image | Transweb brand kit | `console/public/images`, `console/public/favicon`, `branding/assets` |
| Header / login icon | `icon.png` (navy tile) is the fallback for `<LogoIcon>` | `console/public/images/icon.png` |
| Wordmark on onboarding & invite pages | `<TranswebLogo>`: navy wordmark in light mode, white in dark mode; uploaded logo wins | `console/app/components/transweb-logo.*` |
| Primary UI colour | Fleetbase blue → Transweb teal (`#087D7A`). Tailwind `sky` scale replaced, **and** every built CSS file (ember-ui, engines) is post-processed so hardcoded blues become teal | `console/tailwind.config.js`, `console/scripts/transweb/recolor-css.js` (runs in `console/Dockerfile`) |
| Boot screen | Navy background, teal/amber spinner, "A iniciar…" | `console/app/index.html`, `console/app/styles/console.css` |
| Footer / attribution | "© year Komuniki Corp, Lda. · version · Powered by Fleetbase · Código-fonte · Avisos legais" | `console/app/components/fleetbase-attribution.*` |
| Default logo/icon in API + emails | Served from the console (`TRANSWEB_CONSOLE_URL`), replacing Fleetbase's S3 URLs | `api/config/fleetbase.php` |

### Name
- `app.name` and user-visible strings in all 15 console locales: Fleetbase → Transweb (strings about
  Fleetbase's own hosted services are kept as-is).
- `APP_NAME` / `MAIL_FROM_NAME` = `Transweb` for application, queue and scheduler (emails, SMS codes).
- Hardcoded "Fleetbase" in API emails (invites, password reset, test mail), the SMS login code, admin
  test messages, customer-portal errors and the AI assistant's self-name are patched at image build
  time by `docker/transweb-api/patch-strings.php`. The patch fails the build if upstream wording changes.
- Upstream "Fleetbase Blog" / GitHub dashboard widgets are no longer added to new dashboards (still
  available in the widget panel).

### Mozambique
- **New locale `pt-mz` (Português – Moçambique)** and it is the **default** for users who never chose a
  language. Console strings: `console/translations/pt-mz.yaml` (all 719 keys, 85 hand-translated where
  upstream pt-br was missing/English). Extension engines (Fleet-Ops, Storefront, …) get a generated
  `pt-mz.yaml` during the Docker build. Conversion rules (utilizador, palavra-passe, ecrã, telemóvel,
  definições, equipa, ficheiro, registo, recolha, "A carregar…", actualizar/acção…) live in
  `console/scripts/transweb/make-pt-mz.js`.
- Phone inputs fall back to **+258 (MZ)** instead of the US when IP lookup fails.
- Currency pickers fall back to **MZN** instead of USD.
- `<html lang="pt-MZ">`, Portuguese meta description / OG tags.

### Docker
- `docker-compose.yml` builds two local images:
  - `transweb/transweb-api:local` — upstream API image **pinned by digest** + string patch + branding
    config + the FrankenPHP worker entrypoint (previously an ad-hoc bind mount of
    `api/public/frankenphp-worker.php`, which the base image does not ship).
  - `transweb/transweb-console:local` — the console with all of the above.

---

## 2. Build & run

```bash
docker compose build console application queue scheduler
docker compose up -d
```
Console: http://localhost:4200 · API: http://localhost:8000

### Configuration
Console (build-time env, read in `console/config/environment.js`):

| Variable | Default | Purpose |
|---|---|---|
| `TRANSWEB_DEFAULT_LOCALE` | `pt-mz` | Language for users with no saved preference |
| `TRANSWEB_DEFAULT_COUNTRY` | `MZ` | Phone input fallback country |
| `TRANSWEB_DEFAULT_CURRENCY` | `MZN` | Currency picker fallback |
| `TRANSWEB_DEFAULT_TIMEZONE` | `Africa/Maputo` | Reserved for org defaults |
| `TRANSWEB_COMPANY_NAME` | `Komuniki Corp, Lda.` | Footer copyright holder |
| `TRANSWEB_SOURCE_URL` | upstream Fleetbase repo | **Set to your public Transweb repo** (AGPL §13) |

API (compose environment): `APP_NAME`, `MAIL_FROM_NAME`, `TRANSWEB_CONSOLE_URL` (public console URL, used
for logo/icon in emails), optionally `TRANSWEB_LOGO_URL` / `TRANSWEB_ICON_URL`.

Per-organisation logos can still be uploaded in **Console → Admin → Branding**; uploaded files win over
the defaults everywhere.

### Regenerating brand / locale artefacts
```bash
python branding/build_brand.py                 # logos, favicons (needs fontTools + rsvg)
python branding/tools/build_console_pt_mz.py   # console/translations/pt-mz.yaml (needs PyYAML + node)
```
Edit `console/scripts/transweb/pt-mz.overrides.yaml` for hand translations, then re-run.

---

## 3. Upgrading upstream Fleetbase

1. `git fetch upstream --tags && git merge vX.Y.Z` into `transweb` (conflicts are mostly in
   `console/translations/*.yaml`, `docker-compose.yml`, `console/Dockerfile`).
2. Pick the matching API image digest (`docker pull fleetbase/fleetbase-api:<tag>`) and update
   `BASE_IMAGE` in `docker/transweb-api/Dockerfile`. Console and API versions must move together.
3. `python branding/tools/build_console_pt_mz.py`, then `docker compose build`; the API patch step
   reports any string that changed upstream.
4. Run migrations: `docker compose exec application php artisan mysql:createdb && php artisan migrate --force`
   (check the upstream release notes first). **Back up the database before upgrading.**

Upstream is currently at v0.7.75 (12 releases ahead).

---

## 4. Roadmap for a Mozambique-ready platform

Ordered by impact. ✅ = done in this branch.

### A. Foundation (now)
1. ✅ Brand, pt-MZ, MZ/MZN defaults.
2. **Publish the Transweb source** (GitHub/GitLab) and set `TRANSWEB_SOURCE_URL` — licence requirement
   before giving anyone outside your company access.
3. **Fix the stack's health**: at the time of the rebrand the `queue` container was stopped (exit 137,
   likely OOM-killed) — so emails, SMS, webhooks and notifications were not processing — and
   `scheduler` was unhealthy. Give Docker more memory, restart `queue`, check
   `docker compose logs queue scheduler`.
4. **Production hardening** (the compose file is a dev setup): MySQL password + no published 3306,
   `APP_DEBUG=false`, `ENVIRONMENT=production`, real domain + HTTPS (Caddyfile included),
   `SESSION_DOMAIN`, SocketCluster origins/auth, nightly DB backups tested by restore, move the stack
   out of OneDrive (sync + bind-mounted MySQL data is a corruption risk).

### B. Local infrastructure & data
5. **Self-hosted routing**: OSRM (or Valhalla — the API already ships `valhalla-api`/`vroom-api`) on the
   Geofabrik `mozambique-latest.osm.pbf`; set `OSRM_HOST`. Removes dependence on the public demo server.
6. **Geocoding for informal addresses**: Nominatim on the same extract; order forms with
   *bairro + ponto de referência* + map pin; accept WhatsApp location links.
7. **Service zones**: preload the 10 provinces + Cidade de Maputo, and Maputo/Matola/Beira/Nampula
   bairros as Fleet-Ops zones/service areas; tariffs per zone in MZN (base fee + per-km).
8. Replace Fleetbase S3 default images (`console/config/environment.js → defaultValues`) with local
   assets, including local vehicle types: motorizada, txopela, carrinha, camião, chapa.

### C. Money
9. **Mobile money** via the Ledger extension: M-Pesa (Vodacom), e-Mola (Movitel), mKesh (Tmcel) — confirm
   each operator's merchant API/aggregator terms. Plus **cash on delivery** with driver reconciliation.
10. **Fiscal**: NUIT on customers/companies, IVA (16% standard rate — verify), invoice numbering. Confirm
    Autoridade Tributária rules on certified invoicing software **before** issuing invoices from Transweb.

### D. Communication
11. **Local SMS gateway**: your install folder contains drafts of `CustomHttpSmsService` / `SmsService`
    (core-api); finish and wire a Mozambican aggregator through the custom-HTTP provider, with
    `Transweb` as alphanumeric sender ID (Settings → Notifications).
12. **WhatsApp Business** notifications for order status, with SMS fallback.
13. Translate API-side messages (emails, SMS) to Portuguese — today they are English with the Transweb
    name; this needs per-locale templates in core-api.

### E. Field operations
14. **Driver app** (`navigator-app` in your install folder): rebrand with the same kit, add offline
    queueing / low-data mode, pt-MZ.
15. Proof of delivery: photo + signature + OTP by SMS/WhatsApp; *guia de remessa* document template.
16. Long-haul corridors (Maputo–Beira–Nacala, Beira corridor) as route templates for freight customers.

### F. Platform
17. Upgrade to upstream v0.7.75 (step 3 above) once A is stable.
18. Self-hosted extension registry if you add Transweb-specific extensions (M-Pesa, NUIT, WhatsApp).
