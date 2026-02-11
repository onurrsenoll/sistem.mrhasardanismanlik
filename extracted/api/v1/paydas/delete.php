<?php
/**
 * DELETE /api/v1/paydas/delete.php?id=1
 * Paydaş sil (sadece admin) — soft delete (durum=pasif)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Paydaş ID gerekli', 422);

$stmt = $db->prepare('SELECT id, ad FROM paydaslar WHERE id = ?');
$stmt->execute([$id]);
$paydas = $stmt->fetch();
if (!$paydas) json_error('Paydaş bulunamadı', 404);

// Soft delete — durumu pasif yap
$stmt = $db->prepare("UPDATE paydaslar SET durum = 'pasif' WHERE id = ?");
$stmt->execute([$id]);

log_action($user['id'], 'paydas_sil', "Paydaş pasife alındı: {$paydas['ad']}", 'paydaslar', $id);

json_success(['id' => $id], 'Paydaş pasife alındı');
