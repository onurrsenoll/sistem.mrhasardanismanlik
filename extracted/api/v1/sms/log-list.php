<?php
/**
 * GET /api/v1/sms/log-list.php
 * SMS log listesi
 * Params: ?dosya_id=1&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);

$db = getDB();

// Tablo yoksa oluştur
try {
    $db->exec("CREATE TABLE IF NOT EXISTS sms_loglari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telefon VARCHAR(30) NOT NULL,
        mesaj TEXT NOT NULL,
        dosya_id INT DEFAULT NULL,
        kullanici_id INT DEFAULT NULL,
        durum VARCHAR(20) NOT NULL DEFAULT 'bekliyor',
        sonuc_mesaj VARCHAR(500) DEFAULT NULL,
        bulk_id VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_dosya (dosya_id),
        INDEX idx_durum (durum),
        INDEX idx_telefon (telefon),
        INDEX idx_tarih (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

$pagination = get_pagination();

$where = '1=1';
$params = [];

// DOSYA FİLTRE
if (!empty($_GET['dosya_id'])) {
    $where .= ' AND s.dosya_id = ?';
    $params[] = (int)$_GET['dosya_id'];
}

// DURUM FİLTRE
if (!empty($_GET['durum'])) {
    $where .= ' AND s.durum = ?';
    $params[] = $_GET['durum'];
}

// TELEFON ARAMA
if (!empty($_GET['telefon'])) {
    $where .= ' AND s.telefon LIKE ?';
    $params[] = '%' . $_GET['telefon'] . '%';
}

// TOPLAM
$stmtCount = $db->prepare("SELECT COUNT(*) FROM sms_loglari s WHERE $where");
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

// VERİLER
$sql = "
    SELECT s.*, d.dosya_no, u.ad_soyad AS kullanici_adi
    FROM sms_loglari s
    LEFT JOIN dosyalar d ON d.id = s.dosya_id
    LEFT JOIN users u ON u.id = s.kullanici_id
    WHERE $where
    ORDER BY s.created_at DESC
    LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pagination);
