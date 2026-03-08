<?php
/**
 * POST /api/v1/netsantral/autocall-liste-olustur.php
 * NETGSM OTOMATİK ARAMA - YENİ LİSTE OLUŞTUR
 *
 * Body: {
 *   "list_name": "CRM_20260308_XXX",
 *   "list_prefix": "110",
 *   "list_type": "static",
 *   "numaralar": ["905551234567", "905559876543", ...]
 * }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'avukat']);
$body = get_json_body();

$listName = trim($body['list_name'] ?? '');
$listPrefix = trim($body['list_prefix'] ?? '110');
$listType = trim($body['list_type'] ?? 'static');
$numaralar = $body['numaralar'] ?? [];

if (empty($listName)) {
    json_error('LİSTE ADI ZORUNLUDUR', 422);
}

if (empty($numaralar) || !is_array($numaralar)) {
    json_error('EN AZ BİR NUMARA GEREKLİDİR', 422);
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

$kullanici = $ayarlar['netsantral_kullanici'] ?? '';
$sifre = $ayarlar['netsantral_sifre'] ?? '';
$aktif = ($ayarlar['netsantral_aktif'] ?? '0') === '1';

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

// NUMARALARI FORMATLA
$formattedNumbers = [];
foreach ($numaralar as $num) {
    $clean = preg_replace('/[^0-9]/', '', $num);
    if (strlen($clean) < 10) continue;

    if (substr($clean, 0, 2) === '90' && strlen($clean) === 12) {
        // Zaten doğru format
    } elseif (substr($clean, 0, 1) === '0' && strlen($clean) === 11) {
        $clean = '9' . $clean;
    } elseif (strlen($clean) === 10 && substr($clean, 0, 1) !== '0') {
        $clean = '90' . $clean;
    }
    $formattedNumbers[] = $clean;
}

if (empty($formattedNumbers)) {
    json_error('GEÇERLİ NUMARA BULUNAMADI', 422);
}

// NETGSM AUTOCALL API - LİSTE OLUŞTUR
// https://api.netgsm.com.tr/autocall/list/add
$postData = http_build_query([
    'username' => $kullanici,
    'password' => $sifre,
    'list_name' => $listName,
    'list_prefix' => $listPrefix,
    'list_type' => $listType,
    'phones' => implode(',', $formattedNumbers)
]);

$result = http_post(
    'https://api.netgsm.com.tr/autocall/list/add',
    $postData,
    ['Content-Type: application/x-www-form-urlencoded'],
    25
);

if ($result['body'] !== false) {
    $bodyText = trim($result['body']);

    // Hata kodu kontrolü
    if (preg_match('/^(\d{2,3})$/', $bodyText, $m)) {
        $hatKodu = $m[1];
        $hataMesajlari = [
            '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
            '40' => 'EKSİK PARAMETRELER',
            '50' => 'SİSTEM HATASI',
            '70' => 'GEÇERSİZ PARAMETRE',
            '100' => 'SİSTEM BAKIMDA'
        ];
        json_success([
            'success_api' => false,
            'response' => [
                'hata_mesaj' => $hataMesajlari[$hatKodu] ?? 'HATA KODU: ' . $hatKodu,
                'hata_kodu' => $hatKodu
            ]
        ]);
    }

    // Başarılı yanıt - XML veya JSON parse
    $responseData = [];
    // XML parse dene
    libxml_use_internal_errors(true);
    $xml = @simplexml_load_string($bodyText);
    if ($xml) {
        $responseData = json_decode(json_encode($xml), true);
    } else {
        // JSON parse dene
        $jsonData = json_decode($bodyText, true);
        if ($jsonData) {
            $responseData = $jsonData;
        } else {
            $responseData = ['raw' => substr($bodyText, 0, 500)];
        }
    }
    libxml_clear_errors();

    // list_id çıkarmaya çalış
    $listId = $responseData['list_id'] ?? $responseData['data']['list_id'] ?? null;

    json_success([
        'success_api' => true,
        'response' => array_merge($responseData, [
            'mesaj' => count($formattedNumbers) . ' NUMARA İLE OTOMATİK ARAMA LİSTESİ OLUŞTURULDU',
            'list_id' => $listId,
            'numara_sayisi' => count($formattedNumbers)
        ])
    ]);
} else {
    json_success([
        'success_api' => false,
        'response' => [
            'hata_mesaj' => 'NETGSM API BAĞLANTI HATASI: ' . ($result['error'] ?: 'BİLİNMEYEN HATA')
        ]
    ]);
}
