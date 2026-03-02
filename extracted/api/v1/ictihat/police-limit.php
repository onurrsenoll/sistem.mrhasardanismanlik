<?php
/**
 * MR HASAR DANIŞMANLIK - POLİÇE LİMİT TABLOLARI
 * Yıllara göre sigorta poliçe limitleri AI destekli arama
 * Gemini AI ile gerçek zamanlı limit araştırması
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
$yil = isset($input['yil']) ? intval($input['yil']) : date('Y');
$policeTuru = isset($input['police_turu']) ? trim($input['police_turu']) : '';
$konu = isset($input['konu']) ? trim($input['konu']) : '';

if ($yil < 2010 || $yil > intval(date('Y')) + 1) {
    $yil = intval(date('Y'));
}

// API KEY
$apiKey = '';
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar IN ('ai_api_key','gemini_api_key') AND deger != '' ORDER BY anahtar ASC LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $apiKey = trim($row['deger']);
} catch (Exception $e) {}

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

// Gemini API
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . urlencode($apiKey);

$fullPrompt = $systemPrompt . "\n\n" . $prompt;
$payload = [
    'contents' => [
        ['role' => 'user', 'parts' => [['text' => $fullPrompt]]]
    ],
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 8192,
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
$allParts = $data['candidates'][0]['content']['parts'] ?? [];
$allTexts = [];
foreach ($allParts as $part) {
    if (isset($part['text'])) $allTexts[] = $part['text'];
}
$text = !empty($allTexts) ? end($allTexts) : '';

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
if (!$result) {
    foreach ($allTexts as $t) {
        $t = trim($t);
        $r = json_decode($t, true);
        if ($r && isset($r['limitler'])) { $result = $r; break; }
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m2)) {
            $r = json_decode(trim($m2[1]), true);
            if ($r && isset($r['limitler'])) { $result = $r; break; }
        }
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
