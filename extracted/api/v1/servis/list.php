<?php
/**
 * GET /api/v1/servis/list.php
 * Servis listesi — arama, filtreleme, sayfalama
 *
 * Query params: ?durum=aktif&il=Istanbul&arama=xyz&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$durum = clean($_GET['durum'] ?? '');
$il    = clean($_GET['il'] ?? '');
$arama = clean($_GET['arama'] ?? '');

$where = [];
$params = [];

if ($durum !== '') {
    $where[] = 's.durum = ?';
    $params[] = $durum;
}

if ($il !== '') {
    $where[] = 's.il = ?';
    $params[] = $il;
}

if ($arama !== '') {
    $search = "%$arama%";
    $where[] = '(s.firma_adi LIKE ? OR s.yetkili_adi LIKE ?)';
    $params = array_merge($params, [$search, $search]);
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM servisler s $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$stmt = $db->prepare("SELECT s.*,
    (SELECT COUNT(*) FROM servis_ihbarlari si WHERE si.servis_id = s.id) as ihbar_sayisi
    FROM servisler s
    $whereSQL
    ORDER BY s.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
