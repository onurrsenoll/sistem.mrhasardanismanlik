<?php
/**
 * GET /api/v1/ajanda/list.php?ay=2026-02&tamamlandi=0
 * Ajanda/görev listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$ay = clean($_GET['ay'] ?? '');
$tamamlandi = isset($_GET['tamamlandi']) ? (int)$_GET['tamamlandi'] : -1;
$oncelik = clean($_GET['oncelik'] ?? '');
$dosyaId = (int)($_GET['dosya_id'] ?? 0);

$where = ['a.kullanici_id = ?'];
$params = [$user['id']];

// Admin tüm görevleri görebilir
if ($user['rol'] === 'admin' && !empty($_GET['tum'])) {
    $where = [];
    $params = [];
}

if ($ay !== '') {
    $where[] = "DATE_FORMAT(a.tarih, '%Y-%m') = ?";
    $params[] = $ay;
}

if ($tamamlandi >= 0) {
    $where[] = 'a.tamamlandi = ?';
    $params[] = $tamamlandi;
}

if ($oncelik !== '') {
    $where[] = 'a.oncelik = ?';
    $params[] = $oncelik;
}

if ($dosyaId) {
    $where[] = 'a.dosya_id = ?';
    $params[] = $dosyaId;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM ajanda a $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$dataSQL = "SELECT a.*, u.ad_soyad as kullanici_adi, d.dosya_no
    FROM ajanda a
    LEFT JOIN users u ON u.id = a.kullanici_id
    LEFT JOIN dosyalar d ON d.id = a.dosya_id
    $whereSQL
    ORDER BY a.tarih ASC
    LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
