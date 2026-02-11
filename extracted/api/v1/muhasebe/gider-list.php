<?php
/**
 * GET /api/v1/muhasebe/gider-list.php
 * Gider kayıtları listesi
 * Params: dosya_id, gider_turu, baslangic, bitis, page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
// Frontend 'kategori' filtresi gönderir
$giderTuru = clean($_GET['gider_turu'] ?? $_GET['kategori'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'g.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($giderTuru !== '') {
    $where[] = 'g.gider_turu = ?';
    $params[] = $giderTuru;
}

if ($baslangic !== '') {
    $where[] = 'g.islem_tarihi >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'g.islem_tarihi <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam kayıt
$stmt = $db->prepare("SELECT COUNT(*) as total FROM giderler g $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Toplamlar
$stmt = $db->prepare("SELECT COALESCE(SUM(g.tutar), 0) as toplam_tutar FROM giderler g $whereSQL");
$stmt->execute($params);
$toplamTutar = (float)$stmt->fetch()['toplam_tutar'];

// Liste
$stmt = $db->prepare("SELECT g.*, d.dosya_no, k.ad as kasa_adi, u.ad_soyad as kullanici_adi
    FROM giderler g
    LEFT JOIN dosyalar d ON d.id = g.dosya_id
    LEFT JOIN kasalar k ON k.id = g.kasa_id
    LEFT JOIN users u ON u.id = g.kullanici_id
    $whereSQL
    ORDER BY g.id DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

// Frontend 'kategori' ve 'tarih' bekler
foreach ($items as &$item) {
    $item['kategori'] = $item['gider_turu'] ?? '';
    $item['tarih'] = $item['islem_tarihi'] ?? '';
}
unset($item);

json_success([
    'items' => $items,
    'totals' => [
        'toplam_tutar' => $toplamTutar
    ],
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
