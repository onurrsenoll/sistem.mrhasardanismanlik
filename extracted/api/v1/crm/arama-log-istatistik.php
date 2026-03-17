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

$baslangic = clean($_GET['tarih_bas'] ?? $_GET['baslangic'] ?? '');
$bitis = clean($_GET['tarih_son'] ?? $_GET['bitis'] ?? '');

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

    // CEVAPLANAN
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " durum IN ('cevaplandi','gorusme')");
    $stmt->execute($params);
    $cevaplanan = (int)$stmt->fetch()['sayi'];

    // REDDEDİLEN
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL" . ($whereSQL ? ' AND' : ' WHERE') . " durum = 'reddedildi'");
    $stmt->execute($params);
    $reddedilen = (int)$stmt->fetch()['sayi'];

    // EN UZUN GÖRÜŞME
    $stmt = $db->prepare("SELECT COALESCE(MAX(sure), 0) as maks FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $enUzun = (int)$stmt->fetch()['maks'];

    // TOPLAM SÜRE
    $stmt = $db->prepare("SELECT COALESCE(SUM(sure), 0) as toplam FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $toplamSure = (int)$stmt->fetch()['toplam'];

    // EN ÇOK ARANAN
    $enCokSQL = "SELECT arayan as numara, arayan_adi as ad, COUNT(*) as adet FROM arama_loglari $whereSQL GROUP BY arayan ORDER BY adet DESC LIMIT 10";
    $stmt = $db->prepare($enCokSQL);
    $stmt->execute($params);
    $enCokAranan = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_success([
        'genel' => [
            'toplam_arama' => $toplam,
            'gelen_arama' => $gelen,
            'giden_arama' => $giden,
            'cevaplanan' => $cevaplanan,
            'cevapsiz' => $cevapsiz,
            'reddedilen' => $reddedilen,
            'ort_sure' => $ortSure,
            'en_uzun_gorusme' => $enUzun,
            'toplam_sure' => $toplamSure,
            'kayitli_gorusme' => $kayitli,
        ],
        'en_cok_aranan' => $enCokAranan,
    ]);
} catch (Exception $e) {
    json_success([
        'genel' => [
            'toplam_arama' => 0, 'gelen_arama' => 0, 'giden_arama' => 0,
            'cevaplanan' => 0, 'cevapsiz' => 0, 'reddedilen' => 0,
            'ort_sure' => 0, 'en_uzun_gorusme' => 0, 'toplam_sure' => 0,
            'kayitli_gorusme' => 0,
        ],
        'en_cok_aranan' => [],
    ]);
}
