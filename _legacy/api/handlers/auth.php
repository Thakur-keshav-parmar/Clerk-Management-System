<?php
function handle_login(): void
{
    $body     = get_body();
    $username = strtolower(trim($body['username'] ?? ''));
    $password = $body['password'] ?? '';

    if ($username === '' || $password === '') {
        json_error(400, 'Username and password are required');
    }

    $db   = get_db();
    $stmt = $db->prepare('SELECT username, password_hash, name, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !hash_equals($user['password_hash'], hash('sha256', $password))) {
        json_error(401, 'Invalid username or password');
    }

    $token = jwt_encode([
        'sub'  => $username,
        'role' => $user['role'],
        'exp'  => time() + JWT_EXPIRE_HOURS * 3600,
    ]);

    json_ok([
        'token'    => $token,
        'name'     => $user['name'],
        'role'     => $user['role'],
        'username' => $username,
    ]);
}

function handle_logout(): void
{
    json_ok(['message' => 'Logged out']);
}
