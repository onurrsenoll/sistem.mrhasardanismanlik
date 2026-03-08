<?php
/**
 * GET /api/v1/netsantral/autocall-rapor.php?list_id=XXX
 * NETGSM OTOMATİK ARAMA - LİSTE RAPORU
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

$user = auth_required(['admin', 'uzman', 'avukat']);

$listId = $_GET['list_id'] ?? '';
if (empty($listId)) {
    json_error('LİSTE ID ZORUNLUDUR', 422);
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

// NETGSM AUTOCALL API - RAPOR
$postData = http_build_query([
    'username' => $kullanici,
    'password' => $sifre,
    'list_id' => $listId
]);

$result = http_post(
    'https://api.netgsm.com.tr/autocall/report',
    $postData,
    ['Content-Type: application/x-www-form-urlencoded'],
    20
);

if ($result['body'] !== false) {
    $bodyText = trim($result['body']);

    // Hata kodu kontrolü
    if (preg_match('/^(\d{2,3})$/', $bodyText, $m)) {
        $hatKodu = $m[1];
        $hataMesajlari = [
            '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
            '40' => 'EKSİK PARAMETRELER',
            '70' => 'GEÇERSİZ PARAMETRE'
        ];
        json_success([
            'success_api' => false,
            'response' => [
                'hata_mesaj' => $hataMesajlari[$hatKodu] ?? 'HATA KODU: ' . $hatKodu
            ]
        ]);
    }

    // Yanıtı parse et
    $responseData = [];
    libxml_use_internal_errors(true);
    $xml = @simplexml_load_string($bodyText);
    if ($xml) {
        $responseData = json_decode(json_encode($xml), true);
    } else {
        $jsonData = json_decode($bodyText, true);
        if ($jsonData) {
            $responseData = $jsonData;
        } else {
            $responseData = ['raw' => substr($bodyText, 0, 500)];
        }
    }
    libxml_clear_errors();

    json_success([
        'success_api' => true,
        'response' => $responseData
    ]);
} else {
    json_success([
        'success_api' => false,
        'response' => [
            'hata_mesaj' => 'NETGSM API BAĞLANTI HATASI: ' . ($result['error'] ?: 'BİLİNMEYEN HATA')
        ]
    ]);
}
