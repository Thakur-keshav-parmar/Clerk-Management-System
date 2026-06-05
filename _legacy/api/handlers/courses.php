<?php
function handle_list_courses(array $user): void
{
    $stmt = get_db()->query('SELECT code, name, duration, duration_unit, monthly_fee, yearly_fee FROM courses ORDER BY code');
    json_ok($stmt->fetchAll());
}

function handle_add_course(array $user): void
{
    $b    = get_body();
    $code = strtoupper(trim($b['code'] ?? ''));
    $name = trim($b['name'] ?? '');

    if (!preg_match('/^[A-Z]{2,20}$/', $code)) json_error(400, 'Course code must be 2–20 letters');
    if ($name === '') json_error(400, 'Course name is required');

    $duration      = max(1, (int)($b['duration']      ?? 1));
    $duration_unit = in_array($b['duration_unit'] ?? '', ['months','years']) ? $b['duration_unit'] : 'years';
    $monthly_fee   = max(0, (int)($b['monthly_fee'] ?? 0));
    $yearly_fee    = max(0, (int)($b['yearly_fee']  ?? 0));

    $db = get_db();
    $check = $db->prepare('SELECT code FROM courses WHERE code = ?');
    $check->execute([$code]);
    if ($check->fetch()) json_error(400, "Course $code already exists");

    $db->prepare('INSERT INTO courses (code, name, duration, duration_unit, monthly_fee, yearly_fee) VALUES (?,?,?,?,?,?)')
       ->execute([$code, $name, $duration, $duration_unit, $monthly_fee, $yearly_fee]);

    json_ok(['code' => $code, 'name' => $name, 'duration' => $duration, 'duration_unit' => $duration_unit,
             'monthly_fee' => $monthly_fee, 'yearly_fee' => $yearly_fee]);
}

function handle_delete_course(string $code, array $user): void
{
    get_db()->prepare('DELETE FROM courses WHERE code = ?')->execute([strtoupper($code)]);
    json_ok(['message' => 'Deleted']);
}

function handle_update_course_fees(string $code, array $user): void
{
    $b    = get_body();
    $code = strtoupper($code);
    $db   = get_db();

    $monthly_fee = (int)($b['monthly_fee'] ?? -1);
    $yearly_fee  = (int)($b['yearly_fee']  ?? -1);

    $sets = [];
    $vals = [];
    if ($monthly_fee >= 0) { $sets[] = 'monthly_fee = ?'; $vals[] = $monthly_fee; }
    if ($yearly_fee  >= 0) { $sets[] = 'yearly_fee  = ?'; $vals[] = $yearly_fee;  }
    if (!$sets) json_error(400, 'No fee values provided');

    $vals[] = $code;
    $db->prepare('UPDATE courses SET ' . implode(', ', $sets) . ' WHERE code = ?')->execute($vals);

    $row = $db->prepare('SELECT code, name, duration, duration_unit, monthly_fee, yearly_fee FROM courses WHERE code = ?');
    $row->execute([$code]);
    json_ok($row->fetch());
}
