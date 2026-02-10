<?php
/**
 * GET /api/v1/servis/ihbar-list.php
 * Servis ihbar listesi — filtreleme, sayfalama
 *
 * Query params: ?servis_id=1&dosya_id=5&durum=beklemede&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$servisId = (int)($_GET['servis_id'] ?? 0);
$dosyaId  = (int)($_GET['dosya_id'] ?? 0);
$durum    = clean($_GET['durum'] ?? '');

$where = [];
$params = [];

if ($servisId) {
    $where[] = 'si.servis_id = ?';
    $params[] = $servisId;
}

if ($dosyaId) {
    $where[] = 'si.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($durum !== '') {
    $where[] = 'si.durum = ?';
    $params[] = $durum;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM servis_ihbarlari si $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$stmt = $db->prepare("SELECT si.*, s.firma_adi as servis_adi, d.dosya_no
    FROM servis_ihbarlari si
    LEFT JOIN servisler s ON s.id = si.servis_id
    LEFT JOIN dosyalar d ON d.id = si.dosya_id
    $whereSQL
    ORDER BY si.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
