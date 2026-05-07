<?php
/**
 * POST /api/v1/auth/logout.php
 * Mevcut JWT'yi oturumlar tablosunda iptal eder.
 * Body opsiyonel: { "refresh_token": "..." } gönderilirse o da iptal edilir.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$token = get_token_from_request();
if (!$token) json_error('Oturum bulunamadi', 401);

$payload = jwt_verify($token);
if (!$payload) json_error('Token gecersiz', 401);

session_revoke($token);

$body = get_json_body();
if (!empty($body['refresh_token'])) {
    try {
        $db = getDB();
        $stmt = $db->prepare('UPDATE refresh_tokens SET gecerli = 0 WHERE token_hash = ?');
        $stmt->execute([hash('sha256', $body['refresh_token'])]);
    } catch (Exception $e) {}
}

log_action((int)$payload['user_id'], 'cikis', 'Sistemden cikis yapti');
json_success(null, 'Cikis basarili');
