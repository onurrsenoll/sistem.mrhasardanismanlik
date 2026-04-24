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
if (!isset($_FILES['sidebar_logo']) || $_FILES['sidebar_logo']['error'] !== UPLOAD_ERR_OK) {
    json_error('LOGO DOSYASI GEREKLİ');
}

$file = $_FILES['sidebar_logo'];

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
$filename = 'sidebar_logo_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    json_error('DOSYA YÜKLEME HATASI');
}

// Update ayarlar
$db = getDB();
$logoUrl = 'uploads/logo/' . $filename;

$db->exec("CREATE TABLE IF NOT EXISTS ayarlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anahtar VARCHAR(100) NOT NULL UNIQUE,
    deger TEXT,
    tip ENUM('text','number','color','json','image') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

$stmt = $db->prepare('INSERT INTO ayarlar (anahtar, deger, tip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE deger = VALUES(deger)');
$stmt->execute(['sidebar_logo_url', $logoUrl, 'image']);

log_action($user['id'], 'SIDEBAR_LOGO_YUKLE', 'Sidebar logosu güncellendi', 'SİSTEM', null);

json_success([
    'message' => 'SIDEBAR LOGO BAŞARIYLA YÜKLENDİ',
    'sidebar_logo_url' => $logoUrl
]);
