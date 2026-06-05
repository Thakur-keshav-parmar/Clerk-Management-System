<?php
function json_ok(mixed $data): never
{
    http_response_code(200);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $code, string $message): never
{
    http_response_code($code);
    echo json_encode(['detail' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_body(): array
{
    $raw = file_get_contents('php://input');
    return json_decode($raw ?: '{}', true) ?? [];
}
