<?php
// ─── JWT helpers (no composer needed — pure PHP HMAC-SHA256) ──────────────────

function _b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function _b64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload): string
{
    $header  = _b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $body    = _b64url_encode(json_encode($payload));
    $sig     = _b64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function jwt_decode(string $token): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new RuntimeException('Invalid token format');
    }
    [$header, $body, $sig] = $parts;
    $expected = _b64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) {
        throw new RuntimeException('Invalid token signature');
    }
    $data = json_decode(_b64url_decode($body), true);
    if (!$data) {
        throw new RuntimeException('Malformed token payload');
    }
    if (($data['exp'] ?? 0) < time()) {
        throw new RuntimeException('Token expired');
    }
    return $data;
}

/**
 * Validate Bearer token and return decoded payload.
 * Calls json_error(401, ...) and exits on failure.
 */
function require_auth(): array
{
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!str_starts_with($auth, 'Bearer ')) {
        json_error(401, 'Unauthorized — missing token');
    }
    try {
        return jwt_decode(substr($auth, 7));
    } catch (RuntimeException $e) {
        json_error(401, $e->getMessage());
    }
}
