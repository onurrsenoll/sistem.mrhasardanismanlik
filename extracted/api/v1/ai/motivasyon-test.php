<?php
/**
 * POST /api/v1/ai/motivasyon-test.php
 * Claude API bağlantısını test eder ve detaylı sonuç döner
 */

ob_start();
error_reporting(0);

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/ai-helper.php';

ob_end_clean();

setup_headers();
require_method('POST');
$user = auth_required();

$body = get_json_body();

$testKey = '';
$keyKaynak = '';

if (!empty($body['api_key'])) {
    $testKey = trim($body['api_key']);
    $keyKaynak = 'MANUEL GİRİLEN ANAHTAR';
} else {
    $keys = getAiKeys();
    if (!empty($keys['active'])) {
        $testKey = $keys['active'];
        $keyKaynak = 'VERİTABANINDAN OKUNAN ANAHTAR';
    }
}

if (empty($testKey)) {
    json_error('API ANAHTARI BULUNAMADI. SİSTEM > FİRMA AYARLARI SAYFASINDAN CLAUDE API ANAHTARI GİRİN.');
}

$sonuc = [
    'key_kaynak' => $keyKaynak,
    'key_on_ek' => substr($testKey, 0, 10) . '...' . substr($testKey, -4),
    'provider' => 'CLAUDE (ANTHROPIC)',
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

// Claude API Test
$res = http_post('https://api.anthropic.com/v1/messages', json_encode([
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 50,
    'messages' => [
        ['role' => 'user', 'content' => 'Merhaba, bu bir test mesajıdır. Sadece "Test başarılı" yaz.']
    ],
    'temperature' => 0.1
]), [
    'Content-Type: application/json',
    'x-api-key: ' . $testKey,
    'anthropic-version: 2023-06-01'
], 15);

$sonuc['yontem'] = strtoupper($res['method'] ?: 'YOK');
$sonuc['http_kodu'] = $res['http_code'];

if ($res['http_code'] === 200 && $res['body']) {
    $data = json_decode($res['body'], true);
    $text = '';
    foreach (($data['content'] ?? []) as $block) {
        if ($block['type'] === 'text') $text .= $block['text'];
    }
    if (!empty($text)) {
        $sonuc['basarili'] = true;
        $sonuc['soz'] = trim($text);
        $sonuc['api_yanit'] = 'CLAUDE API BAŞARIYLA YANIT VERDİ (' . $res['method'] . ')';
    } else {
        $sonuc['hata_detay'] = 'API YANIT VERDİ AMA BEKLENMEDİK FORMAT: ' . substr($res['body'], 0, 300);
    }
} else {
    if ($res['body']) {
        $data = json_decode($res['body'], true);
        $httpHatalar = [
            400 => 'GEÇERSİZ İSTEK - API ANAHTARI FORMATI YANLIŞ OLABİLİR',
            401 => 'YETKİLENDİRME HATASI - API ANAHTARI GEÇERSİZ VEYA İPTAL EDİLMİŞ',
            403 => 'ERİŞİM ENGELLENDİ - API ANAHTARI BU SERVISE ERİŞİM YETKİSİNE SAHİP DEĞİL',
            429 => 'KOTA AŞILDI - API ANAHTARI LİMİTE ULAŞTI',
            500 => 'SUNUCU HATASI - PROVIDER TARAFINDA GEÇİCİ SORUN',
            503 => 'SERVİS GEÇİCİ OLARAK KULLANILAMIYOR'
        ];
        $sonuc['hata_detay'] = isset($httpHatalar[$res['http_code']])
            ? $httpHatalar[$res['http_code']]
            : "HTTP {$res['http_code']} HATASI";
        if (!empty($data['error']['message'])) {
            $sonuc['hata_detay'] .= ' - ' . $data['error']['message'];
        }
    } else {
        $sonuc['hata_detay'] = 'BAĞLANTI KURULAMADI: ' . ($res['error'] ?: 'ZAMAN AŞIMI');
    }
}

if ($sonuc['basarili']) {
    $sonuc['ozet'] = 'CLAUDE API BAŞARIYLA ÇALIŞIYOR! YÖNTEM: ' . $sonuc['yontem'] . ' | ANAHTAR: ' . $keyKaynak;
} else {
    $sonuc['ozet'] = 'CLAUDE API ÇALIŞMIYOR! SEBEP: ' . $sonuc['hata_detay'];
}

json_success($sonuc);
