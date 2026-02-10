<?php
/**
 * POST /api/v1/evrak/upload.php
 * PDF evrak yükle
 * 
 * Form Data: dosya_id, evrak_turu, file (PDF)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);

// Form data kontrolü
$dosyaId  = (int)($_POST['dosya_id'] ?? 0);
$evrakTuru = clean($_POST['evrak_turu'] ?? 'Diğer');

if (!$dosyaId) json_error('dosya_id gerekli', 422);

// Dosya var mı
$db = getDB();
$stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

// Dosya yüklendi mi
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'Dosya çok büyük (PHP limiti)',
        UPLOAD_ERR_FORM_SIZE  => 'Dosya çok büyük (form limiti)',
        UPLOAD_ERR_PARTIAL    => 'Dosya yarım yüklendi',
        UPLOAD_ERR_NO_FILE    => 'Dosya seçilmedi',
        UPLOAD_ERR_NO_TMP_DIR => 'Geçici klasör bulunamadı',
        UPLOAD_ERR_CANT_WRITE => 'Diske yazılamadı',
    ];
    $errCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    json_error($errors[$errCode] ?? 'Dosya yükleme hatası', 422);
}

$file = $_FILES['file'];

// Boyut kontrolü
if ($file['size'] > MAX_FILE_SIZE) {
    json_error('Dosya boyutu en fazla 20MB olabilir', 422);
}

// MIME type kontrolü (sadece PDF)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, ALLOWED_TYPES)) {
    json_error('Sadece PDF dosya yüklenebilir', 422);
}

// Dosya adı güvenliği
$orijinalAd = basename($file['name']);
$uuid = generate_uuid();
$ext = 'pdf';
$sunucuAdi = $uuid . '.' . $ext;

// Klasör oluştur: uploads/2025/01/
$yil = date('Y');
$ay  = date('m');
$uploadPath = UPLOAD_DIR . "$yil/$ay/";

if (!is_dir($uploadPath)) {
    mkdir($uploadPath, 0755, true);
}

$fullPath = $uploadPath . $sunucuAdi;

// Dosyayı taşı
if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
    json_error('Dosya kaydedilemedi', 500);
}

// Veritabanına kaydet
$stmt = $db->prepare('INSERT INTO evraklar (dosya_id, evrak_turu, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $dosyaId,
    $evrakTuru,
    $orijinalAd,
    $sunucuAdi,
    "$yil/$ay/$sunucuAdi",
    $file['size'],
    $mimeType,
    $user['id']
]);

$evrakId = (int)$db->lastInsertId();

log_action($user['id'], 'evrak_yukle', "{$dosya['dosya_no']} - $orijinalAd ($evrakTuru)", 'evraklar', $evrakId);

json_success([
    'evrak_id'  => $evrakId,
    'dosya_adi' => $orijinalAd,
    'boyut'     => $file['size']
], 'Evrak başarıyla yüklendi', 201);
