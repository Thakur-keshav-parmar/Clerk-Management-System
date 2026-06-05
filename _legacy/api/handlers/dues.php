<?php
require_once __DIR__ . '/students.php';

function handle_dues(array $user): void
{
    $db    = get_db();
    $today = (new DateTime())->format('Y-m-d');

    // All students except "left within last 30 days" (grace period)
    $stmt = $db->query(
        "SELECT s.*, c.monthly_fee, c.yearly_fee, c.duration
         FROM students s
         LEFT JOIN courses c ON c.code = s.course
         WHERE NOT (
                 s.status = 'left'
                 AND s.left_date IS NOT NULL
                 AND s.left_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
               )
         ORDER BY s.name"
    );

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $due = compute_due($row);
        if ($due <= 0) continue;

        $feeType   = $row['fee_type'] ?? 'monthly';
        $waiver    = (int)$row['waiver_amount'];
        $perPeriod = $feeType === 'monthly'
            ? max(0, (int)$row['monthly_fee'] - $waiver)
            : null;
        $totalFees = $feeType === 'yearly' ? (int)$row['total_fees'] : null;

        $result[] = [
            'id'          => $row['id'],
            'name'        => $row['name'],
            'course'      => $row['course'],
            'feeType'     => $feeType,
            'perPeriod'   => $perPeriod,
            'totalFees'   => $totalFees,
            'paid'        => (int)$row['paid'],
            'due'         => $due,
            'status'      => $row['status'],
            'leftDate'    => $row['left_date'] ?? null,
        ];
    }
    json_ok($result);
}
