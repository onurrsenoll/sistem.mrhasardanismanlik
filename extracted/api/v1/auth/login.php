<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_success(array('status' => 'API aktif', 'endpoint' => 'login'));
}

require_method('POST');

$body = get_json_body();
if (empty($body['email']) || empty($body['sifre'])) {
    json_error('Email ve sifre gerekli', 422);
}

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, sifre_hash, rol, telefon, aktif FROM users WHERE email = ?');
    $stmt->execute([$body['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        json_error('Email veya sifre hatali', 401);
    }
    if (!$user['aktif']) {
        json_error('Hesap devre disi', 403);
    }
    if (!password_verify($body['sifre'], $user['sifre_hash'])) {
        json_error('Email veya sifre hatali', 401);
    }

    $token = jwt_create([
        'user_id' => (int)$user['id'],
        'email'   => $user['email'],
        'rol'     => $user['rol']
    ]);

    session_register((int)$user['id'], $token);
    $refreshToken = refresh_token_issue((int)$user['id']);

    $stmt = $db->prepare('UPDATE users SET son_giris = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    unset($user['sifre_hash']);
    log_action((int)$user['id'], 'giris', 'Sisteme giris yapti');

    json_success(array(
        'token'         => $token,
        'refresh_token' => $refreshToken,
        'expires_in'    => JWT_EXPIRE,
        'user'          => $user
    ), 'Giris basarili');

} catch (Exception $e) {
    json_error('Sunucu hatasi', 500, $e->getMessage());
}
