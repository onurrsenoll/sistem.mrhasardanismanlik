<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

setup_headers();
require_method('POST');
ensure_2fa_columns();

$user = auth_required();
$body = get_json_body();
$action = isset($body['action']) ? $body['action'] : '';

$db = getDB();

if ($action === 'generate') {
    // Yeni TOTP secret oluştur
    $secret = totp_generate_secret();
    $issuer = 'MR HASAR';
    $qrUrl = totp_get_qr_url($issuer, $user['email'], $secret);

    // Secret'ı geçici olarak kaydet (henüz aktif değil)
    $stmt = $db->prepare('UPDATE users SET totp_secret = ? WHERE id = ?');
    $stmt->execute([$secret, $user['id']]);

    json_success([
        'secret' => $secret,
        'qr_url' => $qrUrl,
        'issuer' => $issuer
    ], '2FA KURULUM KODU OLUŞTURULDU');

} elseif ($action === 'verify_and_enable') {
    // Kullanıcının girdiği kodu doğrula ve 2FA'yı aktif et
    $code = isset($body['code']) ? trim($body['code']) : '';
    if (strlen($code) !== 6) {
        json_error('6 HANELİ DOĞRULAMA KODU GEREKLİ', 422);
    }

    $stmt = $db->prepare('SELECT totp_secret FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    if (!$row || empty($row['totp_secret'])) {
        json_error('ÖNCE 2FA KURULUMUNU BAŞLATIN', 400);
    }

    if (!totp_verify($row['totp_secret'], $code)) {
        json_error('DOĞRULAMA KODU HATALI', 401);
    }

    // 2FA'yı aktif et
    $stmt = $db->prepare('UPDATE users SET totp_aktif = 1 WHERE id = ?');
    $stmt->execute([$user['id']]);

    log_action($user['id'], '2FA AKTİF', '2FA Google Authenticator etkinleştirildi', 'users', $user['id']);

    json_success(null, '2FA BAŞARIYLA AKTİF EDİLDİ');

} elseif ($action === 'disable') {
    // 2FA'yı devre dışı bırak (kod doğrulaması ile)
    $code = isset($body['code']) ? trim($body['code']) : '';
    if (strlen($code) !== 6) {
        json_error('6 HANELİ DOĞRULAMA KODU GEREKLİ', 422);
    }

    $stmt = $db->prepare('SELECT totp_secret FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    if (!$row || empty($row['totp_secret'])) {
        json_error('2FA KURULU DEĞİL', 400);
    }

    if (!totp_verify($row['totp_secret'], $code)) {
        json_error('DOĞRULAMA KODU HATALI', 401);
    }

    $stmt = $db->prepare('UPDATE users SET totp_aktif = 0, totp_secret = NULL WHERE id = ?');
    $stmt->execute([$user['id']]);

    log_action($user['id'], '2FA DEVRE DIŞI', '2FA Google Authenticator devre dışı bırakıldı', 'users', $user['id']);

    json_success(null, '2FA DEVRE DIŞI BIRAKILDI');

} elseif ($action === 'status') {
    $stmt = $db->prepare('SELECT totp_aktif FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();

    json_success([
        'totp_aktif' => (int)($row['totp_aktif'] ?? 0)
    ]);

} else {
    json_error('GEÇERSİZ İŞLEM. action: generate, verify_and_enable, disable, status', 400);
}
?>
