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

if (!is_array($data) || empty($data)) {
    json_error('GEÇERSİZ VERİ');
}

try {
    // Tablo yoksa oluştur
    $db->exec("CREATE TABLE IF NOT EXISTS ayarlar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        anahtar VARCHAR(100) NOT NULL UNIQUE,
        deger TEXT,
        tip ENUM('text','number','color','json','image') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

    // UPSERT: varsa güncelle, yoksa ekle
    $stmt = $db->prepare('INSERT INTO ayarlar (anahtar, deger) VALUES (?, ?) ON DUPLICATE KEY UPDATE deger = VALUES(deger)');
    foreach ($data as $anahtar => $deger) {
        $stmt->execute([$anahtar, $deger]);
    }

    log_action($user['id'], 'AYAR_GUNCELLE', 'Sistem ayarları güncellendi', 'SİSTEM', null);

    json_success(['message' => 'AYARLAR GÜNCELLENDİ']);
} catch (Exception $e) {
    json_error('AYAR GÜNCELLEME HATASI: ' . $e->getMessage());
}
