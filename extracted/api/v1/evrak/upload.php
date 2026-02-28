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

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);

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

// MIME type kontrolü (PDF, resim, DOCX)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

if (!in_array($mimeType, ALLOWED_TYPES)) {
    json_error('Desteklenmeyen dosya türü. İzin verilenler: PDF, JPG, PNG, SVG, DOC, DOCX', 422);
}

// Dosya adı güvenliği
$orijinalAd = basename($file['name']);
$uuid = generate_uuid();
// Uzantıyı MIME type'a göre belirle
$extMap = [
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/svg+xml' => 'svg',
    'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
];
$ext = $extMap[$mimeType] ?? pathinfo($orijinalAd, PATHINFO_EXTENSION) ?: 'pdf';
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
    json_error('Dosya kaydedilemedi (move_uploaded_file başarısız). Hedef: ' . $uploadPath, 500);
}

// DOĞRULAMA: Dosya gerçekten disk'e yazıldı mı?
if (!file_exists($fullPath)) {
    json_error('Dosya taşındı ama disk\'te bulunamadı! Yol: ' . $fullPath, 500);
}
$gercekBoyut = filesize($fullPath);
if ($gercekBoyut === 0) {
    @unlink($fullPath);
    json_error('Dosya 0 byte olarak kaydedildi, silindi. Tekrar deneyin.', 500);
}

// Veritabanına kaydet — DİSKTEKİ GERÇEK DOSYA ADIYLA
$stmt = $db->prepare('INSERT INTO evraklar (dosya_id, evrak_turu, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $dosyaId,
    $evrakTuru,
    $orijinalAd,
    $sunucuAdi,
    "$yil/$ay/$sunucuAdi",
    $gercekBoyut,  // disk'teki gerçek boyut
    $mimeType,
    $user['id']
]);

$evrakId = (int)$db->lastInsertId();

// İKİNCİ DOĞRULAMA: DB'ye yazılan sunucu_adi ile diskteki dosya eşleşiyor mu?
$stmtVerify = $db->prepare('SELECT sunucu_adi, dosya_yolu FROM evraklar WHERE id = ?');
$stmtVerify->execute([$evrakId]);
$kayit = $stmtVerify->fetch();
$beklenenYol = $uploadPath . ($kayit['sunucu_adi'] ?? '');
if (!file_exists($beklenenYol)) {
    // DB-disk uyumsuzluğu oluşmuş, düzelt
    $gercekDosyalar = array_diff(scandir($uploadPath), ['.', '..']);
    foreach ($gercekDosyalar as $gd) {
        $gdPath = $uploadPath . $gd;
        if (is_file($gdPath) && filesize($gdPath) === $gercekBoyut) {
            $db->prepare('UPDATE evraklar SET sunucu_adi = ?, dosya_yolu = ? WHERE id = ?')
               ->execute([$gd, "$yil/$ay/$gd", $evrakId]);
            $sunucuAdi = $gd;
            break;
        }
    }
}

log_action($user['id'], 'evrak_yukle', "{$dosya['dosya_no']} - $orijinalAd ($evrakTuru)", 'evraklar', $evrakId);

json_success([
    'evrak_id'  => $evrakId,
    'dosya_adi' => $orijinalAd,
    'boyut'     => $file['size']
], 'Evrak başarıyla yüklendi', 201);
