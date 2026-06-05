<?php
function handle_clearance(array $user): void
{
    $stmt = get_db()->query(
        'SELECT id, name, course, fee_type, total_fees, paid, due FROM students ORDER BY id'
    );

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $result[] = [
            'id'        => $row['id'],
            'name'      => $row['name'],
            'course'    => $row['course'],
            'feeType'   => $row['fee_type'],
            'totalFees' => (int)$row['total_fees'],
            'paid'      => (int)$row['paid'],
            'due'       => (int)$row['due'],
            'cleared'   => ((int)$row['due'] <= 0),
        ];
    }
    json_ok($result);
}
