<?php
/**
 * GET /api/v1/muhasebe/kasa-list.php
 * Kasa/banka hesapları listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$aktif = isset($_GET['aktif']) ? (int)$_GET['aktif'] : -1;

$where = '';
$params = [];

if ($aktif >= 0) {
    $where = 'WHERE aktif = ?';
    $params[] = $aktif;
}

$stmt = $db->prepare("SELECT k.*,
    (SELECT COUNT(*) FROM kasa_hareketleri kh WHERE kh.kasa_id = k.id) as hareket_sayisi,
    (SELECT kh.created_at FROM kasa_hareketleri kh WHERE kh.kasa_id = k.id ORDER BY kh.id DESC LIMIT 1) as son_hareket
    FROM kasalar k $where ORDER BY k.id");
$stmt->execute($params);
$items = $stmt->fetchAll();

// Frontend 'tur' (küçük harf) bekler, DB 'tip' döndürür
foreach ($items as &$item) {
    $item['tur'] = strtolower($item['tip']);
}
unset($item);

json_success($items);
