#!/bin/bash
# Runs docker-php-entrypoint's own setup (it lays down wp-includes etc. on
# first boot from the base image), then runs a non-interactive `wp core
# install` exactly once so no human ever visits /wp-admin/install.php, then
# hands off to the CMD (supervisord). Every value wp-config.php reads comes
# from the environment WordPress itself defines: WORDPRESS_DB_HOST,
# WORDPRESS_DB_NAME, WORDPRESS_DB_USER, WORDPRESS_DB_PASSWORD,
# WORDPRESS_AUTH_KEY and friends, WP_HOME, WP_SITEURL. No secret is read
# from a file this image ships — WP_ADMIN_PASSPHRASE only ever lives in the
# environment and in wp-cli's argv for one process.
set -euo pipefail

# WordPress core does not ship in the image's working directory — it lives
# in /usr/src/wordpress (the base image's seed copy) until something copies
# it into /var/www/html. The base image's own docker-entrypoint.sh normally
# does this copy, but only when invoked as its own PID 1 with `php-fpm` as
# the command — a shape this multi-process (nginx + php-fpm via
# supervisord) image does not use. So the copy is done directly here,
# idempotently: `cp -rn` (no-clobber) means a second boot with an already-
# seeded volume changes nothing.
if [ ! -e /var/www/html/wp-includes/version.php ]; then
  echo "entrypoint: seeding WordPress core into /var/www/html"
  cp -rn /usr/src/wordpress/. /var/www/html/
fi

mkdir -p /var/www/html/wp-content/uploads /var/www/html/wp-content/uploads/database
chown -R www-data:www-data /var/www/html/wp-content/uploads

WP="wp --allow-root --path=/var/www/html"

if ! $WP core is-installed >/dev/null 2>&1; then
  echo "entrypoint: running non-interactive core install"
  $WP core install \
    --url="${WP_HOME:-http://localhost:8080}" \
    --title="${WP_SITE_TITLE:-${WP_HOME:-New OneShot site}}" \
    --admin_user="${WP_ADMIN_USER:-admin}" \
    --admin_password="${WP_ADMIN_PASSPHRASE:?WP_ADMIN_PASSPHRASE is required for the self-install}" \
    --admin_email="${WP_ADMIN_EMAIL:-admin@example.com}" \
    --skip-email
  echo "entrypoint: core install complete"
else
  echo "entrypoint: already installed, skipping"
fi

# wp-cli above runs as root (--allow-root), so a fresh install just created
# the SQLite file as root. php-fpm's workers run as www-data — re-chown
# after install, every boot, so both a fresh install and a resumed one
# leave php-fpm able to open the database file.
chown -R www-data:www-data /var/www/html/wp-content

exec "$@"

