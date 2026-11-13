# Transweb go-live plan: Google Cloud, keys, costs and pricing

Prepared 2026-11-12. Prices are list prices found on 12 Nov 2026 (sources at the end). Verify with Google's
pricing calculator and each provider before signing up. 1 USD ≈ 64 MZN (Wise/mid-market, Nov 2026).

## 0. Online test with real drivers (no domain, almost no cost)

Decided 2026-11-12: region **africa-south1 (Johannesburg)**, Google Cloud only, personal Gmail for email, APK
installed directly (no Google Play), free tiers everywhere else.

| Need | Pilot solution | Cost |
|---|---|---|
| Server | The same VM (`create-vm.sh`, now defaulting to `africa-south1`), addresses `app.<ip>.sslip.io` / `api.<ip>.sslip.io`, HTTPS from Let's Encrypt via Caddy | ≈ US$64/month (VM 53.81 + disk ≈6 + IP ≈3.65); US$0 while Google's new-account trial credit (US$300 / 90 days) lasts, if the billing account still qualifies |
| Cloudflare | **Not used.** Without a domain it can't do anything (it only manages domains you own). Caddy already provides HTTPS. Reconsider when a domain is bought | 0 |
| Driver login SMS | **textbee**: an Android phone with a Mozambican SIM sends the codes. Free plan: 1 phone, 50 SMS/day, 300/month. Transweb is already wired for it (`SMS_DEFAULT_PROVIDER=custom_http`, key in `CUSTOM_HTTP_SMS_AUTH_TOKEN`, sending SIM pinned with `CUSTOM_HTTP_SMS_SIM_SUBSCRIPTION_ID`). Drivers can also get the code by email | 0 + the SIM's own SMS bundle |
| Background tracking | Install a **debug-signed pilot APK**: Transistorsoft states the SDK is "fully functional in DEBUG builds, no license required". The JS is bundled inside, so it runs without the computer. Before paying customers: their 30-day trial key, then buy | 0 |
| Push notifications | Firebase (Spark plan, free; Cloud Messaging has no charge) | 0 |
| Driver app maps | Google Maps SDK for Android key (mobile map loads are free) in the same Google Cloud project | 0 |
| App distribution | Send the APK by WhatsApp or download it from the server; drivers allow "install unknown apps". Updates are installed over the old app (same signing key) | 0 |
| Email | Personal Gmail SMTP (≈500 emails/day) | 0 |

Pilot steps:
1. **You:** sign in to Google in the browser pane (Firebase + Google Cloud), make sure billing is on, and run
   `gcloud auth login` once.
2. **You:** on a spare Android phone with a SIM: install the textbee app (APK from textbee.dev), create a textbee
   account, link the phone, copy the API key.
3. **Me:** Firebase project + Android app `mz.co.komuniki.transweb.driver`, Maps Android key, create the VM, migrate,
   put the keys in, build the pilot APK pointing at `https://api.<ip>.sslip.io`.
4. **Together:** install on 2-3 drivers' phones, run real orders for 1-2 weeks.

Limits to keep in mind: debug builds are a bit slower and must not go to paying customers; textbee's free plan
covers about 10 logins a day; the textbee phone must stay charged and online.

## 1. What runs where

| Component | Where | Notes |
|---|---|---|
| Console (web app), API, queue worker, scheduler, SocketCluster (live tracking), MySQL 8, Redis, Caddy (HTTPS) | **One Google Compute Engine VM** (e2-standard-2: 2 vCPU, 8 GB, 60 GB SSD) with Docker Compose | Already scripted: `deploy/gcp/create-vm.sh`, `deploy/gcp/migrate-from-local.sh`, `docker-compose.prod.yml`, `deploy/Caddyfile` |
| Backups (nightly DB dump + uploads) | Google Cloud Storage bucket, 30-day retention | `deploy/backup.sh`, cron 02:30 |
| Domain DNS, HTTPS proxy, DDoS protection | Cloudflare free plan | Only once a domain exists; not used for the sslip.io pilot |
| Driver app | Google Play (Android) | `mz.co.komuniki.transweb.driver` |
| Route calculation (OSRM) | Public demo server today → **self-host on the same VM** | Mozambique map extract is small; fits in the 8 GB VM |

