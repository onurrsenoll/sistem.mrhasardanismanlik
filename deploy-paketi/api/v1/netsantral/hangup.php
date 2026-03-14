<?php
/**
 * MR HASAR DANIŞMANLIK - NETSANTRAL ÇAĞRI SONLANDIRMA (HANGUP) API
 * Netgsm Netsantral CRM API Proxy
 *
 * API: POST http://crmsntrl.netgsm.com.tr:9111/{username}/hangup
 */

require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

$user = auth_required();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'SADECE POST METODU KABUL EDİLİR']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ JSON VERİSİ']);
    exit;
}

// NETSANTRAL AYARLARINI AL
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

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'NETSANTRAL API KİMLİK BİLGİLERİ EKSİK']);
    exit;
}

$apiUrl = "http://crmsntrl.netgsm.com.tr:9111/{$username}/hangup";

$postData = [
    'username'  => $username,
    'password'  => $password,
    'unique_id' => isset($input['unique_id']) ? $input['unique_id'] : '',
    'crm_id'    => isset($input['crm_id']) ? intval($input['crm_id']) : ''
];

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $apiUrl,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($postData),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: MR-Hasar-CRM/1.0'
    ]
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

try {
    log_action($user['id'], 'NETSANTRAL_HANGUP', json_encode([
        'unique_id' => $postData['unique_id'],
        'http_code' => $httpCode,
        'response' => $response ? mb_substr($response, 0, 300) : null
    ]), 'netsantral', null);
} catch (Exception $e) {}

if ($curlError) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'NETSANTRAL API BAĞLANTI HATASI: ' . $curlError]);
    exit;
}

$responseData = json_decode($response, true);

if ($responseData && isset($responseData['status']) && $responseData['status'] === 'Success') {
    echo json_encode(['success' => true, 'mesaj' => 'ÇAĞRI SONLANDIRILDI']);
} else {
    $errorMsg = ($responseData && isset($responseData['message'])) ? $responseData['message'] : ($response ?: 'BİLİNMEYEN HATA');
    echo json_encode(['success' => false, 'error' => $errorMsg]);
}
