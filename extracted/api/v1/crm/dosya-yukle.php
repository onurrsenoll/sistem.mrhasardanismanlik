<?php
/**
 * POST /api/v1/crm/dosya-yukle.php
 * CRM kaydına dosya/ses/fotoğraf yükleme
 * FormData: crm_id, tur (dosya|ses|foto), file
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);

$crm_id = (int)($_POST['crm_id'] ?? 0);
$tur = clean($_POST['tur'] ?? 'dosya');

if (!$crm_id) json_error('CRM ID gerekli', 422);
if (!isset($_FILES['file'])) json_error('Dosya bulunamadı', 422);

$db = getDB();

// CRM kaydı kontrol
$stmt = $db->prepare('SELECT id FROM crm WHERE id = ?');
$stmt->execute([$crm_id]);
if (!$stmt->fetch()) json_error('CRM kaydı bulunamadı', 404);

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) json_error('Dosya yükleme hatası', 500);

// Dosya boyutu kontrolü (MAX_FILE_SIZE sistem sabiti = 512MB)
if ($file['size'] > MAX_FILE_SIZE) json_error('Dosya boyutu çok büyük (max ' . round(MAX_FILE_SIZE / 1024 / 1024) . 'MB)', 422);

// Güvenli dosya adı
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'webm', 'mp3', 'wav', 'ogg', 'm4a', 'mp4', 'zip', 'rar'];
if (!in_array($ext, $allowedExts)) json_error('Desteklenmeyen dosya formatı', 422);

$uuid = bin2hex(random_bytes(16));
$serverName = $uuid . '.' . $ext;
$uploadDir = __DIR__ . '/../../../uploads/crm/';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$targetPath = $uploadDir . $serverName;
if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    json_error('Dosya kaydedilemedi', 500);
}

// CRM ekler tablosuna kaydet
$stmt = $db->prepare('INSERT INTO crm_ekler (crm_id, tur, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $crm_id,
    $tur,
    $file['name'],
    $serverName,
    'uploads/crm/' . $serverName,
    $file['size'],
    $file['type'] ?: 'application/octet-stream',
    $user['id']
]);

$id = (int)$db->lastInsertId();
log_action($user['id'], 'crm_dosya_yukle', "CRM #{$crm_id} - {$tur}: {$file['name']}", 'crm_ekler', $id);

json_success(['id' => $id, 'dosya_adi' => $file['name']], 'Dosya yüklendi', 201);
