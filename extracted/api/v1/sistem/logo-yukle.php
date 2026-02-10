<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();

if ($user['rol'] !== 'admin') {
    json_error('YETKİSİZ İŞLEM', 403);
}

// Check if file was uploaded
if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    json_error('LOGO DOSYASI GEREKLİ');
}

$file = $_FILES['logo'];

// Max 2MB
$maxSize = 2 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    json_error('DOSYA BOYUTU EN FAZLA 2MB OLABİLİR');
}

// Allowed types
$allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    json_error('SADECE PNG, JPG VE SVG DOSYALARI KABUL EDİLİR');
}

// Determine extension
$extensions = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/svg+xml' => 'svg'
];
$ext = $extensions[$mimeType] ?? 'png';

// Create upload directory
$uploadDir = __DIR__ . '/../../../uploads/logo/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate filename
$filename = 'logo_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    json_error('DOSYA YÜKLEME HATASI');
}

// Update ayarlar
$db = getDB();
$logoUrl = 'uploads/logo/' . $filename;
$stmt = $db->prepare('UPDATE ayarlar SET deger = ? WHERE anahtar = ?');
$stmt->execute([$logoUrl, 'logo_url']);

log_islem($db, $user['id'], 'LOGO_YUKLE', 'Firma logosu güncellendi', 'SİSTEM', null);

json_success([
    'message' => 'LOGO BAŞARIYLA YÜKLENDİ',
    'logo_url' => $logoUrl
]);
