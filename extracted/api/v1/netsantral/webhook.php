<?php
/**
 * POST /api/v1/netsantral/webhook.php
 * NetSantral Özel API Webhook Endpoint
 *
 * NetSantral gelen çağrılarda bu URL'yi çağırır.
 * AUTH GEREKMEZÇünkü NetSantral sunucusu çağırır, JWT token göndermez.
 *
 * POST Body (JSON):
 * {
 *   "arayan_no": "905551234567",
 *   "aranan_no": "908503625026502",
 *   "santral_no": "08503625026502",
 *   "arama_id": "1134567_1234",
 *   "tus_bilgisi": "1"
 * }
 *
 * Beklenen Yanıt:
 * {
 *   "status": "success",
 *   "result": "1",
 *   "data": "okunacak metin"
 * }
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

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

// NETSANTRAL BEKLEYEN ÇAĞRI TABLOSU (frontend polling için)
try {
    $db->exec("CREATE TABLE IF NOT EXISTS netsantral_bekleyen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        arayan_no VARCHAR(30) NOT NULL,
        aranan_no VARCHAR(30) DEFAULT NULL,
        santral_no VARCHAR(30) DEFAULT NULL,
        arama_id VARCHAR(50) DEFAULT NULL,
        tus_bilgisi VARCHAR(10) DEFAULT NULL,
        durum VARCHAR(20) DEFAULT 'bekliyor',
        arayan_adi VARCHAR(100) DEFAULT NULL,
        crm_id INT DEFAULT NULL,
        islendi TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_durum (durum),
        INDEX idx_islendi (islendi),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

// POST VERİLERİNİ OKU
$body = get_json_body();

// GET parametreleri de destekle (NetSantral bazı durumlarda GET gönderebilir)
$arayan_no  = $body['arayan_no']  ?? ($_GET['arayan_no']  ?? '');
$aranan_no  = $body['aranan_no']  ?? ($_GET['aranan_no']  ?? '');
$santral_no = $body['santral_no'] ?? ($_GET['santral_no'] ?? '');
$arama_id   = $body['arama_id']  ?? ($_GET['arama_id']   ?? '');
$tus_bilgisi = $body['tus_bilgisi'] ?? ($_GET['tus_bilgisi'] ?? '');

// TEMİZLE
$arayan_no  = preg_replace('/[^0-9+]/', '', $arayan_no);
$aranan_no  = preg_replace('/[^0-9+]/', '', $aranan_no);
$santral_no = preg_replace('/[^0-9+]/', '', $santral_no);
$arama_id   = clean($arama_id);
$tus_bilgisi = clean($tus_bilgisi);

// LOG
try {
    $logMsg = "NetSantral Webhook: arayan={$arayan_no}, aranan={$aranan_no}, santral={$santral_no}, arama_id={$arama_id}, tus={$tus_bilgisi}";
    $db->prepare("INSERT INTO log_kayitlari (kullanici_id, islem, detay, tablo_adi, ip_adresi, user_agent) VALUES (NULL, ?, ?, ?, ?, ?)")
       ->execute(['netsantral_webhook', $logMsg, 'netsantral_bekleyen', $_SERVER['REMOTE_ADDR'] ?? '', substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);
} catch (Exception $e) {}

// ARAYAN NUMARASI YOKSA HATA
if (empty($arayan_no)) {
    echo json_encode([
        'status' => 'error',
        'result' => 'e',
        'data'   => 'Arayan numarasi bos'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// CRM VERİTABANINDA NUMARA ARA
$crmKayit = null;
$arayanAdi = '';
try {
    $cleanNum = '%' . preg_replace('/[^0-9]/', '', $arayan_no) . '%';
    $stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$cleanNum, $cleanNum]);
    $crmKayit = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($crmKayit) {
        $arayanAdi = $crmKayit['ad_soyad'] ?? '';
    }
} catch (Exception $e) {}

// YÖNLENDİRME TABLOSUNDA DA ARA
if (empty($arayanAdi)) {
    try {
        $stmt = $db->prepare('SELECT id, magdur_ad_soyad, magdur_telefon FROM yonlendirme WHERE magdur_telefon LIKE ? LIMIT 1');
        $stmt->execute([$cleanNum]);
        $yonKayit = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($yonKayit) {
            $arayanAdi = $yonKayit['magdur_ad_soyad'] ?? '';
        }
    } catch (Exception $e) {}
}

// ARAMA LOGUNA KAYDET
$logId = 0;
try {
    $stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)');
    $stmt->execute([
        $arayan_no,
        $arayanAdi,
        $aranan_no,
        $arama_id,
        'netsantral_webhook',
        'gelen',
        'calıyor'
    ]);
    $logId = (int)$db->lastInsertId();
} catch (Exception $e) {}

// BEKLEYEN ÇAĞRI TABLOSUNA EKLE (frontend polling ile alacak)
try {
    $stmt = $db->prepare('INSERT INTO netsantral_bekleyen (arayan_no, aranan_no, santral_no, arama_id, tus_bilgisi, durum, arayan_adi, crm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $arayan_no,
        $aranan_no,
        $santral_no,
        $arama_id,
        $tus_bilgisi,
        'bekliyor',
        $arayanAdi,
        $crmKayit ? $crmKayit['id'] : null
    ]);
} catch (Exception $e) {}

// NETSANTRAL'IN BEKLEDİĞİ FORMATTA YANIT DÖN
// result: Sonuç Durumları'ndaki durum kodlarından biri
// data: TTS ile okunacak metin (max 750 karakter)
$anons = 'Hosgeldiniz, cagrınız yonlendiriliyor.';
if ($arayanAdi) {
    $anons = 'Hosgeldiniz ' . $arayanAdi . ', cagrınız yonlendiriliyor.';
}

// DAHİLİ NUMARASINI ÇEK (çağrıyı yönlendir)
$dahili = '';
try {
    $stmt = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'netsantral_dahili' LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $dahili = $row['deger'];
} catch (Exception $e) {}

// YANIT: Başarılı + Dahiliye yönlendir
$response = [
    'status' => 'success',
    'result' => '1',
    'data'   => $anons
];

// Dinamik yönlendirme varsa dahiliye yönlendir
if (!empty($dahili)) {
    $response['result'] = 'extensions';
    $response['data']   = $dahili;
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
