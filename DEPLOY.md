# Deploying Transweb to a server

Status: **pre-deployment checklist** (2026-11-09). Nothing here has been applied to a server yet.

---

## 1. Where to host

### Vercel: not suitable for this stack
Vercel runs static sites and short-lived serverless functions. Transweb needs things Vercel does not run:

| Transweb component | Needs | Vercel |
|---|---|---|
| API (Laravel Octane / FrankenPHP) | long-running PHP worker process | ✗ no long-running servers, no PHP runtime for Octane |
| `queue` worker | always-on process | ✗ |
| `scheduler` (cron every minute) | always-on process | ✗ (Vercel Cron only calls HTTP endpoints) |
| MySQL 8, Redis | databases | ✗ (only via external marketplace services) |
| SocketCluster (real-time driver tracking) | persistent WebSocket server | ✗ |
| Console (Ember static build) | static files | ✓ |

Only the console could live on Vercel, and splitting it from the API buys nothing here. It adds a second
deploy pipeline and CORS/cookie-domain configuration. **Use one Linux VM (VPS) running the existing
Docker Compose stack.**

### Recommended server
- **Size:** 2 vCPU, **4 GB RAM minimum (8 GB comfortable)**, 60–80 GB **SSD**, Ubuntu 24.04 LTS.
- **Region:** as close to Mozambique as possible. AWS `af-south-1` (Cape Town), Azure *South Africa North*
  (Johannesburg) and Google Cloud `africa-south1` (Johannesburg) all have SA regions (lowest latency from Maputo).
  European providers (Hetzner, DigitalOcean Frankfurt/Amsterdam) are cheaper but add ~150–200 ms per request.
- Add self-hosted OSRM routing later (item 7): roughly +1–2 GB RAM for the Mozambique extract.

---

## 2. Domain and DNS
Pick the domain (e.g. `transweb.co.mz`) and create:

| Record | Points to | Used for |
|---|---|---|
| `app.<domain>` | server IP | Console |
| `api.<domain>` | server IP | API (+ SocketCluster under `/socketcluster/`) |
| SPF / DKIM / DMARC TXT | mail provider | Email delivery |

HTTPS: Caddy (already in the repo: `Caddyfile`, `Caddyfile.console`) obtains Let's Encrypt certificates
automatically.

---

## 3. Configuration audit (current local values → production)

### API: `api/.env` + compose environment
| Setting | Now (local) | Production | Notes |
|---|---|---|---|
| `APP_KEY` | set | **keep the same value** | Encrypted fields/API secrets depend on it. Copy it, never regenerate. |
| `APP_ENV` / `ENVIRONMENT` | `local` / `development` | `production` | |
| `APP_DEBUG` | `true` | **`false`** | debug pages leak secrets |
| `LOG_LEVEL` | `debug` | `warning` | |
| `APP_URL` | `http://localhost:8000` | `https://api.<domain>` | |
| `CONSOLE_HOST`, `FRONTEND_HOSTS` | unset | `app.<domain>` | CORS / links in emails |
| `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` | `localhost` | `.<domain>` / `app.<domain>` | login cookies |
| `SESSION_SECURE_COOKIE` | unset | `true` | |
| `TRANSWEB_CONSOLE_URL` | `http://localhost:4200` | `https://app.<domain>` | logo in emails |
| DB user / password | `root`, **empty password** | dedicated `transweb` user + strong password | also remove `MYSQL_ALLOW_EMPTY_PASSWORD` |
| `REDIS_PASSWORD` | set | keep, Redis not published | |
| `BROADCAST_DRIVER` | `log` in .env (compose overrides to `socketcluster`) | `socketcluster` | put it in .env too |
| `MAIL_*` | Gmail SMTP with a personal address | transactional provider + `noreply@<domain>` | Gmail limits ~500 mails/day and marks bulk mail as spam. Supported: SMTP, `RESEND_KEY`, `SENDGRID_API_KEY`, `MAILGUN_*`, `POSTMARK_TOKEN`. |
| `GOOGLE_MAPS_API_KEY` | set, but **29 characters** | valid key, restricted to your domains/IP | Google keys are normally 39 characters (`AIza…`). Verify the current value; it may be truncated. |
| `IPINFO_API_KEY` | unset | optional | phone-country auto-detect; falls back to MZ |
| `FILESYSTEM_DRIVER` | `local` | `local` on a persistent volume, or S3-compatible | Uploaded photos/POD/documents. If `local`, back up the storage volume too. |
| `AWS_*` | empty | only if using S3 | |
| `FIREBASE_CREDENTIALS` | unset | **required for Android push** to the driver app | service-account JSON from your own Firebase project |
| `APN_KEY_ID`, `APN_TEAM_ID`, `APN_PRIVATE_KEY`, `APN_BUNDLE_ID` | unset | **required for iOS push** | Apple Developer account |
| SMS provider | none | see below | login codes, driver/customer notifications |
| `SMS_AUTH_BYPASS_CODE` | unset | **must stay unset** | |
| `OSRM_HOST` | public demo server | self-hosted OSRM | the demo server is rate-limited and not for production use |
| `SENTRY_LARAVEL_DSN` | unset | recommended | error monitoring |
| `STRIPE_*` | unset | only if you bill through Stripe | |
| `REGISTRY_HOST` | registry.fleetbase.io | keep | extension registry |

