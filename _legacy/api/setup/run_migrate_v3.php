<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';
$db = get_db();
$db->exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS left_date DATE DEFAULT NULL");
echo "Migration v3 done: left_date column added.\n";
