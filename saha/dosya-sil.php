<?php
/**
 * DELETE /api/v1/saha/dosya-sil.php?id=X
 * SAHA MEDYA DOSYASINI SİL
 * Admin veya yükleyen personel silebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin', 'personel', 'uzman']);

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    json_error('MEDYA ID GEREKLİ', 400);
}

$db = getDB();

// Medya kaydını getir
$stmt = $db->prepare("SELECT m.*, s.personel_id
    FROM saha_dosya_medya m
    JOIN saha_dosyalar s ON s.id = m.saha_dosya_id
    WHERE m.id = ?");
$stmt->execute([$id]);
$medya = $stmt->fetch();

if (!$medya) {
    json_error('MEDYA BULUNAMADI', 404);
}

// Yetki kontrolü: Admin veya yükleyen personel silebilir
if ($user['rol'] !== 'admin' && (int)$medya['kullanici_id'] !== (int)$user['id']) {
    json_error('BU DOSYAYI SİLME YETKİNİZ YOK', 403);
}

try {
    // Fiziksel dosyayı sil
    $dosya_tam_yol = UPLOAD_DIR . $medya['dosya_yolu'];
    if (file_exists($dosya_tam_yol)) {
        unlink($dosya_tam_yol);
    }

    // Veritabanından sil
    $stmt = $db->prepare("DELETE FROM saha_dosya_medya WHERE id = ?");
    $stmt->execute([$id]);

    log_action($user['id'], 'saha_dosya_sil', "Saha medya dosyası silindi: {$medya['dosya_adi']}", 'saha_dosya_medya', $id);

    json_success(null, 'DOSYA BAŞARIYLA SİLİNDİ');

} catch (\Exception $e) {
    json_error('DOSYA SİLME HATASI: ' . $e->getMessage(), 500);
}
