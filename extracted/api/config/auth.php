<?php
require_once __DIR__ . '/database.php';

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_create($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRE;
    $base64Header = base64url_encode($header);
    $base64Payload = base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
    $base64Signature = base64url_encode($signature);
    return "$base64Header.$base64Payload.$base64Signature";
}

function jwt_verify($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $base64Header = $parts[0];
    $base64Payload = $parts[1];
    $base64Signature = $parts[2];
    $expectedSig = base64url_encode(hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $base64Signature)) return false;
    $payload = json_decode(base64url_decode($base64Payload), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && $payload['exp'] < time()) return false;
    return $payload;
}

function get_token_from_request() {
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return $matches[1];
    }
    if (isset($_COOKIE['mr_token'])) {
        return $_COOKIE['mr_token'];
    }
    return null;
}

function auth_required($allowedRoles = array()) {
    $token = get_token_from_request();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Oturum bulunamadi']);
        exit;
    }
    $payload = jwt_verify($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Oturum suresi dolmus']);
        exit;
    }
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, created_at FROM users WHERE id = ?');
    $stmt->execute(array($payload['user_id']));
    $user = $stmt->fetch();
    if (!$user || !$user['aktif']) {
        http_response_code(403);
        echo json_encode(['error' => 'Hesap aktif degil']);
        exit;
    }
    if (!empty($allowedRoles) && !in_array($user['rol'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Yetkiniz yok']);
        exit;
    }
    return $user;
}

function log_action($userId, $islem, $detay = null, $tabloAdi = null, $kayitId = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO log_kayitlari (kullanici_id, islem, tablo_adi, kayit_id, detay, ip_adresi, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute(array(
            $userId, $islem, $tabloAdi, $kayitId, $detay,
            isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
            isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null
        ));
    } catch (Exception $e) {}
}
?>