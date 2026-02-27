<?php
/**
 * GET /api/v1/evrak/download.php?id=1
 * Evrak indir / önizle (PDF, resim vb.)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers (dosya stream ettiği için setup_headers kullanmıyoruz)
$origin = isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== '' ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($origin !== '*') {
    header('Access-Control-Allow-Credentials: true');
}

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
$sunucuAdi = $evrak['sunucu_adi'] ?? '';
$filePath = null;

// dosya_yolu başında uploads/ varsa temizle
if (strpos($dosyaYolu, 'uploads/') === 0) {
    $dosyaYolu = substr($dosyaYolu, 8);
}

// UPLOAD_DIR'ı normalize et (sonunda / olsun)
$uploadBase = rtrim(UPLOAD_DIR, '/') . '/';

// Denenecek yollar listesi (en olası → en az olası)
$denenecekYollar = [
    $uploadBase . $dosyaYolu,
    $uploadBase . ltrim($dosyaYolu, '/'),
    $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $dosyaYolu,
    dirname($_SERVER['DOCUMENT_ROOT']) . '/uploads/' . $dosyaYolu,
];

// sunucu_adi ile de dene (farklı alt klasörlerde arama)
if ($sunucuAdi) {
    $yil = date('Y');
    $ay = date('m');
    $denenecekYollar[] = $uploadBase . $yil . '/' . $ay . '/' . $sunucuAdi;
    // dosya_yolu'ndan yıl/ay çıkar
    if (preg_match('#(\d{4})/(\d{2})/#', $dosyaYolu, $ym)) {
        $denenecekYollar[] = $uploadBase . $ym[1] . '/' . $ym[2] . '/' . $sunucuAdi;
    }
    // Doğrudan uploads altında
    $denenecekYollar[] = $uploadBase . $sunucuAdi;
}

// realpath ile de dene
$realUpload = realpath(UPLOAD_DIR);
if ($realUpload) {
    $denenecekYollar[] = $realUpload . '/' . $dosyaYolu;
    $denenecekYollar[] = $realUpload . '/' . ltrim($dosyaYolu, '/');
}

foreach ($denenecekYollar as $yol) {
    if ($yol && file_exists($yol) && is_file($yol)) {
        $filePath = $yol;
        break;
    }
}

if (!$filePath) {
    header('Content-Type: application/json');
    $debug = '';
    if (isset($user) && isset($user['rol']) && $user['rol'] === 'admin') {
        $debug = ' | UPLOAD_DIR: ' . UPLOAD_DIR . ' | dosya_yolu: ' . $dosyaYolu;
        $debug .= ' | Denenen: ' . $uploadBase . $dosyaYolu;
        $debug .= is_dir(UPLOAD_DIR) ? ' | uploads/ dizini MEVCUT' : ' | uploads/ dizini YOK';
        // Klasör içeriğini kontrol et
        if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $subDir)) {
            $subPath = $uploadBase . $subDir[1];
            if (is_dir($subPath)) {
                $files = scandir($subPath);
                $debug .= ' | Klasördeki dosyalar(' . count($files) . '): ' . implode(', ', array_slice(array_diff($files, ['.', '..']), 0, 5));
            } else {
                $debug .= ' | Alt klasör YOK: ' . $subPath;
            }
        }
    }
    json_error('Dosya sunucuda bulunamadı' . $debug, 404);
}

// Session kilidi varsa serbest bırak (indirme sırasında diğer istekler bloklanmasın)
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

// Ön izleme modu (inline) veya indirme (attachment)
$mode = ($_GET['mode'] ?? 'attachment') === 'inline' ? 'inline' : 'attachment';

// MIME type - veritabanından veya dosyadan tespit
$mimeType = $evrak['mime_type'] ?? '';
if (empty($mimeType) || $mimeType === 'application/octet-stream') {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($filePath) ?: 'application/pdf';
}

$fileSize = filesize($filePath);

// TÜM output bufferları temizle (PHP include'lardan kalan whitespace kirliliğini önle)
while (ob_get_level() > 0) {
    ob_end_clean();
}

// LiteSpeed/Apache/Nginx gzip sıkıştırmasını devre dışı bırak
// (sıkıştırılmış PDF/resim blob olarak okunamaz, bozuk dosya indirilir)
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 'Off');
@ini_set('output_buffering', 'Off');

// Önceki headerları temizle (varsa Content-Type: application/json gibi)
if (function_exists('header_remove')) {
    header_remove('Content-Encoding');
}

// Dosya adını güvenli hale getir (UTF-8 ve ASCII fallback)
$dosyaAdi = $evrak['dosya_adi'] ?? ('evrak_' . $evrakId . '.pdf');
$asciiAdi = preg_replace('/[^\x20-\x7E]/', '_', $dosyaAdi);
$utf8Adi = rawurlencode($dosyaAdi);

// Dosyayı gönder
header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $mode . '; filename="' . $asciiAdi . '"; filename*=UTF-8\'\'' . $utf8Adi);
header('Content-Length: ' . $fileSize);
header('Content-Transfer-Encoding: binary');
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: bytes');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Büyük dosyalar için chunk'lı okuma (bellek taşmasını önle)
if ($fileSize > 5 * 1024 * 1024) {
    $handle = fopen($filePath, 'rb');
    if ($handle) {
        while (!feof($handle)) {
            echo fread($handle, 8192);
            flush();
        }
        fclose($handle);
    } else {
        readfile($filePath);
    }
} else {
    readfile($filePath);
}
exit;
