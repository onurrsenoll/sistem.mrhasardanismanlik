<?php
/**
 * GET /api/v1/netsipp/bekleyen-cagri.php
 * Son 30 saniye içindeki gelen çağrıları döndürür
 * Frontend bu endpoint'i poll eder
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// TABLO YOKSA OLUŞTUR
try {
    $db->exec("CREATE TABLE IF NOT EXISTS arama_loglari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        arayan VARCHAR(30) DEFAULT NULL,
        arayan_adi VARCHAR(100) DEFAULT NULL,
        aranan VARCHAR(30) DEFAULT NULL,
        arama_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
        netsipp_arama_id VARCHAR(50) DEFAULT NULL,
        senaryo VARCHAR(100) DEFAULT NULL,
        yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
        durum VARCHAR(30) DEFAULT 'calıyor',
        sure INT DEFAULT 0,
        crm_id INT DEFAULT NULL,
        kullanici_id INT DEFAULT NULL,
        notlar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_arayan (arayan),
        INDEX idx_aranan (aranan),
        INDEX idx_yon (yon)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

// Son 30 saniye içindeki çağrıları getir
try {
    $stmt = $db->prepare("SELECT al.*,
        c.id as crm_id, c.ad_soyad as crm_ad_soyad, c.dosya_turu as crm_dosya_turu, c.durum as crm_durum
        FROM arama_loglari al
        LEFT JOIN crm c ON (c.telefon LIKE CONCAT('%', REPLACE(al.arayan, ' ', ''), '%') OR c.telefon2 LIKE CONCAT('%', REPLACE(al.arayan, ' ', ''), '%'))
        WHERE al.yon = 'gelen' AND al.durum = 'calıyor' AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
        ORDER BY al.created_at DESC LIMIT 5");
    $stmt->execute();
    $calls = $stmt->fetchAll();
    json_success(['calls' => $calls]);
} catch (Exception $e) {
    json_success(['calls' => []]);
}
