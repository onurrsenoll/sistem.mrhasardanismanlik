<?php
/**
 * DELETE /api/v1/masraf/delete.php?id=1
 * Masraf sil (trigger ile kasa bakiyesi geri yüklenir)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Masraf ID gerekli', 422);

$stmt = $db->prepare('SELECT m.*, d.dosya_no FROM masraflar m LEFT JOIN dosyalar d ON d.id = m.dosya_id WHERE m.id = ?');
$stmt->execute([$id]);
$masraf = $stmt->fetch();
if (!$masraf) json_error('Masraf bulunamadı', 404);

try {
    $db->beginTransaction();

    // Bağlı paydaş komisyonu varsa onu da sil
    $paydasKomisyonId = $masraf['paydas_komisyon_id'] ?? null;
    if ($paydasKomisyonId) {
        try {
            $db->prepare('DELETE FROM paydas_komisyonlari WHERE id = ?')->execute([$paydasKomisyonId]);
        } catch (\Exception $e) {}
    }

    $db->exec("SET FOREIGN_KEY_CHECKS = 0");
    $stmt = $db->prepare('DELETE FROM masraflar WHERE id = ?');
    $stmt->execute([$id]);
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'masraf_sil', "{$masraf['dosya_no']} - {$masraf['masraf_kalemi']}: " . number_format($masraf['tutar'], 2) . " ₺", 'masraflar', $id);

json_success(null, 'Masraf silindi');
