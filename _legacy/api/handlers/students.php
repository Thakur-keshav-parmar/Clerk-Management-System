<?php
// ─── Compute dynamic due for a student row (with course columns joined) ──────
function compute_due(array $row): int
{
    $paid    = (int)$row['paid'];
    $waiver  = (int)($row['waiver_amount'] ?? 0);
    $feeType = $row['fee_type'] ?? 'monthly';

    if ($feeType === 'monthly') {
        $monthly_fee     = (int)($row['monthly_fee'] ?? 0);
        $dur_raw         = max(1, (int)($row['duration'] ?? 1));
        $dur_unit        = $row['duration_unit'] ?? 'years';
        $duration_months = ($dur_unit === 'months') ? $dur_raw : $dur_raw * 12;
        $per_period      = max(0, $monthly_fee - $waiver);

        $admission = new DateTime($row['admission_date'] ?? date('Y-m-d'));
        $today     = new DateTime();
        $diff      = $today->diff($admission);
        $elapsed   = ($diff->y * 12) + $diff->m;
        $charged   = min($elapsed, $duration_months) * $per_period;
        return max(0, $charged - $paid);
    }

    // Yearly: fixed total
    return max(0, (int)$row['total_fees'] - $paid);
}

// ─── DB row → camelCase JSON ──────────────────────────────────────────────────
function student_to_json(array $row): array
{
    $feeType   = $row['fee_type'] ?? 'monthly';
    $waiver    = (int)($row['waiver_amount'] ?? 0);
    $paid      = (int)$row['paid'];
    $due       = compute_due($row);

    // Monthly: show per-month fee only (no pre-calculated year total)
    // Yearly: show fixed total
    if ($feeType === 'monthly') {
        $monthly_fee = (int)($row['monthly_fee'] ?? 0);
        $perPeriod   = max(0, $monthly_fee - $waiver);
        $totalFees   = null; // not shown for monthly
    } else {
        $perPeriod = null;
        $totalFees = (int)$row['total_fees'];
    }

    return [
        'id'            => $row['id'],
        'rollNumber'    => $row['id'],
        'name'          => $row['name'],
        'course'        => $row['course'],
        'dob'           => $row['dob']           ?? '',
        'contact'       => $row['contact']       ?? '',
        'address'       => $row['address']       ?? '',
        'fatherName'    => $row['father_name']   ?? '',
        'fatherMobile'  => $row['father_mobile'] ?? '',
        'aadhaar'       => $row['aadhaar']       ?? '',
        'photo'         => $row['photo']         ?? null,
        'feeType'       => $feeType,
        'waiverAmount'  => $waiver,
        'perPeriod'     => $perPeriod,
        'totalFees'     => $totalFees,
        'paid'          => $paid,
        'due'           => $due,
        'feeConfirmed'  => (bool)$row['fee_confirmed'],
        'admissionDate' => $row['admission_date'] ?? '',
        'installments'  => json_decode($row['installments'] ?? '[]', true) ?? [],
        'status'        => $row['status'] ?? 'studying',
        'leftDate'      => $row['left_date']       ?? null,
        'passoutDate'   => $row['passout_date']   ?? null,
        'breakFromDate' => $row['break_from_date'] ?? null,
        'breakRemarks'  => $row['break_remarks']  ?? null,
        'snoozeNote'    => $row['snooze_note']   ?? null,
        'snoozeAmount'  => (int)($row['snooze_amount'] ?? 0),
        'snoozedUntil'  => $row['snoozed_until'] ?? null,
        'personId'      => $row['person_id']     ?? $row['id'],
    ];
}

// ─── Roll number: E{YY}{MM}-{NNNN} ──────────────────────────────────────────
// Auto-assigns next available sequence for current month, starting at 0001.
// Skips over any manually-assigned IDs with same prefix to avoid collision.
function next_student_id(): string
{
    $db     = get_db();
    $yymm   = date('ym');           // e.g. '2603' for Mar 2026
    $prefix = 'E' . $yymm . '-';

    // Lock the table to prevent duplicate IDs under concurrent requests
    $db->exec('LOCK TABLES students WRITE');
    try {
        $stmt = $db->prepare(
            "SELECT id FROM students WHERE id LIKE ? ORDER BY CAST(SUBSTRING(id, ?) AS UNSIGNED) DESC LIMIT 1"
        );
        $stmt->execute([$prefix . '%', strlen($prefix) + 1]);
        $last = $stmt->fetchColumn();
        $seq  = $last ? ((int)substr($last, strlen($prefix)) + 1) : 1;
        $id   = $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    } finally {
        $db->exec('UNLOCK TABLES');
    }
    return $id;
}

