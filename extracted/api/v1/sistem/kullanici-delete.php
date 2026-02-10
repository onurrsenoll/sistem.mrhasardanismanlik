<?php
/**
 * DELETE /api/v1/sistem/kullanici-delete.php?id=1
 * Kullanıcı sil (pasife çek)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Kullanıcı ID gerekli', 422);

if ($id === $user['id']) {
    json_error('Kendi hesabınızı silemezsiniz', 403);
}

$stmt = $db->prepare('SELECT id, ad_soyad, email FROM users WHERE id = ?');
$stmt->execute([$id]);
$hedef = $stmt->fetch();
if (!$hedef) json_error('Kullanıcı bulunamadı', 404);

// Soft delete - pasife çek
$stmt = $db->prepare('UPDATE users SET aktif = 0 WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'kullanici_sil', "Kullanıcı pasife alındı: {$hedef['ad_soyad']}", 'users', $id);

json_success(null, 'Kullanıcı pasife alındı');
