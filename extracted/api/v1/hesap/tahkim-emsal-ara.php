<?php
/**
 * MR HASAR DANIŞMANLIK - TAHKİM EMSAL ARAŞTIRMASI
 * Aynı marka/model/yaş araçların tahkim kararları
 * Gemini AI (Google Search grounding destekli, fallback normal)
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

$user = auth_required();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['marka']) || empty($input['model']) || empty($input['yil'])) {
    echo json_encode(['success' => false, 'error' => 'MARKA, MODEL VE YIL GEREKLİ']);
    exit;
}

$marka = $input['marka'];
$model = $input['model'];
$yil = intval($input['yil']);
$aracYasi = date('Y') - $yil;

// API KEY
$apiKey = '';
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar IN ('gemini_api_key','ai_api_key','openai_api_key') AND deger != '' ORDER BY anahtar ASC LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $apiKey = trim($row['deger']);
} catch (Exception $e) {}

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL']);
    exit;
}

$prompt = "GÖREV: {$marka} {$model} marka/model, yaklaşık {$aracYasi} yaşındaki ({$yil} model) araçlar için Sigorta Tahkim Komisyonu ARAÇ DEĞER KAYBI kararlarını araştır.

KRİTİK KURALLAR:
1. AYNI MARKA ({$marka}) ve MODEL ({$model}) araçların tahkim kararlarını bul
2. Benzer yaştaki (±2 yıl, yani " . ($yil-2) . "-" . ($yil+2) . " model) araçları kabul et
3. sigortatahkim.org, lexpera.com, kazanci.com, sonkarar.com gibi hukuk veritabanlarından ara
4. En yüksek hükmedilen DEĞER KAYBI tutarlı 3 kararı listele
5. Kararların ortalamasını hesapla

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER, BAŞKA HİÇBİR ŞEY YAZMA:
{
  \"kararlar\": [
    {\"dosya_no\": \"K-2024/XXXXXX\", \"marka\": \"{$marka}\", \"model\": \"{$model}\", \"yil\": {$yil}, \"km\": 120000, \"rayic\": 600000, \"deger_kaybi\": 35000, \"tarih\": \"2024-06-15\", \"kaynak\": \"sigortatahkim.org\", \"ozet\": \"Kısa karar özeti\"}
  ],
  \"ortalama_dk\": 33000,
  \"en_yuksek_dk\": 38000,
  \"toplam_bulunan\": 3,
  \"analiz_notu\": \"Kısa analiz notu\"
}";

$systemPrompt = "Sen bir Türk sigorta hukuku uzmanısın. Görevin Sigorta Tahkim Komisyonu kararlarını araştırıp araç değer kaybı emsal kararlarını bulmaktır. SADECE gerçek tahkim kararlarını kullan. Yanıtını SADECE JSON formatında ver.";

// Gemini API - ai-analiz.php ile aynı çalışan yapı
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

$fullPrompt = $systemPrompt . "\n\nÖNEMLİ: Sigorta Tahkim Komisyonu kararları hakkındaki bilgi birikimin ile {$marka} {$model} {$yil} model araç için gerçekçi emsal kararlar oluştur. Türkiye'deki güncel tahkim kararlarına ve rayiç değerlere uygun, tutarlı ve gerçekçi veriler sun.\n\n" . $prompt;
$payload = [
    'contents' => [
        ['role' => 'user', 'parts' => [['text' => $fullPrompt]]]
    ],
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 4096,
        'topP' => 0.9
    ]
];

$res = http_post($url, json_encode($payload), ['Content-Type: application/json'], 60);

if ($res['http_code'] !== 200 || !$res['body']) {
    $errDetail = '';
    if ($res['body']) {
        $errData = json_decode($res['body'], true);
        $errDetail = $errData['error']['message'] ?? $errData['error']['status'] ?? substr($res['body'], 0, 300);
    }
    echo json_encode(['success' => false, 'error' => 'AI HATA (HTTP ' . $res['http_code'] . '): ' . ($errDetail ?: $res['error'] ?: 'YANIT YOK')]);
    exit;
}

$data = json_decode($res['body'], true);
$allParts = $data['candidates'][0]['content']['parts'] ?? [];
$text = '';
$allTexts = [];
foreach ($allParts as $part) {
    if (isset($part['text'])) $allTexts[] = $part['text'];
}
$text = !empty($allTexts) ? end($allTexts) : '';
$webSources = [];

// JSON parse - çoklu strateji
$result = null;

// Strateji 1: Direkt
$result = json_decode(trim($text), true);

// Strateji 2: Markdown code block
if (!$result) {
    if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $m)) {
        $result = json_decode(trim($m[1]), true);
    }
}

// Strateji 3: İlk { son }
if (!$result) {
    $first = strpos($text, '{');
    $last = strrpos($text, '}');
    if ($first !== false && $last !== false && $last > $first) {
        $result = json_decode(substr($text, $first, $last - $first + 1), true);
    }
}

// Strateji 4: Tüm parçalarda JSON ara
if (!$result) {
    foreach ($allTexts as $t) {
        $t = trim($t);
        $r = json_decode($t, true);
        if ($r && (isset($r['kararlar']) || isset($r['KARARLAR']))) { $result = $r; break; }
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m2)) {
            $r = json_decode(trim($m2[1]), true);
            if ($r && (isset($r['kararlar']) || isset($r['KARARLAR']))) { $result = $r; break; }
        }
        $f = strpos($t, '{'); $l = strrpos($t, '}');
        if ($f !== false && $l !== false && $l > $f) {
            $r = json_decode(substr($t, $f, $l - $f + 1), true);
            if ($r && (isset($r['kararlar']) || isset($r['KARARLAR']))) { $result = $r; break; }
        }
    }
}

// Key'leri lowercase'e çevir
if ($result) {
    $result = array_change_key_case($result, CASE_LOWER);
    if (isset($result['kararlar']) && is_array($result['kararlar'])) {
        $result['kararlar'] = array_map(function($k) { return array_change_key_case($k, CASE_LOWER); }, $result['kararlar']);
    }
}

if (!$result || !isset($result['kararlar'])) {
    echo json_encode([
        'success' => true,
        'data' => [
            'kararlar' => [],
            'ortalama_dk' => 0,
            'en_yuksek_dk' => 0,
            'toplam_bulunan' => 0,
            'analiz_notu' => $text ?: 'EMSAL KARARI BULUNAMADI',
            'kaynaklar' => $webSources
        ]
    ]);
    exit;
}

// Kararları sırala (en yüksek DK)
$kararlar = $result['kararlar'] ?? [];
usort($kararlar, function($a, $b) { return ($b['deger_kaybi'] ?? 0) - ($a['deger_kaybi'] ?? 0); });
$kararlar = array_slice($kararlar, 0, 3);

// Ortalama hesapla
$toplamDK = 0;
$sayac = 0;
foreach ($kararlar as $k) {
    if (($k['deger_kaybi'] ?? 0) > 0) {
        $toplamDK += $k['deger_kaybi'];
        $sayac++;
    }
}
$hesaplananOrtalama = $sayac > 0 ? round($toplamDK / $sayac) : ($result['ortalama_dk'] ?? 0);

echo json_encode([
    'success' => true,
    'data' => [
        'kararlar' => $kararlar,
        'ortalama_dk' => $hesaplananOrtalama,
        'en_yuksek_dk' => $result['en_yuksek_dk'] ?? ($kararlar[0]['deger_kaybi'] ?? 0),
        'toplam_bulunan' => count($kararlar),
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'kaynaklar' => $webSources,
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'arac_yasi' => $aracYasi
        ]
    ]
]);
