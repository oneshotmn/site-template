<?php
/**
 * Every value here comes from an environment variable. No secret is
 * committed to this file or to this repository — the provisioner sets the
 * real values as Fly app secrets (see .oneshot/repo.yml and README.md).
 */

function oneshot_env(string $name, ?string $default = null): ?string
{
    $value = getenv($name);
    return $value === false ? $default : $value;
}

define('DB_NAME', oneshot_env('WORDPRESS_DB_NAME', 'wordpress'));
define('DB_USER', oneshot_env('WORDPRESS_DB_USER', 'wordpress'));
define('DB_PASSWORD', oneshot_env('WORDPRESS_DB_PASSWORD', ''));
define('DB_HOST', oneshot_env('WORDPRESS_DB_HOST', 'localhost'));
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// No external database server: the SQLite Database Integration drop-in
// (baked into the image at build time — see Dockerfile) stores everything
// in one file, placed inside the ONE volume this app already mounts
// (wp-content/uploads) so the database survives a Machine restart without
// a second Fly volume. Skipped when a real WORDPRESS_DB_HOST is set, so a
// future move to managed MySQL is a config change, not a code one.
if (!oneshot_env('WORDPRESS_DB_HOST')) {
    define('DB_DIR', '/var/www/html/wp-content/uploads/database/');
    define('DB_FILE', '.ht.sqlite');
}


$auth_keys = [
    'AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY',
    'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT',
];
foreach ($auth_keys as $key) {
    if (!defined($key)) {
        define($key, oneshot_env('WORDPRESS_' . $key, ''));
    }
}

$table_prefix = oneshot_env('WORDPRESS_TABLE_PREFIX', 'wp_');

// WP_HOME / WP_SITEURL come from the domain the provisioner assigned
// (.oneshot/repo.yml's `domain` key) — never hardcoded here.
if (oneshot_env('WP_HOME')) {
    define('WP_HOME', oneshot_env('WP_HOME'));
}
if (oneshot_env('WP_SITEURL')) {
    define('WP_SITEURL', oneshot_env('WP_SITEURL'));
}

define('WP_DEBUG', oneshot_env('WORDPRESS_DEBUG', '') === '1');

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

require_once ABSPATH . 'wp-settings.php';
