<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * ZenRows API ile arabam.com + otoplus.com'dan GERÇEK İLAN VERİSİ
 * Claude AI fallback YOK - sadece gerçek veri
 */
ob_start();
error_reporting(0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

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

$marka = clean($input['marka']);
$model = clean($input['model']);
$yil = (int)$input['yil'];
$km = isset($input['km']) ? (int)$input['km'] : 0;

// ZenRows API key
$zenrowsKey = '';
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'zenrows_api_key' AND deger != ''");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $zenrowsKey = trim($row['deger']);
} catch (Exception $e) {}

if (empty($zenrowsKey)) {
    echo json_encode(['success' => false, 'error' => 'ZENROWS API KEY TANIMLI DEĞİL. SİSTEM > FİRMA AYARLARI SAYFASINDAN GİRİN.']);
    exit;
}

// ═══ ZENROWS İLE HTML ÇEK ═══
function fetchWithZenRows($url, $apiKey, $jsRender = false) {
    $zenUrl = 'https://api.zenrows.com/v1/?apikey=' . $apiKey
        . '&url=' . urlencode($url)
        . '&premium_proxy=true';
    if ($jsRender) $zenUrl .= '&js_render=true&wait=5000';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $zenUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['body' => $response, 'code' => $httpCode, 'error' => $error];
}

