<?php
/**
 * DELETE /api/v1/evrak/delete.php?id=1
 * Evrak sil (sunucudan da siler)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Evrak ID gerekli', 422);

$stmt = $db->prepare('SELECT e.*, d.dosya_no FROM evraklar e LEFT JOIN dosyalar d ON d.id = e.dosya_id WHERE e.id = ?');
$stmt->execute([$id]);
$evrak = $stmt->fetch();
if (!$evrak) json_error('Evrak bulunamadı', 404);

// Sunucudan sil
$filePath = UPLOAD_DIR . $evrak['dosya_yolu'];
if (file_exists($filePath)) {
    unlink($filePath);
}

try {
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    $stmt = $db->prepare('DELETE FROM evraklar WHERE id = ?');
    $stmt->execute([$id]);
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
} catch (Exception $e) {
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'evrak_sil', "{$evrak['dosya_no']} - {$evrak['dosya_adi']}", 'evraklar', $id);

json_success(null, 'Evrak silindi');
