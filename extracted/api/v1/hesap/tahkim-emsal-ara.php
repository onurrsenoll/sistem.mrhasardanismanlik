<?php
/**
 * MR HASAR DANIŞMANLIK - TAHKİM EMSAL ARAŞTIRMASI
 * Aynı marka/model/yaş araçların tahkim kararları
 * Gemini/OpenAI/Claude AI destekli
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
if (!$input || empty($input['marka']) || empty($input['model']) || empty($input['yil'])) {
    echo json_encode(['success' => false, 'error' => 'MARKA, MODEL VE YIL GEREKLİ']);
    exit;
}

$marka = $input['marka'];
$model = $input['model'];
$yil = intval($input['yil']);
$aracYasi = date('Y') - $yil;
$hesapTarihi = !empty($input['hesap_tarihi']) ? $input['hesap_tarihi'] : date('Y-m-d');
$minTarih = date('Y-m-d', strtotime($hesapTarihi . ' -2 years'));
$minYil = intval(date('Y', strtotime($minTarih)));

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
4. SADECE {$minTarih} ile {$hesapTarihi} arasındaki kararları getir. 2 yıldan eski karar GETIRME.
5. En yakın tarihli karardan başlayarak LİSTELE (en yeni karar en üstte)
6. Tam 3 FARKLI karar bul - EN DÜŞÜK ve EN YÜKSEK değer kaybı tutarlarını belirle
7. Kararların ortalamasını hesapla

TARİH SINIRI: Sadece {$minYil}-" . intval(date('Y', strtotime($hesapTarihi))) . " yılları arasındaki kararlar geçerlidir.

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER, BAŞKA HİÇBİR ŞEY YAZMA:
{
  \"kararlar\": [
    {\"dosya_no\": \"K-2024/XXXXXX\", \"marka\": \"{$marka}\", \"model\": \"{$model}\", \"yil\": {$yil}, \"km\": 120000, \"rayic\": 600000, \"deger_kaybi\": 35000, \"tarih\": \"2024-06-15\", \"kaynak\": \"sigortatahkim.org\", \"ozet\": \"Kısa karar özeti\"}
  ],
  \"ortalama_dk\": 33000,
  \"en_yuksek_dk\": 38000,
  \"en_dusuk_dk\": 28000,
  \"toplam_bulunan\": 3,
  \"analiz_notu\": \"Kısa analiz notu\"
}";

$systemPrompt = "Sen Türk sigorta hukuku ve Sigorta Tahkim Komisyonu kararları konusunda 15+ yıl deneyimli bir uzmansın. Araç değer kaybı (ADK) emsal kararlarını çok iyi biliyorsun. KRİTİK KURALLAR: 1) Emin olmadığın karar numarası uydurma. 2) Gerçek bilgin yoksa analiz_notu alanında açıkça 'kesin emsal bulunamadı, tahmini değerler' yaz. 3) Rayiç ve değer kaybı tutarları Türkiye piyasa koşullarına uygun ve tutarlı olmalı. 4) Yanıtını SADECE JSON formatında ver.";

$fullUserPrompt = "ÖNEMLİ: {$marka} {$model} {$yil} model araç için Sigorta Tahkim Komisyonu araç değer kaybı emsal kararlarını araştır. Bilgi birikimin dahilinde bu marka/model/yaş aralığı için en uygun emsal değerleri sun. Gerçek karar numarası bilmiyorsan 'K-XXXX/TAHMINI' olarak işaretle ve analiz_notu'nda bunu belirt.\n\n" . $prompt;

$aiResult = callAIWithDetail($apiKey, $systemPrompt, $fullUserPrompt, ['temperature' => 0.2, 'maxTokens' => 4096, 'timeout' => 60]);
$text = $aiResult['text'];

// Claude API ile tek çağrı yeterli

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

// En düşük DK hesapla
$enDusukDK = PHP_INT_MAX;
foreach ($kararlar as $k) {
    if (($k['deger_kaybi'] ?? 0) > 0 && $k['deger_kaybi'] < $enDusukDK) {
        $enDusukDK = $k['deger_kaybi'];
    }
}
if ($enDusukDK === PHP_INT_MAX) $enDusukDK = $result['en_dusuk_dk'] ?? 0;

echo json_encode([
    'success' => true,
    'data' => [
        'kararlar' => $kararlar,
        'ortalama_dk' => $hesaplananOrtalama,
        'en_yuksek_dk' => $result['en_yuksek_dk'] ?? ($kararlar[0]['deger_kaybi'] ?? 0),
        'en_dusuk_dk' => $enDusukDK,
        'toplam_bulunan' => count($kararlar),
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'kaynaklar' => [],
        'tarih_siniri' => $minTarih . ' - ' . $hesapTarihi,
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'arac_yasi' => $aracYasi
        ]
    ]
]);
