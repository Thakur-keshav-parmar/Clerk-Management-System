<?php
function _new_txn_id(): string
{
    $count = (int)get_db()->query('SELECT COUNT(*) FROM payments')->fetchColumn();
    return 'TXN' . (1001 + $count);
}

function _payment_to_json(array $row): array
{
    return [
        'txnId'       => $row['txn_id'],
        'studentId'   => $row['student_id'],
        'studentName' => $row['student_name'],
        'course'      => $row['course'],
        'amount'      => (int)$row['amount'],
        'method'      => $row['method'],
        'date'        => $row['date'],
        'displayTime' => $row['display_time'],
        'timeISO'     => $row['time_iso'],
        'status'      => $row['status'],
    ];
}

function handle_list_payments(array $user): void
{
    $stmt = get_db()->query('SELECT * FROM payments ORDER BY time_iso DESC');
    json_ok(array_map('_payment_to_json', $stmt->fetchAll()));
}

function handle_collect_fee(array $user): void
{
    $b         = get_body();
    $studentId = $b['studentId'] ?? '';
    $amount    = (int)($b['amount'] ?? 0);

    if ($studentId === '') json_error(400, 'studentId is required');

    $db   = get_db();
    $stmt = $db->prepare('SELECT * FROM students WHERE id = ?');
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();
    if (!$student) json_error(404, 'Student not found');

    // Compute current due dynamically for monthly students
    $feeType = $student['fee_type'] ?? 'monthly';
    $today   = (new DateTime())->format('Y-m-d');

    // Accept optional payment date (defaults to today, allows past dates)
    $paymentDate = trim($b['paymentDate'] ?? '');
    if (!$paymentDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $paymentDate)) {
        $paymentDate = (new DateTime())->format('Y-m-d');
    }

    if ($feeType === 'monthly') {
        $cstmt = $db->prepare('SELECT monthly_fee, duration, duration_unit FROM courses WHERE code = ?');
        $cstmt->execute([$student['course']]);
        $cRow = $cstmt->fetch();
        $per_period      = max(0, (int)($cRow['monthly_fee'] ?? 0) - (int)$student['waiver_amount']);
        $dur_raw         = max(1, (int)($cRow['duration'] ?? 1));
        $dur_unit        = $cRow['duration_unit'] ?? 'years';
        $duration_months = ($dur_unit === 'months') ? $dur_raw : $dur_raw * 12;
        $admission       = new DateTime($student['admission_date']);
        $diff            = (new DateTime())->diff($admission);
        $elapsed         = ($diff->y * 12) + $diff->m;
        $charged         = min($elapsed, $duration_months) * $per_period;
        $due             = max(0, $charged - (int)$student['paid']);
    } else {
        $due = (int)$student['due'];
    }

    if ($amount <= 0 || $amount > $due) json_error(400, "Invalid amount. Due: $due");

    $newPaid = (int)$student['paid'] + $amount;
    $newDue  = max(0, $due - $amount);

    $db->prepare('UPDATE students SET paid=?, due=? WHERE id=?')
       ->execute([$newPaid, $newDue, $studentId]);

    // Get and increment receipt number
    $db->exec("UPDATE receipt_counter SET last_number = last_number + 1 WHERE id = 1");
    $receiptNum = (int)$db->query("SELECT last_number FROM receipt_counter WHERE id=1")->fetchColumn();
    $receiptId = 'RCP-' . date('Y') . '-' . $receiptNum;

    $now   = new DateTime('now', new DateTimeZone('Asia/Kolkata'));
    $txnId = _new_txn_id();
    $db->prepare(
        'INSERT INTO payments (txn_id, student_id, student_name, course, amount, method, date, display_time, time_iso, status, receipt_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $txnId, $studentId, $student['name'], $student['course'],
        $amount, 'Cash', $paymentDate, $now->format('h:i:s A'), $now->format('c'), 'Paid', $receiptId,
    ]);

    // Compute months covered for receipt
    $monthsCovered = null;
    if ($feeType === 'monthly' && $per_period > 0) {
        $mCovered = (int)floor($amount / $per_period);
        if ($mCovered > 0) {
            $fromDate = new DateTime();
            $toDate   = clone $fromDate;
            $toDate->modify('+' . ($mCovered - 1) . ' months');
            $monthsCovered = $fromDate->format('M Y') . ($mCovered > 1 ? ' – ' . $toDate->format('M Y') : '');
        }
    }

    json_ok([
        'txnId'         => $txnId,
        'studentId'     => $studentId,
        'studentName'   => $student['name'],
        'course'        => $student['course'],
        'amount'        => $amount,
        'method'        => 'Cash',
        'date'          => $paymentDate,
        'displayTime'   => $now->format('h:i:s A'),
        'timeISO'       => $now->format('c'),
        'status'        => 'Paid',
        'receiptId'     => $receiptId,
        'monthsCovered' => $monthsCovered,
        'remainingDue'  => $newDue,
    ]);
}

function handle_student_payments(string $sid, array $user): void
{
    $stmt = get_db()->prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY time_iso DESC');
    $stmt->execute([$sid]);
    json_ok(array_map('_payment_to_json', $stmt->fetchAll()));
}
