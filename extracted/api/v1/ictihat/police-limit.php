<?php
/**
 * MR HASAR DANIŞMANLIK - POLİÇE LİMİT TABLOLARI
 * Yıllara göre sigorta poliçe limitleri AI destekli arama
 * Gemini AI ile gerçek zamanlı limit araştırması
 */

ob_start(); error_reporting(0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/ai-helper.php';

ob_end_clean();

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

$user = auth_required();

$input = json_decode(file_get_contents('php://input'), true);
$yil = isset($input['yil']) ? intval($input['yil']) : date('Y');
$policeTuru = isset($input['police_turu']) ? trim($input['police_turu']) : '';
$konu = isset($input['konu']) ? trim($input['konu']) : '';

if ($yil < 2010 || $yil > intval(date('Y')) + 1) {
    $yil = intval(date('Y'));
}

// API KEY
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL. SİSTEM > FİRMA AYARLARI SAYFASINDAN TANIMLAYIN.']);
    exit;
}

$policeTuruFiltre = $policeTuru ? "\nPOLİÇE TÜRÜ FİLTRESİ: Özellikle {$policeTuru} poliçe limitlerini detaylandır." : "\nTÜM POLİÇE TÜRLERİ için limit bilgilerini sun.";
$konuFiltre = $konu ? "\nEK BİLGİ: {$konu} konusuna özel detay ver." : "";

$prompt = "GÖREV: {$yil} yılı için TÜRKİYE'DEKİ SİGORTA POLİÇE LİMİTLERİNİ detaylı tablo halinde sun.

SEÇİLEN YIL: {$yil}
{$policeTuruFiltre}
{$konuFiltre}

KRİTİK KURALLAR:
1. Türkiye'deki resmi sigorta poliçe limitlerini kullan
2. Trafik Sigortası (Zorunlu Mali Sorumluluk), Kasko, DASK, Konut, İşyeri, Sağlık, Hayat, Ferdi Kaza, Sorumluluk Sigortası limitlerini dahil et
3. Her poliçe türü için teminat kalemleri ve limit tutarlarını TL cinsinden belirt
4. {$yil} yılı ile önceki 3 yılın karşılaştırmasını da sun
5. Kişi başına ve kaza başına limitleri ayrı ayrı göster (varsa)

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"limitler\": [
    {
      \"police_turu\": \"TRAFİK SİGORTASI\",
      \"teminat\": \"Maddi Hasar (Araç Başına)\",
      \"limit\": 150000,
      \"aciklama\": \"Kısa açıklama\"
    }
  ],
  \"yillik_karsilastirma\": [
    {
      \"yil\": {$yil},
      \"police_turu\": \"TRAFİK SİGORTASI\",
      \"limit\": 150000,
      \"degisim_orani\": 25.5
    }
  ],
  \"bilgi\": \"{$yil} yılı poliçe limitleri hakkında genel bilgi\",
  \"analiz_notu\": \"Limitlerdeki değişim trendi ve analiz\"
}";

$systemPrompt = "Sen bir Türk sigorta uzmanısın. Türkiye'deki tüm sigorta branşlarının poliçe limitleri, teminat tutarları ve yıllara göre değişimleri konusunda derin bilgiye sahipsin. Hazine ve Maliye Bakanlığı, SEDDK (Sigortacılık ve Özel Emeklilik Düzenleme ve Denetleme Kurumu) tarafından belirlenen resmi limitleri biliyorsun. Yanıtını SADECE JSON formatında ver. Tutarları TL cinsinden, sayı olarak (string değil) ver.";

// AI API çağrısı (Gemini/OpenAI/Claude otomatik)
$aiResult = callAIWithDetail($apiKey, $systemPrompt, $prompt, ['temperature' => 0.2, 'maxTokens' => 8192, 'timeout' => 60]);
$text = $aiResult['text'];

// Başarısızsa fallback key'leri dene
if (empty($text) && !empty($keys['fallbacks'])) {
    foreach ($keys['fallbacks'] as $fbKey) {
        $aiResult = callAIWithDetail($fbKey, $systemPrompt, $prompt, ['temperature' => 0.2, 'maxTokens' => 8192, 'timeout' => 60]);
        $text = $aiResult['text'];
        if (!empty($text)) break;
    }
}

if (empty($text)) {
    $errMsg = 'AI YANIT ALINAMADI';
    if (!empty($aiResult['error'])) $errMsg .= ' - ' . $aiResult['error'];
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
}

// JSON parse
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

if ($result) {
    $result = array_change_key_case($result, CASE_LOWER);
    if (isset($result['limitler']) && is_array($result['limitler'])) {
        $result['limitler'] = array_map(function($k) { return array_change_key_case($k, CASE_LOWER); }, $result['limitler']);
    }
    if (isset($result['yillik_karsilastirma']) && is_array($result['yillik_karsilastirma'])) {
        $result['yillik_karsilastirma'] = array_map(function($k) { return array_change_key_case($k, CASE_LOWER); }, $result['yillik_karsilastirma']);
    }
}

if (!$result || !isset($result['limitler'])) {
    echo json_encode([
        'success' => true,
        'data' => [
            'limitler' => [],
            'yillik_karsilastirma' => [],
            'bilgi' => $text ?: 'LİMİT BİLGİSİ ALINAMADI',
            'analiz_notu' => ''
        ]
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'data' => [
        'limitler' => $result['limitler'] ?? [],
        'yillik_karsilastirma' => $result['yillik_karsilastirma'] ?? [],
        'bilgi' => $result['bilgi'] ?? '',
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'arama_bilgi' => [
            'yil' => $yil,
            'police_turu' => $policeTuru
        ]
    ]
]);
