<?php
/**
 * MR HASAR DANIŞMANLIK - OCR EVRAK ANALİZ ENDPOINTİ
 * Google Gemini Vision API ile evrak OCR okuma
 * Ruhsat, hasar raporu, sağlık raporu, maluliyet raporu analizi
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

$user = auth_required();

// API Key çek
$apiKey = '';
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT anahtar, deger FROM ayarlar WHERE anahtar IN ('ai_api_key', 'openai_api_key') ORDER BY anahtar ASC");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        if (!empty(trim($row['deger']))) {
            $apiKey = trim($row['deger']);
            break;
        }
    }
} catch (Exception $e) {
    $apiKey = '';
}

if (empty($apiKey) || !str_starts_with($apiKey, 'AIzaSy')) {
    echo json_encode(['success' => false, 'error' => 'GEMİNİ API KEY BULUNAMADI. SİSTEM AYARLARINDAN AI_API_KEY TANIMLAYIN.']);
    exit;
}

// Dosya tipini belirle (adk veya bh)
$tip = $_POST['tip'] ?? 'adk';
$dosyaSayisi = intval($_POST['dosya_sayisi'] ?? 1);

// Dosyaları oku ve base64'e çevir
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

    // PDF ise ilk sayfayı image olarak çeviremiyoruz, direkt gönder
    $mimeType = $mime;
    if ($mime === 'application/pdf') {
        $mimeType = 'application/pdf';
    }

    $images[] = [
        'inline_data' => [
            'mime_type' => $mimeType,
            'data' => base64_encode($content)
        ]
    ];
}

if (empty($images)) {
    echo json_encode(['success' => false, 'error' => 'GEÇERLİ DOSYA BULUNAMADI. PDF, JPG VEYA PNG YÜKLEYİN.']);
    exit;
}

// Prompt oluştur
if ($tip === 'bh') {
    $prompt = 'Bu belgeyi analiz et. Bedeni hasar / sağlık / maluliyet raporu olarak incele.
Aşağıdaki bilgileri JSON formatında döndür:
{
  "magdur_adi": "kişinin adı soyadı",
  "dogum_tarihi": "YYYY-MM-DD formatında",
  "cinsiyet": "ERKEK veya KADIN",
  "tc_no": "TC kimlik no varsa",
  "maluliyet_orani": sayısal değer (1-100),
  "meslek": "meslek bilgisi",
  "kaza_tarihi": "YYYY-MM-DD formatında",
  "tani": "tıbbi tanı/teşhis",
  "tedavi": "uygulanan tedavi",
  "hastane": "hastane adı",
  "guven": güven yüzdesi (1-100)
}
Bulamadiğın alanları null yap. Sadece JSON döndür, başka metin yazma.';
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
Bulamadiğın alanları null yap. Sadece JSON döndür, başka metin yazma.';
}

// Gemini Vision API çağrısı
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

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload)
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    echo json_encode([
        'success' => false,
        'error' => 'GEMİNİ API HATASI: HTTP ' . $httpCode . ($curlError ? ' - ' . $curlError : '')
    ]);
    exit;
}

$data = json_decode($response, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

if (empty($text)) {
    echo json_encode(['success' => false, 'error' => 'GEMİNİ YANIT ALINAMADI']);
    exit;
}

// JSON parse et (Gemini bazen ```json ... ``` ile sarar)
$text = trim($text);
$text = preg_replace('/^```json\s*/i', '', $text);
$text = preg_replace('/\s*```$/i', '', $text);
$text = trim($text);

$parsed = json_decode($text, true);
if (!$parsed) {
    // Tekrar dene - belki içeride JSON var
    preg_match('/\{[^{}]*\}/s', $text, $matches);
    if (!empty($matches[0])) {
        $parsed = json_decode($matches[0], true);
    }
}

if ($parsed) {
    echo json_encode(['success' => true, 'data' => $parsed]);
} else {
    echo json_encode(['success' => false, 'error' => 'EVRAK ANALİZ EDİLEMEDİ. LÜTFEN DAHA NET BİR GÖRÜNTÜ YÜKLEYİN.', 'raw' => $text]);
}
