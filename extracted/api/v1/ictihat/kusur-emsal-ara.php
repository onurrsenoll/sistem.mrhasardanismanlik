<?php
/**
 * MR HASAR DANIŞMANLIK - KUSUR EMSAL DOSYALARI ARAMA
 * Kaza türlerine göre kusur oranı emsal karar AI destekli arama
 * Claude AI ile içtihat araştırması
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
$konu = isset($input['konu']) ? trim($input['konu']) : '';
$kusurTuru = isset($input['kusur_turu']) ? trim($input['kusur_turu']) : '';
$kazaTuru = isset($input['kaza_turu']) ? trim($input['kaza_turu']) : '';

if (empty($konu) && empty($kusurTuru) && empty($kazaTuru)) {
    echo json_encode(['success' => false, 'error' => 'EN AZ BİR ARAMA KRİTERİ GEREKLİ']);
    exit;
}

// API KEY
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL. SİSTEM > FİRMA AYARLARI SAYFASINDAN TANIMLAYIN.']);
    exit;
}

$konuFiltre = $konu ? "ARANACAK KONU: {$konu}" : "";
$kusurFiltre = $kusurTuru ? "\nKUSUR TÜRÜ FİLTRESİ: {$kusurTuru} kararlarını araştır." : "";
$kazaFiltre = $kazaTuru ? "\nKAZA TÜRÜ FİLTRESİ: {$kazaTuru} ile ilgili kararları araştır." : "";

$prompt = "GÖREV: Aşağıdaki kriterlere göre TRAFİK KAZASI KUSUR ORANI EMSAL KARARLARINI araştır.

{$konuFiltre}
{$kusurFiltre}
{$kazaFiltre}

KRİTİK KURALLAR:
1. Türkiye'deki Yargıtay ve Sigorta Tahkim Komisyonu kararlarından kusur oranı emsal kararları sun
2. Her karar için: dosya no, kaza türü, kusur dağılımı (% olarak), karar özeti, tarih belirt
3. Bilirkişi raporlarındaki kusur oranı değerlendirmelerini de dahil et
4. Asli kusur, tali kusur, eşit kusur, tam kusur, kusursuzluk durumlarını açıkla
5. Karayolları Trafik Kanunu ve ilgili mevzuat maddelerini belirt
6. En az 5, en fazla 10 karar listele
7. Gerçekçi ve tutarlı karar numaraları, tarihler kullan

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"kararlar\": [
    {
      \"dosya_no\": \"2023/5678 E. - 2024/1234 K.\",
      \"tarih\": \"2024-04-20\",
      \"kaza_turu\": \"KAVŞAK KAZASI\",
      \"kusur_orani\": 75,
      \"kusur_turu\": \"ASLİ KUSURLU\",
      \"ozet\": \"Kırmızı ışıkta geçen sürücü %75 asli kusurlu bulunmuştur\",
      \"detay\": \"Detaylı açıklama - bilirkişi değerlendirmesi ve mahkeme kararı\",
      \"hukuki_dayanak\": \"KTK m.57, m.84, m.85\",
      \"kaynak\": \"Yargıtay 17. Hukuk Dairesi\",
      \"anahtar_kelimeler\": [\"kırmızı ışık\", \"kavşak\", \"asli kusur\"]
    }
  ],
  \"toplam_bulunan\": 5,
  \"analiz_notu\": \"Bu kaza türünde kusur oranı dağılımının genel değerlendirmesi\"
}";

$systemPrompt = "Sen bir Türk trafik hukuku uzmanısın ve bilirkişisin. Trafik kazalarında kusur oranı tespiti, Karayolları Trafik Kanunu, Yargıtay ve Sigorta Tahkim Komisyonu kararları konusunda derin bilgi birikimine sahipsin. Kusur oranı değerlendirmesinde bilirkişi raporu hazırlama deneyimin var. Gerçekçi ve tutarlı karar numaraları, tarihler ve kusur oranları kullan. Yanıtını SADECE JSON formatında ver.";

// AI API çağrısı (Claude API)
$aiResult = callAIWithDetail($apiKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 8192, 'timeout' => 60]);
$text = $aiResult['text'];










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
            'analiz_notu' => $text ?: 'EMSAL KARAR BULUNAMADI'
        ]
    ]);
    exit;
}

$kararlar = $result['kararlar'] ?? [];
usort($kararlar, function($a, $b) { return ($b['kusur_orani'] ?? 0) - ($a['kusur_orani'] ?? 0); });

echo json_encode([
    'success' => true,
    'data' => [
        'kararlar' => $kararlar,
        'toplam_bulunan' => $result['toplam_bulunan'] ?? count($kararlar),
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'arama_bilgi' => [
            'konu' => $konu,
            'kusur_turu' => $kusurTuru,
            'kaza_turu' => $kazaTuru
        ]
    ]
]);