// ─── Get course fee per month or per year ─────────────────────────────────────
function get_course_base_fee(string $course, string $fee_type): int
{
    $stmt = get_db()->prepare('SELECT monthly_fee, yearly_fee FROM courses WHERE code = ?');
    $stmt->execute([$course]);
    $row = $stmt->fetch();
    if (!$row) return 0;
    return $fee_type === 'yearly' ? (int)$row['yearly_fee'] : (int)$row['monthly_fee'];
}

// ─── Build installment schedule ───────────────────────────────────────────────
// $duration = number of periods (months if monthly, years if yearly) — already converted
function build_installments(int $total, string $fee_type, string $admission_date, int $duration): array
{
    if ($total <= 0) return [];
    $admDate = new DateTime($admission_date);
    $n = max(1, $duration);

    $each    = (int)floor($total / $n);
    $amounts = array_fill(0, $n, $each);
    $amounts[$n - 1] = $total - $each * ($n - 1); // last installment gets remainder

    $result = [];
    foreach ($amounts as $i => $amt) {
        $due = clone $admDate;
        if ($fee_type === 'yearly') {
            $due->modify('+' . $i . ' years');
        } else {
            $due->modify('+' . $i . ' months');
        }
        $result[] = [
            'num'        => $i + 1,
            'amount'     => $amt,
            'dueDate'    => $due->format('Y-m-d'),
            'paid'       => false,
            'partial'    => false,
            'paidDate'   => null,
            'paidAmount' => 0,
        ];
    }
    return $result;
}

// ─── Route handlers ───────────────────────────────────────────────────────────
// ─── Base SELECT with course join (for dynamic due computation) ───────────────
const STU_SELECT = 'SELECT s.*, c.monthly_fee, c.yearly_fee, c.duration, c.duration_unit
                    FROM students s
                    LEFT JOIN courses c ON c.code = s.course';

function handle_list_students(array $user): void
{
    $db     = get_db();
    $course = $_GET['course'] ?? null;
    if ($course) {
        $stmt = $db->prepare(STU_SELECT . ' WHERE s.course = ? ORDER BY s.id');
        $stmt->execute([$course]);
    } else {
        $stmt = $db->query(STU_SELECT . ' ORDER BY s.id');
    }
    json_ok(array_map('student_to_json', $stmt->fetchAll()));
}

function handle_get_student(string $sid, array $user): void
{
    $stmt = get_db()->prepare(STU_SELECT . ' WHERE s.id = ?');
    $stmt->execute([$sid]);
    $row  = $stmt->fetch();
    if (!$row) json_error(404, 'Student not found');
    json_ok(student_to_json($row));
}

