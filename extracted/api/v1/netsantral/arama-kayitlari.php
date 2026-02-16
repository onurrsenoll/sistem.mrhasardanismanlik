<?php
/**
 * GET /api/v1/netsantral/arama-kayitlari.php
 * Arama kayıtlarını listeler
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$pagination = get_pagination();
$where = [];
$params = [];

// Filtreler
$yon = clean($_GET['yon'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$arayan = clean($_GET['arayan'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

if ($yon !== '') {
    $where[] = 'ak.yon = ?';
    $params[] = $yon;
}
if ($durum !== '') {
    $where[] = 'ak.durum = ?';
    $params[] = $durum;
}
if ($arayan !== '') {
    $where[] = '(ak.arayan LIKE ? OR ak.aranan LIKE ?)';
    $search = "%$arayan%";
    $params[] = $search;
    $params[] = $search;
}
if ($baslangic !== '') {
    $where[] = 'ak.created_at >= ?';
    $params[] = $baslangic . ' 00:00:00';
}
if ($bitis !== '') {
    $where[] = 'ak.created_at <= ?';
    $params[] = $bitis . ' 23:59:59';
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$countStmt = $db->prepare("SELECT COUNT(*) FROM arama_kayitlari ak $whereSQL");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Kayıtlar
$sql = "SELECT ak.*, u.ad_soyad as kullanici_adi, c.ad_soyad as crm_adi, d.dosya_no
        FROM arama_kayitlari ak
        LEFT JOIN users u ON u.id = ak.kullanici_id
        LEFT JOIN crm c ON c.id = ak.crm_id
        LEFT JOIN dosyalar d ON d.id = ak.dosya_id
        $whereSQL
        ORDER BY ak.created_at DESC
        LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pagination);
