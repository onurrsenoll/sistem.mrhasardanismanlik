<?php
/**
 * Sunucu PHP ortam teşhis dosyası
 * Bu dosyayı sunucuya yükleyip tarayıcıdan çağırın
 * Sonra silin!
 */
header('Content-Type: application/json; charset=utf-8');

$sonuc = [
    'php_version' => PHP_VERSION,
    'curl_yuklumu' => function_exists('curl_init'),
    'curl_versiyon' => function_exists('curl_version') ? curl_version()['version'] : 'YOK',
    'allow_url_fopen' => (bool)ini_get('allow_url_fopen'),
    'openssl_yuklumu' => extension_loaded('openssl'),
    'openssl_versiyon' => defined('OPENSSL_VERSION_TEXT') ? OPENSSL_VERSION_TEXT : 'YOK',
    'disable_functions' => ini_get('disable_functions'),
    'safe_mode' => ini_get('safe_mode') ? true : false,
];

// Gemini'ye basit test
$testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAxIkYW3-i8FfxoYU83NFPvbwJckhsxDfI';
$testBody = json_encode(['contents' => [['parts' => [['text' => 'Say hello']]]], 'generationConfig' => ['maxOutputTokens' => 10]]);

// cURL testi
if (function_exists('curl_init')) {
    $ch = curl_init($testUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $testBody,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $sonuc['curl_test'] = ['http_code' => $code, 'error' => $err, 'yanit_basi' => substr($resp, 0, 200)];
} else {
    $sonuc['curl_test'] = 'cURL YUKLU DEGIL';
}

// file_get_contents testi
if (ini_get('allow_url_fopen')) {
    $ctx = stream_context_create([
        'http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $testBody, 'timeout' => 10, 'ignore_errors' => true],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ]);
    $resp = @file_get_contents($testUrl, false, $ctx);
    $httpCode = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $h) {
            if (preg_match('/^HTTP\/[\d.]+ (\d+)/', $h, $m)) $httpCode = intval($m[1]);
        }
    }
    $sonuc['fgc_test'] = ['http_code' => $httpCode, 'yanit_basi' => substr($resp, 0, 200)];
} else {
    $sonuc['fgc_test'] = 'allow_url_fopen KAPALI';
}

// Socket testi
if (extension_loaded('openssl')) {
    $ctx = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]]);
    $fp = @stream_socket_client('ssl://generativelanguage.googleapis.com:443', $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if ($fp) {
        $sonuc['socket_test'] = 'BAGLANTI BASARILI';
        fclose($fp);
    } else {
        $sonuc['socket_test'] = "BAGLANTI BASARISIZ: [$errno] $errstr";
    }
} else {
    $sonuc['socket_test'] = 'OpenSSL YUKLU DEGIL';
}

echo json_encode($sonuc, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
