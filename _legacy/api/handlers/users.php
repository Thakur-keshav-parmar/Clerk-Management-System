<?php
// ─── List all users (admin only) ─────────────────────────────────────────────
function handle_list_users(array $user): void
{
    if ($user['role'] !== 'admin') json_error(403, 'Admin only');
    $rows = get_db()->query('SELECT username, name, role, password_plain FROM users ORDER BY role, username')->fetchAll();
    json_ok($rows);
}

// ─── Create user (admin only) ─────────────────────────────────────────────────
function handle_create_user(array $user): void
{
    if ($user['role'] !== 'admin') json_error(403, 'Admin only');
    $b        = get_body();
    $username = strtolower(trim($b['username'] ?? ''));
    $name     = trim($b['name']     ?? '');
    $password = $b['password']      ?? '';
    $role     = $b['role']          ?? 'teacher';

    if ($username === '')      json_error(400, 'Username is required');
    if ($name === '')          json_error(400, 'Name is required');
    if (strlen($password) < 4) json_error(400, 'Password must be at least 4 characters');
    if (!in_array($role, ['admin', 'clerk', 'teacher'])) json_error(400, 'Invalid role');

    $db  = get_db();
    $chk = $db->prepare('SELECT username FROM users WHERE username = ?');
    $chk->execute([$username]);
    if ($chk->fetch()) json_error(409, 'Username already exists');

    $hash = hash('sha256', $password);
    $db->prepare('INSERT INTO users (username, password_hash, password_plain, name, role) VALUES (?,?,?,?,?)')
       ->execute([$username, $hash, $password, $name, $role]);

    json_ok(['username' => $username, 'name' => $name, 'role' => $role, 'password_plain' => $password]);
}

// ─── Update user role / name / password (admin only) ─────────────────────────
function handle_update_user(string $username, array $user): void
{
    if ($user['role'] !== 'admin') json_error(403, 'Admin only');
    $b  = get_body();
    $db = get_db();

    $chk = $db->prepare('SELECT username FROM users WHERE username = ?');
    $chk->execute([$username]);
    if (!$chk->fetch()) json_error(404, 'User not found');

    $sets = [];
    $vals = [];

    if (isset($b['name']) && trim($b['name']) !== '') {
        $sets[] = 'name = ?';
        $vals[] = trim($b['name']);
    }
    if (isset($b['role']) && in_array($b['role'], ['admin', 'clerk', 'teacher'])) {
        if ($username === $user['sub'] && $b['role'] !== 'admin') {
            json_error(400, 'Cannot change your own role');
        }
        $sets[] = 'role = ?';
        $vals[] = $b['role'];
    }
    if (isset($b['password']) && strlen($b['password']) >= 4) {
        $sets[] = 'password_hash = ?';
        $vals[] = hash('sha256', $b['password']);
        $sets[] = 'password_plain = ?';
        $vals[] = $b['password'];
    }

    if (empty($sets)) json_error(400, 'Nothing to update');

    $vals[] = $username;
    $db->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE username = ?')
       ->execute($vals);

    $row = $db->prepare('SELECT username, name, role, password_plain FROM users WHERE username = ?');
    $row->execute([$username]);
    json_ok($row->fetch());
}

// ─── Delete user (admin only, cannot delete self) ─────────────────────────────
function handle_delete_user(string $username, array $user): void
{
    if ($user['role'] !== 'admin') json_error(403, 'Admin only');
    if ($username === $user['sub']) json_error(400, 'Cannot delete your own account');

    $db  = get_db();
    $chk = $db->prepare('SELECT username FROM users WHERE username = ?');
    $chk->execute([$username]);
    if (!$chk->fetch()) json_error(404, 'User not found');

    $db->prepare('DELETE FROM users WHERE username = ?')->execute([$username]);
    json_ok(['message' => 'User deleted']);
}
