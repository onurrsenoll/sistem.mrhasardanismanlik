<?php
/**
 * GET /api/v1/ortak/hareket-list.php
 * Ortak hareket listesi — filtreleme, sayfalama
 *
 * Query params: ?ortak_id=1&dosya_id=5&islem_turu=pay&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$ortakId   = (int)($_GET['ortak_id'] ?? 0);
$dosyaId   = (int)($_GET['dosya_id'] ?? 0);
$islemTuru = clean($_GET['islem_turu'] ?? '');

$where = [];
$params = [];

if ($ortakId) {
    $where[] = 'oh.ortak_id = ?';
    $params[] = $ortakId;
}

if ($dosyaId) {
    $where[] = 'oh.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($islemTuru !== '') {
    $where[] = 'oh.islem_turu = ?';
    $params[] = $islemTuru;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM ortak_hareketleri oh $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$stmt = $db->prepare("SELECT oh.*, d.dosya_no, o.ad_soyad as ortak_adi
    FROM ortak_hareketleri oh
    LEFT JOIN dosyalar d ON d.id = oh.dosya_id
    LEFT JOIN ortaklar o ON o.id = oh.ortak_id
    $whereSQL
    ORDER BY oh.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
