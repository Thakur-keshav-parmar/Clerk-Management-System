<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';
$db = get_db();
$ok = []; $fail = [];

$stmts = [
    "ALTER TABLE users ADD COLUMN password_plain VARCHAR(255) NULL AFTER password_hash",
    "ALTER TABLE courses ADD COLUMN duration_unit VARCHAR(10) NOT NULL DEFAULT 'years' AFTER duration",
];

foreach ($stmts as $sql) {
    try { $db->exec($sql); $ok[] = $sql; }
    catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate column')) { $ok[] = 'SKIP (already exists): ' . $sql; }
        else { $fail[] = $e->getMessage() . ' — ' . $sql; }
    }
}

// Ensure default admin exists with correct credentials
$adminHash = hash('sha256', 'admin123');
$db->prepare("INSERT INTO users (username, password_hash, password_plain, name, role)
              VALUES ('admin', ?, 'admin123', 'Admin', 'admin')
              ON DUPLICATE KEY UPDATE
                password_hash  = VALUES(password_hash),
                password_plain = VALUES(password_plain),
                name           = VALUES(name),
                role           = VALUES(role)")
   ->execute([$adminHash]);

// Seed plain-text password for teacher if missing
$db->prepare("UPDATE users SET password_plain = 'teacher123' WHERE username = 'teacher' AND password_plain IS NULL")
   ->execute();

echo "<h2>migrate_v6 results</h2>";
echo "<pre>OK:\n" . implode("\n", $ok) . "\n\nFAIL:\n" . implode("\n", $fail) . "</pre>";
echo "<p>Default admin set: username=<b>admin</b> / password=<b>admin123</b> / name=<b>Admin</b></p>";
