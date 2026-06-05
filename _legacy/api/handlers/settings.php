<?php
function handle_get_settings(): void {
    $row = get_db()->query("SELECT * FROM institute_settings WHERE id=1")->fetch();
    json_ok([
        'name'    => $row['inst_name']   ?? 'EDUTRON',
        'address' => $row['address']     ?? '',
        'gst'     => $row['gst_number']  ?? '',
        'phone'   => $row['phone']       ?? '',
        'email'   => $row['email']       ?? '',
        'logo'    => $row['logo']        ?? null,
    ]);
}

function handle_update_settings(array $user): void {
    if ($user['role'] !== 'admin') json_error(403, 'Admin only');
    $b = get_body();
    get_db()->prepare("UPDATE institute_settings SET inst_name=?,address=?,gst_number=?,phone=?,email=?,logo=? WHERE id=1")
        ->execute([$b['name']??'EDUTRON',$b['address']??'',$b['gst']??'',$b['phone']??'',$b['email']??'',$b['logo']??null]);
    handle_get_settings();
}
