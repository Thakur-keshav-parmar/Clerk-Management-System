<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../helpers/db.php';

$db = get_db();

// ── 5 Courses ────────────────────────────────────────────────────────────────
$courses = [
    ['BCA',   'Bachelor of Computer Applications', 3, 2500, 25000],
    ['DCA',   'Diploma in Computer Applications',  1, 1500, 15000],
    ['TALLY', 'Tally with GST & Accounting',       1, 1200, 12000],
    ['ADCA',  'Advance Diploma in Computers',      2, 2000, 20000],
    ['RS-CIT','RS-CIT Computer Course',            1, 1000, 10000],
];
foreach ($courses as [$code, $name, $dur, $mfee, $yfee]) {
    $db->prepare('INSERT IGNORE INTO courses (code, name, duration, monthly_fee, yearly_fee) VALUES (?,?,?,?,?)')
       ->execute([$code, $name, $dur, $mfee, $yfee]);
    echo "Course: $code — $name\n";
}

// ── Roll number generator ─────────────────────────────────────────────────────
function next_id_dummy($db): string {
    $yymm   = date('ym');
    $prefix = 'E' . $yymm . '-';
    $stmt   = $db->prepare("SELECT id FROM students WHERE id LIKE ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$prefix . '%']);
    $last = $stmt->fetchColumn();
    $seq  = $last ? ((int)substr($last, strlen($prefix)) + 1) : 850;
    return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
}

// ── Dummy student data ────────────────────────────────────────────────────────
$first = ['Ravi','Priya','Amit','Sunita','Rahul','Neha','Vikram','Pooja','Suresh','Anita','Deepak','Kavita','Manoj','Rekha','Ajay'];
$last  = ['Sharma','Gupta','Verma','Singh','Kumar','Patel','Yadav','Joshi','Mehta','Agarwal','Trivedi','Dubey','Mishra','Tiwari','Soni'];

$statuses = ['studying','studying','studying','studying','break','left','passout'];
$methods  = ['Cash','UPI','Cheque'];

$genders = ['M','M','F','F','M'];
$counter  = 0;

foreach ($courses as [$code, $name, $dur, $mfee, $yfee]) {
    for ($i = 0; $i < 3; $i++) {
        $fname  = $first[($counter * 3 + $i) % count($first)];
        $lname  = $last[($counter + $i + 2) % count($last)];
        $sname  = $fname . ' ' . $lname;
        $status = $statuses[array_rand(['studying','studying','studying','break'])];

        // Admission date: 1–12 months ago
        $mAgo   = rand(1, 12);
        $admDt  = (new DateTime())->modify("-$mAgo months")->format('Y-m-d');
        $dob    = date('Y-m-d', mktime(0,0,0, rand(1,12), rand(1,28), rand(1995,2005)));

        $feeType = (rand(0,1) === 0) ? 'monthly' : 'yearly';
        $baseFee = $feeType === 'monthly' ? $mfee : $yfee;
        $waiver  = (rand(0,3) === 0) ? rand(100, 500) : 0;
        $perPeriod = max(0, $baseFee - $waiver);
        $nPeriods  = $feeType === 'yearly' ? max(1,$dur) : max(1,$dur*12);
        $totalFees = $perPeriod * $nPeriods;

        // Random paid amount
        $paidPeriods = rand(0, $nPeriods);
        $paid = $paidPeriods * $perPeriod;
        $due  = max(0, $totalFees - $paid);

        // Build installments
        $installments = [];
        $admDate = new DateTime($admDt);
        $each    = $perPeriod;
        for ($k = 0; $k < $nPeriods; $k++) {
            $dueDt = clone $admDate;
            if ($feeType === 'yearly') $dueDt->modify("+$k years");
            else $dueDt->modify("+$k months");
            $installments[] = [
                'num'     => $k+1,
                'amount'  => $each,
                'dueDate' => $dueDt->format('Y-m-d'),
                'paid'    => $k < $paidPeriods,
                'partial' => false,
                'paidOn'  => $k < $paidPeriods ? $dueDt->format('Y-m-d') : null,
            ];
        }

        $sid = next_id_dummy($db);
        $aadhaar = rand(200000000000, 999999999999);
        $contact = '9' . rand(100000000, 999999999);
        $fContact= '9' . rand(100000000, 999999999);
        $addr    = 'House No. ' . rand(1,200) . ', Ward ' . rand(1,20) . ', ' . ['Jaipur','Ajmer','Jodhpur','Bikaner','Kota'][rand(0,4)];
        $fName   = $last[($counter + $i) % count($last)] . ' ' . $last[($i+3) % count($last)];

        $db->prepare("INSERT INTO students
            (id, name, course, dob, contact, address, father_name, father_mobile, aadhaar,
             fee_type, waiver_amount, total_fees, paid, due, fee_confirmed, installments,
             admission_date, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)")
           ->execute([
               $sid, $sname, $code, $dob, $contact, $addr, $fName, $fContact, $aadhaar,
               $feeType, $waiver, $totalFees, $paid, $due,
               json_encode($installments), $admDt, 'studying'
           ]);

        // Add payment records for paid installments
        foreach ($installments as $inst) {
            if (!$inst['paid']) continue;
            $txnId = 'TXN' . strtoupper(substr(md5(uniqid()), 0, 12));
            $pDate = $inst['dueDate'];
            $db->prepare("INSERT IGNORE INTO payments
                (txn_id, student_id, student_name, course, amount, method, date, display_time, time_iso, status)
                VALUES (?,?,?,?,?,?,?,?,?,?)")
               ->execute([
                   $txnId, $sid, $sname, $code, $inst['amount'],
                   $methods[array_rand($methods)], $pDate,
                   date('h:i A', rand(28800,61200)),
                   $pDate . 'T' . date('H:i:s', rand(28800,61200)) . '+05:30',
                   'Paid'
               ]);
        }

        echo "  [$code] $sid — $sname ($feeType, paid $paid / $totalFees)\n";
    }
    $counter++;
}

echo "\nDone! 5 courses, 15 students added.\n";
