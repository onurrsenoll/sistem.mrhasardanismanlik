<?php
/**
 * DELETE /api/v1/police/delete.php?id=1
 * Poliçe sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Poliçe ID gerekli', 422);

$stmt = $db->prepare('SELECT id, police_no FROM policeler WHERE id = ?');
$stmt->execute([$id]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

$db->beginTransaction();
try {
    // Önce tahsilatları sil
    $stmt = $db->prepare('DELETE FROM police_tahsilatlar WHERE police_id = ?');
    $stmt->execute([$id]);

    // Poliçeyi sil
    $stmt = $db->prepare('DELETE FROM policeler WHERE id = ?');
    $stmt->execute([$id]);

    $db->commit();

    log_action($user['id'], 'police_sil', 'Poliçe silindi: ' . $police['police_no'], 'policeler', $id);

    json_success(null, 'Poliçe ve ilişkili tahsilatlar silindi');

} catch (Exception $e) {
    $db->rollBack();
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}
