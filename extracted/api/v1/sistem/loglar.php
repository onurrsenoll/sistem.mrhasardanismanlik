<?php
/**
 * GET /api/v1/sistem/loglar.php
 * Sistem log kayıtları
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);
$db = getDB();
$pag = get_pagination();

$islem = clean($_GET['islem'] ?? '');
$kullaniciId = (int)($_GET['kullanici_id'] ?? 0);
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($islem !== '') {
    $where[] = 'l.islem LIKE ?';
    $params[] = "%$islem%";
}

if ($kullaniciId) {
    $where[] = 'l.kullanici_id = ?';
    $params[] = $kullaniciId;
}

if ($baslangic !== '') {
    $where[] = 'DATE(l.created_at) >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'DATE(l.created_at) <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM log_kayitlari l $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$stmt = $db->prepare("SELECT l.*, u.ad_soyad as kullanici_adi
    FROM log_kayitlari l
    LEFT JOIN users u ON u.id = l.kullanici_id
    $whereSQL
    ORDER BY l.id DESC
    LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
