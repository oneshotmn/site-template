#!/bin/bash
# Runs docker-php-entrypoint's own setup (it lays down wp-includes etc. on
# first boot from the base image) before handing off to the CMD (supervisord).
# Every value wp-config.php reads comes from the environment WordPress itself
# defines: WORDPRESS_DB_HOST, WORDPRESS_DB_NAME, WORDPRESS_DB_USER,
# WORDPRESS_DB_PASSWORD, WORDPRESS_AUTH_KEY and friends, WP_HOME, WP_SITEURL.
# No secret is read from a file this image ships.
set -euo pipefail

# The base image's own entrypoint performs the wp-config.php merge/copy
# dance; running it with `true` as the command makes it do only that setup
# and exit, leaving supervisord (this script's actual CMD) to run the
# long-lived processes.
docker-php-entrypoint true

mkdir -p /var/www/html/wp-content/uploads
chown -R www-data:www-data /var/www/html/wp-content/uploads

exec "$@"
