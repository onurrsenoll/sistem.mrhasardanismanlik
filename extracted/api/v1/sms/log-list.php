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
