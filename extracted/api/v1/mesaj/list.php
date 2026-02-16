<?php
/**
 * GET /api/v1/mesaj/list.php
 * Gelen mesajlar listesi (alici_id = current user)
 * Params: okunmamis (0/1), arama (konu/icerik search), page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$okunmamis = isset($_GET['okunmamis']) ? (int)$_GET['okunmamis'] : -1;
$arama = clean($_GET['arama'] ?? '');

$where = ['m.alici_id = ?'];
$params = [$user['id']];

if ($okunmamis === 1) {
    $where[] = 'm.okundu = 0';
} elseif ($okunmamis === 0) {
    $where[] = 'm.okundu = 1';
}

if ($arama !== '') {
    $where[] = '(m.konu LIKE ? OR m.icerik LIKE ?)';
    $params[] = "%$arama%";
    $params[] = "%$arama%";
}

$whereSQL = 'WHERE ' . implode(' AND ', $where);

// Toplam kayıt
$stmt = $db->prepare("SELECT COUNT(*) as total FROM mesajlar m $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Liste
$stmt = $db->prepare("SELECT m.*, g.ad_soyad as gonderen_adi
    FROM mesajlar m
    LEFT JOIN users g ON g.id = m.gonderen_id
    $whereSQL
    ORDER BY m.id DESC
    LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

// Okunmamış sayısı
$stmt = $db->prepare('SELECT COUNT(*) as sayi FROM mesajlar WHERE alici_id = ? AND okundu = 0');
$stmt->execute([$user['id']]);
$okunmamisSayi = (int)$stmt->fetch()['sayi'];

json_success([
    'items' => $items,
    'okunmamis_sayisi' => $okunmamisSayi,
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
