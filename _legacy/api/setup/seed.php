<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';

$db = get_db();

// Users
$users = [
    ['admin',   'admin123',   'Admin',   'admin'],
    ['teacher', 'teacher123', 'Teacher', 'teacher'],
];
foreach ($users as [$u, $p, $n, $r]) {
    $hash = hash('sha256', $p);
    $db->prepare('INSERT IGNORE INTO users (username, password_hash, password_plain, name, role) VALUES (?,?,?,?,?)')
       ->execute([$u, $hash, $p, $n, $r]);
    echo "  Created user: $u / $p\n";
}

// Courses — monthly_fee = per month, yearly_fee = per year
$courses = [
    ['PYTHON',  'Python Programming',        1, 3000, 30000],
    ['WEBDEV',  'Web Development',           1, 3500, 35000],
    ['DATASCI', 'Data Science',              1, 4000, 40000],
    ['ML',      'Machine Learning',          1, 4500, 45000],
    ['JAVA',    'Java Programming',          1, 3000, 30000],
    ['ANDROID', 'Android Development',       1, 3500, 35000],
    ['UIUX',    'UI/UX Design',              1, 2500, 25000],
    ['CYSEC',   'Cybersecurity Essentials',  1, 4000, 40000],
];
foreach ($courses as [$code, $name, $dur, $mfee, $yfee]) {
    $db->prepare('INSERT IGNORE INTO courses (code, name, duration, monthly_fee, yearly_fee) VALUES (?,?,?,?,?)')
       ->execute([$code, $name, $dur, $mfee, $yfee]);
    echo "  Created course: $code — $name (₹$mfee/mo · ₹$yfee/yr)\n";
}

echo "\nSeeding complete!\n";
echo "  Login: admin / admin123\n";
echo "  Login: teacher / teacher123\n";
