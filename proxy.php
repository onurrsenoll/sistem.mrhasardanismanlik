<?php
/**
 * MR HASAR DANIŞMANLIK - AI VISION PROXY
 * Ruhsat OCR modülü için Claude / Gemini görsel analiz proxy'si
 * Base64 görsel alır, AI API'ye iletir, JSON sonuç döner
 */
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/ai-helper.php';

setup_headers();
$user = auth_required();
require_method('POST');

$input = get_json_body();
$provider = isset($input['provider']) ? $input['provider'] : '';
$body     = isset($input['body']) ? $input['body'] : null;

if (!$provider || !$body) {
    json_error('Geçersiz istek: provider ve body gerekli', 400);
}

// API anahtarlarını veritabanından çek
$keys = getAiKeys();

if ($provider === 'gemini') {
    $apiKey = !empty($keys['gemini']) ? $keys['gemini'] : '';
    if (empty($apiKey)) {
        json_error('Gemini API anahtarı tanımlı değil. Sistem ayarlarından ekleyin.', 503);
    }
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);
    $headers = array('Content-Type: application/json');

} elseif ($provider === 'claude') {
    $apiKey = !empty($keys['claude']) ? $keys['claude'] : '';
    if (empty($apiKey)) {
        json_error('Claude API anahtarı tanımlı değil. Sistem ayarlarından ekleyin.', 503);
    }
    $url = 'https://api.anthropic.com/v1/messages';
    $headers = array(
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    );

} else {
    json_error('Desteklenmeyen provider: ' . $provider . '. Geçerli: claude, gemini', 400);
}

// API çağrısı
$res = http_post($url, json_encode($body), $headers, 120);

if ($res['http_code'] === 0 && !empty($res['error'])) {
    json_error('API bağlantı hatası: ' . $res['error'], 502);
}

// Ham yanıtı döndür (frontend parse edecek)
http_response_code($res['http_code'] ?: 502);
header('Content-Type: application/json; charset=utf-8');
echo $res['body'] ?: json_encode(array('error' => 'API yanıt boş'));
exit;
