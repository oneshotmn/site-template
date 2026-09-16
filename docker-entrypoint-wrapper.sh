#!/usr/bin/env bash
# Wraps the STOCK image's own docker-entrypoint.sh. We never replace or
# reimplement what it does (file seeding, wp-config.php generation with
# correct reverse-proxy HTTPS handling) — we only add a boot-time,
# idempotent `wp core install` in front of it.
#
# Shape (a) from the design doc: run the stock entrypoint once with a
# command matching `apache2*` so it performs its one-time setup (seed
# /usr/src/wordpress into /var/www/html, write wp-config.php from the
# WORDPRESS_DB_* env vars) and returns immediately; then run our install;
# then exec the stock entrypoint again, this time in the foreground, as
# PID 1.
set -euo pipefail

echo "[wrapper] running stock entrypoint setup pass (apache2 -v)"
/usr/local/bin/docker-entrypoint.sh apache2 -v >/tmp/entrypoint-setup.log 2>&1 || true
echo "[wrapper] stock entrypoint setup pass complete"

WP="wp --allow-root --path=/var/www/html"

echo "[wrapper] waiting for database connectivity..."
for i in $(seq 1 60); do
  if $WP db check >/tmp/dbcheck.log 2>&1; then
    echo "[wrapper] database reachable"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[wrapper] ERROR: database never became reachable" >&2
    cat /tmp/dbcheck.log >&2 || true
    exit 1
  fi
  sleep 2
done

if ! $WP core is-installed >/dev/null 2>&1; then
  echo "[wrapper] WordPress not installed yet — running self-install"
  $WP core install \
    --url="${WP_HOME:?WP_HOME is required}" \
    --title="${WP_SITE_TITLE:-OneShot Site}" \
    --admin_user="${WP_ADMIN_USER:-admin}" \
    --admin_password="${WP_ADMIN_PASSPHRASE:?WP_ADMIN_PASSPHRASE is required for the self-install}" \
    --admin_email="${WP_ADMIN_EMAIL:-admin@example.com}" \
    --skip-email
  echo "[wrapper] self-install complete"
else
  echo "[wrapper] WordPress already installed — skipping install (idempotent)"
fi

# The bundled theme ships in the image itself, never on wordpress.org, so
# it can only be ACTIVATED, never `wp theme install`ed.
if [ -n "${WP_THEME:-}" ]; then
  CURRENT_THEME="$($WP theme list --status=active --field=name 2>/dev/null || true)"
  if [ "$CURRENT_THEME" != "$WP_THEME" ]; then
    echo "[wrapper] activating theme ${WP_THEME}"
    $WP theme activate "$WP_THEME"
  else
    echo "[wrapper] theme ${WP_THEME} already active"
  fi
fi

echo "[wrapper] handing off to stock entrypoint (foreground): $*"
exec /usr/local/bin/docker-entrypoint.sh "$@"
