<?php
/**
 * GET /api/v1/sablon/list.php
 * Şablon listesi
 * Params: kategori, aktif (0/1), arama
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$kategori = clean($_GET['kategori'] ?? '');
$aktif = isset($_GET['aktif']) ? (int)$_GET['aktif'] : -1;
$arama = clean($_GET['arama'] ?? '');

$where = [];
$params = [];

if ($kategori !== '') {
    $where[] = 's.kategori = ?';
    $params[] = $kategori;
}

if ($aktif >= 0) {
    $where[] = 's.aktif = ?';
    $params[] = $aktif;
}

if ($arama !== '') {
    $where[] = '(s.ad LIKE ? OR s.icerik LIKE ?)';
    $params[] = "%$arama%";
    $params[] = "%$arama%";
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT s.id, s.ad, s.kategori, s.degiskenler, s.aktif, s.kullanici_id,
    u.ad_soyad as olusturan_adi,
    s.created_at, s.updated_at
    FROM sablonlar s
    LEFT JOIN users u ON u.id = s.kullanici_id
    $whereSQL
    ORDER BY s.kategori, s.ad");
$stmt->execute($params);
$items = $stmt->fetchAll();

// degiskenler JSON decode
foreach ($items as &$item) {
    if (!empty($item['degiskenler'])) {
        $decoded = json_decode($item['degiskenler'], true);
        $item['degiskenler'] = is_array($decoded) ? $decoded : [];
    } else {
        $item['degiskenler'] = [];
    }
}
unset($item);

json_success($items);
