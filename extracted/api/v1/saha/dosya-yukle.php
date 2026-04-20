<?php
/**
 * POST /api/v1/saha/dosya-yukle.php
 * SAHA DOSYASINA MEDYA YÜKLE (GÖRSEL, PDF)
 * FormData ile çalışır (multipart/form-data)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'personel', 'uzman']);

// FormData ile gelen veriler
$saha_dosya_id = isset($_POST['saha_dosya_id']) ? (int)$_POST['saha_dosya_id'] : 0;
$aciklama = isset($_POST['aciklama']) ? clean($_POST['aciklama']) : '';

if ($saha_dosya_id <= 0) {
    json_error('SAHA DOSYA ID GEREKLİ', 400);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    json_error('DOSYA YÜKLENEMEDİ', 400);
}

$db = getDB();

// Saha dosyasının varlığını kontrol et
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$saha_dosya_id]);
$sahaDosya = $stmt->fetch();

if (!$sahaDosya) {
    json_error('SAHA DOSYASI BULUNAMADI', 404);
}

// Personel sadece kendi dosyasına yükleyebilir
if ($user['rol'] === 'personel' && (int)$sahaDosya['personel_id'] !== (int)$user['id']) {
    json_error('BU DOSYAYA YÜKLEME YETKİNİZ YOK', 403);
}

$file = $_FILES['file'];
$dosya_boyutu = $file['size'];
$mime_type = $file['type'];
$tmp_path = $file['tmp_name'];
$orijinal_dosya_adi = $file['name'];

// Dosya boyutu kontrolü (512MB)
if ($dosya_boyutu > MAX_FILE_SIZE) {
    json_error('DOSYA BOYUTU ÇOK BÜYÜK (MAX 512MB)', 400);
}

// Dosya tipi kontrolü
if (!in_array($mime_type, ALLOWED_TYPES)) {
    json_error('GEÇERSİZ DOSYA TİPİ. SADECE PDF VE RESİMLER YÜKLENEBİLİR', 400);
}

// Medya türünü belirle
$medya_turu = 'diger';
if (strpos($mime_type, 'image/') === 0) {
    $medya_turu = 'gorsel';
} elseif ($mime_type === 'application/pdf') {
    $medya_turu = 'pdf';
}

try {
    // Yıl/Ay klasörü oluştur
    $yil = date('Y');
    $ay = date('m');
    $yuklemeDizini = UPLOAD_DIR . "saha/{$yil}/{$ay}/";

    if (!is_dir($yuklemeDizini)) {
        mkdir($yuklemeDizini, 0755, true);
    }

    // Benzersiz dosya adı oluştur
    $uzanti = pathinfo($orijinal_dosya_adi, PATHINFO_EXTENSION);
    $sunucu_adi = 'saha_' . $saha_dosya_id . '_' . uniqid() . '.' . $uzanti;
    $hedef_yol = $yuklemeDizini . $sunucu_adi;
    $db_yolu = "saha/{$yil}/{$ay}/" . $sunucu_adi;

    // Dosyayı taşı
    if (!move_uploaded_file($tmp_path, $hedef_yol)) {
        json_error('DOSYA SUNUCUYA KAYDEDİLEMEDİ', 500);
    }

    // Veritabanına kaydet
    $stmt = $db->prepare("INSERT INTO saha_dosya_medya
        (saha_dosya_id, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, medya_turu, aciklama, kullanici_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

    $stmt->execute([
        $saha_dosya_id,
        $orijinal_dosya_adi,
        $sunucu_adi,
        $db_yolu,
        $dosya_boyutu,
        $mime_type,
        $medya_turu,
        $aciklama,
        $user['id']
    ]);

    $medya_id = (int)$db->lastInsertId();

    log_action($user['id'], 'saha_dosya_yukle', "Saha dosyasına medya yüklendi: {$orijinal_dosya_adi}", 'saha_dosya_medya', $medya_id);

    json_success([
        'id' => $medya_id,
        'dosya_adi' => $orijinal_dosya_adi,
        'dosya_yolu' => $db_yolu,
        'medya_turu' => $medya_turu
    ], 'DOSYA BAŞARIYLA YÜKLENDİ', 201);

} catch (\Exception $e) {
    // Hata durumunda dosyayı sil
    if (isset($hedef_yol) && file_exists($hedef_yol)) {
        unlink($hedef_yol);
    }
    json_error('DOSYA YÜKLEME HATASI: ' . $e->getMessage(), 500);
}
