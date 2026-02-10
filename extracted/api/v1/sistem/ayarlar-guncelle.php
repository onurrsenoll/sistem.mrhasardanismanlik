<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();

if ($user['rol'] !== 'admin') {
    json_error('YETKİSİZ İŞLEM', 403);
}

$db = getDB();
$data = json_body();

if (!is_array($data) || empty($data)) {
    json_error('GEÇERSİZ VERİ');
}

$stmt = $db->prepare('UPDATE ayarlar SET deger = ? WHERE anahtar = ?');
foreach ($data as $anahtar => $deger) {
    $stmt->execute([$deger, $anahtar]);
}

log_islem($db, $user['id'], 'AYAR_GUNCELLE', 'Sistem ayarları güncellendi', 'SİSTEM', null);

json_success(['message' => 'AYARLAR GÜNCELLENDİ']);
