<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';
$db = get_db();
$n  = $db->exec("UPDATE students SET status = 'studying' WHERE status = 'active' OR status IS NULL OR status = ''");
echo "Fixed $n student(s): 'active' → 'studying'.\n";
