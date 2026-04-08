<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * sahibinden.com + araban.com üzerinden gerçek ilan araştırması
 * Gemini/OpenAI/Claude AI destekli
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

// API KEY - tüm key'leri al (fallback için)
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'AI API ANAHTARI TANIMLI DEĞİL']);
    exit;
}

// Claude API kullanılır
$fallbackKeys = [];

$bugun = date('Y-m-d');
$kmStr = number_format($km, 0, '.', '.');

$prompt = "GÖREV: {$marka} {$model} {$yil} model, {$kmStr} km araç için sahibinden.com ve araban.com üzerinden rayiç değer belirle.

ADIMLAR:
1. sahibinden.com'da {$marka} {$model} {$yil} model ara, {$kmStr} km'ye EN YAKIN km'deki araçları bul
2. araban.com'da aynı aramayı yap
3. SADECE {$kazaTarihi} ile {$bugun} tarihleri arasında yayınlanan/aktif ilanları al
4. Her iki siteden toplam bulunan ilanlardan EN YÜKSEK FİYATLI 5 aracı seç
5. Bu 5 aracın fiyat ortalamasını hesapla - BU ORTALAMA RAYİÇ DEĞERDİR

KRİTİK KURALLAR:
1. MARKA: {$marka}, MODEL: {$model}, MODEL YILI: {$yil} - BİREBİR AYNI OLMALI
2. KM: {$kmStr} km'ye en yakın araçları tercih et (±30.000 km tolerans)
3. TARİH FİLTRE: {$kazaTarihi} - {$bugun} arası ilanlar (kaza tarihinden bugüne)
4. EN YÜKSEK fiyatlı 5 aracı seç (düşük fiyatlıları eleme)
5. KESİNLİKLE 0 TL verme - Türkiye piyasa bilgine dayanarak MUTLAKA gerçekçi rakam ver
6. Fiyatlar {$bugun} tarihi itibarıyla TL cinsinden güncel olmalı
7. Ortalama = en yüksek 5 aracın fiyat toplamı / 5

YANITINI SADECE AŞAĞIDAKİ JSON FORMATINDA VER:
{
  \"ilanlar\": [
    {\"kaynak\": \"sahibinden.com\", \"baslik\": \"ilan başlığı\", \"fiyat\": 650000, \"km\": 145000, \"yil\": {$yil}, \"sehir\": \"İstanbul\", \"tarih\": \"{$bugun}\"}
  ],
  \"ortalama\": 620000,
  \"en_yuksek\": 680000,
  \"en_dusuk\": 560000,
  \"toplam_bulunan\": 5,
  \"analiz_notu\": \"En yüksek 5 ilanın ortalaması\"
}";

$systemPrompt = "Sen Türkiye otomobil piyasasında 15+ yıl deneyimli bir araç değerleme uzmanısın. sahibinden.com ve araban.com'daki tüm marka/model fiyatlarını biliyorsun. Görevin: verilen aracın birebir aynı marka/model/yılındaki en yüksek fiyatlı 5 ilanın ortalamasını bulmak. MUTLAKA rakamsal değer ver, KESİNLİKLE 0 veya boş bırakma. Yanıtını SADECE JSON formatında ver.";

$fullUserPrompt = "{$marka} {$model} {$yil} model, {$kmStr} km araç. KAZA TARİHİ: {$kazaTarihi}. sahibinden.com ve araban.com'da bu aracın BİREBİR AYNI marka/model/yıl ilanlarını {$kazaTarihi} ile {$bugun} tarihleri arasında ara. {$kmStr} km'ye en yakın olanlardan EN YÜKSEK FİYATLI 5 tanesini seç ve ortalamasını hesapla.\n\n" . $prompt;

$aiOpts = ['temperature' => 0.2, 'maxTokens' => 4096, 'timeout' => 60];
$aiResult = callAIWithDetail($apiKey, $systemPrompt, $fullUserPrompt, $aiOpts);
$text = $aiResult['text'];

// Başarısızsa fallback key'leri dene
if (empty($text) && !empty($fallbackKeys)) {
    foreach ($fallbackKeys as $fbKey) {
        $aiResult = callAIWithDetail($fbKey, $systemPrompt, $fullUserPrompt, $aiOpts);
        $text = $aiResult['text'];
        if (!empty($text)) break;
    }
}

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
        'kaynaklar' => [],
        'arama_bilgi' => [
            'marka' => $marka,
            'model' => $model,
            'yil' => $yil,
            'km' => $km,
            'tarih_aralik' => $kazaTarihi . ' - ' . $bugun
        ]
    ]
]);
