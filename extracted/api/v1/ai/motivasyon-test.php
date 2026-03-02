<?php
/**
 * POST /api/v1/ai/motivasyon-test.php
 * Gemini API bağlantısını test eder ve detaylı sonuç döner
 * Kaydetme sonrası veya manuel test için kullanılır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = require_auth();

$body = get_json_body();

// Test edilecek API key: body'den gelen veya DB'deki veya varsayılan
$testKey = '';
$keyKaynak = '';
$varsayilanKey = 'AIzaSyAxIkYW3-i8FfxoYU83NFPvbwJckhsxDfI';

if (!empty($body['api_key'])) {
    $testKey = trim($body['api_key']);
    $keyKaynak = 'MANUEL GİRİLEN ANAHTAR';
} else {
    // DB'den oku
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'gemini_api_key'");
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row && !empty(trim($row['deger']))) {
            $testKey = trim($row['deger']);
            $keyKaynak = 'VERİTABANINDAN OKUNAN ANAHTAR';
        }
    } catch (Exception $e) {}
}

if (empty($testKey)) {
    $testKey = $varsayilanKey;
    $keyKaynak = 'VARSAYILAN ANAHTAR';
}

// Test isteği hazırla
$requestBody = json_encode([
    'contents' => [
        ['parts' => [['text' => 'Merhaba, bu bir test mesajıdır. Sadece "Test başarılı" yaz.']]]
    ],
    'generationConfig' => [
        'temperature' => 0.1,
        'maxOutputTokens' => 50
    ]
]);

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $testKey;

$sonuc = [
    'key_kaynak' => $keyKaynak,
    'key_on_ek' => substr($testKey, 0, 10) . '...' . substr($testKey, -4),
    'curl_destegi' => function_exists('curl_init'),
    'file_get_contents_destegi' => (bool)ini_get('allow_url_fopen'),
    'socket_destegi' => extension_loaded('openssl'),
    'yontem' => '',
    'http_kodu' => 0,
    'api_yanit' => '',
    'hata_detay' => '',
    'basarili' => false,
    'soz' => ''
];

// Evrensel HTTP POST (curl → file_get_contents → socket fallback)
$res = http_post($url, $requestBody, ['Content-Type: application/json'], 15);

$sonuc['yontem'] = strtoupper($res['method'] ?: 'YOK');
$sonuc['http_kodu'] = $res['http_code'];

if ($res['http_code'] === 200 && $res['body']) {
    $data = json_decode($res['body'], true);
    if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        $sonuc['basarili'] = true;
        $sonuc['soz'] = trim($data['candidates'][0]['content']['parts'][0]['text']);
        $sonuc['api_yanit'] = 'API BAŞARIYLA YANIT VERDİ (' . $res['method'] . ')';
    } else {
        $sonuc['hata_detay'] = 'API YANIT VERDİ AMA BEKLENMEDİK FORMAT: ' . substr($res['body'], 0, 300);
    }
} elseif ($res['body']) {
    $data = json_decode($res['body'], true);
    $apiHataMsg = $data['error']['message'] ?? '';

    $httpHatalar = [
        400 => 'GEÇERSİZ İSTEK - API ANAHTARI FORMATI YANLIŞ OLABİLİR',
        401 => 'YETKİLENDİRME HATASI - API ANAHTARI GEÇERSİZ VEYA İPTAL EDİLMİŞ',
        403 => 'ERİŞİM ENGELLENDİ - API ANAHTARI BU SERVISE ERİŞİM YETKİSİNE SAHİP DEĞİL. GOOGLE AI STUDIO\'DA GEMİNİ API ETKİNLEŞTİRİLMELİ',
        404 => 'API BULUNAMADI - MODEL ADI YANLIŞ VEYA KULLANILAMIYOR OLABİLİR',
        429 => 'KOTA AŞILDI - API ANAHTARI GÜNLÜK/DAKİKALIK LİMİTE ULAŞTI. YENİ ANAHTAR GİRMENİZ VEYA BEKLEMENİZ GEREKİYOR',
        500 => 'GOOGLE SUNUCU HATASI - GOOGLE TARAFINDA GEÇİCİ SORUN. BİRAZ SONRA TEKRAR DENEYİN',
        503 => 'GOOGLE SERVİSİ GEÇİCİ OLARAK KULLANILAMIYOR - BİRAZ SONRA TEKRAR DENEYİN'
    ];

    $sonuc['hata_detay'] = isset($httpHatalar[$res['http_code']])
        ? $httpHatalar[$res['http_code']]
        : "HTTP {$res['http_code']} HATASI";

    if ($apiHataMsg) {
        $sonuc['hata_detay'] .= " | GOOGLE MESAJI: " . mb_strtoupper($apiHataMsg, 'UTF-8');
    }
} else {
    if (!empty($res['error'])) {
        $sonuc['hata_detay'] = 'BAĞLANTI HATASI: ' . mb_strtoupper($res['error'], 'UTF-8');
    } else {
        $sonuc['hata_detay'] = 'HİÇBİR HTTP YÖNTEMİ ÇALIŞMIYOR (cURL/file_get_contents/socket)';
    }
}

// Özet mesaj oluştur
if ($sonuc['basarili']) {
    $sonuc['ozet'] = 'GEMİNİ API BAŞARIYLA ÇALIŞIYOR! YÖNTEM: ' . $sonuc['yontem'] . ' | ANAHTAR: ' . $keyKaynak;
} else {
    $sonuc['ozet'] = 'GEMİNİ API ÇALIŞMIYOR! SEBEP: ' . $sonuc['hata_detay'];
}

json_success($sonuc);
