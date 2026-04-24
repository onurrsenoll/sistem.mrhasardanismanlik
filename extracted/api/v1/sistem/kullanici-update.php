<?php
/**
 * PUT /api/v1/sistem/kullanici-update.php
 * Kullanıcı güncelle
 * Body: { "id": 1, "ad_soyad": "...", "rol": "...", "aktif": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$id]);
$hedef = $stmt->fetch();
if (!$hedef) json_error('Kullanıcı bulunamadı', 404);

$sets = [];
$params = [];

if (isset($body['ad_soyad'])) {
    $sets[] = 'ad_soyad = ?';
    $params[] = clean($body['ad_soyad']);
}

if (isset($body['email'])) {
    $email = clean($body['email']);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Geçersiz e-posta adresi', 422);
    }
    // Başka kullanıcıda var mı
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
    $stmt->execute([$email, $id]);
    if ($stmt->fetch()) {
        json_error('Bu e-posta adresi zaten kullanılıyor', 409);
    }
    $sets[] = 'email = ?';
    $params[] = $email;
}

if (isset($body['rol'])) {
    $gecerliRoller = ['admin', 'avukat', 'uzman', 'personel', 'muhasebe', 'portal'];
    if (!in_array($body['rol'], $gecerliRoller)) {
        json_error('Geçersiz rol', 422);
    }
    $sets[] = 'rol = ?';
    $params[] = $body['rol'];
}

if (isset($body['telefon'])) {
    $sets[] = 'telefon = ?';
    $params[] = clean($body['telefon']);
}

if (isset($body['aktif'])) {
    $sets[] = 'aktif = ?';
    $params[] = (int)$body['aktif'];
}

// NETSANTRAL DAHİLİ ATAMA ALANLARI
if (isset($body['netsantral_dahili'])) {
    $sets[] = 'netsantral_dahili = ?';
    $params[] = clean($body['netsantral_dahili']);
}
if (isset($body['netsantral_sip_sifre'])) {
    $sets[] = 'netsantral_sip_sifre = ?';
    $params[] = clean($body['netsantral_sip_sifre']);
}
if (isset($body['netsantral_api_sifre'])) {
    $sets[] = 'netsantral_api_sifre = ?';
    $params[] = clean($body['netsantral_api_sifre']);
}

if (isset($body['sifre']) && $body['sifre'] !== '') {
    if (strlen($body['sifre']) < 6) {
        json_error('Şifre en az 6 karakter olmalı', 422);
    }
    $sets[] = 'sifre_hash = ?';
    $params[] = password_hash($body['sifre'], PASSWORD_BCRYPT);
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'kullanici_guncelle', "Kullanıcı güncellendi: {$hedef['ad_soyad']}", 'users', $id);

json_success(null, 'Kullanıcı güncellendi');
