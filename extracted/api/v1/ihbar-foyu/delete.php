<?php
/**
 * DELETE /api/v1/ihbar-foyu/delete.php?id=1
 * İhbar Föyü + parçaları sil (audit için log_action kaydı düşer)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin','uzman','avukat','personel','muhasebe']);
$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID GEREKLİ', 422);

$db = getDB();
ensure_ihbar_foyu_tables();

$stmt = $db->prepare('SELECT id, plaka, sahip_ad, kullanici_id FROM hasar_ihbar WHERE id = ?');
$stmt->execute([$id]);
$k = $stmt->fetch();
if (!$k) json_error('KAYIT BULUNAMADI', 404);

// Yetki: admin/uzman her şeyi; diğerleri kendilerinin
if (!in_array($user['rol'], ['admin','uzman'], true)
    && (int)$k['kullanici_id'] !== (int)$user['id']) {
    json_error('BU KAYIT İÇİN YETKİNİZ YOK', 403);
}

try {
    $db->beginTransaction();
    $db->prepare('DELETE FROM hasar_ihbar_parcalar WHERE ihbar_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM hasar_ihbar WHERE id = ?')->execute([$id]);
    $db->commit();

    log_action($user['id'], 'ihbar_foyu_delete', "İhbar föyü silindi: {$k['plaka']} - {$k['sahip_ad']}", 'hasar_ihbar', $id);
    json_success(null, 'İHBAR FÖYÜ SİLİNDİ');
} catch (\Exception $e) {
    $db->rollBack();
    json_error('SİLME HATASI: ' . $e->getMessage(), 500);
}
