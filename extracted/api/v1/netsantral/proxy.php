<?php
/**
 * POST /api/v1/netsantral/proxy.php
 * Netsantral API Proxy
 * Frontend'den gelen istekleri Netsantral API'ye iletir (CORS bypass)
 *
 * Body: { action: "originate|hangup|muteaudio|xfer|atxfer|queuestats|agentlogin|agentlogoff|agentpause|linkup|test", params: {...} }
 *
 * ÖZEL API AKTİF - originate, hangup ve diğer çağrı kontrol komutları çalışır
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
} catch (Exception $e) {}

$santralNo = $netsantralAyar['netsantral_santral_no'] ?? '';
$username = $netsantralAyar['netsantral_kullanici'] ?? '';
$password = $netsantralAyar['netsantral_sifre'] ?? '';
$dahili = $netsantralAyar['netsantral_dahili'] ?? '';

if (empty($santralNo) || empty($username) || empty($password)) {
    json_error('NETSANTRAL AYARLARI YAPILANDIRILMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN AYARLARI GİRİN.', 400);
}

// SANTRAL NO NORMALİZASYONU - API URL İÇİN BAŞINDAKİ 0'I TEMİZLE
// NetGSM CRM Santral API: https://crmsntrl.netgsm.com.tr/{santral_no_without_leading_zero}/...
$santralNoClean = ltrim($santralNo, '0');

// KULLANICI ADI NORMALİZASYONU - BAŞINDAKİ 0'I TEMİZLE (NetGSM standart format)
$usernameClean = ltrim($username, '0');

// API URL OLUŞTUR
$baseUrl = "https://crmsntrl.netgsm.com.tr/{$santralNoClean}";
$apiUrl = '';
$queryParams = [];

// ORTAK AUTH (başındaki 0 temizlenmiş hali kullanılır)
$queryParams['username'] = $usernameClean;
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
            json_error('HEDEF NUMARA GEREKLİ', 422);
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
            json_error('TRANSFER HEDEFİ GEREKLİ', 422);
        }
        break;

    case 'atxfer':
        // DANIŞMALI TRANSFER
        $apiUrl = "{$baseUrl}/atxfer";
        $queryParams['dahili'] = $params['dahili'] ?? $dahili;
        $queryParams['hedef'] = $params['hedef'] ?? '';
        if (empty($queryParams['hedef'])) {
            json_error('TRANSFER HEDEFİ GEREKLİ', 422);
        }
        break;

    case 'linkup':
        // İKİ NUMARA BAĞLA
        $apiUrl = "{$baseUrl}/linkup";
        $queryParams['numara1'] = $params['numara1'] ?? '';
        $queryParams['numara2'] = $params['numara2'] ?? '';
        if (empty($queryParams['numara1']) || empty($queryParams['numara2'])) {
            json_error('HER İKİ NUMARA DA GEREKLİ', 422);
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
        // MOLA AL / MOLA BİTİR
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
        json_error('GEÇERSİZ AKSİYON: ' . $action, 422);
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
$curlErrno = curl_errno($ch);
curl_close($ch);

if ($curlError) {
    // LOGLAMA
    try {
        log_action($user['id'], 'netsantral_' . $action . '_hata', "CURL HATA: {$curlError} (errno: {$curlErrno})", 'netsantral');
    } catch (Exception $e) {}
    json_error('NETSANTRAL BAĞLANTI HATASI: ' . $curlError, 502);
}

// LOGLAMA - TÜM AKSİYONLAR İÇİN
try {
    $logDetay = "Netsantral API: {$action}";
    $logDetay .= " | dahili=" . ($queryParams['dahili'] ?? 'YOK');
    if (isset($queryParams['hedef'])) $logDetay .= " | hedef=" . $queryParams['hedef'];
    $logDetay .= " | http={$httpCode}";
    if ($response) $logDetay .= " | yanit=" . substr($response, 0, 300);
    log_action($user['id'], 'netsantral_' . $action, $logDetay, 'netsantral');
} catch (Exception $e) {}

// DOSYA LOG (hata ayıklama için)
$logDir = __DIR__ . '/../../../data';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
@file_put_contents($logDir . '/netsantral_proxy.log',
    date('Y-m-d H:i:s') . " | {$action} | http={$httpCode} | yanit=" . substr($response ?? '', 0, 200) . "\n",
    FILE_APPEND | LOCK_EX
);

// NETSANTRAL YANITINI PARSE ET
$parsed = null;
$apiBasarili = ($httpCode >= 200 && $httpCode < 300);

// NETGSM HATA KODLARI - TÜM BİLİNEN KODLAR
$netgsmHataKodlari = [
    '20' => 'MESAJ METNİ BULUNAMIYOR',
    '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE - NETSANTRAL AYARLARINI KONTROL EDİN',
    '40' => 'YETERSİZ BAKİYE - NETGSM BAKİYENİZİ KONTROL EDİN',
    '50' => 'NETGSM SUNUCU HATASI - BİRAZ SONRA TEKNİK DENEYIN',
    '51' => 'TEKRARLANAN İSTEK - AYNI İŞLEM KISA SÜRE ÖNCE YAPILDI',
    '60' => 'GEÇERSİZ SANTRAL NUMARASI - SANTRAL NUMARASINI KONTROL EDİN',
    '70' => 'GEÇERSİZ PARAMETRE VEYA AKTİF ÇAĞRI YOK',
    '80' => 'TANIMSIZ HATA',
    '85' => 'MÜKERRER GÖNDERİM',
    '100' => 'SİSTEM HATASI - NETGSM TEKNİK DESTEK İLE İLETİŞİME GEÇİN',
    '101' => 'SİSTEMDE KAYITLI DEĞİL'
];

if ($response) {
    // Önce JSON dene - Netsantral originate başarılı yanıt:
    // {"unique_id":"sip3-xxx","caller_num":"102","called_num":"553xxx","status":"Success","message":"Successfully"}
    $parsed = json_decode($response, true);
    if ($parsed !== null && is_array($parsed)) {
        // JSON YANITLARI - status alanına göre değerlendir
        if (isset($parsed['status'])) {
            if (strtolower($parsed['status']) === 'success') {
                $apiBasarili = true;
                $parsed['hata_mesaj'] = '';
            } elseif (strtolower($parsed['status']) === 'error') {
                $apiBasarili = false;
                $hataKodu = $parsed['code'] ?? '';
                $parsed['hata_kodu'] = $hataKodu;
                $parsed['hata_mesaj'] = $netgsmHataKodlari[$hataKodu]
                    ?? ($parsed['message'] ?? 'API HATASI');
            }
        }
    } else {
        // JSON değilse düz metin olarak döndür
        $rawTrimmed = trim($response);
        $parsed = ['raw_response' => $rawTrimmed];

        if (isset($netgsmHataKodlari[$rawTrimmed])) {
            $apiBasarili = false;
            $parsed['hata_kodu'] = $rawTrimmed;
            $parsed['hata_mesaj'] = $netgsmHataKodlari[$rawTrimmed];
        } elseif (is_numeric($rawTrimmed) && strlen($rawTrimmed) <= 3 && intval($rawTrimmed) >= 20) {
            $apiBasarili = false;
            $parsed['hata_kodu'] = $rawTrimmed;
            $parsed['hata_mesaj'] = 'NETGSM HATA KODU: ' . $rawTrimmed;
        } else {
            // DÜMDÜZ BAŞARILI YANIT
            $apiBasarili = true;
        }
    }
}

// HTTP 200 bile olsa boş yanıt - bazı komutlar için bu normaldir
if ($apiBasarili && empty($response)) {
    if (in_array($action, ['originate', 'hangup', 'muteaudio', 'xfer', 'atxfer'])) {
        $parsed = ['raw_response' => 'OK', 'hata_mesaj' => ''];
        $apiBasarili = true;
    } else {
        $apiBasarili = false;
        $parsed = ['raw_response' => '', 'hata_mesaj' => 'SUNUCUDAN BOŞ YANIT GELDİ'];
    }
}

// HTTP DURUM KODU KONTROLÜ
if ($httpCode === 0) {
    $apiBasarili = false;
    $parsed = $parsed ?? [];
    $parsed['hata_mesaj'] = 'NETSANTRAL SUNUCUSUNA BAĞLANILAMADI - İNTERNET BAĞLANTISI VEYA DNS HATASI';
} elseif ($httpCode === 401 || $httpCode === 403) {
    $apiBasarili = false;
    $parsed = $parsed ?? [];
    $parsed['hata_mesaj'] = 'YETKİLENDİRME HATASI (HTTP ' . $httpCode . ') - KULLANICI ADI VE ŞİFREYİ KONTROL EDİN';
} elseif ($httpCode === 404) {
    $apiBasarili = false;
    $parsed = $parsed ?? [];
    $parsed['hata_mesaj'] = 'API ENDPOINT BULUNAMADI (HTTP 404) - SANTRAL NUMARASINI KONTROL EDİN';
} elseif ($httpCode >= 500) {
    $apiBasarili = false;
    $parsed = $parsed ?? [];
    $parsed['hata_mesaj'] = 'NETGSM SUNUCU HATASI (HTTP ' . $httpCode . ') - BİRAZ SONRA TEKRAR DENEYİN';
}

// BAŞARILI YANIT
json_success([
    'action' => $action,
    'http_code' => $httpCode,
    'response' => $parsed,
    'success_api' => $apiBasarili,
    'debug' => [
        'api_url' => preg_replace('/password=[^&]+/', 'password=***', $fullUrl),
        'santral_no' => $santralNo,
        'santral_no_api' => $santralNoClean,
        'username_api' => $usernameClean
    ]
]);
