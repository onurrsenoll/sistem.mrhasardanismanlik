<?php
/**
 * TESHIS DOSYASI - Arama log 500 hatasini bulmak icin
 * Kullanim: https://sistem.mrhasardanismanlik.com/api/v1/arama-log/test-debug.php
 * SORUN COZULDUKTEN SONRA BU DOSYAYI SİLİN
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$sonuc = [];
$sonuc['php_version'] = PHP_VERSION;
$sonuc['adimlar'] = [];

// ADIM 1: __DIR__ kontrolu
$sonuc['adimlar'][] = ['adim' => '1-DIR', 'durum' => 'OK', 'deger' => __DIR__];

// ADIM 2: config dosyalari var mi
$dosyalar = [
    'helpers' => __DIR__ . '/../../config/helpers.php',
    'auth' => __DIR__ . '/../../config/auth.php',
    'database' => __DIR__ . '/../../config/database.php',
    'setup' => __DIR__ . '/setup.php'
];
foreach ($dosyalar as $ad => $yol) {
    $var = file_exists($yol);
    $gercekYol = $var ? realpath($yol) : 'DOSYA YOK!';
    $sonuc['adimlar'][] = ['adim' => '2-DOSYA-' . $ad, 'durum' => $var ? 'OK' : 'HATA', 'yol' => $yol, 'gercek_yol' => $gercekYol];
}

// ADIM 3: helpers.php yukle
try {
    require_once __DIR__ . '/../../config/helpers.php';
    $sonuc['adimlar'][] = ['adim' => '3-HELPERS', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '3-HELPERS', 'durum' => 'HATA', 'mesaj' => $e->getMessage(), 'satir' => $e->getFile() . ':' . $e->getLine()];
    echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// ADIM 4: database.php yukle
try {
    require_once __DIR__ . '/../../config/database.php';
    $sonuc['adimlar'][] = ['adim' => '4-DATABASE-CONFIG', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '4-DATABASE-CONFIG', 'durum' => 'HATA', 'mesaj' => $e->getMessage(), 'satir' => $e->getFile() . ':' . $e->getLine()];
    echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// ADIM 5: DB baglantisi
try {
    $db = getDB();
    $sonuc['adimlar'][] = ['adim' => '5-DB-BAGLANTI', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '5-DB-BAGLANTI', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
    echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// ADIM 6: auth.php yukle
try {
    require_once __DIR__ . '/../../config/auth.php';
    $sonuc['adimlar'][] = ['adim' => '6-AUTH', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '6-AUTH', 'durum' => 'HATA', 'mesaj' => $e->getMessage(), 'satir' => $e->getFile() . ':' . $e->getLine()];
    echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// ADIM 7: setup.php yukle
try {
    require_once __DIR__ . '/setup.php';
    $sonuc['adimlar'][] = ['adim' => '7-SETUP', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '7-SETUP', 'durum' => 'HATA', 'mesaj' => $e->getMessage(), 'satir' => $e->getFile() . ':' . $e->getLine()];
    echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit;
}

// ADIM 8: Tablo olustur
try {
    ensure_arama_log_table();
    $sonuc['adimlar'][] = ['adim' => '8-TABLO-OLUSTUR', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '8-TABLO-OLUSTUR', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
}

// ADIM 9: Tablo var mi kontrol
try {
    $stmt = $db->query("SHOW TABLES LIKE 'arama_loglari'");
    $var = $stmt->rowCount() > 0;
    $sonuc['adimlar'][] = ['adim' => '9-TABLO-KONTROL', 'durum' => $var ? 'OK' : 'TABLO YOK', 'tablo_var' => $var];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '9-TABLO-KONTROL', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
}

// ADIM 10: Collation kontrolu
try {
    $coll = $db->query("SHOW COLLATION WHERE Collation = 'utf8mb4_turkish_ci'")->fetchAll();
    $sonuc['adimlar'][] = ['adim' => '10-COLLATION', 'durum' => !empty($coll) ? 'utf8mb4_turkish_ci MEVCUT' : 'utf8mb4_turkish_ci YOK - unicode kullanilacak'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '10-COLLATION', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
}

// ADIM 11: CREATE TABLE yetkisi
try {
    $db->exec("CREATE TABLE IF NOT EXISTS _arama_log_test_tmp (id INT PRIMARY KEY)");
    $db->exec("DROP TABLE IF EXISTS _arama_log_test_tmp");
    $sonuc['adimlar'][] = ['adim' => '11-CREATE-YETKI', 'durum' => 'OK'];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '11-CREATE-YETKI', 'durum' => 'HATA - CREATE TABLE yetkisi yok', 'mesaj' => $e->getMessage()];
}

// ADIM 12: Tabloyu elle olusturmaya calis
if (!$var) {
    try {
        $db->exec("CREATE TABLE arama_loglari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kullanici_id INT NOT NULL,
            yon ENUM('gelen','giden') NOT NULL DEFAULT 'giden',
            numara VARCHAR(20) NOT NULL,
            musteri_adi VARCHAR(100) DEFAULT NULL,
            musteri_kaynak VARCHAR(20) DEFAULT NULL,
            musteri_kaynak_id INT DEFAULT NULL,
            durum ENUM('cevaplandi','cevapsiz','reddedildi','mesgul','hata') NOT NULL DEFAULT 'cevapsiz',
            baslangic_zamani DATETIME NOT NULL,
            cevaplanma_zamani DATETIME DEFAULT NULL,
            bitis_zamani DATETIME DEFAULT NULL,
            sure_saniye INT DEFAULT 0,
            kayit_dosya VARCHAR(255) DEFAULT NULL,
            kayit_boyut INT DEFAULT 0,
            notlar TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_kullanici (kullanici_id),
            INDEX idx_numara (numara),
            INDEX idx_yon (yon),
            INDEX idx_durum (durum),
            INDEX idx_baslangic (baslangic_zamani)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $sonuc['adimlar'][] = ['adim' => '12-ELLE-OLUSTUR', 'durum' => 'OK - Tablo olusturuldu!'];
    } catch (Throwable $e) {
        $sonuc['adimlar'][] = ['adim' => '12-ELLE-OLUSTUR', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
    }
}

// ADIM 13: Tablodan okuma testi
try {
    $test = $db->query("SELECT COUNT(*) as c FROM arama_loglari")->fetch();
    $sonuc['adimlar'][] = ['adim' => '13-SELECT-TEST', 'durum' => 'OK', 'kayit_sayisi' => $test['c']];
} catch (Throwable $e) {
    $sonuc['adimlar'][] = ['adim' => '13-SELECT-TEST', 'durum' => 'HATA', 'mesaj' => $e->getMessage()];
}

$sonuc['sonuc'] = 'TESHIS TAMAMLANDI';

echo json_encode($sonuc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