function handle_create_student(array $user): void
{
    $b  = get_body();
    $db = get_db();

    $manualId = trim($b['manualRollNumber'] ?? '');
    if ($manualId !== '') {
        // Validate uniqueness of manual roll number
        $chk = $db->prepare('SELECT id FROM students WHERE id = ?');
        $chk->execute([$manualId]);
        if ($chk->fetch()) json_error(400, "Roll number '$manualId' is already taken. Please choose another.");
        $sid = $manualId;
    } else {
        $sid = next_student_id();
    }
    $course       = $b['course']      ?? '';
    $fee_type     = $b['feeType']     ?? 'monthly';
    $waiver       = (int)($b['waiverAmount'] ?? 0);
    $today        = (new DateTime())->format('Y-m-d');
    // Use provided admission date or fallback to today
    $admission    = !empty($b['admissionDate']) ? $b['admissionDate'] : $today;

    // Get course info for duration
    $cstmt = $db->prepare('SELECT duration, duration_unit, monthly_fee, yearly_fee FROM courses WHERE code = ?');
    $cstmt->execute([$course]);
    $cRow = $cstmt->fetch();
    if (!$cRow) json_error(400, 'Course not found');
    $duration      = max(1, (int)$cRow['duration']);
    $duration_unit = $cRow['duration_unit'] ?? 'years';
    // Convert duration to months for monthly fee type
    $duration_months = ($duration_unit === 'months') ? $duration : $duration * 12;

    // Waiver is per installment period, not from total
    $base_per_period = $fee_type === 'yearly'
        ? (int)($cRow['yearly_fee'] ?? 0)
        : (int)($cRow['monthly_fee'] ?? 0);
    $n_periods = $fee_type === 'yearly' ? max(1, $duration) : max(1, $duration_months);
    $per_period      = max(0, $base_per_period - $waiver);
    $totalFees       = $per_period * $n_periods;

    // For monthly: pass duration in months; for yearly: pass duration in years
    $dur_for_installments = ($fee_type === 'monthly') ? $duration_months : $duration;
    $installments = build_installments($totalFees, $fee_type, $admission, $dur_for_installments);

    $db->prepare(
        'INSERT INTO students
         (id, name, course, dob, contact, address, father_name, father_mobile, aadhaar,
          photo, fee_type, waiver_amount, total_fees, paid, due, fee_confirmed,
          installments, admission_date, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,1,?,?,\'studying\')'
    )->execute([
        $sid,
        $b['name']         ?? '',
        $course,
        $b['dob']          ?? null,
        $b['contact']      ?? '',
        $b['address']      ?? '',
        $b['fatherName']   ?? '',
        $b['fatherMobile'] ?? '',
        $b['aadhaar']      ?? '',
        $b['photo']        ?? null,
        $fee_type,
        $waiver,
        $totalFees,
        $totalFees,
        json_encode($installments),
        $admission,
    ]);

    $stmt = $db->prepare(STU_SELECT . ' WHERE s.id = ?');
    $stmt->execute([$sid]);
    json_ok(student_to_json($stmt->fetch()));
}

function handle_update_student(string $sid, array $user): void
{
    $b  = get_body();
    $db = get_db();

    $check = $db->prepare('SELECT id FROM students WHERE id = ?');
    $check->execute([$sid]);
    if (!$check->fetch()) json_error(404, 'Student not found');

    $db->prepare(
        'UPDATE students SET
         name=?, dob=?, contact=?, address=?, father_name=?, father_mobile=?, aadhaar=?, photo=?
         WHERE id=?'
    )->execute([
        $b['name']         ?? '',
        $b['dob']          ?? null,
        $b['contact']      ?? '',
        $b['address']      ?? '',
        $b['fatherName']   ?? '',
        $b['fatherMobile'] ?? '',
        $b['aadhaar']      ?? '',
        $b['photo']        ?? null,
        $sid,
    ]);

    $stmt = $db->prepare(STU_SELECT . ' WHERE s.id = ?');
    $stmt->execute([$sid]);
    json_ok(student_to_json($stmt->fetch()));
}

function handle_delete_student(string $sid, array $user): void
{
    if ($user['role'] !== 'admin') json_error(403, 'Admin only can delete');
    get_db()->prepare('DELETE FROM students WHERE id = ?')->execute([$sid]);
    json_ok(['message' => 'Deleted']);
}

function handle_update_student_status(string $sid, array $user): void
{
    $b      = get_body();
    $status = $b['status'] ?? 'studying';
    if (!in_array($status, ['studying', 'left', 'break', 'passout'])) json_error(400, 'Invalid status');
    $db = get_db();
    $check = $db->prepare('SELECT id FROM students WHERE id = ?');
    $check->execute([$sid]);
    if (!$check->fetch()) json_error(404, 'Student not found');
    if ($status === 'left') {
        $leftDate = $b['leftDate'] ?? date('Y-m-d');
        $db->prepare('UPDATE students SET status=?, left_date=?, passout_date=NULL, break_from_date=NULL, break_remarks=NULL WHERE id=?')
           ->execute([$status, $leftDate, $sid]);
    } elseif ($status === 'passout') {
        $passoutDate = $b['passoutDate'] ?? date('Y-m-d');
        $db->prepare('UPDATE students SET status=?, passout_date=?, left_date=NULL, break_from_date=NULL, break_remarks=NULL WHERE id=?')
           ->execute([$status, $passoutDate, $sid]);
    } elseif ($status === 'break') {
        $breakFrom    = $b['breakFromDate']  ?? date('Y-m-d');
        $breakRemarks = trim($b['breakRemarks'] ?? '');
        $db->prepare('UPDATE students SET status=?, break_from_date=?, break_remarks=?, left_date=NULL, passout_date=NULL WHERE id=?')
           ->execute([$status, $breakFrom, $breakRemarks, $sid]);
    } else {
        // studying — clear all status dates
        $db->prepare('UPDATE students SET status=?, left_date=NULL, passout_date=NULL, break_from_date=NULL, break_remarks=NULL WHERE id=?')
           ->execute([$status, $sid]);
    }
    $stmt = $db->prepare(STU_SELECT . ' WHERE s.id = ?');
    $stmt->execute([$sid]);
    json_ok(student_to_json($stmt->fetch()));
}
