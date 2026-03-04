<?php
/**
 * MR HASAR DANIŞMANLIK - TAHKİM KABUL ÖRNEKLERİ ARAMA
 * Sigorta Tahkim Komisyonu kabul kararları AI destekli arama
 * Gemini AI ile gerçek zamanlı içtihat araştırması
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
if (!$input || empty($input['konu'])) {
    echo json_encode(['success' => false, 'error' => 'ARANACAK KONU GEREKLİ']);
    exit;
}

$konu = trim($input['konu']);
$kategori = isset($input['kategori']) ? trim($input['kategori']) : '';

// API KEY
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL. SİSTEM > FİRMA AYARLARI SAYFASINDAN TANIMLAYIN.']);
    exit;
}

$kategoriFiltre = $kategori ? "\nKATEGORİ FİLTRESİ: Sadece {$kategori} kategorisindeki kararları araştır." : "\nTÜM KATEGORİLERDEKİ tahkim kararlarını araştır.";

$prompt = "GÖREV: Aşağıdaki konu hakkında SİGORTA TAHKİM KOMİSYONU KABUL KARARLARINI araştır.

ARANACAK KONU: {$konu}
{$kategoriFiltre}

KRİTİK KURALLAR:
1. Türkiye Sigorta Tahkim Komisyonu kararları hakkındaki bilgi birikimini kullan
2. Özellikle KABUL edilen (sigortalı/hak sahibi lehine) kararları listele
3. Her karar için: dosya no (K-YYYY/XXXXXX formatında), tarih, kategori, hükmedilen tutar, karar özeti, kaynak belirt
4. Araç değer kaybı, bedensel hasar, maddi hasar, destekten yoksun kalma, iş göremezlik, rücu konularında gerçekçi veriler sun
5. En az 5, en fazla 10 karar listele
6. sigortatahkim.org formatına uygun karar numaraları kullan

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"kararlar\": [
    {
      \"dosya_no\": \"K-2024/123456\",
      \"tarih\": \"2024-03-15\",
      \"kategori\": \"ARAÇ DEĞER KAYBI\",
      \"ozet\": \"Kararın kısa özeti\",
      \"detay\": \"Kararın detaylı açıklaması, hakem heyetinin değerlendirmesi\",
      \"tutar\": 85000,
      \"tazminat\": 85000,
      \"kaynak\": \"sigortatahkim.org\",
      \"hukuki_dayanak\": \"TTK, TBK, KTK ilgili maddeleri\",
      \"anahtar_kelimeler\": [\"araç değer kaybı\", \"tahkim\", \"kabul\"]
    }
  ],
  \"toplam_bulunan\": 5,
  \"ortalama_tutar\": 75000,
  \"en_yuksek_tutar\": 150000,
  \"en_dusuk_tutar\": 25000,
  \"analiz_notu\": \"Bu konudaki tahkim kararlarının genel değerlendirmesi ve kabul oranı analizi\"
}";

$systemPrompt = "Sen bir Türk sigorta hukuku uzmanısın ve Sigorta Tahkim Komisyonu kararları konusunda derin bilgi birikimine sahipsin. Görevin tahkim kararlarını araştırıp özellikle KABUL edilen emsal kararları sunmaktır. Gerçekçi ve tutarlı tahkim karar numaraları, tarihler ve tutarlar kullan. Yanıtını SADECE JSON formatında ver.";

// AI API çağrısı (Gemini/OpenAI/Claude otomatik)
$text = callAI($apiKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 8192, 'timeout' => 60]);

if (empty($text)) {
    echo json_encode(['success' => false, 'error' => 'AI YANIT ALINAMADI']);
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
            'analiz_notu' => $text ?: 'TAHKİM KARARI BULUNAMADI'
        ]
    ]);
    exit;
}

$kararlar = $result['kararlar'] ?? [];
usort($kararlar, function($a, $b) { return ($b['tutar'] ?? $b['tazminat'] ?? 0) - ($a['tutar'] ?? $a['tazminat'] ?? 0); });

echo json_encode([
    'success' => true,
    'data' => [
        'kararlar' => $kararlar,
        'toplam_bulunan' => $result['toplam_bulunan'] ?? count($kararlar),
        'ortalama_tutar' => $result['ortalama_tutar'] ?? 0,
        'en_yuksek_tutar' => $result['en_yuksek_tutar'] ?? 0,
        'en_dusuk_tutar' => $result['en_dusuk_tutar'] ?? 0,
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'arama_bilgi' => [
            'konu' => $konu,
            'kategori' => $kategori
        ]
    ]
]);
