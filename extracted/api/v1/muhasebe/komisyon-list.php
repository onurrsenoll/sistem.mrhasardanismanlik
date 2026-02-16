<?php
/**
 * GET /api/v1/muhasebe/komisyon-list.php
 * Komisyon kayıtları listesi
 * Params: dosya_id, durum, ilgili_tip, komisyon_turu, odendi, ortak_id, paydas_id, page, limit
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
// Frontend filtreleri
$durumF = clean($_GET['durum'] ?? '');
$ilgiliTipF = clean($_GET['ilgili_tip'] ?? '');

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

// Frontend durum filtresi: bekliyor, onaylandi, odendi
if ($durumF !== '') {
    if ($durumF === 'odendi') {
        $where[] = 'k.odendi = 1';
    } elseif ($durumF === 'bekliyor' || $durumF === 'onaylandi') {
        $where[] = 'k.odendi = 0';
    }
} elseif ($odendi >= 0) {
    $where[] = 'k.odendi = ?';
    $params[] = $odendi;
}

// Frontend ilgili_tip filtresi: ortak, paydas
if ($ilgiliTipF !== '') {
    if ($ilgiliTipF === 'ortak') {
        $where[] = 'k.ortak_id IS NOT NULL';
    } elseif ($ilgiliTipF === 'paydas') {
        $where[] = 'k.paydas_id IS NOT NULL';
    }
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

// Liste - ortaklar ve paydaslar tablolarından da JOIN
$stmt = $db->prepare("SELECT k.*,
    d.dosya_no,
    ortak.ad_soyad as ortak_adi,
    pds.ad as paydas_adi_tbl,
    personel.ad_soyad as personel_adi,
    kas.ad as kasa_adi
    FROM komisyonlar k
    LEFT JOIN dosyalar d ON d.id = k.dosya_id
    LEFT JOIN ortaklar ortak ON ortak.id = k.ortak_id
    LEFT JOIN paydaslar pds ON pds.id = k.paydas_id
    LEFT JOIN users personel ON personel.id = k.personel_id
    LEFT JOIN kasalar kas ON kas.id = k.kasa_id
    $whereSQL
    ORDER BY k.id DESC
    LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

// Frontend uyumlu alanlar ekle
foreach ($items as &$item) {
    // ilgili_tip ve ilgili_adi hesapla
    if (!empty($item['ortak_id'])) {
        $item['ilgili_tip'] = 'ortak';
        $item['ilgili_id'] = $item['ortak_id'];
        $item['ilgili_adi'] = $item['ortak_adi'] ?? '';
    } elseif (!empty($item['paydas_id'])) {
        $item['ilgili_tip'] = 'paydas';
        $item['ilgili_id'] = $item['paydas_id'];
        $item['ilgili_adi'] = $item['paydas_adi_tbl'] ?? '';
    } elseif (!empty($item['personel_id'])) {
        $item['ilgili_tip'] = 'personel';
        $item['ilgili_id'] = $item['personel_id'];
        $item['ilgili_adi'] = $item['personel_adi'] ?? '';
    } else {
        $item['ilgili_tip'] = '';
        $item['ilgili_id'] = null;
        $item['ilgili_adi'] = '';
    }

    // durum alanı: odendi (1) → 'odendi', (0) → 'bekliyor'
    if ($item['odendi'] == 1) {
        $item['durum'] = 'odendi';
    } else {
        $item['durum'] = 'bekliyor';
    }

    // Gereksiz alan temizliği
    unset($item['paydas_adi_tbl']);
}
unset($item);

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
