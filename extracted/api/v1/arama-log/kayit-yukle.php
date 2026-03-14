<?php
/**
 * POST /api/v1/arama-log/kayit-yukle.php
 * Gorusme kaydi dosyasi yukle
 * Form: arama_log_id, file (audio/webm, audio/ogg, audio/mp4)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('POST');

$user = auth_required();

ensure_arama_log_table();

$logId = (int)($_POST['arama_log_id'] ?? 0);
if (!$logId) json_error('arama_log_id gerekli', 422);

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    json_error('Dosya yukleme hatasi', 400);
}

$db = getDB();

// Log kontrol
$stmt = $db->prepare('SELECT * FROM arama_loglari WHERE id = ?');
$stmt->execute([$logId]);
$log = $stmt->fetch();

if (!$log) json_error('Arama logu bulunamadi', 404);
if ($user['rol'] !== 'admin' && $log['kullanici_id'] != $user['id']) {
    json_error('Bu loga erisim yetkiniz yok', 403);
}

$file = $_FILES['file'];
$maxSize = 50 * 1024 * 1024; // 50MB
if ($file['size'] > $maxSize) {
    json_error('Dosya boyutu cok buyuk (max 50MB)', 413);
}

$allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'video/webm'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, $allowedTypes)) {
    json_error('Desteklenmeyen dosya tipi: ' . $mimeType, 415);
}

// Uzanti belirle
$ext = 'webm';
if (strpos($mimeType, 'ogg') !== false) $ext = 'ogg';
else if (strpos($mimeType, 'mp4') !== false) $ext = 'mp4';
else if (strpos($mimeType, 'mpeg') !== false) $ext = 'mp3';
else if (strpos($mimeType, 'wav') !== false) $ext = 'wav';

// Kayit dizini
$uploadDir = dirname(__DIR__, 3) . '/uploads/arama-kayitlari/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Dosya adi
$fileName = 'arama_' . $logId . '_' . date('Ymd_His') . '.' . $ext;
$filePath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    json_error('Dosya kaydedilemedi', 500);
}

// Veritabanini guncelle
$stmt = $db->prepare('UPDATE arama_loglari SET kayit_dosya = ?, kayit_boyut = ? WHERE id = ?');
$stmt->execute([$fileName, $file['size'], $logId]);

json_success([
    'id' => $logId,
    'kayit_dosya' => $fileName,
    'kayit_boyut' => $file['size']
], 'Gorusme kaydi yuklendi');
