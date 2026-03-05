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

// SANTRAL NO NORMALİZASYONU - NetGSM CRM Santral API
// API URL: https://crmsntrl.netgsm.com.tr/{SANTRAL_NO}/originate (HTTPS:443)
// NOT: cPanel shared hosting port 9111'e bağlanamadığı için HTTPS:443 kullanılıyor
// Erman (NetGSM) testi: username=3625026502, santral_no=3625026502
$santralNoClean = preg_replace('/[^0-9]/', '', $santralNo);
// Baştaki 0'ları temizle (0362... → 362...)
$santralNoClean = ltrim($santralNoClean, '0');

// KULLANICI ADI NORMALİZASYONU - NetGSM API: baştaki 0 olmadan
$usernameClean = ltrim(preg_replace('/[^0-9]/', '', $username), '0');

// ═══ ORIGINATE YÖNTEMİ SEÇİMİ ═══
// crmsntrl.netgsm.com.tr:9111 portu cPanel shared hosting'de BLOKE!
// Bu yüzden originate için api.netgsm.com.tr/autocallservice (HTTPS:443) kullanılıyor
// Diğer komutlar (hangup, mute, transfer) hala crmsntrl üzerinden denenecek
$baseUrl = "https://crmsntrl.netgsm.com.tr/{$santralNoClean}";
$autocallUrl = 'https://api.netgsm.com.tr/autocallservice';
$apiUrl = '';
$queryParams = [];
$useAutocall = false; // originate için autocall kullan

// ORTAK AUTH
$queryParams['username'] = $usernameClean;
$queryParams['password'] = $password;

switch ($action) {
    case 'originate':
        // ÇAĞRI BAŞLAT - autocallservice üzerinden (port 443)
        // crmsntrl:9111 portu bloke olduğu için autocall API kullanılıyor
        $hedef = $params['hedef'] ?? '';
        $dahiliParam = $params['dahili'] ?? $dahili;
        if (empty($dahiliParam)) {
            json_error('DAHİLİ NUMARASI TANIMLANMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN DAHİLİ NUMARASINI GİRİN.', 422);
        }
        if (empty($hedef)) {
            json_error('HEDEF NUMARA GEREKLİ', 422);
        }
        // HEDEF NUMARA NORMALİZASYONU - 0 ile başlamalı (05XX formatı)
        $hedefClean = preg_replace('/[^0-9]/', '', $hedef);
        if (strpos($hedefClean, '90') === 0 && strlen($hedefClean) >= 12) {
            $hedefClean = '0' . substr($hedefClean, 2); // 905XX → 05XX
        } elseif (strpos($hedefClean, '0') !== 0 && strlen($hedefClean) === 10) {
            $hedefClean = '0' . $hedefClean; // 5XX → 05XX
        }

        // AUTOCALL İLE ARAMA BAŞLAT
        $useAutocall = true;
        $autocallPostData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'addautocall',
                'data' => [
                    'list_name' => 'CRM_' . date('Ymd_His') . '_' . $dahiliParam,
                    'list_prefix' => $dahiliParam,
                    'list_type' => '1',
                    'phones' => [$hedefClean]
                ]
            ]
        ];
        break;

    case 'hangup':
        // ÇAĞRI SONLANDIR
        $apiUrl = "{$baseUrl}/hangup";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        if (empty($queryParams['internal_num'])) {
            json_error('DAHİLİ NUMARASI TANIMLANMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN DAHİLİ NUMARASINI GİRİN.', 422);
        }
        break;

    case 'muteaudio':
        // SESİ KAPAT/AÇ
        $apiUrl = "{$baseUrl}/muteaudio";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        $queryParams['direction'] = $params['direction'] ?? 'all';
        $queryParams['state'] = $params['state'] ?? 'on';
        break;

    case 'xfer':
        // KÖR TRANSFER
        $apiUrl = "{$baseUrl}/xfer";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        $queryParams['hedef'] = $params['hedef'] ?? '';
        if (empty($queryParams['hedef'])) {
            json_error('TRANSFER HEDEFİ GEREKLİ', 422);
        }
        break;

    case 'atxfer':
        // DANIŞMALI TRANSFER
        $apiUrl = "{$baseUrl}/atxfer";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
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
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        $queryParams['kuyruk'] = $params['kuyruk'] ?? '';
        break;

    case 'agentlogoff':
        // DAHİLİ KUYRUKTAN ÇIKAR
        $apiUrl = "{$baseUrl}/agentlogoff";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        $queryParams['kuyruk'] = $params['kuyruk'] ?? '';
        break;

    case 'agentpause':
        // MOLA AL / MOLA BİTİR
        $apiUrl = "{$baseUrl}/agentpause";
        $queryParams['internal_num'] = $params['dahili'] ?? $dahili;
        $queryParams['pause'] = $params['pause'] ?? '1';
        if (!empty($params['reason'])) {
            $queryParams['reason'] = $params['reason'];
        }
        break;

    case 'test':
        // BAĞLANTI TESTİ - Önce autocall API (port 443) ile test, sonra crmsntrl (port 9111)
        $useAutocall = true;
        $autocallPostData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'listautocall',
                'data' => []
            ]
        ];
        break;

    default:
        json_error('GEÇERSİZ AKSİYON: ' . $action, 422);
}

