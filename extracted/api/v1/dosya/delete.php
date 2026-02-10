<?php
/**
 * DELETE /api/v1/dosya/delete.php?id=1
 * Dosya sil (CASCADE ile mağdur, araç, masraf, evrak da silinir)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Dosya ID gerekli', 422);

$stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
$stmt->execute([$id]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

// İlişkili evrak dosyalarını sunucudan sil
$stmt = $db->prepare('SELECT dosya_yolu FROM evraklar WHERE dosya_id = ?');
$stmt->execute([$id]);
$evraklar = $stmt->fetchAll();

foreach ($evraklar as $evrak) {
    $filePath = UPLOAD_DIR . $evrak['dosya_yolu'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }
}

// Dosyayı sil (FK constraint'leri geçici devre dışı)
try {
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    $stmt = $db->prepare('DELETE FROM dosyalar WHERE id = ?');
    $stmt->execute([$id]);
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
} catch (Exception $e) {
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'dosya_sil', "Dosya silindi: {$dosya['dosya_no']}", 'dosyalar', $id);

json_success(null, 'Dosya ve tüm ilişkili kayıtlar silindi');
