<?php
/**
 * GET /api/v1/evrak/download.php?id=1
 * Evrak indir / önizle (PDF, resim vb.)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers (dosya stream ettiği için setup_headers kullanmıyoruz)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$evrakId = (int)($_GET['id'] ?? 0);
$smsToken = $_GET['token'] ?? '';

// SMS TOKEN İLE ERİŞİM (MÜŞTERİ SMS LİNKİNDEN GELİYORSA)
if (!empty($smsToken) && $evrakId > 0) {
    $smsHelperPath = __DIR__ . '/../../config/sms_helper.php';
    if (file_exists($smsHelperPath)) {
        require_once $smsHelperPath;
        if (!sms_evrak_token_dogrula($smsToken, $evrakId)) {
            header('Content-Type: application/json');
            json_error('EVRAK LİNKİ GEÇERSİZ VEYA SÜRESİ DOLMUŞ', 403);
        }
    } else {
        header('Content-Type: application/json');
        json_error('SMS TOKEN DOĞRULAMA MODÜLÜ BULUNAMADI', 500);
    }
} else {
    // Normal auth ile erişim
    $user = auth_required();
}

if (!$evrakId) {
    header('Content-Type: application/json');
    json_error('Evrak ID gerekli', 422);
}

$db = getDB();
$stmt = $db->prepare('SELECT * FROM evraklar WHERE id = ?');
$stmt->execute([$evrakId]);
$evrak = $stmt->fetch();

if (!$evrak) {
    header('Content-Type: application/json');
    json_error('Evrak bulunamadı (ID: ' . $evrakId . ')', 404);
}

// Dosya yolunu bul - birden fazla alternatif dene
$dosyaYolu = $evrak['dosya_yolu'];
$filePath = null;

// Denenecek yollar listesi
$denenecekYollar = [
    UPLOAD_DIR . $dosyaYolu,
    $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $dosyaYolu,
    dirname($_SERVER['DOCUMENT_ROOT']) . '/uploads/' . $dosyaYolu,
    realpath(UPLOAD_DIR) ? realpath(UPLOAD_DIR) . '/' . $dosyaYolu : null,
];

// Eğer UPLOAD_DIR sonunda / yoksa ekle
if (substr(UPLOAD_DIR, -1) !== '/') {
    array_unshift($denenecekYollar, UPLOAD_DIR . '/' . $dosyaYolu);
}

foreach ($denenecekYollar as $yol) {
    if ($yol && file_exists($yol) && is_file($yol)) {
        $filePath = $yol;
        break;
    }
}

if (!$filePath) {
    header('Content-Type: application/json');
    // Admin kullanıcılara debug bilgisi göster
    $debug = '';
    if (isset($user) && isset($user['rol']) && $user['rol'] === 'admin') {
        $debug = ' | UPLOAD_DIR: ' . UPLOAD_DIR . ' | dosya_yolu: ' . $dosyaYolu . ' | Denenen: ' . UPLOAD_DIR . $dosyaYolu;
        if (is_dir(UPLOAD_DIR)) {
            $debug .= ' | uploads/ dizini MEVCUT';
        } else {
            $debug .= ' | uploads/ dizini YOK (' . UPLOAD_DIR . ')';
        }
    }
    json_error('Dosya sunucuda bulunamadı' . $debug, 404);
}

// Ön izleme modu (inline) veya indirme (attachment)
$mode = ($_GET['mode'] ?? 'attachment') === 'inline' ? 'inline' : 'attachment';

// MIME type - veritabanından veya dosyadan tespit
$mimeType = $evrak['mime_type'];
if (empty($mimeType) || $mimeType === 'application/octet-stream') {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($filePath) ?: 'application/pdf';
}

// LiteSpeed/Apache gzip sıkıştırmasını devre dışı bırak
// (sıkıştırılmış PDF blob olarak okunamaz)
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 'Off');

// Dosyayı gönder
header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $mode . '; filename="' . basename($evrak['dosya_adi']) . '"');
header('Content-Length: ' . filesize($filePath));
header('Content-Encoding: identity');
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: none');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

// Output buffer temizle (büyük dosyalar için)
if (ob_get_level()) {
    ob_end_clean();
}

readfile($filePath);
exit;
