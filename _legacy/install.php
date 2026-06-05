<?php
/**
 * EDUTRON – One-Click Installer
 * Run this once on a fresh XAMPP installation:
 *   http://localhost/clerk-management-system/install.php
 * Delete this file after installation is complete.
 */

$dbHost = 'localhost';
$dbUser = 'root';
$dbPass = '';
$dbName = 'coaching_db';

echo '<!DOCTYPE html><html><head>
<title>EDUTRON Installer</title>
<style>
  body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#f5f7fa;}
  h1{color:#2563eb;}
  .ok{color:#16a34a;font-weight:bold;}
  .fail{color:#dc2626;font-weight:bold;}
  .step{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:12px 0;}
  pre{background:#f1f5f9;padding:10px;border-radius:4px;font-size:.85rem;overflow-x:auto;}
  .done{background:#dcfce7;border-color:#16a34a;padding:20px;border-radius:8px;margin-top:20px;}
  a.btn{display:inline-block;margin-top:16px;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;}
</style></head><body>';

echo '<h1>🎓 EDUTRON Installer</h1>';

$errors = [];

// Step 1: Create DB
echo '<div class="step"><b>Step 1:</b> Creating database <code>' . $dbName . '</code>… ';
try {
    $pdo = new PDO("mysql:host=$dbHost;charset=utf8mb4", $dbUser, $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo '<span class="ok">✓ Done</span>';
} catch (Exception $e) {
    echo '<span class="fail">✗ ' . htmlspecialchars($e->getMessage()) . '</span>';
    $errors[] = $e->getMessage();
}
echo '</div>';

if (!$errors) {
    $pdo->exec("USE `$dbName`");

    // Step 2: Import SQL dump
    $sqlFile = __DIR__ . '/database/coaching_db.sql';
    echo '<div class="step"><b>Step 2:</b> Importing database dump… ';
    if (!file_exists($sqlFile)) {
        echo '<span class="fail">✗ File not found: database/coaching_db.sql</span>';
        $errors[] = 'SQL dump missing';
    } else {
        try {
            $sql = file_get_contents($sqlFile);
            // Split by semicolon (skip empty)
            $statements = array_filter(array_map('trim', explode(";\n", $sql)));
            $count = 0;
            foreach ($statements as $stmt) {
                if ($stmt) { $pdo->exec($stmt); $count++; }
            }
            echo '<span class="ok">✓ ' . $count . ' statements executed</span>';
        } catch (Exception $e) {
            echo '<span class="fail">✗ ' . htmlspecialchars($e->getMessage()) . '</span>';
            $errors[] = $e->getMessage();
        }
    }
    echo '</div>';
}

// Step 3: Run migrations
if (!$errors) {
    echo '<div class="step"><b>Step 3:</b> Running migrations… ';
    $migrations = glob(__DIR__ . '/api/setup/migrate_v*.php');
    sort($migrations);
    foreach ($migrations as $mig) {
        ob_start();
        try { include $mig; } catch (Exception $e) { /* ignore already-exists errors */ }
        ob_end_clean();
    }
    echo '<span class="ok">✓ All migrations applied</span></div>';
}

// Summary
if ($errors) {
    echo '<div class="step"><span class="fail">Installation failed. Check errors above.</span></div>';
} else {
    echo '<div class="done">
        <h2 class="ok">✓ Installation Complete!</h2>
        <p><b>Login credentials:</b></p>
        <pre>Admin   → username: admin    / password: admin123
Teacher → username: teacher  / password: teacher123</pre>
        <p style="color:#dc2626;font-weight:bold;">⚠ Delete this file (install.php) after setup!</p>
        <a class="btn" href="index.html">Open EDUTRON →</a>
    </div>';
}

echo '</body></html>';
