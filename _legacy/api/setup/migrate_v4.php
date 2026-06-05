<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';
$db = get_db();
$sqls = [
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS person_id VARCHAR(15) DEFAULT NULL",
    "UPDATE students SET person_id = id WHERE person_id IS NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS snoozed_until DATE DEFAULT NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS snooze_note VARCHAR(500) DEFAULT NULL",
    "ALTER TABLE students ADD COLUMN IF NOT EXISTS snooze_amount INT DEFAULT 0",
    "CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(15),
        student_name VARCHAR(100) NOT NULL,
        course VARCHAR(20) NOT NULL,
        reminder_date DATE NOT NULL,
        note VARCHAR(500) DEFAULT '',
        promise_amount INT DEFAULT 0,
        status ENUM('pending','done','escalated') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )",
    "CREATE TABLE IF NOT EXISTS institute_settings (
        id INT PRIMARY KEY DEFAULT 1,
        inst_name VARCHAR(200) NOT NULL DEFAULT 'EDUTRON',
        address TEXT DEFAULT '',
        gst_number VARCHAR(50) DEFAULT '',
        phone VARCHAR(20) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        logo LONGTEXT DEFAULT NULL
    )",
    "INSERT IGNORE INTO institute_settings (id, inst_name) VALUES (1, 'EDUTRON')",
    "CREATE TABLE IF NOT EXISTS receipt_counter (
        id INT PRIMARY KEY DEFAULT 1,
        last_number INT NOT NULL DEFAULT 1000
    )",
    "INSERT IGNORE INTO receipt_counter (id, last_number) VALUES (1, 1000)",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(30) DEFAULT NULL",
];
foreach ($sqls as $sql) {
    try { $db->exec($sql); echo "OK\n"; } catch(Exception $e) { echo "ERR: ".$e->getMessage()."\n"; }
}
echo "v4 done\n";