**Region.** You chose Europe (`europe-west1`, Belgium). Google charges **the same price** for this VM in
`africa-south1` (Johannesburg): US$53.81/month either way. Johannesburg is far closer to Maputo (roughly
30-50 ms instead of 150-200 ms per request), which drivers on 3G will feel. Changing it is one variable in
`create-vm.sh` (`REGION`/`ZONE`). Recommendation: use `africa-south1` unless data must stay in the EU.

## 2. Accounts, APIs and keys needed to be fully operational

Status today: ✓ ready · ⚠ placeholder/test value · ✗ missing.

| # | What | Used for | Where it goes | Status | Who |
|---|---|---|---|---|---|
| 1 | **Google Cloud project with billing** | VM, disk, IP, backups | `PROJECT_ID` for the deploy scripts | ✗ (`gcloud auth login` + project) | You |
| 2 | **Domain** (e.g. `transweb.co.mz` or `.com`) | `app.` (console) and `api.` (API + live tracking) | server `.env` `APP_DOMAIN`/`API_DOMAIN`, driver app `FLEETBASE_HOST` | ✗ (sslip.io works meanwhile) | You |
| 3 | **Google Maps Platform key, server** (restricted to the VM IP) | Address search/geocoding in the console and API; optional Google Routes ETAs with traffic | API `.env` `GOOGLE_MAPS_API_KEY` | ⚠ placeholder `YOUR_…` | You create, I configure |
| 4 | **Google Maps key, Android** (restricted to package + signing SHA-1) | Map tiles in the driver app (**maps are blank without it**), address autocomplete, route line | driver `.env` `GOOGLE_MAPS_API_KEY` | ✗ empty | You create, I configure |
| 5 | **Firebase project** (Android app `mz.co.komuniki.transweb.driver`) | Push notifications to drivers (new order, changes) | `android/app/google-services.json` + API `FIREBASE_CREDENTIALS` (service account JSON) | ✓ project `transweb-111be`, app registered, `google-services.json` in place, server key configured; assigned/dispatched pushes tested on a phone | Done |
| 6 | **Transistorsoft licence** (react-native-background-geolocation, Android) | Background location tracking in **release** builds (debug works without) | driver `.env` `TRANSISTORSOFT_LICENSE_KEY_ANDROID` | ✗ empty ("LICENSE VALIDATION FAILURE") | You buy |
| 7 | **Email provider** + domain SPF/DKIM | Invitations, password reset, notifications | API `.env` `MAIL_*` (SMTP) or `RESEND_KEY`/`POSTMARK_TOKEN`/… | ⚠ personal Gmail SMTP (≈500/day limit, spam risk) | You sign up, I configure |
| 8 | **SMS provider for Mozambique** | Driver login codes, customer notifications | API `.env` `CUSTOM_HTTP_SMS_*` (local aggregator) or `SMPP` (operator) or Twilio | ✓ textbee account + Redmi gateway phone (Vodacom SIM pinned); test SMS delivered 2026-11-13 | Done (copy the key to the server .env) |
| 9 | **Google Play Console** account | Publishing the driver app | — | ✗ | You (US$25 once) |
| 10 | **Release signing key** (upload keystore) | Signing the Play Store build. **Back it up**: losing it blocks updates | `ANDROID_NAVIGATOR_APP_UPLOAD_*` | ✗ | I generate, you keep a copy |
| 11 | **Privacy policy + terms pages** | Required by Google Play for location apps; linked in the app | driver `.env` `PRIVACY_POLICY_URL`, `TERMS_URL` | ✗ | You (text), I can host on the console domain |
| 12 | Facebook/Google/Apple sign-in | Driver social login | driver `.env` `FACEBOOK_*` | ⚠ placeholders: **remove** (drivers log in by phone) | I remove |
| 13 | Sentry (optional) | Error alerts | API `SENTRY_LARAVEL_DSN` | optional, free tier | — |
| 14 | Payments (optional, later) | Charging your customers inside Transweb: Stripe exists; M-Pesa/e-Mola need a local gateway | — | not needed to start | — |
| 15 | AI assistant (optional) | Natural-language order creation (OpenAI or Anthropic key) | console extension settings | optional | — |

Already working, no key needed: Fleetbase extension registry, SocketCluster (self-hosted), OpenStreetMap
tiles in the console map picker, OSRM routing (public server; self-host before real traffic).

