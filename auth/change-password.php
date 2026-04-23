<?php
/**
 * POST /api/v1/auth/change-password.php
 * Şifre değiştir
 * 
 * Body: { "mevcut_sifre": "...", "yeni_sifre": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['mevcut_sifre', 'yeni_sifre']);

if (strlen($body['yeni_sifre']) < 6) {
    json_error('Yeni şifre en az 6 karakter olmalı', 422);
}

$db = getDB();
$stmt = $db->prepare('SELECT sifre_hash FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$row = $stmt->fetch();

if (!password_verify($body['mevcut_sifre'], $row['sifre_hash'])) {
    json_error('Mevcut şifre hatalı', 401);
}

$newHash = password_hash($body['yeni_sifre'], PASSWORD_BCRYPT);
$stmt = $db->prepare('UPDATE users SET sifre_hash = ? WHERE id = ?');
$stmt->execute([$newHash, $user['id']]);

log_action($user['id'], 'sifre_degistir', 'Şifre değiştirildi');

json_success(null, 'Şifre başarıyla değiştirildi');
