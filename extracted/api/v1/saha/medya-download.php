<?php
/**
 * GET /api/v1/saha/medya-download.php?id=X
 * SAHA DOSYA MEDYA İNDİR / ÖNİZLE
 * ?mode=inline → tarayıcıda göster (önizleme)
 * ?mode=attachment → dosya indir (varsayılan)
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

require_once __DIR__ . '/../../config/database.php';

$user = auth_required(['admin', 'muhasebe', 'uzman', 'personel', 'avukat']);

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Content-Type: application/json');
    json_error('GEÇERSİZ ID', 400);
}

$mode = ($_GET['mode'] ?? 'attachment') === 'inline' ? 'inline' : 'attachment';

$db = getDB();

$stmt = $db->prepare("SELECT m.*, s.personel_id FROM saha_dosya_medya m JOIN saha_dosyalar s ON s.id = m.saha_dosya_id WHERE m.id = ?");
$stmt->execute([$id]);
$medya = $stmt->fetch();

if (!$medya) {
    header('Content-Type: application/json');
    json_error('MEDYA BULUNAMADI', 404);
}

// Personel sadece kendi dosyasını görebilir
if ($user['rol'] === 'personel' && (int)$medya['personel_id'] !== (int)$user['id']) {
    header('Content-Type: application/json');
    json_error('BU DOSYAYI GÖRME YETKİNİZ YOK', 403);
}

// Dosya yolunu bul - birden fazla alternatif dene
$dosyaYolu = $medya['dosya_yolu'];
$sunucuAdi = $medya['sunucu_adi'] ?? '';
$filePath = null;

// dosya_yolu başında uploads/ varsa temizle
if (strpos($dosyaYolu, 'uploads/') === 0) {
    $dosyaYolu = substr($dosyaYolu, 8);
}

$uploadBase = rtrim(UPLOAD_DIR, '/') . '/';

$denenecekYollar = [
    $uploadBase . $dosyaYolu,
    $uploadBase . ltrim($dosyaYolu, '/'),
    $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $dosyaYolu,
    dirname($_SERVER['DOCUMENT_ROOT']) . '/uploads/' . $dosyaYolu,
];

if ($sunucuAdi) {
    if (preg_match('#(\d{4})/(\d{2})/#', $dosyaYolu, $ym)) {
        $denenecekYollar[] = $uploadBase . $ym[1] . '/' . $ym[2] . '/' . $sunucuAdi;
    }
    $denenecekYollar[] = $uploadBase . $sunucuAdi;
    $denenecekYollar[] = $uploadBase . date('Y') . '/' . date('m') . '/' . $sunucuAdi;
}

$realUpload = realpath(UPLOAD_DIR);
if ($realUpload) {
    $denenecekYollar[] = $realUpload . '/' . $dosyaYolu;
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
    if ($user['rol'] === 'admin') {
        $debug = ' | UPLOAD_DIR: ' . UPLOAD_DIR . ' | dosya_yolu: ' . $dosyaYolu;
        if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $subDir)) {
            $subPath = $uploadBase . $subDir[1];
            if (is_dir($subPath)) {
                $files = scandir($subPath);
                $debug .= ' | Klasördeki dosyalar: ' . implode(', ', array_slice(array_diff($files, ['.', '..']), 0, 5));
            }
        }
    }
    json_error('DOSYA SUNUCUDA BULUNAMADI' . $debug, 404);
}

// MIME type - veritabanından veya dosyadan tespit
$mimeType = $medya['mime_type'];
if (empty($mimeType) || $mimeType === 'application/octet-stream') {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($filePath) ?: 'application/octet-stream';
}

$dosyaAdi = $medya['dosya_adi'] ?: 'dosya';

// LiteSpeed/Apache gzip sıkıştırmasını devre dışı bırak
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 'Off');

// Dosyayı gönder
header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $mode . '; filename="' . basename($dosyaAdi) . '"');
header('Content-Length: ' . filesize($filePath));
header('Content-Encoding: identity');
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: none');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

// Output buffer temizle
if (ob_get_level()) {
    ob_end_clean();
}

readfile($filePath);
exit;
