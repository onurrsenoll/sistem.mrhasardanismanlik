<?php
/**
 * GET /api/v1/muhasebe/gelir-list.php
 * Gelir kayıtları listesi
 * Params: dosya_id, gelir_turu, tahsilat_durumu, baslangic, bitis, page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$gelirTuru = clean($_GET['gelir_turu'] ?? '');
$tahsilatDurumu = clean($_GET['tahsilat_durumu'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'g.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($gelirTuru !== '') {
    $where[] = 'g.gelir_turu = ?';
    $params[] = $gelirTuru;
}

if ($tahsilatDurumu !== '') {
    $where[] = 'g.tahsilat_durumu = ?';
    $params[] = $tahsilatDurumu;
}

if ($baslangic !== '') {
    $where[] = 'DATE(g.created_at) >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'DATE(g.created_at) <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam kayıt
$stmt = $db->prepare("SELECT COUNT(*) as total FROM gelirler g $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Toplamlar
$stmt = $db->prepare("SELECT
    COALESCE(SUM(g.tutar), 0) as toplam_tutar,
    COALESCE(SUM(CASE WHEN g.tahsilat_durumu = 'tahsil_edildi' THEN g.tutar ELSE 0 END), 0) as tahsil_edilen,
    COALESCE(SUM(CASE WHEN g.tahsilat_durumu = 'bekliyor' THEN g.tutar ELSE 0 END), 0) as bekleyen
    FROM gelirler g $whereSQL");
$stmt->execute($params);
$totals = $stmt->fetch();

// Liste
$stmt = $db->prepare("SELECT g.*, d.dosya_no, k.ad as kasa_adi, u.ad_soyad as kullanici_adi
    FROM gelirler g
    LEFT JOIN dosyalar d ON d.id = g.dosya_id
    LEFT JOIN kasalar k ON k.id = g.kasa_id
    LEFT JOIN users u ON u.id = g.kullanici_id
    $whereSQL
    ORDER BY g.id DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'totals' => [
        'toplam_tutar' => (float)$totals['toplam_tutar'],
        'tahsil_edilen' => (float)$totals['tahsil_edilen'],
        'bekleyen' => (float)$totals['bekleyen']
    ],
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
