<?php
/**
 * MR HASAR DANIŞMANLIK - OCR EVRAK ANALİZ ENDPOINTİ
 * Google Gemini Vision API ile evrak OCR okuma
 * GD ile görüntü ön işleme (grayscale, kontrast, keskinleştirme)
 * Modül bazlı özel API key desteği
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Global hata yakalama
set_exception_handler(function($e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'SUNUCU HATASI: ' . $e->getMessage()]);
    exit;
});

set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/ai-helper.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

$user = auth_required();

// ═══ API KEY ÇÖZÜMLEME (3 katmanlı) ═══
// 1. POST parametresinden gelen özel key (modül bazlı)
// 2. DB'den modül bazlı key (qr_ruhsat_gemini_key)
// 3. Firma ayarlarındaki genel Gemini key

$apiKey = '';
$tip = isset($_POST['tip']) ? $_POST['tip'] : 'adk';

// Katman 1: POST'tan gelen özel API key
$customApiKey = isset($_POST['api_key']) ? trim($_POST['api_key']) : '';
if (!empty($customApiKey)) {
    $apiKey = $customApiKey;
}

// Katman 2: DB'den modül bazlı key (sadece ruhsat tipi için)
if (empty($apiKey) && $tip === 'ruhsat') {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'qr_ruhsat_gemini_key' AND deger != ''");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty(trim($row['deger']))) {
            $apiKey = trim($row['deger']);
        }
    } catch (Exception $e) {
        // Sessizce devam et, genel key'e düş
    }
}

// Katman 3: Firma ayarlarındaki genel Gemini key
if (empty($apiKey)) {
    $keys = getAiKeys();
    $apiKey = $keys['gemini'];
}

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'GEMİNİ API KEY BULUNAMADI. QR RUHSAT SAYFASINDAN VEYA SİSTEM > FİRMA AYARLARI SAYFASINDAN API ANAHTARI TANIMLAYIN.']);
    exit;
}

$dosyaSayisi = intval(isset($_POST['dosya_sayisi']) ? $_POST['dosya_sayisi'] : 1);

// ═══ GD İLE GÖRÜNTÜ ÖN İŞLEME FONKSİYONU ═══
function preprocessImageGD($content, $mime) {
    // GD kütüphanesi yoksa orijinal içeriği döndür
    if (!function_exists('imagecreatefromstring')) {
        return ['content' => $content, 'mime' => $mime];
    }

    // PDF dosyalarını işleme
    if ($mime === 'application/pdf') {
        return ['content' => $content, 'mime' => $mime];
    }

    try {
        $img = imagecreatefromstring($content);
        if (!$img) {
            return ['content' => $content, 'mime' => $mime];
        }

        $w = imagesx($img);
        $h = imagesy($img);

        // Çok küçük görselleri büyüt (OCR doğruluğu için)
        if ($w < 1200 || $h < 800) {
            $scale = max(1200 / $w, 800 / $h, 1.5);
            $nw = intval($w * $scale);
            $nh = intval($h * $scale);
            $scaled = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($scaled, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $scaled;
        }

        // 1. Grayscale dönüşümü
        imagefilter($img, IMG_FILTER_GRAYSCALE);

        // 2. Kontrast artırma (negatif değer = daha fazla kontrast)
        imagefilter($img, IMG_FILTER_CONTRAST, -35);

        // 3. Parlaklık ayarı (hafif artırma)
        imagefilter($img, IMG_FILTER_BRIGHTNESS, 10);

        // 4. Keskinleştirme (unsharp mask konvolüsyon matrisi)
        $sharpen = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        imageconvolution($img, $sharpen, 1, 0);

        // 5. İkinci geçiş kontrast (metin netliği için)
        imagefilter($img, IMG_FILTER_CONTRAST, -15);

        // JPEG olarak yüksek kalitede buffer'a yaz
        ob_start();
        imagejpeg($img, null, 95);
        $processed = ob_get_clean();
        imagedestroy($img);

        if ($processed && strlen($processed) > 0) {
            return ['content' => $processed, 'mime' => 'image/jpeg'];
        }
    } catch (Exception $e) {
        // GD hatası - orijinal görseli kullan
    }

    return ['content' => $content, 'mime' => $mime];
}

// ═══ DOSYALARI OKU VE İŞLE ═══
$images = [];
for ($i = 0; $i < $dosyaSayisi; $i++) {
    $key = 'dosya_' . $i;
    if (!isset($_FILES[$key]) || $_FILES[$key]['error'] !== UPLOAD_ERR_OK) continue;

    $file = $_FILES[$key];
    $maxSize = 10 * 1024 * 1024; // 10MB
    if ($file['size'] > $maxSize) continue;

    $allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    $mime = $file['type'];
    if (!in_array($mime, $allowed)) continue;

    $content = file_get_contents($file['tmp_name']);
    if ($content === false) continue;

    // GD ile ön işleme uygula (ruhsat ve adk tipleri için)
    if ($tip === 'ruhsat' || $tip === 'adk') {
        $processed = preprocessImageGD($content, $mime);
        $content = $processed['content'];
        $mime = $processed['mime'];
    }

    $images[] = [
        'inline_data' => [
            'mime_type' => $mime,
            'data' => base64_encode($content)
        ]
    ];
}

if (empty($images)) {
    echo json_encode(['success' => false, 'error' => 'GEÇERLİ DOSYA BULUNAMADI. PDF, JPG VEYA PNG YÜKLEYİN. Dosya sayısı: ' . $dosyaSayisi . ', FILES: ' . json_encode(array_keys($_FILES))]);
    exit;
}

// ═══ PROMPT OLUŞTUR ═══
if ($tip === 'ruhsat') {
    $prompt = 'Bu görseli analiz et. Bu bir Türk araç tescil belgesi (ruhsat) fotoğrafıdır.
Belgedeki tüm bilgileri dikkatle oku ve aşağıdaki JSON formatında döndür:
{
  "plaka": "araç plaka numarası (Örn: 34ABC1234)",
  "marka": "araç markası (BÜYÜK HARF, Örn: TOYOTA, FORD, VOLKSWAGEN)",
  "model": "araç modeli (BÜYÜK HARF, Örn: COROLLA, FOCUS)",
  "modelYili": model yılı (sayı, Örn: 2020),
  "sase": "şase/VIN numarası (17 karakter)",
  "tc": "TC kimlik numarası veya vergi numarası (10-11 haneli sayı)",
  "soyad": "ruhsat sahibi soyadı veya ticari ünvanı (BÜYÜK HARF)",
  "ad": "ruhsat sahibi adı (BÜYÜK HARF)",
  "belgeSeri": "belge seri numarası (Örn: HD 120077)",
  "motorNo": "motor numarası varsa",
  "renk": "araç rengi",
  "yakitTuru": "benzin/dizel/LPG/elektrik",
  "guven": güven yüzdesi (1-100)
}
ÖNEMLİ: Ruhsat belgesinde (A) plaka, (D.1) marka, (D.2) tip/model, (D.4) model yılı, (E) şase numarası, (Y.4) TC/Vergi No, (C.1.1) soyadı/ticari ünvan, (C.1.2) adı, belge seri no gibi alanlar bulunur. Tüm alanları dikkatlice oku.
Bulamadığın alanları null yap. Sadece JSON döndür, başka metin yazma.';
} else if ($tip === 'bh') {
    $prompt = 'Bu belgeyi analiz et. Bedeni hasar / sağlık / maluliyet raporu olarak incele.
Aşağıdaki bilgileri JSON formatında döndür:
{
  "magdurAdi": "kişinin adı soyadı",
  "dogumTarihi": "YYYY-MM-DD formatında",
  "cinsiyet": "ERKEK veya KADIN",
  "tcNo": "TC kimlik no varsa",
  "maluliyetOrani": sayısal değer (1-100),
  "meslek": "meslek bilgisi",
  "kazaTarihi": "YYYY-MM-DD formatında",
  "tani": "tıbbi tanı/teşhis",
  "tedavi": "uygulanan tedavi",
  "hastane": "hastane adı",
  "aylikGelir": sayısal değer varsa,
  "guven": güven yüzdesi (1-100)
}
Bulamadığın alanları null yap. Sadece JSON döndür, başka metin yazma.';
} else {
    $prompt = 'Bu belgeyi analiz et. Araç ruhsatı, hasar raporu veya onarım faturası olarak incele.
Aşağıdaki bilgileri JSON formatında döndür:
{
  "marka": "araç markası (BÜYÜK HARF)",
  "model": "araç modeli (BÜYÜK HARF)",
  "yil": model yılı (sayı),
  "plaka": "plaka numarası",
  "sasi_no": "şasi numarası varsa",
  "motor_no": "motor numarası varsa",
  "sahip_adi": "araç sahibi adı soyadı",
  "hasar_tutari": sayısal onarım bedeli (varsa),
  "degisen_parcalar": "değişen parçalar listesi (virgülle ayrılmış)",
  "boyanan_parcalar": "boyanan parçalar listesi (virgülle ayrılmış)",
  "km": kilometre (sayı, varsa),
  "renk": "araç rengi",
  "guven": güven yüzdesi (1-100)
}
Bulamadığın alanları null yap. Sadece JSON döndür, başka metin yazma.';
}

// ═══ GEMİNİ VİSİON API ÇAĞRISI ═══
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($apiKey);

$parts = [];
foreach ($images as $img) {
    $parts[] = $img;
}
$parts[] = ['text' => $prompt];

$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => $parts
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.1,
        'maxOutputTokens' => 1024,
        'topP' => 0.8
    ]
];

$jsonPayload = json_encode($payload);
if ($jsonPayload === false) {
    echo json_encode(['success' => false, 'error' => 'JSON ENCODE HATASI: ' . json_last_error_msg()]);
    exit;
}

$res = http_post($url, $jsonPayload, ['Content-Type: application/json'], 60);

if ($res['http_code'] !== 200 || !$res['body']) {
    echo json_encode([
        'success' => false,
        'error' => 'GEMİNİ API HATASI: HTTP ' . $res['http_code'] . ($res['error'] ? ' - ' . $res['error'] : '') . ' (yontem: ' . $res['method'] . ')'
    ]);
    exit;
}

$data = json_decode($res['body'], true);
// Gemini 2.5 Flash - TÜM parçaları topla
$allTexts = [];
$allParts = isset($data['candidates'][0]['content']['parts']) ? $data['candidates'][0]['content']['parts'] : [];
foreach ($allParts as $part) {
    if (isset($part['text'])) $allTexts[] = $part['text'];
}
$text = !empty($allTexts) ? end($allTexts) : '';

if (empty($text)) {
    echo json_encode(['success' => false, 'error' => 'GEMİNİ YANIT ALINAMADI']);
    exit;
}

// ═══ JSON PARSE - ÇOKLU STRATEJİ ═══
$parsed = null;

foreach ($allTexts as $t) {
    $t = trim($t);
    // Direkt
    $r = json_decode($t, true);
    if ($r && is_array($r)) { $parsed = $r; }
    // Markdown code block
    if (!$parsed && preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m)) {
        $r = json_decode(trim($m[1]), true);
        if ($r && is_array($r)) { $parsed = $r; }
    }
    // İlk { son }
    if (!$parsed) {
        $f = strpos($t, '{'); $l = strrpos($t, '}');
        if ($f !== false && $l !== false && $l > $f) {
            $r = json_decode(substr($t, $f, $l - $f + 1), true);
            if ($r && is_array($r)) { $parsed = $r; }
        }
    }
    if ($parsed) break;
}

if ($parsed) {
    $parsed = array_change_key_case($parsed, CASE_LOWER);
    echo json_encode(['success' => true, 'data' => $parsed]);
} else {
    echo json_encode(['success' => false, 'error' => 'EVRAK ANALİZ EDİLEMEDİ. LÜTFEN DAHA NET BİR GÖRÜNTÜ YÜKLEYİN.', 'raw' => $text]);
}

} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'PHP HATASI: ' . $e->getMessage() . ' (Satır: ' . $e->getLine() . ')']);
}
