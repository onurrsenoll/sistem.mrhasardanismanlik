<?php
/**
 * GET /api/v1/bildirim/list.php
 * Kullanıcının bildirimleri
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$okundu = isset($_GET['okundu']) ? (int)$_GET['okundu'] : -1;
$tip = clean($_GET['tip'] ?? '');

$where = ['b.alici_id = ?'];
$params = [$user['id']];

if ($okundu >= 0) {
    $where[] = 'b.okundu = ?';
    $params[] = $okundu;
}

if ($tip !== '') {
    $where[] = 'b.tip = ?';
    $params[] = $tip;
}

$whereSQL = 'WHERE ' . implode(' AND ', $where);

$stmt = $db->prepare("SELECT COUNT(*) as total FROM bildirimler b $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$dataSQL = "SELECT b.*, g.ad_soyad as gonderen_adi, d.dosya_no
    FROM bildirimler b
    LEFT JOIN users g ON g.id = b.gonderen_id
    LEFT JOIN dosyalar d ON d.id = b.ilgili_dosya_id
    $whereSQL
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

// Frontend 'mesaj' ve 'tur' bekler
foreach ($items as &$item) {
    $item['mesaj'] = $item['icerik'] ?? '';
    $item['tur'] = $item['tip'] ?? 'bildirim';
}
unset($item);

paginated_response($items, $total, $pag);
