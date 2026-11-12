# Transweb API image
#
# A thin layer over the upstream Fleetbase API image that brands hardcoded, user-facing strings
# (emails, SMS, AI assistant name). Everything else is the unmodified upstream image.
#
# BASE_IMAGE is pinned to the exact upstream image this installation was running when Transweb was
# set up (fleetbase-api for console v0.7.63 / fleetops 0.6.68). Upgrade deliberately: bump the
# digest together with the console version, then rebuild (the patch fails loudly on wording drift).
ARG BASE_IMAGE=fleetbase/fleetbase-api@sha256:b712ca37fda0a72d65beb3bbfef5fad9783e01a212f5f544f704af941af5a17d
FROM ${BASE_IMAGE}

COPY docker/transweb-api/patch-strings.php /tmp/transweb/patch-strings.php
RUN php /tmp/transweb/patch-strings.php /fleetbase/api/vendor/fleetbase && rm -rf /tmp/transweb

# Laravel Octane worker entrypoint for FrankenPHP (the upstream image at this digest does not ship
# it; this installation previously bind-mounted it from api/public).
COPY --chown=www-data:www-data docker/transweb-api/frankenphp-worker.php /fleetbase/api/public/frankenphp-worker.php

# Transweb branding defaults (overrides the hardcoded Fleetbase S3 logo URLs in core-api)
COPY api/config/fleetbase.php /fleetbase/api/config/fleetbase.php

# Third-party service settings, including the textbee SMS gateway (services.sms.providers.custom_http)
COPY api/config/services.php /fleetbase/api/config/services.php

LABEL org.opencontainers.image.title="transweb-api" \
      org.opencontainers.image.description="Transweb (Fleetbase distribution for Mozambique) API" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"
