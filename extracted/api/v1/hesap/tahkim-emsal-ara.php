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
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar IN ('ai_api_key','openai_api_key') AND deger != '' ORDER BY anahtar ASC LIMIT 1");
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
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . urlencode($apiKey);

$payload = [
    'contents' => [
        ['role' => 'user', 'parts' => [['text' => $prompt]]]
    ],
    'systemInstruction' => [
        'parts' => [['text' => $systemPrompt . "\n\nÖNEMLİ: Sigorta Tahkim Komisyonu kararları hakkındaki bilgi birikimin ile {$marka} {$model} {$yil} model araç için gerçekçi emsal kararlar oluştur. Türkiye'deki güncel tahkim kararlarına ve rayiç değerlere uygun, tutarlı ve gerçekçi veriler sun."]]
    ],
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 4096,
        'topP' => 0.9
    ]
];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    $errDetail = '';
    if ($response) {
        $errData = json_decode($response, true);
        $errDetail = $errData['error']['message'] ?? $errData['error']['status'] ?? substr($response, 0, 300);
    }
    echo json_encode(['success' => false, 'error' => 'AI HATA (HTTP ' . $httpCode . '): ' . ($errDetail ?: $curlError ?: 'YANIT YOK')]);
    exit;
}

$data = json_decode($response, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
$webSources = [];

// JSON parse
$text = trim($text);
if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $m)) {
    $text = trim($m[1]);
}
$text = preg_replace('/^[^{]*/', '', $text);
$text = preg_replace('/[^}]*$/', '', $text);

$result = json_decode($text, true);

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
