<?php
/**
 * POST /api/v1/ai/motivasyon-test.php
 * AI API bağlantısını test eder ve detaylı sonuç döner
 * Gemini / OpenAI / Claude otomatik algılama
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/ai-helper.php';

setup_headers();
require_method('POST');
$user = require_auth();

$body = get_json_body();

// Test edilecek API key: body'den gelen veya DB'deki veya varsayılan
$testKey = '';
$keyKaynak = '';
$provider = '';
$varsayilanKey = 'AIzaSyAxIkYW3-i8FfxoYU83NFPvbwJckhsxDfI';

if (!empty($body['api_key'])) {
    $testKey = trim($body['api_key']);
    $keyKaynak = 'MANUEL GİRİLEN ANAHTAR';
} else {
    // DB'den tüm key'leri oku
    $keys = getAiKeys();
    if (!empty($keys['active'])) {
        $testKey = $keys['active'];
        $keyKaynak = 'VERİTABANINDAN OKUNAN ANAHTAR';
    }
}

if (empty($testKey)) {
    $testKey = $varsayilanKey;
    $keyKaynak = 'VARSAYILAN ANAHTAR';
}

$provider = detectProvider($testKey);
$providerLabel = [
    'gemini' => 'GOOGLE GEMİNİ',
    'openai' => 'OPENAI GPT-4o-mini',
    'claude' => 'CLAUDE (ANTHROPIC)',
    'unknown' => 'BİLİNMEYEN'
][$provider] ?? 'BİLİNMEYEN';

$sonuc = [
    'key_kaynak' => $keyKaynak,
    'key_on_ek' => substr($testKey, 0, 10) . '...' . substr($testKey, -4),
    'provider' => $providerLabel,
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

// Provider'a göre test isteği yap
if ($provider === 'openai') {
    // OpenAI Test
    $res = http_post('https://api.openai.com/v1/chat/completions', json_encode([
        'model' => 'gpt-4o-mini',
        'messages' => [
            ['role' => 'user', 'content' => 'Merhaba, bu bir test mesajıdır. Sadece "Test başarılı" yaz.']
        ],
        'max_tokens' => 50,
        'temperature' => 0.1
    ]), [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $testKey
    ], 15);

    $sonuc['yontem'] = strtoupper($res['method'] ?: 'YOK');
    $sonuc['http_kodu'] = $res['http_code'];

    if ($res['http_code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        $text = $data['choices'][0]['message']['content'] ?? '';
        if (!empty($text)) {
            $sonuc['basarili'] = true;
            $sonuc['soz'] = trim($text);
            $sonuc['api_yanit'] = 'OPENAI API BAŞARIYLA YANIT VERDİ (' . $res['method'] . ')';
        } else {
            $sonuc['hata_detay'] = 'API YANIT VERDİ AMA BEKLENMEDİK FORMAT: ' . substr($res['body'], 0, 300);
        }
    } else {
        parseApiError($res, $sonuc, 'OPENAI');
    }

} elseif ($provider === 'claude') {
    // Claude Test
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
        parseApiError($res, $sonuc, 'CLAUDE');
    }

} else {
    // Gemini Test (varsayılan)
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $testKey;
    $requestBody = json_encode([
        'contents' => [
            ['parts' => [['text' => 'Merhaba, bu bir test mesajıdır. Sadece "Test başarılı" yaz.']]]
        ],
        'generationConfig' => [
            'temperature' => 0.1,
            'maxOutputTokens' => 50
        ]
    ]);

    $res = http_post($url, $requestBody, ['Content-Type: application/json'], 15);

    $sonuc['yontem'] = strtoupper($res['method'] ?: 'YOK');
    $sonuc['http_kodu'] = $res['http_code'];

    if ($res['http_code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            $sonuc['basarili'] = true;
            $sonuc['soz'] = trim($data['candidates'][0]['content']['parts'][0]['text']);
            $sonuc['api_yanit'] = 'GEMİNİ API BAŞARIYLA YANIT VERDİ (' . $res['method'] . ')';
        } else {
            $sonuc['hata_detay'] = 'API YANIT VERDİ AMA BEKLENMEDİK FORMAT: ' . substr($res['body'], 0, 300);
        }
    } else {
        parseApiError($res, $sonuc, 'GEMİNİ');
    }
}

// Özet mesaj oluştur
if ($sonuc['basarili']) {
    $sonuc['ozet'] = $providerLabel . ' API BAŞARIYLA ÇALIŞIYOR! YÖNTEM: ' . $sonuc['yontem'] . ' | ANAHTAR: ' . $keyKaynak;
} else {
    $sonuc['ozet'] = $providerLabel . ' API ÇALIŞMIYOR! SEBEP: ' . $sonuc['hata_detay'];
}

json_success($sonuc);

/* ═══════════════════════════════════════════
   HATA PARSE FONKSİYONU
   ═══════════════════════════════════════════ */
function parseApiError($res, &$sonuc, $providerName) {
    if ($res['body']) {
        $data = json_decode($res['body'], true);
        $apiHataMsg = $data['error']['message'] ?? '';

        $httpHatalar = [
            400 => 'GEÇERSİZ İSTEK - API ANAHTARI FORMATI YANLIŞ OLABİLİR',
            401 => 'YETKİLENDİRME HATASI - API ANAHTARI GEÇERSİZ VEYA İPTAL EDİLMİŞ',
            403 => 'ERİŞİM ENGELLENDİ - API ANAHTARI BU SERVISE ERİŞİM YETKİSİNE SAHİP DEĞİL',
            404 => 'API BULUNAMADI - MODEL ADI YANLIŞ VEYA KULLANILAMIYOR OLABİLİR',
            429 => 'KOTA AŞILDI - API ANAHTARI GÜNLÜK/DAKİKALIK LİMİTE ULAŞTI',
            500 => 'SUNUCU HATASI - PROVIDER TARAFINDA GEÇİCİ SORUN',
            503 => 'SERVİS GEÇİCİ OLARAK KULLANILAMIYOR'
        ];

        $sonuc['hata_detay'] = isset($httpHatalar[$res['http_code']])
            ? $httpHatalar[$res['http_code']]
            : "HTTP {$res['http_code']} HATASI";

        if ($apiHataMsg) {
            $sonuc['hata_detay'] .= " | {$providerName} MESAJI: " . mb_strtoupper($apiHataMsg, 'UTF-8');
        }
    } else {
        if (!empty($res['error'])) {
            $sonuc['hata_detay'] = 'BAĞLANTI HATASI: ' . mb_strtoupper($res['error'], 'UTF-8');
        } else {
            $sonuc['hata_detay'] = 'HİÇBİR HTTP YÖNTEMİ ÇALIŞMIYOR (cURL/file_get_contents/socket)';
        }
    }
}
