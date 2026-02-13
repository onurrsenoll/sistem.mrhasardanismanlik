<?php
/**
 * POST /api/v1/netsantral/proxy.php
 * Netsantral API Proxy
 * Frontend'den gelen istekleri Netsantral API'ye iletir (CORS bypass)
 *
 * Body: { action: "originate|hangup|muteaudio|xfer|atxfer|queuestats|agentlogin|agentlogoff|agentpause|linkup", params: {...} }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$body = get_json_body();
$action = $body['action'] ?? '';
$params = $body['params'] ?? [];

if (empty($action)) {
    json_error('Aksiyon belirtilmedi', 422);
}

// NETSANTRAL AYARLARINI OKU
$db = getDB();
$netsantralAyar = [];
try {
    $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
    while ($row = $stmt->fetch()) {
        $netsantralAyar[$row['anahtar']] = $row['deger'];
    }
} catch (Exception $e) {
    // ayarlar tablosu yoksa veya netsantral ayarları tanımlanmamışsa
}

$santralNo = $netsantralAyar['netsantral_santral_no'] ?? '';
$username = $netsantralAyar['netsantral_kullanici'] ?? '';
$password = $netsantralAyar['netsantral_sifre'] ?? '';
$dahili = $netsantralAyar['netsantral_dahili'] ?? '';

if (empty($santralNo) || empty($username) || empty($password)) {
    json_error('Netsantral ayarları yapılandırılmamış. Sistem > Netsantral Ayarları bölümünden ayarları girin.', 400);
}

// API URL OLUŞTUR
$baseUrl = "https://crmsntrl.netgsm.com.tr/{$santralNo}";
$apiUrl = '';
$queryParams = [];

// ORTAK AUTH
$queryParams['username'] = $username;
$queryParams['password'] = $password;

switch ($action) {
    case 'originate':
        // ÇAĞRI BAŞLAT
        $apiUrl = "{$baseUrl}/originate";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['hedef'] = $params['hedef'] ?? '';
        if (empty($queryParams['dahili'])) {
            json_error('DAHİLİ NUMARASI TANIMLANMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN DAHİLİ NUMARASINI GİRİN.', 422);
        }
        if (empty($queryParams['hedef'])) {
            json_error('Hedef numara gerekli', 422);
        }
        break;

    case 'hangup':
        // ÇAĞRI SONLANDIR
        $apiUrl = "{$baseUrl}/hangup";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        if (empty($queryParams['dahili'])) {
            json_error('DAHİLİ NUMARASI TANIMLANMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN DAHİLİ NUMARASINI GİRİN.', 422);
        }
        break;

    case 'muteaudio':
        // SESİ KAPAT/AÇ
        $apiUrl = "{$baseUrl}/muteaudio";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['direction'] = $params['direction'] ?? 'all';
        $queryParams['state'] = $params['state'] ?? 'on';
        break;

    case 'xfer':
        // KÖR TRANSFER
        $apiUrl = "{$baseUrl}/xfer";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['hedef'] = $params['hedef'] ?? '';
        if (empty($queryParams['hedef'])) {
            json_error('Transfer hedefi gerekli', 422);
        }
        break;

    case 'atxfer':
        // DANIŞMALI TRANSFER
        $apiUrl = "{$baseUrl}/atxfer";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['hedef'] = $params['hedef'] ?? '';
        if (empty($queryParams['hedef'])) {
            json_error('Transfer hedefi gerekli', 422);
        }
        break;

    case 'linkup':
        // İKİ NUMARA BAĞLA
        $apiUrl = "{$baseUrl}/linkup";
        $queryParams['numara1'] = $params['numara1'] ?? '';
        $queryParams['numara2'] = $params['numara2'] ?? '';
        if (empty($queryParams['numara1']) || empty($queryParams['numara2'])) {
            json_error('Her iki numara da gerekli', 422);
        }
        break;

    case 'queuestats':
        // KUYRUK DURUM
        $apiUrl = "{$baseUrl}/queuestats";
        if (!empty($params['kuyruk'])) {
            $queryParams['kuyruk'] = $params['kuyruk'];
        }
        break;

    case 'agentlogin':
        // DAHİLİ KUYRUĞA EKLE
        $apiUrl = "{$baseUrl}/agentlogin";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['kuyruk'] = $params['kuyruk'] ?? '';
        break;

    case 'agentlogoff':
        // DAHİLİ KUYRUKTAN ÇIKAR
        $apiUrl = "{$baseUrl}/agentlogoff";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['kuyruk'] = $params['kuyruk'] ?? '';
        break;

    case 'agentpause':
        // MOLA ALIN / MOLA BİTİRİN
        $apiUrl = "{$baseUrl}/agentpause";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['pause'] = $params['pause'] ?? '1';
        if (!empty($params['reason'])) {
            $queryParams['reason'] = $params['reason'];
        }
        break;

    case 'test':
        // BAĞLANTI TESTİ - queuestats ile test
        $apiUrl = "{$baseUrl}/queuestats";
        break;

    default:
        json_error('Geçersiz aksiyon: ' . $action, 422);
}

// HTTP İSTEĞİ GÖNDER
$fullUrl = $apiUrl . '?' . http_build_query($queryParams);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $fullUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json, text/plain, */*',
        'User-Agent: MR-Hasar-CRM/1.0'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    json_error('Netsantral bağlantı hatası: ' . $curlError, 502);
}

