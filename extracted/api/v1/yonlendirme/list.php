<?php
/**
 * GET /api/v1/yonlendirme/list.php
 * Yönlendirme (arama listesi) — arama, filtreleme, sayfalama, istatistikler
 *
 * Query params: ?q=arama&durum=Belirsiz&yonlendiren=X&atanan_id=1&tarih_baslangic=2025-01-01&tarih_bitis=2025-12-31&batch_id=abc&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$q = clean($_GET['q'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$yonlendiren = clean($_GET['yonlendiren'] ?? '');
$atanan = (int)($_GET['atanan_id'] ?? 0);
$tarihBas = clean($_GET['tarih_baslangic'] ?? '');
$tarihBit = clean($_GET['tarih_bitis'] ?? '');
$batchId = clean($_GET['batch_id'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $where[] = '(y.magdur_ad_soyad LIKE ? OR y.magdur_telefon LIKE ? OR y.magdur_tc LIKE ? OR y.yonlendiren LIKE ? OR y.magdur_il LIKE ? OR y.son_durum LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search, $search, $search]);
}

if ($durum !== '') {
    $where[] = 'y.durum = ?';
    $params[] = $durum;
}

if ($yonlendiren !== '') {
    $where[] = 'y.yonlendiren = ?';
    $params[] = $yonlendiren;
}

if ($atanan) {
    $where[] = 'y.atanan_id = ?';
    $params[] = $atanan;
}

if ($tarihBas !== '') {
    $where[] = 'y.yonlendirme_tarihi >= ?';
    $params[] = $tarihBas;
}

if ($tarihBit !== '') {
    $where[] = 'y.yonlendirme_tarihi <= ?';
    $params[] = $tarihBit;
}

if ($batchId !== '') {
    $where[] = 'y.batch_id = ?';
    $params[] = $batchId;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM yonlendirme y $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// İstatistikler (aynı filtrelerle)
$stmt = $db->prepare("SELECT
    COUNT(*) as toplam,
    SUM(CASE WHEN y.durum = 'Belirsiz' THEN 1 ELSE 0 END) as belirsiz,
    SUM(CASE WHEN y.durum = 'Alindi' THEN 1 ELSE 0 END) as alindi,
    SUM(CASE WHEN y.durum = 'Olumsuz' THEN 1 ELSE 0 END) as olumsuz
    FROM yonlendirme y $whereSQL");
$stmt->execute($params);
$stats = $stmt->fetch();

// Veri çek
$stmt = $db->prepare("SELECT y.*, u.ad_soyad as atanan_adi, cb.ad_soyad as olusturan_adi,
    (SELECT COUNT(*) FROM yonlendirme_notlar yn WHERE yn.yonlendirme_id = y.id) as not_sayisi
    FROM yonlendirme y
    LEFT JOIN users u ON u.id = y.atanan_id
    LEFT JOIN users cb ON cb.id = y.created_by
    $whereSQL
    ORDER BY y.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'stats' => [
        'toplam' => (int)$stats['toplam'],
        'belirsiz' => (int)$stats['belirsiz'],
        'alindi' => (int)$stats['alindi'],
        'olumsuz' => (int)$stats['olumsuz']
    ],
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
