<?php
/**
 * GET /api/v1/paydas/komisyon-list.php
 * Paydaş komisyon listesi — filtreleme, sayfalama
 *
 * Query params: ?paydas_id=1&dosya_id=5&odendi=0&page=1&limit=25
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
$odendi   = isset($_GET['odendi']) ? clean($_GET['odendi']) : '';

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

if ($odendi !== '') {
    $where[] = 'pk.odendi = ?';
    $params[] = (int)$odendi;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM paydas_komisyonlari pk $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$stmt = $db->prepare("SELECT pk.*, p.firma_adi as paydas_adi, d.dosya_no
    FROM paydas_komisyonlari pk
    LEFT JOIN paydaslar p ON p.id = pk.paydas_id
    LEFT JOIN dosyalar d ON d.id = pk.dosya_id
    $whereSQL
    ORDER BY pk.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
