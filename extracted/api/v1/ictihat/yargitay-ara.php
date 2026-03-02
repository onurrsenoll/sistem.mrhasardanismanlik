<?php
/**
 * MR HASAR DANIŞMANLIK - YARGITAY KARARLARI ARAMA
 * Konu başlığına göre Yargıtay kararları AI destekli arama
 * Gemini AI ile gerçek zamanlı içtihat araştırması
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
if (!$input || empty($input['konu'])) {
    echo json_encode(['success' => false, 'error' => 'ARANACAK KONU GEREKLİ']);
    exit;
}

$konu = trim($input['konu']);
$daire = isset($input['daire']) ? trim($input['daire']) : '';
$yil = isset($input['yil']) ? intval($input['yil']) : 0;

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

$daireFiltre = $daire ? "\nDAİRE FİLTRESİ: Sadece {$daire} kararlarını araştır." : "\nTÜM İLGİLİ DAİRELERDEN (4. Hukuk, 11. Hukuk, 17. Hukuk, Hukuk Genel Kurulu vb.) araştır.";
$yilFiltre = $yil > 0 ? "\nYIL FİLTRESİ: {$yil} yılı ve civarı kararları öncelikle araştır." : "\nSON 10 YILDAKİ kararları araştır.";

$prompt = "GÖREV: Aşağıdaki konu hakkında YARGITAY KARARLARINI araştır ve emsal kararları listele.

ARANACAK KONU: {$konu}
{$daireFiltre}
{$yilFiltre}

KRİTİK KURALLAR:
1. Türkiye Yargıtay kararları hakkındaki bilgi birikimini kullan
2. Sigorta hukuku, trafik kazası, araç değer kaybı, bedensel hasar, tazminat konularında gerçekçi emsal kararlar sun
3. Her karar için: dosya no (gerçekçi Yargıtay karar formatında), daire, tarih, özet, hükmedilen tutar, hukuki dayanak belirt
4. Kararları tutara göre büyükten küçüğe sırala
5. En az 5, en fazla 10 karar listele

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"kararlar\": [
    {
      \"dosya_no\": \"2023/1234 E. - 2024/5678 K.\",
      \"daire\": \"17. Hukuk Dairesi\",
      \"tarih\": \"2024-06-15\",
      \"ozet\": \"Karar özeti - ne hakkında olduğu\",
      \"detay\": \"Kararın detaylı açıklaması, mahkemenin değerlendirmesi\",
      \"tutar\": 150000,
      \"hukuki_dayanak\": \"TBK m.49, KTK m.85, 6098 sayılı Kanun\",
      \"kaynak\": \"lexpera.com / kazanci.com\",
      \"anahtar_kelimeler\": [\"araç değer kaybı\", \"tazminat\"]
    }
  ],
  \"toplam_bulunan\": 5,
  \"ortalama_tutar\": 120000,
  \"en_yuksek_tutar\": 250000,
  \"en_dusuk_tutar\": 35000,
  \"analiz_notu\": \"Bu konudaki Yargıtay içtihadının genel değerlendirmesi\"
}";

$systemPrompt = "Sen bir Türk hukuk uzmanısın ve Yargıtay kararları konusunda derin bilgi birikimine sahipsin. Görevin Yargıtay kararlarını araştırıp emsal kararları sunmaktır. Sigorta hukuku, borçlar hukuku, trafik hukuku ve tazminat hukuku konularında uzmansın. Gerçekçi ve tutarlı Yargıtay karar numaraları, tarihler ve tutarlar kullan. Yanıtını SADECE JSON formatında ver.";

// Gemini API
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

$fullPrompt = $systemPrompt . "\n\n" . $prompt;
$payload = [
    'contents' => [
        ['role' => 'user', 'parts' => [['text' => $fullPrompt]]]
    ],
    'generationConfig' => [
        'temperature' => 0.3,
        'maxOutputTokens' => 8192,
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
$allTexts = [];
foreach ($allParts as $part) {
    if (isset($part['text'])) $allTexts[] = $part['text'];
}
$text = !empty($allTexts) ? end($allTexts) : '';

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
        if ($r && isset($r['kararlar'])) { $result = $r; break; }
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m2)) {
            $r = json_decode(trim($m2[1]), true);
            if ($r && isset($r['kararlar'])) { $result = $r; break; }
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
            'toplam_bulunan' => 0,
            'ortalama_tutar' => 0,
            'en_yuksek_tutar' => 0,
            'en_dusuk_tutar' => 0,
            'analiz_notu' => $text ?: 'KARAR BULUNAMADI'
        ]
    ]);
    exit;
}

// Kararları sırala (en yüksek tutar)
$kararlar = $result['kararlar'] ?? [];
usort($kararlar, function($a, $b) { return ($b['tutar'] ?? 0) - ($a['tutar'] ?? 0); });

echo json_encode([
    'success' => true,
    'data' => [
        'kararlar' => $kararlar,
        'toplam_bulunan' => $result['toplam_bulunan'] ?? count($kararlar),
        'ortalama_tutar' => $result['ortalama_tutar'] ?? 0,
        'en_yuksek_tutar' => $result['en_yuksek_tutar'] ?? ($kararlar[0]['tutar'] ?? 0),
        'en_dusuk_tutar' => $result['en_dusuk_tutar'] ?? 0,
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'arama_bilgi' => [
            'konu' => $konu,
            'daire' => $daire,
            'yil' => $yil
        ]
    ]
]);
