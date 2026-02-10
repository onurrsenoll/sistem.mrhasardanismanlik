<?php
/**
 * DELETE /api/v1/tanim/delete.php?id=1
 * Tanımlama sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID gerekli', 422);

$stmt = $db->prepare('SELECT * FROM tanimlamalar WHERE id = ?');
$stmt->execute([$id]);
$tanim = $stmt->fetch();
if (!$tanim) json_error('Tanımlama bulunamadı', 404);

$stmt = $db->prepare('DELETE FROM tanimlamalar WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'tanim_sil', "{$tanim['kategori']}: {$tanim['deger']}", 'tanimlamalar', $id);

json_success(null, 'Tanımlama silindi');
