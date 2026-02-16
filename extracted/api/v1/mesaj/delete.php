<?php
/**
 * DELETE /api/v1/mesaj/delete.php?id=1
 * Mesaj sil (sadece gönderen veya alıcı silebilir)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Mesaj ID gerekli', 422);

// Mesaj kontrolü
$stmt = $db->prepare('SELECT id, gonderen_id, alici_id, konu FROM mesajlar WHERE id = ?');
$stmt->execute([$id]);
$mesaj = $stmt->fetch();

if (!$mesaj) json_error('Mesaj bulunamadı', 404);

// Sadece gönderen veya alıcı silebilir
if ($mesaj['gonderen_id'] != $user['id'] && $mesaj['alici_id'] != $user['id']) {
    json_error('Bu mesajı silme yetkiniz yok', 403);
}

try {
    $stmt = $db->prepare('DELETE FROM mesajlar WHERE id = ?');
    $stmt->execute([$id]);

    log_action($user['id'], 'mesaj_sil', "Mesaj silindi: {$mesaj['konu']}", 'mesajlar', $id);

    json_success(null, 'Mesaj silindi');

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
