<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

// auth_required() YETKI_MAP üzerinden sistem/sistem-ayarlar yetki kontrolünü otomatik yapar.
// Admin kullanıcılar has_yetki() içinde bypass edilir; diğer kullanıcılar için admin panelinden
// 'sistem > sistem-ayarlar' izni atanmamışsa 403 döner. Hard-coded rol kontrolü kaldırıldı.
$user = auth_required();

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
