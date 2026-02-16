<?php
/**
 * GET /api/v1/paydas/komisyon-list.php
 * Paydaş komisyon listesi — filtreleme, sayfalama
 *
 * Query params: ?paydas_id=1&dosya_id=5&durum=bekliyor&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$paydasId = (int)($_GET['paydas_id'] ?? 0);
$dosyaId  = (int)($_GET['dosya_id'] ?? 0);
$durum    = clean($_GET['durum'] ?? '');

$where = [];
$params = [];

if ($paydasId) {
    $where[] = 'pk.paydas_id = ?';
    $params[] = $paydasId;
}

if ($dosyaId) {
    $where[] = 'pk.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($durum !== '') {
    $where[] = 'pk.durum = ?';
    $params[] = $durum;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM paydas_komisyonlari pk $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$stmt = $db->prepare("SELECT pk.*, p.ad as paydas_adi, d.dosya_no
    FROM paydas_komisyonlari pk
    LEFT JOIN paydaslar p ON p.id = pk.paydas_id
    LEFT JOIN dosyalar d ON d.id = pk.dosya_id
    $whereSQL
    ORDER BY pk.created_at DESC
    LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
