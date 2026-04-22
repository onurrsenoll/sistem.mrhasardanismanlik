<?php
/**
 * GET /api/v1/mail/get.php?id=123
 * Tek mail detayı (okunmuş olarak da işaretler).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('GET');
mail_ensure_tables();

$user = auth_required();
$db = getDB();
$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID gerekli', 422);

$stmt = $db->prepare('SELECT m.*, h.email AS hesap_email, h.kullanici_id FROM mail_mesajlar m JOIN mail_hesaplar h ON h.id = m.hesap_id WHERE m.id = ?');
$stmt->execute([$id]);
$m = $stmt->fetch();
if (!$m) json_error('Mail bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$m['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);

// Okunmuş olarak işaretle
if (!$m['okundu']) {
    $db->prepare('UPDATE mail_mesajlar SET okundu = 1 WHERE id = ?')->execute([$id]);
    $m['okundu'] = 1;
}

if (!empty($m['ekler']) && is_string($m['ekler'])) {
    $p = json_decode($m['ekler'], true);
    if (is_array($p)) $m['ekler_listesi'] = $p;
}

json_success($m);
