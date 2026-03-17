<?php
/**
 * GET /api/v1/arama-log/istatistik.php
 * Arama istatistikleri - detaylı
 * Params: tarih_bas, tarih_son, donem (gunluk/haftalik/aylik), kullanici_id
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Tablo migration
ensure_arama_loglari_table();

// Parametreleri al - hem eski hem yeni format destekle
$tarih_bas = clean($_GET['tarih_bas'] ?? $_GET['baslangic'] ?? '');
$tarih_son = clean($_GET['tarih_son'] ?? $_GET['bitis'] ?? '');
$donem = clean($_GET['donem'] ?? 'aylik');
$kullanici_id = clean($_GET['kullanici_id'] ?? '');

// Kolon adlarını al
$tarih_col = get_tarih_column();
$sure_col = get_sure_column();
$cols = get_table_columns();

$where = [];
$params = [];

if ($tarih_bas !== '') {
    $where[] = "$tarih_col >= ?";
    $params[] = $tarih_bas . ' 00:00:00';
}
if ($tarih_son !== '') {
    $where[] = "$tarih_col <= ?";
    $params[] = $tarih_son . ' 23:59:59';
}

// Kullanıcı filtresi
if ($kullanici_id !== '' && $user['rol'] === 'admin') {
    $where[] = 'kullanici_id = ?';
    $params[] = (int)$kullanici_id;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    // TOPLAM ARAMA
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $toplam = (int)$stmt->fetch()['sayi'];

    // GELEN
    $gelenW = $whereSQL ? "$whereSQL AND yon = 'gelen'" : "WHERE yon = 'gelen'";
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $gelenW");
    $stmt->execute($params);
    $gelen = (int)$stmt->fetch()['sayi'];

    // GİDEN
    $gidenW = $whereSQL ? "$whereSQL AND yon = 'giden'" : "WHERE yon = 'giden'";
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $gidenW");
    $stmt->execute($params);
    $giden = (int)$stmt->fetch()['sayi'];

    // CEVAPLANAN
    $cevW = $whereSQL ? "$whereSQL AND durum IN ('cevaplandi','gorusme')" : "WHERE durum IN ('cevaplandi','gorusme')";
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $cevW");
    $stmt->execute($params);
    $cevaplanan = (int)$stmt->fetch()['sayi'];

    // CEVAPSIZ
    $cevapsizW = $whereSQL ? "$whereSQL AND durum IN ('cevapsiz','mesgul','iptal')" : "WHERE durum IN ('cevapsiz','mesgul','iptal')";
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $cevapsizW");
    $stmt->execute($params);
    $cevapsiz = (int)$stmt->fetch()['sayi'];

    // REDDEDİLEN
    $redW = $whereSQL ? "$whereSQL AND durum = 'reddedildi'" : "WHERE durum = 'reddedildi'";
    $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $redW");
    $stmt->execute($params);
    $reddedilen = (int)$stmt->fetch()['sayi'];

    // ORT. SÜRE (saniye)
    $sureW = $whereSQL ? "$whereSQL AND $sure_col > 0" : "WHERE $sure_col > 0";
    $stmt = $db->prepare("SELECT COALESCE(AVG($sure_col), 0) as ort FROM arama_loglari $sureW");
    $stmt->execute($params);
    $ort_sure = round((float)$stmt->fetch()['ort']);

    // EN UZUN GÖRÜŞME
    $stmt = $db->prepare("SELECT COALESCE(MAX($sure_col), 0) as maks FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $en_uzun = (int)$stmt->fetch()['maks'];

    // TOPLAM SÜRE
    $stmt = $db->prepare("SELECT COALESCE(SUM($sure_col), 0) as toplam FROM arama_loglari $whereSQL");
    $stmt->execute($params);
    $toplam_sure = (int)$stmt->fetch()['toplam'];

    // KAYITLI GÖRÜŞME
    $kayitli = 0;
    if (in_array('kayit_dosya', $cols)) {
        $kayitW = $whereSQL ? "$whereSQL AND kayit_dosya IS NOT NULL AND kayit_dosya != ''" : "WHERE kayit_dosya IS NOT NULL AND kayit_dosya != ''";
        $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $kayitW");
        $stmt->execute($params);
        $kayitli = (int)$stmt->fetch()['sayi'];
    } elseif (in_array('crm_id', $cols)) {
        // crm_id varsa CRM ile eşleşmiş kayıtları say
        $kayitW = $whereSQL ? "$whereSQL AND crm_id IS NOT NULL" : "WHERE crm_id IS NOT NULL";
        $stmt = $db->prepare("SELECT COUNT(*) as sayi FROM arama_loglari $kayitW");
        $stmt->execute($params);
        $kayitli = (int)$stmt->fetch()['sayi'];
    }

    // EN ÇOK ARANAN NUMARALAR (Top 10)
    $numara_col = get_numara_column();
    $enCokSQL = "SELECT $numara_col as numara, COUNT(*) as adet
        FROM arama_loglari $whereSQL
        GROUP BY $numara_col
        ORDER BY adet DESC LIMIT 10";
    $stmt = $db->prepare($enCokSQL);
    $stmt->execute($params);
    $enCokAranan = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // İsim eşleştirme
    $isim_col = get_isim_column();
    foreach ($enCokAranan as &$n) {
        if ($n['numara']) {
            $stmt2 = $db->prepare("SELECT $isim_col as ad FROM arama_loglari WHERE $numara_col = ? AND $isim_col IS NOT NULL AND $isim_col != '' LIMIT 1");
            $stmt2->execute([$n['numara']]);
            $row = $stmt2->fetch(PDO::FETCH_ASSOC);
            $n['ad'] = $row ? $row['ad'] : null;
        }
    }
    unset($n);

    // GRAFİK VERİSİ
    $grafik = [];
    $dateFormat = '%Y-%m-%d';
    if ($donem === 'haftalik') $dateFormat = '%Y-%u';
    elseif ($donem === 'aylik') $dateFormat = '%Y-%m';

    $grafikSQL = "SELECT DATE_FORMAT($tarih_col, '$dateFormat') as tarih,
        COUNT(*) as toplam,
        SUM(CASE WHEN yon = 'gelen' THEN 1 ELSE 0 END) as gelen,
        SUM(CASE WHEN yon = 'giden' THEN 1 ELSE 0 END) as giden
        FROM arama_loglari $whereSQL
        GROUP BY DATE_FORMAT($tarih_col, '$dateFormat')
        ORDER BY tarih DESC LIMIT 30";
    $stmt = $db->prepare($grafikSQL);
    $stmt->execute($params);
    $grafik = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Response - frontend'in beklediği format
    json_success([
        'genel' => [
            'toplam_arama' => $toplam,
            'gelen_arama' => $gelen,
            'giden_arama' => $giden,
            'cevaplanan' => $cevaplanan,
            'cevapsiz' => $cevapsiz,
            'reddedilen' => $reddedilen,
            'ort_sure' => $ort_sure,
            'en_uzun_gorusme' => $en_uzun,
            'toplam_sure' => $toplam_sure,
            'kayitli_gorusme' => $kayitli,
        ],
        'grafik' => array_reverse($grafik),
        'donem' => $donem,
        'en_cok_aranan' => $enCokAranan,
    ]);
} catch (Exception $e) {
    json_error('İstatistik yüklenemedi: ' . $e->getMessage(), 500);
}
