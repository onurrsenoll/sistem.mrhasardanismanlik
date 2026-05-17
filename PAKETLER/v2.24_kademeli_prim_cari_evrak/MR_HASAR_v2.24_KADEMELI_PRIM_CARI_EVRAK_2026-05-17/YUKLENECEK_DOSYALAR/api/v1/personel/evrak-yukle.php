<?php
/**
 * POST /api/v1/personel/evrak-yukle.php  (multipart/form-data)
 *
 * v2.24 — Personel özlük evrakı yükleme (sözleşme, kimlik, sgk, diploma, vb.)
 *
 * Form alanları:
 *   personel_id     : int (zorunlu)
 *   evrak_turu      : string (zorunlu) — sozlesme/kimlik/sgk/diploma/ehliyet/...
 *   evrak_etiketi   : string (opsiyonel)
 *   dosya           : file  (zorunlu) — pdf/jpg/jpeg/png, max 10 MB
 *
 * Dosya, /uploads/personel_evraklari/<personel_id>/ altına benzersiz adla kaydedilir.
 * Veritabanına personel_evraklari tablosuna işlenir.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required();
$db = getDB();

$personelId = (int)($_POST['personel_id'] ?? 0);
$evrakTuru  = trim((string)($_POST['evrak_turu'] ?? ''));
$evrakEtkt  = trim((string)($_POST['evrak_etiketi'] ?? ''));

if (!$personelId)          json_error('personel_id zorunlu', 422);
if ($evrakTuru === '')     json_error('evrak_turu zorunlu', 422);
if (empty($_FILES['dosya'])) json_error('dosya zorunlu', 422);

$f = $_FILES['dosya'];
if (!is_uploaded_file($f['tmp_name'])) json_error('Geçersiz yükleme', 422);
if ($f['error'] !== UPLOAD_ERR_OK)     json_error('Yükleme hatası: ' . $f['error'], 422);
if ($f['size'] > 10 * 1024 * 1024)     json_error('Maksimum 10 MB', 422);

/* Personel doğrula */
$stmt = $db->prepare('SELECT id, ad_soyad FROM personel WHERE id = ?');
$stmt->execute([$personelId]);
$p = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$p) json_error('Personel bulunamadı', 404);

/* Güvenli uzantı listesi */
$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
$izinli = ['pdf','jpg','jpeg','png','webp','docx','doc','xlsx'];
if (!in_array($ext, $izinli, true)) json_error('İzin verilmeyen dosya tipi: .' . $ext, 422);

/* MIME doğrula */
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = $finfo ? finfo_file($finfo, $f['tmp_name']) : '';
if ($finfo) finfo_close($finfo);

/* Yükleme klasörü */
$publicRoot = realpath(__DIR__ . '/../../../');  // /api/v1/personel → 3 yukarı = web root
if (!$publicRoot) $publicRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/../../..';
$baseDir = rtrim($publicRoot, '/') . '/uploads/personel_evraklari/' . $personelId;
if (!is_dir($baseDir) && !@mkdir($baseDir, 0775, true)) {
    json_error('Klasör oluşturulamadı: ' . $baseDir, 500);
}

$safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $f['name']);
$sunucuAd = $personelId . '_' . $evrakTuru . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$tamYol = $baseDir . '/' . $sunucuAd;

if (!move_uploaded_file($f['tmp_name'], $tamYol)) {
    json_error('Dosya kaydedilemedi', 500);
}

/* Göreceli web yolu (URL ile erişim için) */
$webYol = '/uploads/personel_evraklari/' . $personelId . '/' . $sunucuAd;

$stmt = $db->prepare('
    INSERT INTO personel_evraklari
      (personel_id, evrak_turu, evrak_etiketi, dosya_adi, sunucu_adi, dosya_yolu,
       mime_type, dosya_boyutu, yukleyen_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->execute([
    $personelId, $evrakTuru, ($evrakEtkt !== '' ? $evrakEtkt : null),
    $safeName, $sunucuAd, $webYol, $mime, (int)$f['size'], (int)($user['id'] ?? 0)
]);
$id = (int)$db->lastInsertId();

json_success([
    'id' => $id,
    'mesaj' => 'Evrak yüklendi',
    'dosya_yolu' => $webYol,
    'dosya_adi'  => $safeName,
    'boyut'      => (int)$f['size'],
]);
