<?php
require_once __DIR__ . '/students.php';

function handle_reports(array $user): void {
    $db   = get_db();
    $year = (int)($_GET['year'] ?? date('Y'));

    // Monthly admissions for the year (12 months)
    $monthly = [];
    for ($m = 1; $m <= 12; $m++) {
        $st = $db->prepare("SELECT COUNT(*) FROM students WHERE YEAR(admission_date)=? AND MONTH(admission_date)=?");
        $st->execute([$year, $m]);
        $monthly[] = ['month' => $m, 'count' => (int)$st->fetchColumn()];
    }

    // Collection: this month, last month, all time
    $y = (int)date('Y'); $cm = (int)date('n');
    $lm = $cm === 1 ? 12 : $cm - 1;
    $ly = $cm === 1 ? $y - 1 : $y;

    $q = function($sql, $params=[]) use ($db) {
        $s = $db->prepare($sql); $s->execute($params); return (int)$s->fetchColumn();
    };
    $thisMonth    = $q("SELECT COALESCE(SUM(amount),0) FROM payments WHERE YEAR(date)=? AND MONTH(date)=?",[$y,$cm]);
    $lastMonth    = $q("SELECT COALESCE(SUM(amount),0) FROM payments WHERE YEAR(date)=? AND MONTH(date)=?",[$ly,$lm]);
    $totalAll     = $q("SELECT COALESCE(SUM(amount),0) FROM payments");

    // Total pending dues (dynamic)
    $allStmt = $db->query("SELECT s.*, c.monthly_fee, c.yearly_fee, c.duration FROM students s LEFT JOIN courses c ON c.code=s.course WHERE s.status='studying'");
    $totalDue = 0;
    foreach ($allStmt->fetchAll() as $row) { $totalDue += compute_due($row); }

    // Course-wise: student count, collected, pending
    $cwStmt = $db->query("SELECT s.course, COUNT(DISTINCT s.id) as student_count, COALESCE(SUM(p.amount),0) as collected FROM students s LEFT JOIN payments p ON p.student_id=s.id GROUP BY s.course ORDER BY collected DESC");
    $courseWise = array_map(function($r){ return ['course'=>$r['course'],'studentCount'=>(int)$r['student_count'],'collected'=>(int)$r['collected']]; }, $cwStmt->fetchAll());

    // Serious defaulters (2+ months overdue, studying)
    $seriousStmt = $db->query("SELECT s.*, c.monthly_fee, c.yearly_fee, c.duration FROM students s LEFT JOIN courses c ON c.code=s.course WHERE s.status='studying'");
    $serious = [];
    foreach ($seriousStmt->fetchAll() as $row) {
        $due = compute_due($row);
        if ($due <= 0) continue;
        $per = max(0,(int)$row['monthly_fee']-(int)$row['waiver_amount']);
        if ($per <= 0) continue;
        $adm = new DateTime($row['admission_date']??date('Y-m-d'));
        $diff = (new DateTime())->diff($adm);
        $elapsed = $diff->y*12+$diff->m;
        $mPaid = (int)floor((int)$row['paid']/$per);
        $mOverdue = max(0,$elapsed-$mPaid);
        if ($mOverdue >= 2) {
            $serious[] = ['id'=>$row['id'],'name'=>$row['name'],'course'=>$row['course'],'monthsOverdue'=>$mOverdue,'due'=>$due,'contact'=>$row['contact']??''];
        }
    }
    usort($serious, fn($a,$b)=>$b['monthsOverdue']-$a['monthsOverdue']);

    json_ok([
        'year'             => $year,
        'monthlyAdmissions'=> $monthly,
        'thisMonth'        => $thisMonth,
        'lastMonth'        => $lastMonth,
        'totalCollected'   => $totalAll,
        'totalDue'         => $totalDue,
        'courseWise'       => $courseWise,
        'seriousDefaulters'=> $serious,
    ]);
}