**Licence.** Transweb is AGPL-3.0. Selling it as a hosted service is allowed. The condition is to keep
offering your modified source (done: "Avisos legais" → GitHub `fjessen/transweb`; make
`fjessen/transweb-driver` public before the app reaches drivers). If you ever want closed-source changes,
Fleetbase sells a commercial licence.

## 3. Step-by-step

1. **Accounts (week 1, you):** items 1, 2, 5, 7, 8, 9, 6 above; create the two Google Maps keys (item 3/4) with
   Geocoding, Places, Directions/Routes and Maps SDK for Android enabled, and **set a budget alert** in Google Cloud
   billing (e.g. US$100) so nothing surprises you.
2. **Server (1 day, me):** set `REGION=africa-south1` (or keep Europe), run `create-vm.sh` then
   `migrate-from-local.sh` (copies the database, uploads and `APP_KEY`; local install untouched). Point the domain's
   DNS at the static IP (Cloudflare "DNS only" first so Let's Encrypt can issue; then switch on the proxy with
   SSL "Full (strict)").
3. **Configure services (1 day, me):** Maps key, Firebase credentials, email, SMS, `TRACKING_PROVIDER`
   (`google_routes` once the Routes API is enabled, OSRM fallback), self-hosted OSRM for Mozambique, uptime check +
   alert email, test a backup restore.
4. **Driver app release (2-3 days, me + you):** point the app at `https://api.<domain>`, add the Maps, Firebase and
   Transistorsoft keys, privacy/terms URLs, remove social logins, finish translating the remaining English screens,
   generate the upload key, build the release (AAB), upload to the Play **internal testing** track, test with 2-3
   drivers, then publish.
5. **Pilot (2-4 weeks):** one or two real customers, watch errors, SMS deliverability and costs, then open sales.

## 4. Costs

### 4.1 Monthly, fixed (one server, small scale: up to about 5 customer companies / 50-100 active drivers)

| Item | On-demand US$/month | With 1-year commitment | Notes |
|---|---:|---:|---|
| VM e2-standard-2 (europe-west1 or africa-south1) | 53.81 | 33.90 | 3-year commitment: 24.22 |
| 60 GB balanced persistent disk (~US$0.10/GB) | 6.00 | 6.00 | |
| Static external IP | 3.65 | 3.65 | US$0.005/hour |
| Internet egress (≈30-50 GB) | ~5 | ~5 | estimate; maps/photos/API traffic |
| Backups in Cloud Storage (30 days) | ~1 | ~1 | estimate |
| Cloudflare (DNS, proxy) | 0 | 0 | free plan |
| Google Maps Platform | 0 | 0 | each "Essentials" API has 10,000 free calls/month (Geocoding, Places, Routes…); Maps SDK for Android is free |
| Firebase push notifications (FCM) | 0 | 0 | free |
| Email (e.g. Resend/Brevo free tier) | 0-20 | 0-20 | free tiers cover early volume |
| **Infrastructure subtotal** | **≈ 70-90** | **≈ 50-70** | ≈ 4,500-5,800 MZN / 3,200-4,500 MZN |

### 4.2 Monthly, variable

| Item | Price | Example |
|---|---|---|
| SMS via a **local** aggregator/operator | ≈ US$0.02-0.05 per SMS (local rates were cut by INCM in 2024; get quotes) | 1,000 SMS ≈ US$20-50 |
| SMS via Twilio (international route) | listed ≈ US$0.25 per SMS to Mozambique (varies by network) | 1,000 SMS ≈ US$245 → avoid for volume |
| Google Maps above the free tier | ≈ US$5 per 1,000 geocodes or route calls (Autocomplete/Place Details vary) | only at larger scale |

Keep SMS mostly for login codes; use push notifications and email for the rest. SMS is the cost that can
grow fastest, so either include a quota per plan or bill it.

### 4.3 One-time / yearly

| Item | Cost |
|---|---|
| Google Play developer account | US$25 once |
| Transistorsoft background-location licence | not published in our search: get the quote from transistorsoft.com (budget a few hundred US$, one-time per app) |
| Domain | `.com` ≈ US$10-11/year (Cloudflare at cost); `.co.mz` from a Mozambican registrar (get quote) |
| Apple developer (only if iPhone later) | US$99/year |
| Your setup time | see step plan above |

