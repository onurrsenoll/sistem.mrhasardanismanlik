<?php
/**
 * DELETE /api/v1/servis/delete.php?id=1
 * Servis sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Servis ID gerekli', 422);

$stmt = $db->prepare('SELECT id, firma_adi FROM servisler WHERE id = ?');
$stmt->execute([$id]);
$servis = $stmt->fetch();
if (!$servis) json_error('Servis bulunamadı', 404);

// Servisi sil
$stmt = $db->prepare('DELETE FROM servisler WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'servis_sil', "Servis silindi: {$servis['firma_adi']}", 'servisler', $id);

json_success(null, 'Servis ve ilişkili kayıtlar silindi');
