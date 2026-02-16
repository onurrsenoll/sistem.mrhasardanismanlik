<?php
/**
 * POST /api/v1/netsantral/baglanti-test.php
 * NetGSM NetSantral API bağlantı testi (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();
$data = get_json_body();

// Parametreler ya body'den ya da mevcut ayarlardan gelsin
$santral_no = clean($data['santral_no'] ?? '');
$kullanici_adi = clean($data['kullanici_adi'] ?? '');
$sifre = $data['sifre'] ?? '';

// Eğer body'de yoksa veritabanından al
if ($santral_no === '' || $kullanici_adi === '') {
    $stmt = $db->query('SELECT santral_no, kullanici_adi, sifre FROM netsantral_ayarlar ORDER BY id DESC LIMIT 1');
    $ayar = $stmt->fetch();
    if (!$ayar) {
        json_error('NetSantral ayarları bulunamadı. Önce ayarları kaydedin.', 404);
    }
    if ($santral_no === '') $santral_no = $ayar['santral_no'];
    if ($kullanici_adi === '') $kullanici_adi = $ayar['kullanici_adi'];
    if ($sifre === '') $sifre = $ayar['sifre'];
}

if ($santral_no === '' || $kullanici_adi === '' || $sifre === '') {
    json_error('Santral no, kullanıcı adı ve şifre gereklidir', 422);
}

// NetGSM NetSantral API'ye bağlantı testi
// API endpoint: https://netsantral.netgsm.com.tr/api/v1
$api_url = 'https://netsantral.netgsm.com.tr/api/v1/extension/list';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $api_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_USERPWD => $kullanici_adi . ':' . $sifre,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'santral' => $santral_no
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Bağlantı durumunu güncelle
$durum = ($httpCode >= 200 && $httpCode < 300) ? 'basarili' : 'basarisiz';
$stmt = $db->prepare('UPDATE netsantral_ayarlar SET son_baglanti_durumu = ?, son_baglanti_tarihi = NOW() WHERE id = (SELECT id FROM (SELECT id FROM netsantral_ayarlar ORDER BY id DESC LIMIT 1) tmp)');
$stmt->execute([$durum]);

if ($curlError) {
    log_action($user['id'], 'NETSANTRAL_BAGLANTI_TEST', 'Bağlantı hatası: ' . $curlError, 'netsantral_ayarlar', null);
    json_error('BAĞLANTI HATASI: ' . $curlError, 500);
}

if ($httpCode === 401 || $httpCode === 403) {
    log_action($user['id'], 'NETSANTRAL_BAGLANTI_TEST', 'Kullanıcı doğrulanamadı (HTTP ' . $httpCode . ')', 'netsantral_ayarlar', null);
    json_error('KULLANICI DOĞRULANAMADI - Lütfen santral numarası, kullanıcı adı ve şifrenizi kontrol ediniz.', 401);
}

if ($httpCode < 200 || $httpCode >= 300) {
    log_action($user['id'], 'NETSANTRAL_BAGLANTI_TEST', 'API hatası (HTTP ' . $httpCode . ')', 'netsantral_ayarlar', null);
    json_error('API YANIT HATASI (HTTP ' . $httpCode . ')', 500);
}

$responseData = json_decode($response, true);

// Bağlantı başarılı - yetenekleri döndür
$yetenekler = [
    ['id' => 'cagri_baslat', 'label' => 'Çağrı Başlat / Sonlandır', 'aktif' => true],
    ['id' => 'sessize_al', 'label' => 'Sessiz / Sesli', 'aktif' => true],
    ['id' => 'cagri_transfer', 'label' => 'Çağrı Transferi', 'aktif' => true],
    ['id' => 'kuyruk_yonetimi', 'label' => 'Kuyruk Yönetimi', 'aktif' => true],
    ['id' => 'cagri_gecmisi', 'label' => 'Çağrı Geçmişi & Raporlar', 'aktif' => true]
];

log_action($user['id'], 'NETSANTRAL_BAGLANTI_TEST', 'Bağlantı başarılı', 'netsantral_ayarlar', null);

json_success([
    'durum' => 'basarili',
    'http_code' => $httpCode,
    'yetenekler' => $yetenekler,
    'dahililer' => $responseData['data'] ?? []
], 'BAĞLANTI BAŞARILI');
