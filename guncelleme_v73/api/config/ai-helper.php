<?php
/**
 * MR HASAR DANIŞMANLIK - AI API HELPER
 * Tüm AI endpoint'leri için ortak API çağrı fonksiyonları
 * Sadece Claude (Anthropic) desteklenir
 */

/**
 * Veritabanından Claude API anahtarını çeker
 *
 * @return array ['claude' => string, 'active' => string]
 */
function getAiKeys() {
    $keys = ['claude' => '', 'active' => ''];

    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('claude_api_key', 'ai_api_key') AND deger != ''");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            $val = trim($row['deger']);
            if (empty($val)) continue;

            switch ($row['anahtar']) {
                case 'claude_api_key':
                    $keys['claude'] = $val;
                    break;
                case 'ai_api_key':
                    if (empty($keys['claude'])) {
                        $keys['claude'] = $val;
                    }
                    break;
            }
        }
    } catch (Exception $e) {
        // Sessiz geç
    }

    if (!empty($keys['claude'])) {
        $keys['active'] = $keys['claude'];
    }

    return $keys;
}

/**
 * API key'in provider tipini belirler
 *
 * @param string $apiKey
 * @return string 'claude'
 */
function detectProvider($apiKey) {
    return 'claude';
}

/**
 * AI API çağrısı yapar - her zaman Claude kullanır
 */
function callAI($apiKey, $systemPrompt, $userPrompt, $options = []) {
    $temperature = $options['temperature'] ?? 0.3;
    $maxTokens = $options['maxTokens'] ?? 1024;
    $timeout = $options['timeout'] ?? 30;

    return callClaudeAPI($apiKey, $systemPrompt, $userPrompt, $temperature, $maxTokens, $timeout);
}

/**
 * Claude/Anthropic API çağrısı (Claude Haiku 4.5)
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

    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? '';
    }
    error_log("CLAUDE API HATA: HTTP {$res['http_code']} - {$errDetail} {$res['error']}");
    return null;
}

/**
 * AI API hata detayını döner
 */
function getAiErrorDetail($res) {
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? $errData['error']['status'] ?? substr($res['body'], 0, 300);
    }
    return 'AI HATA (HTTP ' . $res['http_code'] . '): ' . ($errDetail ?: $res['error'] ?: 'YANIT YOK');
}
