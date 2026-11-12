<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'sendgrid' => [
        'api_key' => env('SENDGRID_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY', env('STRIPE_API_KEY')),
        'secret' => env('STRIPE_SECRET', env('STRIPE_API_SECRET')),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'callpromn' => [
        'api_key' => env('CALLPROMN_API_KEY', ''),
        'from' => env('CALLPROMN_FROM', ''),
        'base_url' => env('CALLPROMN_BASE_URL', 'https://api-text.callpro.mn/v1/sms'),
    ],

    'google_maps' => [
        'locale' => env('GOOGLE_MAPS_LOCALE', 'us'),
        'api_key' => env('GOOGLE_MAPS_API_KEY'),
    ],

    /*
    | SMS through the "custom_http" provider of core-api's SmsService, shaped for textbee
    | (https://textbee.dev, an Android phone used as the SMS gateway). Enable it with
    | SMS_DEFAULT_PROVIDER=custom_http and CUSTOM_HTTP_SMS_AUTH_TOKEN=<textbee API key>.
    | For a self-hosted textbee, point CUSTOM_HTTP_SMS_URL at your own server.
    */
    'sms' => [
        'providers' => [
            'custom_http' => [
                'method' => env('CUSTOM_HTTP_SMS_METHOD', 'POST'),
                'url' => env('CUSTOM_HTTP_SMS_URL', 'https://api.textbee.dev/api/v1/gateway/send-sms'),
                'from' => env('CUSTOM_HTTP_SMS_FROM', ''),
                'auth_header' => env('CUSTOM_HTTP_SMS_AUTH_HEADER', 'x-api-key'),
                'auth_token' => env('CUSTOM_HTTP_SMS_AUTH_TOKEN', ''),
                'headers' => [],
                'query_params' => [],
                'body' => [
                    'recipients' => ['{{to}}'],
                    'message' => '{{text}}',
                ],
                'message_id_path' => 'data.smsBatchId',
                'status_path' => 'data.success',
                'error_path' => 'error',
            ],
        ],
    ],
];
