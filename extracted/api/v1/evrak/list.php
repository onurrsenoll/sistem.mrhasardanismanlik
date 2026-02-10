<?php
/**
 * GET /api/v1/evrak/list.php?dosya_id=1
 * Evrak listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$evrakTuru = clean($_GET['evrak_turu'] ?? '');

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'e.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($evrakTuru !== '') {
    $where[] = 'e.evrak_turu = ?';
    $params[] = $evrakTuru;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM evraklar e $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$stmt = $db->prepare("SELECT e.id, e.dosya_id, e.evrak_turu, e.dosya_adi, e.dosya_boyutu, e.mime_type, e.created_at, u.ad_soyad as kullanici_adi, d.dosya_no
    FROM evraklar e
    LEFT JOIN users u ON u.id = e.kullanici_id
    LEFT JOIN dosyalar d ON d.id = e.dosya_id
    $whereSQL
    ORDER BY e.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
