<?php
/**
 * POST /api/v1/netsantral/autocall-durdur.php
 * NETGSM OTOMATİK ARAMA - LİSTEYİ DURDUR
 *
 * Body: { "list_id": "XXX" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'avukat']);
$body = get_json_body();

$listId = $body['list_id'] ?? '';
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

// NETGSM AUTOCALL API - LİSTEYİ DURDUR
$postData = http_build_query([
    'username' => $kullanici,
    'password' => $sifre,
    'list_id' => $listId,
    'action' => 'stop'
]);

$result = http_post(
    'https://api.netgsm.com.tr/autocall/list/update',
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

    json_success([
        'success_api' => true,
        'response' => [
            'mesaj' => 'OTOMATİK ARAMA LİSTESİ DURDURULDU',
            'list_id' => $listId,
            'raw_response' => substr($bodyText, 0, 500)
        ]
    ]);
} else {
    json_success([
        'success_api' => false,
        'response' => [
            'hata_mesaj' => 'NETGSM API BAĞLANTI HATASI: ' . ($result['error'] ?: 'BİLİNMEYEN HATA')
        ]
    ]);
}