// LOGLAMA
try {
    $logDetay = "Netsantral API: {$action}";
    if ($action === 'hangup') {
        $logDetay .= " | dahili=" . ($queryParams['dahili'] ?? 'BOŞ') . " | http={$httpCode}";
        if ($response) $logDetay .= " | yanit=" . substr($response, 0, 200);
    }
    log_action($user['id'], 'netsantral_' . $action, $logDetay, 'netsantral');
} catch (Exception $e) {}

// NETSANTRAL YANITINI PARSE ET
$parsed = null;
$apiBasarili = ($httpCode >= 200 && $httpCode < 300);

if ($response) {
    // Önce JSON dene
    $parsed = json_decode($response, true);
    if ($parsed === null) {
        // JSON değilse düz metin olarak döndür
        $rawTrimmed = trim($response);
        $parsed = ['raw_response' => $rawTrimmed];

        // NETGSM HATA KODLARI KONTROLÜ
        // Netgsm API hata durumunda sadece sayısal kod döndürür
        $netgsmHataKodlari = [
            '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
            '40' => 'YETERSİZ BAKİYE',
            '50' => 'SUNUCU HATASI',
            '60' => 'GEÇERSİZ SANTRAL NUMARASI',
            '70' => 'GEÇERSİZ PARAMETRE',
            '80' => 'TANIMSIZ HATA',
            '100' => 'SİSTEM HATASI'
        ];

        if (isset($netgsmHataKodlari[$rawTrimmed])) {
            $apiBasarili = false;
            $parsed['hata_kodu'] = $rawTrimmed;
            $parsed['hata_mesaj'] = $netgsmHataKodlari[$rawTrimmed];
        } elseif (is_numeric($rawTrimmed) && strlen($rawTrimmed) <= 3 && intval($rawTrimmed) >= 20) {
            // Bilinmeyen ama sayısal hata kodu
            $apiBasarili = false;
            $parsed['hata_kodu'] = $rawTrimmed;
            $parsed['hata_mesaj'] = 'NETGSM HATA KODU: ' . $rawTrimmed;
        }
    }
}

// HTTP 200 bile olsa boş yanıt = hata
if ($apiBasarili && empty($response)) {
    $apiBasarili = false;
    $parsed = ['raw_response' => '', 'hata_mesaj' => 'SUNUCUDAN BOŞ YANIT GELDİ'];
}

// BAŞARILI YANIT
json_success([
    'action' => $action,
    'http_code' => $httpCode,
    'response' => $parsed,
    'success_api' => $apiBasarili
]);