// ═══ ARABAM.COM İÇİN insiderArray PARSE ═══
function parseArabamFiyatlar($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;
    $fiyatlar = [];

    // Pattern 1: insiderArray.push({ ... "unit_price": parseFloat(("1.509.000 TL").replace(...)) })
    if (preg_match_all('/insiderArray\.push\(\{[^}]*"name"\s*:\s*"([^"]*)"[^}]*"unit_price"\s*:\s*parseFloat\(\("([\d.]+)\s*TL"\)/s', $html, $m, PREG_SET_ORDER)) {
        foreach ($m as $match) {
            $baslik = $match[1];
            $val = (int)preg_replace('/[^\d]/', '', $match[2]);
            if ($val >= 50000 && $val <= 50000000) {
                $ilanlar[] = [
                    'kaynak' => 'arabam.com',
                    'baslik' => $baslik,
                    'fiyat' => $val,
                    'km' => 0,
                    'yil' => $yil,
                    'sehir' => '',
                    'tarih' => date('Y-m-d')
                ];
            }
        }
    }

    // Pattern 2: Fallback - "unit_price": parseFloat(("SAYI TL")...) without name
    if (empty($ilanlar) && preg_match_all('/"unit_price"\s*:\s*parseFloat\(\("([\d.]+)\s*TL"\)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 3: Fallback - "unit_price": SAYI (direkt numeric)
    if (empty($ilanlar) && empty($fiyatlar) && preg_match_all('/"unit_price"\s*:\s*(\d+)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 4: data-price veya data-value
    if (empty($ilanlar) && empty($fiyatlar) && preg_match_all('/data-(?:price|value)="(\d+)"/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 5: JSON-LD price
    if (empty($ilanlar) && empty($fiyatlar) && preg_match_all('/"price"\s*:\s*"?(\d+)"?/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 6: TL formatı (son çare)
    if (empty($ilanlar) && empty($fiyatlar) && preg_match_all('/((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Fallback pattern sonuçlarını ilanlara dönüştür
    if (empty($ilanlar) && !empty($fiyatlar)) {
        $fiyatlar = array_unique($fiyatlar);
        rsort($fiyatlar);
        foreach (array_slice($fiyatlar, 0, 10) as $fiyat) {
            $ilanlar[] = [
                'kaynak' => 'arabam.com',
                'baslik' => $marka . ' ' . $model . ' ' . $yil,
                'fiyat' => $fiyat,
                'km' => 0,
                'yil' => $yil,
                'sehir' => '',
                'tarih' => date('Y-m-d')
            ];
        }
    }

    return $ilanlar;
}

// ═══ OTOPLUS.COM FİYAT PARSE ═══
function parseOtoplusFiyatlar($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;
    $fiyatlar = [];

    // Otoplus: class="price" veya fiyat div'leri
    if (preg_match_all('/class="[^"]*(?:price|fiyat)[^"]*"[^>]*>\s*[^\d]*([\d.,]+)/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // JSON-LD
    if (empty($fiyatlar) && preg_match_all('/"price"\s*:\s*"?(\d+)"?/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // TL formatı
    if (empty($fiyatlar) && preg_match_all('/((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    $fiyatlar = array_unique($fiyatlar);
    rsort($fiyatlar);

    foreach (array_slice($fiyatlar, 0, 10) as $fiyat) {
        $ilanlar[] = [
            'kaynak' => 'otoplus.com',
            'baslik' => $marka . ' ' . $model . ' ' . $yil,
            'fiyat' => $fiyat,
            'km' => 0,
            'yil' => $yil,
            'sehir' => '',
            'tarih' => date('Y-m-d')
        ];
    }

    return $ilanlar;
}

// ═══ ANA İŞLEM ═══
$tumIlanlar = [];
$hatalar = [];
$basarili = [];

// ═══ SLUG OLUŞTUR ═══
function makeSlug($text) {
    $text = mb_strtolower($text, 'UTF-8');
    // Türkçe karakter dönüşümü
    $tr = ['ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u','Ç'=>'c','Ğ'=>'g','İ'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u'];
    $text = strtr($text, $tr);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

// 1. ARABAM.COM
$markaSlug = makeSlug($marka);
$modelSlug = makeSlug($model);
// Format: /ikinci-el/otomobil/marka-model?minYear=YYYY&maxYear=YYYY
$arabamUrl = 'https://www.arabam.com/ikinci-el/otomobil/' . $markaSlug . '-' . $modelSlug . '?minYear=' . $yil . '&maxYear=' . $yil;

$arabamResult = fetchWithZenRows($arabamUrl, $zenrowsKey, true);
if ($arabamResult['code'] === 200 && !empty($arabamResult['body'])) {
    $arabamIlanlar = parseArabamFiyatlar($arabamResult['body'], $marka, $model, $yil);
    $tumIlanlar = array_merge($tumIlanlar, $arabamIlanlar);
    $basarili[] = 'arabam.com(' . count($arabamIlanlar) . ' ilan)';
} else {
    $hatalar[] = 'arabam.com: HTTP ' . $arabamResult['code'];
}

// 2. OTOPLUS.COM
$otoplusMarkaSlug = makeSlug($marka);
$otoplusModelSlug = makeSlug($model);
$otoplusUrl = 'https://www.otoplus.com/ikinci-el-arac/' . $otoplusMarkaSlug . '/' . $otoplusModelSlug . '?yil_min=' . $yil . '&yil_max=' . $yil . '&siralama=fiyat_azalan';

$otoplusResult = fetchWithZenRows($otoplusUrl, $zenrowsKey, false);
if ($otoplusResult['code'] === 200 && !empty($otoplusResult['body'])) {
    $otoplusIlanlar = parseOtoplusFiyatlar($otoplusResult['body'], $marka, $model, $yil);
    $tumIlanlar = array_merge($tumIlanlar, $otoplusIlanlar);
    $basarili[] = 'otoplus.com(' . count($otoplusIlanlar) . ' ilan)';
} else {
    $hatalar[] = 'otoplus.com: HTTP ' . $otoplusResult['code'];
}

// ═══ SONUÇ HESAPLA ═══
if (empty($tumIlanlar)) {
    $hataMsg = 'İLAN VERİSİ ÇEKİLEMEDİ.';
    if (!empty($hatalar)) $hataMsg .= ' ' . implode(' | ', $hatalar);
    $hataMsg .= ' Lütfen RAYİÇ DEĞER alanına manuel giriş yapın.';
    echo json_encode(['success' => false, 'error' => $hataMsg]);
    exit;
}

// En yüksek fiyattan sırala
usort($tumIlanlar, function($a, $b) { return $b['fiyat'] - $a['fiyat']; });

// En yüksek 5 ilanı al
$enYuksek5 = array_slice($tumIlanlar, 0, 5);

// Ortalama hesapla
$toplamFiyat = array_sum(array_column($enYuksek5, 'fiyat'));
$ortalama = count($enYuksek5) > 0 ? round($toplamFiyat / count($enYuksek5)) : 0;
$enYuksekFiyat = $enYuksek5[0]['fiyat'] ?? 0;
$enDusukFiyat = end($enYuksek5)['fiyat'] ?? 0;

echo json_encode(['success' => true, 'data' => [
    'ilanlar' => $enYuksek5,
    'ortalama' => $ortalama,
    'en_yuksek' => $enYuksekFiyat,
    'en_dusuk' => $enDusukFiyat,
    'toplam_bulunan' => count($tumIlanlar),
    'kaynak' => 'zenrows_gercek',
    'analiz_notu' => 'GERÇEK VERİ: ' . implode(' + ', $basarili) . '. En yüksek 5 ilanın ortalaması: ' . number_format($ortalama, 0, ',', '.') . ' TL'
]]);
