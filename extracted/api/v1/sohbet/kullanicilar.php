<?php
/**
 * GET /api/v1/sohbet/kullanicilar.php
 * Mesaj gönderilebilecek aktif kullanıcı listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$stmt = $db->prepare('SELECT id, ad_soyad, rol FROM users WHERE aktif = 1 AND id != ? ORDER BY ad_soyad ASC');
$stmt->execute([$user['id']]);
$kullanicilar = $stmt->fetchAll();

json_success($kullanicilar);
