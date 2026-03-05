<?php
/**
 * MR HASAR DANIŞMANLIK - TAHKİM EMSAL ARAŞTIRMASI
 * Aynı marka/model/yaş araçların tahkim kararları
 * Gemini/OpenAI/Claude AI destekli
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/ai-helper.php';

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
$keys = getAiKeys();
$apiKey = $keys['active'];

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

$fullUserPrompt = "ÖNEMLİ: Sigorta Tahkim Komisyonu kararları hakkındaki bilgi birikimin ile {$marka} {$model} {$yil} model araç için gerçekçi emsal kararlar oluştur. Türkiye'deki güncel tahkim kararlarına ve rayiç değerlere uygun, tutarlı ve gerçekçi veriler sun.\n\n" . $prompt;

$aiResult = callAIWithDetail($apiKey, $systemPrompt, $fullUserPrompt, ['temperature' => 0.2, 'maxTokens' => 4096, 'timeout' => 60]);
$text = $aiResult['text'];

if (empty($text)) {
    $errMsg = 'AI YANIT ALINAMADI';
    if (!empty($aiResult['error'])) $errMsg .= ' - ' . $aiResult['error'];
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
}

// JSON parse - çoklu strateji
$result = null;
$result = json_decode(trim($text), true);

if (!$result) {
    if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $m)) {
        $result = json_decode(trim($m[1]), true);
    }
}

if (!$result) {
    $first = strpos($text, '{');
    $last = strrpos($text, '}');
    if ($first !== false && $last !== false && $last > $first) {
        $result = json_decode(substr($text, $first, $last - $first + 1), true);
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
            'kaynaklar' => []
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
        'kaynaklar' => [],
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'arac_yasi' => $aracYasi
        ]
    ]
]);
