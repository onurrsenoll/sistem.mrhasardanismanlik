<?php
/**
 * POST /api/v1/sms/webhook.php
 * NetGSM İnteraktif SMS Webhook Endpoint
 *
 * NetGSM gelen SMS'lerde bu URL'yi çağırır.
 * AUTH GEREKMEZ - NetGSM sunucusu çağırır, JWT token göndermez.
 * xapi-key header veya BasicAuth ile doğrulama yapılır.
 *
 * POST Body (JSON):
 * {
 *   "messageId": 120210000,
 *   "subscriberNumber": "850XXXXXXXX",
 *   "sourceNumber": "532XXXXXXX",
 *   "messageDateTime": "2025-10-13 15:47:54",
 *   "content": "Mesaj metnim"
 * }
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, xapi-key, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/helpers.php';

$db = getDB();

// ══════════ GELEN SMS TABLOSU ══════════
try {
    $db->exec("CREATE TABLE IF NOT EXISTS gelen_smsler (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(50) DEFAULT NULL COMMENT 'NetGSM messageId',
        gonderen VARCHAR(30) NOT NULL COMMENT 'Gonderenin telefon numarasi',
        alici VARCHAR(30) DEFAULT NULL COMMENT 'Alici numara (subscriberNumber)',
        mesaj TEXT NOT NULL,
        mesaj_tarihi DATETIME DEFAULT NULL COMMENT 'NetGSM messageDateTime',
        crm_id INT DEFAULT NULL COMMENT 'CRM kaydı varsa ID',
        dosya_id INT DEFAULT NULL COMMENT 'İlişkili dosya varsa ID',
        gonderen_adi VARCHAR(100) DEFAULT NULL,
        okundu TINYINT(1) DEFAULT 0,
        islendi TINYINT(1) DEFAULT 0,
        notlar TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gonderen (gonderen),
        INDEX idx_crm (crm_id),
        INDEX idx_okundu (okundu),
        INDEX idx_tarih (created_at),
        INDEX idx_message_id (message_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

// ══════════ POST VERİLERİNİ OKU ══════════
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

if (!is_array($body) || empty($body)) {
    $body = $_POST;
}

// GET desteği (yedek)
$messageId        = trim($body['messageId']        ?? ($body['message_id']   ?? ($_GET['messageId']        ?? '')));
$subscriberNumber = trim($body['subscriberNumber'] ?? ($body['subscriber']   ?? ($_GET['subscriberNumber'] ?? '')));
$sourceNumber     = trim($body['sourceNumber']     ?? ($body['source']       ?? ($_GET['sourceNumber']     ?? '')));
$messageDateTime  = trim($body['messageDateTime']  ?? ($body['datetime']     ?? ($_GET['messageDateTime']  ?? '')));
$content          = trim($body['content']          ?? ($body['message']      ?? ($_GET['content']          ?? '')));

// TEMİZLE
$sourceNumber     = preg_replace('/[^0-9+]/', '', $sourceNumber);
$subscriberNumber = preg_replace('/[^0-9+]/', '', $subscriberNumber);
$messageId        = clean($messageId);
$content          = mb_substr($content, 0, 5000);

// ══════════ LOGLAMA ══════════
$logData = [
    'zaman'      => date('Y-m-d H:i:s'),
    'messageId'  => $messageId,
    'gonderen'   => $sourceNumber,
    'alici'      => $subscriberNumber,
    'tarih'      => $messageDateTime,
    'mesaj'      => mb_substr($content, 0, 200),
    'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
    'method'     => $_SERVER['REQUEST_METHOD'] ?? '',
    'raw_body'   => mb_substr($rawInput, 0, 500)
];

$logDir = __DIR__ . '/../../../data';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
@file_put_contents($logDir . '/sms_webhook.log',
    json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n---\n",
    FILE_APPEND | LOCK_EX
);

// DB log
try {
    $logMsg = "SMS Webhook: gonderen={$sourceNumber}, alici={$subscriberNumber}, messageId={$messageId}";
    $db->prepare("INSERT INTO log_kayitlari (kullanici_id, islem, detay, tablo_adi, ip_adresi, user_agent) VALUES (NULL, ?, ?, ?, ?, ?)")
       ->execute(['sms_webhook', $logMsg, 'gelen_smsler', $_SERVER['REMOTE_ADDR'] ?? '', substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);
} catch (Exception $e) {}

// ══════════ API KEY DOĞRULAMA ══════════
// 1) Header: xapi-key
// 2) BasicAuth
// 3) Body/GET parametresi
$apiKey = '';

// xapi-key header kontrol
$headers = getallheaders();
$headersLower = array_change_key_case($headers, CASE_LOWER);
if (!empty($headersLower['xapi-key'])) {
    $apiKey = trim($headersLower['xapi-key']);
}

// BasicAuth kontrol (fallback)
if (empty($apiKey) && !empty($_SERVER['PHP_AUTH_USER'])) {
    // BasicAuth kullanılıyorsa user:pass birleşimi kontrol edilir
    $apiKey = trim($_SERVER['PHP_AUTH_USER'] . ':' . ($_SERVER['PHP_AUTH_PW'] ?? ''));
}

// Body/GET parametresi (fallback)
if (empty($apiKey)) {
    $apiKey = trim($body['api_key'] ?? ($body['apikey'] ?? ($_GET['api_key'] ?? ($_GET['apikey'] ?? ''))));
}

// Geçerli API key'i al
$VALID_API_KEY = 'mr_hasar_2026';
try {
    $stmt = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'sms_webhook_api_key' LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && !empty($row['deger'])) {
        $VALID_API_KEY = $row['deger'];
    }
} catch (Exception $e) {}

// Alternatif API key kontrolü
$VALID_API_KEY_ALT = 'mr_hasar_2026';

if (empty($apiKey) || ($apiKey !== $VALID_API_KEY && $apiKey !== $VALID_API_KEY_ALT)) {
    @file_put_contents($logDir . '/sms_webhook.log',
        "[HATA] API KEY GEÇERSİZ: gelen='{$apiKey}' | IP=" . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n---\n",
        FILE_APPEND | LOCK_EX
    );
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'GECERSIZ API ANAHTARI'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ══════════ GÖNDEREN NUMARA KONTROLÜ ══════════
if (empty($sourceNumber)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'GONDEREN NUMARASI BOS'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ══════════ CRM VERİTABANINDA NUMARA ARA ══════════
$crmKayit = null;
$gonderenAdi = '';
$dosyaId = null;
$cleanNum = preg_replace('/[^0-9]/', '', $sourceNumber);
$searchNum = strlen($cleanNum) > 10 ? substr($cleanNum, -10) : $cleanNum;
$searchPattern = '%' . $searchNum . '%';

// CRM'de ara
try {
    $stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$searchPattern, $searchPattern]);
    $crmKayit = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($crmKayit) {
        $gonderenAdi = $crmKayit['ad_soyad'] ?? '';
    }
} catch (Exception $e) {}

// Dosyalar tablosunda ara (magdurlar tablosu üzerinden)
if (empty($gonderenAdi)) {
    try {
        $stmt = $db->prepare('SELECT d.id, m.ad_soyad FROM dosyalar d INNER JOIN magdurlar m ON m.dosya_id = d.id WHERE m.telefon LIKE ? OR m.telefon2 LIKE ? LIMIT 1');
        $stmt->execute([$searchPattern, $searchPattern]);
        $dosyaKayit = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($dosyaKayit) {
            $gonderenAdi = $dosyaKayit['ad_soyad'] ?? '';
            $dosyaId = $dosyaKayit['id'];
        }
    } catch (Exception $e) {}
}

// Mağdurlar tablosunda ara
if (empty($gonderenAdi)) {
    try {
        $stmt = $db->prepare('SELECT m.ad_soyad, m.telefon, m.dosya_id FROM magdurlar m WHERE m.telefon LIKE ? OR m.telefon2 LIKE ? ORDER BY m.id DESC LIMIT 1');
        $stmt->execute([$searchPattern, $searchPattern]);
        $magdurKayit = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($magdurKayit) {
            $gonderenAdi = $magdurKayit['ad_soyad'] ?? '';
            if (!$dosyaId) $dosyaId = $magdurKayit['dosya_id'] ?? null;
        }
    } catch (Exception $e) {}
}

// ══════════ GELEN SMS'İ KAYDET ══════════
$smsId = 0;
$mesajTarihi = null;
if (!empty($messageDateTime)) {
    try {
        $mesajTarihi = date('Y-m-d H:i:s', strtotime($messageDateTime));
    } catch (Exception $e) {
        $mesajTarihi = date('Y-m-d H:i:s');
    }
} else {
    $mesajTarihi = date('Y-m-d H:i:s');
}

try {
    $stmt = $db->prepare('INSERT INTO gelen_smsler (message_id, gonderen, alici, mesaj, mesaj_tarihi, crm_id, dosya_id, gonderen_adi, okundu, islendi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)');
    $stmt->execute([
        $messageId ?: null,
        $sourceNumber,
        $subscriberNumber ?: null,
        $content,
        $mesajTarihi,
        $crmKayit ? $crmKayit['id'] : null,
        $dosyaId,
        $gonderenAdi ?: null
    ]);
    $smsId = (int)$db->lastInsertId();
} catch (Exception $e) {
    @file_put_contents($logDir . '/sms_webhook.log',
        "[HATA] DB INSERT: " . $e->getMessage() . "\n---\n",
        FILE_APPEND | LOCK_EX
    );
}

// ══════════ BİLDİRİM OLUŞTUR ══════════
try {
    $bildirimBaslik = 'GELEN SMS';
    $bildirimMesaj = (!empty($gonderenAdi) ? $gonderenAdi . ' - ' : '') . $sourceNumber . ': ' . mb_substr($content, 0, 100);

    // Tüm admin kullanıcılarına bildirim gönder
    $stmtUsers = $db->query("SELECT id FROM users WHERE rol IN ('admin','uzman') AND aktif = 1");
    $users = $stmtUsers->fetchAll(PDO::FETCH_COLUMN);

    foreach ($users as $userId) {
        $db->prepare("INSERT INTO bildirimler (alici_id, baslik, icerik, tip, ilgili_dosya_id, okundu) VALUES (?, ?, ?, 'sms', ?, 0)")
           ->execute([
               $userId,
               $bildirimBaslik,
               $bildirimMesaj,
               $dosyaId ?: null
           ]);
    }
} catch (Exception $e) {}

// ══════════ BAŞARILI YANIT ══════════
@file_put_contents($logDir . '/sms_webhook.log',
    "[BASARILI] SMS kaydedildi ID={$smsId} | gonderen={$sourceNumber} | mesaj=" . mb_substr($content, 0, 100) . "\n===\n",
    FILE_APPEND | LOCK_EX
);

echo json_encode([
    'success' => true,
    'message' => 'SMS ALINDI',
    'sms_id'  => $smsId
], JSON_UNESCAPED_UNICODE);
exit;
