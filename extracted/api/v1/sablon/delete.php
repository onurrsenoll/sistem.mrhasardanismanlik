<?php
/**
 * DELETE /api/v1/sablon/delete.php?id=1
 * Şablon sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Şablon ID gerekli', 422);

// Şablon kontrolü
$stmt = $db->prepare('SELECT id, ad FROM sablonlar WHERE id = ?');
$stmt->execute([$id]);
$sablon = $stmt->fetch();

if (!$sablon) json_error('Şablon bulunamadı', 404);

try {
    $stmt = $db->prepare('DELETE FROM sablonlar WHERE id = ?');
    $stmt->execute([$id]);

    log_action($user['id'], 'sablon_sil', "Şablon silindi: {$sablon['ad']}", 'sablonlar', $id);

    json_success(null, 'Şablon silindi');

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
