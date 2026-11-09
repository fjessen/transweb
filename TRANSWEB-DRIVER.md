# TranswebDriver: rebranding the Fleetbase Navigator app

Status: **analysis and plan** (2026-11-09). No code changes have been made to the app yet.

## 1. What is there today
`C:\Users\felne\OneDrive\Documents\TransWeb\navigator-app` is a clone of
[fleetbase/navigator-app](https://github.com/fleetbase/navigator-app) **v2.0.11** (React Native 0.7x, new
architecture, Tamagui UI, AGPL-3.0). Remote `origin` is still Fleetbase's repo, so nothing is published.

Local edits found (uncommitted): `APP_NAME=TransWeb` in `.env`, `app_name` + placeholder Facebook/Maps
strings in `android/.../strings.xml`, arm64-only Android build, Gradle timeouts, Yarn 4 pin.

| Item | Current value | Problem |
|---|---|---|
| App ID (`APP_IDENTIFIER`, Android namespace, iOS bundle id) | `io.fleetbase.navigator` | Fleetbase's ID. It can't be published under your account and is **permanent once uploaded to Play Store** |
| Deep-link scheme (`APP_LINK_PREFIX`) | `flbnavigator` | Fleetbase's |
| Display name | `TransWeb` (.env), `Navigator`/`NavigatorApp` elsewhere | inconsistent |
| `FLEETBASE_HOST` / SocketCluster | `localhost` | phone can't reach it; needs the server URL over HTTPS |
| `DEFAULT_COORDINATES` | `1.369,103.8864` (Singapore) | should be Maputo `-25.9692,32.5732` |
| Theme | Tamagui `blue`, login background `#111827` | Transweb teal/navy |
| Languages | `translations/en.json` only (67 keys); many strings hard-coded in `src/` | no Portuguese |
| Branding in text | ~80 "Fleetbase" mentions in `src/`, including the **background-location disclosure** shown to drivers ("Fleetbase Navigator collects precise location data…") | must say Transweb (Play Store policy requires the disclosure to name the app) |
| Icons / splash / store images | Fleetbase artwork in `assets/` | replace from the brand kit |
| Firebase (`android/app/google-services.json`) | project `navigator-ci` (Fleetbase CI), package `io.fleetbase.navigator` | push notifications won't reach your drivers. Needs **your own Firebase project** |
| Background location (`react-native-background-geolocation`) | `TRANSISTORSOFT_LICENSE_KEY_ANDROID` empty | Transistorsoft's plugin works in Android **debug** builds only. **Release builds need a paid licence** (iOS doesn't). Check current pricing. |
| Google Maps key (Android) | empty / `none` | maps won't render on Android |
| Facebook / Google / Apple sign-in | placeholder IDs | remove if drivers only log in by phone/SMS (simplest), or configure |
| Location | inside OneDrive (with `node_modules`) | same sync/disk problem as the server stack. Move it out. |

## 2. Plan

### Phase 0: Set up (½ day)
1. Fork to **github.com/fjessen/transweb-driver** (keeps AGPL source public, like the console). Keep
   `upstream` = fleetbase/navigator-app for updates.
2. Move the working copy out of OneDrive (e.g. `C:\Users\felne\TransWeb-stack\transweb-driver`).
3. Decide the permanent IDs (see §3) and commit the local edits worth keeping on a `transweb` branch.

### Phase 1: Identity (1–2 days)
4. App ID → e.g. `mz.co.transweb.driver` in `.env`, `android/app/build.gradle` (namespace + Java/Kotlin
   package folders), iOS `PRODUCT_BUNDLE_IDENTIFIER`. Rename the iOS target/scheme `NavigatorApp` →
   `TranswebDriver`.
5. Name: `APP_NAME=Transweb Driver` (launcher label) and `app.json` `name`/`displayName`; deep-link scheme
   `transwebdriver`.
6. Artwork: from the brand kit, create `assets/app-icon.png` (1024², navy tile icon) and `splash-screen.png`.
   Then run `yarn generate:app-icon` and `yarn generate:launch-screen` with background `#0B2A3C`.
   Also create the Play Store icon and feature image.
7. Theme: add a `transweb` palette to `tamagui.config.ts` (primary teal `#087D7A`, same WCAG-AA shades as the
   console), set `APP_THEME=transweb` and `LOGIN_BG_COLOR=#0B2A3C`.
8. Replace user-visible "Fleetbase"/"Navigator" strings (keep SDK class names like `FleetbasePlace`, which are
   code, not text). Rewrite the location disclosure for Transweb.

### Phase 2: Mozambique (2–4 days)
9. Add `translations/pt.json` (pt-MZ wording: utilizador, telemóvel, palavra-passe…), move hard-coded strings
   into translation keys, `DEFAULT_LOCALE=pt`.
10. Defaults: Maputo coordinates, +258 phone input, MZN.
11. Low-data / offline: check how the app behaves on 3G and with lost signal (queued status updates and
    proof-of-delivery photo uploads). Compress photos with the already-included image resizer.

### Phase 3: Services and release (depends on DEPLOY.md)
12. Point `FLEETBASE_HOST`/SocketCluster to `https://api.<domain>`. The API must be online over HTTPS first.
13. Firebase project for `mz.co.transweb.driver` → new `google-services.json` for the app and
    `FIREBASE_CREDENTIALS` on the API. For iOS: APNs key on the API and `GoogleService-Info.plist`.
14. Transistorsoft Android licence (bound to the app ID, so buy it after step 4).
15. Google Maps Android/iOS keys restricted to the app ID + signing certificate.
16. Signing keystore (back it up, since losing it means you can't ship updates), Google Play Console account,
    internal-testing track first. iOS requires a Mac (or a cloud Mac/CI) and an Apple Developer account.
17. Privacy policy URL (required by both stores for location apps).

## 3. Decisions needed
- **App ID**, permanent: e.g. `mz.co.transweb.driver` (if you own `transweb.co.mz`) or
  `mz.co.komuniki.transwebdriver`.
- Store name: "Transweb Driver" (display) / `TranswebDriver` (code/project name)?
- Android only at first, or iOS too?
- Driver login method: phone + SMS code only, or also email/Google/Apple?
- Budget for the Transistorsoft licence (or accept foreground-only tracking).
