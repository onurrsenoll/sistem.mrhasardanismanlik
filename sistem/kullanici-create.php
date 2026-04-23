<?php
/**
 * POST /api/v1/sistem/kullanici-create.php
 * Yeni kullanıcı oluştur
 * Body: { "ad_soyad": "...", "email": "...", "sifre": "...", "rol": "personel", "telefon": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['ad_soyad', 'email', 'sifre', 'rol']);

$db = getDB();

$email = clean($body['email']);
$rol = clean($body['rol']);

// E-posta kontrolü
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Geçersiz e-posta adresi', 422);
}

// Rol kontrolü
$gecerliRoller = ['admin', 'avukat', 'uzman', 'personel', 'muhasebe', 'portal'];
if (!in_array($rol, $gecerliRoller)) {
    json_error('Geçersiz rol', 422);
}

// Şifre kontrolü
if (strlen($body['sifre']) < 6) {
    json_error('Şifre en az 6 karakter olmalı', 422);
}

// Aynı e-posta var mı
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    json_error('Bu e-posta adresi zaten kullanılıyor', 409);
}

$sifreHash = password_hash($body['sifre'], PASSWORD_BCRYPT);

$stmt = $db->prepare('INSERT INTO users (ad_soyad, email, sifre_hash, rol, telefon, aktif) VALUES (?, ?, ?, ?, ?, 1)');
$stmt->execute([
    clean($body['ad_soyad']),
    $email,
    $sifreHash,
    $rol,
    clean($body['telefon'] ?? '')
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'kullanici_olustur', "Kullanıcı oluşturuldu: {$body['ad_soyad']} ($rol)", 'users', $id);

json_success(['id' => $id], 'Kullanıcı oluşturuldu', 201);
