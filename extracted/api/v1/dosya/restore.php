<?php
/**
 * POST /api/v1/dosya/restore.php?id=1
 * Soft-delete edilmiş bir dosyayı geri yükler.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Dosya ID gerekli', 422);

$stmt = $db->prepare('SELECT id, dosya_no, silindi FROM dosyalar WHERE id = ?');
$stmt->execute([$id]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);
if ((int)$dosya['silindi'] !== 1) json_error('Dosya zaten aktif', 409);

$stmt = $db->prepare('UPDATE dosyalar SET silindi = 0, silinme_tarihi = NULL, silen_kullanici_id = NULL WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'dosya_geri_yukle', "Dosya geri yuklendi: {$dosya['dosya_no']}", 'dosyalar', $id);
json_success(null, 'Dosya geri yüklendi');
