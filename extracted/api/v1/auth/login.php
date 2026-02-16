<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['status' => 'API aktif', 'endpoint' => 'login']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || empty($body['email']) || empty($body['sifre'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Email ve sifre gerekli']);
    exit;
}

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, sifre_hash, rol, telefon, aktif FROM users WHERE email = ?');
    $stmt->execute([$body['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Email veya sifre hatali']);
        exit;
    }

    if (!$user['aktif']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Hesap devre disi']);
        exit;
    }

    if (!password_verify($body['sifre'], $user['sifre_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Email veya sifre hatali']);
        exit;
    }

    $token = jwt_create([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'rol' => $user['rol']
    ]);

    $stmt = $db->prepare('UPDATE users SET son_giris = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    unset($user['sifre_hash']);

    echo json_encode([
        'success' => true,
        'message' => 'Giris basarili',
        'data' => [
            'token' => $token,
            'user' => $user
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Sunucu hatasi', 'detail' => $e->getMessage()]);
}
?>