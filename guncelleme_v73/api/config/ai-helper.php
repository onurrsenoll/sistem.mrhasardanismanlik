<?php
/**
 * MR HASAR DANIŞMANLIK - AI API HELPER
 * Tüm AI endpoint'leri için ortak API çağrı fonksiyonları
 * Desteklenen Provider'lar: Google Gemini, OpenAI, Claude (Anthropic)
 *
 * Öncelik sırası: gemini_api_key > openai_api_key > claude_api_key > ai_api_key
 * Key prefix ile otomatik provider algılama:
 *   AIzaSy* = Google Gemini
 *   sk-     = OpenAI
 *   sk-ant- = Claude/Anthropic
 */

/**
 * Veritabanından AI API anahtarlarını çeker
 * Her provider için ayrı key döner
 *
 * @return array ['gemini' => string, 'openai' => string, 'claude' => string, 'active' => string]
 */
function getAiKeys() {
    $keys = ['gemini' => '', 'openai' => '', 'claude' => '', 'active' => ''];

    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('gemini_api_key', 'openai_api_key', 'claude_api_key', 'ai_api_key') AND deger != ''");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            $val = trim($row['deger']);
            if (empty($val)) continue;

            switch ($row['anahtar']) {
                case 'gemini_api_key':
                    $keys['gemini'] = $val;
                    break;
                case 'openai_api_key':
                    $keys['openai'] = $val;
                    break;
                case 'claude_api_key':
                    $keys['claude'] = $val;
                    break;
                case 'ai_api_key':
                    // Eski genel alan - prefix'e göre doğru yere ata
                    if (str_starts_with($val, 'AIzaSy') && empty($keys['gemini'])) {
                        $keys['gemini'] = $val;
                    } elseif (str_starts_with($val, 'sk-ant-') && empty($keys['claude'])) {
                        $keys['claude'] = $val;
                    } elseif (str_starts_with($val, 'sk-') && empty($keys['openai'])) {
                        $keys['openai'] = $val;
                    }
                    break;
            }
        }
    } catch (Exception $e) {
        // Sessiz geç
    }

    // Aktif key belirle (öncelik: gemini > openai > claude)
    if (!empty($keys['gemini'])) {
        $keys['active'] = $keys['gemini'];
    } elseif (!empty($keys['openai'])) {
        $keys['active'] = $keys['openai'];
    } elseif (!empty($keys['claude'])) {
        $keys['active'] = $keys['claude'];
    }

    return $keys;
}

/**
 * API key'in provider tipini belirler
 *
 * @param string $apiKey
 * @return string 'gemini'|'openai'|'claude'|'unknown'
 */
function detectProvider($apiKey) {
    if (str_starts_with($apiKey, 'AIzaSy')) return 'gemini';
    if (str_starts_with($apiKey, 'sk-ant-')) return 'claude';
    if (str_starts_with($apiKey, 'sk-')) return 'openai';
    return 'unknown';
}

/**
 * AI API çağrısı yapar - provider'a göre otomatik yönlendirir
 *
 * @param string $apiKey API anahtarı
 * @param string $systemPrompt Sistem prompt'u
 * @param string $userPrompt Kullanıcı prompt'u
 * @param array $options Ek ayarlar ['temperature', 'maxTokens', 'timeout']
 * @return string|null AI yanıtı veya null
 */
function callAI($apiKey, $systemPrompt, $userPrompt, $options = []) {
    $provider = detectProvider($apiKey);
    $temperature = $options['temperature'] ?? 0.3;
    $maxTokens = $options['maxTokens'] ?? 1024;
    $timeout = $options['timeout'] ?? 30;

    switch ($provider) {
        case 'gemini':
            return callGeminiAPI($apiKey, $systemPrompt, $userPrompt, $temperature, $maxTokens, $timeout);
        case 'openai':
            return callOpenAIAPI($apiKey, $systemPrompt, $userPrompt, $temperature, $maxTokens, $timeout);
        case 'claude':
            return callClaudeAPI($apiKey, $systemPrompt, $userPrompt, $temperature, $maxTokens, $timeout);
        default:
            // Bilinmeyen key - Gemini dene
            return callGeminiAPI($apiKey, $systemPrompt, $userPrompt, $temperature, $maxTokens, $timeout);
    }
}

/**
 * Google Gemini API çağrısı
 */
function callGeminiAPI($apiKey, $systemPrompt, $userPrompt, $temperature = 0.3, $maxTokens = 1024, $timeout = 30) {
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

    $fullPrompt = $systemPrompt . "\n\n" . $userPrompt;
    $payload = [
        'contents' => [
            ['role' => 'user', 'parts' => [['text' => $fullPrompt]]]
        ],
        'generationConfig' => [
            'temperature' => $temperature,
            'maxOutputTokens' => $maxTokens,
            'topP' => 0.8
        ]
    ];

    $res = http_post($url, json_encode($payload), ['Content-Type: application/json'], $timeout);

    if ($res['http_code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        $text = '';
        $allParts = $data['candidates'][0]['content']['parts'] ?? [];
        foreach ($allParts as $part) {
            if (isset($part['text']) && empty($part['thought'])) $text = $part['text'];
        }
        return !empty($text) ? $text : null;
    }

    // Hata logla
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? '';
    }
    error_log("GEMINI API HATA: HTTP {$res['http_code']} - {$errDetail} {$res['error']} (yontem: {$res['method']})");
    return null;
}

/**
 * OpenAI API çağrısı (GPT-4o-mini)
 */
function callOpenAIAPI($apiKey, $systemPrompt, $userPrompt, $temperature = 0.3, $maxTokens = 1024, $timeout = 30) {
    $res = http_post('https://api.openai.com/v1/chat/completions', json_encode([
        'model' => 'gpt-4o-mini',
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt]
        ],
        'max_tokens' => $maxTokens,
        'temperature' => $temperature
    ]), [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ], $timeout);

    if ($res['http_code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        $text = $data['choices'][0]['message']['content'] ?? '';
        return !empty($text) ? $text : null;
    }

    // Hata logla
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? '';
    }
    error_log("OPENAI API HATA: HTTP {$res['http_code']} - {$errDetail} {$res['error']}");
    return null;
}

/**
 * Claude/Anthropic API çağrısı (Claude 3.5 Haiku)
 */
function callClaudeAPI($apiKey, $systemPrompt, $userPrompt, $temperature = 0.3, $maxTokens = 1024, $timeout = 30) {
    $res = http_post('https://api.anthropic.com/v1/messages', json_encode([
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => $maxTokens,
        'system' => $systemPrompt,
        'messages' => [
            ['role' => 'user', 'content' => $userPrompt]
        ],
        'temperature' => $temperature
    ]), [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ], $timeout);

    if ($res['http_code'] === 200 && $res['body']) {
        $data = json_decode($res['body'], true);
        $text = '';
        foreach (($data['content'] ?? []) as $block) {
            if ($block['type'] === 'text') {
                $text .= $block['text'];
            }
        }
        return !empty($text) ? $text : null;
    }

    // Hata logla
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? '';
    }
    error_log("CLAUDE API HATA: HTTP {$res['http_code']} - {$errDetail} {$res['error']}");
    return null;
}

/**
 * AI API hata detayını döner (kullanıcıya gösterilebilecek formatta)
 */
function getAiErrorDetail($res) {
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? $errData['error']['status'] ?? substr($res['body'], 0, 300);
    }
    return 'AI HATA (HTTP ' . $res['http_code'] . '): ' . ($errDetail ?: $res['error'] ?: 'YANIT YOK');
}