**SMS for Mozambique.** The API (core-api in this image) already supports these providers: Twilio, Vonage,
MessageBird, AWS SNS, **SMPP**, CallPro, and a generic **custom HTTP** gateway
(`CUSTOM_HTTP_SMS_ENABLED/URL/METHOD/AUTH_HEADER/AUTH_TOKEN/FROM`). For local delivery and pricing, use a
Mozambican aggregator through custom HTTP, or SMPP directly with Vodacom/Movitel/Tmcel. Your drafts
`CustomHttpSmsService.php` / `SmsService.php` in `OneDrive\Documents\TransWeb` may now be redundant. Compare
them before porting. Register the alphanumeric sender ID `Transweb` with the provider.

### Console: build/runtime
| Setting | Now | Production |
|---|---|---|
| `fleetbase.config.json` → `API_HOST` | `http://localhost:8000` | `https://api.<domain>` |
| `SOCKETCLUSTER_HOST` / `SECURE` / `PORT` | `localhost` / false / 38000 | `api.<domain>` / true / 443 (proxied by Caddy) |
| `OSRM_HOST` | public demo | self-hosted |
| `TRANSWEB_SOURCE_URL` | github.com/fjessen/transweb | unchanged |

### Compose changes for production
- Remove the published MySQL port (`3306:3306`) and SocketCluster's `38000` (proxy it through Caddy instead).
- `SOCKETCLUSTER_OPTIONS: '{"origins":"https://app.<domain>:*"}'`.
- Use the `Caddyfile` front end instead of `httpd` on port 8000; publish only 80/443.
- Keep `name: fleetbase` and the `mysql_data` volume; add a volume for `api/storage/app`.
- Do this in a `docker-compose.prod.yml` override so the local dev setup keeps working.

---

## 4. Migration steps (when the server exists)
1. Server: Ubuntu updates, non-root sudo user, SSH keys only, firewall (22, 80, 443), Docker Engine + Compose.
2. `git clone https://github.com/fjessen/transweb -b transweb` and build the images on the server.
   The images are built locally, not pulled from a registry.
3. Copy `api/.env` (with the **same `APP_KEY`**) and apply the production values above.
4. Start `database` and `cache`, restore the latest dump (TRANSWEB.md §2), copy `api/storage/app`.
5. Start the rest. Then check login, an order, an email, an SMS, and a driver app login.
6. Nightly `mysqldump` + storage backup copied **off the server**, and test a restore once.
7. Point DNS, then confirm HTTPS works.

---

## 5. Decisions / accounts needed from you
- [ ] Hosting provider + region (and who pays/owns the account)
- [ ] Domain name
- [ ] Email provider (and access to the domain's DNS for SPF/DKIM)
- [ ] SMS provider (aggregator or operator SMPP)
- [ ] Google Cloud project for the Maps key (and a valid key)
- [ ] Firebase project (Android push) and Apple Developer account (iOS push / App Store)
- [ ] Whether uploads stay on the server disk or go to S3-compatible storage
