<?php
// ─── Database — load from db.config.php if present ───────────────────────────
$_dbconf = __DIR__ . '/db.config.php';
if (file_exists($_dbconf)) {
    require_once $_dbconf;
} else {
    define('DB_HOST',    'localhost');
    define('DB_PORT',    '3306');
    define('DB_NAME',    'coaching_db');
    define('DB_USER',    'root');
    define('DB_PASS',    '');
    define('DB_CHARSET', 'utf8mb4');
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
define('JWT_SECRET',       'change-this-to-a-long-random-secret-before-deploying');
define('JWT_EXPIRE_HOURS', 8);

// ─── CORS ────────────────────────────────────────────────────────────────────
define('ALLOWED_ORIGIN', '*');   // change to your domain in production
