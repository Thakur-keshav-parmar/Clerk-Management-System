<?php
function handle_dashboard(array $user): void
{
    $db    = get_db();
    $today = (new DateTime())->format('Y-m-d');

    $totalStudents = (int)$db->query('SELECT COUNT(*) FROM students')->fetchColumn();

    $stmt = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM payments WHERE date = ?');
    $stmt->execute([$today]);
    $todayCollection = (int)$stmt->fetchColumn();

    $thisMonthStart = (new DateTime('first day of this month'))->format('Y-m-d');
    $stmt = $db->prepare('SELECT COALESCE(SUM(amount),0) FROM payments WHERE date >= ?');
    $stmt->execute([$thisMonthStart]);
    $thisMonth = (int)$stmt->fetchColumn();

    $dueStudents = (int)$db->query('SELECT COUNT(*) FROM students WHERE due > 0')->fetchColumn();

    $year = (new DateTime())->format('Y');
    $stmt = $db->prepare(
        'SELECT MONTH(date) AS m, SUM(amount) AS total
         FROM payments WHERE YEAR(date) = ? GROUP BY MONTH(date)'
    );
    $stmt->execute([$year]);
    $monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $monthly    = array_fill_keys($monthNames, 0);
    foreach ($stmt->fetchAll() as $row) {
        $monthly[$monthNames[(int)$row['m'] - 1]] = (int)$row['total'];
    }

    $stmt   = $db->query('SELECT * FROM payments ORDER BY time_iso DESC LIMIT 15');
    $recent = [];
    foreach ($stmt->fetchAll() as $row) {
        $recent[] = [
            'txnId'       => $row['txn_id'],
            'studentId'   => $row['student_id'],
            'studentName' => $row['student_name'],
            'course'      => $row['course'],
            'amount'      => (int)$row['amount'],
            'date'        => $row['date'],
            'displayTime' => $row['display_time'],
            'status'      => $row['status'],
        ];
    }

    json_ok([
        'totalStudents'      => $totalStudents,
        'todayCollection'    => $todayCollection,
        'thisMonth'          => $thisMonth,
        'dueStudents'        => $dueStudents,
        'monthlyCollection'  => $monthly,
        'recentTransactions' => $recent,
    ]);
}
