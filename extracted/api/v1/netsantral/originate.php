<?php
/**
 * MR HASAR DANIŞMANLIK - NETSANTRAL ÇAĞRI BAŞLATMA (ORIGINATE) API
 * Netgsm Netsantral CRM API Proxy
 *
 * API: POST http://crmsntrl.netgsm.com.tr:9111/{username}/originate
 *
 * Akış:
 *   1. Frontend → Bu endpoint'e istek atar
 *   2. Bu endpoint → Netgsm Netsantral API'ye istek atar
 *   3. Netsantral → Dahiliyi çalar (102)
 *   4. Agent WebRTC/NetSip üzerinden cevaplar
 *   5. Netsantral → Müşteriyi arar
 *   6. İki taraf köprülenir
 */

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

// YETKİ KONTROLÜ
$user = auth_required();

// SADECE POST KABUL ET
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'SADECE POST METODU KABUL EDİLİR']);
    exit;
}

// İSTEK VERİSİ
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ JSON VERİSİ']);
    exit;
}

$numara = isset($input['numara']) ? trim($input['numara']) : '';
$dahili = isset($input['dahili']) ? trim($input['dahili']) : '';

if (empty($numara)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ARANACAK NUMARA GEREKLİ']);
    exit;
}

// NETSANTRAL AYARLARINI VERİTABANINDAN VEYA İSTEKTEN AL
$db = getDB();
$ayarlar = [];
try {
    $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
    while ($row = $stmt->fetch()) {
        $ayarlar[$row['anahtar']] = $row['deger'];
    }
} catch (Exception $e) {}

$username = isset($input['kullanici']) ? $input['kullanici'] : (isset($ayarlar['netsantral_kullanici']) ? $ayarlar['netsantral_kullanici'] : '');
$password = isset($input['apiSifre']) ? $input['apiSifre'] : (isset($ayarlar['netsantral_api_sifre']) ? $ayarlar['netsantral_api_sifre'] : '');
$extension = !empty($dahili) ? $dahili : (isset($ayarlar['netsantral_dahili']) ? $ayarlar['netsantral_dahili'] : '102');
$santralNo = isset($input['santralNo']) ? $input['santralNo'] : (isset($ayarlar['netsantral_santral_no']) ? $ayarlar['netsantral_santral_no'] : '');
$trunk = !empty($santralNo) ? $santralNo : $username;

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'NETSANTRAL API KİMLİK BİLGİLERİ EKSİK (KULLANICI/ŞİFRE)']);
    exit;
}

// TELEFON NUMARASI NORMALİZE
$cleanNum = preg_replace('/[\s\-\(\)\+]/', '', $numara);
// +90 veya 90 ile başlıyorsa 0'lı formata çevir
if (substr($cleanNum, 0, 2) === '90' && strlen($cleanNum) === 12) {
    $cleanNum = '0' . substr($cleanNum, 2);
}
// Başında 0 yoksa ve 10 haneli ise ekle
if (substr($cleanNum, 0, 1) !== '0' && strlen($cleanNum) === 10) {
    $cleanNum = '0' . $cleanNum;
}

// NETSANTRAL API İSTEĞİ
$apiUrl = "http://crmsntrl.netgsm.com.tr:9111/{$username}/originate";

$postData = [
    'username'         => $username,
    'password'         => $password,
    'customer_num'     => $cleanNum,
    'internal_num'     => $extension,
    'trunk'            => $trunk,
    'pbxnum'           => $trunk,
    'ring_timeout'     => isset($input['ring_timeout']) ? intval($input['ring_timeout']) : 20,
    'crm_id'           => isset($input['crm_id']) ? intval($input['crm_id']) : 1,
    'wait_response'    => 1,
    'originate_order'  => isset($input['originate_order']) ? $input['originate_order'] : 'of'
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $apiUrl,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($postData),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: MR-Hasar-CRM/1.0'
    ]
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// LOG KAYDI
try {
    log_action($user['id'], 'NETSANTRAL_ORIGINATE', json_encode([
        'numara' => $cleanNum,
        'dahili' => $extension,
        'http_code' => $httpCode,
        'curl_error' => $curlError ?: null,
        'response' => $response ? mb_substr($response, 0, 500) : null
    ]), 'netsantral', null);
} catch (Exception $e) {}

// CURL HATASI
if ($curlError) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error' => 'NETSANTRAL API BAĞLANTI HATASI: ' . $curlError,
        'curl_errno' => $curlErrno
    ]);
    exit;
}

// YANIT İŞLE
$responseData = json_decode($response, true);

if ($responseData && isset($responseData['status']) && $responseData['status'] === 'Success') {
    echo json_encode([
        'success' => true,
        'mesaj' => 'ÇAĞRI BAŞLATILDI',
        'data' => [
            'unique_id' => isset($responseData['unique_id']) ? $responseData['unique_id'] : (isset($responseData['data']['unique_id']) ? $responseData['data']['unique_id'] : null),
            'crm_id' => isset($responseData['crm_id']) ? $responseData['crm_id'] : (isset($responseData['data']['crm_id']) ? $responseData['data']['crm_id'] : null),
            'numara' => $cleanNum,
            'dahili' => $extension
        ]
    ]);
} else {
    $errorMsg = 'NETSANTRAL API HATASI';
    if ($responseData && isset($responseData['message'])) {
        $errorMsg = $responseData['message'];
    } elseif ($response) {
        $errorMsg = mb_substr($response, 0, 300);
    }

    http_response_code(200); // Frontend'e 200 döndür, hata success: false ile bildirilir
    echo json_encode([
        'success' => false,
        'error' => $errorMsg,
        'http_code' => $httpCode,
        'raw_response' => $response ? mb_substr($response, 0, 500) : null
    ]);
}
