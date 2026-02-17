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
    'yontem' => '',
    'http_kodu' => 0,
    'api_yanit' => '',
    'hata_detay' => '',
    'basarili' => false,
    'soz' => ''
];

// YÖNTEM 1: cURL
if (function_exists('curl_init')) {
    $sonuc['yontem'] = 'cURL';
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $requestBody,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_USERAGENT => 'MRHasar/1.0'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    curl_close($ch);

    $sonuc['http_kodu'] = $httpCode;

    if ($curlErrno !== 0) {
        // cURL bağlantı hatası
        $curlHatalar = [
            6 => 'DNS ÇÖZÜMLENEMEDI - SUNUCU GOOGLE API ADRESINE ULAŞAMIYOR',
            7 => 'BAĞLANTI KURULAMADI - SUNUCU GOOGLE API SUNUCUSUNA BAĞLANAMIYOR (FIREWALL/PORT ENGELI OLABİLİR)',
            28 => 'ZAMAN AŞIMI - GOOGLE API SUNUCUSU YANIT VERMEDİ (AĞIR YÜK VEYA AĞ SORUNU)',
            35 => 'SSL HATASI - SSL/TLS BAĞLANTISI KURULAMADI',
            56 => 'AĞ VERİSİ ALINAMADI - BAĞLANTI KOPTU',
            60 => 'SSL SERTİFİKA HATASI - SUNUCU SERTİFİKASI DOĞRULANAMADI'
        ];
        $sonuc['hata_detay'] = isset($curlHatalar[$curlErrno])
            ? $curlHatalar[$curlErrno]
            : "cURL HATA #{$curlErrno}: {$curlError}";
    } elseif ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            $sonuc['basarili'] = true;
            $sonuc['soz'] = trim($data['candidates'][0]['content']['parts'][0]['text']);
            $sonuc['api_yanit'] = 'API BAŞARIYLA YANIT VERDİ';
        } else {
            $sonuc['hata_detay'] = 'API YANIT VERDİ AMA BEKLENMEDİK FORMAT: ' . substr($response, 0, 300);
        }
    } elseif ($response) {
        // HTTP hata kodu ile yanıt geldi
        $data = json_decode($response, true);
        $apiHataMsg = $data['error']['message'] ?? '';
        $apiHataStatus = $data['error']['status'] ?? '';

        $httpHatalar = [
            400 => 'GEÇERSİZ İSTEK - API ANAHTARI FORMATI YANLIŞ OLABİLİR',
            401 => 'YETKİLENDİRME HATASI - API ANAHTARI GEÇERSİZ VEYA İPTAL EDİLMİŞ',
            403 => 'ERİŞİM ENGELLENDİ - API ANAHTARI BU SERVISE ERİŞİM YETKİSİNE SAHİP DEĞİL. GOOGLE AI STUDIO\'DA GEMİNİ API ETKİNLEŞTİRİLMELİ',
            404 => 'API BULUNAMADI - MODEL ADI YANLIŞ VEYA KULLANILAMIYOR OLABİLİR',
            429 => 'KOTA AŞILDI - API ANAHTARI GÜNLÜK/DAKİKALIK LİMİTE ULAŞTI. YENİ ANAHTAR GİRMENİZ VEYA BEKLEMENİZ GEREKİYOR',
            500 => 'GOOGLE SUNUCU HATASI - GOOGLE TARAFINDA GEÇİCİ SORUN. BİRAZ SONRA TEKRAR DENEYİN',
            503 => 'GOOGLE SERVİSİ GEÇİCİ OLARAK KULLANILAMIYOR - BİRAZ SONRA TEKRAR DENEYİN'
        ];

        $sonuc['hata_detay'] = isset($httpHatalar[$httpCode])
            ? $httpHatalar[$httpCode]
            : "HTTP {$httpCode} HATASI";

        if ($apiHataMsg) {
            $sonuc['hata_detay'] .= " | GOOGLE MESAJI: " . mb_strtoupper($apiHataMsg, 'UTF-8');
        }
    } else {
        $sonuc['hata_detay'] = 'BOŞ YANIT ALINDI - BAĞLANTI SORUNLU OLABİLİR';
    }
}

// YÖNTEM 2: file_get_contents (cURL başarısızsa)
if (!$sonuc['basarili'] && !function_exists('curl_init') && ini_get('allow_url_fopen')) {
    $sonuc['yontem'] = 'file_get_contents';
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nUser-Agent: MRHasar/1.0\r\n",
            'content' => $requestBody,
            'timeout' => 15,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);

    if ($response) {
        $data = json_decode($response, true);
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            $sonuc['basarili'] = true;
            $sonuc['soz'] = trim($data['candidates'][0]['content']['parts'][0]['text']);
            $sonuc['api_yanit'] = 'API BAŞARIYLA YANIT VERDİ (file_get_contents)';
        } else {
            $sonuc['hata_detay'] .= ' | file_get_contents: BEKLENMEDİK YANIT FORMATI';
        }
    } else {
        $sonuc['hata_detay'] .= ' | file_get_contents DA BAŞARISIZ OLDU';
    }
}

// İki yöntem de yoksa
if (!function_exists('curl_init') && !ini_get('allow_url_fopen')) {
    $sonuc['hata_detay'] = 'SUNUCUDA NE cURL NE DE file_get_contents AKTİF. HOSTING FİRMANIZLA İLETİŞİME GEÇİN';
}

// Özet mesaj oluştur
if ($sonuc['basarili']) {
    $sonuc['ozet'] = 'GEMİNİ API BAŞARIYLA ÇALIŞIYOR! KULLANILAN: ' . $keyKaynak;
} else {
    $sonuc['ozet'] = 'GEMİNİ API ÇALIŞMIYOR! SEBEP: ' . $sonuc['hata_detay'];
}

json_success($sonuc);
