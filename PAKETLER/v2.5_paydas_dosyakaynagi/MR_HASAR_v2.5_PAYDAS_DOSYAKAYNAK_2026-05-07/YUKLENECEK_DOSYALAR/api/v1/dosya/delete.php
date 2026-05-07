<?php
/**
 * DELETE /api/v1/dosya/delete.php?id=1
 * v2.1: SOFT DELETE — Dosya `silindi=1` olarak işaretlenir.
 * Mağdur, araç, masraf, evraklar KORUNUR. Geri yüklenebilir (restore.php).
 *
 * NOT: Eski FK_CHECKS=0 ile DELETE davranışı kaldırıldı; artık veri kaybı yok.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Dosya ID gerekli', 422);

$stmt = $db->prepare('SELECT id, dosya_no, silindi FROM dosyalar WHERE id = ?');
$stmt->execute([$id]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);
if ((int)$dosya['silindi'] === 1) json_error('Dosya zaten silinmiş', 409);

$db->beginTransaction();
try {
    $stmt = $db->prepare('UPDATE dosyalar SET silindi = 1, silinme_tarihi = NOW(), silen_kullanici_id = ? WHERE id = ?');
    $stmt->execute([$user['id'], $id]);
    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    error_log('[mr_hasar] dosya_sil: ' . $e->getMessage());
    json_error('Silme islemi basarisiz', 500);
}

log_action($user['id'], 'dosya_sil', "Dosya silindi (soft): {$dosya['dosya_no']}", 'dosyalar', $id);
json_success(null, 'Dosya silindi olarak işaretlendi (geri alınabilir)');
