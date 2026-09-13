# WordPress + PHP-FPM + nginx, single image, multi-arch (builds natively on
# Apple Silicon and on the amd64 runners Fly uses — no QEMU emulation layer).
# No secrets baked in: every credential and hostname arrives at runtime via
# environment variables (see wp-config.php and entrypoint.sh).

FROM wordpress:6.7-php8.3-fpm

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY wp-config.php /var/www/html/wp-config.php
COPY entrypoint.sh /entrypoint.sh
COPY theme/ /var/www/html/wp-content/themes/

RUN chmod +x /entrypoint.sh \
    && mkdir -p /var/www/html/wp-content/uploads \
    && chown -R www-data:www-data /var/www/html/wp-content

# wp-content/uploads is the volume mount point (see fly.toml) — the only
# directory this image expects to persist across deploys.
VOLUME ["/var/www/html/wp-content/uploads"]

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]