// ═══ ORIGINATE AUTOCALL İLE ÇALIŞIYORSA AYRI İŞLE ═══
if ($useAutocall) {
    $jsonPayload = json_encode($autocallPostData, JSON_UNESCAPED_UNICODE);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $autocallUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonPayload,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: MR-Hasar-CRM/1.0'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    $totalTime = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 2);
    curl_close($ch);

    // LOG
    $logDir = __DIR__ . '/../../../data';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    $logHedef = $hedefClean ?? '-';
    $logDahili = $dahiliParam ?? '-';
    @file_put_contents($logDir . '/netsantral_proxy.log',
        date('Y-m-d H:i:s') . " | {$action}_autocall | http={$httpCode} | sure={$totalTime}s | hedef={$logHedef} | dahili={$logDahili} | yanit=" . substr($response ?? '', 0, 300) . "\n",
        FILE_APPEND | LOCK_EX
    );

    try {
        log_action($user['id'], 'netsantral_' . $action . '_autocall', "Autocall {$action}: hedef={$logHedef} | dahili={$logDahili} | http={$httpCode}", 'netsantral');
    } catch (Exception $e) {}

    if ($curlError) {
        json_success([
            'action' => $action,
            'http_code' => 0,
            'response' => ['hata_mesaj' => 'AUTOCALL BAĞLANTI HATASI: ' . $curlError, 'hata_kodu' => 'CURL_' . $curlErrno],
            'success_api' => false,
            'debug' => ['api_url' => $autocallUrl, 'method' => 'autocall', 'sure' => $totalTime . 's']
        ]);
        exit;
    }

    $parsed = json_decode($response, true);
    $apiBasarili = ($httpCode >= 200 && $httpCode < 300);

    // NetGSM hata kodlarını kontrol et
    if ($parsed === null) {
        $rawTrimmed = trim($response);
        $parsed = ['raw_response' => $rawTrimmed];
        $netgsmHatalar = ['30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE', '40' => 'YETERSİZ BAKİYE', '50' => 'SUNUCU HATASI', '60' => 'GEÇERSİZ SANTRAL NUMARASI', '70' => 'GEÇERSİZ PARAMETRE'];
        if (isset($netgsmHatalar[$rawTrimmed])) {
            $apiBasarili = false;
            $parsed['hata_mesaj'] = $netgsmHatalar[$rawTrimmed];
        }
    } elseif (isset($parsed['status']) && strtolower($parsed['status']) === 'error') {
        $apiBasarili = false;
        $parsed['hata_mesaj'] = $parsed['message'] ?? 'AUTOCALL API HATASI';
    }

    if ($apiBasarili) {
        $parsed['hata_mesaj'] = '';
        $parsed['method'] = 'autocall';
        if ($action === 'originate') {
            $parsed['caller_num'] = $dahiliParam;
            $parsed['called_num'] = $hedefClean;
        }
    }

    json_success([
        'action' => $action,
        'http_code' => $httpCode,
        'response' => $parsed,
        'success_api' => $apiBasarili,
        'debug' => [
            'api_url' => $autocallUrl,
            'method' => 'autocall',
            'hedef' => $logHedef,
            'dahili' => $logDahili,
            'sure' => $totalTime . 's'
        ]
    ]);
    exit;
}

