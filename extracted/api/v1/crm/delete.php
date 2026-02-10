<?php
/**
 * DELETE /api/v1/crm/delete.php?id=1
 * CRM kaydı sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('CRM ID gerekli', 422);

$stmt = $db->prepare('SELECT id, ad_soyad FROM crm WHERE id = ?');
$stmt->execute([$id]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);

try {
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    $stmt = $db->prepare('DELETE FROM crm WHERE id = ?');
    $stmt->execute([$id]);
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
} catch (Exception $e) {
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'crm_sil', "CRM silindi: {$crm['ad_soyad']}", 'crm', $id);

json_success(null, 'CRM kaydı silindi');
