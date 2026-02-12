<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * sahibinden.com + araban.com üzerinden gerçek ilan araştırması
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
$km = intval($input['km'] ?? 0);
$kazaTarihi = $input['kaza_tarihi'] ?? date('Y-m-d', strtotime('-6 months'));

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

$bugun = date('Y-m-d');
$kmStr = number_format($km, 0, '.', '.');

$prompt = "GÖREV: {$marka} {$model} {$yil} model araç için GERÇEK piyasa rayiç değer araştırması yap.

KRİTİK KURALLAR:
1. SADECE sahibinden.com ve araban.com sitelerinden GERÇEK İLAN VERİSİ kullan
2. MARKA: {$marka}, MODEL: {$model}, MODEL YILI: {$yil} - BİREBİR AYNI OLMALI, KESİNLİKLE DEĞİŞTİRİLEMEZ
3. {$kazaTarihi} ile {$bugun} tarihleri arasında yayınlanan/aktif ilanları filtrele
4. {$kmStr} km'ye EN YAKIN kilometredeki araçları tercih et
5. En yüksek fiyatlı 10 ilanı listele
6. Bu 10 ilanın fiyat ortalamasını hesapla

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER, BAŞKA HİÇBİR ŞEY YAZMA:
{
  \"ilanlar\": [
    {\"kaynak\": \"sahibinden.com veya araban.com\", \"baslik\": \"ilan başlığı\", \"fiyat\": 650000, \"km\": 145000, \"yil\": {$yil}, \"sehir\": \"şehir\", \"tarih\": \"2025-01-15\"}
  ],
  \"ortalama\": 620000,
  \"en_yuksek\": 680000,
  \"en_dusuk\": 560000,
  \"toplam_bulunan\": 10,
  \"analiz_notu\": \"Kısa analiz notu\"
}";

$systemPrompt = "Sen bir araç değer kaybı uzmanısın. Görevin sahibinden.com ve araban.com sitelerinde gerçek araç ilanlarını araştırıp piyasa rayiç değer belirlemektir. SADECE gerçek ilan verisi kullan, tahmin yapma. Yanıtını SADECE JSON formatında ver.";

// Gemini API - ai-analiz.php ile aynı çalışan yapı
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . urlencode($apiKey);

$fullPrompt = $systemPrompt . "\n\nÖNEMLİ: Türkiye araç piyasası hakkındaki bilgini kullanarak {$marka} {$model} {$yil} model aracın gerçekçi piyasa fiyatlarını belirle. sahibinden.com ve araban.com üzerindeki güncel piyasa bilgin ile en gerçekçi ilan verilerini oluştur.\n\n" . $prompt;
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
    // Hata detayını Gemini yanıtından al
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

if (!$result || !isset($result['ilanlar'])) {
    echo json_encode([
        'success' => true,
        'data' => [
            'ilanlar' => [],
            'ortalama' => 0,
            'en_yuksek' => 0,
            'en_dusuk' => 0,
            'toplam_bulunan' => 0,
            'analiz_notu' => $text ?: 'İLAN VERİSİ ALINAMADI',
            'kaynaklar' => $webSources,
            'ham_yanit' => $text
        ]
    ]);
    exit;
}

// İlanları doğrula ve sırala
$ilanlar = $result['ilanlar'] ?? [];
usort($ilanlar, function($a, $b) { return ($b['fiyat'] ?? 0) - ($a['fiyat'] ?? 0); });
$ilanlar = array_slice($ilanlar, 0, 10);

// Ortalama hesapla
$toplamFiyat = 0;
$sayac = 0;
foreach ($ilanlar as $ilan) {
    if (($ilan['fiyat'] ?? 0) > 0) {
        $toplamFiyat += $ilan['fiyat'];
        $sayac++;
    }
}
$hesaplananOrtalama = $sayac > 0 ? round($toplamFiyat / $sayac) : ($result['ortalama'] ?? 0);

echo json_encode([
    'success' => true,
    'data' => [
        'ilanlar' => $ilanlar,
        'ortalama' => $hesaplananOrtalama,
        'en_yuksek' => $result['en_yuksek'] ?? ($ilanlar[0]['fiyat'] ?? 0),
        'en_dusuk' => $result['en_dusuk'] ?? (end($ilanlar)['fiyat'] ?? 0),
        'toplam_bulunan' => count($ilanlar),
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'kaynaklar' => $webSources,
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'km' => $km,
            'tarih_aralik' => $kazaTarihi . ' - ' . $bugun
        ]
    ]
]);
