<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * ZenRows API ile arabam.com + otoplus.com'dan GERÇEK İLAN VERİSİ
 * js_render=true + CSS wait selector ile tam sayfa yükleme
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

// ═══ ZENROWS PROXY YÖNTEMİ İLE HTML ÇEK ═══
// Builder'da test edilen çalışan yöntem: CURLOPT_PROXY
function fetchWithZenRows($url, $apiKey, $options = []) {
    $jsRender = $options['js_render'] ?? true;
    $waitSelector = $options['wait_for'] ?? '';
    $waitMs = $options['wait'] ?? 2500;

    // Proxy credential string oluştur
    $proxyAuth = $apiKey . ':';
    $params = ['premium_proxy=true'];
    if ($jsRender) {
        $params[] = 'js_render=true';
        if ($waitSelector) {
            $params[] = 'wait_for=' . urlencode($waitSelector);
        }
        $params[] = 'wait=' . $waitMs;
    }
    $proxyAuth .= implode('&', $params);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_PROXY, 'http://' . $proxyAuth . '@api1.zenrows.com:8001');
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['body' => $response, 'code' => $httpCode, 'error' => $error];
}

// ═══ ARABAM.COM İLAN PARSE ═══
function parseArabam($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;

    // arabam.com listing card pattern: başlık + fiyat
    // Başlık genelde <td class="listing-text"> veya <a class="listing-text-new">
    $basliklar = [];
    $kmler = [];
    $sehirler = [];
    $fiyatlar = [];

    // Başlıkları çek
    if (preg_match_all('/<(?:td|a|div)[^>]*class="[^"]*listing[_-]?text[^"]*"[^>]*>(.*?)<\/(?:td|a|div)>/si', $html, $m)) {
        foreach ($m[1] as $b) {
            $basliklar[] = trim(strip_tags($b));
        }
    }

    // Fiyatları çek - arabam.com formatı
    // Pattern 1: TL/₺ ile biten rakamlar
    if (preg_match_all('/((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 2: data-price / data-value attribute
    if (preg_match_all('/data-(?:price|value|amount)=["\'](\d+)["\']/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 3: class="price" veya "fiyat" içindeki sayılar
    if (preg_match_all('/class="[^"]*(?:price|fiyat|listing-price)[^"]*"[^>]*>\s*[^\d]*([\d.,]+)/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 4: JSON-LD structured data
    if (preg_match_all('/"price"\s*:\s*"?(\d+)"?/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // Pattern 5: Sadece büyük rakamlar (son çare) - listing alanı içindeki
    if (empty($fiyatlar) && preg_match_all('/(?:listing|card|result|ilan)[^"]*"[^>]*>.*?((?:\d{1,3}\.)*\d{3,})/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 100000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // KM bilgileri
    if (preg_match_all('/((?:\d{1,3}\.)*\d{1,3})\s*(?:km|KM)/s', $html, $m)) {
        foreach ($m[1] as $k) {
            $kval = (int)preg_replace('/[^\d]/', '', $k);
            if ($kval >= 1000 && $kval <= 999999) $kmler[] = $kval;
        }
    }

    // Şehir bilgileri
    $sehirListesi = ['İSTANBUL','ANKARA','İZMİR','BURSA','ANTALYA','ADANA','GAZİANTEP','KONYA','KOCAELİ','MERSİN','ESKİŞEHİR','SAMSUN','DİYARBAKIR','KAYSERİ','SAKARYA','DENİZLİ','MUĞLA','TRABZON','TEKİRDAĞ','MALATYA'];
    if (preg_match_all('/(' . implode('|', $sehirListesi) . ')/si', $html, $m)) {
        $sehirler = $m[1];
    }

    // Tekrarları kaldır ve sırala
    $fiyatlar = array_values(array_unique($fiyatlar));
    rsort($fiyatlar);

    foreach (array_slice($fiyatlar, 0, 10) as $idx => $fiyat) {
        $ilanlar[] = [
            'kaynak' => 'arabam.com',
            'baslik' => isset($basliklar[$idx]) && strlen($basliklar[$idx]) > 5
                ? $basliklar[$idx]
                : strtoupper($marka) . ' ' . strtoupper($model) . ' ' . $yil,
            'fiyat' => $fiyat,
            'km' => isset($kmler[$idx]) ? $kmler[$idx] : 0,
            'yil' => $yil,
            'sehir' => isset($sehirler[$idx]) ? mb_convert_case($sehirler[$idx], MB_CASE_TITLE, 'UTF-8') : '',
            'tarih' => date('Y-m-d')
        ];
    }

    return $ilanlar;
}

// ═══ OTOPLUS.COM İLAN PARSE ═══
function parseOtoplus($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;

    $fiyatlar = [];
    $basliklar = [];
    $kmler = [];

    // otoplus fiyat: genellikle <span class="price"> veya data attribute
    if (preg_match_all('/((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)/s', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }
    if (preg_match_all('/data-(?:price|value|amount)=["\'](\d+)["\']/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }
    if (preg_match_all('/class="[^"]*(?:price|fiyat)[^"]*"[^>]*>\s*[^\d]*([\d.,]+)/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)preg_replace('/[^\d]/', '', $f);
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }
    if (preg_match_all('/"price"\s*:\s*"?(\d+)"?/si', $html, $m)) {
        foreach ($m[1] as $f) {
            $val = (int)$f;
            if ($val >= 50000 && $val <= 50000000) $fiyatlar[] = $val;
        }
    }

    // KM
    if (preg_match_all('/((?:\d{1,3}\.)*\d{1,3})\s*(?:km|KM)/s', $html, $m)) {
        foreach ($m[1] as $k) {
            $kval = (int)preg_replace('/[^\d]/', '', $k);
            if ($kval >= 1000 && $kval <= 999999) $kmler[] = $kval;
        }
    }

    $fiyatlar = array_values(array_unique($fiyatlar));
    rsort($fiyatlar);

    foreach (array_slice($fiyatlar, 0, 10) as $idx => $fiyat) {
        $ilanlar[] = [
            'kaynak' => 'otoplus.com',
            'baslik' => strtoupper($marka) . ' ' . strtoupper($model) . ' ' . $yil,
            'fiyat' => $fiyat,
            'km' => isset($kmler[$idx]) ? $kmler[$idx] : 0,
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
$debugInfo = [];

// 1. ARABAM.COM (js_render=true, .icerik CSS selector bekleme - builder'da test edildi)
$arabamUrl = 'https://www.arabam.com/ikinci-el/otomobil?query=' . urlencode($marka . ' ' . $model) . '&minYear=' . $yil . '&maxYear=' . $yil . '&sort=price-desc';

$arabamResult = fetchWithZenRows($arabamUrl, $zenrowsKey, [
    'js_render' => true,
    'wait_for' => '.listing-text,.listing-list,.content-container,.icerik',
    'wait' => 2500
]);

if ($arabamResult['code'] === 200 && !empty($arabamResult['body'])) {
    $arabamIlanlar = parseArabam($arabamResult['body'], $marka, $model, $yil);
    if (!empty($arabamIlanlar)) {
        $tumIlanlar = array_merge($tumIlanlar, $arabamIlanlar);
        $basarili[] = 'arabam.com(' . count($arabamIlanlar) . ' ilan)';
    } else {
        // HTML geldi ama fiyat parse edilemedi
        $htmlLen = strlen($arabamResult['body']);
        $hatalar[] = 'arabam.com: HTML alındı(' . $htmlLen . ' byte) ama fiyat bulunamadı';
        $debugInfo['arabam_html_length'] = $htmlLen;
    }
} else {
    $hatalar[] = 'arabam.com: HTTP ' . $arabamResult['code'] . ($arabamResult['error'] ? ' - ' . $arabamResult['error'] : '');
}

// 2. OTOPLUS.COM (js_render=true)
$otoplusUrl = 'https://www.otoplus.com/ikinci-el-arac?marka=' . urlencode($marka) . '&model=' . urlencode($model) . '&yilMin=' . $yil . '&yilMax=' . $yil . '&siralama=fiyatAzalan';

$otoplusResult = fetchWithZenRows($otoplusUrl, $zenrowsKey, [
    'js_render' => true,
    'wait_for' => '.vehicle-card,.product-card,.listing-item,.search-result',
    'wait' => 2500
]);

if ($otoplusResult['code'] === 200 && !empty($otoplusResult['body'])) {
    $otoplusIlanlar = parseOtoplus($otoplusResult['body'], $marka, $model, $yil);
    if (!empty($otoplusIlanlar)) {
        $tumIlanlar = array_merge($tumIlanlar, $otoplusIlanlar);
        $basarili[] = 'otoplus.com(' . count($otoplusIlanlar) . ' ilan)';
    } else {
        $htmlLen = strlen($otoplusResult['body']);
        $hatalar[] = 'otoplus.com: HTML alındı(' . $htmlLen . ' byte) ama fiyat bulunamadı';
        $debugInfo['otoplus_html_length'] = $htmlLen;
    }
} else {
    $hatalar[] = 'otoplus.com: HTTP ' . $otoplusResult['code'] . ($otoplusResult['error'] ? ' - ' . $otoplusResult['error'] : '');
}

// ═══ SONUÇ HESAPLA ═══
if (empty($tumIlanlar)) {
    $hataMsg = 'İLAN VERİSİ ÇEKİLEMEDİ.';
    if (!empty($hatalar)) $hataMsg .= ' ' . implode(' | ', $hatalar);
    $hataMsg .= ' Lütfen RAYİÇ DEĞER alanına manuel giriş yapın.';
    $response = ['success' => false, 'error' => $hataMsg];
    if (!empty($debugInfo)) $response['debug'] = $debugInfo;
    echo json_encode($response);
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

$response = ['success' => true, 'data' => [
    'ilanlar' => $enYuksek5,
    'ortalama' => $ortalama,
    'en_yuksek' => $enYuksekFiyat,
    'en_dusuk' => $enDusukFiyat,
    'toplam_bulunan' => count($tumIlanlar),
    'kaynak' => 'zenrows_gercek',
    'analiz_notu' => 'GERÇEK VERİ: ' . implode(' + ', $basarili) . '. En yüksek 5 ilanın ortalaması: ' . number_format($ortalama, 0, ',', '.') . ' TL'
]];
if (!empty($hatalar)) $response['data']['uyarilar'] = $hatalar;

echo json_encode($response);
