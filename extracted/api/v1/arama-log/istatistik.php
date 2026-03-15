<?php
/**
 * GET /api/v1/arama-log/istatistik.php
 * Arama istatistikleri
 * Params: ?donem=gunluk|haftalik|aylik &tarih_bas=2025-01-01 &tarih_son=2025-12-31 &kullanici_id=1
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('GET');

$user = auth_required();

ensure_arama_log_table();

$db = getDB();

// Tablo var mi kontrol et - yoksa bos veri don
$tabloVar = false;
try {
    $db->query("SELECT 1 FROM arama_loglari LIMIT 1");
    $tabloVar = true;
} catch (\Exception $e) {
    error_log('[ARAMA-LOG] Tablo bulunamadi: ' . $e->getMessage());
}

if (!$tabloVar) {
    json_success([
        'genel' => [
            'toplam_arama' => 0, 'gelen_arama' => 0, 'giden_arama' => 0,
            'cevaplanan' => 0, 'cevapsiz' => 0, 'reddedilen' => 0,
            'ort_sure' => 0, 'en_uzun_gorusme' => 0, 'toplam_sure' => 0, 'kayitli_gorusme' => 0
        ],
        'grafik' => [],
        'donem' => $_GET['donem'] ?? 'gunluk',
        'en_cok_aranan' => []
    ]);
}

$where = [];
$params = [];

if ($user['rol'] !== 'admin') {
    $where[] = 'kullanici_id = ?';
    $params[] = $user['id'];
} else if (!empty($_GET['kullanici_id'])) {
    $where[] = 'kullanici_id = ?';
    $params[] = (int)$_GET['kullanici_id'];
}

if (!empty($_GET['tarih_bas'])) {
    $where[] = 'baslangic_zamani >= ?';
    $params[] = $_GET['tarih_bas'] . ' 00:00:00';
}
if (!empty($_GET['tarih_son'])) {
    $where[] = 'baslangic_zamani <= ?';
    $params[] = $_GET['tarih_son'] . ' 23:59:59';
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Genel istatistikler
$stmt = $db->prepare("SELECT
    COUNT(*) as toplam_arama,
    SUM(CASE WHEN yon = 'gelen' THEN 1 ELSE 0 END) as gelen_arama,
    SUM(CASE WHEN yon = 'giden' THEN 1 ELSE 0 END) as giden_arama,
    SUM(CASE WHEN durum = 'cevaplandi' THEN 1 ELSE 0 END) as cevaplanan,
    SUM(CASE WHEN durum = 'cevapsiz' THEN 1 ELSE 0 END) as cevapsiz,
    SUM(CASE WHEN durum = 'reddedildi' THEN 1 ELSE 0 END) as reddedilen,
    AVG(CASE WHEN durum = 'cevaplandi' AND sure_saniye > 0 THEN sure_saniye ELSE NULL END) as ort_sure,
    MAX(sure_saniye) as en_uzun_gorusme,
    SUM(sure_saniye) as toplam_sure,
    SUM(CASE WHEN kayit_dosya IS NOT NULL AND kayit_dosya != '' THEN 1 ELSE 0 END) as kayitli_gorusme
    FROM arama_loglari $whereSQL");
$stmt->execute($params);
$genel = $stmt->fetch();

// Donem bazli grafik verisi
$donem = $_GET['donem'] ?? 'gunluk';
switch ($donem) {
    case 'haftalik':
        $groupBy = "DATE_FORMAT(baslangic_zamani, '%x-W%v')";
        $labelFormat = "DATE_FORMAT(baslangic_zamani, '%x-W%v')";
        break;
    case 'aylik':
        $groupBy = "DATE_FORMAT(baslangic_zamani, '%Y-%m')";
        $labelFormat = "DATE_FORMAT(baslangic_zamani, '%Y-%m')";
        break;
    default: // gunluk
        $groupBy = "DATE(baslangic_zamani)";
        $labelFormat = "DATE(baslangic_zamani)";
        break;
}

$grafikSQL = "SELECT
    $labelFormat as etiket,
    COUNT(*) as toplam,
    SUM(CASE WHEN yon = 'gelen' THEN 1 ELSE 0 END) as gelen,
    SUM(CASE WHEN yon = 'giden' THEN 1 ELSE 0 END) as giden,
    SUM(CASE WHEN durum = 'cevaplandi' THEN 1 ELSE 0 END) as cevaplanan,
    SUM(CASE WHEN durum = 'cevapsiz' THEN 1 ELSE 0 END) as cevapsiz
    FROM arama_loglari
    $whereSQL
    GROUP BY $groupBy
    ORDER BY etiket DESC
    LIMIT 30";

$stmt = $db->prepare($grafikSQL);
$stmt->execute($params);
$grafik = array_reverse($stmt->fetchAll());

// En cok aranan numaralar (top 10)
$stmt = $db->prepare("SELECT numara, musteri_adi, COUNT(*) as arama_sayisi,
    SUM(sure_saniye) as toplam_sure,
    MAX(baslangic_zamani) as son_arama
    FROM arama_loglari $whereSQL
    GROUP BY numara, musteri_adi
    ORDER BY arama_sayisi DESC LIMIT 10");
$stmt->execute($params);
$enCokAranan = $stmt->fetchAll();

json_success([
    'genel' => $genel,
    'grafik' => $grafik,
    'donem' => $donem,
    'en_cok_aranan' => $enCokAranan
]);
