<?php
/**
 * POST /api/v1/netsantral/originate.php
 * NETSANTRAL CLICK-TO-CALL (ORIGINATE)
 * PBX üzerinden dahili telefonu çaldırıp, cevaplandığında dış numarayı arar
 *
 * Body: { "numara": "905551234567", "dahili": "102" (opsiyonel) }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$body = get_json_body();

$numara = preg_replace('/[^0-9]/', '', $body['numara'] ?? '');
if (empty($numara) || strlen($numara) < 10) {
    json_error('GEÇERLİ BİR TELEFON NUMARASI GİRİN', 422);
}

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

// BODY'DEN GELEN DAHİLİ VEYA DEFAULT
$dahili = $body['dahili'] ?? $defaultDahili;

if (!$aktif) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'NETSANTRAL PASİF DURUMDA']
    ]);
}

if (empty($kullanici) || empty($sifre)) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'KULLANICI ADI VEYA ŞİFRE EKSİK']
    ]);
}

if (empty($dahili)) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'DAHİLİ NUMARASI BELİRTİLMEMİŞ']
    ]);
}

// NUMARA FORMATLA (NetGSM Netsantral API için)
// NetGSM API '905551234567' formatını bekler (12 hane, 90 ile başlar)
if (substr($numara, 0, 2) === '90' && strlen($numara) === 12) {
    // Zaten doğru formatta: 905551234567
} elseif (substr($numara, 0, 1) === '0' && strlen($numara) === 11) {
    // 05551234567 → 905551234567
    $numara = '9' . $numara;
} elseif (strlen($numara) === 10 && substr($numara, 0, 1) !== '0') {
    // 5551234567 → 905551234567
    $numara = '90' . $numara;
}

// SANTRAL NUMARASINI TEMİZLE
$cleanSantral = preg_replace('/[^0-9]/', '', $santralNo);
if (substr($cleanSantral, 0, 4) === '0850') {
    $cleanSantral = substr($cleanSantral, 4);
}
$cleanSantral = ltrim($cleanSantral, '0');

$debug = [
    'numara' => $numara,
    'dahili' => $dahili,
    'santral' => $cleanSantral,
    'kullanici' => $kullanici
];

// NETGSM NETSANTRAL ORIGINATE API
// Doğru endpoint: http://crmsntrl.netgsm.com.tr:9111/originate
$postData = http_build_query([
    'username' => $kullanici,
    'password' => $sifre,
    'customer_num' => $numara,
    'pbxnum' => $cleanSantral,
    'internal_num' => $dahili
]);

$debug['post_params'] = [
    'username' => $kullanici,
    'customer_num' => $numara,
    'pbxnum' => $cleanSantral,
    'internal_num' => $dahili
];

$result = http_post(
    'http://crmsntrl.netgsm.com.tr:9111/originate',
    $postData,
    ['Content-Type: application/x-www-form-urlencoded'],
    20
);

$debug['http_code'] = $result['http_code'];
$debug['http_method'] = $result['method'];
$debug['http_error'] = $result['error'];

if ($result['body'] !== false) {
    $body_text = trim($result['body']);
    $debug['raw_response'] = substr($body_text, 0, 500);

    // Hata kodu kontrolü (düz sayı yanıt)
    if (preg_match('/^(\d{2,3})$/', $body_text, $m)) {
        $hatKodu = $m[1];
        $hataMesajlari = [
            '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
            '40' => 'EKSİK PARAMETRELER',
            '50' => 'SİSTEM HATASI',
            '60' => 'DAHİLİ BULUNAMADI VEYA AKTİF DEĞİL',
            '70' => 'GEÇERSİZ PARAMETRE',
            '80' => 'DAHİLİ MEŞGUL',
            '100' => 'SİSTEM BAKIMDA'
        ];

        json_success([
            'success_api' => false,
            'response' => [
                'hata_mesaj' => $hataMesajlari[$hatKodu] ?? 'BİLİNMEYEN HATA KODU: ' . $hatKodu,
                'hata_kodu' => $hatKodu,
                'raw_response' => $body_text
            ],
            'http_code' => $result['http_code'],
            'debug' => $debug
        ]);
    }
    // Başarılı yanıt - genellikle "00" veya XML
    else if ($body_text === '00' || $body_text === '0' || (strlen($body_text) > 3 && $result['http_code'] === 200)) {
        json_success([
            'success_api' => true,
            'response' => [
                'mesaj' => 'ÇAĞRI BAŞLATILDI',
                'numara' => $numara,
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
    // HTTP BAĞLANTI HATASI
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
