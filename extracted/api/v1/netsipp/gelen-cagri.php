<?php
/**
 * GET /api/v1/netsipp/gelen-cagri.php
 * NetSIPP "Tarayıcımda Link Aç" webhook endpoint
 * NetSIPP bu URL'yi gelen çağrılarda açar
 *
 * BROWSER erişiminde: localStorage'a yazar ve pencereyi ANINDA kapatır
 * API/FETCH erişiminde: JSON döner
 *
 * Query params: ?arayan=%arayan%&arayanadi=%arayanadi%&aramatarihi=%aramatarihi%&aramaid=%aramaid%&senaryo=%senaryo%
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers
header('Access-Control-Allow-Origin: *');

$db = getDB();

// TABLO YOKSA OLUŞTUR
try {
    $db->exec("CREATE TABLE IF NOT EXISTS arama_loglari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        arayan VARCHAR(30) DEFAULT NULL,
        arayan_adi VARCHAR(100) DEFAULT NULL,
        aranan VARCHAR(30) DEFAULT NULL,
        arama_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
        netsipp_arama_id VARCHAR(50) DEFAULT NULL,
        senaryo VARCHAR(100) DEFAULT NULL,
        yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
        durum VARCHAR(30) DEFAULT 'calıyor',
        sure INT DEFAULT 0,
        crm_id INT DEFAULT NULL,
        kullanici_id INT DEFAULT NULL,
        notlar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_arayan (arayan),
        INDEX idx_aranan (aranan),
        INDEX idx_yon (yon)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

$arayan = clean($_GET['arayan'] ?? '');
$arayanAdi = clean($_GET['arayanadi'] ?? '');
$aramaTarihi = clean($_GET['aramatarihi'] ?? date('Y-m-d H:i:s'));
$aramaId = clean($_GET['aramaid'] ?? '');
$senaryo = clean($_GET['senaryo'] ?? '');
$aranan = clean($_GET['aranan'] ?? '');

if (empty($arayan)) {
    $isBrowser = !isset($_SERVER['HTTP_AUTHORIZATION']) &&
                 !isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
                 (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html') !== false || empty($_SERVER['HTTP_ACCEPT']));
    if ($isBrowser) {
        header('Content-Type: text/html; charset=UTF-8');
        echo '<!DOCTYPE html><html><head><title>NETSIPP</title></head><body><script>try{window.close();}catch(e){}</script></body></html>';
        exit;
    }
    header('Content-Type: application/json; charset=UTF-8');
    json_error('Arayan numarası gerekli', 422);
}

// Arama logu kaydet (tablo yoksa hata vermesin)
$logId = 0;
try {
    $stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $arayan,
        $arayanAdi,
        $aranan,
        $aramaTarihi,
        $aramaId,
        $senaryo,
        'gelen',
        'calıyor'
    ]);
    $logId = (int)$db->lastInsertId();
} catch (Exception $e) {
    // Tablo yoksa sessizce devam et
}

// CRM'de bu numarayı ara
$crmKayit = null;
try {
    $stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? LIMIT 1');
    $cleanNum = '%' . preg_replace('/[^0-9]/', '', $arayan) . '%';
    $stmt->execute([$cleanNum, $cleanNum]);
    $crmKayit = $stmt->fetch();
} catch (Exception $e) {}

// Yönlendirme tablosunda da ara
$yonlendirmeKayit = null;
try {
    $stmt = $db->prepare('SELECT id, magdur_ad_soyad, magdur_telefon, magdur_il FROM yonlendirme WHERE magdur_telefon LIKE ? LIMIT 1');
    $stmt->execute([$cleanNum]);
    $yonlendirmeKayit = $stmt->fetch();
} catch (Exception $e) {}

// Arayan adını belirle
$arayanAdiSonuc = $arayanAdi ?: ($crmKayit ? $crmKayit['ad_soyad'] : ($yonlendirmeKayit ? $yonlendirmeKayit['magdur_ad_soyad'] : ''));

// BROWSER ERİŞİMİ KONTROLÜ
$isBrowser = !isset($_SERVER['HTTP_AUTHORIZATION']) &&
             !isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
             (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html') !== false || empty($_SERVER['HTTP_ACCEPT']));

if ($isBrowser) {
    header('Content-Type: text/html; charset=UTF-8');
    // JSON-safe escape
    $jsArayan = addslashes($arayan);
    $jsArayanAdi = addslashes($arayanAdiSonuc);
    $jsAranan = addslashes($aranan);
    $jsAramaTarihi = addslashes($aramaTarihi);
    $jsAramaId = addslashes($aramaId);
    $jsSenaryo = addslashes($senaryo);
    $crmJSON = $crmKayit ? json_encode($crmKayit, JSON_UNESCAPED_UNICODE) : 'null';

    // MİNİMAL HTML - SADECE localStorage YAZ VE ANINDA KAPAT
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GELEN ÇAĞRI</title></head><body style="background:#0B1120;margin:0"><script>
try{
var d={arayan:"' . $jsArayan . '",arayanAdi:"' . $jsArayanAdi . '",aranan:"' . $jsAranan . '",aramaTarihi:"' . $jsAramaTarihi . '",aramaId:"' . $jsAramaId . '",senaryo:"' . $jsSenaryo . '",yon:"gelen",crm_kayit:' . $crmJSON . ',timestamp:Date.now()};
localStorage.setItem("mr_netsipp_gelen",JSON.stringify(d));
}catch(e){}
window.close();
setTimeout(function(){try{window.close();}catch(e){}},100);
setTimeout(function(){try{window.close();}catch(e){}document.body.innerHTML="<div style=\"color:#10b981;font-family:Arial;text-align:center;padding:40px;font-size:14px\">ÇAĞRI ANA UYGULAMAYA YÖNLENDİRİLDİ<br><br><small style=color:#f59e0b>BU SEKMEYİ KAPATABİLİRSİNİZ</small></div>";},300);
</script></body></html>';
    exit;
}

// API/FETCH ERİŞİMİ - JSON YANIT
header('Content-Type: application/json; charset=UTF-8');
json_success([
    'log_id' => $logId,
    'arayan' => $arayan,
    'arayan_adi' => $arayanAdiSonuc,
    'arama_id' => $aramaId,
    'crm_kayit' => $crmKayit ?: null,
    'yonlendirme_kayit' => $yonlendirmeKayit ?: null
]);
