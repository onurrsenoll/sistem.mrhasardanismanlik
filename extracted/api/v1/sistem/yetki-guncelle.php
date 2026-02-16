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
$data = get_json_body();

$kullanici_id = (int)($data['kullanici_id'] ?? 0);
$yetkiler = $data['yetkiler'] ?? [];

if (!$kullanici_id || !is_array($yetkiler)) {
    json_error('GEÇERSİZ VERİ');
}

try {
    // Tablo yoksa oluştur
    $db->exec("CREATE TABLE IF NOT EXISTS yetkiler (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kullanici_id INT NOT NULL,
        modul VARCHAR(50) NOT NULL,
        islem VARCHAR(50) NOT NULL,
        izin TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_kullanici_modul_islem (kullanici_id, modul, islem)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

    // Delete existing and re-insert
    $db->beginTransaction();

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

    log_action($user['id'], 'YETKI_GUNCELLE', 'Kullanıcı #' . $kullanici_id . ' yetkileri güncellendi', 'KULLANICI', $kullanici_id);

    json_success(['message' => 'YETKİLER GÜNCELLENDİ']);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('YETKİ GÜNCELLEME HATASI: ' . $e->getMessage());
}
