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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'POST method gerekli']);
    exit;
}

ensure_2fa_columns();

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || empty($body['temp_token']) || empty($body['code'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => '2FA kodu ve geçici token gerekli']);
    exit;
}

try {
    // Geçici token doğrula
    $payload = jwt_verify($body['temp_token']);
    if (!$payload || empty($payload['user_id']) || empty($payload['require_2fa'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Geçersiz veya süresi dolmuş token']);
        exit;
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, totp_secret, totp_aktif, created_at FROM users WHERE id = ?');
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch();

    if (!$user || !$user['aktif']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Hesap aktif degil']);
        exit;
    }

    if (!$user['totp_aktif'] || empty($user['totp_secret'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => '2FA aktif degil']);
        exit;
    }

    $code = trim($body['code']);
    if (!totp_verify($user['totp_secret'], $code)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'DOĞRULAMA KODU HATALI']);
        exit;
    }

    // Doğrulama başarılı - gerçek token oluştur
    $token = jwt_create([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'rol' => $user['rol']
    ]);

    $stmt = $db->prepare('UPDATE users SET son_giris = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    log_action($user['id'], '2FA GİRİŞ', '2FA ile oturum açıldı', 'users', $user['id']);

    unset($user['totp_secret']);
    unset($user['totp_aktif']);

    // Netsantral + yetkiler yukle (sessizce)
    try {
        $stmtNS = $db->prepare('SELECT netsantral_dahili, netsantral_sip_sifre, netsantral_api_sifre FROM users WHERE id = ?');
        $stmtNS->execute([$user['id']]);
        $nsRow = $stmtNS->fetch();
        if ($nsRow) { $user = array_merge($user, $nsRow); }
    } catch (\Exception $e) {}
    try {
        $stmtY = $db->prepare('SELECT modul, islem FROM yetkiler WHERE kullanici_id = ? AND izin = 1');
        $stmtY->execute([$user['id']]);
        $yetkiObj = array();
        foreach ($stmtY->fetchAll() as $yr) { $yetkiObj[$yr['modul'] . '_' . $yr['islem']] = 1; }
        $user['yetkiler'] = $yetkiObj;
    } catch (\Exception $e) { $user['yetkiler'] = array(); }

    echo json_encode([
        'success' => true,
        'message' => '2FA dogrulama basarili',
        'data' => [
            'token' => $token,
            'user' => $user
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Sunucu hatasi']);
}
?>
