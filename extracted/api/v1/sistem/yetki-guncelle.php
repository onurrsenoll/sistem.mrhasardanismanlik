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

$kullanici_id = (int)($data['kullanici_id'] ?? 0);
$yetkiler = $data['yetkiler'] ?? [];

if (!$kullanici_id || !is_array($yetkiler)) {
    json_error('GEÇERSİZ VERİ');
}

// Delete existing and re-insert
$db->beginTransaction();
try {
    $db->prepare('DELETE FROM yetkiler WHERE kullanici_id = ?')->execute([$kullanici_id]);

    $stmt = $db->prepare('INSERT INTO yetkiler (kullanici_id, modul, islem, izin) VALUES (?, ?, ?, ?)');
    foreach ($yetkiler as $y) {
        $stmt->execute([
            $kullanici_id,
            $y['modul'],
            $y['islem'],
            (int)($y['izin'] ?? 0)
        ]);
    }

    $db->commit();

    log_islem($db, $user['id'], 'YETKI_GUNCELLE', 'Kullanıcı #' . $kullanici_id . ' yetkileri güncellendi', 'KULLANICI', $kullanici_id);

    json_success(['message' => 'YETKİLER GÜNCELLENDİ']);
} catch (Exception $e) {
    $db->rollBack();
    json_error('YETKİ GÜNCELLEME HATASI');
}
