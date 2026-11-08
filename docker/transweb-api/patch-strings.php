<?php

/**
 * Transweb — replaces hardcoded, user-facing "Fleetbase" product names in the API's vendor packages
 * with the configured application name (APP_NAME), at image build time.
 *
 *   php patch-strings.php /fleetbase/api/vendor/fleetbase
 *
 * Every patch must match exactly once (or be already applied); otherwise the build fails, so an
 * upstream wording change is caught instead of silently shipping "Fleetbase" again.
 * Strings that describe Fleetbase's own hosted services, licences, PHP namespaces, or internal
 * developer/AI context are intentionally left alone.
 */
$root = rtrim($argv[1] ?? '/fleetbase/api/vendor/fleetbase', '/');
$app  = "' . config('app.name') . '";

$patches = [
    // Emails (Laravel notifications)
    'core-api/src/Notifications/UserAcceptedCompanyInvite.php' => [
        ["' on Fleetbase!')", "' on {$app}!')"],
        ["' on Fleetbase.')", "' on {$app}.')"],
        ["'Thank you for using Fleetbase!'", "'Thank you for using {$app}!'"],
    ],
    'core-api/src/Notifications/PasswordReset.php' => [
        ["'Your password reset link for Fleetbase'", "'Your password reset link for ' . config('app.name')"],
    ],
    'core-api/src/Notifications/UserInvited.php' => [
        ["' on Fleetbase!')", "' on {$app}!')"],
        ['has invited you to join their organization on Fleetbase.', "has invited you to join their organization on {$app}."],
        ["' on Fleetbase.')", "' on {$app}.')"],
    ],
    // Property default: must stay a constant expression
    'core-api/src/Mail/TestMail.php' => [
        ["'🎉 Your Fleetbase Mail Configuration Works!'", "'🎉 Your Transweb Mail Configuration Works!'"],
    ],
    'core-api/views/mail/test.blade.php' => [
        ['This is a test email from Fleetbase to confirm', "This is a test email from {{ config('app.name') }} to confirm"],
    ],
    // SMS
    'core-api/src/Http/Controllers/Internal/v1/AuthController.php' => [
        ["'Your Fleetbase authentication code is '", "'Your ' . config('app.name') . ' authentication code is '"],
    ],
    'core-api/src/Http/Controllers/Internal/v1/SettingController.php' => [
        ["'This is a Fleetbase SMS test.'", "'This is a ' . config('app.name') . ' SMS test.'"],
        ["'Hello World from Fleetbase 🚀'", "'Hello World from ' . config('app.name') . ' 🚀'"],
        ["'This is a Twilio test from Fleetbase'", "'This is a Twilio test from ' . config('app.name')"],
    ],
    // Customer portal errors shown to end users
    'customer-portal-api/server/src/Http/Controllers/Internal/v1/AuthController.php' => [
        ['sign in through the Fleetbase console.', "sign in through the {$app} console.", 'all'],
    ],
    'customer-portal-api/server/src/Http/Controllers/Internal/v1/TwoFaController.php' => [
        ['sign in through the Fleetbase console.', "sign in through the {$app} console.", 'all'],
    ],
    // AI assistant identity (what it calls itself in answers)
    'ai/server/src/Services/OpenAIProvider.php' => [
        ["'You are Fleetbase AI, an operations copilot inside Fleetbase.", "'You are ' . config('app.name') . ' AI, an operations copilot inside ' . config('app.name') . '."],
    ],
    'ai/server/src/Services/AnthropicProvider.php' => [
        ["'You are Fleetbase AI, an operations copilot inside Fleetbase.", "'You are ' . config('app.name') . ' AI, an operations copilot inside ' . config('app.name') . '."],
    ],
];

$failed = 0;
$applied = 0;
foreach ($patches as $relative => $replacements) {
    $file = "{$root}/{$relative}";
    if (!is_file($file)) {
        // Optional extensions may not be installed in every image
        fwrite(STDERR, "[transweb] skip (not installed): {$relative}\n");
        continue;
    }
    $code = file_get_contents($file);
    foreach ($replacements as $r) {
        [$search, $replace] = $r;
        $all   = ($r[2] ?? null) === 'all';
        $count = substr_count($code, $search);
        if ($count === 0) {
            if (str_contains($code, $replace)) {
                continue; // already applied
            }
            fwrite(STDERR, "[transweb] NOT FOUND in {$relative}: {$search}\n");
            $failed++;
            continue;
        }
        if ($count > 1 && !$all) {
            // identical snippets inside one file (e.g. two subjects) are all branded
            $all = true;
        }
        $code = str_replace($search, $replace, $code);
        $applied += $count;
    }
    file_put_contents($file, $code);
    if (!str_ends_with($relative, '.blade.php')) {
        $lint = shell_exec('php -l ' . escapeshellarg($file) . ' 2>&1');
        if (!str_contains((string) $lint, 'No syntax errors')) {
            fwrite(STDERR, "[transweb] SYNTAX ERROR after patch: {$relative}\n{$lint}\n");
            $failed++;
        }
    }
}

echo "[transweb] applied {$applied} string replacement(s)\n";
exit($failed > 0 ? 1 : 0);
