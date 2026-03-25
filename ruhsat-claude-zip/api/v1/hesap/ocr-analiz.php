<?php
/**
 * MR HASAR DANISMANLIK - OCR EVRAK ANALIZ ENDPOINTI
 * Claude Vision API ile evrak OCR okuma
 * GD ile goruntu on isleme (grayscale, kontrast, keskinlestirme)
 * Modul bazli ozel API key destegi
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
    json_error('GECERSIZ ISTEK YONTEMI', 405);
}

$user = auth_required();

// === API KEY COZUMLEME (3 katmanli) ===
// 1. POST parametresinden gelen ozel key (modul bazli)
// 2. DB'den modul bazli key (qr_ruhsat_claude_key)
// 3. Firma ayarlarindaki genel Claude key

$apiKey = '';
$tip = isset($_POST['tip']) ? $_POST['tip'] : 'adk';

// Katman 1: POST'tan gelen ozel API key
$customApiKey = isset($_POST['api_key']) ? trim($_POST['api_key']) : '';
if (!empty($customApiKey)) {
    $apiKey = $customApiKey;
}

// Katman 2: DB'den modul bazli key (sadece ruhsat tipi icin)
if (empty($apiKey) && $tip === 'ruhsat') {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'qr_ruhsat_claude_key' AND deger != ''");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty(trim($row['deger']))) {
            $apiKey = trim($row['deger']);
        }
    } catch (Exception $e) {
        // Sessizce devam et, genel key'e dus
    }
}

// Katman 3: Firma ayarlarindaki genel Claude key
if (empty($apiKey)) {
    $keys = getAiKeys();
    $apiKey = $keys['claude'];
}

if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'CLAUDE API KEY BULUNAMADI. QR RUHSAT SAYFASINDAN VEYA SISTEM > FIRMA AYARLARI SAYFASINDAN API ANAHTARI TANIMLAYIN.']);
    exit;
}

$dosyaSayisi = intval(isset($_POST['dosya_sayisi']) ? $_POST['dosya_sayisi'] : 1);

// === GD ILE GORUNTU ON ISLEME FONKSIYONU ===
function preprocessImageGD($content, $mime) {
    // GD kutuphanesi yoksa orijinal icerigi dondur
    if (!function_exists('imagecreatefromstring')) {
        return ['content' => $content, 'mime' => $mime];
    }

    // PDF dosyalarini isleme
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

        // Cok kucuk gorselleri buyut (OCR dogrulugu icin)
        if ($w < 1200 || $h < 800) {
            $scale = max(1200 / $w, 800 / $h, 1.5);
            $nw = intval($w * $scale);
            $nh = intval($h * $scale);
            $scaled = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($scaled, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $scaled;
        }

        // 1. Grayscale donusumu
        imagefilter($img, IMG_FILTER_GRAYSCALE);

        // 2. Kontrast artirma (negatif deger = daha fazla kontrast)
        imagefilter($img, IMG_FILTER_CONTRAST, -35);

        // 3. Parlaklik ayari (hafif artirma)
        imagefilter($img, IMG_FILTER_BRIGHTNESS, 10);

        // 4. Keskinlestirme (unsharp mask konvolusyon matrisi)
        $sharpen = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        imageconvolution($img, $sharpen, 1, 0);

        // 5. Ikinci gecis kontrast (metin netligi icin)
        imagefilter($img, IMG_FILTER_CONTRAST, -15);

        // JPEG olarak yuksek kalitede buffer'a yaz
        ob_start();
        imagejpeg($img, null, 95);
        $processed = ob_get_clean();
        imagedestroy($img);

        if ($processed && strlen($processed) > 0) {
            return ['content' => $processed, 'mime' => 'image/jpeg'];
        }
    } catch (Exception $e) {
        // GD hatasi - orijinal gorseli kullan
    }

    return ['content' => $content, 'mime' => $mime];
}

// === DOSYALARI OKU VE ISLE ===
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

    // GD ile on isleme uygula (ruhsat ve adk tipleri icin)
    if ($tip === 'ruhsat' || $tip === 'adk') {
        $processed = preprocessImageGD($content, $mime);
        $content = $processed['content'];
        $mime = $processed['mime'];
    }

    // Claude Vision API formati: image content block
    $mediaType = $mime;
    if ($mediaType === 'image/jpg') $mediaType = 'image/jpeg';

    $images[] = [
        'type' => 'image',
        'source' => [
            'type' => 'base64',
            'media_type' => $mediaType,
            'data' => base64_encode($content)
        ]
    ];
}

if (empty($images)) {
    echo json_encode(['success' => false, 'error' => 'GECERLI DOSYA BULUNAMADI. PDF, JPG VEYA PNG YUKLEYIN. Dosya sayisi: ' . $dosyaSayisi . ', FILES: ' . json_encode(array_keys($_FILES))]);
    exit;
}

// === PROMPT OLUSTUR ===
if ($tip === 'ruhsat') {
    $prompt = 'Bu gorseli analiz et. Bu bir Turk arac tescil belgesi (ruhsat) fotografidir.
Belgedeki tum bilgileri dikkatle oku ve asagidaki JSON formatinda dondur:
{
  "plaka": "arac plaka numarasi (Orn: 34ABC1234)",
  "marka": "arac markasi (BUYUK HARF, Orn: TOYOTA, FORD, VOLKSWAGEN)",
  "model": "arac modeli (BUYUK HARF, Orn: COROLLA, FOCUS)",
  "modelYili": model yili (sayi, Orn: 2020),
  "sase": "sase/VIN numarasi (17 karakter)",
  "tc": "TC kimlik numarasi veya vergi numarasi (10-11 haneli sayi)",
  "soyad": "ruhsat sahibi soyadi veya ticari unvani (BUYUK HARF)",
  "ad": "ruhsat sahibi adi (BUYUK HARF)",
  "belgeSeri": "belge seri numarasi (Orn: HD 120077)",
  "motorNo": "motor numarasi varsa",
  "renk": "arac rengi",
  "yakitTuru": "benzin/dizel/LPG/elektrik",
  "guven": guven yuzdesi (1-100)
}
ONEMLI: Ruhsat belgesinde (A) plaka, (D.1) marka, (D.2) tip/model, (D.4) model yili, (E) sase numarasi, (Y.4) TC/Vergi No, (C.1.1) soyadi/ticari unvan, (C.1.2) adi, belge seri no gibi alanlar bulunur. Tum alanlari dikkatlice oku.
Bulamadigin alanlari null yap. Sadece JSON dondur, baska metin yazma.';
} else if ($tip === 'bh') {
    $prompt = 'Bu belgeyi analiz et. Bedeni hasar / saglik / maluliyet raporu olarak incele.
Asagidaki bilgileri JSON formatinda dondur:
{
  "magdurAdi": "kisinin adi soyadi",
  "dogumTarihi": "YYYY-MM-DD formatinda",
  "cinsiyet": "ERKEK veya KADIN",
  "tcNo": "TC kimlik no varsa",
  "maluliyetOrani": sayisal deger (1-100),
  "meslek": "meslek bilgisi",
  "kazaTarihi": "YYYY-MM-DD formatinda",
  "tani": "tibbi tani/teshis",
  "tedavi": "uygulanan tedavi",
  "hastane": "hastane adi",
  "aylikGelir": sayisal deger varsa,
  "guven": guven yuzdesi (1-100)
}
Bulamadigin alanlari null yap. Sadece JSON dondur, baska metin yazma.';
} else {
    $prompt = 'Bu belgeyi analiz et. Arac ruhsati, hasar raporu veya onarim faturasi olarak incele.
Asagidaki bilgileri JSON formatinda dondur:
{
  "marka": "arac markasi (BUYUK HARF)",
  "model": "arac modeli (BUYUK HARF)",
  "yil": model yili (sayi),
  "plaka": "plaka numarasi",
  "sasi_no": "sasi numarasi varsa",
  "motor_no": "motor numarasi varsa",
  "sahip_adi": "arac sahibi adi soyadi",
  "hasar_tutari": sayisal onarim bedeli (varsa),
  "degisen_parcalar": "degisen parcalar listesi (virgulle ayrilmis)",
  "boyanan_parcalar": "boyanan parcalar listesi (virgulle ayrilmis)",
  "km": kilometre (sayi, varsa),
  "renk": "arac rengi",
  "guven": guven yuzdesi (1-100)
}
Bulamadigin alanlari null yap. Sadece JSON dondur, baska metin yazma.';
}

// === CLAUDE VISION API CAGRISI ===
$url = 'https://api.anthropic.com/v1/messages';

// Content bloklari: once gorseller, sonra metin prompt
$contentBlocks = [];
foreach ($images as $img) {
    $contentBlocks[] = $img;
}
$contentBlocks[] = ['type' => 'text', 'text' => $prompt];

$payload = [
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 1024,
    'messages' => [
        [
            'role' => 'user',
            'content' => $contentBlocks
        ]
    ],
    'temperature' => 0.1
];

$jsonPayload = json_encode($payload);
if ($jsonPayload === false) {
    echo json_encode(['success' => false, 'error' => 'JSON ENCODE HATASI: ' . json_last_error_msg()]);
    exit;
}

$res = http_post($url, $jsonPayload, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'anthropic-version: 2023-06-01'
], 60);

if ($res['http_code'] !== 200 || !$res['body']) {
    echo json_encode([
        'success' => false,
        'error' => 'CLAUDE API HATASI: HTTP ' . $res['http_code'] . ($res['error'] ? ' - ' . $res['error'] : '') . ' (yontem: ' . $res['method'] . ')'
    ]);
    exit;
}

$data = json_decode($res['body'], true);

// Claude response: content bloklari icinden text'leri topla
$allTexts = [];
$contentParts = isset($data['content']) ? $data['content'] : [];
foreach ($contentParts as $block) {
    if (isset($block['type']) && $block['type'] === 'text' && isset($block['text'])) {
        $allTexts[] = $block['text'];
    }
}
$text = !empty($allTexts) ? end($allTexts) : '';

if (empty($text)) {
    echo json_encode(['success' => false, 'error' => 'CLAUDE YANIT ALINAMADI']);
    exit;
}

// === JSON PARSE - COKLU STRATEJI ===
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
    // Ilk { son }
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
    echo json_encode(['success' => false, 'error' => 'EVRAK ANALIZ EDILEMEDI. LUTFEN DAHA NET BIR GORUNTU YUKLEYIN.', 'raw' => $text]);
}

} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'PHP HATASI: ' . $e->getMessage() . ' (Satir: ' . $e->getLine() . ')']);
}
