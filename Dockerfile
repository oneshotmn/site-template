# WordPress + PHP-FPM + nginx, single image, multi-arch (builds natively on
# Apple Silicon and on the amd64 runners Fly uses — no QEMU emulation layer).
# No secrets baked in: every credential and hostname arrives at runtime via
# environment variables (see wp-config.php and entrypoint.sh).
#
# Self-installing, no external database server: the SQLite Database
# Integration drop-in (WordPress Performance Team feature plugin, baked in
# below at IMAGE BUILD time — never downloaded at container start) stores
# WordPress's data in one file inside the volume this app already mounts
# (wp-content/uploads), so a Machine boots with zero external dependency —
# no DB to provision or wait on. This is an architecture choice made for
# provisioning speed, traded against SQLite's single-writer limit; revisit
# for a site with real concurrent-write traffic (see README.md).

FROM wordpress:6.7-php8.3-fpm

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor unzip \
    && rm -rf /var/lib/apt/lists/*

# wp-cli: the one tool entrypoint.sh uses to run the install non-interactively.
RUN curl -fsSL -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp

# SQLite Database Integration, downloaded from wordpress.org at IMAGE BUILD
# time (never at container start): unpacked into wp-content/plugins and its
# db.php drop-in generated from db.copy so WordPress picks it up on boot
# with no runtime install step.
RUN curl -fsSL -o /tmp/sqlite.zip https://downloads.wordpress.org/plugin/sqlite-database-integration.zip \
    && mkdir -p /var/www/html/wp-content/plugins \
    && unzip -q /tmp/sqlite.zip -d /var/www/html/wp-content/plugins \
    && rm /tmp/sqlite.zip \
    && sed \
         -e "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#/var/www/html/wp-content/plugins/sqlite-database-integration#g" \
         -e "s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#g" \
         /var/www/html/wp-content/plugins/sqlite-database-integration/db.copy \
         > /var/www/html/wp-content/db.php

COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY wp-config.php /var/www/html/wp-config.php
COPY entrypoint.sh /entrypoint.sh
COPY theme/ /var/www/html/wp-content/themes/

RUN chmod +x /entrypoint.sh \
    && mkdir -p /var/www/html/wp-content/uploads /var/www/html/wp-content/uploads/database \
    && chown -R www-data:www-data /var/www/html/wp-content

# wp-content/uploads is the volume mount point (see fly.toml) — the only
# directory this image expects to persist across deploys. The SQLite file
# lives inside it (uploads/database/) so the database survives restarts on
# the same one volume, with no second Fly volume needed.
VOLUME ["/var/www/html/wp-content/uploads"]

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]

