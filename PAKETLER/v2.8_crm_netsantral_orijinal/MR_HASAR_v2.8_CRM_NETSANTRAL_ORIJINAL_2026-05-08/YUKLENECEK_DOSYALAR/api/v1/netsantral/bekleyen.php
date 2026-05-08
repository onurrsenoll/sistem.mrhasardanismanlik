<?php
/**
 * GET /api/v1/netsantral/bekleyen.php
 * NetSantral webhook üzerinden gelen bekleyen çağrıları kontrol eder
 * Frontend bu endpoint'i polling ile kontrol eder
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$db = getDB();

// TABLO YOKSA OLUŞTUR
try {
    $db->exec("CREATE TABLE IF NOT EXISTS netsantral_bekleyen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        arayan_no VARCHAR(30) NOT NULL,
        aranan_no VARCHAR(30) DEFAULT NULL,
        santral_no VARCHAR(30) DEFAULT NULL,
        arama_id VARCHAR(50) DEFAULT NULL,
        tus_bilgisi VARCHAR(10) DEFAULT NULL,
        durum VARCHAR(20) DEFAULT 'bekliyor',
        arayan_adi VARCHAR(100) DEFAULT NULL,
        crm_id INT DEFAULT NULL,
        islendi TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_durum (durum),
        INDEX idx_islendi (islendi),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

// SON 60 SANİYEDEKİ İŞLENMEMİŞ ÇAĞRILARI GETİR
try {
    $stmt = $db->prepare("SELECT * FROM netsantral_bekleyen WHERE islendi = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 60 SECOND) ORDER BY id DESC LIMIT 5");
    $stmt->execute();
    $bekleyenler = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // İŞLENDİ OLARAK İŞARETLE
    if (!empty($bekleyenler)) {
        $ids = array_column($bekleyenler, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->prepare("UPDATE netsantral_bekleyen SET islendi = 1 WHERE id IN ({$placeholders})")->execute($ids);
    }

    // ESKİ KAYITLARI TEMİZLE (1 saatten eski)
    $db->exec("DELETE FROM netsantral_bekleyen WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)");

    json_success($bekleyenler);
} catch (Exception $e) {
    json_success([]);
}
