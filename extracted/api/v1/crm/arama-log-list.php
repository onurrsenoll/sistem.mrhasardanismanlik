<?php
/**
 * GET /api/v1/crm/arama-log-list.php
 * Arama geçmişi listesi
 * Params: q, yon (gelen/giden), durum, baslangic, bitis, page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$q = clean($_GET['q'] ?? '');
$yon = clean($_GET['yon'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $where[] = '(a.arayan LIKE ? OR a.aranan LIKE ? OR a.arayan_adi LIKE ?)';
    $params = array_merge($params, [$search, $search, $search]);
}

if ($yon !== '') {
    $where[] = 'a.yon = ?';
    $params[] = $yon;
}

if ($durum !== '') {
    $where[] = 'a.durum = ?';
    $params[] = $durum;
}

if ($baslangic !== '') {
    $where[] = 'a.arama_tarihi >= ?';
    $params[] = $baslangic . ' 00:00:00';
}

if ($bitis !== '') {
    $where[] = 'a.arama_tarihi <= ?';
    $params[] = $bitis . ' 23:59:59';
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM arama_loglari a $whereSQL");
    $stmt->execute($params);
    $total = (int)$stmt->fetch()['total'];

    $sql = "SELECT a.*, u.ad_soyad as kullanici_adi
        FROM arama_loglari a
        LEFT JOIN users u ON u.id = a.kullanici_id
        $whereSQL
        ORDER BY a.arama_tarihi DESC
        LIMIT ? OFFSET ?";
    $params[] = (int)$pag['limit'];
    $params[] = (int)$pag['offset'];
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    paginated_response($items, $total, $pag);
} catch (Exception $e) {
    paginated_response([], 0, $pag);
}
