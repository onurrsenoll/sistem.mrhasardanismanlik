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
    $db->beginTransaction();
    // İlişkili kayıtları önce sil
    $stmt = $db->prepare('DELETE FROM crm_notlari WHERE crm_id = ?');
    $stmt->execute([$id]);
    try {
        $stmt = $db->prepare('DELETE FROM crm_ekler WHERE crm_id = ?');
        $stmt->execute([$id]);
    } catch (Exception $e2) { /* crm_ekler tablosu yoksa devam et */ }
    $stmt = $db->prepare('DELETE FROM crm WHERE id = ?');
    $stmt->execute([$id]);
    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'crm_sil', "CRM silindi: {$crm['ad_soyad']}", 'crm', $id);

json_success(null, 'CRM kaydı silindi');
