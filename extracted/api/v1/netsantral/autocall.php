<?php
/**
 * POST /api/v1/netsantral/autocall.php
 * NetGSM Otomatik Arama (AutoCall) API Proxy
 *
 * API: https://api.netgsm.com.tr/autocallservice
 * Dökümantasyon: NetSantral > Otomatik Arama
 *
 * Body: { action: "liste_olustur|liste_durdur|liste_baslat|rapor|numara_ekle|numara_cikar|durum_guncelle", params: {...} }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin', 'uzman', 'personel']);
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

if (empty($username) || empty($password)) {
    json_error('NETSANTRAL AYARLARI YAPILANDIRILMAMIŞ. SİSTEM > NETSANTRAL AYARLARI BÖLÜMÜNDEN AYARLARI GİRİN.', 400);
}

// KULLANICI ADI NORMALİZASYONU
$usernameClean = ltrim(preg_replace('/[^0-9]/', '', $username), '0');

// LOG DİZİNİ
$logDir = __DIR__ . '/../../../data';
if (!is_dir($logDir)) @mkdir($logDir, 0755, true);

// ═══ AUTOCALL API URL ═══
$autocallUrl = 'https://api.netgsm.com.tr/autocallservice';

// ═══ AKSİYONLARA GÖRE İSTEK HAZIRLA ═══
$postData = [];

switch ($action) {

    case 'liste_olustur':
        // OTOMATİK ARAMA LİSTESİ OLUŞTUR
        // Gerekli: list_name, list_prefix, numara listesi
        $listName = $params['list_name'] ?? '';
        $listPrefix = $params['list_prefix'] ?? '110'; // Varsayılan anons
        $numaralar = $params['numaralar'] ?? []; // ["05XX...", "05XX..."]
        $listType = $params['list_type'] ?? 'static'; // static veya dynamic(interaktif)

        if (empty($listName)) {
            json_error('LİSTE ADI GEREKLİ', 422);
        }
        if (empty($numaralar) || !is_array($numaralar)) {
            json_error('EN AZ BİR NUMARA GEREKLİ', 422);
        }

        // Numaraları temizle - 05XX formatına çevir
        $cleanNumaralar = [];
        foreach ($numaralar as $num) {
            $clean = preg_replace('/[^0-9]/', '', $num);
            if (strpos($clean, '90') === 0 && strlen($clean) >= 12) {
                $clean = '0' . substr($clean, 2);
            } elseif (strpos($clean, '0') !== 0 && strlen($clean) === 10) {
                $clean = '0' . $clean;
            }
            if (strlen($clean) >= 10) {
                $cleanNumaralar[] = $clean;
            }
        }

        if (empty($cleanNumaralar)) {
            json_error('GEÇERLİ NUMARA BULUNAMADI', 422);
        }

        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'addautocall',
                'data' => [
                    'list_name' => $listName,
                    'list_prefix' => $listPrefix,
                    'list_type' => $listType === 'dynamic' ? '1' : '0',
                    'phones' => $cleanNumaralar
                ]
            ]
        ];
        break;

    case 'liste_durdur':
        // OTOMATİK ARAMA LİSTESİNİ DURDUR
        $listId = $params['list_id'] ?? '';
        if (empty($listId)) {
            json_error('LİSTE ID GEREKLİ', 422);
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'stopautocall',
                'data' => [
                    'list_id' => $listId
                ]
            ]
        ];
        break;

    case 'liste_baslat':
        // DURDURULAN LİSTEYİ TEKRAR BAŞLAT
        $listId = $params['list_id'] ?? '';
        if (empty($listId)) {
            json_error('LİSTE ID GEREKLİ', 422);
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'startautocall',
                'data' => [
                    'list_id' => $listId
                ]
            ]
        ];
        break;

    case 'numara_ekle':
        // DİNAMİK LİSTEYE NUMARA EKLE
        $listId = $params['list_id'] ?? '';
        $numaralar = $params['numaralar'] ?? [];
        if (empty($listId)) {
            json_error('LİSTE ID GEREKLİ', 422);
        }
        if (empty($numaralar)) {
            json_error('NUMARA LİSTESİ GEREKLİ', 422);
        }
        $cleanNumaralar = [];
        foreach ($numaralar as $num) {
            $clean = preg_replace('/[^0-9]/', '', $num);
            if (strpos($clean, '90') === 0 && strlen($clean) >= 12) {
                $clean = '0' . substr($clean, 2);
            } elseif (strpos($clean, '0') !== 0 && strlen($clean) === 10) {
                $clean = '0' . $clean;
            }
            if (strlen($clean) >= 10) {
                $cleanNumaralar[] = $clean;
            }
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'addphone',
                'data' => [
                    'list_id' => $listId,
                    'phones' => $cleanNumaralar
                ]
            ]
        ];
        break;

    case 'numara_cikar':
        // LİSTEDEN NUMARA ÇIKAR
        $listId = $params['list_id'] ?? '';
        $numaralar = $params['numaralar'] ?? [];
        if (empty($listId)) {
            json_error('LİSTE ID GEREKLİ', 422);
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'removephone',
                'data' => [
                    'list_id' => $listId,
                    'phones' => $numaralar
                ]
            ]
        ];
        break;

    case 'rapor':
        // OTOMATİK ARAMA RAPORU
        $listId = $params['list_id'] ?? '';
        if (empty($listId)) {
            json_error('LİSTE ID GEREKLİ', 422);
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'autocallreport',
                'data' => [
                    'list_id' => $listId
                ]
            ]
        ];
        break;

    case 'durum_guncelle':
        // NUMARA DURUM GÜNCELLE
        $listId = $params['list_id'] ?? '';
        $phone = $params['phone'] ?? '';
        $status = $params['status'] ?? '';
        if (empty($listId) || empty($phone)) {
            json_error('LİSTE ID VE NUMARA GEREKLİ', 422);
        }
        $postData = [
            'header' => [
                'username' => $usernameClean,
                'password' => $password
            ],
            'body' => [
                'event' => 'updatestatus',
                'data' => [
                    'list_id' => $listId,
                    'phone' => $phone,
                    'status' => $status
                ]
            ]
        ];
        break;

    case 'listeler':
        // TÜM OTOMATİK ARAMA LİSTELERİ
        $postData = [
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

// ═══ HTTP İSTEĞİ GÖNDER (POST JSON) ═══
$jsonPayload = json_encode($postData, JSON_UNESCAPED_UNICODE);

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
@file_put_contents($logDir . '/netsantral_autocall.log',
    date('Y-m-d H:i:s') . " | {$action} | http={$httpCode} | sure={$totalTime}s | yanit=" . substr($response ?? '', 0, 500) . "\n",
    FILE_APPEND | LOCK_EX
);

try {
    log_action($user['id'], 'netsantral_autocall_' . $action, "AutoCall API: {$action} | http={$httpCode}", 'netsantral');
} catch (Exception $e) {}

// CURL HATASI
if ($curlError) {
    json_success([
        'action' => $action,
        'http_code' => 0,
        'response' => ['hata_mesaj' => 'BAĞLANTI HATASI: ' . $curlError],
        'success_api' => false
    ]);
    exit;
}

// YANITINI PARSE ET
$parsed = json_decode($response, true);
$apiBasarili = ($httpCode >= 200 && $httpCode < 300);

if ($parsed === null) {
    $parsed = ['raw_response' => trim($response)];
    // NetGSM hata kodları
    $rawTrimmed = trim($response);
    $netgsmHataKodlari = [
        '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
        '40' => 'YETERSİZ BAKİYE',
        '50' => 'SUNUCU HATASI',
        '60' => 'GEÇERSİZ SANTRAL NUMARASI',
        '70' => 'GEÇERSİZ PARAMETRE',
    ];
    if (isset($netgsmHataKodlari[$rawTrimmed])) {
        $apiBasarili = false;
        $parsed['hata_mesaj'] = $netgsmHataKodlari[$rawTrimmed];
    }
}

// BAŞARILI YANIT
json_success([
    'action' => $action,
    'http_code' => $httpCode,
    'response' => $parsed,
    'success_api' => $apiBasarili,
    'debug' => [
        'api_url' => $autocallUrl,
        'sure' => $totalTime . 's'
    ]
]);
