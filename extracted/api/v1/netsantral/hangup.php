<?php
/**
 * POST /api/v1/netsantral/hangup.php
 * NETSANTRAL ÇAĞRI SONLANDIRMA (HANGUP)
 * PBX üzerinden aktif çağrıyı sonlandırır
 *
 * Body: { "dahili": "102" (opsiyonel) }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$body = get_json_body();

$db = getDB();

// AYARLARI OKU
$ayarlar = [];
try {
    $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $ayarlar[$row['anahtar']] = $row['deger'];
    }
} catch (Exception $e) {
    json_error('AYARLAR OKUNAMADI: ' . $e->getMessage(), 500);
}

$santralNo = $ayarlar['netsantral_santral_no'] ?? '';
$kullanici = $ayarlar['netsantral_kullanici'] ?? '';
$sifre = $ayarlar['netsantral_sifre'] ?? '';
$defaultDahili = $ayarlar['netsantral_dahili'] ?? '';
$aktif = ($ayarlar['netsantral_aktif'] ?? '0') === '1';

$dahili = $body['dahili'] ?? $defaultDahili;

if (!$aktif) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'NETSANTRAL PASİF DURUMDA']
    ]);
}

if (empty($kullanici) || empty($sifre) || empty($dahili)) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'EKSİK PARAMETRELER (KULLANICI/ŞİFRE/DAHİLİ)']
    ]);
}

// SANTRAL NUMARASINI TEMİZLE
$cleanSantral = preg_replace('/[^0-9]/', '', $santralNo);
if (substr($cleanSantral, 0, 4) === '0850') {
    $cleanSantral = substr($cleanSantral, 4);
}
$cleanSantral = ltrim($cleanSantral, '0');

$debug = [
    'dahili' => $dahili,
    'santral' => $cleanSantral,
    'kullanici' => $kullanici
];

// NETGSM NETSANTRAL HANGUP API
// Doğru endpoint: http://crmsntrl.netgsm.com.tr:9111/hangup
$postData = http_build_query([
    'username' => $kullanici,
    'password' => $sifre,
    'pbxnum' => $cleanSantral,
    'internal_num' => $dahili
]);

$result = http_post(
    'http://crmsntrl.netgsm.com.tr:9111/hangup',
    $postData,
    ['Content-Type: application/x-www-form-urlencoded'],
    15
);

$debug['http_code'] = $result['http_code'];
$debug['http_method'] = $result['method'];
$debug['http_error'] = $result['error'];

if ($result['body'] !== false) {
    $body_text = trim($result['body']);
    $debug['raw_response'] = substr($body_text, 0, 500);

    // Hata kodu kontrolü
    if (preg_match('/^(\d{2,3})$/', $body_text, $m)) {
        $hatKodu = $m[1];
        $hataMesajlari = [
            '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
            '40' => 'EKSİK PARAMETRELER',
            '50' => 'SİSTEM HATASI',
            '60' => 'DAHİLİ BULUNAMADI',
            '70' => 'GEÇERSİZ PARAMETRE VEYA AKTİF ÇAĞRI YOK',
            '100' => 'SİSTEM BAKIMDA'
        ];

        // 70 = aktif çağrı yok = zaten kapanmış = başarılı sayılabilir
        $isSuccess = ($hatKodu === '70');

        json_success([
            'success_api' => $isSuccess,
            'response' => [
                'hata_mesaj' => $hataMesajlari[$hatKodu] ?? 'BİLİNMEYEN HATA: ' . $hatKodu,
                'hata_kodu' => $hatKodu,
                'raw_response' => $body_text
            ],
            'http_code' => $result['http_code'],
            'debug' => $debug
        ]);
    }
    // Başarılı yanıt
    else if ($body_text === '00' || $body_text === '0' || (strlen($body_text) > 3 && $result['http_code'] === 200)) {
        json_success([
            'success_api' => true,
            'response' => [
                'mesaj' => 'ÇAĞRI SONLANDIRILDI',
                'dahili' => $dahili,
                'raw_response' => $body_text
            ],
            'http_code' => $result['http_code'],
            'debug' => $debug
        ]);
    }
    // Diğer yanıtlar
    else {
        json_success([
            'success_api' => false,
            'response' => [
                'hata_mesaj' => 'BEKLENMEDİK YANIT: ' . substr($body_text, 0, 200),
                'raw_response' => $body_text
            ],
            'http_code' => $result['http_code'],
            'debug' => $debug
        ]);
    }
} else {
    json_success([
        'success_api' => false,
        'response' => [
            'hata_mesaj' => 'NETGSM API BAĞLANTI HATASI: ' . ($result['error'] ?: 'BİLİNMEYEN HATA'),
            'raw_response' => ''
        ],
        'http_code' => $result['http_code'],
        'debug' => $debug
    ]);
}
