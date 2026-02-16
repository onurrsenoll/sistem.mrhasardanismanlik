<?php
/**
 * POST /api/v1/netsantral/cagri-baslat.php
 * NetGSM NetSantral üzerinden çağrı başlatır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$db = getDB();
$data = get_json_body();

require_fields($data, ['numara']);

$numara = clean($data['numara']);
$dahili = clean($data['dahili'] ?? '');

// NetSantral ayarlarını al
$stmt = $db->query('SELECT * FROM netsantral_ayarlar WHERE aktif = 1 ORDER BY id DESC LIMIT 1');
$ayar = $stmt->fetch();

if (!$ayar) {
    json_error('NetSantral ayarları bulunamadı', 404);
}

// Dahili belirleme: parametre > kullanıcıya atanan > varsayılan
if ($dahili === '') {
    $stmt = $db->prepare('SELECT dahili FROM netsantral_dahililer WHERE kullanici_id = ? AND aktif = 1');
    $stmt->execute([$user['id']]);
    $d = $stmt->fetch();
    $dahili = $d ? $d['dahili'] : $ayar['varsayilan_dahili'];
}

// NetGSM API ile çağrı başlat
$api_url = 'https://netsantral.netgsm.com.tr/api/v1/call/originate';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $api_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_USERPWD => $ayar['kullanici_adi'] . ':' . $ayar['sifre'],
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'santral' => $ayar['santral_no'],
        'dahili' => $dahili,
        'numara' => $numara
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    json_error('Çağrı başlatılamadı: ' . $curlError, 500);
}

if ($httpCode < 200 || $httpCode >= 300) {
    json_error('Çağrı başlatılamadı (HTTP ' . $httpCode . ')', 500);
}

$responseData = json_decode($response, true);

// Arama kaydı oluştur
$stmt = $db->prepare('INSERT INTO arama_kayitlari (arama_id, yon, arayan, aranan, dahili, durum, baslangic_zamani, kaynak, kullanici_id, ham_veri) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)');
$arama_id = $responseData['data']['call_id'] ?? uniqid('call_');
$stmt->execute([
    $arama_id,
    'giden',
    $dahili,
    $numara,
    $dahili,
    'caliyor',
    'api',
    $user['id'],
    json_encode($responseData)
]);

log_action($user['id'], 'CAGRI_BASLAT', "Çağrı başlatıldı: $numara (Dahili: $dahili)", 'arama_kayitlari', $db->lastInsertId());

json_success([
    'arama_id' => $arama_id,
    'dahili' => $dahili,
    'numara' => $numara
], 'Çağrı başlatılıyor');
