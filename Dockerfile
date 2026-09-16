# Stock official WordPress image, unmodified apart from wp-cli and the
# bundled theme. Deliberately NOT a hand-written wp-config.php: the stock
# entrypoint (docker-entrypoint.sh) generates wp-config.php itself when
# WORDPRESS_DB_* env vars are present, and per the image's own docs it adds
# HTTP_X_FORWARDED_PROTO handling automatically — which is exactly what
# makes is_ssl() work correctly behind Fly's TLS-terminating proxy. A
# custom wp-config.php here previously caused an infinite HTTPS redirect
# loop (ERR_TOO_MANY_REDIRECTS on /wp-login.php); never reintroduce one.
FROM wordpress:php8.3-apache

# wp-cli: not part of the stock image; used by our entrypoint to run the
# self-install non-interactively. wp-cli's `wp db *` subcommands (used by
# our entrypoint to wait for DB connectivity) shell out to the mysql/
# mysqlcheck client binaries directly rather than going through PHP's
# mysqli extension — and the stock wordpress image does NOT ship a MySQL
# client, only the PHP driver. Without default-mysql-client, `wp db check`
# fails immediately with "mysqlcheck: No such file or directory" and the
# self-install can never even reach the "waiting for database" retry loop.
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /usr/local/bin/wp \
      https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp

# The bundled OneShot theme is NOT on wordpress.org, so it cannot be
# fetched with `wp theme install`. It must be baked into the image and
# activated with `wp theme activate` only. It is copied to
# /usr/src/wordpress/wp-content/themes/ — the base image's seed directory —
# NOT to /var/www/html, because the stock entrypoint copies
# /usr/src/wordpress into /var/www/html on first boot (skipping files that
# already exist there). Anything copied straight into /var/www/html would
# be masked/ignored by that seeding step.
COPY theme/oneshot-block-theme /usr/src/wordpress/wp-content/themes/oneshot-block-theme

# Our boot-time self-install script; wraps the stock entrypoint rather
# than replacing it.
COPY docker-entrypoint-wrapper.sh /usr/local/bin/docker-entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-wrapper.sh

ENTRYPOINT ["docker-entrypoint-wrapper.sh"]
CMD ["apache2-foreground"]
