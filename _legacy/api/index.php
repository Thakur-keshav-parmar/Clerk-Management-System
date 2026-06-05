<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/auth.php';

// ─── CORS ────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: '  . ALLOWED_ORIGIN);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Parse request ───────────────────────────────────────────────────────────
$uri    = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Strip this script's directory from the URI to get the resource path.
// e.g. SCRIPT_NAME=/api/index.php → base=/api → path=/auth/login
$base = rtrim(str_replace('index.php', '', $_SERVER['SCRIPT_NAME']), '/');
$path = $base !== '' && str_starts_with($uri, $base) ? substr($uri, strlen($base)) : $uri;
if ($path === '' || $path === false) $path = '/';

// ─── Health ──────────────────────────────────────────────────────────────────
if ($path === '/health' && $method === 'GET') {
    json_ok(['status' => 'ok', 'storage' => 'mysql']);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
if ($path === '/auth/login' && $method === 'POST') {
    require_once __DIR__ . '/handlers/auth.php';
    handle_login();
}
if ($path === '/auth/logout' && $method === 'POST') {
    require_once __DIR__ . '/handlers/auth.php';
    handle_logout();
}

// ─── Students ────────────────────────────────────────────────────────────────
if ($path === '/students') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/students.php';
    match ($method) {
        'GET'  => handle_list_students($user),
        'POST' => handle_create_student($user),
        default => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/students/([^/]+)$#', $path, $m)) {
    $user = require_auth();
    require_once __DIR__ . '/handlers/students.php';
    match ($method) {
        'GET'    => handle_get_student($m[1], $user),
        'PUT'    => handle_update_student($m[1], $user),
        'DELETE' => handle_delete_student($m[1], $user),
        default  => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/students/([^/]+)/status$#', $path, $m) && $method === 'PUT') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/students.php';
    handle_update_student_status($m[1], $user);
}

// ─── Courses ─────────────────────────────────────────────────────────────────
if ($path === '/courses') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/courses.php';
    match ($method) {
        'GET'  => handle_list_courses($user),
        'POST' => handle_add_course($user),
        default => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/courses/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/courses.php';
    handle_delete_course($m[1], $user);
}
if (preg_match('#^/courses/([^/]+)/fees$#', $path, $m)) {
    $user = require_auth();
    require_once __DIR__ . '/handlers/courses.php';
    match ($method) {
        'PUT' => handle_update_course_fees($m[1], $user),
        default => json_error(405, 'Method not allowed'),
    };
}

// ─── Payments ────────────────────────────────────────────────────────────────
if ($path === '/payments') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/payments.php';
    match ($method) {
        'GET'  => handle_list_payments($user),
        'POST' => handle_collect_fee($user),
        default => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/payments/student/([^/]+)$#', $path, $m) && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/payments.php';
    handle_student_payments($m[1], $user);
}

// ─── Dues ────────────────────────────────────────────────────────────────────
if ($path === '/dues' && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/dues.php';
    handle_dues($user);
}

// ─── Clearance ───────────────────────────────────────────────────────────────
if ($path === '/clearance' && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/clearance.php';
    handle_clearance($user);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
if ($path === '/dashboard' && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/dashboard.php';
    handle_dashboard($user);
}

// ─── Settings ────────────────────────────────────────────────────────────────
if ($path === '/settings') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/settings.php';
    match ($method) {
        'GET' => handle_get_settings(),
        'PUT' => handle_update_settings($user),
        default => json_error(405, 'Method not allowed'),
    };
}

// ─── Reminders ───────────────────────────────────────────────────────────────
if ($path === '/reminders') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/reminders.php';
    match ($method) {
        'GET'  => handle_list_reminders($user),
        'POST' => handle_create_reminder($user),
        default => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/reminders/(\d+)/done$#', $path, $m) && $method === 'PUT') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/reminders.php';
    handle_done_reminder((int)$m[1], $user);
}
if (preg_match('#^/reminders/(\d+)/reschedule$#', $path, $m) && $method === 'PUT') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/reminders.php';
    handle_reschedule_reminder((int)$m[1], $user);
}

// ─── Defaulters ──────────────────────────────────────────────────────────────
if ($path === '/defaulters' && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/defaulters.php';
    handle_defaulters($user);
}

// ─── Reports ─────────────────────────────────────────────────────────────────
if ($path === '/reports' && $method === 'GET') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/reports.php';
    handle_reports($user);
}

// ─── Users (IAM) ─────────────────────────────────────────────────────────────
if ($path === '/users') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/users.php';
    match ($method) {
        'GET'  => handle_list_users($user),
        'POST' => handle_create_user($user),
        default => json_error(405, 'Method not allowed'),
    };
}
if (preg_match('#^/users/([^/]+)$#', $path, $m)) {
    $user = require_auth();
    require_once __DIR__ . '/handlers/users.php';
    match ($method) {
        'PUT'    => handle_update_user($m[1], $user),
        'DELETE' => handle_delete_user($m[1], $user),
        default  => json_error(405, 'Method not allowed'),
    };
}

// ─── Snooze (defaulters) ─────────────────────────────────────────────────────
if (preg_match('#^/students/([^/]+)/snooze$#', $path, $m) && $method === 'PUT') {
    $user = require_auth();
    require_once __DIR__ . '/handlers/defaulters.php';
    handle_snooze($m[1], $user);
}

// ─── 404 ─────────────────────────────────────────────────────────────────────
json_error(404, 'Endpoint not found');
