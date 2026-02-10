<?php
/**
 * DELETE /api/v1/ajanda/delete.php?id=1
 * Ajanda/görev sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Görev ID gerekli', 422);

$stmt = $db->prepare('SELECT id, baslik FROM ajanda WHERE id = ? AND kullanici_id = ?');
$stmt->execute([$id, $user['id']]);
$gorev = $stmt->fetch();
if (!$gorev) json_error('Görev bulunamadı', 404);

$stmt = $db->prepare('DELETE FROM ajanda WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'ajanda_sil', $gorev['baslik'], 'ajanda', $id);

json_success(null, 'Görev silindi');
