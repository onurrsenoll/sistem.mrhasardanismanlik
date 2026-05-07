<?php
/**
 * POST /api/v1/auth/refresh.php
 * Body: { "refresh_token": "..." }
 * Geçerli bir refresh token'ı yeni JWT + yeni refresh token ile değişir (rotation).
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$body = get_json_body();
if (empty($body['refresh_token'])) json_error('Refresh token gerekli', 422);

$userId = refresh_token_consume($body['refresh_token']);
if (!$userId) json_error('Refresh token gecersiz veya kullanilmis', 401);

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, created_at FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || !$user['aktif']) json_error('Hesap aktif degil', 403);

    $token = jwt_create([
        'user_id' => (int)$user['id'],
        'email'   => $user['email'],
        'rol'     => $user['rol']
    ]);

    session_register((int)$user['id'], $token);
    $newRefresh = refresh_token_issue((int)$user['id']);

    json_success([
        'token'         => $token,
        'refresh_token' => $newRefresh,
        'expires_in'    => JWT_EXPIRE,
        'user'          => $user
    ], 'Token yenilendi');

} catch (Exception $e) {
    error_log('[mr_hasar] refresh error: ' . $e->getMessage());
    json_error('Sunucu hatasi', 500);
}
