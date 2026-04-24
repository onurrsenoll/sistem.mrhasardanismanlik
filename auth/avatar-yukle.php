<?php
/**
 * POST /api/v1/auth/avatar-yukle.php
 * Kullanıcı kendi profil resmini yükler
 * FormData: { avatar: File }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();

// DOSYA KONTROLÜ
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    json_error('PROFİL RESMİ DOSYASI GEREKLİ');
}

$file = $_FILES['avatar'];

// MAX 2MB
$maxSize = 2 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    json_error('DOSYA BOYUTU EN FAZLA 2MB OLABİLİR');
}

// İZİN VERİLEN TÜRLER
$allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    json_error('SADECE PNG, JPG VE WEBP DOSYALARI KABUL EDİLİR');
}

// UZANTI BELİRLE
$extensions = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/webp' => 'webp'
];
$ext = $extensions[$mimeType] ?? 'jpg';

// YÜKLEME DİZİNİ OLUŞTUR
$uploadDir = __DIR__ . '/../../../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// ESKİ AVATAR DOSYASINI SİL
$db = getDB();
$stmt = $db->prepare('SELECT avatar FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$current = $stmt->fetch();
if ($current && $current['avatar']) {
    $oldFile = __DIR__ . '/../../../' . $current['avatar'];
    if (file_exists($oldFile)) {
        @unlink($oldFile);
    }
}

// DOSYA ADI OLUŞTUR
$filename = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

// DOSYAYI TAŞI
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    json_error('DOSYA YÜKLEME HATASI');
}

// VERİTABANI GÜNCELLE
$avatarUrl = 'uploads/avatars/' . $filename;
$stmt = $db->prepare('UPDATE users SET avatar = ? WHERE id = ?');
$stmt->execute([$avatarUrl, $user['id']]);

log_action($user['id'], 'avatar_yukle', 'Profil resmi güncellendi', 'users', $user['id']);

json_success([
    'avatar_url' => $avatarUrl
], 'PROFİL RESMİ BAŞARIYLA YÜKLENDİ');
