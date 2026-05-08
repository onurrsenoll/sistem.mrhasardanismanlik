<?php
/**
 * DELETE /api/v1/yonlendirme/delete.php?id=1
 * Yönlendirme kaydı sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Yönlendirme ID gerekli', 422);

$stmt = $db->prepare('SELECT id, magdur_ad_soyad FROM yonlendirme WHERE id = ?');
$stmt->execute([$id]);
$kayit = $stmt->fetch();
if (!$kayit) json_error('Yönlendirme kaydı bulunamadı', 404);

try {
    $db->beginTransaction();

    // Önce notları sil
    $stmt = $db->prepare('DELETE FROM yonlendirme_notlar WHERE yonlendirme_id = ?');
    $stmt->execute([$id]);

    // Kaydı sil
    $stmt = $db->prepare('DELETE FROM yonlendirme WHERE id = ?');
    $stmt->execute([$id]);

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'yonlendirme_sil', "Yönlendirme silindi: {$kayit['magdur_ad_soyad']}", 'yonlendirme', $id);

json_success(null, 'Yönlendirme kaydı silindi');
