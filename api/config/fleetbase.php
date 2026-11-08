<?php

/*
 * Transweb overrides for vendor/fleetbase/core-api/config/fleetbase.php.
 *
 * core-api registers its config with mergeConfigFrom(), which keeps any top-level key defined
 * here and takes the rest from the package, so only the keys below are overridden.
 *
 * Branding: these are the defaults used when no logo/icon has been uploaded in
 * Console → Admin → Branding. They are absolute URLs because they are also used in emails;
 * set TRANSWEB_CONSOLE_URL to the public console address in production.
 */
$consoleUrl = rtrim((string) env('TRANSWEB_CONSOLE_URL', 'http://localhost:4200'), '/');

return [
    'branding' => [
        'logo_url' => env('TRANSWEB_LOGO_URL', $consoleUrl . '/images/transweb-logo.png'),
        'icon_url' => env('TRANSWEB_ICON_URL', $consoleUrl . '/images/icon.png'),
    ],
];
