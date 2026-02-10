<?php
/**
 * GET /api/v1/tanim/list.php?kategori=sigorta_sirket
 * Tanımlama listesi — kategoriye göre filtreleme
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$kategori = clean($_GET['kategori'] ?? '');
$aktif = isset($_GET['aktif']) ? (int)$_GET['aktif'] : -1;

$where = [];
$params = [];

if ($kategori !== '') {
    $where[] = 'kategori = ?';
    $params[] = $kategori;
}

if ($aktif >= 0) {
    $where[] = 'aktif = ?';
    $params[] = $aktif;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT * FROM tanimlamalar $whereSQL ORDER BY kategori, sira ASC");
$stmt->execute($params);
$items = $stmt->fetchAll();

// Kategorilere göre grupla
if ($kategori === '') {
    $grouped = [];
    foreach ($items as $item) {
        $grouped[$item['kategori']][] = $item;
    }
    json_success($grouped);
} else {
    json_success($items);
}