### 4.4 When to grow

- One e2-standard-2 should serve roughly 50-100 active drivers comfortably (estimate; watch CPU/RAM in Cloud
  Monitoring). Next step: e2-standard-4 (4 vCPU, 16 GB) ≈ US$108/month on demand, ≈ US$68 with a 1-year commitment.
- After the pilot, a 1-year commitment saves about 37% on the VM.

## 5. What you can charge

### 5.1 Market reference (international list prices, per month)

- Per-driver delivery software: **US$29-59 per driver** (Detrack ≈29-39, Track-POD ≈29-59, OptimoRoute ≈35-49).
- Flat platforms: Onfleet from ≈ US$299-619/month; Routific US$150/month for 101-1,000 orders.
- GPS vehicle tracking (needs hardware): US$18-35 per vehicle; South Africa R300-900 per vehicle.

Transweb's strengths in Mozambique: Portuguese (pt-MZ), MZN, Maputo defaults, local support, no tracking hardware
(the driver's phone is the tracker), customer portal and live tracking included.

### 5.2 Proposed price list (MZN, excluding IVA 16%)

| Plan | Includes | Monthly price | ≈ US$ |
|---|---|---:|---:|
| **Básico** | up to 5 drivers, 1 user admin + 2 dispatchers, 100 SMS | **4,500 MZN** | 70 |
| **Profissional** | up to 20 drivers, unlimited users, customer portal, 400 SMS, priority support | **12,500 MZN** | 195 |
| **Empresa** | 21+ drivers: **550 MZN per driver** (minimum 15,000 MZN), API integration, SLA | from **15,000 MZN** | from 235 |
| Setup / onboarding (one-time) | account setup, data import (clients, places, vehicles), training, branding | **15,000-25,000 MZN** | 235-390 |
| Extra SMS | per SMS beyond the quota | **3-4 MZN** | ~0.05 |

Annual prepayment: 2 months free. Per-driver this is about US$8.50-14, well below international tools
(US$29+) and below hardware GPS tracking. There's room to raise prices once you have references.

### 5.3 Example: 6 months after launch

| Customers | Monthly revenue |
|---|---:|
| 3 × Básico | 13,500 MZN |
| 2 × Profissional | 25,000 MZN |
| 1 × Empresa (30 drivers) | 16,500 MZN |
| **Total** | **55,000 MZN ≈ US$860** |
| Costs: server ≈ 5,800 MZN + SMS ≈ 2,500 MZN + email/other ≈ 1,000 MZN | ≈ 9,300 MZN ≈ US$145 |
| **Gross margin** | **≈ 45,700 MZN ≈ US$715 (≈ 83%)** |

Break-even on running costs: **two Básico customers** (9,000 MZN) cover the server and services. Not included:
your time (support, sales), taxes, bank/payment fees, the one-time licence and app-store costs, and the
infrastructure upgrade once you pass ~100 drivers.

## Sources

- Google Compute Engine e2-standard-2 prices by region: https://gcloud-compute.com/e2-standard-2.html
- Persistent disk prices: https://gcloud-compute.com/pd-balanced.html
- Compute Engine pricing (official): https://cloud.google.com/compute/all-pricing
- Google Maps Platform pricing overview: https://developers.google.com/maps/billing/overview/
- Google Maps free tier 2026 summary: https://www.woosmap.com/blog/is-google-maps-api-free
- Google Maps per-SKU prices: https://storerocket.io/learn/google-maps-api-pricing
- Transistorsoft licensing (release builds need a licence): https://www.npmjs.com/package/react-native-background-geolocation
- Mozambique SMS pricing (Twilio and local context): https://www.sent.dm/resources/mozambique-sms-pricing
- Plivo Mozambique per-network SMS rates: https://www.plivo.com/sms/pricing/mz/
- Delivery software pricing comparison: https://www.costbench.com/software/last-mile-delivery/
- Onfleet pricing: https://www.upperinc.com/blog/onfleet-pricing/
- GPS tracking prices (South Africa): https://www.procompare.co.za/prices/vehicle-tracking/fleet-management
- GPS tracking prices (US): https://azuga.com/pricing
- USD/MZN rate: https://wise.com/us/currency-converter/usd-to-mzn-rate
