<?php
function handle_list_reminders(array $user): void {
    $db = get_db();
    $today = date('Y-m-d');
    // Auto-escalate overdue pending reminders
    $db->prepare("UPDATE reminders SET status='escalated' WHERE status='pending' AND reminder_date < ?")->execute([$today]);
    $stmt = $db->query("SELECT r.*, s.due as student_due, s.paid as student_paid,
                        c.monthly_fee, c.duration, s.admission_date, s.fee_type, s.waiver_amount
                        FROM reminders r
                        LEFT JOIN students s ON s.id = r.student_id
                        LEFT JOIN courses c ON c.code = r.course
                        WHERE r.status IN ('pending','escalated')
                        ORDER BY r.status DESC, r.reminder_date ASC");
    $rows = $stmt->fetchAll();
    $result = [];
    foreach ($rows as $r) {
        // Compute current due dynamically
        require_once __DIR__ . '/students.php';
        $currentDue = compute_due($r + [
            'monthly_fee'    => $r['monthly_fee'],
            'duration'       => $r['duration'],
            'admission_date' => $r['admission_date'],
            'fee_type'       => $r['fee_type'],
            'waiver_amount'  => $r['waiver_amount'],
            'paid'           => $r['student_paid'],
            'total_fees'     => 0,
        ]);
        $result[] = [
            'id'            => (int)$r['id'],
            'studentId'     => $r['student_id'],
            'studentName'   => $r['student_name'],
            'course'        => $r['course'],
            'reminderDate'  => $r['reminder_date'],
            'note'          => $r['note'],
            'promiseAmount' => (int)$r['promise_amount'],
            'status'        => $r['status'],
            'currentDue'    => $currentDue,
            'createdAt'     => $r['created_at'],
        ];
    }
    json_ok($result);
}

function handle_create_reminder(array $user): void {
    $b  = get_body();
    $db = get_db();
    $sid  = $b['studentId']     ?? '';
    $date = $b['reminderDate']  ?? date('Y-m-d', strtotime('+3 days'));
    $amt  = (int)($b['promiseAmount'] ?? 0);
    $note = trim($b['note'] ?? '');
    if (!$sid) json_error(400, 'studentId required');
    $stmt = $db->prepare('SELECT * FROM students WHERE id=?'); $stmt->execute([$sid]);
    $stu = $stmt->fetch();
    if (!$stu) json_error(404, 'Student not found');
    // Delete existing pending reminder for this student first
    $db->prepare("DELETE FROM reminders WHERE student_id=? AND status IN ('pending','escalated')")->execute([$sid]);
    // Create new reminder
    $db->prepare("INSERT INTO reminders (student_id,student_name,course,reminder_date,note,promise_amount) VALUES (?,?,?,?,?,?)")
       ->execute([$sid,$stu['name'],$stu['course'],$date,$note,$amt]);
    // Snooze student in defaulters
    $db->prepare("UPDATE students SET snoozed_until=?,snooze_note=?,snooze_amount=? WHERE id=?")
       ->execute([$date,$note,$amt,$sid]);
    json_ok(['message'=>'Reminder set','id'=>(int)$db->lastInsertId()]);
}

function handle_done_reminder(int $id, array $user): void {
    $db = get_db();
    $r = $db->prepare("SELECT * FROM reminders WHERE id=?"); $r->execute([$id]); $rem = $r->fetch();
    if (!$rem) json_error(404,'Not found');
    $db->prepare("UPDATE reminders SET status='done' WHERE id=?")->execute([$id]);
    $db->prepare("UPDATE students SET snoozed_until=NULL,snooze_note=NULL,snooze_amount=0 WHERE id=?")->execute([$rem['student_id']]);
    json_ok(['message'=>'Done']);
}

function handle_reschedule_reminder(int $id, array $user): void {
    $b = get_body();
    $newDate = $b['reminderDate'] ?? date('Y-m-d', strtotime('+3 days'));
    $db = get_db();
    $r = $db->prepare("SELECT * FROM reminders WHERE id=?"); $r->execute([$id]); $rem = $r->fetch();
    if (!$rem) json_error(404,'Not found');
    $db->prepare("UPDATE reminders SET reminder_date=?,status='pending' WHERE id=?")->execute([$newDate,$id]);
    $db->prepare("UPDATE students SET snoozed_until=? WHERE id=?")->execute([$newDate,$rem['student_id']]);
    json_ok(['message'=>'Rescheduled']);
}
