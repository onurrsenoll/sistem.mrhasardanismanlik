<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * sahibinden.com + araban.com üzerinden gerçek ilan araştırması
 * Gemini: Google Search Grounding ile GERÇEK WEB ARAMASI
 * OpenAI/Claude: Piyasa bilgisine dayalı rayiç tahmin
 */
ob_start();
error_reporting(0);

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
$km = intval($input['km'] ?? 0);
$kazaTarihi = $input['kaza_tarihi'] ?? date('Y-m-d', strtotime('-6 months'));

// API KEY - tüm key'leri al
$keys = getAiKeys();

if (empty($keys['gemini']) && empty($keys['openai']) && empty($keys['claude'])) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL']);
    exit;
}

$bugun = date('Y-m-d');
$kmStr = number_format($km, 0, '.', '.');

// ═══════════════════════════════════════════
// PROMPT'LAR - Gemini (web araması) vs Diğerleri (piyasa bilgisi)
// ═══════════════════════════════════════════

$systemPrompt = "Sen bir araç değer kaybı uzmanısın. Görevin Türkiye'deki araç piyasasını analiz edip rayiç değer belirlemektir. Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma.";

// Gemini için: Google Search Grounding ile GERÇEK web araması yapacak
$groundingPrompt = "GÖREV: {$marka} {$model} {$yil} model araç için sahibinden.com ve araban.com sitelerinde GERÇEK İLAN ARAŞTIRMASI yap.

Google Search kullanarak şu aramaları yap:
1. site:sahibinden.com {$marka} {$model} {$yil}
2. site:araban.com {$marka} {$model} {$yil}

KRİTİK KURALLAR:
1. Google Search ile sahibinden.com ve araban.com'da GERÇEK ilanları ara
2. MARKA: {$marka}, MODEL: {$model}, MODEL YILI: {$yil} - BİREBİR AYNI OLMALI
3. {$kazaTarihi} ile {$bugun} tarihleri arasındaki ilanları filtrele
4. {$kmStr} km'ye EN YAKIN kilometredeki araçları tercih et
5. En yüksek fiyatlı 10 ilanı listele
6. Bu 10 ilanın fiyat ortalamasını hesapla

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"ilanlar\": [
    {\"kaynak\": \"sahibinden.com veya araban.com\", \"baslik\": \"ilan başlığı\", \"fiyat\": 650000, \"km\": 145000, \"yil\": {$yil}, \"sehir\": \"şehir\", \"tarih\": \"2025-01-15\", \"url\": \"ilan linki\"}
  ],
  \"ortalama\": 620000,
  \"en_yuksek\": 680000,
  \"en_dusuk\": 560000,
  \"toplam_bulunan\": 10,
  \"analiz_notu\": \"Kısa analiz notu\"
}";

// OpenAI/Claude için: Piyasa bilgisine dayalı tahmin prompt'u
$marketPrompt = "GÖREV: {$marka} {$model} {$yil} model araç için Türkiye piyasa rayiç değer tahmini yap.

Türkiye araç piyasası hakkındaki bilgini kullanarak {$marka} {$model} {$yil} model, {$kmStr} km araç için gerçekçi piyasa fiyat tahmini oluştur.

KURALLAR:
1. MARKA: {$marka}, MODEL: {$model}, MODEL YILI: {$yil} - DEĞİŞTİRME
2. Türkiye'deki sahibinden.com ve araban.com piyasa fiyatlarını baz al
3. {$kmStr} km civarı araçların fiyat aralığını tahmin et
4. Gerçekçi 10 ilan verisi oluştur (tahmini fiyatlarla)
5. İlan fiyatları birbirine yakın ama farklı olmalı (gerçekçi dağılım)
6. Fiyatlar {$bugun} tarihi itibarıyla güncel Türkiye piyasasını yansıtmalı

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER, BAŞKA HİÇBİR ŞEY YAZMA:
{
  \"ilanlar\": [
    {\"kaynak\": \"sahibinden.com\", \"baslik\": \"{$marka} {$model} {$yil} örnek ilan\", \"fiyat\": 650000, \"km\": 145000, \"yil\": {$yil}, \"sehir\": \"İstanbul\", \"tarih\": \"{$bugun}\"}
  ],
  \"ortalama\": 620000,
  \"en_yuksek\": 680000,
  \"en_dusuk\": 560000,
  \"toplam_bulunan\": 10,
  \"analiz_notu\": \"Piyasa bilgisine dayalı tahmini rayiç değer\"
}";

// ═══════════════════════════════════════════
// AI ÇAĞRISI - callAIForRayic ile otomatik yönlendirme
// ═══════════════════════════════════════════

$aiOpts = ['temperature' => 0.2, 'maxTokens' => 4096, 'timeout' => 60];
$aiResult = callAIForRayic($keys, $systemPrompt, $groundingPrompt, $marketPrompt, $aiOpts);
$text = $aiResult['text'];
$usedProvider = $aiResult['provider'] ?? '';
$usedMethod = $aiResult['method'] ?? '';

if (empty($text)) {
    $errMsg = 'AI YANIT ALINAMADI';
    if (!empty($aiResult['error'])) {
        $errMsg .= ' - ' . $aiResult['error'];
    }
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
}

// JSON parse - çoklu strateji
$result = null;

// Strateji 1: Direkt JSON decode
$result = json_decode(trim($text), true);

// Strateji 2: Markdown code block içinden çıkar
if (!$result) {
    if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $m)) {
        $result = json_decode(trim($m[1]), true);
    }
}

// Strateji 3: İlk { ile son } arasını al
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
    if (isset($result['ilanlar']) && is_array($result['ilanlar'])) {
        $result['ilanlar'] = array_map(function($il) { return array_change_key_case($il, CASE_LOWER); }, $result['ilanlar']);
    }
}

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
            'kaynaklar' => [],
            'ham_yanit' => $text,
            'provider' => $usedProvider,
            'method' => $usedMethod
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

// Kaynak bilgisi
$kaynakBilgi = $usedMethod === 'google_search' ? 'Google Search ile gerçek ilan verisi' : 'AI piyasa bilgisine dayalı tahmin';

echo json_encode([
    'success' => true,
    'data' => [
        'ilanlar' => $ilanlar,
        'ortalama' => $hesaplananOrtalama,
        'en_yuksek' => $result['en_yuksek'] ?? ($ilanlar[0]['fiyat'] ?? 0),
        'en_dusuk' => $result['en_dusuk'] ?? (end($ilanlar)['fiyat'] ?? 0),
        'toplam_bulunan' => count($ilanlar),
        'analiz_notu' => $result['analiz_notu'] ?? '',
        'kaynaklar' => [],
        'provider' => $usedProvider,
        'method' => $usedMethod,
        'kaynak_bilgi' => $kaynakBilgi,
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'km' => $km,
            'tarih_aralik' => $kazaTarihi . ' - ' . $bugun
        ]
    ]
]);
