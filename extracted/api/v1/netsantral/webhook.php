<?php
/**
 * POST /api/v1/netsantral/webhook.php
 * NetSantral Özel API Webhook Endpoint
 *
 * NetSantral gelen çağrılarda bu URL'yi çağırır.
 * AUTH GEREKMEZ - NetSantral sunucusu çağırır, JWT token göndermez.
 * API_KEY ile doğrulama yapılır.
 *
 * POST Body (JSON veya form-encoded):
 * {
 *   "arayan_no": "905551234567",
 *   "aranan_no": "908503625026502",
 *   "santral_no": "08503625026502",
 *   "arama_id": "1134567_1234",
 *   "tus_bilgisi": "1",
 *   "api_key": "mr_hasar_2026"  (sabit değişken)
 * }
 *
 * YANITLAR (Tüm alanlar STRING olmalıdır):
 *
 * 1) DİNAMİK YÖNLENDİRME (TTS + DAHİLİYE AKTAR):
 * {
 *   "status": "success",
 *   "result": "102",
 *   "data": "Hosgeldiniz, cagrınız yonlendiriliyor."
 * }
 * NOT: result alanı doğrudan hedef dahili numarasıdır.
 * NetSantral TTS metnini okur, sonra result'taki numaraya yönlendirir.
 *
 * 2) SADECE TTS (YÖNLENDİRME YOK):
 * {
 *   "status": "success",
 *   "result": "1",
 *   "data": "Hosgeldiniz, cagrınız yonlendiriliyor."
 * }
 *
 * 3) HATA:
 * { "status": "error", "result": "e", "data": "hata mesaji" }
 *
 * Sonuç Durumları (NetSantral panelinde tanımlı):
 * - "e"          = Hata
 * - "t"          = Zaman aşımı
 * - "1"          = Başarılı - TTS ile data okunur (IVR akışına devam eder)
 * - "{dahili}"   = Dinamik Yönlendirme - TTS okunur + dahili numarasına aktarılır
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

// ══════════ TABLOLAR ══════════
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
        INDEX idx_yon (yon),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

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

// ══════════ POST VERİLERİNİ OKU ══════════
// Netsantral hem JSON hem form-encoded hem de URL-encoded gönderebilir
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

// JSON parse edilemezse form-encoded veya $_POST dene
if (!is_array($body) || empty($body)) {
    $body = $_POST;
}

// Hala boşsa URL-encoded parse et
if (empty($body) && !empty($rawInput)) {
    parse_str($rawInput, $body);
}

// GET parametreleri de destekle (yedek - NetGSM bazen GET ile gönderir)
$arayan_no   = trim($body['arayan_no']  ?? ($body['caller']    ?? ($_GET['arayan_no']  ?? ($_GET['caller']   ?? ''))));
$aranan_no   = trim($body['aranan_no']  ?? ($body['called']    ?? ($_GET['aranan_no']  ?? ($_GET['called']   ?? ''))));
$santral_no  = trim($body['santral_no'] ?? ($body['santral']   ?? ($_GET['santral_no'] ?? ($_GET['santral']  ?? ''))));
$arama_id    = trim($body['arama_id']   ?? ($body['callid']    ?? ($_GET['arama_id']   ?? ($_GET['callid']   ?? ''))));
$tus_bilgisi = trim($body['tus_bilgisi'] ?? ($body['dtmf']     ?? ($_GET['tus_bilgisi'] ?? ($_GET['dtmf']    ?? ''))));
$api_key     = trim($body['api_key']    ?? ($body['apikey']    ?? ($_GET['api_key']    ?? ($_GET['apikey']   ?? ''))));

// TEMİZLE
$arayan_no  = preg_replace('/[^0-9+]/', '', $arayan_no);
$aranan_no  = preg_replace('/[^0-9+]/', '', $aranan_no);
$santral_no = preg_replace('/[^0-9+]/', '', $santral_no);
$arama_id   = clean($arama_id);
$tus_bilgisi = clean($tus_bilgisi);

// ══════════ LOGLAMA ══════════
$logData = [
    'zaman'    => date('Y-m-d H:i:s'),
    'arayan'   => $arayan_no,
    'aranan'   => $aranan_no,
    'santral'  => $santral_no,
    'arama_id' => $arama_id,
    'tus'      => $tus_bilgisi,
    'ip'       => $_SERVER['REMOTE_ADDR'] ?? '',
    'method'   => $_SERVER['REQUEST_METHOD'] ?? '',
    'raw_body' => substr($rawInput, 0, 500)
];

// Dosyaya log yaz (hata ayıklama için)
$logDir = __DIR__ . '/../../../data';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
@file_put_contents($logDir . '/netsantral_webhook.log',
    json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n---\n",
    FILE_APPEND | LOCK_EX
);

// DB log
try {
    $logMsg = "Webhook: arayan={$arayan_no}, aranan={$aranan_no}, santral={$santral_no}, id={$arama_id}, tus={$tus_bilgisi}";
    $db->prepare("INSERT INTO log_kayitlari (kullanici_id, islem, detay, tablo_adi, ip_adresi, user_agent) VALUES (NULL, ?, ?, ?, ?, ?)")
       ->execute(['netsantral_webhook', $logMsg, 'netsantral_bekleyen', $_SERVER['REMOTE_ADDR'] ?? '', substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);
} catch (Exception $e) {}

// ══════════ API KEY DOĞRULAMA ══════════
// API KEY: ayarlar tablosundan veya sabit değerden
$VALID_API_KEY = 'mr_hasar_2026';
try {
    $stmt = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'netsantral_api_key' LIMIT 1");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && !empty($row['deger'])) {
        $VALID_API_KEY = $row['deger'];
    }
} catch (Exception $e) {}

if (empty($api_key) || $api_key !== $VALID_API_KEY) {
    // LOG: Hatalı API key denemesi
    @file_put_contents($logDir . '/netsantral_webhook.log',
        "[HATA] API KEY GEÇERSİZ: gelen='{$api_key}' beklenen='{$VALID_API_KEY}' | IP=" . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n---\n",
        FILE_APPEND | LOCK_EX
    );
    echo json_encode([
        'status' => 'error',
        'result' => 'e',
        'data'   => 'Gecersiz api anahtari'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ══════════ ARAYAN NUMARASI YOKSA HATA ══════════
if (empty($arayan_no)) {
    echo json_encode([
        'status' => 'error',
        'result' => 'e',
        'data'   => 'Arayan numarasi bos'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ══════════ CRM VERİTABANINDA NUMARA ARA ══════════
$crmKayit = null;
$arayanAdi = '';
$cleanNum = preg_replace('/[^0-9]/', '', $arayan_no);

// Numara arama: son 10 haneyi al (alan kodu olmadan)
$searchNum = strlen($cleanNum) > 10 ? substr($cleanNum, -10) : $cleanNum;
$searchPattern = '%' . $searchNum . '%';

try {
    $stmt = $db->prepare('SELECT id, ad_soyad, telefon, il, dosya_turu, durum FROM crm WHERE telefon LIKE ? OR telefon2 LIKE ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$searchPattern, $searchPattern]);
    $crmKayit = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($crmKayit) {
        $arayanAdi = $crmKayit['ad_soyad'] ?? '';
    }
} catch (Exception $e) {}

// YÖNLENDİRME TABLOSUNDA DA ARA
if (empty($arayanAdi)) {
    try {
        $stmt = $db->prepare('SELECT id, magdur_ad_soyad, magdur_telefon FROM yonlendirme WHERE magdur_telefon LIKE ? LIMIT 1');
        $stmt->execute([$searchPattern]);
        $yonKayit = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($yonKayit) {
            $arayanAdi = $yonKayit['magdur_ad_soyad'] ?? '';
        }
    } catch (Exception $e) {}
}

// DOSYALAR TABLOSUNDA DA ARA (magdurlar tablosu üzerinden)
if (empty($arayanAdi)) {
    try {
        $stmt = $db->prepare('SELECT d.id, m.ad_soyad FROM dosyalar d INNER JOIN magdurlar m ON m.dosya_id = d.id WHERE m.telefon LIKE ? OR m.telefon2 LIKE ? LIMIT 1');
        $stmt->execute([$searchPattern, $searchPattern]);
        $dosyaKayit = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($dosyaKayit) {
            $arayanAdi = $dosyaKayit['ad_soyad'] ?? '';
        }
    } catch (Exception $e) {}
}

// ══════════ ARAMA LOGUNA KAYDET ══════════
$logId = 0;
try {
    $stmt = $db->prepare('INSERT INTO arama_loglari (arayan, arayan_adi, aranan, arama_tarihi, netsipp_arama_id, senaryo, yon, durum, crm_id) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)');
    $stmt->execute([
        $arayan_no,
        $arayanAdi,
        $aranan_no,
        $arama_id,
        'netsantral_ozel_api',
        'gelen',
        'calıyor',
        $crmKayit ? $crmKayit['id'] : null
    ]);
    $logId = (int)$db->lastInsertId();
} catch (Exception $e) {}

// ══════════ BEKLEYEN ÇAĞRI TABLOSUNA EKLE ══════════
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

// ══════════ AYARLARI OKU ══════════
$dahili = '';
$yonlendirmeModu = 'dynamic'; // dynamic, tts, extensions
try {
    $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('netsantral_dahili', 'netsantral_yonlendirme_modu', 'netsantral_yonlendirme_hedef', 'netsantral_tts_aktif')");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if ($row['anahtar'] === 'netsantral_dahili') $dahili = trim($row['deger']);
        if ($row['anahtar'] === 'netsantral_yonlendirme_modu') $yonlendirmeModu = trim($row['deger']);
    }
} catch (Exception $e) {}

// ══════════ YÖNLENDİRME HEDEFİNİ BELİRLE ══════════
// Yönlendirme hedefi: dahili numarası veya dış numara olabilir
$redirectHedef = $dahili; // Varsayılan: ayarlardaki dahili

// ══════════ TTS ANONS METNİ OLUŞTUR ══════════
// NetGSM TTS motoru Türkçe karakterleri destekler ancak bazı karakterler sorun çıkarabilir
// Güvenli karakter seti kullanılıyor
$anons = 'Hosgeldiniz, cagrınız yonlendiriliyor.';
if ($arayanAdi) {
    // Türkçe karakterleri TTS uyumlu hale getir (NetGSM TTS ASCII bekleyebilir)
    $ttsAd = str_replace(
        ['ı', 'İ', 'ö', 'Ö', 'ü', 'Ü', 'ş', 'Ş', 'ç', 'Ç', 'ğ', 'Ğ', 'â', 'Â', 'î', 'Î', 'û', 'Û'],
        ['i', 'I', 'o', 'O', 'u', 'U', 's', 'S', 'c', 'C', 'g', 'G', 'a', 'A', 'i', 'I', 'u', 'U'],
        $arayanAdi
    );
    // Özel karakterleri temizle (sadece harf, rakam ve boşluk)
    $ttsAd = preg_replace('/[^a-zA-Z0-9\s]/', '', $ttsAd);
    $ttsAd = trim(preg_replace('/\s+/', ' ', $ttsAd));
    if (!empty($ttsAd)) {
        $anons = 'Hosgeldiniz ' . $ttsAd . ', cagrınız yonlendiriliyor.';
    }
}

// Max 750 karakter (Netsantral limiti)
if (mb_strlen($anons) > 750) {
    $anons = mb_substr($anons, 0, 750);
}

// ══════════ YANIT OLUŞTUR ══════════
// NOT: Netsantral Özel API tüm alanların STRING olmasını bekler
// NOT: result = dahili numarası → TTS okunur + o dahiliye yönlendirilir (DİNAMİK)
// NOT: result = "1" → TTS okunur, Netsantral panelindeki IVR akışına devam eder
// NOT: result = "e" → Hata durumu

if (!empty($redirectHedef) && $yonlendirmeModu === 'dynamic') {
    // ═══ DİNAMİK YÖNLENDİRME ═══
    // result alanı doğrudan hedef dahili numarasıdır
    // NetSantral TTS metnini okur, sonra result'taki numaraya yönlendirir
    $response = [
        'status' => 'success',
        'result' => strval($redirectHedef),
        'data'   => strval($anons)
    ];
} elseif ($yonlendirmeModu === 'extensions' && !empty($dahili)) {
    // ═══ DAHİLİ YÖNLENDİRME ═══
    // result alanı dahili numarasıdır, TTS yok (data boş)
    $response = [
        'status' => 'success',
        'result' => strval($dahili),
        'data'   => ''
    ];
} else {
    // ═══ SADECE TTS (YÖNLENDİRME YOK) ═══
    // result = "1" → TTS okunur, sonra Netsantral panelindeki IVR akışına devam eder
    $response = [
        'status' => 'success',
        'result' => '1',
        'data'   => strval($anons)
    ];
}

// Log: Webhook yanıtı
@file_put_contents($logDir . '/netsantral_webhook.log',
    "[YANIT] " . json_encode($response, JSON_UNESCAPED_UNICODE) . "\n===\n",
    FILE_APPEND | LOCK_EX
);

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;
