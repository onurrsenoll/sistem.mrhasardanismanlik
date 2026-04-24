<?php
/**
 * POST /api/v1/sozlesme/logo_upload.php
 * Logo yükle (multipart/form-data)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$db = getDB();

if (empty($_FILES['logo'])) json_error('Logo dosyası gerekli', 400);

$file = $_FILES['logo'];
$maxSize = 2 * 1024 * 1024; // 2MB
if ($file['size'] > $maxSize) json_error('Logo dosyası 2MB\'dan büyük olamaz', 400);

$allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
if (!in_array($file['type'], $allowed)) json_error('Sadece PNG, JPG veya SVG dosyaları yüklenebilir', 400);

// Klasör oluştur
$uploadDir = __DIR__ . '/../../../uploads/sozlesme-logo/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// Eski logoyu sil
$stmt = $db->query('SELECT logo_path FROM mr_sozlesme_ayarlar WHERE id = 1');
$mevcut = $stmt->fetch();
if ($mevcut && $mevcut['logo_path'] && file_exists(__DIR__ . '/../../../' . $mevcut['logo_path'])) {
    unlink(__DIR__ . '/../../../' . $mevcut['logo_path']);
}

// Yeni logo kaydet
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$fileName = 'mr-logo-' . time() . '.' . $ext;
$filePath = $uploadDir . $fileName;
$dbPath = 'uploads/sozlesme-logo/' . $fileName;

if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    json_error('Logo yüklenemedi', 500);
}

$db->prepare('UPDATE mr_sozlesme_ayarlar SET logo_path = ? WHERE id = 1')->execute([$dbPath]);

log_action($user['id'], 'sozlesme_logo', "Logo güncellendi: $fileName", 'mr_sozlesme_ayarlar', 1);
json_success(['logo_path' => $dbPath], 'Logo yüklendi');
