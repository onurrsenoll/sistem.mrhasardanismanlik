<?php
/**
 * MR HASAR DANIŞMANLIK - RAYİÇ DEĞER ARAŞTIRMASI
 * ZenRows API ile sahibinden.com + araban.com'dan GERÇEK İLAN VERİSİ
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
$kazaTarihi = $input['kaza_tarihi'] ?? date('Y-m-d', strtotime('-6 months'));

// ZenRows API key - DB'den oku
$zenrowsKey = '';
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'zenrows_api_key' AND deger != ''");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) $zenrowsKey = trim($row['deger']);
} catch (Exception $e) {}

// DB'de yoksa varsayılan key
if (empty($zenrowsKey)) {
    $zenrowsKey = 'dc803cfc781d3c8a5f885d298cb4c4fa8223072e';
}

// ═══ SAHİBİNDEN.COM ARAMA URL'İ OLUŞTUR ═══
function buildSahibindenUrl($marka, $model, $yil, $km) {
    // sahibinden.com arama formatı
    $query = urlencode($marka . ' ' . $model);
    $url = 'https://www.sahibinden.com/otomobil?query_text=' . $query;
    $url .= '&a5_max=' . $yil . '&a5_min=' . $yil; // model yılı
    if ($km > 0) {
        $kmMin = max(0, $km - 30000);
        $kmMax = $km + 30000;
        $url .= '&a4_min=' . $kmMin . '&a4_max=' . $kmMax; // km aralığı
    }
    $url .= '&sorting=price_desc'; // en yüksek fiyattan sırala
    return $url;
}

// ═══ ARABAN.COM ARAMA URL'İ OLUŞTUR ═══
function buildArabanUrl($marka, $model, $yil) {
    $query = urlencode($marka . ' ' . $model);
    return 'https://www.araban.com/ikinci-el-araba?q=' . $query . '&yil_min=' . $yil . '&yil_max=' . $yil . '&siralama=fiyat-azalan';
}

// ═══ ZENROWS İLE HTML ÇEK ═══
function fetchWithZenRows($url, $apiKey) {
    $zenUrl = 'https://api.zenrows.com/v1/?apikey=' . $apiKey
        . '&url=' . urlencode($url)
        . '&js_render=true'
        . '&premium_proxy=true'
        . '&wait=3000';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $zenUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return ['body' => $response, 'code' => $httpCode, 'error' => $error];
}

// ═══ SAHİBİNDEN HTML PARSE ═══
function parseSahibinden($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;

    // sahibinden.com farklı HTML yapıları deneniyor
    $patterns = [
        // Pattern 1: searchResultsItem içindeki fiyat
        '/class="[^"]*searchResults[^"]*Price[^"]*"[^>]*>\s*([\d.]+)\s/si',
        // Pattern 2: data-price attribute
        '/data-price="(\d+)"/si',
        // Pattern 3: TL cinsinden fiyat (genel)
        '/([\d]{3,3}\.[\d]{3}(?:\.[\d]{3})?)\s*(?:TL|₺)/s',
        // Pattern 4: Sadece büyük rakamlar (100.000+)
        '/>\s*((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)\s*</s'
    ];

    $fiyatlar = [];
    foreach ($patterns as $pattern) {
        if (preg_match_all($pattern, $html, $matches)) {
            foreach ($matches[1] as $m) {
                $f = (int)preg_replace('/[^\d]/', '', $m);
                if ($f >= 50000 && $f <= 50000000) $fiyatlar[] = $f;
            }
            if (count($fiyatlar) >= 3) break;
        }
    }

    // Tekrarları kaldır ve sırala
    $fiyatlar = array_unique($fiyatlar);
    rsort($fiyatlar);

    foreach (array_slice($fiyatlar, 0, 10) as $i => $fiyat) {
        $ilanlar[] = [
            'kaynak' => 'sahibinden.com',
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

// ═══ ARABAN.COM HTML PARSE ═══
function parseAraban($html, $marka, $model, $yil) {
    $ilanlar = [];
    if (empty($html)) return $ilanlar;

    $patterns = [
        '/class="[^"]*price[^"]*"[^>]*>\s*([\d.,]+)\s*(?:TL|₺)/si',
        '/([\d]{3,3}\.[\d]{3}(?:\.[\d]{3})?)\s*(?:TL|₺)/s',
        '/>\s*((?:\d{1,3}\.)*\d{3,})\s*(?:TL|₺)\s*</s'
    ];

    $fiyatlar = [];
    foreach ($patterns as $pattern) {
        if (preg_match_all($pattern, $html, $matches)) {
            foreach ($matches[1] as $m) {
                $f = (int)preg_replace('/[^\d]/', '', $m);
                if ($f >= 50000 && $f <= 50000000) $fiyatlar[] = $f;
            }
            if (count($fiyatlar) >= 3) break;
        }
    }

    $fiyatlar = array_unique($fiyatlar);
    rsort($fiyatlar);

    foreach (array_slice($fiyatlar, 0, 10) as $fiyat) {
        $ilanlar[] = [
            'kaynak' => 'araban.com',
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

// 1. SAHİBİNDEN.COM
$sahibindenUrl = buildSahibindenUrl($marka, $model, $yil, $km);
$sahibindenResult = fetchWithZenRows($sahibindenUrl, $zenrowsKey);

if ($sahibindenResult['code'] === 200 && !empty($sahibindenResult['body'])) {
    $sahibindenIlanlar = parseSahibinden($sahibindenResult['body'], $marka, $model, $yil);
    $tumIlanlar = array_merge($tumIlanlar, $sahibindenIlanlar);
} else {
    $hatalar[] = 'sahibinden.com: HTTP ' . $sahibindenResult['code'] . ' ' . ($sahibindenResult['error'] ?: '');
}

// 2. ARABAN.COM
$arabanUrl = buildArabanUrl($marka, $model, $yil);
$arabanResult = fetchWithZenRows($arabanUrl, $zenrowsKey);

if ($arabanResult['code'] === 200 && !empty($arabanResult['body'])) {
    $arabanIlanlar = parseAraban($arabanResult['body'], $marka, $model, $yil);
    $tumIlanlar = array_merge($tumIlanlar, $arabanIlanlar);
} else {
    $hatalar[] = 'araban.com: HTTP ' . $arabanResult['code'] . ' ' . ($arabanResult['error'] ?: '');
}

// ═══ SONUÇ HESAPLA ═══
if (empty($tumIlanlar)) {
    // ZenRows başarısız olursa Claude AI fallback
    require_once __DIR__ . '/../../config/ai-helper.php';
    $keys = getAiKeys();
    $apiKey = $keys['active'];

    if (!empty($apiKey)) {
        $bugun = date('Y-m-d');
        $kmStr = number_format($km, 0, '.', '.');
        $prompt = "GÖREV: {$marka} {$model} {$yil} model, {$kmStr} km araç için Türkiye piyasasındaki GÜNCEL RAYİÇ DEĞER. sahibinden.com ve araban.com bilgin ile EN YÜKSEK fiyatlı 5 aracın fiyat ortalamasını hesapla. KESİNLİKLE 0 TL verme. JSON formatında yanıt ver: {\"ilanlar\":[{\"kaynak\":\"sahibinden.com\",\"baslik\":\"ilan\",\"fiyat\":650000,\"km\":145000,\"yil\":{$yil},\"sehir\":\"İstanbul\",\"tarih\":\"{$bugun}\"}],\"ortalama\":620000,\"en_yuksek\":680000,\"en_dusuk\":560000,\"toplam_bulunan\":5,\"analiz_notu\":\"not\"}";
        $systemPrompt = "Sen Türkiye otomobil piyasası uzmanısın. MUTLAKA gerçekçi rakam ver. JSON formatında yanıt ver.";
        $result = callClaudeAPI($apiKey, $systemPrompt, $prompt, 0.2, 2048, 45);

        if ($result) {
            $parsed = null;
            $t = trim($result);
            $r = json_decode($t, true);
            if ($r && is_array($r)) $parsed = $r;
            if (!$parsed && preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m)) {
                $r = json_decode(trim($m[1]), true); if ($r) $parsed = $r;
            }
            if (!$parsed) {
                $f = strpos($t, '{'); $l = strrpos($t, '}');
                if ($f !== false && $l !== false) {
                    $r = json_decode(substr($t, $f, $l-$f+1), true); if ($r) $parsed = $r;
                }
            }
            if ($parsed) {
                $parsed['kaynak'] = 'ai_tahmin';
                $parsed['analiz_notu'] = ($parsed['analiz_notu'] ?? '') . ' (ZenRows başarısız, AI tahmini kullanıldı)';
                echo json_encode(['success' => true, 'data' => $parsed]);
                exit;
            }
        }
    }

    echo json_encode(['success' => false, 'error' => 'İLAN VERİSİ ÇEKİLEMEDİ. ' . implode(' | ', $hatalar)]);
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

$sahibindenCount = count(array_filter($tumIlanlar, function($i) { return $i['kaynak'] === 'sahibinden.com'; }));
$arabanCount = count(array_filter($tumIlanlar, function($i) { return $i['kaynak'] === 'araban.com'; }));

$sonuc = [
    'ilanlar' => $enYuksek5,
    'ortalama' => $ortalama,
    'en_yuksek' => $enYuksekFiyat,
    'en_dusuk' => $enDusukFiyat,
    'toplam_bulunan' => count($tumIlanlar),
    'kaynak' => 'zenrows_gercek',
    'analiz_notu' => 'GERÇEK VERİ: sahibinden.com(' . $sahibindenCount . ' ilan) + araban.com(' . $arabanCount . ' ilan). En yüksek 5 ilanın ortalaması: ' . number_format($ortalama, 0, ',', '.') . ' TL'
];

echo json_encode(['success' => true, 'data' => $sonuc]);