// ═══ DİĞER KOMUTLAR İÇİN crmsntrl API ═══
$fullUrl = $apiUrl . '?' . http_build_query($queryParams);

// ═══ cURL BAĞLANTI FONKSİYONU (YENİDEN DENEME DESTEKLİ) ═══
function netsantral_curl_exec($url, $attempt = 1) {
    $ch = curl_init();

    // TEMEL CURL OPSİYONLARI - HTTPS:443
    $opts = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 15,
        // SSL - HTTP kullanıldığı için sadece fallback olarak
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        // IPv4 ZORLA
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        // HTTP/1.1
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => '',
        CURLOPT_DNS_CACHE_TIMEOUT => 300,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json, text/plain, */*',
            'User-Agent: MR-Hasar-CRM/1.0 (PHP/' . PHP_VERSION . ')',
            'Cache-Control: no-cache',
            'Connection: close'
        ],
        CURLOPT_FRESH_CONNECT => ($attempt > 1),
        CURLOPT_FORBID_REUSE => ($attempt > 1),
    ];

    // 2. DENEME: HTTP versiyon kısıtlamasını kaldır
    if ($attempt === 2) {
        $opts[CURLOPT_HTTP_VERSION] = CURL_HTTP_VERSION_NONE;
    }

    // 3. DENEME: Farklı ayarlar dene
    if ($attempt >= 3) {
        $opts[CURLOPT_HTTP_VERSION] = CURL_HTTP_VERSION_NONE;
    }

    curl_setopt_array($ch, $opts);

    $response = curl_exec($ch);
    $info = [
        'http_code'     => curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'curl_error'    => curl_error($ch),
        'curl_errno'    => curl_errno($ch),
        'effective_url' => curl_getinfo($ch, CURLINFO_EFFECTIVE_URL),
        'total_time'    => round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 2),
        'primary_ip'    => curl_getinfo($ch, CURLINFO_PRIMARY_IP),
        'ssl_verify'    => curl_getinfo($ch, CURLINFO_SSL_VERIFYRESULT),
        'attempt'       => $attempt
    ];
    curl_close($ch);

    return ['response' => $response, 'info' => $info];
}

// ═══ İSTEK GÖNDER (HATADA 3 DENEME) ═══
$maxAttempts = 3;
$result = null;
$allAttempts = [];

for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
    $result = netsantral_curl_exec($fullUrl, $attempt);
    $allAttempts[] = [
        'deneme' => $attempt,
        'errno' => $result['info']['curl_errno'],
        'error' => $result['info']['curl_error'],
        'http_code' => $result['info']['http_code'],
        'sure' => $result['info']['total_time'] . 's',
        'ip' => $result['info']['primary_ip']
    ];

    // BAŞARILI VEYA API SEVİYESİNDE HATA (YENİDEN DENEMEYE GEREK YOK)
    if (empty($result['info']['curl_error'])) {
        break;
    }

    // SON DENEME DEĞİLSE KISA BEKLEYİP TEKRAR DENE
    if ($attempt < $maxAttempts) {
        usleep(500000); // 500ms
    }
}

$response = $result['response'];
$httpCode = $result['info']['http_code'];
$curlError = $result['info']['curl_error'];
$curlErrno = $result['info']['curl_errno'];
$totalTime = $result['info']['total_time'];
$primaryIp = $result['info']['primary_ip'];
$totalAttempts = count($allAttempts);

// LOG DOSYASI İÇİN DİZİN
$logDir = __DIR__ . '/../../../data';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);

if ($curlError) {
    // LOGLAMA
    try {
        log_action($user['id'], 'netsantral_' . $action . '_hata', "CURL HATA: {$curlError} (errno: {$curlErrno}, deneme: {$totalAttempts})", 'netsantral');
    } catch (Exception $e) {}

    // DOSYA LOG
    @file_put_contents($logDir . '/netsantral_proxy.log',
        date('Y-m-d H:i:s') . " | {$action} | CURL_HATA | errno={$curlErrno} | deneme={$totalAttempts} | ip={$primaryIp} | {$curlError}\n",
        FILE_APPEND | LOCK_EX
    );

    // HATA MESAJLARINI TÜRKÇE'YE ÇEVİR VE DETAY EKLE
    $turkceHata = $curlError;
    $cozumOnerisi = '';

    if (stripos($curlError, 'SSL') !== false || stripos($curlError, 'certificate') !== false) {
        $turkceHata = 'SSL SERTİFİKA HATASI - SUNUCU BAĞLANTISI GÜVENLİ KURULAMADI';
        $cozumOnerisi = 'SUNUCUNUZUN SSL SERTİFİKASI VE PHP CURL MODÜLÜ KONTROL EDİLMELİ';
    } elseif (stripos($curlError, 'resolve') !== false || stripos($curlError, 'DNS') !== false) {
        $turkceHata = 'DNS ÇÖZÜMLEME HATASI - NETGSM SUNUCUSU (crmsntrl.netgsm.com.tr) BULUNAMIYOR';
        $cozumOnerisi = 'SUNUCUNUZUN DNS AYARLARINI KONTROL EDİN VEYA HOSTİNG FİRMANIZLA İLETİŞİME GEÇİN';
    } elseif (stripos($curlError, 'timeout') !== false || stripos($curlError, 'timed out') !== false) {
        $turkceHata = 'ZAMAN AŞIMI - NETGSM SUNUCUSU YANITLAMIYOR';
        $cozumOnerisi = 'SUNUCUNUZDAN DIS BAĞLANTI İZNİ OLDUĞUNU VE FIREWALL AYARLARINI KONTROL EDİN';
    } elseif (stripos($curlError, 'connection') !== false || stripos($curlError, 'connect') !== false || stripos($curlError, 'refused') !== false) {
        $turkceHata = 'BAĞLANTI HATASI - NETGSM SUNUCUSUNA ERİŞİLEMİYOR';
        $cozumOnerisi = 'SUNUCUNUZUN HTTPS (443) PORTU ÜZERİNDEN DIS BAĞLANTI YAPIP YAPAMADIĞINI KONTROL EDİN';
    } elseif (stripos($curlError, 'protocol') !== false || stripos($curlError, 'HTTP') !== false || $curlErrno == 1 || $curlErrno == 16) {
        $turkceHata = 'HTTP PROTOKOL HATASI - SUNUCUNUZUN CURL MODÜLÜ NETGSM İLE UYUMSUZ OLABİLİR';
        $cozumOnerisi = 'cPanel PHP SÜRÜMÜNÜ 8.1+ YAPIN VE CURL MODÜLÜNÜ KONTROL EDİN. VEYA HOSTİNG FİRMANIZDAN 443 PORTUNA DIS BAGLANTI İZNİ İSTEYİN.';
    } elseif ($curlErrno == 7) {
        $turkceHata = 'BAĞLANTI REDDEDİLDİ - NETGSM SUNUCUSU ERİŞİLEMİYOR';
        $cozumOnerisi = 'FIREWALL KURALLARINI VE SUNUCU DIS BAĞLANTI AYARLARINI KONTROL EDİN';
    }

    json_success([
        'action' => $action,
        'http_code' => 0,
        'response' => [
            'hata_mesaj' => $turkceHata,
            'hata_kodu' => 'CURL_' . $curlErrno,
            'cozum_onerisi' => $cozumOnerisi,
            'deneme_sayisi' => $totalAttempts
        ],
        'success_api' => false,
        'debug' => [
            'api_url' => preg_replace('/password=[^&]+/', 'password=***', $fullUrl),
            'santral_no' => $santralNo,
            'santral_no_api' => $santralNoClean,
            'username_api' => $usernameClean,
            'curl_errno' => $curlErrno,
            'curl_error' => $curlError,
            'primary_ip' => $primaryIp,
            'sure' => $totalTime . 's',
            'denemeler' => $allAttempts,
            'php_version' => PHP_VERSION,
            'curl_version' => function_exists('curl_version') ? curl_version()['version'] : 'BİLİNMİYOR'
        ]
    ]);
    exit;
}

// LOGLAMA - TÜM AKSİYONLAR İÇİN
try {
    $logDetay = "Netsantral API: {$action}";
    $logDetay .= " | dahili=" . ($queryParams['dahili'] ?? 'YOK');
    if (isset($queryParams['hedef'])) $logDetay .= " | hedef=" . $queryParams['hedef'];
    $logDetay .= " | http={$httpCode}";
    $logDetay .= " | ip={$primaryIp}";
    $logDetay .= " | deneme={$totalAttempts}";
    if ($response) $logDetay .= " | yanit=" . substr($response, 0, 300);
    log_action($user['id'], 'netsantral_' . $action, $logDetay, 'netsantral');
} catch (Exception $e) {}

// DOSYA LOG (hata ayıklama için)
@file_put_contents($logDir . '/netsantral_proxy.log',
    date('Y-m-d H:i:s') . " | {$action} | http={$httpCode} | ip={$primaryIp} | deneme={$totalAttempts} | yanit=" . substr($response ?? '', 0, 200) . "\n",
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

// ═══ TEST AKSİYONU: ÇOKLU FORMAT DENEMESİ ═══
if ($action === 'test' && !$apiBasarili) {
    $altFormatlar = [];
    $orijinalSantral = $santralNoClean;

    // 850 prefiksi yoksa ekle
    if (strpos($santralNoClean, '850') !== 0) {
        $altFormatlar[] = '850' . $santralNoClean;
    }
    // 850 prefiksi varsa çıkar
    if (strpos($santralNoClean, '850') === 0 && strlen($santralNoClean) > 3) {
        $altFormatlar[] = substr($santralNoClean, 3);
    }
    // Orijinal girilen değeri de dene (trim edilmemiş hali)
    $orijinalTrimmed = ltrim($santralNo, '0');
    if ($orijinalTrimmed !== $santralNoClean && !in_array($orijinalTrimmed, $altFormatlar)) {
        $altFormatlar[] = $orijinalTrimmed;
    }

    foreach ($altFormatlar as $altNo) {
        $altQuery = http_build_query(['username' => $usernameClean, 'password' => $password]);
        $altUrl = "https://crmsntrl.netgsm.com.tr/{$altNo}/queuestats?{$altQuery}";
        $altResult = netsantral_curl_exec($altUrl, 1);

        if (!empty($altResult['info']['curl_error'])) continue;

        $altResp = trim($altResult['response']);
        $altHata = ['30','60','70','100','101'];

        if ($altResult['info']['http_code'] === 200 && !in_array($altResp, $altHata)) {
            // Bu format çalıştı!
            $apiBasarili = true;
            $parsed = json_decode($altResult['response'], true);
            if ($parsed === null) {
                $parsed = ['raw_response' => $altResp];
            }
            $parsed['hata_mesaj'] = '';
            $parsed['oneri_santral_no'] = '0' . $altNo;
            $parsed['oneri_mesaj'] = 'SANTRAL NUMARANIZI "0' . $altNo . '" OLARAK GÜNCELLEYİN';
            $santralNoClean = $altNo;

            // Log başarılı alternatif format
            @file_put_contents($logDir . '/netsantral_proxy.log',
                date('Y-m-d H:i:s') . " | test | ALTERNATİF FORMAT BAŞARILI: {$altNo} (orijinal: {$orijinalSantral})\n",
                FILE_APPEND | LOCK_EX
            );
            break;
        }
    }

    // Hiçbir format çalışmadıysa, hata mesajına format önerisi ekle
    if (!$apiBasarili) {
        $parsed = $parsed ?? [];
        $parsed['format_onerisi'] = 'SANTRAL NUMARASINI ŞU FORMATLARDA DENEYİN: 0850' . ltrim($santralNo, '0') . ' VEYA ' . $santralNo;
        $parsed['hat_kullanici_uyari'] = 'NETGSM PANELDE "HAT KULLANICI BİLGİSİ" SEKMESINDEN KULLANICI ADI VE ŞİFRENİZİ KONTROL EDİN';
    }
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
        'username_api' => $usernameClean,
        'primary_ip' => $primaryIp,
        'sure' => $totalTime . 's',
        'deneme' => $totalAttempts
    ]
]);
