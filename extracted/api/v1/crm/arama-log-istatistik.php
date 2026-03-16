<?php
/**
 * GET /api/v1/crm/arama-log-istatistik.php
 * Arama istatistikleri (toplam, gelen, giden, cevapsız, ort. süre, kayıtlı)
 * Params: baslangic, bitis (opsiyonel tarih filtresi)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($baslangic !== '') {
    $where[] = 'arama_tarihi >= ?';
    $params[] = $baslangic . ' 00:00:00';
}
if ($bitis !== '') {
    $where[] = 'arama_tarihi <= ?';
    $params[] = $bitis . ' 23:59:59';
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    // TOPLAM ARAMA
    $stmt = $db->prepare("SELECT COUNT(*) as toplam FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $toplam = (int)$stmt->fetch()['toplam'];

    // GELEN
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " yon = 'gelen'");
    $stmt->execute($params);
    $gelen = (int)$stmt->fetch()['sayi'];

    // GİDEN
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " yon = 'giden'");
    $stmt->execute($params);
    $giden = (int)$stmt->fetch()['sayi'];

    // CEVAPSIZ
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " durum IN ('cevapsiz','mesgul','iptal')");
    $stmt->execute($params);
    $cevapsiz = (int)$stmt->fetch()['sayi'];

    // ORT. SÜRE (saniye)
    $stmt = $db->prepare("SELECT COALESCE(AVG(sure), 0) as ort FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " sure > 0");
    $stmt->execute($params);
    $ortSure = round((float)$stmt->fetch()['ort']);

    // KAYITLI (CRM ile eşleşmiş)
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " crm_id IS NOT NULL");
    $stmt->execute($params);
    $kayitli = (int)$stmt->fetch()['sayi'];

    json_success([
        'toplam' => $toplam,
        'gelen' => $gelen,
        'giden' => $giden,
        'cevapsiz' => $cevapsiz,
        'ort_sure' => $ortSure,
        'kayitli' => $kayitli
    ]);
} catch (Exception $e) {
    json_success([
        'toplam' => 0, 'gelen' => 0, 'giden' => 0,
        'cevapsiz' => 0, 'ort_sure' => 0, 'kayitli' => 0
    ]);
}
