<?php
/**
 * GET /api/v1/muhasebe/komisyon-list.php
 * Komisyon kayıtları listesi
 * Params: dosya_id, komisyon_turu, odendi, ortak_id, paydas_id, page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$komisyonTuru = clean($_GET['komisyon_turu'] ?? '');
$odendi = isset($_GET['odendi']) ? (int)$_GET['odendi'] : -1;
$ortakId = (int)($_GET['ortak_id'] ?? 0);
$paydasId = (int)($_GET['paydas_id'] ?? 0);

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'k.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($komisyonTuru !== '') {
    $where[] = 'k.komisyon_turu = ?';
    $params[] = $komisyonTuru;
}

if ($odendi >= 0) {
    $where[] = 'k.odendi = ?';
    $params[] = $odendi;
}

if ($ortakId) {
    $where[] = 'k.ortak_id = ?';
    $params[] = $ortakId;
}

if ($paydasId) {
    $where[] = 'k.paydas_id = ?';
    $params[] = $paydasId;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam kayıt
$stmt = $db->prepare("SELECT COUNT(*) as total FROM komisyonlar k $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Liste
$stmt = $db->prepare("SELECT k.*,
    d.dosya_no,
    ortak.ad_soyad as ortak_adi,
    paydas.ad_soyad as paydas_adi,
    personel.ad_soyad as personel_adi,
    kas.ad as kasa_adi
    FROM komisyonlar k
    LEFT JOIN dosyalar d ON d.id = k.dosya_id
    LEFT JOIN users ortak ON ortak.id = k.ortak_id
    LEFT JOIN users paydas ON paydas.id = k.paydas_id
    LEFT JOIN users personel ON personel.id = k.personel_id
    LEFT JOIN kasalar kas ON kas.id = k.kasa_id
    $whereSQL
    ORDER BY k.id DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

// Toplamlar
$stmt = $db->prepare("SELECT
    COALESCE(SUM(k.tutar), 0) as toplam_tutar,
    COALESCE(SUM(CASE WHEN k.odendi = 1 THEN k.tutar ELSE 0 END), 0) as odenen_toplam,
    COALESCE(SUM(CASE WHEN k.odendi = 0 THEN k.tutar ELSE 0 END), 0) as bekleyen_toplam
    FROM komisyonlar k $whereSQL");
$stmt->execute($params);
$totals = $stmt->fetch();

json_success([
    'items' => $items,
    'totals' => [
        'toplam_tutar' => (float)$totals['toplam_tutar'],
        'odenen_toplam' => (float)$totals['odenen_toplam'],
        'bekleyen_toplam' => (float)$totals['bekleyen_toplam']
    ],
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
