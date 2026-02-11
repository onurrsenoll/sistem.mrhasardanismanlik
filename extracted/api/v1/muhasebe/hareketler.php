<?php
/**
 * GET /api/v1/muhasebe/hareketler.php?kasa_id=1&baslangic=2026-01-01&bitis=2026-12-31
 * Kasa hareketleri listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();
$pag = get_pagination();

$kasaId = (int)($_GET['kasa_id'] ?? 0);
// Frontend 'tur' filtresi gönderir
$islemTuru = clean($_GET['islem_turu'] ?? $_GET['tur'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');
$dosyaId = (int)($_GET['dosya_id'] ?? 0);

$where = [];
$params = [];

if ($kasaId) {
    $where[] = 'kh.kasa_id = ?';
    $params[] = $kasaId;
}

if ($islemTuru !== '') {
    $where[] = 'kh.islem_turu = ?';
    $params[] = $islemTuru;
}

if ($baslangic !== '') {
    $where[] = 'DATE(kh.created_at) >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'DATE(kh.created_at) <= ?';
    $params[] = $bitis;
}

if ($dosyaId) {
    $where[] = 'kh.dosya_id = ?';
    $params[] = $dosyaId;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM kasa_hareketleri kh $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$stmt = $db->prepare("SELECT kh.*, k.ad as kasa_adi, u.ad_soyad as kullanici_adi, d.dosya_no
    FROM kasa_hareketleri kh
    LEFT JOIN kasalar k ON k.id = kh.kasa_id
    LEFT JOIN users u ON u.id = kh.kullanici_id
    LEFT JOIN dosyalar d ON d.id = kh.dosya_id
    $whereSQL
    ORDER BY kh.id DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

// Frontend 'tur' ve 'tarih' bekler
foreach ($items as &$item) {
    $item['tur'] = $item['islem_turu'] ?? '';
    $item['tarih'] = $item['created_at'] ? substr($item['created_at'], 0, 10) : '';
}
unset($item);

paginated_response($items, $total, $pag);
