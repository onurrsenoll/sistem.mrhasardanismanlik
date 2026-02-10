<?php
/**
 * DELETE /api/v1/bildirim/delete.php?id=1
 * Bildirim sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Bildirim ID gerekli', 422);

$stmt = $db->prepare('DELETE FROM bildirimler WHERE id = ? AND alici_id = ?');
$stmt->execute([$id, $user['id']]);

if ($stmt->rowCount() === 0) {
    json_error('Bildirim bulunamadı', 404);
}

json_success(null, 'Bildirim silindi');
