<?php
require_once __DIR__ . '/students.php';

function handle_defaulters(array $user): void {
    $db    = get_db();
    $today = new DateTime();
    $todayStr = $today->format('Y-m-d');

    $stmt = $db->query(
        "SELECT s.*, c.monthly_fee, c.yearly_fee, c.duration
         FROM students s
         LEFT JOIN courses c ON c.code = s.course
         WHERE s.status = 'studying'"
    );

    $result = [];
    foreach ($stmt->fetchAll() as $row) {
        $due = compute_due($row);
        if ($due <= 0) continue;

        $feeType   = $row['fee_type'] ?? 'monthly';
        $waiver    = (int)$row['waiver_amount'];
        $paid      = (int)$row['paid'];
        $perPeriod = $feeType === 'monthly' ? max(0, (int)$row['monthly_fee'] - $waiver) : 0;

        // Months overdue
        $monthsOverdue = 0;
        if ($feeType === 'monthly' && $perPeriod > 0) {
            $adm = new DateTime($row['admission_date'] ?? $todayStr);
            $diff = $today->diff($adm);
            $elapsed = $diff->y * 12 + $diff->m;
            $monthsPaid = (int)floor($paid / $perPeriod);
            $monthsOverdue = max(0, $elapsed - $monthsPaid);
        }

        // Snooze logic
        $snoozedUntil = $row['snoozed_until'] ?? null;
        $isEscalated  = false;
        $isSnoozed    = false;

        if ($snoozedUntil) {
            if ($snoozedUntil >= $todayStr) {
                $isSnoozed = true; // Still within promise — hide
            } else {
                $isEscalated = true; // Promise expired — escalate
            }
        }

        if ($isSnoozed) continue; // Hidden until promise date

        $result[] = [
            'id'           => $row['id'],
            'name'         => $row['name'],
            'course'       => $row['course'],
            'contact'      => $row['contact'] ?? '',
            'feeType'      => $feeType,
            'perPeriod'    => $perPeriod,
            'paid'         => $paid,
            'due'          => $due,
            'monthsOverdue'=> $monthsOverdue,
            'admissionDate'=> $row['admission_date'] ?? '',
            'status'       => $row['status'],
            'snoozeNote'   => $row['snooze_note'] ?? null,
            'snoozeAmount' => (int)($row['snooze_amount'] ?? 0),
            'snoozedUntil' => $snoozedUntil,
            'isEscalated'  => $isEscalated,
        ];
    }

    // Sort: escalated first, then monthsOverdue desc, then due desc
    usort($result, function($a, $b) {
        if ($a['isEscalated'] !== $b['isEscalated']) return $b['isEscalated'] ? 1 : -1;
        if ($a['monthsOverdue'] !== $b['monthsOverdue']) return $b['monthsOverdue'] - $a['monthsOverdue'];
        return $b['due'] - $a['due'];
    });

    json_ok($result);
}
