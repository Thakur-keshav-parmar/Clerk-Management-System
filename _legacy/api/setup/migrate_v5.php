<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';
$db = get_db();
$ok = []; $fail = [];
$stmts = [
    "ALTER TABLE students ADD COLUMN passout_date   DATE         NULL AFTER left_date",
    "ALTER TABLE students ADD COLUMN break_from_date DATE        NULL AFTER passout_date",
    "ALTER TABLE students ADD COLUMN break_remarks  VARCHAR(500) NULL AFTER break_from_date",
];
foreach ($stmts as $sql) {
    try { $db->exec($sql); $ok[] = $sql; }
    catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate column')) { $ok[] = 'SKIP (already exists): ' . $sql; }
        else { $fail[] = $e->getMessage() . ' — ' . $sql; }
    }
}
echo "<h2>migrate_v5 results</h2>";
echo "<pre>OK:\n" . implode("\n", $ok) . "\n\nFAIL:\n" . implode("\n", $fail) . "</pre>";
