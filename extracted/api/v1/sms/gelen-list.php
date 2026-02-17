<?php
/**
 * GET /api/v1/sms/gelen-list.php
 * Gelen SMS listesi
 * Params: ?page=1&limit=25&okundu=0&telefon=532&arama=metin
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);

$db = getDB();

// Tablo yoksa oluştur
try {
    $db->exec("CREATE TABLE IF NOT EXISTS gelen_smsler (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) DEFAULT NULL,
        gonderen VARCHAR(30) NOT NULL,
        alici VARCHAR(30) DEFAULT NULL,
        mesaj TEXT NOT NULL,
        mesaj_tarihi DATETIME DEFAULT NULL,
        crm_id INT DEFAULT NULL,
        dosya_id INT DEFAULT NULL,
        gonderen_adi VARCHAR(100) DEFAULT NULL,
        okundu TINYINT(1) DEFAULT 0,
        islendi TINYINT(1) DEFAULT 0,
        notlar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gonderen (gonderen),
        INDEX idx_okundu (okundu),
        INDEX idx_tarih (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

$pagination = get_pagination();

$where = '1=1';
$params = [];

// OKUNDU FİLTRE
if (isset($_GET['okundu']) && $_GET['okundu'] !== '') {
    $where .= ' AND g.okundu = ?';
    $params[] = (int)$_GET['okundu'];
}

// TELEFON ARAMA
if (!empty($_GET['telefon'])) {
    $where .= ' AND g.gonderen LIKE ?';
    $params[] = '%' . $_GET['telefon'] . '%';
}

// MESAJ İÇERİK ARAMA
if (!empty($_GET['arama'])) {
    $where .= ' AND (g.mesaj LIKE ? OR g.gonderen_adi LIKE ?)';
    $params[] = '%' . $_GET['arama'] . '%';
    $params[] = '%' . $_GET['arama'] . '%';
}

// DOSYA FİLTRE
if (!empty($_GET['dosya_id'])) {
    $where .= ' AND g.dosya_id = ?';
    $params[] = (int)$_GET['dosya_id'];
}

// TOPLAM
$stmtCount = $db->prepare("SELECT COUNT(*) FROM gelen_smsler g WHERE $where");
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

// OKUNMAMIŞ TOPLAM
$stmtUnread = $db->query("SELECT COUNT(*) FROM gelen_smsler WHERE okundu = 0");
$okunmamis = (int)$stmtUnread->fetchColumn();

// VERİLER
$sql = "
    SELECT g.*, d.dosya_no
    FROM gelen_smsler g
    LEFT JOIN dosyalar d ON d.id = g.dosya_id
    WHERE $where
    ORDER BY g.created_at DESC
    LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'okunmamis' => $okunmamis,
    'pagination' => [
        'page' => $pagination['page'],
        'limit' => $pagination['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pagination['limit'])
    ]
]);
